# Skills

This runtime uses local, signed skills only.

## Installed Core Skills
- `content-engine`
- `daily-briefing`
- `safe-notes`
- `lead-tracker`

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
```

## Security Defaults
- Signature verification: `ON`
- Unsafe/unsigned install: blocked unless explicitly disabled
- High-risk tool use in skills: still policy-gated by `configs/policies.yaml`
