# ForgeClaw Security

## Defaults

- Localhost bind only (`127.0.0.1`)
- Heartbeat off (`FORGECLAW_HEARTBEAT_ENABLED=false`)
- Policy checks on every tool call
- Approval required for risky actions
- Redacted structured logs
- Secrets stored in `.env`, never committed

## Least Privilege

- Filesystem and shell constrained to configured sandbox root
- HTTP tool blocks metadata/private targets by default
- Skills installation verifies signature by default

## Rollback

Filesystem mutations are recorded as inverse operations in SQLite rollback journal.
Rollback is available via CLI command.

## Hardening Checklist

- Keep `FORGECLAW_BIND_HOST=127.0.0.1` unless explicitly exposing behind reverse proxy
- Use an allowlist for HTTP destinations
- Keep `SKILLS_REQUIRE_SIGNATURE=true`
- Set strict model cost limits
- Restrict Telegram access with `TELEGRAM_ALLOWED_CHAT_IDS`
