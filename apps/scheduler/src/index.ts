#!/usr/bin/env tsx
import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';
import YAML from 'yaml';
import { ForgeAgent } from '@forgeclaw/core';
import { createChildLogger, now } from '@forgeclaw/shared';

const log = createChildLogger('scheduler');

type RoleConfig = {
  name: string;
  objective: string;
  task_templates: string[];
};

type AutonomyConfig = {
  enabled: boolean;
  tick_seconds: number;
  max_open_tasks: number;
  max_tasks_seed_per_tick: number;
  max_tasks_run_per_tick: number;
  roles: RoleConfig[];
};

const DEFAULT_AUTONOMY_CONFIG: AutonomyConfig = {
  enabled: true,
  tick_seconds: 180,
  max_open_tasks: 5,
  max_tasks_seed_per_tick: 1,
  max_tasks_run_per_tick: 1,
  roles: [
    {
      name: 'Scout',
      objective: 'Find one concrete demand signal and turn it into an execution-ready opportunity.',
      task_templates: ['Identify one high-intent problem worth solving this week and capture proof links.'],
    },
    {
      name: 'Builder',
      objective: 'Ship one tangible asset in the workspace that can be used or sold.',
      task_templates: ['Create one usable asset tied to current opportunities and log exact output paths.'],
    },
    {
      name: 'Publisher',
      objective: 'Create one distribution artifact that drives traffic, trust, or leads.',
      task_templates: ['Draft one build-in-public update tied to shipped work with explicit CTA.'],
    },
  ],
};

function clampInt(value: unknown, fallback: number, min: number, max: number): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, Math.floor(n)));
}

function loadAutonomyConfig(): AutonomyConfig {
  const configPath = process.env.FORGE_AUTONOMY_CONFIG_PATH || resolve(process.cwd(), 'configs/autonomy.yaml');
  if (!existsSync(configPath)) {
    return DEFAULT_AUTONOMY_CONFIG;
  }

  try {
    const raw = YAML.parse(readFileSync(configPath, 'utf-8')) as Partial<AutonomyConfig>;
    const roles = Array.isArray(raw.roles) && raw.roles.length > 0 ? raw.roles : DEFAULT_AUTONOMY_CONFIG.roles;

    return {
      enabled: raw.enabled !== false,
      tick_seconds: clampInt(raw.tick_seconds, DEFAULT_AUTONOMY_CONFIG.tick_seconds, 15, 3600),
      max_open_tasks: clampInt(raw.max_open_tasks, DEFAULT_AUTONOMY_CONFIG.max_open_tasks, 1, 50),
      max_tasks_seed_per_tick: clampInt(raw.max_tasks_seed_per_tick, DEFAULT_AUTONOMY_CONFIG.max_tasks_seed_per_tick, 1, 5),
      max_tasks_run_per_tick: clampInt(raw.max_tasks_run_per_tick, DEFAULT_AUTONOMY_CONFIG.max_tasks_run_per_tick, 1, 10),
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
  const marker = response.toUpperCase().indexOf('OUTPUT_PATHS:');
  if (marker === -1) return [];

  const tail = response.slice(marker + 'OUTPUT_PATHS:'.length);
  const lines = tail.split('\n');
  const paths = new Set<string>();

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) {
      if (paths.size > 0) break;
      continue;
    }
    if (/^summary\s*:/i.test(line)) break;

    const cleaned = line.replace(/^[-*]\s*/, '').replace(/^`|`$/g, '').trim();
    if (!cleaned) continue;
    if (cleaned.startsWith('/') || cleaned.startsWith('./') || cleaned.startsWith('../')) {
      paths.add(cleaned);
    }
  }

  return Array.from(paths);
}

class ForgeScheduler {
  private readonly agent = new ForgeAgent();
  private readonly memory = this.agent.getMemoryDB();
  private readonly config = loadAutonomyConfig();
  private running = false;
  private seedCounter = 0;

  async start(): Promise<void> {
    if (!this.config.enabled) {
      log.warn('Autonomy scheduler disabled via config');
      return;
    }

    log.info(
      {
        tick_seconds: this.config.tick_seconds,
        max_open_tasks: this.config.max_open_tasks,
        max_tasks_run_per_tick: this.config.max_tasks_run_per_tick,
        roles: this.config.roles.map((role) => role.name),
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

  private seedTasksIfNeeded(): void {
    const approvalsPending = this.memory.getPendingApprovals().length;
    const openTasks = this.countOpenTasks();
    if (approvalsPending > 0) return;
    if (openTasks >= this.config.max_open_tasks) return;

    let created = 0;
    while (
      created < this.config.max_tasks_seed_per_tick &&
      this.countOpenTasks() < this.config.max_open_tasks
    ) {
      const role = this.config.roles[this.seedCounter % this.config.roles.length];
      const template = role.task_templates[this.seedCounter % role.task_templates.length];
      const goal = `[${role.name}] ${template}`;
      this.seedCounter += 1;
      created += 1;

      const task = this.memory.createTask({
        goal,
        status: 'planning',
        plan: [
          `Role objective: ${role.objective}`,
          'Execute the goal with concrete artifacts and traceable outputs.',
          'Log the exact files/links produced in the result summary.',
        ],
      });

      this.memory.addTimelineEvent({
        type: 'plan_created',
        summary: `Scheduler seeded task ${task.id}`,
        payload: { task_id: task.id, goal: task.goal, role: role.name },
      });
    }
  }

  private async executeTask(task: { id: string; goal: string; plan: string[]; status: string }): Promise<void> {
    const roleName = parseRoleName(task.goal);
    const role = this.config.roles.find((item) => item.name === roleName);
    const objective = role?.objective || 'Ship meaningful progress with concrete outputs.';

    const instruction = [
      'AUTONOMY EXECUTION MODE',
      `Time: ${now()}`,
      `Task ID: ${task.id}`,
      `Role: ${roleName}`,
      `Role Objective: ${objective}`,
      `Goal: ${task.goal}`,
      '',
      'Execution requirements:',
      '- You MUST produce at least one real local file using filesystem.write.',
      '- Before final answer, verify each output file exists with filesystem.exists.',
      '- If a tool fails, report exact error and adapt.',
      '- Keep risk-aware behavior for approvals.',
      '- Final response format exactly:',
      '  OUTPUT_PATHS:',
      '  - /Users/nick/Desktop/AI AGENT SYNTH/openclaw-synth/data/...',
      '- Never output placeholder paths; output only real verified paths.',
      '  SUMMARY:',
      '  <concise what was produced and why it matters>',
    ].join('\n');

    let response = '';
    try {
      response = await this.agent.processMessage(instruction, 'scheduler');
    } catch (error: any) {
      response = `❌ Scheduler execution error: ${error.message}`;
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

    const declaredOutputPaths = extractOutputPaths(response).map((path) => normalizeOutputPath(path));
    const existingOutputPaths = declaredOutputPaths.filter((path) => existsSync(path));

    if (existingOutputPaths.length === 0) {
      const reason = declaredOutputPaths.length === 0
        ? 'Missing OUTPUT_PATHS block or no declared file paths.'
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
  }

  private async tick(): Promise<void> {
    if (this.running) {
      return;
    }

    this.running = true;
    try {
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

        // Stop early when new approvals are generated so humans can review first.
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
