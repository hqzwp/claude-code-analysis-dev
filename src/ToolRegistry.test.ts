// Test: ToolRegistry unknown tool and permission policy
import { describe, it } from 'node:test';
import { ToolRegistry } from '../src/tools/registry.js';
import assert from 'node:assert';

describe('ToolRegistry', () => {
  it('returns error for unknown tool', async () => {
    const registry = new ToolRegistry([]);
    const result = await registry.executeTool('nonexistent_tool', {});
    assert.ok(result.isError, 'should return error');
    assert.ok(result.content.includes('Unknown tool'), 'should mention unknown tool');
  });

  it('returns error when tool is denied by policy', async () => {
    // Create a policy that denies all tools
    const canUseTool = (name: string) => false;
    const registry = new ToolRegistry([], canUseTool);
    const result = await registry.executeTool('any_tool', {});
    assert.ok(result.isError, 'should return error');
    assert.ok(result.content.includes('not permitted'), 'should mention policy denial');
  });

  it('filters tools from getToolDefinitionsForApi by policy', () => {
    const canUseTool = (name: string) => name === 'allowed_tool';
    const registry = new ToolRegistry([
      {
        name: 'allowed_tool',
        description: 'Allowed',
        inputSchema: { type: 'object', properties: {} },
        execute: async () => ({ content: 'ok' }),
      },
      {
        name: 'denied_tool',
        description: 'Denied',
        inputSchema: { type: 'object', properties: {} },
        execute: async () => ({ content: 'ok' }),
      },
    ], canUseTool);

    const definitions = registry.getToolDefinitionsForApi();
    assert.strictEqual(definitions.length, 1, 'should only return allowed tool');
    assert.strictEqual(definitions[0].name, 'allowed_tool');
  });
});
