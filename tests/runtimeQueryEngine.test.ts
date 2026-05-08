import assert from 'node:assert';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';
import { createSession } from '../src/history/index.js';
import { writeMemory } from '../src/memory/index.js';
import { QueryEngine, createRuntimeEventBus } from '../src/runtime/QueryEngine.js';
import { createAppStateStore } from '../src/state/AppStateStore.js';

function createTempRoot(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'mini-claude-engine-'));
}

describe('QueryEngine', () => {
  it('injects only summary-matched memories before fallback matches', async () => {
    const rootDir = createTempRoot();
    writeMemory(
      {
        name: 'Summary Match',
        description: 'alpha topic',
        type: 'feedback',
        content: 'summary-only memory',
      },
      { rootDir },
    );
    writeMemory(
      {
        name: 'Content Match',
        description: 'different topic',
        type: 'project',
        content: 'alpha topic',
      },
      { rootDir },
    );

    const initialMessages = [{ role: 'system', text: 'system prompt' }] as const;
    const session = createSession({ rootDir, messages: [...initialMessages] });
    const store = createAppStateStore(session);
    let requestSystemText = '';

    const engine = new QueryEngine({
      store,
      exit: () => {},
      initialMessages: [...initialMessages],
      rootDir,
      submitMessageImpl: async function* (history) {
        requestSystemText = history.find((message) => message.role === 'system')?.text ?? '';
        yield 'ok';
      },
      dispatchCommandImpl: () => ({ kind: 'not_command' }),
      evaluateSkillRoutingImpl: (input) => ({
        input,
        normalizedInput: input.trim(),
        routed: false,
        score: 0,
        confidence: 0,
        reason: 'fallback',
        candidates: [],
        selected: null,
      }),
      formatSkillRouteAnalysisImpl: () => 'fallback',
      logDebugImpl: () => {},
    });

    await engine.submitInput('alpha topic');

    assert.match(requestSystemText, /system prompt/);
    assert.match(requestSystemText, /Relevant memory:/);
    assert.match(requestSystemText, /Summary Match/);
    assert.match(requestSystemText, /summary-only memory/);
    assert.ok(!requestSystemText.includes('Content Match'));
  });

  it('publishes runtime events to subscribers', async () => {
    const rootDir = createTempRoot();
    const initialMessages = [{ role: 'system', text: 'system prompt' }] as const;
    const session = createSession({ rootDir, messages: [...initialMessages] });
    const store = createAppStateStore(session);
    const events: string[] = [];
    const bus = createRuntimeEventBus();

    const engine = new QueryEngine({
      store,
      exit: () => {},
      initialMessages: [...initialMessages],
      rootDir,
      eventBus: bus,
      submitMessageImpl: async function* () {
        yield 'ok';
      },
      dispatchCommandImpl: () => ({ kind: 'not_command' }),
      evaluateSkillRoutingImpl: (input) => ({
        input,
        normalizedInput: input.trim(),
        routed: false,
        score: 0,
        confidence: 0,
        reason: 'fallback',
        candidates: [],
        selected: null,
      }),
      formatSkillRouteAnalysisImpl: () => 'fallback',
      logDebugImpl: () => {},
    });

    const unsubscribe = bus.subscribe((event) => {
      events.push(event.kind);
    });

    await engine.submitInput('hello');
    unsubscribe();

    assert.ok(events.includes('input_received'));
    assert.ok(events.includes('command_result'));
    assert.ok(events.includes('prompt_submitted'));
    assert.ok(events.includes('turn_started'));
    assert.ok(events.includes('turn_finished'));
  });
});
