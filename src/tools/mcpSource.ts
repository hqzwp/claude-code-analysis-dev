import type { ToolDefinition } from './types.js';

export type McpToolSource = {
  loadTools: () => Promise<ToolDefinition[]> | ToolDefinition[];
};

export function createMcpToolSource(loadTools: () => Promise<ToolDefinition[]> | ToolDefinition[]): McpToolSource {
  return {
    loadTools,
  };
}

export function createStaticMcpToolSource(tools: ToolDefinition[]): McpToolSource {
  return createMcpToolSource(() => tools);
}

export async function loadMcpTools(source: McpToolSource): Promise<ToolDefinition[]> {
  return source.loadTools();
}
