import type { ToolDefinition } from './types.js';

export type McpToolSource = {
  loadTools: () => Promise<ToolDefinition[]> | ToolDefinition[];
  init?: () => Promise<void> | void;
  dispose?: () => Promise<void> | void;
};

export function createMcpToolSource(
  loadTools: () => Promise<ToolDefinition[]> | ToolDefinition[],
  lifecycle: Pick<McpToolSource, 'init' | 'dispose'> = {},
): McpToolSource {
  return {
    loadTools,
    ...lifecycle,
  };
}

export function createStaticMcpToolSource(tools: ToolDefinition[]): McpToolSource {
  return createMcpToolSource(() => tools);
}

export async function loadMcpTools(source: McpToolSource): Promise<ToolDefinition[]> {
  await source.init?.();

  try {
    return await source.loadTools();
  } finally {
    await source.dispose?.();
  }
}
