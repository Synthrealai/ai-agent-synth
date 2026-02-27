# Skills

This runtime uses local skills as execution modules for L3/L4 autonomy.

## Installed Core Skills
- `content-engine`
- `daily-briefing`
- `safe-notes`
- `lead-tracker`

## Phase 3/4 Skills
- `newborn-launch`
- `web-researcher`
- `code-builder`
- `business-ops`
- `social-poster`
- `app-studio`
- `product-factory`
- `revenue-ops`
- `growth-swarm`

## Skill Graph
- Config source: `configs/skill-graph.yaml`
- Newborn memory render: `memory/newborn/04_SKILL_GRAPH.md`

## Skill Format
A skill folder contains:
- `skill.yaml`
- `prompt.md`
- `actions.ts` (optional)
- `tests/` (optional)
- `skill.sig` (optional signature)

## Registry Paths
- Local registry: `skills-registry/`
- Built-in skills: `skills/`
- Installed skills snapshot: `data/skills-installed/`

## Commands
```bash
pnpm --filter @forgeclaw/cli skills list
pnpm --filter @forgeclaw/cli skills install <name>
pnpm --filter @forgeclaw/cli skills verify <name>
pnpm run forge:bootstrap:newborn
```

## Security Defaults
- Signature verification for registry installs: `ON`
- Unsafe/unsigned registry install: blocked unless explicitly disabled
- High-risk tool use in skills: still policy-gated by `configs/policies.yaml`
