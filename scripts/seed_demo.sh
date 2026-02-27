#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p ./data/demo
cat > ./data/demo/task.yaml <<'YAML'
name: smoke-demo
objective: create a demo folder and write a status file
steps:
  - tool: filesystem
    args:
      operation: mkdir
      path: ./data/demo/output
  - tool: filesystem
    args:
      operation: write
      path: ./data/demo/output/hello.txt
      content: ForgeClaw demo completed safely.
  - tool: human
    args:
      question: "Demo completed. Approve summary generation?"
YAML
echo "Seeded ./data/demo/task.yaml"
