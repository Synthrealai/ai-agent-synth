# Phase 3/4 Autonomy

## Objective
Run a high-output AI operator loop that creates real artifacts, not status-only responses.

## Phase 3 (Structured Output)
- Use scheduler to seed actionable tasks.
- Force artifact creation in local workspace.
- Require approval for risky actions.
- Track results in timeline and memory.

## Phase 4 (Harness / Swarm)
- Enable multi-track execution:
  - SignalOps
  - ProductFactory
  - LaunchEngine
  - RevenueOps
  - Integrations
- Increase parallel task cadence (`max_tasks_run_per_tick`).
- Validate all reported output paths against disk.

## Runtime Files
- `configs/autonomy.yaml`
- `configs/harness.yaml`
- `configs/skill-graph.yaml`
- `apps/scheduler/src/index.ts`

## Acceptance Criteria
- Scheduler is online and ticking.
- Open tasks are actively cycling.
- Completed tasks include real output paths.
- No external post/deploy/payment occurs without approval.
