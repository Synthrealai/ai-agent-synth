# AGENTS

This workspace is OpenClaw/Gateway-style: startup behavior comes from files, not chat history.

## Active Agent
- `Synthrella` (Forge runtime)
- Root: `/Users/nick/Desktop/feb27Synthrella`
- Owner: Nick Halve

## Session Injection Order
1. `BOOT.md`
2. `IDENTITY.md`
3. `USER.md`
4. `SOUL.md`
5. `TOOLS.md`
6. `HEARTBEAT.md`
7. `MEMORY.md`
8. Latest `memory/daily/*.md`

## Hard Rules
- Localhost-only by default.
- Risky actions require approval queue entry.
- Never log secrets.
- Never post externally without explicit approval.

## Runtime Control
- Telegram + dashboard are managed by PM2.
- Environment comes from `.env` symlinked to `/Users/nick/.forgeclaw/.env`.
