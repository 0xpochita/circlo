# Changelog

All notable changes to `circlo-types` are documented here. This project
follows [Semantic Versioning](https://semver.org).

## [0.1.1] — 2026-05-18

### Added

- **`CIRCLE_FACTORY_ABI.getCircle`** — `(circleId) → { owner, isPrivate, createdAt, metadataURI }`.
  Single-call read for a circle's metadata tuple. Previously consumers
  had to declare this signature inline.
- **`RESOLUTION_MODULE_ABI.isResolver`** — `(goalId, user) → bool`.
  Whether `user` is on the resolver list for `goalId`. Useful for UI
  gating before calling `submitVote`.

Both are additive — existing imports keep working unchanged.

## [0.1.0] — 2026-05-16

Initial release.

- Deployed contract addresses for Celo Mainnet (chainId 42220):
  CircleFactory, PredictionPool, ResolutionModule, USDT.
- Minimal `as const` ABIs for each contract.
- Enums: `OutcomeType`, `GoalStatus`, `Side` + `UNRESOLVED_SIDE` sentinel.
- Entity types: `Circle`, `Goal`, `Stake`, `ResolverVote`, plus event arg
  types (`CircleCreatedEvent`, `GoalCreatedEvent`, etc).
- Pure helpers: `parseCircleMetadata`, `parseGoalMetadata`.
