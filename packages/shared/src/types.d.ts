import { z } from 'zod';
export declare enum AutonomyLevel {
    L0_CHAT_ONLY = "L0",
    L1_TOOLS_WITH_APPROVAL = "L1",
    L2_AUTO_LOW_RISK = "L2",
    L3_SCHEDULED_HEARTBEAT = "L3",
    L4_MULTI_TRACK_AUTONOMY = "L4"
}
export declare enum RiskLevel {
    NONE = 0,
    LOW = 1,
    MEDIUM = 2,
    HIGH = 3,
    CRITICAL = 4
}
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
export interface Memory {
    id: string;
    type: 'fact' | 'preference' | 'project' | 'decision' | 'learning' | 'contact' | 'skill';
    text: string;
    tags: string[];
    importance: number;
    created_at: string;
    updated_at: string;
    source?: string;
}
export interface TimelineEvent {
    id: string;
    timestamp: string;
    type: 'message' | 'tool_call' | 'tool_result' | 'plan_created' | 'plan_step' | 'approval' | 'error' | 'system' | 'content_posted' | 'video_created';
    summary: string;
    payload: Record<string, unknown>;
}
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
export interface AgentMessage {
    id: string;
    role: 'user' | 'assistant' | 'system' | 'tool';
    content: string;
    timestamp: string;
    channel: 'cli' | 'telegram' | 'dashboard' | 'scheduler' | 'internal';
    metadata?: Record<string, unknown>;
}
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
export interface PolicyRule {
    id: string;
    action: 'allow' | 'deny' | 'warn' | 'require_approval';
    tool_pattern: string;
    arg_patterns?: Record<string, string>;
    risk_threshold?: RiskLevel;
    description: string;
}
export declare const ForgeConfigSchema: z.ZodObject<{
    autonomy_level: z.ZodDefault<z.ZodNativeEnum<typeof AutonomyLevel>>;
    max_cost_per_day: z.ZodDefault<z.ZodNumber>;
    default_model: z.ZodDefault<z.ZodString>;
    reasoning_model: z.ZodDefault<z.ZodString>;
    fast_model: z.ZodDefault<z.ZodString>;
    coding_model: z.ZodDefault<z.ZodString>;
    data_dir: z.ZodDefault<z.ZodString>;
    log_level: z.ZodDefault<z.ZodEnum<["debug", "info", "warn", "error"]>>;
    owner_name: z.ZodDefault<z.ZodString>;
    business_name: z.ZodDefault<z.ZodString>;
    timezone: z.ZodDefault<z.ZodString>;
    heartbeat_enabled: z.ZodDefault<z.ZodBoolean>;
    content_voice: z.ZodDefault<z.ZodObject<{
        tone: z.ZodDefault<z.ZodString>;
        avoid: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        influences: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    }, "strip", z.ZodTypeAny, {
        tone: string;
        avoid: string[];
        influences: string[];
    }, {
        tone?: string | undefined;
        avoid?: string[] | undefined;
        influences?: string[] | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    autonomy_level: AutonomyLevel;
    max_cost_per_day: number;
    default_model: string;
    reasoning_model: string;
    fast_model: string;
    coding_model: string;
    data_dir: string;
    log_level: "error" | "warn" | "debug" | "info";
    owner_name: string;
    business_name: string;
    timezone: string;
    heartbeat_enabled: boolean;
    content_voice: {
        tone: string;
        avoid: string[];
        influences: string[];
    };
}, {
    autonomy_level?: AutonomyLevel | undefined;
    max_cost_per_day?: number | undefined;
    default_model?: string | undefined;
    reasoning_model?: string | undefined;
    fast_model?: string | undefined;
    coding_model?: string | undefined;
    data_dir?: string | undefined;
    log_level?: "error" | "warn" | "debug" | "info" | undefined;
    owner_name?: string | undefined;
    business_name?: string | undefined;
    timezone?: string | undefined;
    heartbeat_enabled?: boolean | undefined;
    content_voice?: {
        tone?: string | undefined;
        avoid?: string[] | undefined;
        influences?: string[] | undefined;
    } | undefined;
}>;
export type ForgeConfig = z.infer<typeof ForgeConfigSchema>;
//# sourceMappingURL=types.d.ts.map