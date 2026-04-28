import { createFileReadTool } from './fileReadTool.js';
import { createGrepTool } from './grepTool.js';
import { ToolRegistry } from './registry.js';
import { createDefaultToolPolicy } from '../permissions/index.js';
import { loadMcpTools, type McpToolSource } from './mcpSource.js';

export { ToolRegistry };
export type { ApiToolDefinition, ToolCallResult, ToolDefinition } from './types.js';
export type { McpToolSource } from './mcpSource.js';
export { createMcpToolSource, createStaticMcpToolSource, loadMcpTools } from './mcpSource.js';

export function createDefaultToolRegistry(): ToolRegistry {
  const canUseTool = createDefaultToolPolicy();
  return new ToolRegistry([createFileReadTool(), createGrepTool()], canUseTool);
}

export async function createToolRegistryFromSources(sources: McpToolSource[] = []): Promise<ToolRegistry> {
  const canUseTool = createDefaultToolPolicy();
  const mcpTools = (await Promise.all(sources.map((source) => loadMcpTools(source)))).flat();
  return new ToolRegistry([createFileReadTool(), createGrepTool(), ...mcpTools], canUseTool);
}
