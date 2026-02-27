#!/usr/bin/env tsx
import TelegramBot from 'node-telegram-bot-api';
import { ForgeAgent } from '@forgeclaw/core';
import { createChildLogger, requireEnv } from '@forgeclaw/shared';

const log = createChildLogger('telegram');

async function main() {
  const token = requireEnv('TELEGRAM_BOT_TOKEN');
  const ownerId = process.env.TELEGRAM_OWNER_ID;

  const bot = new TelegramBot(token, { polling: true });
  const agent = new ForgeAgent();

  log.info('Telegram bot started');

  const rateLimiter = new Map<number, number>();
  const RATE_LIMIT_MS = 2000;

  function isAuthorized(context: { chatId: number; userId?: number }): boolean {
    const { chatId, userId } = context;
    if (ownerId) {
      const ownerMatchesUser = userId !== undefined && String(userId) === ownerId;
      const ownerMatchesChat = String(chatId) === ownerId;
      if (!ownerMatchesUser && !ownerMatchesChat) {
        return false;
      }
    }
    return true;
  }

  function consumeRateLimit(context: { chatId: number; userId?: number }): boolean {
    const { chatId, userId } = context;
    const rateKey = userId ?? chatId;
    const lastTime = rateLimiter.get(rateKey) || 0;
    if (Date.now() - lastTime < RATE_LIMIT_MS) return false;
    rateLimiter.set(rateKey, Date.now());
    return true;
  }

  bot.onText(/\/start/, (msg) => {
    if (!isAuthorized({ chatId: msg.chat.id, userId: msg.from?.id })) return;
    if (!consumeRateLimit({ chatId: msg.chat.id, userId: msg.from?.id })) return;
    bot.sendMessage(msg.chat.id, `
⚡ *FORGE — Autonomous Intelligence*
Built by Forged Intelligence

I'm your AI co-founder. I can:
- Generate & post content (Twitter, LinkedIn, YouTube)
- Create UGC videos via HeyGen
- Browse the web & research anything
- Write and deploy code
- Manage business operations
- Remember everything across conversations

Type /help for commands or just chat naturally.
    `, { parse_mode: 'Markdown' });
  });

  bot.onText(/\/help/, (msg) => {
    if (!isAuthorized({ chatId: msg.chat.id, userId: msg.from?.id })) return;
    if (!consumeRateLimit({ chatId: msg.chat.id, userId: msg.from?.id })) return;
    bot.sendMessage(msg.chat.id, `
*Commands:*
/status — System status & costs
/task <description> — Create a new task
/content <topic> — Generate content
/post <platform> — Draft social post
/video <topic> — Create video script
/research <topic> — Deep web research
/code <description> — Generate code
/approve — Show pending approvals
/autonomy — Show autonomous loop status
/brief — Get daily briefing
/memory <query> — Search memories
/help — This message
    `, { parse_mode: 'Markdown' });
  });

  bot.onText(/\/approve(.*)/, async (msg, match) => {
    if (!isAuthorized({ chatId: msg.chat.id, userId: msg.from?.id })) return;
    if (!consumeRateLimit({ chatId: msg.chat.id, userId: msg.from?.id })) return;
    const id = match?.[1]?.trim();

    if (!id) {
      const pending = agent.getPendingApprovals();
      if (pending.length === 0) {
        bot.sendMessage(msg.chat.id, '✅ No pending approvals.');
        return;
      }
      for (const a of pending) {
        bot.sendMessage(msg.chat.id, `⏳ *Pending:* ${a.request.tool}\nID: \`${a.id}\`\nReason: ${a.request.reason}`, {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [[
              { text: '✅ Approve', callback_data: `approve:${a.id}` },
              { text: '❌ Deny', callback_data: `deny:${a.id}` },
            ]],
          },
        });
      }
      return;
    }

    const result = await agent.approveAction(id);
    bot.sendMessage(msg.chat.id, result);
  });

  bot.on('callback_query', async (query) => {
    const [action, id] = query.data?.split(':') || [];
    if (!id || !query.message) return;
    const context = { chatId: query.message.chat.id, userId: query.from.id };
    if (!isAuthorized(context)) {
      bot.answerCallbackQuery(query.id, { text: 'Unauthorized' });
      return;
    }
    if (!consumeRateLimit(context)) {
      bot.answerCallbackQuery(query.id, { text: 'Slow down for a second' });
      return;
    }
    if (action === 'approve') {
      const result = await agent.approveAction(id);
      bot.answerCallbackQuery(query.id, { text: 'Approved!' });
      bot.sendMessage(query.message.chat.id, result);
    } else if (action === 'deny') {
      const result = await agent.denyAction(id);
      bot.answerCallbackQuery(query.id, { text: 'Denied!' });
      bot.sendMessage(query.message.chat.id, result);
    }
  });

  bot.onText(/\/status/, async (msg) => {
    if (!isAuthorized({ chatId: msg.chat.id, userId: msg.from?.id })) return;
    if (!consumeRateLimit({ chatId: msg.chat.id, userId: msg.from?.id })) return;
    const timeline = agent.getTimeline(5);
    const pending = agent.getPendingApprovals();
    const status = `
⚡ *FORGE Status*
━━━━━━━━━━━━━━━
🟢 Agent: Online
📋 Pending approvals: ${pending.length}
📊 Recent events: ${timeline.length}

*Last 5 events:*
${timeline.map(e => `• ${e.type}: ${e.summary.slice(0, 60)}`).join('\n')}
    `;
    bot.sendMessage(msg.chat.id, status, { parse_mode: 'Markdown' });
  });

  bot.onText(/\/task(?:\s+(.+))?/, async (msg, match) => {
    if (!isAuthorized({ chatId: msg.chat.id, userId: msg.from?.id })) return;
    if (!consumeRateLimit({ chatId: msg.chat.id, userId: msg.from?.id })) return;

    const goal = (match?.[1] || '').trim();
    if (!goal) {
      bot.sendMessage(msg.chat.id, 'Usage: /task <description>');
      return;
    }

    const task = agent.getMemoryDB().createTask({
      goal,
      status: 'planning',
      plan: [
        'Analyze requested goal.',
        'Execute with available tools.',
        'Return concise result summary with concrete outputs.',
      ],
    });

    agent.getMemoryDB().addTimelineEvent({
      type: 'plan_created',
      summary: `Task queued from Telegram: ${task.id}`,
      payload: { task_id: task.id, goal: task.goal, source: 'telegram' },
    });

    bot.sendMessage(
      msg.chat.id,
      `✅ Task queued\nID: \`${task.id}\`\nGoal: ${task.goal}\nStatus: ${task.status}`,
      { parse_mode: 'Markdown' }
    );
  });

  bot.onText(/\/autonomy/, async (msg) => {
    if (!isAuthorized({ chatId: msg.chat.id, userId: msg.from?.id })) return;
    if (!consumeRateLimit({ chatId: msg.chat.id, userId: msg.from?.id })) return;

    const memory = agent.getMemoryDB();
    const allTasks = memory.getTasks(200);
    const openTasks = allTasks.filter((task) => ['planning', 'executing', 'paused'].includes(task.status));
    const pendingApprovals = memory.getPendingApprovals();
    const current = memory.getCurrentTask();

    const status = `
🤖 *Autonomy Status*
━━━━━━━━━━━━━━━
Mode: ${process.env.FORGE_AUTONOMY_LEVEL || 'L2'}
Open tasks: ${openTasks.length}
Pending approvals: ${pendingApprovals.length}
Current task: ${current ? current.goal.slice(0, 90) : 'none'}

Recent tasks:
${allTasks.slice(0, 5).map((task) => `• [${task.status}] ${task.goal.slice(0, 70)}`).join('\n') || '• none'}
    `;
    bot.sendMessage(msg.chat.id, status, { parse_mode: 'Markdown' });
  });

  bot.on('message', async (msg) => {
    if (!msg.text || msg.text.startsWith('/')) return;
    const context = { chatId: msg.chat.id, userId: msg.from?.id };
    if (!isAuthorized(context)) {
      bot.sendMessage(msg.chat.id, '🔒 Unauthorized. This bot is private.');
      return;
    }
    if (!consumeRateLimit(context)) {
      bot.sendMessage(msg.chat.id, '⏱️ Slow down a second and retry.');
      return;
    }

    try {
      await bot.sendChatAction(msg.chat.id, 'typing');
      const response = await agent.processMessage(msg.text, 'telegram');

      if (response.length > 4000) {
        const chunks = response.match(/.{1,4000}/gs) || [response];
        for (const chunk of chunks) {
          await bot.sendMessage(msg.chat.id, chunk, { parse_mode: 'Markdown' }).catch(() =>
            bot.sendMessage(msg.chat.id, chunk)
          );
        }
      } else {
        await bot.sendMessage(msg.chat.id, response, { parse_mode: 'Markdown' }).catch(() =>
          bot.sendMessage(msg.chat.id, response)
        );
      }
    } catch (error: any) {
      log.error({ error: error.message }, 'Telegram handler error');
      bot.sendMessage(msg.chat.id, `❌ Error: ${error.message}`);
    }
  });

  bot.on('voice', async (msg) => {
    if (!isAuthorized({ chatId: msg.chat.id, userId: msg.from?.id })) return;
    if (!consumeRateLimit({ chatId: msg.chat.id, userId: msg.from?.id })) return;
    bot.sendMessage(msg.chat.id, '🎤 Voice messages coming soon. For now, please type your message.');
  });

  console.log('⚡ FORGE Telegram bot is running...');
}

main().catch(console.error);
