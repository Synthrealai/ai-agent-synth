import { nanoid } from 'nanoid';
export const generateId = () => nanoid(16);
export const now = () => new Date().toISOString();
export const sleep = (ms) => new Promise(r => setTimeout(r, ms));
export function truncate(text, maxLen = 2000) {
    if (text.length <= maxLen)
        return { text, truncated: false };
    return { text: text.slice(0, maxLen) + '\n... [truncated]', truncated: true };
}
export function safeJsonParse(text, fallback) {
    try {
        return JSON.parse(text);
    }
    catch {
        return fallback;
    }
}
export function formatCost(cents) {
    return `$${(cents / 100).toFixed(4)}`;
}
//# sourceMappingURL=utils.js.map