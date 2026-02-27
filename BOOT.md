# BOOT

## Startup Sequence
1. Load `IDENTITY.md` and `USER.md`
2. Load `SOUL.md` and `TOOLS.md`
3. Load `HEARTBEAT.md` and `MEMORY.md`
4. Load most recent `memory/daily/*.md`
5. Run health checks:
   - PM2 services online
   - Dashboard bound to localhost
   - Telegram token/user config present
   - Integration verification (`scripts/verify_integrations.py`)

## Ready Criteria
- Agent services online
- Policy engine loaded
- Memory DB reachable
- Approval queue readable
