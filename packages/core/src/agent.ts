import { LLMRouter } from '@forgeclaw/llm';
import { MemoryDB } from '@forgeclaw/memory';
import { existsSync, readdirSync, readFileSync } from 'fs';
import { join, resolve } from 'path';
import {
  ToolRouter, createFilesystemTool, createShellTool,
  createHttpTool, createBrowserTool, createHumanTool,
  createContentTool, createSocialTool, createVideoTool
} from '@forgeclaw/tools';
import { PolicyEngine } from './policy-engine.js';
import {
  createChildLogger, generateId, now, loadConfig,
  type AgentMessage, type Approval
} from '@forgeclaw/shared';
import YAML from 'yaml';

const log = createChildLogger('agent');
const MAX_TOOL_ERROR_OUTPUT = 1500;
const MAX_SKILL_PROMPT_LENGTH = 1000;

type RuntimeSkill = {
  name: string;
  triggers: string[];
  prompt: string;
};

type ParsedSkillManifest = {
  name?: string;
  triggers?: string[];
};

function clip(text: string, maxChars: number): string {
  if (text.length <= maxChars) {
    return text;
  }
  return `${text.slice(0, maxChars - 12)}\n...[truncated]`;
}

function loadRuntimeSkills(rootDir: string = process.cwd()): RuntimeSkill[] {
  const roots = [
    resolve(rootDir, 'data/skills-installed'),
    resolve(rootDir, 'skills'),
    resolve(rootDir, 'skills-registry'),
  ];

  const skills: RuntimeSkill[] = [];
  const seen = new Set<string>();

  for (const root of roots) {
    if (!existsSync(root)) continue;
    for (const entry of readdirSync(root, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const skillDir = join(root, entry.name);
      const promptPath = join(skillDir, 'prompt.md');
      if (!existsSync(promptPath)) continue;

      const prompt = readFileSync(promptPath, 'utf-8').trim();
      if (!prompt) continue;

      const manifestPath = join(skillDir, 'skill.yaml');
      let skillName = entry.name;
      let triggers: string[] = [entry.name.toLowerCase()];

      if (existsSync(manifestPath)) {
        try {
          const parsed = YAML.parse(readFileSync(manifestPath, 'utf-8')) as ParsedSkillManifest;
          if (parsed?.name) skillName = String(parsed.name);
          if (Array.isArray(parsed?.triggers) && parsed.triggers.length > 0) {
            triggers = parsed.triggers.map((t) => String(t).toLowerCase());
          }
        } catch (error: any) {
          log.warn({ skill: entry.name, error: error.message }, 'Failed to parse skill manifest; using defaults');
        }
      }

      const key = skillName.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);

      skills.push({ name: skillName, triggers, prompt });
    }
  }

  return skills;
}

function selectSkills(skills: RuntimeSkill[], userMessage: string, limit = 3): RuntimeSkill[] {
  const message = userMessage.toLowerCase();
  return skills
    .map((skill) => {
      let score = 0;
      for (const trigger of skill.triggers) {
        if (trigger && message.includes(trigger)) score += 1;
      }
      if (message.includes(skill.name.toLowerCase())) score += 2;
      return { skill, score };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((entry) => entry.skill);
}

const SYSTEM_PROMPT = `You are FORGE — an autonomous AI agent operating system built for Nick at Forged Intelligence.

## Core Identity
- You are a supreme polymath: philosopher, senior full-stack dev, artist, scientist, strategist
- You think in systems, act with precision, and build proactively
- Philosophy: Stoicism + Systems Thinking + Builder Mentality
- Decision framework: Revenue impact → Leverage/scalability → Learning value → Brand alignment

## Capabilities
You have access to tools for: filesystem operations, shell commands, HTTP requests, web browsing, content creation (Dan Koe atomic method), social media posting (Twitter/X, LinkedIn), video creation (HeyGen UGC, YouTube scripts), memory storage/retrieval, and asking the user questions.

## Content Voice (Nick's Brand)
- Direct, no-BS, builder mentality
- Uses metaphors from Stoicism, systems thinking, and tech
- Teaches by showing, not telling
- Influences: Marcus Aurelius, Naval Ravikant, Dan Koe, Alex Hormozi

## Operating Rules
1. Always create an action plan before executing multi-step tasks
2. Log every significant action to the timeline
3. Store important facts, decisions, and learnings to memory
4. When risk is HIGH, request approval before proceeding
5. Never expose API keys or secrets in output
6. If blocked, use the human tool to ask Nick
7. Prefer building things over explaining things
8. Every output should be publishable, deployable, or sellable
9. Never claim you lack local file/system access. If a tool fails, report the exact error and next fix.

## Business Context
- Company: Forged Intelligence (AI automation agency)
- Primary product: ContentForge (AI content repurposing SaaS)
- Revenue target: $3K → $5K → $10K → $25K → $100K MRR
- Stack: Next.js 14, TypeScript, Tailwind, Prisma, PostgreSQL
- Platforms: Twitter/X (@forgedintel), YouTube, Substack (HOW TO AI), LinkedIn

## Content Creation Method (Dan Koe Atomic Philosophy)
When creating content:
1. Extract core thesis (1 sentence)
2. Extract 7-10 atomic ideas
3. Apply 10 angles: Contrarian, Story, Framework, Question, Statistic, Analogy, Prediction, Mistake, Myth-Bust, How-To
4. Optimize per platform (hooks, length, format, CTA)
5. Match Nick's voice exactly

Today is ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}.`;

export class ForgeAgent {
  private llm: LLMRouter;
  private memory: MemoryDB;
  private tools: ToolRouter;
  private policy: PolicyEngine;
  private config = loadConfig();
  private runtimeSkills: RuntimeSkill[];
  private conversationBuffer: AgentMessage[] = [];

  constructor() {
    this.llm = new LLMRouter();
    this.memory = new MemoryDB();
    this.tools = new ToolRouter();
    this.policy = new PolicyEngine();

    this.tools.register(createFilesystemTool());
    this.tools.register(createShellTool());
    this.tools.register(createHttpTool());
    this.tools.register(createBrowserTool());
    this.tools.register(createHumanTool());
    this.tools.register(createContentTool());
    this.tools.register(createSocialTool());
    this.tools.register(createVideoTool());
    this.runtimeSkills = loadRuntimeSkills();

    log.info({ autonomy: this.config.autonomy_level, skills_loaded: this.runtimeSkills.length }, 'FORGE agent initialized');
  }

  async processMessage(
    userMessage: string,
    channel: 'cli' | 'telegram' | 'dashboard' | 'scheduler'
  ): Promise<string> {
    const msg: AgentMessage = {
      id: generateId(),
      role: 'user',
      content: userMessage,
      timestamp: now(),
      channel,
    };
    this.conversationBuffer.push(msg);

    this.memory.addTimelineEvent({
      type: 'message',
      summary: `User message via ${channel}: ${userMessage.slice(0, 100)}`,
      payload: { channel, message: userMessage },
    });

    const relevantMemories = this.memory.searchMemories(userMessage, 5);
    const memoryContext = relevantMemories.length > 0
      ? `\n\nRelevant memories:\n${relevantMemories.map(m => `- [${m.type}] ${m.text}`).join('\n')}`
      : '';
    const matchedSkills = selectSkills(this.runtimeSkills, userMessage);
    const skillsContext = matchedSkills.length > 0
      ? `\n\nActive skill modules:\n${matchedSkills.map((skill) =>
        `- ${skill.name}:\n${clip(skill.prompt, MAX_SKILL_PROMPT_LENGTH)}`
      ).join('\n\n')}`
      : '';

    const response = await this.llm.chat(this.conversationBuffer, {
      task: 'default',
      systemPrompt: SYSTEM_PROMPT + memoryContext + skillsContext,
      tools: this.tools.getOpenAITools(),
      temperature: 0.7,
    });

    if (response.tool_calls && response.tool_calls.length > 0) {
      for (const toolCall of response.tool_calls) {
        let args: Record<string, unknown> = {};
        try {
          args = toolCall.arguments ? JSON.parse(toolCall.arguments) : {};
        } catch (error: any) {
          log.warn({ tool: toolCall.name, arguments: toolCall.arguments, error: error.message }, 'Invalid tool call JSON');
          return `❌ Tool call parsing failed for \`${toolCall.name}\`: ${error.message}`;
        }
        const toolDef = this.tools.get(toolCall.name);

        if (!toolDef) {
          log.warn({ tool: toolCall.name }, 'Unknown tool called');
          continue;
        }

        const policyResult = this.policy.evaluate(toolCall.name, args, toolDef.riskLevel);

        if (policyResult.action === 'require_approval') {
          const approval = this.memory.createApproval({
            request: {
              tool: toolCall.name,
              args,
              risk_level: toolDef.riskLevel,
              reason: policyResult.reason,
            },
          });

          log.info({ approval_id: approval.id, tool: toolCall.name }, 'Approval requested');
          return `⏳ **Approval Required**\n\nAction: \`${toolCall.name}\`\nArgs: \`${JSON.stringify(args, null, 2)}\`\nReason: ${policyResult.reason}\n\nApproval ID: \`${approval.id}\`\nUse \`/approve ${approval.id}\` or \`/deny ${approval.id}\``;
        }

        if (policyResult.action === 'warn') {
          log.warn({ tool: toolCall.name, reason: policyResult.reason }, 'Policy warning');
        }

        const result = await this.tools.execute(toolCall.name, args);

        this.memory.addTimelineEvent({
          type: 'tool_call',
          summary: `${toolCall.name}(${JSON.stringify(args).slice(0, 100)}) → ${result.success ? 'success' : 'failed'}`,
          payload: {
            tool: toolCall.name,
            args,
            result: {
              success: result.success,
              output: result.output.slice(0, 500),
              error: result.error || '',
            },
          },
        });

        if (!result.success) {
          const detail = clip(result.output || '', MAX_TOOL_ERROR_OUTPUT);
          return `⚠️ ${toolCall.name} failed\nReason: ${result.error || 'Unknown error'}${detail ? `\n\nOutput:\n${detail}` : ''}`;
        }

        this.conversationBuffer.push({
          id: generateId(),
          role: 'tool',
          content: `Tool ${toolCall.name} result: ${result.output}${result.error ? `\nError: ${result.error}` : ''}`,
          timestamp: now(),
          channel: 'internal',
        });
      }

      const finalResponse = await this.llm.chat(this.conversationBuffer, {
        task: 'default',
        systemPrompt: SYSTEM_PROMPT,
        temperature: 0.7,
      });

      const assistantMsg: AgentMessage = {
        id: generateId(),
        role: 'assistant',
        content: finalResponse.content,
        timestamp: now(),
        channel,
      };
      this.conversationBuffer.push(assistantMsg);

      return finalResponse.content;
    }

    const assistantMsg: AgentMessage = {
      id: generateId(),
      role: 'assistant',
      content: response.content,
      timestamp: now(),
      channel,
    };
    this.conversationBuffer.push(assistantMsg);

    if (this.conversationBuffer.length > 50) {
      this.conversationBuffer = this.conversationBuffer.slice(-20);
    }

    return response.content;
  }

  async approveAction(approvalId: string): Promise<string> {
    const approval = this.memory.getApprovalById(approvalId);
    if (!approval) {
      return `❌ Approval ID not found: ${approvalId}`;
    }
    if (approval.status !== 'pending') {
      return `ℹ️ Approval ${approvalId} is already ${approval.status}.`;
    }

    this.memory.resolveApproval(approvalId, 'approved', 'user');
    this.memory.addTimelineEvent({
      type: 'approval',
      summary: `Approval granted for ${approvalId}`,
      payload: { id: approvalId, status: 'approved' },
    });
    log.info({ approval_id: approvalId }, 'Action approved');

    return await this.executeApprovedTool(approval);
  }

  async denyAction(approvalId: string): Promise<string> {
    const approval = this.memory.getApprovalById(approvalId);
    if (!approval) {
      return `❌ Approval ID not found: ${approvalId}`;
    }
    if (approval.status !== 'pending') {
      return `ℹ️ Approval ${approvalId} is already ${approval.status}.`;
    }

    this.memory.resolveApproval(approvalId, 'denied', 'user');
    this.memory.addTimelineEvent({
      type: 'approval',
      summary: `Approval denied for ${approvalId}`,
      payload: { id: approvalId, status: 'denied' },
    });
    log.info({ approval_id: approvalId }, 'Action denied');
    return `❌ Denied: ${approvalId}`;
  }

  private async executeApprovedTool(approval: Approval): Promise<string> {
    const toolDef = this.tools.get(approval.request.tool);
    if (!toolDef) {
      return `✅ Approved ${approval.id}, but tool \`${approval.request.tool}\` is not registered.`;
    }

    const result = await this.tools.execute(approval.request.tool, approval.request.args);
    this.memory.addTimelineEvent({
      type: 'tool_call',
      summary: `${approval.request.tool}(${JSON.stringify(approval.request.args).slice(0, 100)}) → ${result.success ? 'success' : 'failed'}`,
      payload: {
        tool: approval.request.tool,
        args: approval.request.args,
        result: {
          success: result.success,
          output: result.output.slice(0, 500),
          error: result.error || '',
        },
        source: 'approval',
        approval_id: approval.id,
      },
    });

    if (!result.success) {
      const detail = clip(result.output || '', MAX_TOOL_ERROR_OUTPUT);
      return `⚠️ Approved ${approval.id}, but execution failed\nTool: ${approval.request.tool}\nReason: ${result.error || 'Unknown error'}${detail ? `\n\nOutput:\n${detail}` : ''}`;
    }

    const output = clip(result.output || 'Done.', MAX_TOOL_ERROR_OUTPUT);
    return `✅ Approved and executed ${approval.request.tool}\n\n${output}`;
  }

  getPendingApprovals() {
    return this.memory.getPendingApprovals();
  }

  getTimeline(limit: number = 20) {
    return this.memory.getTimeline(limit);
  }

  getMemoryDB(): MemoryDB {
    return this.memory;
  }
}
