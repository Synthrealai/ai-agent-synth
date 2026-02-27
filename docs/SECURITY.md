# ForgeClaw Security Model

## Principles
1. Localhost-only by default
2. Least privilege
3. No secrets in code or logs
4. Approval gates
5. Audit trail

## Threat Mitigations
| Threat | Mitigation |
|--------|-----------|
| Secret exposure | .env with chmod 600, redaction layer in logger |
| Command injection | Shell tool blocks dangerous patterns, timeout enforcement |
| SSRF | HTTP tool blocks private IPs and metadata endpoints |
| Unauthorized access | Telegram bot validates owner ID |
| Runaway costs | CostGuard with daily spending limits |
| Data loss | Filesystem delete requires approval, WAL journaling |

## Autonomy Levels
- L0: Chat only, no tools
- L1: Tools with approval for ALL actions
- L2: Auto-approve low-risk, require approval for medium+high (DEFAULT)
- L3: Scheduled heartbeat enabled, background tasks (still policy-checked)
- L4: Multi-track harness execution with mandatory artifact validation (still approval-gated)
