<div align="center">
  <img src="frontend/public/Assets/Images/Logo/logo-brand/logo-brand.webp" alt="Circlo Logo" width="120" />

  # Circlo

  **On-chain social prediction game — tokenize your circle of friends, turn personal goals into prediction markets, and hold each other accountable on Celo blockchain.**

  [Live Demo](https://circlo-celo.vercel.app) · [CeloScan](https://celoscan.io/address/0x6cB74ce06E35caEfaFA1491769DeeeA46aebe6Ab)
</div>

Circlo is a decentralized social accountability platform built on Celo. Friends form circles, create prediction markets around personal goals (workout streaks, project deadlines, learning milestones), and stake USDT on outcomes. When the deadline hits, friends-as-resolvers vote on the truth — winners split the pool, losers learn the cost of breaking commitments. All transparent, all on-chain, all in your pocket via MiniPay.

## What Makes Circlo Special

## Who This Is For

Meet **Maya**. She's been trying to lose 5kg for the past 18 months. She's tried gym memberships, fitness apps, and group chats with friends who promised to keep her accountable. None of it worked. The gym became a sunk cost she ignored. The app's notifications got muted. The group chat motivation faded after week two.

But Maya has a deeper problem. She knows what works for her — **social pressure with real stakes**. When she promised her sister $50 if she missed leg day, she didn't miss leg day for three weeks. The problem is: this only works informally, with one person, for short bursts. The moment money's involved, things get awkward. Who holds the money? Who decides if she "really" did the workout? What if her sister forgets, or worse, lets her off the hook because they're family?

She tried a habit-tracking app, but there was no skin in the game. She tried betting with friends via Venmo, but there's no enforcement — the loser just doesn't pay. She tried Polymarket, but those are anonymous markets about elections and football, not about her actual life and the people who actually care about her.

Maya's problem isn't lack of motivation. It's that **there's no platform where she can put real money on her personal goals, with people she trusts as judges, where outcomes are enforced automatically and the rewards flow to whoever held up their end**.

## The Problem

Personal accountability is broken. Solo habit apps fail because there's no skin in the game. Group chats lose momentum because there's no enforcement. Cash bets between friends end in awkwardness because there's no neutral arbiter. And existing prediction markets like Polymarket are anonymous and impersonal — designed for global events, not for "Will Maya actually run that 5K next Saturday?"

Existing solutions are either:

- **Too solo** — habit trackers (Habitica, Streaks) have zero financial commitment, so users abandon them within weeks
- **Too informal** — group chat bets and Venmo wagers have no enforcement, no neutral resolver, and create social tension when payouts go wrong
- **Too impersonal** — Polymarket and Kalshi are global anonymous prediction markets with no social fabric, irrelevant to personal accountability
- **Too centralized** — apps like StickK take a fee and use a single arbiter; if you disagree with their decision, there's no transparent record

And none of them turn your existing friend group into a prediction market where everyone has skin in the game.

**How might we build a platform where friends can stake money on each other's personal goals, vote on outcomes transparently, and have winnings settle automatically — all on-chain and with mobile-first onboarding?**

## The Solution

Circlo solves this with five core primitives built on Celo:

**1. Social Circles** — Friends form private or public circles. Each circle is its own micro-economy with its own goals, members, and resolvers. Like a private Polymarket scoped to people you actually know.

**2. Goal-Based Prediction Markets** — Inside a circle, anyone can create a binary prediction goal ("Will Maya run a 5K by next Saturday?"). Members stake USDT on Yes or No. Stakes are locked in escrow on-chain.

**3. Resolver Voting** — Goal creator picks 1+ resolvers (friends in the circle) to judge outcomes. After deadline, resolvers vote on what actually happened. ResolutionModule contract aggregates votes and finalizes the winning side. No central authority, no rug-pull.

**4. Automatic Settlement** — Once the winning side is set, losers' pool flows proportionally to winners. Winners claim from PredictionPool with a single tx. Failed/disputed goals trigger refund mode where everyone gets stake back.

**5. MiniPay-First Mobile UX** — Login with SIWE (Sign-In With Ethereum), no passwords. Optimized for MiniPay (Opera's Celo wallet) so anyone with a smartphone can stake $0.10 on a friend's goal in 30 seconds. Web fallback via MetaMask for desktop users.

## Features

- **Social Circles** — public or private (invite-only via username), unlimited members per circle
- **Binary Prediction Markets** — Yes/No outcomes per goal with USDT staking (6-decimal precision, minimum 0.0001 USDT)
- **Resolver-Based Truth Layer** — 1+ resolvers per goal, on-chain voting via ResolutionModule
- **Real-Time Notifications** — WebSocket pub/sub via Redis, instant updates for stakes, votes, claims
- **SIWE Authentication** — wallet-only login, JWT-backed session, no email/password
- **Realized PnL Tracking** — profile shows actual claimed wins/losses, ROI based on wallet balance
- **Off-Chain Invite + On-Chain Join** — username invitations via DB, then user signs `joinCircle()` tx
- **Indexer with Auto-Backfill** — viem HTTP polling watches all events, replay-safe with idempotent handlers
- **Referral Rewards System** — RewardDistributor contract for referral bonuses and retention rewards
- **Multi-Wallet Support** — MiniPay (mobile-first), MetaMask, any EIP-1193 wallet via WalletConnect

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js (App Router), React, TypeScript, Tailwind CSS, Framer Motion |
| Auth | SIWE (EIP-4361) + JWT, refresh tokens via httpOnly cookie |
| Wallet | MiniPay, MetaMask, wagmi v2 + viem |
| Blockchain | Celo Mainnet (chainId 42220), Forno RPC |
| Smart Contract Language | Solidity 0.8.24 |
| Smart Contracts | CircleFactory, PredictionPool, ResolutionModule, RewardDistributor (UUPS upgradeable) |
| Contract Tooling | Foundry (forge build, test, deploy) |
| Contract Libraries | OpenZeppelin (AccessControl, ReentrancyGuard, Pausable, UUPS) |
| Backend | Node.js 20+, TypeScript, Fastify 4 |
| Database | PostgreSQL 15 via Prisma ORM |
| Cache / Queue | Redis 7, BullMQ for job queues |
| Indexer | viem HTTP polling, replay-safe idempotent handlers |
| Real-time | Fastify WebSocket gateway + Redis pub/sub |
| Stablecoin | USDT on Celo (`0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e`, 6 decimals) |
| Hosting (Frontend) | Vercel |
| Hosting (Backend) | Railway |

## Architecture

### System Flow

```
        ┌─────────────────────┐
        │   User (MiniPay)    │
        └──────────┬──────────┘
                   │ HTTPS
                   ▼
   ┌──────────────────────────────────┐
   │   Frontend (Next.js, Vercel)     │
   │   • SIWE auth                    │
   │   • wagmi + viem                 │
   │   • WebSocket client             │
   └──────────┬───────────────┬───────┘
              │               │
              │ REST API      │ WebSocket
              ▼               ▼
   ┌──────────────────────────────────┐
   │   Backend (Fastify, Railway)     │
   │                                  │
   │   ┌──────────────┐ ┌──────────┐  │
   │   │  REST API    │ │  WS Gw   │  │
   │   └──────┬───────┘ └────┬─────┘  │
   │          │              │        │
   │   ┌──────┴──────────────┴─────┐  │
   │   │  Prisma + Redis pub/sub   │  │
   │   └──────────┬──────────────┬─┘  │
   │              │              │    │
   │   ┌──────────┴──┐   ┌───────┴──┐ │
   │   │  PostgreSQL │   │  BullMQ  │ │
   │   └─────────────┘   └──────────┘ │
   │              ▲                   │
   │              │ writes from       │
   │   ┌──────────┴──────────────┐    │
   │   │   Indexer (viem HTTP)   │    │
   │   │   • Backfill from DB    │    │
   │   │   • Realtime watchers   │    │
   │   └──────────┬──────────────┘    │
   └──────────────┼───────────────────┘
                  │ getLogs
                  ▼
   ┌──────────────────────────────────┐
   │     Celo Mainnet (chainId 42220) │
   │                                  │
   │   ┌──────────────┐               │
   │   │ CircleFactory│               │
   │   └──────┬───────┘               │
   │          │ isCircleMember check  │
   │          ▼                       │
   │   ┌──────────────┐               │
   │   │PredictionPool│◄──┐           │
   │   └──────┬───────┘   │ setWinner │
   │          │           │           │
   │          │     ┌─────┴────────┐  │
   │          │     │ResolutionMod.│  │
   │          │     └──────────────┘  │
   │          │ stake/claim           │
   │          ▼                       │
   │   ┌──────────────┐               │
   │   │   USDT (Celo)│               │
   │   └──────────────┘               │
   └──────────────────────────────────┘
```

### Contract Relationships

```
CircleFactory ──────► (membership source of truth)
       ▲
       │ isCircleMember()
       │
PredictionPool ◄──────── ResolutionModule
       │                       │
       │  stake/claim          │ submitVote/setWinner
       ▼                       ▼
    USDT (Celo)         (vote tally → finalize winning side)

RewardDistributor ◄──── (referral bonuses, separate from main flow)
```

### Stake Distribution

```
Goal lifecycle (Yes vs No prediction):

1. Open phase
   ├── Yes pool: 100 USDT (5 stakers)
   └── No pool:   60 USDT (3 stakers)
   Total escrow: 160 USDT in PredictionPool

2. Deadline passes → lockGoal() → status: Locked
3. Resolvers vote → ResolutionModule.finalize()
4. setWinner(side=Yes) called by ResolutionModule

5. Settlement (Yes wins):
   ├── Yes stakers: original stake + share of No pool
   │     User staked 20 USDT on Yes → claims 20 + (20/100 × 60) = 32 USDT
   └── No stakers: lose stake → 0 claimable

6. Optional protocol fee (currently 0%)
   All winnings flow back to participants
```

## Project Structure

```
circlo/
├── frontend/                          # Next.js frontend (Vercel)
│   ├── src/
│   │   ├── app/                       # Next.js App Router
│   │   │   ├── (main)/                # Authenticated app routes
│   │   │   ├── (onboarding)/          # SIWE login + profile setup
│   │   │   └── layout.tsx             # Root layout + metadata
│   │   ├── components/pages/          # Page-scoped components
│   │   │   ├── (app)/                 # Header, OnboardingGuard
│   │   │   ├── (circle-details)/      # DetailsStats, DetailsGoals, JoinButton
│   │   │   ├── (create-prediction)/   # PredictionForm, ConfirmButton
│   │   │   ├── (prediction-detail)/   # StakeButton, OddsCard, LockMarketButton
│   │   │   └── (profile)/             # ProfileHero, RecentPredictions
│   │   ├── hooks/                     # useAuth, useMiniPay, useUSDT
│   │   ├── lib/
│   │   │   ├── api/                   # Backend REST client
│   │   │   ├── web3/                  # contracts, network, usdt utils
│   │   │   └── utils.ts               # normalizeSide, formatTimeLeft
│   │   ├── stores/                    # Zustand: auth, user, notification
│   │   └── types/                     # Shared TS types
│   └── public/                        # Static assets
├── backend/                           # Fastify API + indexer + jobs (Railway)
│   ├── src/
│   │   ├── api/
│   │   │   ├── server.ts              # Fastify bootstrap
│   │   │   ├── middlewares/auth.ts    # JWT + requireAuth
│   │   │   └── routes/                # 28 REST endpoints
│   │   │       ├── auth.ts            # SIWE nonce + verify
│   │   │       ├── users.ts           # /me, /me/stats, /search
│   │   │       ├── circles.ts         # CRUD + invite + accept-invite
│   │   │       ├── goals.ts           # CRUD + my-stake + participants
│   │   │       ├── notifications.ts
│   │   │       └── system.ts          # /health, /config
│   │   ├── indexer/
│   │   │   ├── client.ts              # viem HTTP client + reconnect
│   │   │   ├── index.ts               # Backfill + watchers orchestration
│   │   │   └── handlers/              # Event handlers per contract
│   │   ├── jobs/                      # BullMQ workers
│   │   │   ├── lockExpiredGoals.ts    # Cron 1m
│   │   │   ├── detectDisputes.ts      # Cron 5m
│   │   │   └── processReferrals.ts
│   │   ├── ws/gateway.ts              # WebSocket gateway + Redis pub/sub
│   │   ├── lib/                       # prisma, redis, viem clients
│   │   └── index.ts                   # Entry: REST + jobs + indexer
│   ├── prisma/
│   │   ├── schema.prisma              # 8 models, USDT as Decimal(36,6)
│   │   └── migrations/
│   ├── docs/
│   │   ├── API.md                     # 28 endpoints documented
│   │   └── CHANGES.md                 # Endpoint clarifications
│   └── scripts/
│       └── dedupe_notifications.sql   # Maintenance scripts
└── sc/                                # Smart contracts (Foundry)
    ├── src/
    │   ├── CircleFactory.sol          # Circle creation, membership
    │   ├── PredictionPool.sol         # Goal lifecycle, staking, claims
    │   ├── ResolutionModule.sol       # Resolver voting + finalization
    │   ├── RewardDistributor.sol      # Referral + retention bonuses
    │   └── interfaces/                # ICircleFactory, IPredictionPool, IResolutionModule
    ├── test/                          # Foundry tests
    ├── script/                        # Deploy scripts
    ├── docs/                          # Deployment + integration docs
    ├── foundry.toml
    └── README.md
```

## Business Model

### Revenue Streams

| Source | Model | Description |
|---|---|---|
| Protocol Fee | % of pool | Configurable via `setFee(bps, recipient)` on PredictionPool. Currently 0%, capped at 10%. Future revenue: 1-3% of total pool per resolved goal |
| Premium Circles | SaaS subscription | Advanced features: custom branding, larger member caps, analytics dashboard, priority support |
| Resolver Marketplace | Reputation fee | Optional fee for verified third-party resolvers (KYC'd judges for high-stake goals) |
| Referral Spread | % of incentives | RewardDistributor takes a portion of referral rewards as platform sustainability fee |

### Flywheel

```
More users join Circlo
        │
        ▼
More circles created (avg 5-20 members each)
        │
        ▼
More goals created per circle
        │
        ▼
More USDT staked = deeper liquidity = better odds
        │
        ▼
Better social proof + viral moments (winning streaks, big claims)
        │
        ▼
Word-of-mouth growth ──► Each member invites their own friend group
        │
        ▼
Network effect: each circle is a self-reinforcing micro-economy
```

Network effects:

- Each new circle brings 5-20 members → each member is a potential creator of new circles
- High-profile resolved goals create viral content (Twitter screenshots, etc.)
- Referral rewards via RewardDistributor accelerate user acquisition
- Resolver reputation creates lock-in (your trusted resolvers stay in your circles)

### Unit Economics

| Metric | Value |
|---|---|
| Avg circle size | 8 members |
| Avg goals per circle / month | 3 |
| Avg stake per goal | 5 USDT |
| Pool turnover per circle / month | 120 USDT |
| Protocol fee (target) | 1-3% |
| Revenue per circle / year | ~14-45 USDT |
| Target circles (Year 1) | 1,000 |
| Projected Year 1 ARR | 14,000-45,000 USDT + premium subs + referral spread |

### Why This Works

- **Zero friction onboarding** — SIWE login + MiniPay = no seed phrase, no banking, no KYC for small stakes
- **Stickiness via social capital** — your circles, your friends, your reputation as resolver
- **Composable with future DeFi** — idle USDT in PredictionPool can earn yield via lending protocols (future feature)
- **Self-policing economics** — bad resolvers lose reputation, good resolvers get invited to more circles
- **Mobile-first geography** — Celo + MiniPay targets emerging markets where social accountability is culturally strong

## Setup

### Smart Contract Setup

```bash
# Install Foundry
curl -L https://foundry.paradigm.xyz | bash
foundryup

# Clone the repository
git clone https://github.com/0xpochita/circlo.git
cd circlo/sc

# Install dependencies
forge install

# Build & test
forge build
forge test

# Deploy to Celo Mainnet (configure script/Deploy.s.sol with env vars)
forge script script/Deploy.s.sol \
  --rpc-url $CELO_RPC_URL \
  --private-key $DEPLOYER_KEY \
  --broadcast \
  --verify \
  --verifier-url https://api.celoscan.io/api \
  --etherscan-api-key $CELOSCAN_API_KEY
```

### Backend Setup

```bash
cd circlo/backend

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env:
#   DATABASE_URL=postgresql://...
#   REDIS_URL=redis://...
#   CELO_RPC_URL=https://forno.celo.org
#   CONTRACT_CIRCLE_FACTORY=0x6cB74ce06E35caEfaFA1491769DeeeA46aebe6Ab
#   CONTRACT_PREDICTION_POOL=0xE9cFa67358476194414ae3306888FfeCb8f41139
#   CONTRACT_RESOLUTION_MODULE=0x5861CAAFDCAc4313f2c9941C4fd1291B34C2c4f5
#   CONTRACT_USDT=0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e
#   JWT_SECRET=...
#   API_URL=https://your-api.example.com

# Run migrations
npx prisma migrate deploy
npx prisma generate

# Start services (REST API + jobs + indexer)
npm run dev
```

### Frontend Setup

```bash
cd circlo/frontend

# Install dependencies
pnpm install

# Configure environment
cp .env.example .env.local
# Edit .env.local:
#   NEXT_PUBLIC_USE_MAINNET=true
#   NEXT_PUBLIC_CIRCLE_FACTORY=0x6cB74ce06E35caEfaFA1491769DeeeA46aebe6Ab
#   NEXT_PUBLIC_PREDICTION_POOL=0xE9cFa67358476194414ae3306888FfeCb8f41139
#   NEXT_PUBLIC_RESOLUTION_MODULE=0x5861CAAFDCAc4313f2c9941C4fd1291B34C2c4f5
#   NEXT_PUBLIC_USDT=0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e
#   NEXT_PUBLIC_API_URL=https://your-api.example.com

# Start dev server
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in MiniPay or browser with MetaMask.

## How It Works

### Circle Owner Flow

```
Connect Wallet → Create Circle → Invite Friends → Create Goal → Manage Resolvers → Settle
```

1. **SIWE Login** — sign one message to authenticate, JWT issued
2. **Create Circle** — name, public/private, owner auto-becomes member
3. **Invite via Username** — backend pushes notification, friend accepts off-chain
4. **Create Goal** — title, deadline (1H/1D/3D/7D/14D/30D presets), min stake, resolvers
5. **Stake on Own Goal** — optional, owner can also bet
6. **Lock Market** — anyone can call `lockGoal()` after deadline
7. **Resolvers Vote** — friends submit votes via ResolutionModule
8. **Claim Rewards** — winners claim from PredictionPool

### Participant Flow

```
Accept Invite → Join Circle (on-chain) → Browse Goals → Stake → Wait Resolution → Claim
```

1. **Receive Invite** — notification with circle name + owner
2. **Accept** — backend marks acceptance, frontend triggers `joinCircle()` tx
3. **Browse Active Goals** — filter by status (Open, Locked, Resolving)
4. **Stake on Goal** — pick Yes/No side, approve USDT, submit stake tx
5. **Watch Outcome** — real-time notifications when goal resolves
6. **Claim** — single tx pulls winnings from PredictionPool to wallet

### On-Chain Flow

```
Owner                    CircleFactory                  PredictionPool                  USDT
  │                            │                              │                          │
  ├── createCircle(public) ───►│ (CircleCreated event)        │                          │
  │                            │                              │                          │
Participant                    │                              │                          │
  ├── joinCircle(circleId) ───►│ (CircleJoined event)         │                          │
  │                            │                              │                          │
Owner                          │                              │                          │
  ├── createGoal(circleId, deadline, minStake, resolvers, ...)──►(GoalCreated event)     │
  │                            │                              │                          │
  ├── approve(USDT, amount)──────────────────────────────────────────────────────────────►│
  └── stake(goalId, side, amount) ──────────────────────────►│ (Staked event)            │
                               │                              │ ◄── transferFrom ────────│
                               │                              │                          │
After deadline                 │                              │                          │
  ├── lockGoal(goalId) ─────────────────────────────────────►│ (GoalLocked event)        │
                               │                              │                          │
Resolver                       │                       ResolutionModule                  │
  ├── submitVote(goalId, choice)──────────────────────────►│ (VoteSubmitted event)       │
                               │                              │                          │
                               │                  finalize() ──► setWinner()             │
                               │                              │ (GoalResolved event)     │
                               │                              │                          │
Winner                         │                              │                          │
  └── claim(goalId) ─────────────────────────────────────────►│ (Claimed event)          │
                               │                              │ ──── transfer USDT ─────►│
```

## Smart Contract Details

### Contract Addresses (Celo Mainnet)

| # | Contract | Address |
|---|---|---|
| 1 | CircleFactory (proxy) | `0x6cB74ce06E35caEfaFA1491769DeeeA46aebe6Ab` |
| 2 | PredictionPool (proxy) | `0xE9cFa67358476194414ae3306888FfeCb8f41139` |
| 3 | ResolutionModule (proxy) | `0x5861CAAFDCAc4313f2c9941C4fd1291B34C2c4f5` |
| 4 | RewardDistributor (proxy) | TBD |
| 5 | USDT (Celo native) | `0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e` |

All Circlo contracts are **UUPS upgradeable** (ERC1967Proxy pattern) with role-based access via OpenZeppelin AccessControl.

### Key Solidity Functions

**CircleFactory**

```solidity
createCircle(bool isPrivate, string metadataURI) → uint256 circleId
joinCircle(uint256 circleId)                            // public circles
joinCirclePrivate(uint256 circleId, bytes inviteProof)  // private, EIP-712 signed proof
leaveCircle(uint256 circleId)
addMember(uint256 circleId, address member)             // owner-only
removeMember(uint256 circleId, address member)          // owner-only
isCircleMember(uint256 circleId, address user) → bool
getMembers(uint256 circleId, uint256 offset, uint256 limit) → address[]
```

**PredictionPool**

```solidity
createGoal(
  uint256 circleId,
  OutcomeType outcomeType,    // Binary, Multi, Numeric
  uint64 deadline,
  uint128 minStake,
  address[] resolverList,
  string metadataURI
) → uint256 goalId

stake(uint256 goalId, uint8 side, uint256 amount)        // requires USDT approval
lockGoal(uint256 goalId)                                  // after deadline
claim(uint256 goalId)                                     // winners claim winnings
refund(uint256 goalId)                                    // disputed goals
setWinner(uint256 goalId, uint8 winningSide)              // ResolutionModule only
markDisputed(uint256 goalId)                              // ResolutionModule only
setFee(uint256 bps, address recipient)                    // FEE_SETTER_ROLE only
```

**ResolutionModule**

```solidity
startVote(uint256 goalId)                                 // PredictionPool calls on lock
submitVote(uint256 goalId, uint8 choice)                  // resolver-only
finalize(uint256 goalId)                                  // anyone after threshold met
getVoteCount(uint256 goalId, uint8 choice) → uint256
```

**RewardDistributor**

```solidity
claimReferralReward()                                     // claim accumulated referral bonus
claimRetentionBonus(uint256 nonce, bytes signature)       // signed by OPERATOR
depositRewards(uint256 amount)                            // top up reward pool
```

For full ABI + frontend integration examples, see [`backend/docs/API.md`](./backend/docs/API.md) and [`frontend/src/lib/abis/`](./frontend/src/lib/abis/).

## Deployment Checklist

- [x] Deploy CircleFactory (UUPS proxy) to Celo Mainnet
- [x] Deploy PredictionPool (UUPS proxy) wired to ResolutionModule + USDT
- [x] Deploy ResolutionModule (UUPS proxy) with PredictionPool reference
- [x] Verify all contracts on CeloScan
- [x] Backend deployed to Railway with PostgreSQL + Redis
- [x] Indexer with HTTP polling + auto-backfill from last block
- [x] Idempotent event handlers (deterministic notification IDs, on-chain `stakeOf` reads)
- [x] WebSocket gateway with Redis pub/sub
- [x] BullMQ cron jobs (`lockExpiredGoals` 1m, `detectDisputes` 5m)
- [x] 28 REST API endpoints documented in `backend/docs/API.md`
- [x] Frontend deployed to Vercel with MiniPay-first UX
- [x] SIWE authentication with JWT + refresh tokens
- [x] Real-time goal status sync (on-chain reads in critical paths)
- [x] Realized PnL calculation (claimed positions only)
- [x] Cross-wallet testing (MiniPay + MetaMask)
- [x] Talent.app domain verification meta tag
- [ ] RewardDistributor mainnet deployment
- [ ] Mass user testing with 100+ wallets
- [ ] Mainnet stress test (1,000+ concurrent stakers)

## Hackathon Submission

| Field | Value |
|---|---|
| Event | Talent.app x Celo MiniApp Hackathon |
| Track | Consumer / Social DeFi / MiniApp |
| Demo URL | https://circlo-celo.vercel.app |
| Network | Celo Mainnet (chainId 42220) |
| CircleFactory | [View on CeloScan](https://celoscan.io/address/0x6cB74ce06E35caEfaFA1491769DeeeA46aebe6Ab) |
| PredictionPool | [View on CeloScan](https://celoscan.io/address/0xE9cFa67358476194414ae3306888FfeCb8f41139) |
| ResolutionModule | [View on CeloScan](https://celoscan.io/address/0x5861CAAFDCAc4313f2c9941C4fd1291B34C2c4f5) |

## Team

| Name | Role |
|---|---|
| Alven Tendrawan | Smart Contract Developer |
| Oktavianus Bima Jadiva | Frontend Developer |
| Natalie Neysa Jessica Soesanto | Editor / Designer |

## License

MIT

---

**Tokenize Your Circle, Turn Predictions into Real Goals — Circlo**
