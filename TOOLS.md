# TOOLS

## Available Channels
- CLI (`apps/cli`)
- Telegram bot (`apps/telegram`)
- Local dashboard (`apps/dashboard`)
- Autonomous scheduler (`apps/scheduler`)

## Tool Families
- Filesystem
- Shell
- HTTP
- Browser-lite
- Content generation
- Social posting (approval-gated)
- Video generation (approval-gated)
- Human escalation

## Integration Targets
- Codex / Claude Code collaborative coding loops
- Supabase (db/auth/storage)
- Vercel (deploy/preview)
- GitHub (repo + issue ops)
- cURL-first API verification

## Enforcement
- Policy engine: `configs/policies.yaml`
- Approval queue persisted in SQLite
- Risk scoring applied before tool execution
- Deletes/installs/posting/payments/deploys require explicit approval
