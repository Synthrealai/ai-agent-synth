# MEMORY

## Memory System
- Backing store: SQLite (`~/.forgeclaw/data/forge.db`)
- Types: facts, preferences, projects, decisions, learnings, contacts, skills
- Timeline events capture tool calls, outcomes, and validation failures

## File Log Layer
- Newborn profile: `memory/newborn/`
- Daily notes: `memory/daily/`
- Long-lived summaries: `docs/NICKS_EMPIRE_MAP.md`, `docs/FIRST_RUN_STATUS.md`

## Write Rules
- Persist strategic facts and decisions.
- Persist unresolved blockers with owner + next action.
- Persist shipped artifact paths and launch outcomes.
- Never store raw secrets in memory logs.
