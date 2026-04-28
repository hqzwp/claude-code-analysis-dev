import type { TurnEvent } from '../query.js';
import type { ToolRegistry } from './registry.js';
import type { ToolCallResult } from './types.js';

export type ToolExecutionContext = {
  toolName: string;
  toolUseId: string;
  input: unknown;
};

export type ToolExecutionController = {
  getToolDefinitionsForApi: () => ReturnType<ToolRegistry['getToolDefinitionsForApi']>;
  executeTool: (context: ToolExecutionContext) => Promise<ToolCallResult>;
};

export function createToolExecutionController(
  registry: ToolRegistry,
  emit: (event: TurnEvent) => void,
): ToolExecutionController {
  return {
    getToolDefinitionsForApi: () => registry.getToolDefinitionsForApi(),
    executeTool: async ({ toolName, toolUseId, input }) => {
      const allowed = registry.isToolAllowed(toolName);
      emit({ kind: 'tool_policy_checked', toolName, toolUseId, input, allowed });

      if (!allowed) {
        const result = {
          isError: true,
          content: `Tool ${toolName} is not permitted by policy.`,
        };
        emit({ kind: 'tool_execution_denied', toolName, toolUseId, input, result });
        return result;
      }

      emit({ kind: 'tool_execution_started', toolName, toolUseId, input });

      const result = await registry.executeTool(toolName, input);
      emit({
        kind: result.isError ? 'tool_execution_failed' : 'tool_execution_finished',
        toolName,
        toolUseId,
        input,
        result,
      });

      return result;
    },
  };
}
