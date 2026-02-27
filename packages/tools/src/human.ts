import { RiskLevel, type ToolResult } from '@forgeclaw/shared';
import type { ToolDefinition } from './index.js';

export function createHumanTool(): ToolDefinition {
  return {
    name: 'human',
    description: 'Ask the user a question when the agent is blocked or needs clarification.',
    parameters: {
      question: { type: 'string', description: 'The question to ask the user', required: true },
      options: { type: 'string', description: 'JSON array of suggested options' },
      blocking: { type: 'string', description: 'Whether to block execution until answered (default: true)' },
    },
    riskLevel: RiskLevel.NONE,
    handler: async (args): Promise<ToolResult> => {
      return {
        success: true,
        output: JSON.stringify({
          type: 'human_question',
          question: args.question,
          options: args.options ? JSON.parse(args.options as string) : undefined,
          blocking: args.blocking !== 'false',
        }),
        truncated: false,
        duration_ms: 0,
      };
    },
  };
}
