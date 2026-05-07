import type { CommandContext } from '../commands/index.js';
import { dispatchCommand } from '../commands/index.js';
import { searchMemories } from '../memory/index.js';
import { createSession, createOrLoadCurrentSession, appendMessages, type SessionHistory } from '../history/index.js';
import { logDebug } from '../log.js';
import { submitMessage, type ChatMessage, type TurnEvent } from '../query.js';
import { evaluateSkillRouting, formatSkillRouteAnalysis } from '../skills/index.js';
import { createAppStateStore } from '../state/AppStateStore.js';
import type { AppStateStore } from '../state/AppStateStore.js';

export type RuntimeEvent =
  | { kind: 'input_received'; input: string; trimmed: string }
  | {
      kind: 'command_result';
      input: string;
      result: 'append_assistant' | 'submit_prompt' | 'reset_messages' | 'exit' | 'not_command';
    }
  | { kind: 'skill_route_evaluated'; input: string; routed: boolean; prompt: string | null }
  | { kind: 'prompt_submitted'; prompt: string; source: 'raw' | 'command' | 'skill' }
  | { kind: 'turn_started'; prompt: string }
  | { kind: 'turn_event'; event: TurnEvent }
  | { kind: 'turn_finished'; prompt: string; assistantText: string }
  | { kind: 'turn_failed'; prompt: string; error: string }
  | { kind: 'assistant_reply_appended'; userText: string; assistantText: string }
  | { kind: 'conversation_reset'; sessionId: string }
  | { kind: 'conversation_ignored'; input: string; reason: 'empty' | 'streaming' };

export type RuntimeEventListener = (event: RuntimeEvent) => void;

export type RuntimeEventBus = {
  publish: (event: RuntimeEvent) => void;
  subscribe: (listener: RuntimeEventListener) => () => void;
};

export function createRuntimeEventBus(): RuntimeEventBus {
  const listeners = new Set<RuntimeEventListener>();

  return {
    publish: (event) => {
      for (const listener of listeners) {
        listener(event);
      }
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}

export type QueryEngineDeps = {
  store: AppStateStore;
  exit: () => void;
  initialMessages: ChatMessage[];
  rootDir?: string;
  submitMessageImpl?: typeof submitMessage;
  dispatchCommandImpl?: typeof dispatchCommand;
  evaluateSkillRoutingImpl?: typeof evaluateSkillRouting;
  formatSkillRouteAnalysisImpl?: typeof formatSkillRouteAnalysis;
  logDebugImpl?: typeof logDebug;
  eventBus?: RuntimeEventBus;
};

export type QueryRuntime = {
  store: AppStateStore;
  engine: QueryEngine;
  events: RuntimeEventBus;
};

const MAX_MEMORY_ENTRIES = 2;
const MAX_MEMORY_CONTEXT_CHARS = 1200;

function persistTurn(session: SessionHistory, messages: ChatMessage[], rootDir?: string): SessionHistory | null {
  return appendMessages(session.meta.id, messages, { rootDir });
}

function buildMemoryQuery(prompt: string, messages: ChatMessage[]): string {
  const recentMessages = messages
    .filter((message) => message.role !== 'system')
    .slice(-4)
    .map((message) => message.text);

  return [prompt, ...recentMessages].join('\n');
}

function buildMemoryContext(prompt: string, messages: ChatMessage[], rootDir?: string): string {
  const memories = searchMemories(buildMemoryQuery(prompt, messages), { rootDir }).slice(0, MAX_MEMORY_ENTRIES);
  if (memories.length === 0) {
    return '';
  }

  const lines = ['Relevant memory:'];
  for (const memory of memories) {
    lines.push(`- ${memory.name} (${memory.type})`);
    lines.push(`  ${memory.description}`);
    if (memory.content.length > 0) {
      lines.push(`  ${memory.content}`);
    }
  }

  const context = lines.join('\n');
  if (context.length <= MAX_MEMORY_CONTEXT_CHARS) {
    return context;
  }

  return `${context.slice(0, MAX_MEMORY_CONTEXT_CHARS).trimEnd()}\n[truncated]`;
}

function injectMemoryContext(messages: ChatMessage[], memoryContext: string): ChatMessage[] {
  if (!memoryContext) {
    return messages;
  }

  const systemIndex = messages.findIndex((message) => message.role === 'system');
  if (systemIndex === -1) {
    return [{ role: 'system', text: memoryContext }, ...messages];
  }

  return messages.map((message, index) => {
    if (index !== systemIndex) {
      return message;
    }

    return {
      ...message,
      text: `${message.text}\n\n${memoryContext}`,
    };
  });
}

//从 QueryEngineDeps 这个对象类型里，移除 store 字段。也就是拿到一个“不包含 store”的 deps 类型
// 然后用一个对象类型 & { store?: AppStateStore } 来表示“可以包含 可选的 store”的 deps 类型
export function createQueryRuntime(deps: Omit<QueryEngineDeps, 'store'> & { store?: AppStateStore }): QueryRuntime {
  const events = deps.eventBus ?? createRuntimeEventBus();
  const initialSession = createOrLoadCurrentSession({
    rootDir: deps.rootDir,
    messages: deps.initialMessages,
  });
  const store = deps.store ?? createAppStateStore(initialSession);
  if (deps.store) {
    deps.store.hydrateSession(initialSession);
  }

  const engine = new QueryEngine({
    ...deps,
    store,
    eventBus: events,
  });

  return { store, engine, events };
}

type InputActionResult =
  | { kind: 'ignored'; reason: 'empty' | 'streaming' }
  | { kind: 'append_assistant'; text: string }
  | { kind: 'submit_prompt'; prompt: string; source: 'command' | 'skill' | 'raw' }
  | { kind: 'reset_messages' }
  | { kind: 'exit' };

export class QueryEngine {
  private readonly store: AppStateStore;
  private readonly exit: () => void;
  private readonly initialMessages: ChatMessage[];
  private readonly rootDir?: string;
  private readonly submitMessageFn: typeof submitMessage;
  private readonly dispatchCommandFn: typeof dispatchCommand;
  private readonly evaluateSkillRoutingFn: typeof evaluateSkillRouting;
  private readonly formatSkillRouteAnalysisFn: typeof formatSkillRouteAnalysis;
  private readonly logDebugFn: typeof logDebug;
  private readonly eventBus: RuntimeEventBus;

  constructor(deps: QueryEngineDeps) {
    this.store = deps.store;
    this.exit = deps.exit;
    this.initialMessages = deps.initialMessages;
    this.rootDir = deps.rootDir;
    this.submitMessageFn = deps.submitMessageImpl ?? submitMessage;
    this.dispatchCommandFn = deps.dispatchCommandImpl ?? dispatchCommand;
    this.evaluateSkillRoutingFn = deps.evaluateSkillRoutingImpl ?? evaluateSkillRouting;
    this.formatSkillRouteAnalysisFn = deps.formatSkillRouteAnalysisImpl ?? formatSkillRouteAnalysis;
    this.logDebugFn = deps.logDebugImpl ?? logDebug;
    this.eventBus = deps.eventBus ?? createRuntimeEventBus();
  }

  async submitInput(input: string): Promise<void> {
    const state = this.store.getSnapshot();
    const trimmed = input.trim();

    this.publish({ kind: 'input_received', input, trimmed });

    const action = await this.processInput(trimmed, state.isStreaming);

    if (action.kind === 'ignored') {
      this.publish({ kind: 'conversation_ignored', input, reason: action.reason });
      this.store.setInputBuffer('');
      return;
    }

    if (action.kind === 'append_assistant') {
      await this.appendAssistantReply(trimmed, action.text);
      return;
    }

    if (action.kind === 'submit_prompt') {
      this.publish({ kind: 'prompt_submitted', prompt: action.prompt, source: action.source });
      await this.streamPrompt(action.prompt);
      return;
    }

    if (action.kind === 'reset_messages') {
      this.resetConversation();
      return;
    }

    if (action.kind === 'exit') {
      this.exit();
    }
  }

  private async processInput(trimmed: string, isStreaming: boolean): Promise<InputActionResult> {
    if (trimmed.length === 0) {
      return { kind: 'ignored', reason: 'empty' };
    }

    if (isStreaming) {
      return { kind: 'ignored', reason: 'streaming' };
    }

    const commandContext: CommandContext = { exit: this.exit };
    const cmdResult = await this.dispatchCommandFn(trimmed, commandContext);
    this.publish({ kind: 'command_result', input: trimmed, result: cmdResult.kind });

    if (cmdResult.kind === 'append_assistant') {
      return { kind: 'append_assistant', text: cmdResult.text };
    }

    if (cmdResult.kind === 'submit_prompt') {
      return { kind: 'submit_prompt', prompt: cmdResult.text, source: 'command' };
    }

    if (cmdResult.kind === 'reset_messages') {
      return { kind: 'reset_messages' };
    }

    if (cmdResult.kind === 'exit') {
      return { kind: 'exit' };
    }

    const routeDecision = this.evaluateSkillRoutingFn(trimmed);
    this.publish({
      kind: 'skill_route_evaluated',
      input: trimmed,
      routed: routeDecision.routed,
      prompt: routeDecision.prompt ?? null,
    });
    this.logDebugFn(this.formatSkillRouteAnalysisFn(routeDecision));
    if (routeDecision.routed && routeDecision.prompt) {
      return { kind: 'submit_prompt', prompt: routeDecision.prompt, source: 'skill' };
    }

    return { kind: 'submit_prompt', prompt: trimmed, source: 'raw' };
  }

  private publish(event: RuntimeEvent): void {
    this.eventBus.publish(event);
  }

  private resetConversation(): void {
    const freshSession = createSession({
      rootDir: this.rootDir,
      messages: this.initialMessages,
    });
    this.store.hydrateSession(freshSession);
    this.publish({ kind: 'conversation_reset', sessionId: freshSession.meta.id });
  }

  private handleTurnEvent(event: TurnEvent): void {
    this.publish({ kind: 'turn_event', event });
    if (event.kind === 'turn_error') {
      const errorMessage = event.error instanceof Error ? event.error.message : String(event.error);
      this.store.setLastError(errorMessage);
    }
  }


  private async appendAssistantReply(userText: string, assistantText: string): Promise<void> {
    const state = this.store.getSnapshot();
    const userMessage: ChatMessage = { role: 'user', text: userText };
    const assistantMessage: ChatMessage = { role: 'assistant', text: assistantText };
    const nextMessages = [...state.messages, userMessage, assistantMessage];
    this.store.setMessages(nextMessages);
    this.store.setInputBuffer('');
    this.store.setLastError(null);

    const persisted = persistTurn(state.session, [userMessage, assistantMessage], this.rootDir);
    if (persisted) {
      this.store.hydrateSession(persisted);
    }

    this.publish({ kind: 'assistant_reply_appended', userText, assistantText });
  }

  private async streamPrompt(prompt: string): Promise<void> {
    const state = this.store.getSnapshot();
    const userMessage: ChatMessage = { role: 'user', text: prompt };
    const conversationHistory = [...state.messages, userMessage];
    const memoryContext = buildMemoryContext(prompt, state.messages, this.rootDir);
    const requestHistory = injectMemoryContext(conversationHistory, memoryContext);
    let assistantText = '';

    this.publish({ kind: 'turn_started', prompt });
    this.store.setMessages([...conversationHistory, { role: 'assistant', text: '' }]);
    this.store.setInputBuffer('');
    this.store.setIsStreaming(true);
    this.store.setLastError(null);

    try {
      for await (const deltaText of this.submitMessageFn(requestHistory, { emit: (event) => this.handleTurnEvent(event) })) {
        assistantText += deltaText;
        this.store.setMessages([...conversationHistory, { role: 'assistant', text: assistantText }]);
      }

      if (assistantText.length === 0) {
        assistantText = '(no text response)';
      }

      const assistantMessage: ChatMessage = { role: 'assistant', text: assistantText };
      const nextMessages = [...conversationHistory, assistantMessage];
      this.store.setMessages(nextMessages);

      const persisted = persistTurn(state.session, [userMessage, assistantMessage], this.rootDir);
      if (persisted) {
        this.store.hydrateSession(persisted);
      }

      this.publish({ kind: 'turn_finished', prompt, assistantText });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logDebugFn(`submitMessage failed: ${errorMessage}`);
      const assistantMessage: ChatMessage = {
        role: 'assistant',
        text: `Error: ${errorMessage}`,
      };
      const nextMessages = [...conversationHistory, assistantMessage];
      this.store.setMessages(nextMessages);

      const persisted = persistTurn(state.session, [userMessage, assistantMessage], this.rootDir);
      if (persisted) {
        this.store.hydrateSession(persisted);
      }
      this.store.setLastError(errorMessage);
      this.publish({ kind: 'turn_failed', prompt, error: errorMessage });
    } finally {
      this.store.setIsStreaming(false);
    }
  }
}
