// Test: skill router
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { routeInputToSkillPrompt } from '../src/skills/router.js';

describe('routeInputToSkillPrompt', () => {
  it('routes explain-like input to the explain skill prompt', () => {
    const prompt = routeInputToSkillPrompt('explain render(<App />);');
    assert.ok(prompt?.includes('Explain this code clearly and concisely'), 'should use explain skill prompt');
  });

  it('routes test-like input to the write-tests skill prompt', () => {
    const prompt = routeInputToSkillPrompt('Write tests for this module');
    assert.ok(prompt?.includes('Write focused tests for'), 'should use write-tests skill prompt');
  });

  it('routes refactor-like input to the refactor skill prompt', () => {
    const prompt = routeInputToSkillPrompt('Refactor this code');
    assert.ok(prompt?.includes('Draft a minimal refactor plan for'), 'should use refactor skill prompt');
  });

  it('returns null for slash commands', () => {
    const prompt = routeInputToSkillPrompt('/skill explain-code src/index.tsx');
    assert.strictEqual(prompt, null);
  });

  it('returns null for non-matching input', () => {
    const prompt = routeInputToSkillPrompt('hello there');
    assert.strictEqual(prompt, null);
  });

  it('returns null for blank input', () => {
    const prompt = routeInputToSkillPrompt('   ');
    assert.strictEqual(prompt, null);
  });
});
