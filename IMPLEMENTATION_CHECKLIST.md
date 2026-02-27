# ForgeClaw Implementation Checklist

## Repository and Build

- [x] Monorepo scaffold with `apps/*` and `packages/*`
- [x] `pnpm` workspace configured
- [x] TypeScript base config and package-level configs
- [x] Dockerfile + docker-compose
- [x] Local scripts: `install.sh`, `dev.sh`, `seed_demo.sh`

## Security Baseline

- [x] Localhost-first bind defaults
- [x] Policy engine with allow/deny/warn/require_approval
- [x] Risk scoring for all tools
- [x] Approval queue persisted in SQLite
- [x] Secret redaction in logs and payloads
- [x] Dry-run mode support
- [x] Rollback journal and rollback command

## Core Agent

- [x] Planner -> stepwise executor flow
- [x] ToolRouter mediation for every tool call
- [x] Autonomy levels `L0`..`L3`
- [x] Heartbeat scheduler (off by default)
- [x] Safe fallback handling on tool and LLM failures

## Tools

- [x] Filesystem tool (read/write/list/mkdir/move/copy/delete/rollback)
- [x] Shell tool (sandboxed cwd, timeout, truncation)
- [x] HTTP tool (allowlist/denylist + metadata/private blocking)
- [x] Browser-lite tool (HTML fetch + parse)
- [x] Code sandbox tool (VM with timeout)
- [x] Human tool (explicit unblock questions)

## Memory

- [x] SQLite schema for timeline/memories/tasks/approvals/rollback
- [x] Short-term conversation turns + summary storage
- [x] Long-term memory categories + retrieval

## Skills + Templates

- [x] Local skills registry
- [x] Skill signature verification (default enabled)
- [x] CLI install command
- [x] Template bundles with onboarding and micro-win messages
- [x] Templates: Creator, Agency, Local Contractor, Realtor, Ecom

## Interfaces

- [x] CLI chat and ops commands
- [x] Telegram integration (`/start`, `/help`, `/mode`, `/approve`, `/deny`)
- [x] Local dashboard timeline/approvals/task views

## Testing

- [x] Policy engine unit tests
- [x] Memory persistence tests
- [x] End-to-end smoke test (safe task)

## Validation

- [x] `pnpm install`
- [x] `pnpm typecheck`
- [x] `pnpm test`
- [x] `pnpm build`
- [x] `pnpm dev` local dashboard startup
