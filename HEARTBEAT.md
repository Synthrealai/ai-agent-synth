# HEARTBEAT

## Schedule Targets (CST)
- Daily briefing: 6:00 AM
- Intelligence scan: every 2 hours (non-destructive only)
- Weekly report: Sunday 8:00 PM
- Monthly strategy review: 1st day of month

## Guardrails
- Heartbeat is off by default unless explicitly enabled.
- Heartbeat cannot auto-run destructive actions.
- Any external posting or financial action must enter approval queue.

## Output Artifacts
- `data/briefings/YYYY-MM-DD-morning.md`
- `memory/daily/YYYY-MM-DD.md`
- `docs/FIRST_RUN_STATUS.md` (when baseline changes)
