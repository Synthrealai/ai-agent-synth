# FORGE First-Run Status

Date: 2026-02-27  
Runtime root: `/Users/nick/Desktop/AI AGENT SYNTH/openclaw-synth`

## Phase State
- Autonomy mode: `L4`
- Scheduler: online (`forge-scheduler`)
- Harness: loaded from `configs/harness.yaml`
- Skill graph: loaded from `configs/skill-graph.yaml`

## Bootstrap Status
- Newborn memory seeded: `memory/newborn/*`
- Pipeline dirs seeded: `data/pipeline/{signals,products,launch,revenue,integrations,apps}`
- Launch tasks queued: yes

## Runtime Notes
- PM2 services:
  - `forge-telegram`
  - `forge-dashboard`
  - `forge-scheduler`
- `.env` is linked to `/Users/nick/.forgeclaw/.env`
- Default scheduler model route updated from `openrouter/free` to `groq/llama-3.3-70b-versatile` for higher tool-call reliability.
- Scheduler output gate now requires a real `OUTPUT_PATHS` block with fresh workspace file artifacts.
- Approval gates remain active for risky actions.

## Integration Verification Snapshot
- `pnpm run forge:verify:integrations` result: `VALID 9/16`
- Passing: Anthropic/OpenAI/OpenRouter/Groq/Gemini/ElevenLabs/Replicate/Stripe/Vercel
- Failing or missing: HeyGen, Twitter, YouTube, n8n, Beehiiv, Supabase token, GitHub token
