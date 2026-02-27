# FORGECLAW v2.1.0 (AI AGENT SYNTH)

FORGE is an autonomous multi-tool AI operating runtime for research, coding, distribution, and revenue operations.

## Canonical Root
`/Users/nick/Desktop/AI AGENT SYNTH/openclaw-synth`

## Quick Start

```bash
cd "/Users/nick/Desktop/AI AGENT SYNTH/openclaw-synth"
pnpm install
pnpm run db:migrate
pnpm run forge:bootstrap:newborn
pm2 start ecosystem.config.cjs
pm2 save
```

## Runtime Apps

```bash
pnpm run forge            # CLI
pnpm run forge:telegram   # Telegram bot
pnpm run forge:dashboard  # Local dashboard
pnpm run forge:scheduler  # Autonomy scheduler
```

## Health Checks

```bash
curl -s http://127.0.0.1:3000/api/health
curl -s http://127.0.0.1:3000/api/tasks?limit=20
pm2 list
```

## Phase 3/4 Harness
- Autonomy config: `configs/autonomy.yaml`
- Track harness: `configs/harness.yaml`
- Skill graph: `configs/skill-graph.yaml`
- Newborn memory: `memory/newborn/`

## Security
- Keep secrets only in `~/.forgeclaw/.env` and never commit them.
- Dashboard binds to localhost.
- High-risk actions are policy-gated and approval-backed.
- Tasks are expected to produce verifiable output files.
