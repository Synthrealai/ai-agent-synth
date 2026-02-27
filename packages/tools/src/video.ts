import { RiskLevel, type ToolResult } from '@forgeclaw/shared';
import type { ToolDefinition } from './index.js';

export function createVideoTool(): ToolDefinition {
  return {
    name: 'video',
    description: 'Create videos using HeyGen API for UGC/talking-head content, or generate video scripts for YouTube.',
    parameters: {
      action: { type: 'string', description: 'Action: create_ugc, create_youtube_script, generate_thumbnail, create_shorts', required: true },
      script: { type: 'string', description: 'The video script or topic', required: true },
      avatar: { type: 'string', description: 'HeyGen avatar ID to use' },
      voice: { type: 'string', description: 'Voice ID for narration' },
      duration: { type: 'string', description: 'Target duration: 30s, 60s, 3m, 12m' },
    },
    riskLevel: RiskLevel.MEDIUM,
    handler: async (args): Promise<ToolResult> => {
      const action = args.action as string;

      switch (action) {
        case 'create_ugc': {
          return await createHeyGenVideo(args);
        }
        case 'create_youtube_script': {
          return {
            success: true,
            output: JSON.stringify({
              action: 'create_youtube_script',
              topic: args.script,
              duration: args.duration || '12m',
              note: 'Script generation delegated to LLM with YouTube Creator prompts',
            }),
            truncated: false,
            duration_ms: 0,
          };
        }
        default:
          return { success: false, output: '', error: `Unknown video action: ${action}`, duration_ms: 0, truncated: false };
      }
    },
  };
}

async function createHeyGenVideo(args: Record<string, unknown>): Promise<ToolResult> {
  const apiKey = process.env.HEYGEN_API_KEY;
  if (!apiKey) {
    return { success: false, output: '', error: 'HeyGen API key not configured', duration_ms: 0, truncated: false };
  }

  try {
    const response = await fetch('https://api.heygen.com/v2/video/generate', {
      method: 'POST',
      headers: {
        'X-Api-Key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        video_inputs: [{
          character: {
            type: 'avatar',
            avatar_id: args.avatar || 'default',
            avatar_style: 'normal',
          },
          voice: {
            type: 'text',
            input_text: args.script as string,
            voice_id: args.voice || 'default',
          },
        }],
        dimension: { width: 1080, height: 1920 },
      }),
    });

    const data = await response.json() as any;

    if (response.ok) {
      return {
        success: true,
        output: `Video creation initiated! Video ID: ${data.data?.video_id}\nStatus: Processing`,
        truncated: false,
        duration_ms: 0,
      };
    } else {
      return { success: false, output: JSON.stringify(data), error: `HeyGen API error`, duration_ms: 0, truncated: false };
    }
  } catch (error: any) {
    return { success: false, output: '', error: error.message, duration_ms: 0, truncated: false };
  }
}
