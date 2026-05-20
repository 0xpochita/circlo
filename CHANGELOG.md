# Changelog

All notable user-facing and developer-facing changes to Circlo are
documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)
loosely and the project does not yet follow semver — entries are
grouped by date instead.

## [Unreleased]

### Added

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
