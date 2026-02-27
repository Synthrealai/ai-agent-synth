export declare const generateId: () => string;
export declare const now: () => string;
export declare const sleep: (ms: number) => Promise<unknown>;
export declare function truncate(text: string, maxLen?: number): {
    text: string;
    truncated: boolean;
};
export declare function safeJsonParse<T>(text: string, fallback: T): T;
export declare function formatCost(cents: number): string;
//# sourceMappingURL=utils.d.ts.map