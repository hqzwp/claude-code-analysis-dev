import type { SessionHistory } from '../history/index.js';
import type { ChatMessage } from '../query.js';

export type AppState = {
  session: SessionHistory;
  messages: ChatMessage[];
  inputBuffer: string;
  isStreaming: boolean;
  lastError: string | null;
  debugEvents: string[];
};

export type AppStateStore = {
  getSnapshot: () => AppState;
  subscribe: (listener: () => void) => () => void;
  hydrateSession: (session: SessionHistory) => void;
  setMessages: (messages: ChatMessage[]) => void;
  setInputBuffer: (inputBuffer: string) => void;
  setIsStreaming: (isStreaming: boolean) => void;
  setLastError: (lastError: string | null) => void;
  setDebugEvents: (updater: (prev: string[]) => string[]) => void;
};

function emit(listeners: Set<() => void>): void {
  for (const listener of listeners) {
    listener();
  }
}

export function createAppStateStore(initialSession: SessionHistory): AppStateStore {
  let state: AppState = {
    session: initialSession,
    messages: [...initialSession.messages],
    inputBuffer: '',
    isStreaming: false,
    lastError: null,
    debugEvents: [],
  };
  const listeners = new Set<() => void>();

  const update = (nextState: AppState): void => {
    state = nextState;
    emit(listeners);
  };

  return {
    getSnapshot: () => state,
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    hydrateSession: (session: SessionHistory) => {
      update({
        session,
        messages: [...session.messages],
        inputBuffer: '',
        isStreaming: false,
        lastError: null,
        debugEvents: [],
      });
    },
    setMessages: (messages: ChatMessage[]) => {
      update({
        ...state,
        messages: [...messages],
      });
    },
    setInputBuffer: (inputBuffer: string) => {
      update({
        ...state,
        inputBuffer,
      });
    },
    setIsStreaming: (isStreaming: boolean) => {
      update({
        ...state,
        isStreaming,
      });
    },
    setLastError: (lastError: string | null) => {
      update({
        ...state,
        lastError,
      });
    },
    setDebugEvents: (updater: (prev: string[]) => string[]) => {
      update({
        ...state,
        debugEvents: updater(state.debugEvents),
      });
    },
  };
}
