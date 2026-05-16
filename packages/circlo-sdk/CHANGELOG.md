# Changelog

All notable changes to `circlo-sdk` are documented here. This project follows
[Semantic Versioning](https://semver.org).

## [0.2.0] — 2026-05-17

### Added

- **ResolutionModule helpers**: `submitVote(goalId, choice)`, `finalize(goalId)`,
  `getTally(goalId)`. Resolvers can now cast and observe votes via the SDK
  without touching the raw ABI.
- **Next-id reads**: `getCircleNextId()`, `getGoalNextId()`. Surfaces the
  on-chain counters, useful for indexers + dashboards.
- **`getCircleInfo(circleId)`**: returns the `{ owner, isPrivate, createdAt,
  metadataURI }` tuple for a single circle.
- **Metadata-parser re-exports**: `parseCircleMetadata`, `parseGoalMetadata`,
  and types `CircleMetadata`, `GoalMetadata` re-exported from `circlo-types`
  so consumers don't need to add a second package just to decode JSON.
- **Typed error classes**:
  - `CircloSdkError` — base; blanket-catch all library errors.
  - `NotConfiguredError` — thrown when a method needs a wallet/public client
    that wasn't passed to `createCircloClient`.
  - `EventNotFoundError` — thrown when a write tx confirms but the expected
    event is absent from the receipt.
  - `TxRevertedError` — thrown when a tx receipt reports `status: "reverted"`.

### Changed

- Internal generic `Error` throws replaced with the matching typed class —
  message format preserved, structured payloads (`operation`, `txHash`,
  `missing`) added for UI consumers. Existing string-matching catches are
  unaffected.

### Tests

- Suite grew from 10 → 20 passing.

## [0.1.0] — 2026-05-16

Initial release. Wraps CircleFactory + PredictionPool with 10 methods
(create/join/leave circle, create/lock/get goal, stake, claim/refund) plus
event subscription helpers and pure metadata builders.
