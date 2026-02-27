import { RiskLevel, type ToolResult } from '@forgeclaw/shared';
import type { ToolDefinition } from './index.js';

export function createContentTool(): ToolDefinition {
  return {
    name: 'content',
    description: 'Generate content using Dan Koe atomic content philosophy. Extract core thesis + atomic ideas, then transform into platform-optimized variations.',
    parameters: {
      action: { type: 'string', description: 'Action: extract_atoms, generate_variations, format_for_platform, create_thread', required: true },
      input: { type: 'string', description: 'The source content or idea', required: true },
      platform: { type: 'string', description: 'Target platform: twitter, linkedin, youtube, tiktok, substack' },
      angle: { type: 'string', description: 'Content angle: contrarian, story, framework, question, statistic, analogy, prediction, mistake, myth_bust, how_to' },
    },
    riskLevel: RiskLevel.NONE,
    handler: async (args): Promise<ToolResult> => {
      return {
        success: true,
        output: JSON.stringify({
          action: args.action,
          input: args.input,
          platform: args.platform,
          angle: args.angle,
          note: 'Content generation delegated to LLM with ContentForge prompts',
        }),
        truncated: false,
        duration_ms: 0,
      };
    },
  };
}
