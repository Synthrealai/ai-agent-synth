import { config as dotenvConfig } from 'dotenv';
import { resolve } from 'path';
import { existsSync } from 'fs';
import { ForgeConfigSchema } from './types.js';
const envPaths = [
    resolve(process.cwd(), '.env'),
    resolve(process.env.HOME || '~', '.forgeclaw', '.env'),
];
for (const envPath of envPaths) {
    if (existsSync(envPath)) {
        dotenvConfig({ path: envPath });
    }
}
export function loadConfig() {
    return ForgeConfigSchema.parse({
        autonomy_level: process.env.FORGE_AUTONOMY_LEVEL,
        max_cost_per_day: process.env.FORGE_MAX_COST_PER_DAY ? parseFloat(process.env.FORGE_MAX_COST_PER_DAY) : undefined,
        default_model: process.env.FORGE_DEFAULT_MODEL,
        reasoning_model: process.env.FORGE_REASONING_MODEL,
        fast_model: process.env.FORGE_FAST_MODEL,
        coding_model: process.env.FORGE_CODING_MODEL,
        data_dir: process.env.FORGE_DATA_DIR,
        log_level: process.env.FORGE_LOG_LEVEL,
    });
}
export function requireEnv(key) {
    const value = process.env[key];
    if (!value)
        throw new Error(`Missing required environment variable: ${key}`);
    return value;
}
export function optionalEnv(key, fallback = '') {
    return process.env[key] || fallback;
}
//# sourceMappingURL=config.js.map