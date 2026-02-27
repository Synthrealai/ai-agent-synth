# HEARTBEAT

## Schedule Targets (America/Chicago)
- Daily briefing: 6:00 AM
- Harness execution: every 90 minutes
- Weekly report: Sunday 8:00 PM
- Monthly strategy review: 1st day of month

## Guardrails
- Heartbeat cannot auto-run destructive actions.
- Any external posting, payment, deletion, or deployment must enter approval queue.
- Tasks only complete when real output files are verified on disk.

## Output Artifacts
- `data/briefings/YYYY-MM-DD-morning.md`
- `memory/daily/YYYY-MM-DD.md`
- `data/pipeline/{signals,products,launch,revenue,integrations,apps}/`
- `docs/FIRST_RUN_STATUS.md` (when baseline changes)
