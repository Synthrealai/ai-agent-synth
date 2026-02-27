import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import { dirname, resolve, join, relative } from 'path';
import { fileURLToPath } from 'url';
import { existsSync, readdirSync, statSync } from 'fs';
import { execFileSync } from 'child_process';

const log = {
  info: (payload: Record<string, unknown>, message: string) => {
    console.log(`[dashboard] ${message}`, payload);
  },
  error: (payload: Record<string, unknown>, message: string) => {
    console.error(`[dashboard] ${message}`, payload);
  },
};

const now = (): string => new Date().toISOString();

type MissionAgentInput = {
  name: string;
  role: string;
  layer: 'leadership' | 'operations' | 'input' | 'output' | 'meta';
  description: string;
  skills: string[];
  status?: 'active' | 'paused' | 'offline';
  priority?: number;
  icon?: string;
  accent?: string;
};

type MemoryDBLike = {
  seedMissionAgentsIfEmpty: (agents: MissionAgentInput[]) => number;
  getCalendarEvents: (limit?: number) => Array<any>;
  upsertCalendarEvent: (event: Record<string, unknown>) => any;
  addTimelineEvent: (event: { type: string; summary: string; payload: Record<string, unknown> }) => any;
  listMissionAgents: () => Array<any>;
  getSystemStats: () => Record<string, number>;
  getDailyCost: () => number;
  getRecentCosts: (days?: number) => Array<{ date: string; total_cents: number }>;
  getTimeline: (limit?: number, type?: string) => Array<any>;
  getApprovals: (status?: string, limit?: number) => Array<any>;
  resolveApproval: (id: string, status: 'approved' | 'denied', by?: string) => void;
  getCurrentTask: () => any;
  getTasks: (limit?: number, status?: string) => Array<any>;
  getContent: (limit?: number, status?: string) => Array<any>;
  searchMemories: (q: string, limit?: number) => Array<any>;
  addFeedbackItem: (item: Record<string, unknown>) => any;
  getFeedbackItems: (limit?: number, status?: string) => Array<any>;
};

type ApprovalAgentLike = {
  approveAction: (id: string) => Promise<string>;
  denyAction: (id: string) => Promise<string>;
};

async function loadMemoryCtor(): Promise<new () => MemoryDBLike> {
  const moduleUrl = new URL('../../../packages/memory/src/database.ts', import.meta.url).href;
  const memoryModule = await import(moduleUrl);
  const ctor =
    (memoryModule as Record<string, unknown>).MemoryDB ??
    ((memoryModule as Record<string, unknown>).default as Record<string, unknown> | undefined)?.MemoryDB;
  if (typeof ctor !== 'function') {
    throw new Error('MemoryDB export was not found in memory module');
  }
  return ctor as new () => MemoryDBLike;
}

async function loadApprovalAgentCtor(): Promise<new () => ApprovalAgentLike> {
  const moduleUrl = new URL('../../../packages/core/src/agent.ts', import.meta.url).href;
  const coreModule = await import(moduleUrl);
  const ctor =
    (coreModule as Record<string, unknown>).ForgeAgent ??
    ((coreModule as Record<string, unknown>).default as Record<string, unknown> | undefined)?.ForgeAgent;
  if (typeof ctor !== 'function') {
    throw new Error('ForgeAgent export was not found in core module');
  }
  return ctor as new () => ApprovalAgentLike;
}

const DEFAULT_MISSION_AGENTS: MissionAgentInput[] = [
  {
    name: 'Henry',
    role: 'Chief of Staff',
    layer: 'leadership',
    description: 'Coordinates delegation, keeps execution aligned, and routes major decisions.',
    skills: ['orchestration', 'clarity', 'delegation'],
    priority: 10,
    icon: '🦉',
    accent: '#4f7cff',
  },
  {
    name: 'Charlie',
    role: 'Infrastructure Engineer',
    layer: 'operations',
    description: 'Owns deployment reliability, automation quality, and core runtime systems.',
    skills: ['coding', 'infrastructure', 'automation'],
    priority: 9,
    icon: '🧰',
    accent: '#4f7cff',
  },
  {
    name: 'Ralph',
    role: 'Foreman / QA Manager',
    layer: 'operations',
    description: 'Checks output quality, signs off releases, and blocks regressions.',
    skills: ['quality assurance', 'monitoring', 'demo recording'],
    priority: 9,
    icon: '🔧',
    accent: '#d4a73d',
  },
  {
    name: 'Scout',
    role: 'Trend Analyst',
    layer: 'input',
    description: 'Finds demand signals, monitors competitors, and tracks market timing.',
    skills: ['speed', 'radar', 'intuition'],
    priority: 8,
    icon: '🔎',
    accent: '#22c55e',
  },
  {
    name: 'Quill',
    role: 'Content Writer',
    layer: 'input',
    description: 'Converts research into high-clarity content in Nick’s voice.',
    skills: ['voice', 'quality', 'design'],
    priority: 8,
    icon: '✍️',
    accent: '#8b5cf6',
  },
  {
    name: 'Pixel',
    role: 'Thumbnail Designer',
    layer: 'output',
    description: 'Designs visual assets that maximize click-through and attention.',
    skills: ['visual', 'attention', 'style'],
    priority: 8,
    icon: '🎨',
    accent: '#ec4899',
  },
  {
    name: 'Echo',
    role: 'Social Media Manager',
    layer: 'output',
    description: 'Queues and optimizes distribution across social channels.',
    skills: ['viral', 'speed', 'reach'],
    priority: 8,
    icon: '📣',
    accent: '#06b6d4',
  },
  {
    name: 'Codex',
    role: 'Lead Engineer',
    layer: 'meta',
    description: 'Builds high-leverage internal tooling and orchestrates technical execution.',
    skills: ['systems', 'architecture', 'delivery'],
    priority: 7,
    icon: '🧠',
    accent: '#6366f1',
  },
  {
    name: 'Violet',
    role: 'Research Analyst',
    layer: 'meta',
    description: 'Synthesizes deep research and builds strategic briefings.',
    skills: ['analysis', 'strategy', 'synthesis'],
    priority: 7,
    icon: '🔮',
    accent: '#a855f7',
  },
];

function parseLimit(value: unknown, fallback: number, max = 500): number {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) {
    return fallback;
  }
  return Math.min(Math.floor(n), max);
}

function listDocs(workspaceRoot: string, limit = 60): Array<{ path: string; title: string; updatedAt: string }> {
  const scanRoots = [join(workspaceRoot, 'docs'), workspaceRoot, join(workspaceRoot, 'memory')];
  const allowedExt = new Set(['.md', '.txt', '.yaml', '.yml']);
  const skipDirs = new Set(['node_modules', '.git', '.turbo', 'dist', 'data']);
  const out: Array<{ path: string; title: string; updatedAt: string }> = [];

  const walk = (dir: string): void => {
    if (!existsSync(dir) || out.length >= limit) {
      return;
    }
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (out.length >= limit) {
        break;
      }
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        if (skipDirs.has(entry.name)) {
          continue;
        }
        walk(full);
        continue;
      }
      const ext = entry.name.slice(entry.name.lastIndexOf('.')).toLowerCase();
      if (!allowedExt.has(ext)) {
        continue;
      }
      const stat = statSync(full);
      out.push({
        path: relative(workspaceRoot, full),
        title: entry.name,
        updatedAt: stat.mtime.toISOString(),
      });
    }
  };

  for (const root of scanRoots) {
    walk(root);
  }
  return out.slice(0, limit);
}

function getPm2Snapshot(): Array<{ name: string; status: string; uptimeSec: number }> {
  try {
    const raw = execFileSync('pm2', ['jlist'], { encoding: 'utf-8' });
    const parsed = JSON.parse(raw) as Array<any>;
    return parsed.map((item) => ({
      name: item.name,
      status: item.pm2_env?.status || 'unknown',
      uptimeSec: item.pm2_env?.pm_uptime ? Math.max(0, Math.floor((Date.now() - item.pm2_env.pm_uptime) / 1000)) : 0,
    }));
  } catch {
    return [];
  }
}

function seedDefaults(memory: MemoryDBLike): void {
  const inserted = memory.seedMissionAgentsIfEmpty(DEFAULT_MISSION_AGENTS);
  if (inserted > 0) {
    log.info({ inserted }, 'Seeded default mission agents');
  }

  if (memory.getCalendarEvents(1).length === 0) {
    const today = new Date();
    const day = today.toISOString().slice(0, 10);
    memory.upsertCalendarEvent({
      title: 'Morning Briefing',
      starts_at: `${day}T12:00:00.000Z`,
      type: 'briefing',
      status: 'scheduled',
      notes: 'Daily operating briefing draft and priorities.',
    });
    memory.upsertCalendarEvent({
      title: 'Weekly Intelligence Report',
      starts_at: `${day}T20:00:00.000Z`,
      type: 'report',
      status: 'scheduled',
      notes: 'Sunday deep work report.',
    });
  }
}

async function start(): Promise<void> {
  const app = express();
  const autonomyLevel = process.env.FORGE_AUTONOMY_LEVEL || 'L2';
  const MemoryCtor = await loadMemoryCtor();
  const ApprovalAgentCtor = await loadApprovalAgentCtor();
  const memory = new MemoryCtor();
  const approvalAgent = new ApprovalAgentCtor();
  const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
  const workspaceRoot = resolve(appRoot, '..', '..');
  const host = process.env.FORGE_DASHBOARD_HOST || '127.0.0.1';
  const port = Number(process.env.FORGE_DASHBOARD_PORT || 3000);
  const startedAt = Date.now();
  let paused = false;

  seedDefaults(memory);

  app.use(express.json());

  app.get('/api/mission-control/state', (_req: Request, res: Response) => {
    res.json({
      paused,
      started_at: new Date(startedAt).toISOString(),
      uptime_sec: Math.floor((Date.now() - startedAt) / 1000),
      generated_at: now(),
    });
  });

  app.post('/api/mission-control/pause', (req: Request, res: Response) => {
    paused = Boolean(req.body?.paused);
    memory.addTimelineEvent({
      type: 'system',
      summary: paused ? 'Mission Control paused' : 'Mission Control resumed',
      payload: { paused },
    });
    res.json({ ok: true, paused });
  });

  app.post('/api/mission-control/ping', (req: Request, res: Response) => {
    const target = typeof req.body?.target === 'string' ? req.body.target : 'Henry';
    memory.addTimelineEvent({
      type: 'system',
      summary: `Ping sent to ${target}`,
      payload: { target },
    });
    res.json({ ok: true, target, sent_at: now() });
  });

  app.get('/api/mission-control', (_req: Request, res: Response) => {
    const agents = memory.listMissionAgents();
    const byLayer = {
      leadership: agents.filter((a) => a.layer === 'leadership'),
      operations: agents.filter((a) => a.layer === 'operations'),
      input: agents.filter((a) => a.layer === 'input'),
      output: agents.filter((a) => a.layer === 'output'),
      meta: agents.filter((a) => a.layer === 'meta'),
    };
    res.json({
      by_layer: byLayer,
      stats: memory.getSystemStats(),
      generated_at: now(),
    });
  });

  app.get('/api/health', (_req: Request, res: Response) => {
    const envStatus = {
      openrouter: Boolean(process.env.OPENROUTER_API_KEY),
      telegram: Boolean(process.env.TELEGRAM_BOT_TOKEN),
      n8n: Boolean(process.env.N8N_API_KEY),
      stripe: Boolean(process.env.STRIPE_SECRET_KEY),
      heygen: Boolean(process.env.HEYGEN_API_KEY),
    };
    res.json({
      status: 'ok',
      host,
      port,
      paused,
      uptime_sec: Math.floor((Date.now() - startedAt) / 1000),
      autonomy_level: autonomyLevel,
      services: getPm2Snapshot(),
      db_stats: memory.getSystemStats(),
      env: envStatus,
      costs: {
        today_cents: memory.getDailyCost(),
        recent: memory.getRecentCosts(7),
      },
    });
  });

  app.get('/api/timeline', (req: Request, res: Response) => {
    const limit = parseLimit(req.query.limit, 50);
    const type = typeof req.query.type === 'string' ? req.query.type : undefined;
    res.json(memory.getTimeline(limit, type));
  });

  app.get('/api/approvals', (req: Request, res: Response) => {
    const limit = parseLimit(req.query.limit, 50);
    const status = typeof req.query.status === 'string' ? req.query.status : undefined;
    res.json(memory.getApprovals(status as any, limit));
  });

  app.post('/api/approvals/:id/approve', async (req: Request, res: Response) => {
    const approvalId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const result = await approvalAgent.approveAction(approvalId);
    const ok = !result.startsWith('❌ Approval ID not found');
    res.status(ok ? 200 : 404).json({ ok, message: result });
  });

  app.post('/api/approvals/:id/deny', async (req: Request, res: Response) => {
    const approvalId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const result = await approvalAgent.denyAction(approvalId);
    const ok = !result.startsWith('❌ Approval ID not found');
    res.status(ok ? 200 : 404).json({ ok, message: result });
  });

  app.get('/api/tasks/current', (_req: Request, res: Response) => {
    res.json(memory.getCurrentTask());
  });

  app.get('/api/tasks', (req: Request, res: Response) => {
    const limit = parseLimit(req.query.limit, 50);
    const status = typeof req.query.status === 'string' ? req.query.status : undefined;
    res.json(memory.getTasks(limit, status));
  });

  app.get('/api/content', (req: Request, res: Response) => {
    const limit = parseLimit(req.query.limit, 50);
    const status = typeof req.query.status === 'string' ? req.query.status : undefined;
    res.json(memory.getContent(limit, status));
  });

  app.get('/api/memory/search', (req: Request, res: Response) => {
    const q = typeof req.query.q === 'string' ? req.query.q : '';
    const limit = parseLimit(req.query.limit, 10, 50);
    res.json(memory.searchMemories(q, limit));
  });

  app.get('/api/calendar', (req: Request, res: Response) => {
    const limit = parseLimit(req.query.limit, 20, 200);
    res.json(memory.getCalendarEvents(limit));
  });

  app.post('/api/calendar', (req: Request, res: Response) => {
    const title = String(req.body?.title || '').trim();
    const starts_at = String(req.body?.starts_at || '').trim();
    if (!title || !starts_at) {
      res.status(400).json({ error: 'title and starts_at are required' });
      return;
    }
    const event = memory.upsertCalendarEvent({
      title,
      starts_at,
      ends_at: req.body?.ends_at ? String(req.body.ends_at) : undefined,
      type: req.body?.type ? String(req.body.type) : 'task',
      status: req.body?.status ? String(req.body.status) as any : 'scheduled',
      notes: req.body?.notes ? String(req.body.notes) : undefined,
    });
    res.status(201).json(event);
  });

  app.get('/api/feedback', (req: Request, res: Response) => {
    const limit = parseLimit(req.query.limit, 30, 100);
    const status = typeof req.query.status === 'string' ? req.query.status : undefined;
    res.json(memory.getFeedbackItems(limit, status as any));
  });

  app.post('/api/feedback', (req: Request, res: Response) => {
    const text = String(req.body?.text || '').trim();
    if (!text) {
      res.status(400).json({ error: 'text is required' });
      return;
    }
    const item = memory.addFeedbackItem({
      source: String(req.body?.source || 'dashboard'),
      category: String(req.body?.category || 'general'),
      text,
      status: 'open',
      priority: Number(req.body?.priority || 5),
    });
    res.status(201).json(item);
  });

  app.get('/api/docs', (req: Request, res: Response) => {
    const limit = parseLimit(req.query.limit, 60, 300);
    res.json(listDocs(workspaceRoot, limit));
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      root: appRoot,
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = resolve(appRoot, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(resolve(distDir, 'index.html'));
    });
  }

  app.listen(port, host, () => {
    log.info({ host, port, mode: process.env.NODE_ENV || 'development' }, 'Dashboard started');
  });
}

start().catch((error) => {
  log.error({ error: error instanceof Error ? error.message : String(error) }, 'Dashboard failed to start');
  process.exit(1);
});
