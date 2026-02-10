import type { AgentTier, PipelineStep } from '@claudeops/shared';

export interface SimulationCallbacks {
  onStepStart: (step: number, agents: string[]) => void;
  onAgentStart: (step: number, agentType: string) => void;
  onAgentComplete: (step: number, agentType: string) => void;
  onStepComplete: (step: number) => void;
  onComplete: () => void;
}

const MODEL_DELAYS: Record<AgentTier, [number, number]> = {
  haiku: [800, 1500],
  sonnet: [1500, 3000],
  opus: [2500, 5000],
};

function randomDelay(model: AgentTier): number {
  const [min, max] = MODEL_DELAYS[model];
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function simulatePipeline(
  steps: PipelineStep[],
  callbacks: SimulationCallbacks,
): Promise<void> {
  for (const step of steps) {
    const agentTypes = step.agents.map((a) => a.type);
    callbacks.onStepStart(step.step, agentTypes);

    if (step.parallel) {
      await Promise.all(
        step.agents.map(async (agent) => {
          callbacks.onAgentStart(step.step, agent.type);
          await delay(randomDelay(agent.model));
          callbacks.onAgentComplete(step.step, agent.type);
        }),
      );
    } else {
      for (const agent of step.agents) {
        callbacks.onAgentStart(step.step, agent.type);
        await delay(randomDelay(agent.model));
        callbacks.onAgentComplete(step.step, agent.type);
      }
    }

    callbacks.onStepComplete(step.step);
  }

  callbacks.onComplete();
}
