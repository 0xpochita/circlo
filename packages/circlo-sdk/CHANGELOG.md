# Changelog

All notable changes to `circlo-sdk` are documented here. This project follows
[Semantic Versioning](https://semver.org).

## [0.3.0] — 2026-05-21

### Added

- **`settlement(wallet)`** — write helper for the new permissionless
  `settlement()` function on PredictionPool. Emits the on-chain
  `Settlement(timestamp)` heartbeat with one tx. Returns the raw tx
  hash, throws if the wallet has no account configured. Mirrors the
  shape of `claim` / `refund`.
- **`watchSettlement(client, onEvent)`** — event watcher for the
  `Settlement(timestamp)` log. Same shape as the existing
  `watchCircleCreated` / `watchGoalCreated` / `watchStaked` helpers;
  returns the viem unsubscribe handle. Useful for liveness
  dashboards that need to surface "last on-chain heartbeat at …"
  without rolling their own log subscription.
- **PredictionPool ABI** — exposes the `settlement()` function entry
  and the `Settlement(uint256 indexed timestamp)` event so SDK
  consumers and indexers can decode logs without a parallel ABI.

### Compatibility

- No breaking changes; this is an additive minor release. Existing
  callers do not need to update any imports.

## [0.2.1] — 2026-05-20

### Docs

- Enriched JSDoc on `refund`, `getStakeOf`, and `getPoolPerSide`. The
  previously one-line docstrings now match the depth of the rest of the
  surface — documenting return units (USDT base, 6-decimal), the typed
  reverts they can throw on Celo (`NotRefundable`, `NothingToRefund`),
  and the live-odds + payout-projection formulas that consumers
  compose them into.

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
