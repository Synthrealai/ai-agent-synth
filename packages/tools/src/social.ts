import { RiskLevel, type ToolResult } from '@forgeclaw/shared';
import type { ToolDefinition } from './index.js';

export function createSocialTool(): ToolDefinition {
  return {
    name: 'social',
    description: 'Post content to social media platforms (Twitter/X, LinkedIn, etc.)',
    parameters: {
      platform: { type: 'string', description: 'Platform: twitter, linkedin, tiktok', required: true },
      action: { type: 'string', description: 'Action: post, thread, reply, like, retweet', required: true },
      content: { type: 'string', description: 'The content to post', required: true },
      media_urls: { type: 'string', description: 'JSON array of media URLs to attach' },
      reply_to: { type: 'string', description: 'Tweet/post ID to reply to' },
    },
    riskLevel: RiskLevel.HIGH,
    handler: async (args): Promise<ToolResult> => {
      const platform = args.platform as string;
      const action = args.action as string;
      const content = args.content as string;

      switch (platform) {
        case 'twitter': {
          return await postToTwitter(action, content, args);
        }
        default:
          return { success: false, output: '', error: `Platform ${platform} not yet implemented`, duration_ms: 0, truncated: false };
      }
    },
  };
}

async function postToTwitter(_action: string, content: string, _args: Record<string, unknown>): Promise<ToolResult> {
  const apiKey = process.env.TWITTER_API_KEY;
  const accessToken = process.env.TWITTER_ACCESS_TOKEN;

  if (!apiKey || !accessToken) {
    return { success: false, output: '', error: 'Twitter API credentials not configured', duration_ms: 0, truncated: false };
  }

  try {
    const response = await fetch('https://api.twitter.com/2/tweets', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.TWITTER_BEARER_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text: content }),
    });

    const data = await response.json() as any;

    if (response.ok) {
      return {
        success: true,
        output: `Tweet posted! ID: ${data.data?.id}\nURL: https://twitter.com/i/status/${data.data?.id}`,
        truncated: false,
        duration_ms: 0,
      };
    } else {
      return {
        success: false,
        output: JSON.stringify(data),
        error: `Twitter API error: ${response.status}`,
        duration_ms: 0,
        truncated: false,
      };
    }
  } catch (error: any) {
    return { success: false, output: '', error: error.message, duration_ms: 0, truncated: false };
  }
}
