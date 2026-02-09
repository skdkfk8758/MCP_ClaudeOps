import { DEFAULT_PRICING } from '../constants.js';
import type { ModelPricing } from '../types/token.js';

export function calculateCost(
  inputTokens: number,
  outputTokens: number,
  model: string,
  pricing?: ModelPricing
): number {
  const prices = pricing?.[model] ?? DEFAULT_PRICING[model];
  if (!prices) return 0;

  const inputCost = (inputTokens / 1_000_000) * prices.input;
  const outputCost = (outputTokens / 1_000_000) * prices.output;
  return inputCost + outputCost;
}

export function calculateSessionCost(
  agents: Array<{ token_input: number; token_output: number; model: string }>,
  pricing?: ModelPricing
): number {
  return agents.reduce((total, agent) => {
    return total + calculateCost(agent.token_input, agent.token_output, agent.model, pricing);
  }, 0);
}

export function formatCost(usd: number): string {
  if (usd < 0.01) return `$${usd.toFixed(4)}`;
  if (usd < 1) return `$${usd.toFixed(3)}`;
  return `$${usd.toFixed(2)}`;
}
