#!/usr/bin/env tsx
import { createInterface } from 'readline';
import { ForgeAgent } from '@forgeclaw/core';
import { createChildLogger } from '@forgeclaw/shared';

const log = createChildLogger('cli');

async function main() {
  console.log(`
╔══════════════════════════════════════════╗
║  ⚡ FORGE — Autonomous Intelligence     ║
║  Built by Forged Intelligence            ║
║  Type 'help' for commands                ║
║  Type 'exit' to quit                     ║
╚══════════════════════════════════════════╝
  `);

  const agent = new ForgeAgent();

  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: '\n🔥 FORGE > ',
  });

  rl.prompt();

  rl.on('line', async (line) => {
    const input = line.trim();

    if (!input) {
      rl.prompt();
      return;
    }

    if (input === 'exit' || input === 'quit') {
      console.log('\n⚡ FORGE shutting down. Ship it.\n');
      process.exit(0);
    }

    if (input === 'help') {
      console.log(`
Commands:
  /approve <id>    — Approve a pending action
  /deny <id>       — Deny a pending action
  /approvals       — Show pending approvals
  /timeline        — Show recent timeline
  /status          — Show agent status
  /content <topic> — Generate content about a topic
  /post <platform> — Draft a post for a platform
  /video <topic>   — Create a video script
  exit             — Quit

Or just chat naturally — FORGE handles the rest.
      `);
      rl.prompt();
      return;
    }

    if (input.startsWith('/approve ')) {
      const id = input.replace('/approve ', '').trim();
      const result = await agent.approveAction(id);
      console.log(result);
      rl.prompt();
      return;
    }

    if (input.startsWith('/deny ')) {
      const id = input.replace('/deny ', '').trim();
      const result = await agent.denyAction(id);
      console.log(result);
      rl.prompt();
      return;
    }

    if (input === '/approvals') {
      const approvals = agent.getPendingApprovals();
      if (approvals.length === 0) {
        console.log('No pending approvals.');
      } else {
        for (const a of approvals) {
          console.log(`[${a.id}] ${a.request.tool} — ${a.request.reason}`);
        }
      }
      rl.prompt();
      return;
    }

    if (input === '/timeline') {
      const events = agent.getTimeline(10);
      for (const e of events) {
        console.log(`[${e.timestamp}] ${e.type}: ${e.summary}`);
      }
      rl.prompt();
      return;
    }

    try {
      console.log('\n🧠 Thinking...\n');
      const response = await agent.processMessage(input, 'cli');
      console.log(`\n${response}`);
    } catch (error: any) {
      console.error(`\n❌ Error: ${error.message}`);
      log.error({ error: error.message }, 'CLI error');
    }

    rl.prompt();
  });
}

main().catch(console.error);
