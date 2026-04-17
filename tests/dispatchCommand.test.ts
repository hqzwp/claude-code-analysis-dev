// Test: Command dispatcher
import { describe, it } from 'node:test';
import { dispatchCommand } from '../src/commands/dispatcher.js';
import assert from 'node:assert';

describe('dispatchCommand', () => {
  const ctx = { exit: () => {} };

  it('returns not_command for non-slash input', () => {
    const result = dispatchCommand('hello', ctx);
    assert.strictEqual(result.kind, 'not_command');
  });

  it('handles /help command', () => {
    const result = dispatchCommand('/help', ctx);
    assert.strictEqual(result.kind, 'append_assistant');
    if (result.kind === 'append_assistant') {
      assert.ok(result.text.toLowerCase().includes('command'), 'should mention commands');
    }
  });

  it('handles /clear command', () => {
    const result = dispatchCommand('/clear', ctx);
    assert.strictEqual(result.kind, 'reset_messages');
  });

  it('handles /exit command', () => {
    const result = dispatchCommand('/exit', ctx);
    assert.strictEqual(result.kind, 'exit');
  });

  it('returns error for unknown command', () => {
    const result = dispatchCommand('/unknown_cmd', ctx);
    assert.strictEqual(result.kind, 'append_assistant');
    if (result.kind === 'append_assistant') {
      assert.ok(result.text.includes('Unknown command'), 'should mention unknown command');
    }
  });
});
