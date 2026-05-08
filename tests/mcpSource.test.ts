import assert from 'node:assert';
import { describe, it } from 'node:test';
import { createMcpToolSource, createStaticMcpToolSource, loadMcpTools } from '../src/tools/mcpSource.js';
import { createToolRegistryFromSources } from '../src/tools/index.js';

describe('MCP tool source', () => {
  // it('loads tool definitions from a source', async () => {
  //   const source = createStaticMcpToolSource([
  //     {
  //       name: 'mcp_echo',
  //       description: 'Echo text',
  //       inputSchema: { type: 'object', properties: {} },
  //       execute: async () => ({ content: 'ok' }),
  //     },
  //   ]);

  //   const tools = await loadMcpTools(source);
  //   assert.strictEqual(tools.length, 1);
  //   assert.strictEqual(tools[0].name, 'mcp_echo');
  // });

  // it('runs lifecycle hooks while loading tools', async () => {
  //   const calls: string[] = [];
  //   const source = createMcpToolSource(
  //     async () => {
  //       calls.push('load');
  //       return [
  //         {
  //           name: 'mcp_echo',
  //           description: 'Echo text',
  //           inputSchema: { type: 'object', properties: {} },
  //           execute: async () => ({ content: 'ok' }),
  //         },
  //       ];
  //     },
  //     {
  //       init: () => {
  //         calls.push('init');
  //       },
  //       dispose: () => {
  //         calls.push('dispose');
  //       },
  //     },
  //   );

  //   const tools = await loadMcpTools(source);
  //   assert.strictEqual(tools.length, 1);
  //   assert.deepStrictEqual(calls, ['init', 'load', 'dispose']);
  // });

  // it('creates a registry from multiple sources', async () => {
  //   const registry = await createToolRegistryFromSources([
  //     createStaticMcpToolSource([
  //       {
  //         name: 'mcp_echo',
  //         description: 'Echo text',
  //         inputSchema: { type: 'object', properties: {} },
  //         execute: async () => ({ content: 'ok' }),
  //       },
  //     ]),
  //   ]);

  //   const result = await registry.executeTool('mcp_echo', {});
  //   assert.strictEqual(result.content, 'ok');
  // });

  it('skips failing sources and keeps loading the rest', async () => {
    const registry = await createToolRegistryFromSources([
      createMcpToolSource(async () => {
        throw new Error('source unavailable');
      }),
      createStaticMcpToolSource([
        {
          name: 'echo',
          description: 'Echo text',
          inputSchema: { type: 'object', properties: {} },
          execute: async () => ({ content: 'ok' }),
        },
      ]),
    ]);

    const result = await registry.executeTool('mcp_2__echo', {});
    assert.strictEqual(result.content, 'ok');
  });

  it('keeps MCP metadata on registered tools', async () => {
    const registry = await createToolRegistryFromSources([
      createStaticMcpToolSource([
        {
          name: 'echo',
          description: 'Echo text',
          inputSchema: { type: 'object', properties: {} },
          execute: async () => ({ content: 'ok' }),
        },
      ]),
    ]);

    const tool = registry.listRegisteredTools().find((entry) => entry.name === 'mcp_1__echo');
    assert.ok(tool);
    assert.strictEqual(tool?.mcpToolName, 'echo');
    assert.strictEqual(tool?.mcpSourceIndex, 0);

    const apiTool = registry.getToolDefinitionsForApi().find((entry) => entry.name === 'mcp_1__echo');
    assert.ok(apiTool);
    assert.match(apiTool?.description ?? '', /MCP: echo/);
    assert.match(apiTool?.description ?? '', /source #1/);
  });
});
