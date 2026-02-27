#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
corepack enable
pnpm install
