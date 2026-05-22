# Changelog

All notable user-facing and developer-facing changes to Circlo are
documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)
loosely and the project does not yet follow semver — entries are
grouped by date instead.

## [Unreleased]

### Added

- **Settlement heartbeat on Celo Mainnet.** New permissionless
  `PredictionPool.settlement()` function and `Settlement(timestamp)`
  event, deployed via UUPS upgrade to the existing proxy. Anyone can
  call it as a cheap (~27k gas) on-chain ping without touching the
  goal lifecycle or USDT escrow. Wired through:
  - `circlo-types` 0.1.2: ABI entry + event type
  - `circlo-sdk` 0.3.0: `settlement(wallet)` writer + `watchSettlement`
    log subscription
  - Frontend: `SettlementBadge` shared component mounted in the
    root layout (bottom-left) showing "Heartbeat: Xm ago", clickable
    to the underlying tx on Celoscan
- New `ARCHITECTURE.md` capturing the end-to-end component map
  (Celo Mainnet contracts, Fastify backend + indexer, Next.js
  frontend, npm packages, role + governance matrix).
- Shared `OnChainBadge` component — compact "On-chain" pill linking
  goals / addresses / tx hashes to the active Celo block explorer.
  Mounted in the circle-details goal cards and the all-goals sheet.
- Shared `AddressLink` component that renders a shortened wallet
  address as a link to the active Celo block explorer (Celoscan on
  Celo Mainnet, Blockscout on Celo Sepolia). Used across the
  prediction-detail participant list, circle analytics leaderboard,
  member lists, invite search, and the wrong-wallet error card.
- "On-chain ID" row in the prediction-detail info card linking to the
  PredictionPool read-contract tab on the Celo block explorer so users
  can inspect the raw `Goal` struct.
- "View on Celo explorer" action on stake / vote / claim / createGoal
  success toasts, opening the tx on Celoscan or Blockscout depending
  on which Celo network the user is on.
- "View on Celo explorer" link in the deposit sheet so users can
  verify their wallet address on Celo before sending USDT.
- `explorerAddressUrl`, `explorerTxUrl`, and `explorerGoalUrl`
  helpers in `frontend/src/lib/web3/network.ts` for building
  network-aware explorer URLs.

### Changed

- `.gitattributes` normalizes line endings to LF across platforms so
  Windows contributors no longer trigger CRLF→LF warnings on every
  commit.

### CI

- CodeQL workflow drops `autobuild` and sets `build-mode: none` for
  the JS/TS language matrix entry.
- Circlo SDK install now builds `circlo-types` first so the workspace
  link resolves before SDK install runs.
- Frontend lint job downgrades four noisy biome rules + drops a batch
  of unused vars so CI lint passes again.

### Docs

- NatSpec coverage extended across `IPredictionPool` (user-facing,
  admin writes, reads) and `IResolutionModule` (contract + events,
  writes + reads).
- NatSpec on `settlement()` + `Settlement` event documenting the
  permissionless heartbeat semantics (no state mutation, ~27k gas).
- `SECURITY.md` added with the responsible disclosure policy for
  all Celo Mainnet surfaces.
- `circlo-sdk` JSDoc enriched on `refund`, `getStakeOf`,
  `getPoolPerSide` documenting return units, typed reverts, and the
  odds/payout formulas frontend composes them into.

### SC

- `PredictionPool` upgraded on Celo Mainnet (proxy
  `0xE9cFa67358476194414ae3306888FfeCb8f41139`) to new implementation
  `0x65BC4fa16D9a299363916619bac95133a93A7602` that ships the
  `settlement()` heartbeat.
- Test suite gains `test_Settlement_EmitsEventEachCall` and
  `test_Settlement_PermissionlessForAllRoles` replacing the prior
  no-assertion `test_Settlement`.
