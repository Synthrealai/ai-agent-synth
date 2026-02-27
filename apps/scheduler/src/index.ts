#!/usr/bin/env tsx
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'fs';
import { dirname, relative, resolve } from 'path';
import YAML from 'yaml';
import { ForgeAgent } from '@forgeclaw/core';
import { createChildLogger, now } from '@forgeclaw/shared';

const log = createChildLogger('scheduler');

type RoleConfig = {
  name: string;
  objective: string;
  task_templates: string[];
};

type HarnessTrack = {
  name: string;
  objective: string;
  task_templates: string[];
  required_skills: string[];
  output_dir: string;
};

type HarnessConfig = {
  name?: string;
  phase?: number;
  tracks?: HarnessTrack[];
};

type InlineFilesystemWrite = {
  path: string;
  content: string;
};

type AutonomyConfig = {
  enabled: boolean;
  phase: 3 | 4;
  tick_seconds: number;
  max_open_tasks: number;
  max_tasks_seed_per_tick: number;
  max_tasks_run_per_tick: number;
  harness_enabled: boolean;
  harness_path: string;
  enforce_file_outputs: boolean;
  roles: RoleConfig[];
};

const DEFAULT_AUTONOMY_CONFIG: AutonomyConfig = {
  enabled: true,
  phase: 4,
  tick_seconds: 90,
  max_open_tasks: 12,
  max_tasks_seed_per_tick: 3,
  max_tasks_run_per_tick: 3,
  harness_enabled: true,
  harness_path: 'configs/harness.yaml',
  enforce_file_outputs: true,
  roles: [
    {
      name: 'Scout',
      objective: 'Find one concrete demand signal and turn it into an execution-ready opportunity.',
      task_templates: [
        'Identify one high-intent problem worth solving this week and capture proof links.',
        'Find one audience pain point and propose one high-leverage content angle with evidence.',
      ],
    },
    {
      name: 'Builder',
      objective: 'Ship one tangible asset in the workspace that can be used or sold.',
      task_templates: [
        'Create one usable asset tied to current opportunities and log exact output paths.',
        'Improve one existing asset for higher conversion or clarity and log exact changes.',
      ],
    },
    {
      name: 'Publisher',
      objective: 'Create one distribution artifact that drives traffic, trust, or leads.',
      task_templates: [
        'Draft one high-value distribution artifact tied to shipped work with explicit CTA.',
      ],
    },
    {
      name: 'Closer',
      objective: 'Move one opportunity toward revenue with explicit next actions.',
      task_templates: [
        'Draft one concise offer and CTA sequence for the highest-leverage lead.',
      ],
    },
  ],
};

function clampInt(value: unknown, fallback: number, min: number, max: number): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, Math.floor(n)));
}

function asBool(value: unknown, fallback: boolean): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['true', '1', 'yes', 'on'].includes(normalized)) return true;
    if (['false', '0', 'no', 'off'].includes(normalized)) return false;
  }
  return fallback;
}

function resolveConfigPath(pathValue: string): string {
  if (!pathValue) return resolve(process.cwd(), 'configs/autonomy.yaml');
  return pathValue.startsWith('/') ? pathValue : resolve(process.cwd(), pathValue);
}

function loadAutonomyConfig(): AutonomyConfig {
  const configPath = resolveConfigPath(process.env.FORGE_AUTONOMY_CONFIG_PATH || 'configs/autonomy.yaml');
  if (!existsSync(configPath)) {
    return DEFAULT_AUTONOMY_CONFIG;
  }

  try {
    const raw = YAML.parse(readFileSync(configPath, 'utf-8')) as Partial<AutonomyConfig>;
    const roles = Array.isArray(raw.roles) && raw.roles.length > 0 ? raw.roles : DEFAULT_AUTONOMY_CONFIG.roles;

    return {
      enabled: asBool(raw.enabled, DEFAULT_AUTONOMY_CONFIG.enabled),
      phase: clampInt(raw.phase, DEFAULT_AUTONOMY_CONFIG.phase, 3, 4) as 3 | 4,
      tick_seconds: clampInt(raw.tick_seconds, DEFAULT_AUTONOMY_CONFIG.tick_seconds, 15, 3600),
      max_open_tasks: clampInt(raw.max_open_tasks, DEFAULT_AUTONOMY_CONFIG.max_open_tasks, 1, 50),
      max_tasks_seed_per_tick: clampInt(raw.max_tasks_seed_per_tick, DEFAULT_AUTONOMY_CONFIG.max_tasks_seed_per_tick, 1, 8),
      max_tasks_run_per_tick: clampInt(raw.max_tasks_run_per_tick, DEFAULT_AUTONOMY_CONFIG.max_tasks_run_per_tick, 1, 10),
      harness_enabled: asBool(raw.harness_enabled, DEFAULT_AUTONOMY_CONFIG.harness_enabled),
      harness_path: raw.harness_path || DEFAULT_AUTONOMY_CONFIG.harness_path,
      enforce_file_outputs: asBool(raw.enforce_file_outputs, DEFAULT_AUTONOMY_CONFIG.enforce_file_outputs),
      roles: roles.map((role) => ({
        name: String(role.name || 'Operator'),
        objective: String(role.objective || 'Move the system forward with concrete outputs.'),
        task_templates: Array.isArray(role.task_templates) && role.task_templates.length > 0
          ? role.task_templates.map((template) => String(template))
          : ['Create one concrete artifact and log exactly what changed.'],
      })),
    };
  } catch (error: any) {
    log.warn({ error: error.message, path: configPath }, 'Failed to parse autonomy config, using defaults');
    return DEFAULT_AUTONOMY_CONFIG;
  }
}

function loadHarnessTracks(pathValue: string): HarnessTrack[] {
  const configPath = resolveConfigPath(pathValue);
  if (!existsSync(configPath)) {
    return [];
  }

  try {
    const raw = YAML.parse(readFileSync(configPath, 'utf-8')) as HarnessConfig;
    const tracks = Array.isArray(raw.tracks) ? raw.tracks : [];

    return tracks
      .map((track) => ({
        name: String(track.name || 'Track'),
        objective: String(track.objective || 'Create compounding business outputs.'),
        task_templates: Array.isArray(track.task_templates) && track.task_templates.length > 0
          ? track.task_templates.map((template) => String(template))
          : ['Produce one concrete output and save it to disk.'],
        required_skills: Array.isArray(track.required_skills)
          ? track.required_skills.map((skill) => String(skill))
          : [],
        output_dir: String(track.output_dir || 'data/artifacts'),
      }))
      .filter((track) => Boolean(track.name));
  } catch (error: any) {
    log.warn({ error: error.message, path: configPath }, 'Failed to parse harness config, falling back to role tracks');
    return [];
  }
}

function clip(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;
  return `${text.slice(0, maxChars - 12)}\n...[truncated]`;
}

function parseRoleName(goal: string): string {
  const match = goal.match(/^\[([^\]]+)\]/);
  return match ? match[1] : 'Operator';
}

function normalizeOutputPath(inputPath: string): string {
  let candidate = String(inputPath || '').trim().replace(/^`|`$/g, '');
  if (!candidate) return resolve(process.cwd());

  for (const prefix of ['/workspace', '/app', '/project']) {
    if (candidate === prefix || candidate.startsWith(`${prefix}/`)) {
      const suffix = candidate.slice(prefix.length).replace(/^\/+/, '');
      return suffix ? resolve(process.cwd(), suffix) : resolve(process.cwd());
    }
  }

  if (!candidate.startsWith('/')) {
    candidate = resolve(process.cwd(), candidate);
  }

  return resolve(candidate);
}

function extractOutputPaths(response: string): string[] {
  const paths = new Set<string>();
  const lines = response.split('\n');
  let inOutputBlock = false;

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (!inOutputBlock) {
      if (/^output_paths\s*:/i.test(line)) {
        inOutputBlock = true;
      }
      continue;
    }

    if (!line) continue;
    if (/^summary\s*:/i.test(line)) break;

    const cleaned = line.replace(/^[-*]\s*/, '').replace(/^`|`$/g, '').trim();
    if (!cleaned) continue;
    if (cleaned.startsWith('/') || cleaned.startsWith('./') || cleaned.startsWith('../')) {
      paths.add(cleaned);
    }
  }

  return Array.from(paths);
}

function isWithinWorkspace(pathValue: string): boolean {
  const rel = relative(process.cwd(), pathValue);
  if (!rel) return true;
  return !rel.startsWith('..') && !rel.startsWith('/../');
}

function stripCodeFences(input: string): string {
  let text = input.trim();
  if (text.startsWith('```')) {
    text = text.replace(/^```[a-zA-Z]*\n?/, '');
    text = text.replace(/\n?```$/, '');
  }
  return text.trim();
}

function extractInlineFilesystemWrite(response: string): InlineFilesystemWrite | null {
  const candidate = stripCodeFences(response);
  if (!candidate.startsWith('{')) return null;

  try {
    const parsed = JSON.parse(candidate) as Record<string, unknown>;
    const tool = String(parsed.tool || '').toLowerCase();
    const args = (parsed.args as Record<string, unknown> | undefined) || {};
    const action =
      typeof args.action === 'string'
        ? args.action.toLowerCase()
        : tool.includes('.')
          ? tool.split('.').slice(1).join('.').toLowerCase()
          : '';

    const toolName = tool.includes('.') ? tool.split('.')[0] : tool;
    if (toolName !== 'filesystem' || action !== 'write') return null;

    const pathValue = typeof args.path === 'string' ? args.path : '';
    const contentValue = typeof args.content === 'string' ? args.content : '';
    if (!pathValue || !contentValue) return null;

    return { path: pathValue, content: contentValue };
  } catch {
    return null;
  }
}

function roleToTrack(role: RoleConfig): HarnessTrack {
  return {
    name: role.name,
    objective: role.objective,
    task_templates: role.task_templates,
    required_skills: [],
    output_dir: 'data/artifacts',
  };
}

class ForgeScheduler {
  private readonly agent = new ForgeAgent();
  private readonly memory = this.agent.getMemoryDB();
  private readonly config = loadAutonomyConfig();
  private readonly harnessTracks = loadHarnessTracks(this.config.harness_path);
  private readonly tracks: HarnessTrack[] =
    this.config.harness_enabled && this.harnessTracks.length > 0
      ? this.harnessTracks
      : this.config.roles.map(roleToTrack);

  private running = false;
  private seedCounter = 0;

  async start(): Promise<void> {
    if (!this.config.enabled) {
      log.warn('Autonomy scheduler disabled via config');
      return;
    }

    log.info(
      {
        phase: this.config.phase,
        tick_seconds: this.config.tick_seconds,
        max_open_tasks: this.config.max_open_tasks,
        max_tasks_run_per_tick: this.config.max_tasks_run_per_tick,
        tracks: this.tracks.map((track) => track.name),
      },
      'Scheduler started'
    );

    await this.tick();
    setInterval(() => {
      void this.tick();
    }, this.config.tick_seconds * 1000);
  }

  private countOpenTasks(): number {
    return this.memory
      .getTasks(500)
      .filter((task) => task.status === 'planning' || task.status === 'executing' || task.status === 'paused').length;
  }

  private nextTrack(): HarnessTrack {
    const track = this.tracks[this.seedCounter % this.tracks.length];
    this.seedCounter += 1;
    return track;
  }

  private ensureDailyArchive(): void {
    const date = new Date().toISOString().slice(0, 10);
    const memoryDir = resolve(process.cwd(), 'memory/daily', date);
    const brainDir = resolve(process.cwd(), 'data/second-brain', date);

    mkdirSync(memoryDir, { recursive: true });
    mkdirSync(brainDir, { recursive: true });

    const memoryFile = resolve(memoryDir, 'SUMMARY.md');
    if (!existsSync(memoryFile)) {
      writeFileSync(
        memoryFile,
        `# Daily Memory - ${date}\n\n## Completed\n-\n\n## In Progress\n-\n\n## Learnings\n-\n`,
        'utf-8'
      );
    }

    const brainFile = resolve(brainDir, 'INDEX.md');
    if (!existsSync(brainFile)) {
      writeFileSync(
        brainFile,
        `# Second Brain - ${date}\n\n- Signals: data/pipeline/signals/\n- Products: data/pipeline/products/\n- Launch: data/pipeline/launch/\n- Revenue: data/pipeline/revenue/\n- Integrations: data/pipeline/integrations/\n`,
        'utf-8'
      );
    }
  }

  private seedTasksIfNeeded(): void {
    const approvalsPending = this.memory.getPendingApprovals().length;
    const openTasks = this.countOpenTasks();
    if (approvalsPending > 0) return;
    if (openTasks >= this.config.max_open_tasks) return;

    let created = 0;
    while (created < this.config.max_tasks_seed_per_tick && this.countOpenTasks() < this.config.max_open_tasks) {
      const track = this.nextTrack();
      const template = track.task_templates[(this.seedCounter - 1) % track.task_templates.length];
      const outputDir = normalizeOutputPath(track.output_dir || 'data/artifacts');
      mkdirSync(outputDir, { recursive: true });

      const goal = `[${track.name}] ${template}`;
      created += 1;

      const task = this.memory.createTask({
        goal,
        status: 'planning',
        plan: [
          `Track objective: ${track.objective}`,
          `Output directory: ${outputDir}`,
          track.required_skills.length > 0
            ? `Preferred skills: ${track.required_skills.join(', ')}`
            : 'Preferred skills: code-builder, content-engine, web-researcher',
          'Create at least one concrete artifact and verify it exists on disk.',
        ],
      });

      this.memory.addTimelineEvent({
        type: 'plan_created',
        summary: `Scheduler seeded task ${task.id}`,
        payload: { task_id: task.id, goal: task.goal, track: track.name, output_dir: outputDir },
      });
    }
  }

  private async executeTask(task: { id: string; goal: string; plan: string[]; status: string }): Promise<void> {
    const executionStartedAt = Date.now();
    const trackName = parseRoleName(task.goal);
    const track = this.tracks.find((item) => item.name === trackName);
    const objective = track?.objective || 'Ship meaningful progress with concrete outputs.';
    const outputDir = normalizeOutputPath(track?.output_dir || 'data/artifacts');
    const requiredSkills = track?.required_skills || [];

    const instruction = [
      `AUTONOMY EXECUTION MODE - PHASE ${this.config.phase}`,
      `Time: ${now()}`,
      `Task ID: ${task.id}`,
      `Track: ${trackName}`,
      `Track Objective: ${objective}`,
      `Goal: ${task.goal}`,
      `Output Dir: ${outputDir}`,
      requiredSkills.length > 0 ? `Preferred Skills: ${requiredSkills.join(', ')}` : '',
      '',
      'Execution requirements:',
      '- You MUST produce at least one real local file using filesystem.write.',
      `- Save artifacts in or under: ${outputDir}`,
      '- If building software, include executable shell/curl commands and integration notes (Supabase/Vercel/GitHub).',
      '- Use risk-aware behavior for approvals (posting, payments, destructive actions must remain approval-gated).',
      '- Before final answer, verify each output file exists with filesystem.exists.',
      '- Final response format exactly:',
      '  OUTPUT_PATHS:',
      '  - /Users/nick/Desktop/AI AGENT SYNTH/openclaw-synth/data/...',
      '- Never output placeholder paths; output only real verified paths.',
      '  SUMMARY:',
      '  <concise what was produced and why it matters>',
    ].filter(Boolean).join('\n');

    let response = '';
    try {
      response = await this.agent.processMessage(instruction, 'scheduler');
    } catch (error: any) {
      response = `❌ Scheduler execution error: ${error.message}`;
    }

    const inlineWrite = extractInlineFilesystemWrite(response);
    if (inlineWrite) {
      const normalizedPath = normalizeOutputPath(inlineWrite.path);
      if (isWithinWorkspace(normalizedPath)) {
        mkdirSync(dirname(normalizedPath), { recursive: true });
        writeFileSync(normalizedPath, inlineWrite.content, 'utf-8');
        response = [
          'OUTPUT_PATHS:',
          `- ${normalizedPath}`,
          'SUMMARY:',
          `Recovered inline filesystem write format and created artifact for task ${task.id}.`,
        ].join('\n');
      }
    }

    if (response.includes('⏳ **Approval Required**')) {
      this.memory.updateTask(task.id, {
        status: 'paused',
        result_summary: clip(response, 1200),
      });
      this.memory.addTimelineEvent({
        type: 'plan_step',
        summary: `Task ${task.id} paused for approval`,
        payload: { task_id: task.id, status: 'paused' },
      });
      return;
    }

    if (response.startsWith('⚠️') || response.startsWith('❌')) {
      this.memory.updateTask(task.id, {
        status: 'failed',
        result_summary: clip(response, 1200),
      });
      this.memory.addTimelineEvent({
        type: 'error',
        summary: `Task ${task.id} failed`,
        payload: { task_id: task.id, response: clip(response, 500) },
      });
      return;
    }

    if (this.config.enforce_file_outputs) {
      const declaredOutputPaths = extractOutputPaths(response).map((path) => normalizeOutputPath(path));
      const existingOutputPaths = declaredOutputPaths.filter((path) => {
        if (!isWithinWorkspace(path)) return false;
        if (!existsSync(path)) return false;
        const stat = statSync(path);
        if (!stat.isFile()) return false;
        return stat.mtimeMs >= executionStartedAt - 5000;
      });

      if (existingOutputPaths.length === 0) {
        const reason = declaredOutputPaths.length === 0
          ? 'Missing OUTPUT_PATHS block or no file-like paths found in response.'
          : `Declared output paths do not exist: ${declaredOutputPaths.join(', ')}`;

        this.memory.updateTask(task.id, {
          status: 'failed',
          result_summary: clip(`⚠️ Task failed validation\nReason: ${reason}\n\nRaw response:\n${response}`, 1200),
        });
        this.memory.addTimelineEvent({
          type: 'error',
          summary: `Task ${task.id} failed output validation`,
          payload: { task_id: task.id, reason },
        });
        return;
      }

      const validationNote = `\n\nVerified output paths:\n${existingOutputPaths.map((path) => `- ${path}`).join('\n')}`;
      this.memory.updateTask(task.id, {
        status: 'completed',
        result_summary: clip(`${response}${validationNote}`, 1200),
      });
      this.memory.addTimelineEvent({
        type: 'plan_step',
        summary: `Task ${task.id} completed`,
        payload: { task_id: task.id, status: 'completed', output_paths: existingOutputPaths },
      });
      return;
    }

    this.memory.updateTask(task.id, {
      status: 'completed',
      result_summary: clip(response, 1200),
    });
    this.memory.addTimelineEvent({
      type: 'plan_step',
      summary: `Task ${task.id} completed`,
      payload: { task_id: task.id, status: 'completed' },
    });
  }

  private async tick(): Promise<void> {
    if (this.running) {
      return;
    }

    this.running = true;
    try {
      this.ensureDailyArchive();
      this.seedTasksIfNeeded();

      const approvalsPending = this.memory.getPendingApprovals().length;
      const statuses: Array<'planning' | 'paused'> = approvalsPending > 0 ? ['planning'] : ['planning', 'paused'];
      let executed = 0;

      while (executed < this.config.max_tasks_run_per_tick) {
        const nextTask = this.memory.claimNextTask(statuses);
        if (!nextTask) {
          break;
        }

        await this.executeTask(nextTask);
        executed += 1;

        if (this.memory.getPendingApprovals().length > 0) {
          break;
        }
      }
    } catch (error: any) {
      log.error({ error: error.message }, 'Scheduler tick failed');
      this.memory.addTimelineEvent({
        type: 'error',
        summary: 'Scheduler tick failed',
        payload: { error: error.message },
      });
    } finally {
      this.running = false;
    }
  }
}

async function main(): Promise<void> {
  const scheduler = new ForgeScheduler();
  await scheduler.start();
}

main().catch((error) => {
  log.error({ error: error instanceof Error ? error.message : String(error) }, 'Scheduler failed to start');
  process.exit(1);
});
