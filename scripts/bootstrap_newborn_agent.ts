#!/usr/bin/env tsx
import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'fs';
import { dirname, resolve } from 'path';
import YAML from 'yaml';
import { MemoryDB } from '@forgeclaw/memory';

type SkillGraph = {
  nodes?: Array<{ id?: string; label?: string; type?: string; depends_on?: string[]; outputs?: string[] }>;
  edges?: Array<{ from?: string; to?: string }>;
};

const ROOT = process.cwd();
const NEWBORN_DIR = resolve(ROOT, 'memory/newborn');

function ensureDir(path: string): void {
  mkdirSync(path, { recursive: true });
}

function write(path: string, content: string): void {
  ensureDir(dirname(path));
  writeFileSync(path, content, 'utf-8');
}

function memoryContains(db: MemoryDB, snippet: string): boolean {
  return db.searchMemories(snippet, 20).some((item) => item.text.includes(snippet));
}

function taskExists(db: MemoryDB, goalSnippet: string): boolean {
  return db.getTasks(400).some((task) => task.goal.includes(goalSnippet));
}

function renderSkillGraphMarkdown(graph: SkillGraph): string {
  const lines: string[] = [];
  lines.push('# Newborn Skill Graph');
  lines.push('');
  lines.push('## Nodes');
  for (const node of graph.nodes || []) {
    lines.push(`- **${node.label || node.id}** (${node.type || 'unspecified'})`);
    if (node.depends_on && node.depends_on.length > 0) {
      lines.push(`  Depends on: ${node.depends_on.join(', ')}`);
    }
    if (node.outputs && node.outputs.length > 0) {
      lines.push(`  Outputs: ${node.outputs.join(', ')}`);
    }
  }
  lines.push('');
  lines.push('## Edges');
  for (const edge of graph.edges || []) {
    lines.push(`- ${edge.from} -> ${edge.to}`);
  }
  lines.push('');
  lines.push('## Runtime Rule');
  lines.push('- Always complete upstream nodes before downstream monetization tasks.');
  return lines.join('\n');
}

async function main(): Promise<void> {
  const dirs = [
    NEWBORN_DIR,
    resolve(ROOT, 'data/pipeline/signals'),
    resolve(ROOT, 'data/pipeline/products'),
    resolve(ROOT, 'data/pipeline/launch'),
    resolve(ROOT, 'data/pipeline/revenue'),
    resolve(ROOT, 'data/pipeline/integrations'),
    resolve(ROOT, 'data/pipeline/apps'),
    resolve(ROOT, 'data/runbooks'),
  ];

  for (const dir of dirs) ensureDir(dir);

  write(
    resolve(NEWBORN_DIR, '01_IDENTITY.md'),
    `# Newborn Identity\n\n- Agent name: **Synthor**\n- Archetype: builder-operator (male)\n- Core role: ship software + distribution + monetization loops\n- Partner model: Nick handles legal, accounts, capital flows\n\n## Non-Negotiables\n- Real outputs over status chatter\n- Every cycle must create or improve an artifact\n- Revenue path attached to every shipped artifact\n`
  );

  write(
    resolve(NEWBORN_DIR, '02_MISSION.md'),
    `# Mission\n\n## 12-Month Objective\nBuild a compounding software-and-services engine that can reliably clear **$1,000/day** in revenue opportunities.\n\n## Execution Loop\n1. Detect demand\n2. Build asset\n3. Publish distribution\n4. Run offer + follow-up\n5. Record learnings\n`
  );

  write(
    resolve(NEWBORN_DIR, '03_OFFER_STACK.md'),
    `# Offer Stack\n\n## Core Offers\n- Automation sprint (7-day paid implementation)\n- AI content system setup (monthly retainer)\n- Internal tools build package (fixed scope)\n\n## Product Track\n- Weekly micro-tools\n- One flagship SaaS workflow per month\n- Launch in public with proof artifacts\n`
  );

  const graphPath = resolve(ROOT, 'configs/skill-graph.yaml');
  const graph = existsSync(graphPath)
    ? (YAML.parse(readFileSync(graphPath, 'utf-8')) as SkillGraph)
    : { nodes: [], edges: [] };

  write(resolve(NEWBORN_DIR, '04_SKILL_GRAPH.md'), renderSkillGraphMarkdown(graph));

  write(
    resolve(NEWBORN_DIR, '05_INTEGRATIONS.md'),
    `# Integrations\n\n## Required Stack\n- Codex + Claude Code for paired execution\n- Supabase for auth/db/storage\n- Vercel for deploy/preview\n- GitHub for source + issue pipeline\n\n## Rule\nAll integration work must include reproducible shell/curl commands and verification steps.\n`
  );

  const db = new MemoryDB();

  const seedMemories = [
    {
      type: 'project' as const,
      text: 'Synthor newborn launch is active under AI AGENT SYNTH/openclaw-synth.',
      tags: ['newborn', 'phase4', 'identity'],
      importance: 9,
      source: 'bootstrap_newborn_agent',
    },
    {
      type: 'decision' as const,
      text: 'Scheduler must only mark tasks complete when output files are verified on disk.',
      tags: ['quality', 'execution', 'autonomy'],
      importance: 9,
      source: 'bootstrap_newborn_agent',
    },
    {
      type: 'project' as const,
      text: 'Primary tracks are SignalOps, ProductFactory, LaunchEngine, RevenueOps, and Integrations.',
      tags: ['tracks', 'harness', 'phase4'],
      importance: 8,
      source: 'bootstrap_newborn_agent',
    },
  ];

  for (const memory of seedMemories) {
    if (!memoryContains(db, memory.text)) {
      db.addMemory(memory);
    }
  }

  const launchTasks = [
    '[NewbornLaunch] Create social profile bio pack and pinned-thread draft for Synthor.',
    '[NewbornLaunch] Build link hub page with live project feed and deployment checklist.',
    '[NewbornLaunch] Define first 3 paid offers with pricing, CTA, and fulfillment SOP.',
    '[NewbornLaunch] Ship one micro-tool MVP and publish launch assets.',
  ];

  for (const goal of launchTasks) {
    if (!taskExists(db, goal)) {
      db.createTask({
        goal,
        status: 'planning',
        plan: [
          'Create the requested deliverable in the workspace.',
          'Validate output files exist.',
          'Log summary + absolute output paths.',
        ],
      });
    }
  }

  db.addTimelineEvent({
    type: 'system',
    summary: 'Newborn launch bootstrap completed',
    payload: {
      script: 'scripts/bootstrap_newborn_agent.ts',
      newborn_dir: NEWBORN_DIR,
      seeded_tasks: launchTasks.length,
    },
  });

  console.log('Bootstrap complete');
  console.log(`Newborn memory: ${NEWBORN_DIR}`);
  console.log('Pipeline dirs: data/pipeline/{signals,products,launch,revenue,integrations,apps}');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
