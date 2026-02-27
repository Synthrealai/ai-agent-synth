import { z } from 'zod';

// ── Autonomy Levels ──
export enum AutonomyLevel {
  L0_CHAT_ONLY = 'L0',
  L1_TOOLS_WITH_APPROVAL = 'L1',
  L2_AUTO_LOW_RISK = 'L2',
  L3_SCHEDULED_HEARTBEAT = 'L3',
}

// ── Risk Levels ──
export enum RiskLevel {
  NONE = 0,
  LOW = 1,
  MEDIUM = 2,
  HIGH = 3,
  CRITICAL = 4,
}

// ── Tool Call ──
export interface ToolCall {
  id: string;
  tool: string;
  args: Record<string, unknown>;
  riskLevel: RiskLevel;
  timestamp: string;
  approved: boolean;
  result?: ToolResult;
}

export interface ToolResult {
  success: boolean;
  output: string;
  error?: string;
  duration_ms: number;
  truncated: boolean;
}

// ── Plan & Steps ──
export interface ActionPlan {
  id: string;
  goal: string;
  steps: PlanStep[];
  status: 'planning' | 'executing' | 'paused' | 'completed' | 'failed';
  created_at: string;
  updated_at: string;
}

export interface PlanStep {
  id: string;
  description: string;
  tool: string;
  args: Record<string, unknown>;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped' | 'awaiting_approval';
  result?: ToolResult;
  risk_level: RiskLevel;
}

// ── Memory ──
export interface Memory {
  id: string;
  type: 'fact' | 'preference' | 'project' | 'decision' | 'learning' | 'contact' | 'skill';
  text: string;
  tags: string[];
  importance: number; // 0-10
  created_at: string;
  updated_at: string;
  source?: string;
}

// ── Timeline Event ──
export interface TimelineEvent {
  id: string;
  timestamp: string;
  type: 'message' | 'tool_call' | 'tool_result' | 'plan_created' | 'plan_step' | 'approval' | 'error' | 'system' | 'content_posted' | 'video_created';
  summary: string;
  payload: Record<string, unknown>;
}

// ── Approval ──
export interface Approval {
  id: string;
  status: 'pending' | 'approved' | 'denied' | 'expired';
  request: {
    tool: string;
    args: Record<string, unknown>;
    risk_level: RiskLevel;
    reason: string;
  };
  requested_at: string;
  resolved_at?: string;
  resolved_by?: string;
}

// ── Message ──
export interface AgentMessage {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  timestamp: string;
  channel: 'cli' | 'telegram' | 'dashboard' | 'scheduler' | 'internal';
  metadata?: Record<string, unknown>;
}

// ── Content ──
export interface ContentPiece {
  id: string;
  type: 'tweet' | 'thread' | 'linkedin_post' | 'youtube_script' | 'tiktok_script' | 'newsletter' | 'blog' | 'ugc_script' | 'instagram_caption';
  platform: 'twitter' | 'linkedin' | 'youtube' | 'tiktok' | 'instagram' | 'substack' | 'beehiiv';
  title?: string;
  body: string;
  media_urls?: string[];
  status: 'draft' | 'scheduled' | 'posted' | 'failed';
  scheduled_for?: string;
  posted_at?: string;
  engagement?: {
    views?: number;
    likes?: number;
    comments?: number;
    shares?: number;
  };
  source_idea?: string;
  created_at: string;
}

// ── Skill Definition ──
export interface SkillManifest {
  name: string;
  version: string;
  description: string;
  triggers: string[];
  tools_allowed: string[];
  risk_profile: RiskLevel;
  author: string;
  signed: boolean;
}

// ── Policy Rule ──
export interface PolicyRule {
  id: string;
  action: 'allow' | 'deny' | 'warn' | 'require_approval';
  tool_pattern: string;
  arg_patterns?: Record<string, string>; // regex patterns
  risk_threshold?: RiskLevel;
  description: string;
}

// ── Config Schema ──
export const ForgeConfigSchema = z.object({
  autonomy_level: z.nativeEnum(AutonomyLevel).default(AutonomyLevel.L2_AUTO_LOW_RISK),
  max_cost_per_day: z.number().default(25),
  default_model: z.string().default('anthropic/claude-sonnet-4-20250514'),
  reasoning_model: z.string().default('anthropic/claude-opus-4-0-20250115'),
  fast_model: z.string().default('groq/llama-3.3-70b-versatile'),
  coding_model: z.string().default('anthropic/claude-sonnet-4-20250514'),
  data_dir: z.string().default('~/.forgeclaw/data'),
  log_level: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  owner_name: z.string().default('Nick'),
  business_name: z.string().default('Forged Intelligence'),
  timezone: z.string().default('America/Chicago'),
  heartbeat_enabled: z.boolean().default(false),
  content_voice: z.object({
    tone: z.string().default('direct, builder-mentality, stoic'),
    avoid: z.array(z.string()).default(['fluff', 'corporate-speak', 'excessive-emojis']),
    influences: z.array(z.string()).default(['Marcus Aurelius', 'Naval Ravikant', 'Dan Koe', 'Alex Hormozi']),
  }).default({}),
});

export type ForgeConfig = z.infer<typeof ForgeConfigSchema>;
