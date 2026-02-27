# Backlog

## Blockers
- Google Docs intelligence sweep is blocked (`401`) until authenticated Drive access is provided.
- Five integrations need refresh/fix: HeyGen, Twitter, YouTube, Beehiiv, n8n API endpoint.

## Next Actions
1. Fix invalid/expired API credentials and rerun `scripts/verify_integrations.py`.
2. Provide authenticated Google Docs access, then rebuild Empire Map from source docs.
3. Add scheduler wiring for automated 6:00 AM briefing generation.
