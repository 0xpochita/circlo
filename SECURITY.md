# Security Policy

Circlo holds user USDT in escrow on Celo Mainnet via UUPS-upgradeable
contracts. We take security reports seriously and appreciate
responsible disclosure.

## Supported Versions

| Surface             | Address / Location                                                       | Status      |
| ------------------- | ------------------------------------------------------------------------ | ----------- |
| CircleFactory       | `0x6cB74ce06E35caEfaFA1491769DeeeA46aebe6Ab` (Celo Mainnet, UUPS proxy) | Supported   |
| PredictionPool      | `0xE9cFa67358476194414ae3306888FfeCb8f41139` (Celo Mainnet, UUPS proxy) | Supported   |
| ResolutionModule    | `0x5861CAAFDCAc4313f2c9941C4fd1291B34C2c4f5` (Celo Mainnet, UUPS proxy) | Supported   |
| TimelockController  | `0xc6B9554fAA6703645f9AC65794CF2321cB82fE47` (Celo Mainnet)             | Supported   |
| Frontend            | `circlo-celo.vercel.app`                                                | Supported   |
| Backend API         | Railway-hosted Fastify service                                          | Supported   |
| Older sc deployments | Pre-mainnet test deployments                                           | Unsupported |

## Reporting a Vulnerability

If you believe you have found a security vulnerability in any
supported surface, **do not open a public GitHub issue**. Instead,
email the team at the contact listed on the [Talent.app project page](https://talent.app)
or DM the maintainer directly on the project's social channels.

Please include:

- A description of the issue and the surface affected (contract,
  frontend, backend, indexer).
- Steps to reproduce (transaction hashes on Celo, request payloads,
  or screen recordings as appropriate).
- The impact you believe the vulnerability has (loss of funds,
  privilege escalation, denial of service, information leak).
- Any suggested mitigation if you have one.

We will acknowledge receipt within 72 hours and aim to give a first
substantive response (assessment + ETA for fix) within 7 days. Critical
issues affecting funds at rest in PredictionPool are triaged
immediately and typically resolved within 24-48 hours via the
TimelockController upgrade path.

## Scope

### In scope

- Smart contracts under `sc/src/`, especially `PredictionPool`,
  `CircleFactory`, `ResolutionModule`, and `RewardDistributor`.
- Backend REST API and indexer under `backend/`.
- Frontend Next.js app under `frontend/`, including SIWE auth flow.
- Published npm packages: `circlo-types`, `circlo-sdk`.

### Out of scope

- Vulnerabilities in upstream dependencies that have not yet been
  patched in their own projects (please report to them first).
- Issues in test fixtures, mock contracts, deploy scripts, or any
  file under `sc/test/`, `scripts/bot/`, or `scripts/data/`.
- Findings that require a malicious resolver — Circlo's threat model
  trusts the resolver set chosen per goal; vote rigging by chosen
  resolvers is expected behavior, not a bug.
- Front-running and MEV concerns inherent to public Celo RPC usage.

## Coordinated Disclosure

We follow coordinated disclosure. Once a fix lands on Celo Mainnet
(via the 48-hour TimelockController delay) and the frontend is
redeployed, the maintainers will:

1. Credit the reporter in the next CHANGELOG entry (unless anonymity
   is requested).
2. Publish a short post-mortem describing the impact and the fix.
3. Update this policy if the threat model shifts.

Thank you for helping keep Circlo and its users safe on Celo.
