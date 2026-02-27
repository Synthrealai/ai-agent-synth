export class ForgeError extends Error {
    code;
    recoverable;
    context;
    constructor(message, code, recoverable = true, context) {
        super(message);
        this.code = code;
        this.recoverable = recoverable;
        this.context = context;
        this.name = 'ForgeError';
    }
}
export class PolicyDeniedError extends ForgeError {
    constructor(tool, reason) {
        super(`Policy denied: ${tool} — ${reason}`, 'POLICY_DENIED', false, { tool, reason });
    }
}
export class CostLimitError extends ForgeError {
    constructor(current, limit) {
        super(`Daily cost limit reached: $${current.toFixed(2)} / $${limit.toFixed(2)}`, 'COST_LIMIT', false);
    }
}
export class ToolExecutionError extends ForgeError {
    constructor(tool, error) {
        super(`Tool ${tool} failed: ${error}`, 'TOOL_ERROR', true, { tool });
    }
}
//# sourceMappingURL=errors.js.map