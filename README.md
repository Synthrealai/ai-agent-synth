# FORGECLAW v2.0.0

FORGE is an autonomous multi-tool AI operating system for content, coding, research, and business ops.

## Quick Start

```bash
cd /Users/nick/SynthClawunch/forgeclaw
pnpm install
pnpm run db:migrate
pnpm run forge
```

## Telegram

```bash
pnpm run forge:telegram
```

Required env vars:
- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_OWNER_ID`

## Dashboard

```bash
pnpm run forge:dashboard
```

## PM2 Runtime

```bash
pnpm run forge:all
pm2 logs forge-telegram
```

## Tests

```bash
pnpm test
```

## Security

- Keep secrets only in `~/.forgeclaw/.env` and never commit them.
- Default deployment binds dashboard on localhost.
- High-risk actions are policy-gated via approvals.
