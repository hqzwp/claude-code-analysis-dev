import type { AgentResult, AgentRuntimeOptions, AgentTask } from './types.js';

export type OrchestrationStage = 'planner' | 'researcher' | 'synthesizer';

export type OrchestrationTask = AgentTask & {
  stage: OrchestrationStage;
};

export type OrchestrationPlan = {
  goal: string;
  input: string;
  tasks: OrchestrationTask[];
  concurrency: number;
};

export type OrchestrationTaskResult = AgentResult & {
  stage: OrchestrationStage;
  error?: string;
};

export type OrchestrationResult = {
  goal: string;
  input: string;
  taskResults: OrchestrationTaskResult[];
  summary: string;
};

export type OrchestrationOptions = AgentRuntimeOptions & {
  concurrency?: number;
};

function createTask(stage: OrchestrationStage, goal: string, input: string): OrchestrationTask {
  return {
    id: `agent-${stage}`,
    stage,
    goal,
    input,
  };
}

export function buildOrchestrationPlan(goal: string, input: string, concurrency = 2): OrchestrationPlan {
  const normalizedGoal = goal.trim() || 'agent work';
  const normalizedInput = input.trim() || normalizedGoal;

  return {
    goal: normalizedGoal,
    input: normalizedInput,
    concurrency,
    tasks: [
      createTask('planner', `Plan ${normalizedGoal}`, normalizedInput),
      createTask('researcher', `Research ${normalizedGoal}`, normalizedInput),
      createTask('synthesizer', `Synthesize ${normalizedGoal}`, normalizedInput),
    ],
  };
}

export function formatOrchestrationPlan(plan: OrchestrationPlan): string {
  const lines = [`Multi-agent plan: ${plan.goal}`, `Input: ${plan.input}`, `Concurrency: ${plan.concurrency}`];

  for (const task of plan.tasks) {
    lines.push(`- ${task.stage}: ${task.goal}`);
  }

  return lines.join('\n');
}

export function formatOrchestrationResult(result: OrchestrationResult): string {
  const lines = [`Multi-agent result: ${result.goal}`];

  for (const taskResult of result.taskResults) {
    const status = taskResult.done ? 'done' : 'failed';
    const detail = taskResult.error ?? taskResult.output;
    lines.push(`- ${taskResult.stage} (${status}): ${detail}`);
  }

  return lines.join('\n');
}

async function runWithConcurrency(
  tasks: OrchestrationTask[],
  concurrency: number,
  runTask: AgentRuntimeOptions['runTask'],
): Promise<OrchestrationTaskResult[]> {
  const taskResults = new Array<OrchestrationTaskResult>(tasks.length);
  let nextIndex = 0;
  const workerCount = Math.max(1, Math.min(concurrency, tasks.length));

  const workers = Array.from({ length: workerCount }, async () => {
    while (nextIndex < tasks.length) {
      const currentIndex = nextIndex;
      nextIndex += 1;
      const task = tasks[currentIndex];

      try {
        const result = await runTask(task);
        taskResults[currentIndex] = {
          ...result,
          stage: task.stage,
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        taskResults[currentIndex] = {
          taskId: task.id,
          output: `Error: ${message}`,
          done: false,
          stage: task.stage,
          error: message,
        };
      }
    }
  });

  await Promise.all(workers);
  return taskResults;
}

export async function runOrchestration(plan: OrchestrationPlan, options: OrchestrationOptions): Promise<OrchestrationResult> {
  const taskResults = await runWithConcurrency(plan.tasks, options.concurrency ?? plan.concurrency, options.runTask);

  return {
    goal: plan.goal,
    input: plan.input,
    taskResults,
    summary: formatOrchestrationResult({
      goal: plan.goal,
      input: plan.input,
      taskResults,
      summary: '',
    }),
  };
}
