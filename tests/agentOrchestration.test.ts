import assert from 'node:assert';
import { describe, it } from 'node:test';
import { buildOrchestrationPlan, formatOrchestrationPlan, runOrchestration } from '../src/agents/orchestrator.js';

describe('agent orchestration', () => {
  it('builds a multi-agent plan', () => {
    const plan = buildOrchestrationPlan('review runtime', 'inspect tools and agents');

    assert.strictEqual(plan.goal, 'review runtime');
    assert.strictEqual(plan.tasks.length, 3);
    assert.ok(formatOrchestrationPlan(plan).includes('planner'));
    assert.ok(formatOrchestrationPlan(plan).includes('researcher'));
    assert.ok(formatOrchestrationPlan(plan).includes('synthesizer'));
  });

  it('runs tasks with partial failure isolation', async () => {
    const plan = buildOrchestrationPlan('coordinate work', 'inspect runtime and tools');
    const result = await runOrchestration(plan, {
      concurrency: 2,
      runTask: async (task) => {
        if (task.stage === 'researcher') {
          throw new Error('research failed');
        }

        return {
          taskId: task.id,
          output: `${task.stage}:${task.goal}`,
          done: true,
        };
      },
    });

    assert.strictEqual(result.taskResults.length, 3);
    assert.ok(result.summary.includes('Multi-agent result: coordinate work'));
    assert.ok(result.taskResults.some((task) => task.stage === 'researcher' && task.error === 'research failed'));
    assert.ok(result.taskResults.some((task) => task.stage === 'planner' && task.done));
  });
});
