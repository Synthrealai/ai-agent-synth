# Newborn Skill Graph

## Nodes
- **Newborn Launch** (orchestration)
  Outputs: memory/newborn/01_IDENTITY.md, memory/newborn/02_MISSION.md, memory/newborn/03_OFFER_STACK.md, memory/newborn/04_SKILL_GRAPH.md
- **Product Factory** (build)
  Depends on: signal-ops
  Outputs: data/pipeline/products/
- **Signal Ops** (research)
  Outputs: data/pipeline/signals/
- **Growth Swarm** (distribution)
  Depends on: product-factory
  Outputs: data/pipeline/launch/
- **Revenue Ops** (monetization)
  Depends on: growth-swarm
  Outputs: data/pipeline/revenue/
- **App Studio** (engineering)
  Depends on: product-factory
  Outputs: data/pipeline/apps/

## Edges
- newborn-launch -> signal-ops
- signal-ops -> product-factory
- product-factory -> growth-swarm
- growth-swarm -> revenue-ops
- product-factory -> app-studio

## Runtime Rule
- Always complete upstream nodes before downstream monetization tasks.