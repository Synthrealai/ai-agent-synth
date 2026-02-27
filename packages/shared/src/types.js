import { z } from 'zod';
// ── Autonomy Levels ──
export var AutonomyLevel;
(function (AutonomyLevel) {
    AutonomyLevel["L0_CHAT_ONLY"] = "L0";
    AutonomyLevel["L1_TOOLS_WITH_APPROVAL"] = "L1";
    AutonomyLevel["L2_AUTO_LOW_RISK"] = "L2";
    AutonomyLevel["L3_SCHEDULED_HEARTBEAT"] = "L3";
})(AutonomyLevel || (AutonomyLevel = {}));
// ── Risk Levels ──
export var RiskLevel;
(function (RiskLevel) {
    RiskLevel[RiskLevel["NONE"] = 0] = "NONE";
    RiskLevel[RiskLevel["LOW"] = 1] = "LOW";
    RiskLevel[RiskLevel["MEDIUM"] = 2] = "MEDIUM";
    RiskLevel[RiskLevel["HIGH"] = 3] = "HIGH";
    RiskLevel[RiskLevel["CRITICAL"] = 4] = "CRITICAL";
})(RiskLevel || (RiskLevel = {}));
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
//# sourceMappingURL=types.js.map