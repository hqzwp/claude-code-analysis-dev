import assert from 'node:assert';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';
import { createSession } from '../src/history/index.js';
import { writeMemory } from '../src/memory/index.js';
import { QueryEngine } from '../src/runtime/QueryEngine.js';
import { createAppStateStore } from '../src/state/AppStateStore.js';

function createTempRoot(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'mini-claude-engine-'));
}

describe('QueryEngine', () => {
  it('injects relevant memories into the turn request', async () => {
    const rootDir = createTempRoot();
    writeMemory(
      {
        name: 'Agent Focus',
        description: 'Study memory injection',
        type: 'feedback',
        content: 'agent orchestration',
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

    await engine.submitInput('agent orchestration');

    assert.match(requestSystemText, /system prompt/);
    assert.match(requestSystemText, /Relevant memory:/);
    assert.match(requestSystemText, /Agent Focus/);
    assert.match(requestSystemText, /agent orchestration/);
  });

  it('limits injected memories to the first matches', async () => {
    const rootDir = createTempRoot();
    writeMemory(
      {
        name: 'Alpha memory',
        description: 'First match',
        type: 'feedback',
        content: 'needle',
      },
      { rootDir },
    );
    writeMemory(
      {
        name: 'Beta memory',
        description: 'Second match',
        type: 'project',
        content: 'needle',
      },
      { rootDir },
    );
    writeMemory(
      {
        name: 'Gamma memory',
        description: 'Third match',
        type: 'reference',
        content: 'needle',
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

    await engine.submitInput('needle');

    assert.match(requestSystemText, /Alpha memory/);
    assert.match(requestSystemText, /Beta memory/);
    assert.ok(!requestSystemText.includes('Gamma memory'));
  });
});
