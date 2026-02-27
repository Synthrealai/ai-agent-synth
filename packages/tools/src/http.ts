import { RiskLevel, truncate, type ToolResult } from '@forgeclaw/shared';
import type { ToolDefinition } from './index.js';

const BLOCKED_IP_RANGES = [
  /^169\.254\./,
  /^10\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^192\.168\./,
  /^100\.100\.100\.200/,
  /^fd[0-9a-f]/i,
];

const BLOCKED_HOSTS = ['metadata.google.internal', 'metadata.google.com'];

export function createHttpTool(): ToolDefinition {
  return {
    name: 'http',
    description: 'Make HTTP requests (GET, POST). Includes security filters for blocked IP ranges and metadata endpoints.',
    parameters: {
      method: { type: 'string', description: 'HTTP method: GET or POST', required: true },
      url: { type: 'string', description: 'The URL to fetch', required: true },
      headers: { type: 'string', description: 'JSON string of headers' },
      body: { type: 'string', description: 'Request body (for POST)' },
    },
    riskLevel: RiskLevel.MEDIUM,
    handler: async (args): Promise<ToolResult> => {
      const url = args.url as string;
      const method = (args.method as string || 'GET').toUpperCase();

      try {
        const parsed = new URL(url);
        if (BLOCKED_HOSTS.includes(parsed.hostname)) {
          return { success: false, output: '', error: 'Blocked: metadata endpoint', duration_ms: 0, truncated: false };
        }
        for (const pattern of BLOCKED_IP_RANGES) {
          if (pattern.test(parsed.hostname)) {
            return { success: false, output: '', error: 'Blocked: private IP range', duration_ms: 0, truncated: false };
          }
        }
      } catch {
        return { success: false, output: '', error: 'Invalid URL', duration_ms: 0, truncated: false };
      }

      try {
        const headers: Record<string, string> = args.headers ? JSON.parse(args.headers as string) : {};
        headers['User-Agent'] = headers['User-Agent'] || 'ForgeClaw/2.0';

        const response = await fetch(url, {
          method,
          headers,
          body: method === 'POST' ? (args.body as string) : undefined,
          signal: AbortSignal.timeout(15000),
        });

        const text = await response.text();
        const { text: output, truncated } = truncate(text, 8000);

        return {
          success: response.ok,
          output: `Status: ${response.status}\n\n${output}`,
          error: response.ok ? undefined : `HTTP ${response.status}`,
          truncated,
          duration_ms: 0,
        };
      } catch (error: any) {
        return { success: false, output: '', error: error.message, duration_ms: 0, truncated: false };
      }
    },
  };
}
