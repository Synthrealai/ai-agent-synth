import { readFileSync, writeFileSync, readdirSync, mkdirSync, copyFileSync, renameSync, unlinkSync, existsSync, statSync, rmSync } from 'fs';
import { dirname, resolve } from 'path';
import { RiskLevel, truncate, type ToolResult } from '@forgeclaw/shared';
import type { ToolDefinition } from './index.js';

const HOME_DIR = process.env.HOME || '';
const WORKSPACE_ROOT = process.env.FORGE_WORKSPACE_ROOT || process.cwd();
const LEGACY_WORKSPACE_ROOTS = [
  '/workspace',
  '/app',
  '/project',
  '/Users/nick/Desktop/feb27Synthrella',
].filter(Boolean);

function remapLegacyWorkspacePath(inputPath: string): string {
  for (const prefix of LEGACY_WORKSPACE_ROOTS) {
    if (inputPath === prefix || inputPath.startsWith(`${prefix}/`)) {
      const suffix = inputPath.slice(prefix.length).replace(/^\/+/, '');
      return suffix ? resolve(WORKSPACE_ROOT, suffix) : resolve(WORKSPACE_ROOT);
    }
  }
  return inputPath;
}

function normalizePath(inputPath: string): string {
  let candidate = String(inputPath || '').trim();
  if (!candidate) {
    return resolve(WORKSPACE_ROOT);
  }

  if (candidate.startsWith('~')) {
    candidate = HOME_DIR ? `${HOME_DIR}${candidate.slice(1)}` : candidate.slice(1);
  }

  const homeUserMatch = candidate.match(/^\/home\/([^/]+)(\/.*)?$/);
  if (homeUserMatch && HOME_DIR.startsWith('/Users/')) {
    const homeUser = HOME_DIR.split('/').pop();
    if (homeUser && homeUserMatch[1] === homeUser) {
      candidate = `${HOME_DIR}${homeUserMatch[2] || ''}`;
    }
  }

  candidate = remapLegacyWorkspacePath(candidate);

  if (!candidate.startsWith('/')) {
    candidate = resolve(WORKSPACE_ROOT, candidate);
  }

  return resolve(candidate);
}

export function createFilesystemTool(): ToolDefinition {
  return {
    name: 'filesystem',
    description: 'Read, write, list, create, move, copy, or delete files and directories.',
    parameters: {
      action: { type: 'string', description: 'Action: read, write, list, mkdir, move, copy, delete, exists, stat', required: true },
      path: { type: 'string', description: 'File or directory path', required: true },
      content: { type: 'string', description: 'Content to write (for write action)' },
      destination: { type: 'string', description: 'Destination path (for move/copy)' },
    },
    riskLevel: RiskLevel.LOW,
    handler: async (args): Promise<ToolResult> => {
      const action = args.action as string;
      const path = normalizePath(args.path as string);
      const content = args.content as string;
      const destination = args.destination ? normalizePath(args.destination as string) : undefined;

      try {
        switch (action) {
          case 'read': {
            const data = readFileSync(path, 'utf-8');
            const { text, truncated } = truncate(data, 8000);
            return { success: true, output: text, truncated, duration_ms: 0 };
          }
          case 'write': {
            mkdirSync(dirname(path), { recursive: true });
            writeFileSync(path, content || '', 'utf-8');
            return { success: true, output: `Written ${(content || '').length} bytes to ${path}`, truncated: false, duration_ms: 0 };
          }
          case 'list': {
            const entries = readdirSync(path, { withFileTypes: true });
            const listing = entries.map(e => `${e.isDirectory() ? '📁' : '📄'} ${e.name}`).join('\n');
            return { success: true, output: listing, truncated: false, duration_ms: 0 };
          }
          case 'mkdir': {
            mkdirSync(path, { recursive: true });
            return { success: true, output: `Created directory: ${path}`, truncated: false, duration_ms: 0 };
          }
          case 'move': {
            if (!destination) {
              return { success: false, output: '', error: 'destination is required for move', duration_ms: 0, truncated: false };
            }
            mkdirSync(dirname(destination), { recursive: true });
            renameSync(path, destination!);
            return { success: true, output: `Moved ${path} → ${destination}`, truncated: false, duration_ms: 0 };
          }
          case 'copy': {
            if (!destination) {
              return { success: false, output: '', error: 'destination is required for copy', duration_ms: 0, truncated: false };
            }
            mkdirSync(dirname(destination), { recursive: true });
            copyFileSync(path, destination!);
            return { success: true, output: `Copied ${path} → ${destination}`, truncated: false, duration_ms: 0 };
          }
          case 'delete': {
            const stat = statSync(path);
            if (stat.isDirectory()) {
              rmSync(path, { recursive: true, force: true });
              return { success: true, output: `Deleted directory: ${path}`, truncated: false, duration_ms: 0 };
            }
            unlinkSync(path);
            return { success: true, output: `Deleted file: ${path}`, truncated: false, duration_ms: 0 };
          }
          case 'exists': {
            return { success: true, output: existsSync(path) ? 'true' : 'false', truncated: false, duration_ms: 0 };
          }
          case 'stat': {
            const stat = statSync(path);
            return {
              success: true,
              output: JSON.stringify({ size: stat.size, isDir: stat.isDirectory(), modified: stat.mtime }, null, 2),
              truncated: false,
              duration_ms: 0,
            };
          }
          default:
            return { success: false, output: '', error: `Unknown action: ${action}`, duration_ms: 0, truncated: false };
        }
      } catch (error: any) {
        return { success: false, output: '', error: error.message, duration_ms: 0, truncated: false };
      }
    },
  };
}
