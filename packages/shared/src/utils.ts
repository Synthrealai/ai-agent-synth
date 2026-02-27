import { nanoid } from 'nanoid';

export const generateId = () => nanoid(16);
export const now = () => new Date().toISOString();
export const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

export function truncate(text: string, maxLen: number = 2000): { text: string; truncated: boolean } {
  if (text.length <= maxLen) return { text, truncated: false };
  return { text: text.slice(0, maxLen) + '\n... [truncated]', truncated: true };
}

export function safeJsonParse<T>(text: string, fallback: T): T {
  try {
    return JSON.parse(text);
  } catch {
    return fallback;
  }
}

export function formatCost(cents: number): string {
  return `$${(cents / 100).toFixed(4)}`;
}
