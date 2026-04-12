# Circlo Backend

Off-chain API server for the Circlo MiniApp — handles user data, notifications, and metadata. All on-chain actions (create circle, stake, claim) are signed and submitted by the frontend via MiniPay; the backend only reads the chain through its indexer.

---

## Base URLs

| Environment | URL |
|---|---|
| Local dev | `http://localhost:3001` |
| API prefix | `/api/v1` |
| WebSocket | `ws://localhost:3001/ws/notifications` |

---

## Quick Start (local)

```bash
cd backend
npm install
cp .env.example .env        # set JWT_SECRET at minimum
docker-compose up -d        # start PostgreSQL + Redis
npx prisma migrate dev
npm run dev                 # API on :3001
```

Verify:
```bash
curl http://localhost:3001/health
curl http://localhost:3001/api/v1/config
```

---

## Authentication

Circlo uses **Sign-In with Ethereum (SIWE)**. The flow:

```
1. POST /auth/nonce   → get a one-time nonce
2. Build SIWE message on frontend, sign with MiniPay wallet
3. POST /auth/verify  → send signed message → receive JWT
4. Attach JWT to every protected request
```

### Sending the token

```
Authorization: Bearer <accessToken>
```

### Token lifetimes

| Token | Lifetime | Storage |
|---|---|---|
| `accessToken` | 1 hour | Memory / localStorage |
| `refreshToken` | 30 days | httpOnly cookie (auto-sent) |

When `accessToken` expires, call `POST /auth/refresh` — the cookie is sent automatically.

---

## Error Format

All error responses follow this shape:

```json
{
  "error": "NotFound",
  "message": "Circle not found",
  "statusCode": 404
}
```

Common `error` values: `ValidationError`, `Unauthorized`, `Forbidden`, `NotFound`, `Conflict`, `BadRequest`, `TooManyRequests`.

---

## Pagination

All list endpoints use **cursor-based pagination**.

Query param: `?cursor=<id>` (from `nextCursor` of the previous response)

Response envelope:
```json
{
  "items": [...],
  "nextCursor": "uuid-or-null",
  "hasMore": true
}
```

Page size is 20 items (30 for notifications). When `hasMore` is `false`, you've reached the end.

---

## Public Endpoints (no auth required)

| Method | Path | Notes |
|---|---|---|
| GET | `/health` | Server health check |
| GET | `/api/v1/config` | Contract addresses, chain IDs, categories |
| POST | `/api/v1/auth/nonce` | Step 1 of login |
| POST | `/api/v1/auth/verify` | Step 2 of login — returns JWT |
| POST | `/api/v1/auth/refresh` | Refresh access token via cookie |
| POST | `/api/v1/auth/logout` | Clear refresh cookie |
| GET | `/api/v1/circles/public` | Explore page |
| GET | `/api/v1/goals/feed` | Home screen feed |
| GET | `/api/v1/users/:walletAddress` | Public user profile |

---

## API Reference

### System

#### `GET /health`
```json
{
  "status": "ok",
  "checks": { "db": true, "redis": true, "chain": true },
  "indexer": { "lastBlock": "27000000" },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```
Returns 503 if DB or Redis is down.

#### `GET /api/v1/config`
```json
{
  "minStake": "1.000000",
  "categories": ["general", "crypto", "fitness", "gaming", "music", "other"],
  "contractAddresses": {
    "circleFactory": "0x...",
    "predictionPool": "0x...",
    "resolutionModule": "0x...",
    "usdt": "0x..."
  },
  "celoChainId": 42220,
  "celoChainIdTestnet": 11142220
}
```
Fetch this once on app start to get contract addresses.

---

### Auth

#### `POST /api/v1/auth/nonce`
Request:
```json
{ "walletAddress": "0xabc...123" }
```
Response:
```json
{ "nonce": "a1b2c3d4e5f6..." }
```

#### `POST /api/v1/auth/verify`
Build a SIWE message string on the frontend (use the `siwe` package), sign it with MiniPay, then send:

Request:
```json
{
  "message": "circlo.app wants you to sign in...",
  "signature": "0x..."
}
```
Response `200`:
```json
{
  "accessToken": "eyJ...",
  "user": {
    "id": "uuid",
    "walletAddress": "0x...",
    "name": null,
    "username": null,
    "avatarEmoji": null,
    "avatarColor": null,
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```
Also sets `refreshToken` httpOnly cookie.

#### `POST /api/v1/auth/refresh`
No body needed — reads cookie automatically.

Response `200`:
```json
{ "accessToken": "eyJ..." }
```

#### `POST /api/v1/auth/logout`
No body. Clears the cookie.

Response: `{ "success": true }`

---

### Users

#### `GET /api/v1/users/me` `[AUTH]`
Response: User object (same shape as verify response `user` field).

#### `PATCH /api/v1/users/me` `[AUTH]`
All fields optional:
```json
{
  "name": "Alice",
  "username": "alice_celo",
  "avatarEmoji": "🦁",
  "avatarColor": "#ff6b6b"
}
```
Rules: `username` 3–20 chars, alphanumeric + underscore only. `avatarColor` must be valid hex `#rrggbb`.

Response: Updated user object.

#### `GET /api/v1/users/search?q=alice` `[AUTH]`
Searches by name, username, or wallet address. Minimum 2 characters. Returns up to 20 results.

Response: `User[]`

#### `GET /api/v1/users/:walletAddress` `[PUBLIC]`
`:walletAddress` must be a valid `0x...` address (42 chars).

Response: User object, or `404` if not found.

---

### Circles

**Circle object:**
```json
{
  "id": "uuid",
  "chainId": "123",
  "ownerId": "uuid",
  "name": "Celo Degens",
  "description": "...",
  "category": "crypto",
  "privacy": "public",
  "inviteCode": null,
  "avatarEmoji": "🔵",
  "avatarColor": "#3a86ff",
  "memberCount": 12,
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```
`chainId` is `null` until the on-chain tx is confirmed by the indexer. `inviteCode` is only present on private circles (and only visible to members).

#### `GET /api/v1/circles` `[AUTH]`
My circles (where I am a member). Supports `?cursor=`.

#### `GET /api/v1/circles/public` `[PUBLIC]`
Discover public circles. Supports filters:
- `?category=crypto` — one of the categories from `/config`
- `?search=degens` — partial name match
- `?cursor=`

#### `GET /api/v1/circles/:id` `[AUTH]`
Returns circle detail + `membersPreview` (first 5 members) + `memberCount`.

Returns `403` if circle is private and you are not a member.

#### `POST /api/v1/circles` `[AUTH]`
```json
{
  "name": "Celo Degens",
  "description": "Optional description",
  "category": "crypto",
  "privacy": "public",
  "avatarEmoji": "🔵",
  "avatarColor": "#3a86ff"
}
```
Rules: `name` 3–40 chars. `category` must be one of the enum values. `privacy` is `"public"` or `"private"`.

Response `201`: Circle object. For private circles, `inviteCode` is included.

> After creation, call `createCircle` on the CircleFactory contract. The indexer will update `chainId` automatically.

#### `POST /api/v1/circles/:id/join` `[AUTH]`
```json
{ "inviteCode": "abc123" }
```
`inviteCode` is only required for private circles. For public circles, send empty body `{}`.

Response: `{ "success": true }` or `{ "success": true, "alreadyMember": true }`

#### `DELETE /api/v1/circles/:id/leave` `[AUTH]`
No body. The owner cannot leave — transfer ownership first.

Response: `{ "success": true }`

#### `POST /api/v1/circles/:id/invite` `[AUTH]`
Send in-app invitations to other users. You must be a member.

```json
{ "userIds": ["uuid1", "uuid2"] }
```
Max 50 users at once. Sends a `circle.invited` notification to each.

Response: `{ "success": true }`

#### `GET /api/v1/circles/:id/members` `[AUTH]`
Paginated member list. Supports `?cursor=` (cursor is a `userId`).

Response items:
```json
{
  "userId": "uuid",
  "role": "member",
  "joinedAt": "2024-01-01T00:00:00.000Z",
  "user": { "id": "...", "walletAddress": "0x...", "name": "...", "username": "...", "avatarEmoji": "...", "avatarColor": "..." }
}
```
`role` is either `"owner"` or `"member"`.

#### `GET /api/v1/circles/:id/goals` `[AUTH]`
Goals inside a circle. Supports `?cursor=` and `?status=open|locked|resolving|resolved|disputed`.

---

### Goals

**Goal status lifecycle:**
```
open → locked → resolving → resolved
                          ↘ disputed
```

**Goal object:**
```json
{
  "id": "uuid",
  "chainId": "456",
  "circleId": "uuid",
  "creatorId": "uuid",
  "title": "BTC hits 100k by EOY",
  "description": "...",
  "avatarEmoji": "🎯",
  "avatarColor": "#ff6b6b",
  "outcomeType": "binary",
  "deadline": "2024-12-31T00:00:00.000Z",
  "minStake": "1.000000",
  "status": "open",
  "winningSide": null,
  "metadataUri": "https://...",
  "txHash": "0x...",
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```
`chainId` and `txHash` are `null` until confirmed. `minStake` is a decimal string with 6 decimal places (USDT).

#### Goal creation flow

```
1. POST /goals           → get { id, metadataUri }
2. Call createGoal() on PredictionPool contract (pass metadataUri)
3. POST /goals/:id/confirm  → link the on-chain tx
```

Step 3 is important — it links the tx hash and triggers notifications to circle members.

#### `POST /api/v1/goals` `[AUTH]`
You must be a member of the target circle.

```json
{
  "circleId": "uuid",
  "title": "BTC hits 100k by EOY",
  "description": "Optional",
  "avatarEmoji": "🎯",
  "avatarColor": "#ff6b6b",
  "outcomeType": "binary",
  "deadline": "2024-12-31T00:00:00.000Z",
  "minStake": "1.000000",
  "resolverIds": ["uuid1", "uuid2"],
  "sides": ["yes", "no"]
}
```
`outcomeType`: `"binary"` | `"multi"` | `"numeric"`. `deadline` must be an ISO 8601 datetime in the future. `resolverIds` is 1–10 user IDs (must be circle members). `minStake` is a decimal string (e.g. `"1.000000"` = 1 USDT).

Response `201`:
```json
{
  "id": "uuid",
  "metadataUri": "https://api.circlo.app/api/v1/goals/uuid/metadata"
}
```
Pass `metadataUri` to the contract's `createGoal` call.

#### `POST /api/v1/goals/:id/confirm` `[AUTH]`
Only the goal creator can call this. Call after the on-chain tx is mined.

```json
{
  "chainId": 456,
  "txHash": "0xabc...123"
}
```
Response: Full goal object.

#### `GET /api/v1/goals/feed` `[PUBLIC]`
Active goals from all public circles. Supports `?cursor=`.

Returns goals with `status` in `["open", "locked", "resolving"]`.

Response items include `participantCount`.

#### `GET /api/v1/goals/mine` `[AUTH]`
Goals I created or participated in. Supports `?cursor=`.

#### `GET /api/v1/goals/:id` `[AUTH]`
Full goal detail including:
- `participationSummary` — staked amounts per side
- `resolvers` — who is resolving and their votes

```json
{
  "...goal fields...",
  "participantCount": 5,
  "participationSummary": [
    { "side": "yes", "totalStaked": "10.500000", "count": 3 },
    { "side": "no", "totalStaked": "5.000000", "count": 2 }
  ],
  "resolvers": [
    {
      "userId": "uuid",
      "vote": null,
      "votedAt": null,
      "user": { "id": "...", "walletAddress": "0x...", "name": "...", "username": "...", "avatarEmoji": "...", "avatarColor": "..." }
    }
  ]
}
```

#### `GET /api/v1/goals/:id/participants` `[AUTH]`
Paginated list of stakers. Supports `?cursor=` (cursor is a `userId`).

Response items:
```json
{
  "userId": "uuid",
  "side": "yes",
  "staked": "2.500000",
  "claimed": false,
  "claimedAmount": null,
  "createdAt": "...",
  "user": { ... }
}
```

---

### Notifications

#### `GET /api/v1/notifications` `[AUTH]`
Supports `?cursor=` and `?unreadOnly=true`.

Response:
```json
{
  "items": [
    {
      "id": "uuid",
      "type": "goal.created",
      "actorId": "uuid",
      "entityType": "goal",
      "entityId": "uuid",
      "title": "New Goal Created",
      "description": "...",
      "unread": true,
      "createdAt": "...",
      "actor": { "id": "...", "walletAddress": "0x...", "name": "...", "username": "...", "avatarEmoji": "...", "avatarColor": "..." }
    }
  ],
  "nextCursor": "uuid",
  "hasMore": false,
  "unreadCount": 3
}
```

**Notification types:**

| `type` | Trigger | `entityType` |
|---|---|---|
| `circle.active` | Your circle was confirmed on-chain | `circle` |
| `circle.joined` | Someone joined your circle | `circle` |
| `circle.invited` | You were invited to a circle | `circle` |
| `goal.created` | A new goal was created in your circle | `goal` |
| `goal.staked` | Someone staked on your goal | `goal` |
| `goal.resolution_needed` | A goal you resolve has locked — cast your vote | `goal` |
| `goal.resolved` | A goal resolved (you lost) | `goal` |
| `goal.disputed` | A goal was disputed, refund available | `goal` |
| `reward.claimable` | A goal resolved in your favor — claim your reward | `goal` |

#### `POST /api/v1/notifications/mark-read` `[AUTH]`
Mark specific notifications or all at once:

```json
{ "ids": ["uuid1", "uuid2"] }
```
or
```json
{ "all": true }
```

Response: `{ "success": true }`

---

### Referrals

**Referral code = the referrer's wallet address.**

#### `GET /api/v1/referrals/me` `[AUTH]`
```json
{
  "referralCode": "0xabc...123",
  "stats": { "pending": 1, "verified": 3, "rewarded": 2 },
  "recent": [
    {
      "id": "uuid",
      "status": "verified",
      "verifiedAt": "...",
      "rewardTxHash": null,
      "referred": { "id": "...", "walletAddress": "0x...", "name": "...", "username": "...", "avatarEmoji": "...", "avatarColor": "..." }
    }
  ]
}
```

#### `POST /api/v1/referrals/track` `[AUTH]`
Call this once after a new user signs in, if they came via a referral link.

```json
{ "referralCode": "0xabc...123" }
```
`referralCode` is the referrer's wallet address. A user can only be referred once. Cannot refer yourself.

Response: `{ "success": true }`

---

## WebSocket — Real-time Notifications

Connect with the JWT access token as a query param:

```
ws://localhost:3001/ws/notifications?token=<accessToken>
```

### Messages from server

**On connect:**
```json
{ "type": "connected", "message": "Connected to Circlo notifications", "userId": "uuid" }
```

**Notification push** (same shape as the REST notification object):
```json
{
  "id": "uuid",
  "userId": "uuid",
  "type": "goal.staked",
  "actorId": "uuid",
  "entityType": "goal",
  "entityId": "uuid",
  "title": "New Stake",
  "description": "Someone staked 2.50 USDT on your goal",
  "unread": true,
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

### Messages from client

**Ping (optional keepalive):**
```json
{ "type": "ping" }
```
Server responds with `{ "type": "pong" }`. The server also sends WebSocket-level pings every 30 seconds automatically.

### Reconnection

The connection will drop after 20 minutes (Forno WS limit). Reconnect using the same URL with a fresh `accessToken` (call `/auth/refresh` first if needed).

---

## USDT Amounts

All monetary amounts in this app are **USDT with 6 decimal places**.

| Context | Format | Example |
|---|---|---|
| API requests/responses | Decimal string | `"1.500000"` |
| On-chain (contract calls) | `uint256`, 6 decimals | `1500000` = 1.5 USDT |
| Minimum stake | `"1.000000"` | 1 USDT |

Convert: `onChainAmount / 1_000_000 = displayAmount`

---

## Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `DATABASE_URL` | Yes | — | PostgreSQL connection string |
| `REDIS_URL` | No | `redis://localhost:6379` | Redis URL |
| `JWT_SECRET` | No* | `changeme_secret_jwt` | JWT signing secret |
| `PORT` | No | `3001` | HTTP port |
| `FRONTEND_ORIGIN` | No | `http://localhost:3000` | Used for CORS + metadata URIs |
| `CELO_RPC_URL` | No | Forno mainnet | HTTP RPC |
| `CELO_WS_URL` | No | Forno mainnet WS | WebSocket RPC for indexer |
| `CONTRACT_CIRCLE_FACTORY` | No | placeholder | CircleFactory address |
| `CONTRACT_PREDICTION_POOL` | No | placeholder | PredictionPool address |
| `CONTRACT_RESOLUTION_MODULE` | No | placeholder | ResolutionModule address |
| `CONTRACT_USDT` | No | Celo USDT | USDT token address |
| `INDEXER_START_BLOCK` | No | `0` | Block to start indexing from |

*Change `JWT_SECRET` in production — the default is insecure.

---

## Scripts

| Script | Description |
|---|---|
| `npm run dev` | API server with hot reload (port 3001) |
| `npm run dev:indexer` | Blockchain event indexer |
| `npm run dev:jobs` | BullMQ workers |
| `npm run build` | TypeScript type-check |
| `npm run db:migrate` | Run Prisma migrations |
| `npm run db:generate` | Regenerate Prisma client |
| `npm run db:studio` | Prisma Studio (DB GUI) |

---

## Architecture Notes

- Backend is **read-only on-chain** — never holds private keys, never submits transactions
- All money lives in smart contracts; this backend is metadata + notifications
- Indexer listens to `CircleFactory` and `PredictionPool` events via WebSocket, updates DB, and pushes real-time notifications via Redis pub/sub
- Chain: **Celo Mainnet** (chainId 42220). Testnet is Celo Sepolia (11142220)
