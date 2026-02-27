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
               [timeline logging]

```

## Key Properties

- **Local-first security:** all bind hosts default to `127.0.0.1`.
- **Policy gate:** every tool call is scored and policy-checked before execution.
- **Approval queue:** risky operations persist in SQLite and require explicit approval.
- **Rollback journal:** filesystem mutations write inverse operations for rollback.
- **Deterministic logs:** structured JSON logs with redaction.
- **Autonomy levels:**
  - `L0`: chat only
  - `L1`: tools require approval for risky actions
  - `L2`: low-risk auto-approved
  - `L3`: heartbeat scheduler allowed (still policy-checked)
