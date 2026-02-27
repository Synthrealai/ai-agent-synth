export class ForgeError extends Error {
  constructor(
    message: string,
    public code: string,
    public recoverable: boolean = true,
    public context?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'ForgeError';
  }
}

export class PolicyDeniedError extends ForgeError {
  constructor(tool: string, reason: string) {
    super(`Policy denied: ${tool} — ${reason}`, 'POLICY_DENIED', false, { tool, reason });
  }
}

export class CostLimitError extends ForgeError {
  constructor(current: number, limit: number) {
    super(`Daily cost limit reached: $${current.toFixed(2)} / $${limit.toFixed(2)}`, 'COST_LIMIT', false);
  }
}

export class ToolExecutionError extends ForgeError {
  constructor(tool: string, error: string) {
    super(`Tool ${tool} failed: ${error}`, 'TOOL_ERROR', true, { tool });
  }
}
