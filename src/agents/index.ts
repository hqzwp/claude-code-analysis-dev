export type { AgentResult, AgentRunRequest, AgentRuntimeOptions, AgentTask } from './types.js';
export { runAgent } from './runtime.js';
export {
  buildOrchestrationPlan,
  formatOrchestrationPlan,
  formatOrchestrationResult,
  runOrchestration,
} from './orchestrator.js';
import type { AgentRunRequest, AgentRuntimeOptions } from './types.js';
import { runAgent } from './runtime.js';

export async function runSimpleAgent(request: AgentRunRequest, options: AgentRuntimeOptions) {
  return runAgent(request, options);
}
