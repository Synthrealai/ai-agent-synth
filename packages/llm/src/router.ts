import OpenAI from 'openai';
import { createChildLogger, requireEnv, type AgentMessage } from '@forgeclaw/shared';
import { selectModel } from './models.js';
import { CostGuard } from './cost-guard.js';

const log = createChildLogger('llm-router');

export interface LLMResponse {
  content: string;
  model: string;
  usage: { input_tokens: number; output_tokens: number; cost_cents: number };
  tool_calls?: Array<{ id: string; name: string; arguments: string }>;
}

export class LLMRouter {
  private openrouter: OpenAI;
  private groq: OpenAI;
  private costGuard: CostGuard;

  constructor() {
    this.openrouter = new OpenAI({
      baseURL: 'https://openrouter.ai/api/v1',
      apiKey: requireEnv('OPENROUTER_API_KEY'),
      defaultHeaders: {
        'HTTP-Referer': 'https://forgedintelligence.com',
        'X-Title': 'ForgeClaw Agent',
      },
    });

    this.groq = new OpenAI({
      baseURL: 'https://api.groq.com/openai/v1',
      apiKey: requireEnv('GROQ_API_KEY'),
    });

    this.costGuard = new CostGuard(parseFloat(process.env.FORGE_MAX_COST_PER_DAY || '25'));
  }

  async chat(
    messages: AgentMessage[],
    options: {
      task?: 'default' | 'reasoning' | 'fast' | 'coding' | 'vision';
      tools?: OpenAI.ChatCompletionTool[];
      maxTokens?: number;
      temperature?: number;
      systemPrompt?: string;
      _disableToolsRetry?: boolean;
    } = {}
  ): Promise<LLMResponse> {
    const model = selectModel(options.task || 'default');
    this.costGuard.checkBudget(model);

    const client = model.provider === 'groq' ? this.groq : this.openrouter;
    const modelIdForProvider =
      model.provider === 'groq' && model.id.includes('/')
        ? model.id.split('/').slice(1).join('/')
        : model.id;

    const formattedMessages: OpenAI.ChatCompletionMessageParam[] = [];
    if (options.systemPrompt) {
      formattedMessages.push({ role: 'system', content: options.systemPrompt });
    }

    for (const msg of messages) {
      formattedMessages.push({
        role: msg.role === 'tool' ? 'assistant' : msg.role,
        content: msg.content,
      } as OpenAI.ChatCompletionMessageParam);
    }

    try {
      const defaultMaxOutput = Number.parseInt(process.env.FORGE_MAX_OUTPUT_TOKENS || '4096', 10);
      const requestedMaxTokens = options.maxTokens ?? model.maxTokens;
      const safeMaxTokens = Math.max(256, Math.min(requestedMaxTokens, defaultMaxOutput));

      const response = await client.chat.completions.create({
        model: modelIdForProvider,
        messages: formattedMessages,
        max_tokens: safeMaxTokens,
        temperature: options.temperature ?? 0.7,
        tools: options.tools && model.supportsTools ? options.tools : undefined,
      });

      const choice = response.choices[0];
      const usage = response.usage || { prompt_tokens: 0, completion_tokens: 0 };
      const costCents = (usage.prompt_tokens / 1000) * model.costPer1kInput +
                        (usage.completion_tokens / 1000) * model.costPer1kOutput;

      this.costGuard.recordUsage(costCents);

      log.info({
        model: modelIdForProvider,
        input_tokens: usage.prompt_tokens,
        output_tokens: usage.completion_tokens,
        cost_cents: costCents.toFixed(4),
      }, 'LLM call completed');

      return {
        content: choice.message?.content || '',
        model: modelIdForProvider,
        usage: {
          input_tokens: usage.prompt_tokens,
          output_tokens: usage.completion_tokens,
          cost_cents: costCents,
        },
        tool_calls: choice.message?.tool_calls?.map(tc => ({
          id: tc.id,
          name: tc.function.name,
          arguments: tc.function.arguments,
        })),
      };
    } catch (error: any) {
      log.error({ error: error.message, model: modelIdForProvider }, 'LLM call failed');

      if (
        options.tools &&
        !options._disableToolsRetry &&
        /failed to call a function|tool call validation failed|not in request\.tools|was not in request\.tools|invalid json schema/i.test(
          String(error.message || '')
        )
      ) {
        log.warn('Model tool-call generation failed; retrying without tools');
        return this.chat(messages, {
          ...options,
          tools: undefined,
          _disableToolsRetry: true,
          systemPrompt: `${options.systemPrompt || ''}\n\nTool calling is unavailable for this request. Reply directly without using tools.`.trim(),
        });
      }

      const currentTask = options.task || 'default';
      const fastModel = selectModel('fast');
      if (currentTask !== 'fast' && model.id !== fastModel.id) {
        log.warn({ from_model: model.id, to_model: fastModel.id }, 'Falling back to fast model');
        return this.chat(messages, { ...options, task: 'fast' });
      }

      throw error;
    }
  }
}
