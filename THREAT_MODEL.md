# Threat Model

## Assets

- Local filesystem contents
- API tokens and credentials
- Conversation and memory data
- Skill bundles and execution surface

## Entry Points

- CLI user input
- Telegram chat input
- HTTP/browser-lite fetched content
- Skill bundles from registry

## Top Risks and Mitigations

1. Prompt injection drives unsafe tool use.
- Mitigation: model cannot execute tools directly; ToolRouter enforces PolicyEngine.

2. Sensitive file exfiltration.
- Mitigation: denylist paths (`.ssh`, key material, system secrets), approval queue, redacted logs.

3. Destructive commands.
- Mitigation: deny patterns (`rm -rf`, disk ops), approvals, dry-run support, rollback journal.

4. SSRF/metadata access.
- Mitigation: block metadata and private ranges by default; allowlist controls.

5. Supply-chain compromise in skills.
- Mitigation: signature verification required by default and local registry-first installation.

6. Cost runaway and looping.
- Mitigation: cost guard, step/time/retry limits, autonomy levels.
