import type { TurnEvent } from '../query.js';
import type { ToolRegistry } from './registry.js';
import type { ToolCallResult } from './types.js';

export type ToolExecutionContext = {
  toolName: string;
  toolUseId: string;
  input: unknown;
};

type ToolAccessDecision =
  | { allowed: true; reason: null }
  | { allowed: false; reason: 'unknown_tool' | 'policy_denied'; content: string };

export type ToolExecutionController = {
  getToolDefinitionsForApi: () => ReturnType<ToolRegistry['getToolDefinitionsForApi']>;
  executeTool: (context: ToolExecutionContext) => Promise<ToolCallResult>;
};

function resolveToolAccess(registry: ToolRegistry, toolName: string): ToolAccessDecision {
  if (!registry.hasTool(toolName)) {
    return {
      allowed: false,
      reason: 'unknown_tool',
      content: `Unknown tool: ${toolName}`,
    };
  }

  if (!registry.isToolAllowed(toolName)) {
    return {
      allowed: false,
      reason: 'policy_denied',
      content: `Tool ${toolName} is not permitted by policy.`,
    };
  }

  return { allowed: true, reason: null };
}

export function createToolExecutionController(
  registry: ToolRegistry,
  emit?: (event: TurnEvent) => void,
): ToolExecutionController {
  return {
    getToolDefinitionsForApi: () => registry.getToolDefinitionsForApi(),
    executeTool: async ({ toolName, toolUseId, input }) => {
      const decision = resolveToolAccess(registry, toolName);

      emit?.({
        kind: 'tool_policy_checked',
        toolName,
        toolUseId,
        input,
        allowed: decision.allowed,
        reason: decision.reason,
      });

      if (!decision.allowed) {
        const result = {
          isError: true,
          content: decision.content,
        };
        emit?.({
          kind: 'tool_execution_denied',
          toolName,
          toolUseId,
          input,
          reason: decision.reason,
          result,
        });
        return result;
      }

      emit?.({
        kind: 'tool_execution_started',
        toolName,
        toolUseId,
        input,
      });

      const result = await registry.executeTool(toolName, input);

      emit?.({
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
