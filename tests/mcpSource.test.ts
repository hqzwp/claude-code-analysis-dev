import assert from 'node:assert';
import { describe, it } from 'node:test';
import { createStaticMcpToolSource, loadMcpTools } from '../src/tools/mcpSource.js';
import { createToolRegistryFromSources } from '../src/tools/index.js';

describe('MCP tool source', () => {
  it('loads tool definitions from a source', async () => {
    const source = createStaticMcpToolSource([
      {
        name: 'mcp_echo',
        description: 'Echo text',
        inputSchema: { type: 'object', properties: {} },
        execute: async () => ({ content: 'ok' }),
      },
    ]);

    const tools = await loadMcpTools(source);
    assert.strictEqual(tools.length, 1);
    assert.strictEqual(tools[0].name, 'mcp_echo');
  });

  it('creates a registry from multiple sources', async () => {
    const registry = await createToolRegistryFromSources([
      createStaticMcpToolSource([
        {
          name: 'mcp_echo',
          description: 'Echo text',
          inputSchema: { type: 'object', properties: {} },
          execute: async () => ({ content: 'ok' }),
        },
      ]),
    ]);

    const result = await registry.executeTool('mcp_echo', {});
    assert.strictEqual(result.content, 'ok');
  });
});
