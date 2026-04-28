import assert from 'node:assert';
import { describe, it } from 'node:test';
import { createToolExecutionController } from '../src/tools/controller.js';
import { ToolRegistry } from '../src/tools/registry.js';

describe('createToolExecutionController', () => {
  it('emits lifecycle events for allowed tool execution', async () => {
    const events: unknown[] = [];
    const registry = new ToolRegistry([
      {
        name: 'echo',
        description: 'Echo input',
        inputSchema: { type: 'object', properties: {} },
        execute: async () => ({ content: 'ok' }),
      },
    ]);
    const controller = createToolExecutionController(registry, (event) => {
      events.push(event);
    });

    const result = await controller.executeTool({
      toolName: 'echo',
      toolUseId: 'tool-1',
      input: { value: 'hi' },
    });

    assert.deepStrictEqual(result, { content: 'ok' });
    assert.deepStrictEqual(events, [
      {
        kind: 'tool_policy_checked',
        toolName: 'echo',
        toolUseId: 'tool-1',
        input: { value: 'hi' },
        allowed: true,
      },
      {
        kind: 'tool_execution_started',
        toolName: 'echo',
        toolUseId: 'tool-1',
        input: { value: 'hi' },
      },
      {
        kind: 'tool_execution_finished',
        toolName: 'echo',
        toolUseId: 'tool-1',
        input: { value: 'hi' },
        result: { content: 'ok' },
      },
    ]);
  });

  it('emits denial events for blocked tools', async () => {
    const events: unknown[] = [];
    const registry = new ToolRegistry([], () => false);
    const controller = createToolExecutionController(registry, (event) => {
      events.push(event);
    });

    const result = await controller.executeTool({
      toolName: 'blocked',
      toolUseId: 'tool-2',
      input: { value: 'nope' },
    });

    assert.deepStrictEqual(result, {
      isError: true,
      content: 'Tool blocked is not permitted by policy.',
    });
    assert.deepStrictEqual(events, [
      {
        kind: 'tool_policy_checked',
        toolName: 'blocked',
        toolUseId: 'tool-2',
        input: { value: 'nope' },
        allowed: false,
      },
      {
        kind: 'tool_execution_denied',
        toolName: 'blocked',
        toolUseId: 'tool-2',
        input: { value: 'nope' },
        result: {
          isError: true,
          content: 'Tool blocked is not permitted by policy.',
        },
      },
    ]);
  });

  it('emits failure events for tool errors', async () => {
    const events: unknown[] = [];
    const registry = new ToolRegistry([
      {
        name: 'broken',
        description: 'Broken tool',
        inputSchema: { type: 'object', properties: {} },
        execute: async () => ({ content: 'bad', isError: true }),
      },
    ]);
    const controller = createToolExecutionController(registry, (event) => {
      events.push(event);
    });

    const result = await controller.executeTool({
      toolName: 'broken',
      toolUseId: 'tool-3',
      input: { value: 'x' },
    });

    assert.deepStrictEqual(result, { content: 'bad', isError: true });
    assert.deepStrictEqual(events, [
      {
        kind: 'tool_policy_checked',
        toolName: 'broken',
        toolUseId: 'tool-3',
        input: { value: 'x' },
        allowed: true,
      },
      {
        kind: 'tool_execution_started',
        toolName: 'broken',
        toolUseId: 'tool-3',
        input: { value: 'x' },
      },
      {
        kind: 'tool_execution_failed',
        toolName: 'broken',
        toolUseId: 'tool-3',
        input: { value: 'x' },
        result: { content: 'bad', isError: true },
      },
    ]);
  });
});
