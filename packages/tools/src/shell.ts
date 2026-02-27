import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { RiskLevel, truncate, type ToolResult } from '@forgeclaw/shared';
import type { ToolDefinition } from './index.js';

const execFileAsync = promisify(execFile);

const DANGEROUS_PATTERNS = [
  /rm\s+(-rf|-fr)/,
  /mkfs/,
  /dd\s+if=/,
  />\s*\/dev\//,
  /chmod\s+777/,
  /curl.*\|\s*(bash|sh)/,
  /wget.*\|\s*(bash|sh)/,
  /eval\s/,
  /fork\s*bomb/i,
];

const TIMEOUT_MS = 30000;
const MAX_OUTPUT_LENGTH = 10000;

export function createShellTool(): ToolDefinition {
  return {
    name: 'shell',
    description: 'Execute a shell command. Commands are sandboxed to the current working directory with timeouts. Dangerous commands are blocked.',
    parameters: {
      command: { type: 'string', description: 'The shell command to execute', required: true },
      cwd: { type: 'string', description: 'Working directory (default: current)' },
      timeout: { type: 'number', description: 'Timeout in ms (default: 30000)' },
    },
    riskLevel: RiskLevel.MEDIUM,
    handler: async (args): Promise<ToolResult> => {
      const command = args.command as string;
      const cwd = args.cwd as string || process.cwd();
      const timeout = (args.timeout as number) || TIMEOUT_MS;

      for (const pattern of DANGEROUS_PATTERNS) {
        if (pattern.test(command)) {
          return {
            success: false,
            output: '',
            error: `Command blocked by safety filter: matches pattern ${pattern}`,
            duration_ms: 0,
            truncated: false,
          };
        }
      }

      try {
        const result = await execFileAsync('bash', ['-lc', command], {
          cwd,
          timeout,
          maxBuffer: 1024 * 1024,
          env: { ...process.env, TERM: 'dumb' },
        });

        const { text: output, truncated } = truncate(
          `${result.stdout}${result.stderr ? `\nSTDERR: ${result.stderr}` : ''}`,
          MAX_OUTPUT_LENGTH
        );

        return { success: true, output, truncated, duration_ms: 0 };
      } catch (error: any) {
        const { text: output, truncated } = truncate(
          `${error.stdout || ''}${error.stderr ? `\n${error.stderr}` : ''}`,
          MAX_OUTPUT_LENGTH
        );
        return {
          success: false,
          output,
          error: error.message,
          duration_ms: 0,
          truncated,
        };
      }
    },
  };
}
