import type { ApiToolDefinition, ToolCallResult, ToolDefinition } from './types.js';
import type { CanUseTool } from '../permissions/index.js';

// 工具注册表
export class ToolRegistry {
  private readonly tools = new Map<string, ToolDefinition>();
  private readonly canUseTool?: CanUseTool;

  constructor(initialTools: ToolDefinition[] = [], canUseTool?: CanUseTool) {
    for (const tool of initialTools) {
      this.register(tool);
    }
    this.canUseTool = canUseTool;
  }

  register(tool: ToolDefinition): void {
    this.tools.set(tool.name, tool);
  }

  isToolAllowed(name: string): boolean {
    return !this.canUseTool || this.canUseTool(name);
  }

  getToolDefinitionsForApi(): ApiToolDefinition[] {
    // Filter by permission policy if available
    return Array.from(this.tools.values())
      .filter(tool => this.isToolAllowed(tool.name))
      .map((tool) => ({
        name: tool.name,
        description: tool.description,
        input_schema: tool.inputSchema,
      }));
  }

  async executeTool(name: string, input: unknown): Promise<ToolCallResult> {
    // Permission check before execution
    if (!this.isToolAllowed(name)) {
      return {
        isError: true,
        content: `Tool ${name} is not permitted by policy.`,
      };
    }

    const tool = this.tools.get(name);
    if (!tool) {
      return {
        isError: true,
        content: `Unknown tool: ${name}`,
      };
    }

    try {
      return await tool.execute(input);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        isError: true,
        content: `Tool ${name} failed: ${errorMessage}`,
      };
    }
  }

  listToolNames(): string[] {
    return Array.from(this.tools.keys());
  }
}
