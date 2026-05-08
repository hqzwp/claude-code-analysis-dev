import { createFileReadTool } from './fileReadTool.js';
import { createGrepTool } from './grepTool.js';
import { ToolRegistry } from './registry.js';
import { createDefaultToolPolicy } from '../permissions/index.js';
import { loadMcpTools, type McpToolSource } from './mcpSource.js';
import type { ToolDefinition } from './types.js';

export { ToolRegistry };
export type { ApiToolDefinition, ToolCallResult, ToolDefinition } from './types.js';
export type { McpToolSource } from './mcpSource.js';
export { createMcpToolSource, createStaticMcpToolSource, loadMcpTools } from './mcpSource.js';
/// ..abc def ... -> __abc_def__ -> abc_def
function normalizeToolNameFragment(name: string): string {
  const normalized = name.trim().replace(/[^a-zA-Z0-9_]+/g, '_').replace(/^_+|_+$/g, '');
  return normalized.length > 0 ? normalized : 'tool';
}
//规范化macp工具名称
function canonicalizeMcpTool(tool: ToolDefinition, sourceIndex: number): ToolDefinition {
  const normalizedName = normalizeToolNameFragment(tool.name);
  return {
    ...tool,
    name: `mcp_${sourceIndex + 1}__${normalizedName}`,
    mcpToolName: tool.name,
    mcpSourceIndex: sourceIndex,
  };
}

export function createDefaultToolRegistry(): ToolRegistry {
  const canUseTool = createDefaultToolPolicy();
  return new ToolRegistry([createFileReadTool(), createGrepTool()], canUseTool);
}

export async function createToolRegistryFromSources(sources: McpToolSource[] = []): Promise<ToolRegistry> {
  const canUseTool = createDefaultToolPolicy();
  const mcpTools: ToolDefinition[] = [];

  for (const [sourceIndex, source] of sources.entries()) {
    try {
      const loadedTools = await loadMcpTools(source);
      mcpTools.push(...loadedTools.map((tool) => canonicalizeMcpTool(tool, sourceIndex)));
    } catch {
      continue;
    }
  }

  return new ToolRegistry([createFileReadTool(), createGrepTool(), ...mcpTools], canUseTool);
}
