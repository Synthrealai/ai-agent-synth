export declare class ForgeError extends Error {
    code: string;
    recoverable: boolean;
    context?: Record<string, unknown> | undefined;
    constructor(message: string, code: string, recoverable?: boolean, context?: Record<string, unknown> | undefined);
}
export declare class PolicyDeniedError extends ForgeError {
    constructor(tool: string, reason: string);
}
export declare class CostLimitError extends ForgeError {
    constructor(current: number, limit: number);
}
export declare class ToolExecutionError extends ForgeError {
    constructor(tool: string, error: string);
}
//# sourceMappingURL=errors.d.ts.map