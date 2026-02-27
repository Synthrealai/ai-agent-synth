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
- Human question escalation

## Enforcement
- Policy engine: `configs/policies.yaml`
- Approval queue persisted in SQLite
- Risk scoring applied before tool execution
- Deletes/installs/posting require explicit approval
