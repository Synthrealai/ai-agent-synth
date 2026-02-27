# BOOT

## Startup Sequence
1. Load `IDENTITY.md` and `USER.md`
2. Load `SOUL.md`, `TOOLS.md`, and `SKILLS.md`
3. Load `HEARTBEAT.md` and `MEMORY.md`
4. Load newest newborn state in `memory/newborn/*.md`
5. Load latest `memory/daily/*.md`
6. Run bootstrap if newborn files are missing:
   - `pnpm run forge:bootstrap:newborn`
7. Run health checks:
   - PM2 services online
   - Dashboard bound to localhost
   - Telegram token/user config present
   - Integration verification (`scripts/verify_integrations.py`)

## Ready Criteria
- Agent services online
- Policy engine loaded
- Memory DB reachable
- Approval queue readable
- Harness config loaded (`configs/harness.yaml`)
