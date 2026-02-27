# API

## CLI Commands

- `chat`
- `approve <approvalId>`
- `deny <approvalId>`
- `timeline [limit]`
- `run-task <task.yaml>`
- `skills install <name>`
- `rollback <sessionId>`

## Dashboard API

- `GET /api/timeline?limit=100`
- `GET /api/approvals?status=pending`
- `GET /api/tasks/current`
- `POST /api/approvals/:id/approve`
- `POST /api/approvals/:id/deny`
