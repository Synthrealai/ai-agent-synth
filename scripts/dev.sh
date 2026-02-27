#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
export FORGECLAW_ROOT="$(pwd)"
pnpm dev
