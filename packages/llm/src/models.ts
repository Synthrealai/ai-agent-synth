export interface ModelConfig {
  id: string;
  provider: 'openrouter' | 'anthropic' | 'openai' | 'groq';
  maxTokens: number;
  costPer1kInput: number;
  costPer1kOutput: number;
  supportsTools: boolean;
  supportsVision: boolean;
  speed: 'fast' | 'medium' | 'slow';
}

export const MODELS: Record<string, ModelConfig> = {
  'qwen/qwen3-next-80b-a3b-instruct:free': {
    id: 'qwen/qwen3-next-80b-a3b-instruct:free',
    provider: 'openrouter',
    maxTokens: 8192,
    costPer1kInput: 0,
    costPer1kOutput: 0,
    supportsTools: true,
    supportsVision: false,
    speed: 'medium',
  },
  'qwen/qwen3-coder:free': {
    id: 'qwen/qwen3-coder:free',
    provider: 'openrouter',
    maxTokens: 8192,
    costPer1kInput: 0,
    costPer1kOutput: 0,
    supportsTools: true,
    supportsVision: false,
    speed: 'medium',
  },
  'z-ai/glm-4.5-air:free': {
    id: 'z-ai/glm-4.5-air:free',
    provider: 'openrouter',
    maxTokens: 8192,
    costPer1kInput: 0,
    costPer1kOutput: 0,
    supportsTools: true,
    supportsVision: false,
    speed: 'fast',
  },
  'openrouter/free': {
    id: 'openrouter/free',
    provider: 'openrouter',
    maxTokens: 8192,
    costPer1kInput: 0,
    costPer1kOutput: 0,
    supportsTools: true,
    supportsVision: false,
    speed: 'fast',
  },
  'anthropic/claude-sonnet-4-20250514': {
    id: 'anthropic/claude-sonnet-4-20250514',
    provider: 'openrouter',
    maxTokens: 64000,
    costPer1kInput: 0.3,
    costPer1kOutput: 1.5,
    supportsTools: true,
    supportsVision: true,
    speed: 'medium',
  },
  'anthropic/claude-opus-4-0-20250115': {
    id: 'anthropic/claude-opus-4-0-20250115',
    provider: 'openrouter',
    maxTokens: 32000,
    costPer1kInput: 1.5,
    costPer1kOutput: 7.5,
    supportsTools: true,
    supportsVision: true,
    speed: 'slow',
  },
  'groq/llama-3.3-70b-versatile': {
    id: 'groq/llama-3.3-70b-versatile',
    provider: 'groq',
    maxTokens: 32000,
    costPer1kInput: 0.059,
    costPer1kOutput: 0.079,
    supportsTools: true,
    supportsVision: false,
    speed: 'fast',
  },
  'google/gemini-2.0-flash': {
    id: 'google/gemini-2.0-flash',
    provider: 'openrouter',
    maxTokens: 65000,
    costPer1kInput: 0.01,
    costPer1kOutput: 0.04,
    supportsTools: true,
    supportsVision: true,
    speed: 'fast',
  },
  'deepseek/deepseek-r1': {
    id: 'deepseek/deepseek-r1',
    provider: 'openrouter',
    maxTokens: 64000,
    costPer1kInput: 0.055,
    costPer1kOutput: 0.22,
    supportsTools: false,
    supportsVision: false,
    speed: 'medium',
  },
};

export function selectModel(task: 'default' | 'reasoning' | 'fast' | 'coding' | 'vision'): ModelConfig {
  const config = {
    default: process.env.FORGE_DEFAULT_MODEL || 'qwen/qwen3-next-80b-a3b-instruct:free',
    reasoning: process.env.FORGE_REASONING_MODEL || 'qwen/qwen3-next-80b-a3b-instruct:free',
    fast: process.env.FORGE_FAST_MODEL || 'z-ai/glm-4.5-air:free',
    coding: process.env.FORGE_CODING_MODEL || 'qwen/qwen3-coder:free',
    vision: process.env.FORGE_VISION_MODEL || 'qwen/qwen3-next-80b-a3b-instruct:free',
  };
  return MODELS[config[task]] || MODELS['qwen/qwen3-next-80b-a3b-instruct:free'];
}
