export interface TokenUsage {
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  model?: string;
  session_id?: string;
}

export interface CostEstimate {
  total_usd: number;
  input_cost_usd: number;
  output_cost_usd: number;
  by_model?: Record<string, { input_cost: number; output_cost: number; total: number }>;
}

export interface PricingTier {
  model: string;
  input_per_mtok: number;
  output_per_mtok: number;
}

export interface ModelPricing {
  [model: string]: {
    input: number;
    output: number;
  };
}
