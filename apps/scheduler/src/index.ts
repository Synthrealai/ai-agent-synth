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
  roles: RoleConfig[];
};

const DEFAULT_AUTONOMY_CONFIG: AutonomyConfig = {
  enabled: true,
  tick_seconds: 180,
  max_open_tasks: 5,
  max_tasks_seed_per_tick: 1,
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
      '- Use tools to produce real outputs (files, links, drafts, plans).',
      '- If a tool fails, report exact error and adapt.',
      '- Keep risk-aware behavior for approvals.',
      '- End with concise summary of what was produced and where it lives.',
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
      this.seedTasksIfNeeded();

      const approvalsPending = this.memory.getPendingApprovals().length;
      const nextTask = this.memory.claimNextTask(approvalsPending > 0 ? ['planning'] : ['planning', 'paused']);
      if (!nextTask) {
        return;
      }

      await this.executeTask(nextTask);
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
