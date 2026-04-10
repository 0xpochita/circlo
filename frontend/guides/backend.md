# Circlo — Backend Requirements

> Target audience: backend developer building the Circlo off-chain API.
> Pairs with `flow.md` (UX contract) and `smart-contract.md` (on-chain contract).

---

## 1. Purpose & Boundary

The backend is the **off-chain source of truth for metadata and social graph** — everything that is too expensive, too private, or too mutable to live on-chain:

- User profiles (name, username, avatar emoji + color)
- Circle metadata (name, description, category, privacy, invite codes)
- Goal metadata (title, description, emoji)
- Notifications
- Referral records
- Indexed chain events (for fast queries)

The smart contract is the **source of truth for money**: stakes, pools, votes, payouts. The backend must **never hold user funds**.

---

## 2. Tech Stack Recommendation

- **Runtime:** Node.js 20+ (TypeScript) or Go 1.22+.
- **Framework:** Fastify / NestJS / tRPC (Node) or Echo / chi (Go).
- **Database:** PostgreSQL 15+ (primary), Redis 7+ (cache + pub/sub).
- **ORM:** Prisma or Drizzle (if Node).
- **Auth:** Sign-In With Ethereum (EIP-4361) using MiniPay signer.
- **Indexer:** Custom worker using `viem` or Ponder/Envio (preferred) listening to Celo RPC.
- **Notifications:** WebSocket gateway (or SSE) + push via FCM/APNs later.
- **Storage:** No file uploads needed (emoji only). If added later: S3-compatible.
- **Deployment:** Fly.io / Railway / GCP Cloud Run. Use Docker.

---

## 3. Data Model (PostgreSQL)

### `users`
| Column | Type | Notes |
|--------|------|-------|
| id | `uuid` PK | generated |
| wallet_address | `text` UNIQUE | lowercase, 0x... |
| name | `text` | display name |
| username | `text` UNIQUE | `@handle` |
| avatar_emoji | `text` | e.g. "🚀" |
| avatar_color | `text` | hex `#ec4899` |
| referred_by | `uuid` NULL FK users | inviter |
| created_at | `timestamptz` |
| updated_at | `timestamptz` |

### `circles`
| Column | Type | Notes |
|--------|------|-------|
| id | `uuid` PK | |
| chain_id | `bigint` | on-chain circle id |
| owner_id | `uuid` FK users | creator |
| name | `text` | 3–40 chars |
| description | `text` NULL | |
| category | `text` | enum |
| privacy | `text` | `public` \| `private` |
| invite_code | `text` UNIQUE NULL | only for private |
| avatar_emoji | `text` | |
| avatar_color | `text` | |
| created_at | `timestamptz` |

### `circle_members`
| Column | Type | Notes |
|--------|------|-------|
| circle_id | `uuid` FK | |
| user_id | `uuid` FK | |
| role | `text` | `owner` \| `admin` \| `member` |
| joined_at | `timestamptz` | |
PK (`circle_id`, `user_id`)

### `goals`
| Column | Type | Notes |
|--------|------|-------|
| id | `uuid` PK | |
| chain_id | `bigint` | on-chain goal id |
| circle_id | `uuid` FK | |
| creator_id | `uuid` FK users | |
| title | `text` | |
| description | `text` NULL | |
| avatar_emoji | `text` | |
| avatar_color | `text` | |
| outcome_type | `text` | `binary` \| `multi` \| `numeric` |
| deadline | `timestamptz` | |
| min_stake | `numeric(36,18)` | in USDT |
| status | `text` | `open` \| `locked` \| `resolving` \| `resolved` \| `disputed` \| `paid_out` |
| winning_side | `text` NULL | `yes`, `no`, choice id |
| created_at | `timestamptz` | |

### `goal_participants`
| Column | Type | Notes |
|--------|------|-------|
| goal_id | `uuid` FK | |
| user_id | `uuid` FK | |
| side | `text` | `yes`, `no`, choice id |
| staked | `numeric(36,18)` | accumulated |
| claimed | `boolean` | default false |
| claimed_amount | `numeric(36,18)` NULL | |
| created_at | `timestamptz` | |
PK (`goal_id`, `user_id`)

### `goal_resolvers`
| Column | Type | Notes |
|--------|------|-------|
| goal_id | `uuid` FK | |
| user_id | `uuid` FK | |
| vote | `text` NULL | set after they vote |
| voted_at | `timestamptz` NULL | |
PK (`goal_id`, `user_id`)

### `notifications`
| Column | Type | Notes |
|--------|------|-------|
| id | `uuid` PK | |
| user_id | `uuid` FK | recipient |
| type | `text` | `circle.invited`, `goal.created`, `goal.staked`, `goal.resolution_needed`, `goal.resolved`, `reward.claimable`, `referral.verified` |
| actor_id | `uuid` FK users NULL | |
| entity_type | `text` NULL | `circle` \| `goal` |
| entity_id | `uuid` NULL | |
| title | `text` | |
| description | `text` | |
| unread | `boolean` | default true |
| created_at | `timestamptz` | |

### `referrals`
| Column | Type | Notes |
|--------|------|-------|
| id | `uuid` PK | |
| referrer_id | `uuid` FK users | |
| referred_id | `uuid` FK users | |
| status | `text` | `pending` \| `verified` \| `rewarded` |
| verified_at | `timestamptz` NULL | |
| reward_tx_hash | `text` NULL | |

### `indexer_state`
| Column | Type | Notes |
|--------|------|-------|
| contract | `text` PK | contract name |
| last_block | `bigint` | |
| updated_at | `timestamptz` | |

Indexes to add:
- `circles(owner_id)`, `circles(category, privacy)`
- `circle_members(user_id)`, `circle_members(circle_id)`
- `goals(circle_id, status)`, `goals(creator_id)`, `goals(deadline)`
- `goal_participants(user_id)`, `goal_participants(goal_id, side)`
- `notifications(user_id, unread, created_at DESC)`

---

## 4. Authentication

Use **Sign-In With Ethereum (EIP-4361)** because MiniPay provides a signer.

### Flow
1. Frontend requests nonce: `POST /auth/nonce { walletAddress }` → `{ nonce }`.
2. Frontend asks MiniPay to sign a SIWE message with that nonce.
3. Frontend sends signature: `POST /auth/verify { message, signature }`.
4. Backend verifies using `viem.verifyMessage`, creates session, returns:
   - `access_token` (JWT, 1h)
   - `refresh_token` (httpOnly cookie, 30d)
5. Subsequent requests include `Authorization: Bearer <access_token>`.

### Nonce store
Use Redis with TTL (5 min), keyed by wallet address.

### Session claims
```json
{ "sub": "<user_uuid>", "wallet": "0x...", "iat": ..., "exp": ... }
```

---

## 5. REST API

Base URL: `/api/v1`. All authed endpoints require `Authorization: Bearer`.

### 5.1 Auth
- `POST /auth/nonce` → `{ nonce }`
- `POST /auth/verify` → `{ accessToken, user }`
- `POST /auth/refresh` → `{ accessToken }`
- `POST /auth/logout`

### 5.2 Users
- `GET /users/me` → `User`
- `PATCH /users/me` — update name, username, avatar
  - body: `{ name?, username?, avatarEmoji?, avatarColor? }`
- `GET /users/search?q=...` → `User[]` (for invite autocomplete, requires auth)
- `GET /users/:walletAddress` → `User`

### 5.3 Circles
- `GET /circles` — lists circles the authed user is a member of. Query: `?status=active&cursor=...`
- `GET /circles/public` — discover. Query: `?category=&search=&cursor=`
- `GET /circles/:id` → `Circle` with members preview + stats
- `POST /circles` — after on-chain tx confirmed
  - body: `{ chainId, name, description, category, privacy, avatarEmoji, avatarColor }`
  - returns `{ id, inviteCode? }`
- `POST /circles/:id/join` — body: `{}` (by public) or `{ inviteCode }` (private)
- `DELETE /circles/:id/leave`
- `POST /circles/:id/invite` — body: `{ userIds: [] }` — creates notifications
- `GET /circles/:id/members` → paginated list
- `GET /circles/:id/goals` → goals for a circle

### 5.4 Goals
- `POST /goals` — pre-create metadata before on-chain tx
  - body: `{ circleId, title, description, avatarEmoji, avatarColor, outcomeType, deadline, minStake, resolverIds, sides }`
  - returns `{ id, metadataUri }` (metadataUri is server-hosted JSON for on-chain reference)
- `POST /goals/:id/confirm` — called after on-chain tx
  - body: `{ chainId, txHash }`
- `GET /goals/:id` → `Goal` (metadata + participants summary)
- `GET /goals/:id/participants` → paginated
- `GET /goals/feed` — aggregated feed for home screen
- `GET /goals/mine` — goals the authed user created or participates in

### 5.5 Notifications
- `GET /notifications?cursor=&unreadOnly=` → `Notification[]`
- `POST /notifications/mark-read` — body: `{ ids: [] }` or `{ all: true }`
- WebSocket `/ws/notifications` — push new notifications live

### 5.6 Referrals
- `GET /referrals/me` — stats + recent activity
- `POST /referrals/track` — body: `{ referralCode }` called on first session when link is used

### 5.7 System
- `GET /health` → `{ status, chain, db, indexer }`
- `GET /config` → public config (`minStake`, `categories`, `contractAddresses`, `celoChainId`)

---

## 6. Indexer

Run as a separate worker process. Responsibilities:
- Poll (or subscribe to) Celo for contract events starting from `indexer_state.last_block`.
- Parse events → upsert DB rows → emit pub/sub messages.
- Must be idempotent: replays should not create duplicate rows.

### Events to handle (see `smart-contract.md` for signatures)
- `CircleCreated(uint256 id, address owner, bool isPrivate)`
  - Upsert `circles.chain_id`, enforce `owner_id` from wallet mapping.
- `CircleJoined(uint256 id, address member)`
  - Insert `circle_members`.
- `GoalCreated(uint256 id, uint256 circleId, address creator, uint8 outcomeType, uint64 deadline, uint256 minStake, string metadataUri, address[] resolvers)`
  - Create `goals` row (status `open`), populate `goal_resolvers`.
- `Staked(uint256 goalId, address user, uint8 side, uint256 amount)`
  - Upsert `goal_participants` (additive).
  - Create notification for goal creator.
- `VoteSubmitted(uint256 goalId, address resolver, uint8 choice)`
  - Update `goal_resolvers.vote`.
- `GoalResolved(uint256 goalId, uint8 winningSide)`
  - Update `goals.status = 'resolved'`, set `winning_side`.
  - Emit notifications to all participants.
- `Claimed(uint256 goalId, address user, uint256 amount)`
  - Update `goal_participants.claimed = true`, `claimed_amount`.

### Retry strategy
- Exponential backoff on RPC failures.
- Dead-letter queue for events that repeatedly fail to process.

---

## 7. Notifications Pipeline

1. Indexer emits `notification.created` to Redis pub/sub.
2. WebSocket gateway listens and pushes to connected users.
3. If user is offline, the notification stays in DB until marked read.
4. Optional: push notifications via FCM (mobile) or browser Web Push (v2).

---

## 8. Background Jobs (BullMQ / Redis)

- `lockExpiredGoals` — cron every minute. Marks goals with `deadline < now()` as `locked` and creates `goal.resolution_needed` notifications for resolvers.
- `detectResolutionDeadlock` — detect goals stuck in `resolving` beyond grace period → mark `disputed`.
- `processReferrals` — verifies new user's first stake → updates referral status.
- `retryFailedIndexerEvents` — drains DLQ.

---

## 9. Security

- **Never hold private keys.** Backend only verifies signatures.
- Rate-limit auth endpoints (Redis token bucket).
- Validate all input with Zod / Joi / Pydantic equivalent.
- Enforce per-user ownership on every mutation (e.g. only circle owner can add admins).
- CORS: allow only the MiniApp origin.
- Don't expose raw stack traces; return sanitized errors.
- Log SIWE message + signature hash for audit.
- Store wallet addresses lowercased.

---

## 10. Environment Variables

```
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
CELO_RPC_URL=https://forno.celo.org
CELO_CHAIN_ID=42220
CONTRACT_CIRCLE_FACTORY=0x...
CONTRACT_PREDICTION_POOL=0x...
CONTRACT_USDT=0x...
JWT_SECRET=...
SESSION_REFRESH_SECRET=...
FRONTEND_ORIGIN=https://circlo.app
INDEXER_START_BLOCK=...
NODE_ENV=production
```

---

## 11. Testing Checklist

- [ ] SIWE flow happy path + wrong signature
- [ ] Circle create → membership row created
- [ ] Private circle join with valid and invalid invite code
- [ ] Goal create → metadata stored → confirm tx → status `open`
- [ ] Indexer replays from block N without duplicates
- [ ] Resolution path: stake from 2 users, vote quorum, resolve, claim
- [ ] Notifications received via WebSocket
- [ ] Referral verification triggered after first stake
- [ ] Rate limit on `/auth/nonce`
- [ ] Forbidden on mutation of another user's circle

---

## 12. Deliverables for Backend Dev

- [ ] Dockerfile + docker-compose for local dev (postgres, redis, api, indexer).
- [ ] Migration system (Prisma Migrate / Goose / Atlas).
- [ ] Seed script with mock users matching `frontend/src/lib/mockUsers.ts`.
- [ ] OpenAPI / Swagger spec generated from source.
- [ ] Indexer readme with block-tracking explanation.
- [ ] Runbook for redeploying when contracts upgrade.
