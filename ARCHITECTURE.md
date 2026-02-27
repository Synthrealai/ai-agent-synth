# ForgeClaw Architecture

```text
                    +------------------------------+
                    |   Interfaces (localhost)     |
                    | CLI | Telegram | Dashboard   |
                    +------------------------------+
                                  |
                                  v
                      +-------------------------+
                      |  Core Agent Orchestrator|
                      | planner -> executor     |
                      | retries -> fallback     |
                      +-------------------------+
                                  |
                      +-----------+-----------+
                      |                       |
                      v                       v
            +-------------------+   +-------------------+
            |   Policy Engine   |   |      Memory       |
            | allow/deny/warn   |   | SQLite timeline   |
            | require_approval  |   | tasks/approvals   |
            +-------------------+   +-------------------+
                      |
                      v
               +--------------+
               |  Tool Router |
               +--------------+
                      |
      +---------------+------------------+---------------------+
      |               |                  |                     |
      v               v                  v                     v
 [filesystem]      [shell]            [http]            [browser-lite]
      |               |                  |                     |
      +---------------+------------------+---------------------+
                      |
                      v
              +------------------+
              | L4 Harness Tracks |
              | signal -> build   |
              | launch -> revenue |
              | integrations      |
              +------------------+
```

## Key Properties
- Local-first security: bind hosts default to `127.0.0.1`.
- Policy gate: every tool call is scored and policy-checked before execution.
- Approval queue: risky operations persist in SQLite and require explicit approval.
- Deterministic logs: structured logs with redaction.
- Artifact validation: scheduler fails tasks with fake/missing output paths.

## Autonomy Levels
- `L0`: chat only
- `L1`: tools with approvals
- `L2`: low-risk auto-approved
- `L3`: scheduled heartbeat + policy checks
- `L4`: multi-track autonomy harness (signals, product factory, launch, revenue, integrations)
