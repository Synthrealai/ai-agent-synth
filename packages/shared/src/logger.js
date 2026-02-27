import pino from 'pino';
import { mkdirSync } from 'fs';
import { resolve } from 'path';
import { redactSecrets } from './redaction.js';
const dataDir = (process.env.FORGE_DATA_DIR || '~/.forgeclaw/data').replace('~', process.env.HOME || '');
mkdirSync(resolve(dataDir, 'logs'), { recursive: true });
const transport = pino.transport({
    targets: [
        {
            target: 'pino-pretty',
            options: { colorize: true, translateTime: 'SYS:standard' },
            level: process.env.FORGE_LOG_LEVEL || 'info',
        },
        {
            target: 'pino/file',
            options: { destination: resolve(dataDir, 'logs/forge.log') },
            level: 'debug',
        },
    ],
});
export const logger = pino({
    level: process.env.FORGE_LOG_LEVEL || 'info',
    formatters: {
        log(obj) {
            return JSON.parse(redactSecrets(JSON.stringify(obj)));
        },
    },
}, transport);
export function createChildLogger(module) {
    return logger.child({ module });
}
//# sourceMappingURL=logger.js.map