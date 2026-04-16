# Circlo API Documentation

> **Slogan:** Predict Your Circle Goals!

Off-chain REST API for the Circlo MiniApp on Celo Blockchain.
All money lives in smart contracts — the backend only stores metadata, handles auth, and sends notifications.

---

## Base URL

| Environment | URL |
|---|---|
| Local dev | `http://localhost:3001` |
| API prefix | `/api/v1` |
| WebSocket | `ws://localhost:3001/ws/notifications?token=<jwt>` |

---

## Authentication

Circlo uses **Sign-In With Ethereum (SIWE / EIP-4361)**. Users sign with their MiniPay wallet — no passwords.

### SIWE Login Flow

```
1. POST /api/v1/auth/nonce   → get one-time nonce
2. Build SIWE message on frontend, sign with MiniPay wallet
3. POST /api/v1/auth/verify  → verify signature → receive JWT
4. Attach JWT to every protected request
```

### Sending the Token

```
Authorization: Bearer <accessToken>
```

### Token Lifetimes

| Token | Lifetime | Storage |
|---|---|---|
| `accessToken` | 1 hour | Memory / `Authorization` header |
| `refreshToken` | 30 days | `httpOnly` cookie (auto-sent by browser) |

When `accessToken` expires, call `POST /auth/refresh` — the cookie is sent automatically.

---

## Common Response Formats

### Error Response (all errors)

```json
{
  "error": "NotFound",
  "message": "Circle not found",
  "statusCode": 404
}
```

Common `error` values: `ValidationError`, `Unauthorized`, `Forbidden`, `NotFound`, `Conflict`, `BadRequest`, `TooManyRequests`, `InternalServerError`.

### Pagination Envelope (all list endpoints)

```json
{
  "items": [],
  "nextCursor": "550e8400-e29b-41d4-a716-446655440000",
  "hasMore": true
}
```

Pass `?cursor=<nextCursor>` to get the next page. When `hasMore` is `false`, you've reached the end.
Default page size: **20 items** (30 for notifications).

---

## SYSTEM

### GET /health

**Auth required:** No  
**Description:** Server health check. Returns 503 if DB or Redis is unhealthy.

**Response 200:**
```json
{
  "status": "ok",
  "checks": {
    "db": true,
    "redis": true,
    "chain": true
  },
  "indexer": {
    "lastBlock": "27841200"
  },
  "timestamp": "2024-06-01T12:00:00.000Z"
}
```

**Response 503 (degraded):**
```json
{
  "status": "degraded",
  "checks": {
    "db": false,
    "redis": true,
    "chain": true
  },
  "indexer": {
    "lastBlock": null
  },
  "timestamp": "2024-06-01T12:00:00.000Z"
}
```

---

### GET /api/v1/config

**Auth required:** No  
**Description:** Returns global app configuration — contract addresses, supported categories, and chain IDs. Fetch once on app startup and cache locally.

**Response 200:**
```json
{
  "minStake": "1.000000",
  "categories": ["general", "crypto", "fitness", "gaming", "music", "other"],
  "contractAddresses": {
    "circleFactory": "0xabc...001",
    "predictionPool": "0xabc...002",
    "resolutionModule": "0xabc...003",
    "usdt": "0x48065fbbe25f71c9282ddf5e1cd6d6a887483d5e"
  },
  "celoChainId": 42220,
  "celoChainIdTestnet": 11142220
}
```

---

## AUTH

### POST /api/v1/auth/nonce

**Auth required:** No  
**Description:** Step 1 of SIWE login. Generates a one-time nonce tied to the wallet address. TTL = 5 minutes.
Rate limited to **10 requests per IP per minute**.

**Request Body:**
```json
{
  "walletAddress": "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045"
}
```

**Response 200:**
```json
{
  "nonce": "a3f7c2e8b1d049f6"
}
```

**Response 400 – invalid address:**
```json
{
  "error": "ValidationError",
  "message": "Invalid Ethereum address",
  "statusCode": 400
}
```

**Response 429 – rate limited:**
```json
{
  "error": "TooManyRequests",
  "message": "Too many nonce requests. Try again in a minute.",
  "statusCode": 429
}
```

---

### POST /api/v1/auth/verify

**Auth required:** No  
**Description:** Step 2 of SIWE login. Verifies the wallet signature using viem `verifyMessage`. On success, creates (or updates) the user record and returns a JWT access token. Also sets the `refreshToken` httpOnly cookie.

**Request Body:**
```json
{
  "message": "circlo.app wants you to sign in with your Ethereum account:\n0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045\n\nSign In With Ethereum to Circlo.\n\nURI: https://circlo.app\nVersion: 1\nChain ID: 42220\nNonce: a3f7c2e8b1d049f6\nIssued At: 2024-06-01T12:00:00.000Z",
  "signature": "0x4a5f6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b1b"
}
```

**Response 200:**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI1NTBlODQwMC1lMjliLTQxZDQtYTcxNi00NDY2NTU0NDAwMDAiLCJ3YWxsZXQiOiIweGQ4ZGE2YmYyNjk2NGFmOWQ3ZWVkOWUwM2U1MzQxNWQzN2FhOTYwNDUiLCJpYXQiOjE3MTcyNDI0MDAsImV4cCI6MTcxNzI0NjAwMH0.signature",
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "walletAddress": "0xd8da6bf26964af9d7eed9e03e53415d37aa96045",
    "name": null,
    "username": null,
    "avatarEmoji": null,
    "avatarColor": null,
    "createdAt": "2024-06-01T12:00:00.000Z"
  }
}
```
> Also sets `Set-Cookie: refreshToken=<token>; HttpOnly; SameSite=Lax; Path=/api/v1/auth; Max-Age=2592000`

**Response 400 – bad SIWE message:**
```json
{
  "error": "InvalidMessage",
  "message": "Could not parse SIWE message",
  "statusCode": 400
}
```

**Response 401 – nonce expired or already used:**
```json
{
  "error": "InvalidNonce",
  "message": "Nonce is invalid or expired",
  "statusCode": 401
}
```

**Response 401 – wrong chain:**
```json
{
  "error": "InvalidChain",
  "message": "Unsupported chain ID",
  "statusCode": 401
}
```

**Response 401 – signature mismatch:**
```json
{
  "error": "InvalidSignature",
  "message": "Signature verification failed",
  "statusCode": 401
}
```

---

### POST /api/v1/auth/refresh

**Auth required:** No (reads `refreshToken` httpOnly cookie automatically)  
**Description:** Issues a new access token using the refresh token cookie. No request body needed.

**Request Body:** *(empty)*

**Response 200:**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response 401 – no cookie:**
```json
{
  "error": "Unauthorized",
  "message": "No refresh token",
  "statusCode": 401
}
```

**Response 401 – expired or invalid:**
```json
{
  "error": "Unauthorized",
  "message": "Invalid or expired refresh token",
  "statusCode": 401
}
```

---

### POST /api/v1/auth/logout

**Auth required:** No  
**Description:** Clears the `refreshToken` httpOnly cookie.

**Request Body:** *(empty)*

**Response 200:**
```json
{
  "success": true
}
```

---

## USERS

### GET /api/v1/users/me

**Auth required:** Yes  
**Description:** Returns the authenticated user's own profile.

**Response 200:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "walletAddress": "0xd8da6bf26964af9d7eed9e03e53415d37aa96045",
  "name": "Alice",
  "username": "alice_celo",
  "avatarEmoji": "🦁",
  "avatarColor": "#ff6b6b",
  "createdAt": "2024-06-01T12:00:00.000Z"
}
```

**Response 401 – missing token:**
```json
{
  "error": "Unauthorized",
  "message": "Missing or invalid access token",
  "statusCode": 401
}
```

**Response 404 – user deleted:**
```json
{
  "error": "NotFound",
  "message": "User not found",
  "statusCode": 404
}
```

---

### PATCH /api/v1/users/me

**Auth required:** Yes  
**Description:** Updates the authenticated user's profile. All fields are optional.

**Request Body:**
```json
{
  "name": "Alice Wonder",
  "username": "alice_celo",
  "avatarEmoji": "🦁",
  "avatarColor": "#ff6b6b"
}
```

| Field | Type | Rules |
|---|---|---|
| `name` | string | 1–80 characters |
| `username` | string | 3–20 chars, `[a-zA-Z0-9_]` only |
| `avatarEmoji` | string | Max 10 characters |
| `avatarColor` | string | Hex color `#rrggbb` |

**Response 200 (updated user):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "walletAddress": "0xd8da6bf26964af9d7eed9e03e53415d37aa96045",
  "name": "Alice Wonder",
  "username": "alice_celo",
  "avatarEmoji": "🦁",
  "avatarColor": "#ff6b6b",
  "createdAt": "2024-06-01T12:00:00.000Z"
}
```

**Response 400 – validation error:**
```json
{
  "error": "ValidationError",
  "message": "Username must be alphanumeric + underscore only",
  "statusCode": 400
}
```

**Response 401:**
```json
{
  "error": "Unauthorized",
  "message": "Missing or invalid access token",
  "statusCode": 401
}
```

**Response 409 – username taken:**
```json
{
  "error": "Conflict",
  "message": "Username already taken",
  "statusCode": 409
}
```

---

### GET /api/v1/users/search?q=

**Auth required:** Yes  
**Description:** Searches users by name, username, or wallet address. Minimum 2 characters. Returns up to 20 results. Used for circle invite autocomplete.

**Query Parameters:**
| Param | Type | Required | Description |
|---|---|---|---|
| `q` | string | Yes | Search term (min 2 chars) |

**Example:** `GET /api/v1/users/search?q=alice`

**Response 200:**
```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "walletAddress": "0xd8da6bf26964af9d7eed9e03e53415d37aa96045",
    "name": "Alice Wonder",
    "username": "alice_celo",
    "avatarEmoji": "🦁",
    "avatarColor": "#ff6b6b",
    "createdAt": "2024-06-01T12:00:00.000Z"
  }
]
```
> Returns empty array `[]` when `q` is less than 2 characters.

**Response 401:**
```json
{
  "error": "Unauthorized",
  "message": "Missing or invalid access token",
  "statusCode": 401
}
```

---

### GET /api/v1/users/:walletAddress

**Auth required:** Yes  
**Description:** Returns a public profile by wallet address. `:walletAddress` must be a full `0x...` Ethereum address (42 chars).

**Example:** `GET /api/v1/users/0xd8da6bf26964af9d7eed9e03e53415d37aa96045`

**Response 200:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "walletAddress": "0xd8da6bf26964af9d7eed9e03e53415d37aa96045",
  "name": "Alice Wonder",
  "username": "alice_celo",
  "avatarEmoji": "🦁",
  "avatarColor": "#ff6b6b",
  "createdAt": "2024-06-01T12:00:00.000Z"
}
```

**Response 400 – invalid address format:**
```json
{
  "error": "ValidationError",
  "message": "Invalid wallet address",
  "statusCode": 400
}
```

**Response 401:**
```json
{
  "error": "Unauthorized",
  "message": "Missing or invalid access token",
  "statusCode": 401
}
```

**Response 404:**
```json
{
  "error": "NotFound",
  "message": "User not found",
  "statusCode": 404
}
```

---

## CIRCLES

### Circle Object

```json
{
  "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "chainId": "42",
  "ownerId": "550e8400-e29b-41d4-a716-446655440000",
  "name": "Celo Degens",
  "description": "We predict crypto stuff",
  "category": "crypto",
  "privacy": "public",
  "inviteCode": null,
  "avatarEmoji": "🔵",
  "avatarColor": "#3a86ff",
  "memberCount": 12,
  "createdAt": "2024-06-01T12:00:00.000Z"
}
```

> `chainId` is `null` until the on-chain `CircleCreated` event is indexed.  
> `inviteCode` is only present for private circles and only visible to members.

---

### GET /api/v1/circles

**Auth required:** Yes  
**Description:** Returns all circles where the authenticated user is a member. Cursor-paginated, newest first.

**Query Parameters:**
| Param | Type | Required | Description |
|---|---|---|---|
| `cursor` | string (UUID) | No | Pagination cursor from previous response |

**Response 200:**
```json
{
  "items": [
    {
      "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "chainId": "42",
      "ownerId": "550e8400-e29b-41d4-a716-446655440000",
      "name": "Celo Degens",
      "description": "We predict crypto stuff",
      "category": "crypto",
      "privacy": "public",
      "inviteCode": null,
      "avatarEmoji": "🔵",
      "avatarColor": "#3a86ff",
      "memberCount": null,
      "createdAt": "2024-06-01T12:00:00.000Z"
    }
  ],
  "nextCursor": null,
  "hasMore": false
}
```

**Response 401:**
```json
{
  "error": "Unauthorized",
  "message": "Missing or invalid access token",
  "statusCode": 401
}
```

---

### POST /api/v1/circles

**Auth required:** Yes  
**Description:** Creates a new circle in the backend (off-chain metadata). After creation, the frontend must call `CircleFactory.createCircle()` on-chain — the indexer will update `chainId` automatically when the `CircleCreated` event fires.

**Request Body:**
```json
{
  "name": "Celo Degens",
  "description": "We predict crypto stuff",
  "category": "crypto",
  "privacy": "public",
  "avatarEmoji": "🔵",
  "avatarColor": "#3a86ff"
}
```

| Field | Type | Required | Rules |
|---|---|---|---|
| `name` | string | Yes | 3–40 characters |
| `description` | string | No | Max 500 characters |
| `category` | string | Yes | `general\|crypto\|fitness\|gaming\|music\|other` |
| `privacy` | string | Yes | `public\|private` |
| `avatarEmoji` | string | No | Max 10 chars |
| `avatarColor` | string | No | Hex `#rrggbb` |

**Response 201:**
```json
{
  "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "chainId": null,
  "ownerId": "550e8400-e29b-41d4-a716-446655440000",
  "name": "Celo Degens",
  "description": "We predict crypto stuff",
  "category": "crypto",
  "privacy": "public",
  "inviteCode": null,
  "avatarEmoji": "🔵",
  "avatarColor": "#3a86ff",
  "memberCount": null,
  "createdAt": "2024-06-01T12:00:00.000Z"
}
```
> For **private** circles, the response includes `"inviteCode": "xK9mPqR2"`.

**Response 400 – validation:**
```json
{
  "error": "ValidationError",
  "message": "name must be at least 3 characters",
  "statusCode": 400
}
```

**Response 401:**
```json
{
  "error": "Unauthorized",
  "message": "Missing or invalid access token",
  "statusCode": 401
}
```

---

### GET /api/v1/circles/public

**Auth required:** No (but recommended to send token for personalization)  
**Description:** Discover public circles. Supports optional category filter and name search. Cursor-paginated.

**Query Parameters:**
| Param | Type | Required | Description |
|---|---|---|---|
| `category` | string | No | Filter by `general\|crypto\|fitness\|gaming\|music\|other` |
| `search` | string | No | Partial name match (case-insensitive) |
| `cursor` | string (UUID) | No | Pagination cursor |

**Example:** `GET /api/v1/circles/public?category=crypto&search=degen`

**Response 200:**
```json
{
  "items": [
    {
      "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "chainId": "42",
      "ownerId": "550e8400-e29b-41d4-a716-446655440000",
      "name": "Celo Degens",
      "description": "We predict crypto stuff",
      "category": "crypto",
      "privacy": "public",
      "inviteCode": null,
      "avatarEmoji": "🔵",
      "avatarColor": "#3a86ff",
      "memberCount": 23,
      "createdAt": "2024-06-01T12:00:00.000Z"
    }
  ],
  "nextCursor": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
  "hasMore": true
}
```

---

### GET /api/v1/circles/:id

**Auth required:** Yes  
**Description:** Returns circle detail, first 5 members preview, and total member count. Private circles return `403` if the user is not a member.

**Response 200:**
```json
{
  "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "chainId": "42",
  "ownerId": "550e8400-e29b-41d4-a716-446655440000",
  "name": "Celo Degens",
  "description": "We predict crypto stuff",
  "category": "crypto",
  "privacy": "public",
  "inviteCode": null,
  "avatarEmoji": "🔵",
  "avatarColor": "#3a86ff",
  "memberCount": 23,
  "createdAt": "2024-06-01T12:00:00.000Z",
  "membersPreview": [
    {
      "userId": "550e8400-e29b-41d4-a716-446655440000",
      "role": "owner",
      "joinedAt": "2024-06-01T12:00:00.000Z",
      "user": {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "walletAddress": "0xd8da6bf26964af9d7eed9e03e53415d37aa96045",
        "name": "Alice Wonder",
        "username": "alice_celo",
        "avatarEmoji": "🦁",
        "avatarColor": "#ff6b6b"
      }
    }
  ]
}
```

**Response 401:**
```json
{
  "error": "Unauthorized",
  "message": "Missing or invalid access token",
  "statusCode": 401
}
```

**Response 403 – private circle, not a member:**
```json
{
  "error": "Forbidden",
  "message": "You are not a member of this circle",
  "statusCode": 403
}
```

**Response 404:**
```json
{
  "error": "NotFound",
  "message": "Circle not found",
  "statusCode": 404
}
```

---

### POST /api/v1/circles/:id/join

**Auth required:** Yes  
**Description:** Joins a circle. For private circles, an `inviteCode` is required. If the user is already a member, returns `success: true` with `alreadyMember: true`.

**Request Body (public circle):**
```json
{}
```

**Request Body (private circle):**
```json
{
  "inviteCode": "xK9mPqR2"
}
```

**Response 200:**
```json
{
  "success": true
}
```

**Response 200 (already a member):**
```json
{
  "success": true,
  "alreadyMember": true
}
```

**Response 401:**
```json
{
  "error": "Unauthorized",
  "message": "Missing or invalid access token",
  "statusCode": 401
}
```

**Response 403 – wrong invite code:**
```json
{
  "error": "Forbidden",
  "message": "Invalid invite code",
  "statusCode": 403
}
```

**Response 404 – circle not found:**
```json
{
  "error": "NotFound",
  "message": "Circle not found",
  "statusCode": 404
}
```

---

### POST /api/v1/circles/:id/invite

**Auth required:** Yes  
**Description:** Sends in-app notifications to invite other users to a circle. Caller must be a member of the circle. Accepts a list of **usernames** (max 50). Returns 400 if any username is not found.

**Request Body:**
```json
{
  "usernames": ["alice_celo", "bob_web3"]
}
```

**Response 200:**
```json
{
  "success": true
}
```

**Response 400 – validation:**
```json
{
  "error": "ValidationError",
  "message": "usernames must contain at least 1 element",
  "statusCode": 400
}
```

**Response 400 – username tidak ditemukan:**
```json
{
  "error": "NotFound",
  "message": "Users not found: alice_celo, unknown_user",
  "statusCode": 400
}
```

**Response 401:**
```json
{
  "error": "Unauthorized",
  "message": "Missing or invalid access token",
  "statusCode": 401
}
```

**Response 403 – not a member:**
```json
{
  "error": "Forbidden",
  "message": "You must be a member to invite others",
  "statusCode": 403
}
```

**Response 404 – circle not found:**
```json
{
  "error": "NotFound",
  "message": "Circle not found",
  "statusCode": 404
}
```

---

### DELETE /api/v1/circles/:id/leave

**Auth required:** Yes  
**Description:** Leaves a circle. The circle owner cannot leave — ownership must be transferred first.

**Request Body:** *(empty)*

**Response 200:**
```json
{
  "success": true
}
```

**Response 400 – owner trying to leave:**
```json
{
  "error": "BadRequest",
  "message": "Circle owner cannot leave. Transfer ownership first.",
  "statusCode": 400
}
```

**Response 401:**
```json
{
  "error": "Unauthorized",
  "message": "Missing or invalid access token",
  "statusCode": 401
}
```

**Response 404 – not a member:**
```json
{
  "error": "NotFound",
  "message": "You are not a member of this circle",
  "statusCode": 404
}
```

---

### GET /api/v1/circles/:id/members

**Auth required:** Yes  
**Description:** Returns paginated list of circle members with user profiles. Roles: `owner`, `admin`, `member`.

**Query Parameters:**
| Param | Type | Required | Description |
|---|---|---|---|
| `cursor` | string (UUID) | No | Pagination cursor (user_id of last item) |

**Response 200:**
```json
{
  "items": [
    {
      "userId": "550e8400-e29b-41d4-a716-446655440000",
      "role": "owner",
      "joinedAt": "2024-06-01T12:00:00.000Z",
      "user": {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "walletAddress": "0xd8da6bf26964af9d7eed9e03e53415d37aa96045",
        "name": "Alice Wonder",
        "username": "alice_celo",
        "avatarEmoji": "🦁",
        "avatarColor": "#ff6b6b"
      }
    },
    {
      "userId": "660f9511-f39c-52e5-b827-557766551111",
      "role": "member",
      "joinedAt": "2024-06-02T09:30:00.000Z",
      "user": {
        "id": "660f9511-f39c-52e5-b827-557766551111",
        "walletAddress": "0xab5801a7d398351b8be11c439e05c5b3259aec9b",
        "name": "Bob",
        "username": "bob_web3",
        "avatarEmoji": "🐻",
        "avatarColor": "#8338ec"
      }
    }
  ],
  "nextCursor": null,
  "hasMore": false
}
```

**Response 401:**
```json
{
  "error": "Unauthorized",
  "message": "Missing or invalid access token",
  "statusCode": 401
}
```

**Response 403 – private circle, not a member:**
```json
{
  "error": "Forbidden",
  "message": "Not allowed",
  "statusCode": 403
}
```

---

### GET /api/v1/circles/:id/goals

**Auth required:** Yes  
**Description:** Returns paginated list of goals inside a circle. Supports optional status filter. Private circles require membership.

**Query Parameters:**
| Param | Type | Required | Description |
|---|---|---|---|
| `cursor` | string (UUID) | No | Pagination cursor |
| `status` | string | No | Filter: `open\|locked\|resolving\|resolved\|disputed\|paid_out` |

**Response 200:**
```json
{
  "items": [
    {
      "id": "c3d4e5f6-a7b8-9012-cdef-234567890123",
      "chainId": "17",
      "circleId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "creatorId": "550e8400-e29b-41d4-a716-446655440000",
      "title": "BTC hits $100k before end of 2024",
      "description": "Will Bitcoin reach $100,000 USD?",
      "avatarEmoji": "₿",
      "avatarColor": "#f7931a",
      "outcomeType": "binary",
      "deadline": "2024-12-31T23:59:59.000Z",
      "minStake": "1.000000",
      "status": "open",
      "winningSide": null,
      "participantCount": 8,
      "createdAt": "2024-06-01T12:00:00.000Z"
    }
  ],
  "nextCursor": null,
  "hasMore": false
}
```

**Response 401:**
```json
{
  "error": "Unauthorized",
  "message": "Missing or invalid access token",
  "statusCode": 401
}
```

**Response 403 – private circle, not a member:**
```json
{
  "error": "Forbidden",
  "message": "Not a member",
  "statusCode": 403
}
```

**Response 404:**
```json
{
  "error": "NotFound",
  "message": "Circle not found",
  "statusCode": 404
}
```

---

## GOALS

### Goal Object

```json
{
  "id": "c3d4e5f6-a7b8-9012-cdef-234567890123",
  "chainId": "17",
  "circleId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "creatorId": "550e8400-e29b-41d4-a716-446655440000",
  "title": "BTC hits $100k before end of 2024",
  "description": "Will Bitcoin reach $100,000 USD by Dec 31?",
  "avatarEmoji": "₿",
  "avatarColor": "#f7931a",
  "outcomeType": "binary",
  "deadline": "2024-12-31T23:59:59.000Z",
  "minStake": "1.000000",
  "status": "open",
  "winningSide": null,
  "metadataUri": "http://localhost:3001/api/v1/goals/c3d4e5f6.../metadata",
  "txHash": "0xabc123...",
  "createdAt": "2024-06-01T12:00:00.000Z"
}
```

**Status lifecycle:** `open` → `locked` → `resolving` → `resolved` / `disputed` → `paid_out`

**USDT amounts** are strings with 6 decimal places (e.g. `"5.000000"` = 5 USDT).

---

### POST /api/v1/goals

**Auth required:** Yes  
**Description:** Creates the goal metadata off-chain and returns a `metadataUri` to use in the on-chain `createGoal()` call. The caller must be a member of the target circle. The goal's `chainId` is `null` until confirmed via `/confirm`.

**Request Body:**
```json
{
  "circleId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "title": "BTC hits $100k before end of 2024",
  "description": "Will Bitcoin reach $100,000 USD by Dec 31?",
  "avatarEmoji": "₿",
  "avatarColor": "#f7931a",
  "outcomeType": "binary",
  "deadline": "2024-12-31T23:59:59.000Z",
  "minStake": "1.000000",
  "resolverIds": [
    "660f9511-f39c-52e5-b827-557766551111",
    "770fa622-a40d-63f6-c938-668877662222"
  ],
  "sides": ["yes", "no"]
}
```

| Field | Type | Required | Rules |
|---|---|---|---|
| `circleId` | UUID | Yes | Must be a circle you're a member of |
| `title` | string | Yes | 3–200 characters |
| `description` | string | No | Max 1000 characters |
| `outcomeType` | string | Yes | `binary\|multi\|numeric` |
| `deadline` | ISO 8601 datetime | Yes | Must be in the future |
| `minStake` | string | Yes | Decimal with up to 6 places (e.g. `"1.000000"`) |
| `resolverIds` | UUID[] | Yes | 1–10 user IDs who will vote on outcome |
| `sides` | string[] | No | Choice labels (used for `multi` type) |

**Response 201:**
```json
{
  "id": "c3d4e5f6-a7b8-9012-cdef-234567890123",
  "metadataUri": "http://localhost:3001/api/v1/goals/c3d4e5f6-a7b8-9012-cdef-234567890123/metadata"
}
```
> Pass `metadataUri` to `PredictionPool.createGoal()` on-chain.

**Response 400 – validation:**
```json
{
  "error": "ValidationError",
  "message": "Deadline must be in the future",
  "statusCode": 400
}
```

**Response 401:**
```json
{
  "error": "Unauthorized",
  "message": "Missing or invalid access token",
  "statusCode": 401
}
```

**Response 403 – not a circle member:**
```json
{
  "error": "Forbidden",
  "message": "You must be a circle member to create goals",
  "statusCode": 403
}
```

---

### POST /api/v1/goals/:id/confirm

**Auth required:** Yes  
**Description:** Links the off-chain goal record to its on-chain ID after the `createGoal()` transaction is confirmed. Only the goal creator can call this. Triggers `goal.created` notifications to all circle members.

**Request Body:**
```json
{
  "chainId": 17,
  "txHash": "0xabc123def456789012345678901234567890123456789012345678901234567890"
}
```

| Field | Type | Required | Rules |
|---|---|---|---|
| `chainId` | number | Yes | On-chain goal ID from the transaction event |
| `txHash` | string | Yes | 66-char hex tx hash (`0x` + 64 hex chars) |

**Response 200 (full goal object):**
```json
{
  "id": "c3d4e5f6-a7b8-9012-cdef-234567890123",
  "chainId": "17",
  "circleId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "creatorId": "550e8400-e29b-41d4-a716-446655440000",
  "title": "BTC hits $100k before end of 2024",
  "description": "Will Bitcoin reach $100,000 USD by Dec 31?",
  "avatarEmoji": "₿",
  "avatarColor": "#f7931a",
  "outcomeType": "binary",
  "deadline": "2024-12-31T23:59:59.000Z",
  "minStake": "1.000000",
  "status": "open",
  "winningSide": null,
  "metadataUri": "http://localhost:3001/api/v1/goals/c3d4e5f6.../metadata",
  "txHash": "0xabc123def456789012345678901234567890123456789012345678901234567890",
  "createdAt": "2024-06-01T12:00:00.000Z"
}
```

**Response 400 – validation:**
```json
{
  "error": "ValidationError",
  "message": "Invalid signature",
  "statusCode": 400
}
```

**Response 401:**
```json
{
  "error": "Unauthorized",
  "message": "Missing or invalid access token",
  "statusCode": 401
}
```

**Response 403 – not the creator:**
```json
{
  "error": "Forbidden",
  "message": "Only the creator can confirm the goal",
  "statusCode": 403
}
```

**Response 404:**
```json
{
  "error": "NotFound",
  "message": "Goal not found",
  "statusCode": 404
}
```

---

### GET /api/v1/goals/feed

**Auth required:** No  
**Description:** Home screen feed. Returns active goals (`open`, `locked`, `resolving`) from all **public** circles, sorted by newest first. Cursor-paginated.

**Query Parameters:**
| Param | Type | Required | Description |
|---|---|---|---|
| `cursor` | string (UUID) | No | Pagination cursor |

**Response 200:**
```json
{
  "items": [
    {
      "id": "c3d4e5f6-a7b8-9012-cdef-234567890123",
      "chainId": "17",
      "circleId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "creatorId": "550e8400-e29b-41d4-a716-446655440000",
      "title": "BTC hits $100k before end of 2024",
      "description": "Will Bitcoin reach $100,000 USD by Dec 31?",
      "avatarEmoji": "₿",
      "avatarColor": "#f7931a",
      "outcomeType": "binary",
      "deadline": "2024-12-31T23:59:59.000Z",
      "minStake": "1.000000",
      "status": "open",
      "winningSide": null,
      "metadataUri": "http://localhost:3001/api/v1/goals/c3d4e5f6.../metadata",
      "txHash": null,
      "createdAt": "2024-06-01T12:00:00.000Z",
      "participantCount": 8
    }
  ],
  "nextCursor": "d4e5f6a7-b8c9-0123-defa-345678901234",
  "hasMore": true
}
```

---

### GET /api/v1/goals/mine

**Auth required:** Yes  
**Description:** Returns goals that the authenticated user has created **or** participated in (staked). Sorted by newest first. Cursor-paginated.

**Query Parameters:**
| Param | Type | Required | Description |
|---|---|---|---|
| `cursor` | string (UUID) | No | Pagination cursor |

**Response 200:**
```json
{
  "items": [
    {
      "id": "c3d4e5f6-a7b8-9012-cdef-234567890123",
      "chainId": "17",
      "circleId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "creatorId": "550e8400-e29b-41d4-a716-446655440000",
      "title": "BTC hits $100k before end of 2024",
      "description": null,
      "avatarEmoji": "₿",
      "avatarColor": "#f7931a",
      "outcomeType": "binary",
      "deadline": "2024-12-31T23:59:59.000Z",
      "minStake": "1.000000",
      "status": "resolved",
      "winningSide": "yes",
      "metadataUri": "http://localhost:3001/api/v1/goals/c3d4e5f6.../metadata",
      "txHash": "0xabc123...",
      "createdAt": "2024-06-01T12:00:00.000Z",
      "participantCount": 15
    }
  ],
  "nextCursor": null,
  "hasMore": false
}
```

**Response 401:**
```json
{
  "error": "Unauthorized",
  "message": "Missing or invalid access token",
  "statusCode": 401
}
```

---

### GET /api/v1/goals/:id

**Auth required:** Yes  
**Description:** Returns full goal detail including participation summary per side and resolver list with their votes.

**Response 200:**
```json
{
  "id": "c3d4e5f6-a7b8-9012-cdef-234567890123",
  "chainId": "17",
  "circleId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "creatorId": "550e8400-e29b-41d4-a716-446655440000",
  "title": "BTC hits $100k before end of 2024",
  "description": "Will Bitcoin reach $100,000 USD by Dec 31?",
  "avatarEmoji": "₿",
  "avatarColor": "#f7931a",
  "outcomeType": "binary",
  "deadline": "2024-12-31T23:59:59.000Z",
  "minStake": "1.000000",
  "status": "resolved",
  "winningSide": "yes",
  "metadataUri": "http://localhost:3001/api/v1/goals/c3d4e5f6.../metadata",
  "txHash": "0xabc123...",
  "createdAt": "2024-06-01T12:00:00.000Z",
  "participantCount": 15,
  "participationSummary": [
    {
      "side": "yes",
      "totalStaked": "45.000000",
      "count": 10
    },
    {
      "side": "no",
      "totalStaked": "20.000000",
      "count": 5
    }
  ],
  "resolvers": [
    {
      "userId": "660f9511-f39c-52e5-b827-557766551111",
      "vote": "yes",
      "votedAt": "2025-01-01T10:00:00.000Z",
      "user": {
        "id": "660f9511-f39c-52e5-b827-557766551111",
        "walletAddress": "0xab5801a7d398351b8be11c439e05c5b3259aec9b",
        "name": "Bob",
        "username": "bob_web3",
        "avatarEmoji": "🐻",
        "avatarColor": "#8338ec"
      }
    }
  ]
}
```

**Response 401:**
```json
{
  "error": "Unauthorized",
  "message": "Missing or invalid access token",
  "statusCode": 401
}
```

**Response 404:**
```json
{
  "error": "NotFound",
  "message": "Goal not found",
  "statusCode": 404
}
```

---

### GET /api/v1/goals/:id/participants

**Auth required:** Yes  
**Description:** Returns paginated list of all participants for a goal, including their staked amounts, chosen side, and claim status.

**Query Parameters:**
| Param | Type | Required | Description |
|---|---|---|---|
| `cursor` | string (UUID) | No | Pagination cursor (user_id of last item) |

**Response 200:**
```json
{
  "items": [
    {
      "userId": "550e8400-e29b-41d4-a716-446655440000",
      "side": "yes",
      "staked": "5.000000",
      "claimed": true,
      "claimedAmount": "9.800000",
      "createdAt": "2024-06-10T14:30:00.000Z",
      "user": {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "walletAddress": "0xd8da6bf26964af9d7eed9e03e53415d37aa96045",
        "name": "Alice Wonder",
        "username": "alice_celo",
        "avatarEmoji": "🦁",
        "avatarColor": "#ff6b6b"
      }
    },
    {
      "userId": "660f9511-f39c-52e5-b827-557766551111",
      "side": "no",
      "staked": "10.000000",
      "claimed": false,
      "claimedAmount": null,
      "createdAt": "2024-06-11T09:00:00.000Z",
      "user": {
        "id": "660f9511-f39c-52e5-b827-557766551111",
        "walletAddress": "0xab5801a7d398351b8be11c439e05c5b3259aec9b",
        "name": "Bob",
        "username": "bob_web3",
        "avatarEmoji": "🐻",
        "avatarColor": "#8338ec"
      }
    }
  ],
  "nextCursor": null,
  "hasMore": false
}
```

**Response 401:**
```json
{
  "error": "Unauthorized",
  "message": "Missing or invalid access token",
  "statusCode": 401
}
```

**Response 404:**
```json
{
  "error": "NotFound",
  "message": "Goal not found",
  "statusCode": 404
}
```

---

### GET /api/v1/goals/:id/my-stake

**Auth required:** Yes  
**Description:** Returns the current user's stake in a specific goal. Returns `staked: false` if the user has not participated.

**Path Parameters:**
| Param | Type | Required | Description |
|---|---|---|---|
| `id` | UUID | Yes | Goal ID |

**Response 200 — user has not staked:**
```json
{
  "staked": false,
  "data": null
}
```

**Response 200 — user has staked:**
```json
{
  "staked": true,
  "data": {
    "side": 0,
    "amount": "5.000000",
    "claimedAmount": null
  }
}
```

**Response 200 — user has staked and claimed:**
```json
{
  "staked": true,
  "data": {
    "side": 0,
    "amount": "5.000000",
    "claimedAmount": "9.800000"
  }
}
```

**Field notes:**
- `side`: `0` = Yes, `1` = No (integer matching on-chain enum)
- `amount`: User's staked USDT formatted as 6-decimal string
- `claimedAmount`: Winnings claimed from smart contract; `null` if not yet claimed

**Response 401:**
```json
{
  "error": "Unauthorized",
  "message": "Missing or invalid access token",
  "statusCode": 401
}
```

---

## NOTIFICATIONS

### Notification Object

```json
{
  "id": "e5f6a7b8-c9d0-1234-efab-456789012345",
  "type": "goal.resolved",
  "actorId": "660f9511-f39c-52e5-b827-557766551111",
  "entityType": "goal",
  "entityId": "c3d4e5f6-a7b8-9012-cdef-234567890123",
  "title": "Goal Resolved",
  "description": "The goal \"BTC hits $100k\" has been resolved. You lost this round.",
  "unread": true,
  "createdAt": "2025-01-01T12:00:00.000Z",
  "actor": {
    "id": "660f9511-f39c-52e5-b827-557766551111",
    "walletAddress": "0xab5801a7d398351b8be11c439e05c5b3259aec9b",
    "name": "Bob",
    "username": "bob_web3",
    "avatarEmoji": "🐻",
    "avatarColor": "#8338ec"
  }
}
```

**Notification `type` values:**

| Type | Trigger |
|---|---|
| `circle.invited` | Another user invited you to a circle |
| `circle.active` | Your circle's on-chain creation was indexed |
| `goal.created` | A new goal was created in a circle you're in |
| `goal.staked` | Someone staked on your goal |
| `goal.resolution_needed` | A goal you're resolving needs your vote |
| `goal.resolved` | A goal you participated in was resolved (lost) |
| `goal.disputed` | A goal was disputed — refund available |
| `reward.claimable` | You won a goal — claim your reward |
| `referral.verified` | Someone you referred made their first stake |

---

### GET /api/v1/notifications

**Auth required:** Yes  
**Description:** Returns paginated notifications for the authenticated user, sorted newest first. Also returns total `unreadCount`.

**Query Parameters:**
| Param | Type | Required | Description |
|---|---|---|---|
| `cursor` | string (UUID) | No | Pagination cursor |
| `unreadOnly` | `"true"` | No | If `"true"`, returns only unread notifications |

**Example:** `GET /api/v1/notifications?unreadOnly=true`

**Response 200:**
```json
{
  "items": [
    {
      "id": "e5f6a7b8-c9d0-1234-efab-456789012345",
      "type": "reward.claimable",
      "actorId": null,
      "entityType": "goal",
      "entityId": "c3d4e5f6-a7b8-9012-cdef-234567890123",
      "title": "You Won! Claim Your Reward",
      "description": "The goal \"BTC hits $100k\" resolved in your favor. Claim your reward!",
      "unread": true,
      "createdAt": "2025-01-01T12:00:00.000Z",
      "actor": null
    },
    {
      "id": "f6a7b8c9-d0e1-2345-fabc-567890123456",
      "type": "circle.invited",
      "actorId": "660f9511-f39c-52e5-b827-557766551111",
      "entityType": "circle",
      "entityId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "title": "Circle Invitation",
      "description": "You've been invited to join \"Celo Degens\"",
      "unread": false,
      "createdAt": "2024-12-01T08:00:00.000Z",
      "actor": {
        "id": "660f9511-f39c-52e5-b827-557766551111",
        "walletAddress": "0xab5801a7d398351b8be11c439e05c5b3259aec9b",
        "name": "Bob",
        "username": "bob_web3",
        "avatarEmoji": "🐻",
        "avatarColor": "#8338ec"
      }
    }
  ],
  "nextCursor": null,
  "hasMore": false,
  "unreadCount": 3
}
```

**Response 401:**
```json
{
  "error": "Unauthorized",
  "message": "Missing or invalid access token",
  "statusCode": 401
}
```

---

### POST /api/v1/notifications/mark-read

**Auth required:** Yes  
**Description:** Marks notifications as read. Either pass specific `ids` or use `all: true` to mark everything as read. At least one of `ids` or `all` is required.

**Request Body (specific IDs):**
```json
{
  "ids": [
    "e5f6a7b8-c9d0-1234-efab-456789012345",
    "f6a7b8c9-d0e1-2345-fabc-567890123456"
  ]
}
```

**Request Body (all):**
```json
{
  "all": true
}
```

**Response 200:**
```json
{
  "success": true
}
```

**Response 400 – neither ids nor all provided:**
```json
{
  "error": "ValidationError",
  "message": "Provide either 'ids' array or 'all: true'",
  "statusCode": 400
}
```

**Response 401:**
```json
{
  "error": "Unauthorized",
  "message": "Missing or invalid access token",
  "statusCode": 401
}
```

---

## REFERRALS

### GET /api/v1/referrals/me

**Auth required:** Yes  
**Description:** Returns the authenticated user's referral stats and up to 20 most recent referrals. The `referralCode` is the user's own wallet address — share it with others to get credit.

**Response 200:**
```json
{
  "stats": {
    "pending": 3,
    "verified": 5,
    "rewarded": 2
  },
  "referralCode": "0xd8da6bf26964af9d7eed9e03e53415d37aa96045",
  "recent": [
    {
      "id": "f7b8c9d0-e1f2-3456-abcd-678901234567",
      "status": "verified",
      "verifiedAt": "2024-07-15T10:30:00.000Z",
      "rewardTxHash": null,
      "referred": {
        "id": "660f9511-f39c-52e5-b827-557766551111",
        "walletAddress": "0xab5801a7d398351b8be11c439e05c5b3259aec9b",
        "name": "Bob",
        "username": "bob_web3",
        "avatarEmoji": "🐻",
        "avatarColor": "#8338ec"
      }
    },
    {
      "id": "a8b9c0d1-e2f3-4567-bcde-789012345678",
      "status": "pending",
      "verifiedAt": null,
      "rewardTxHash": null,
      "referred": {
        "id": "770fa622-a40d-63f6-c938-668877662222",
        "walletAddress": "0x1234567890abcdef1234567890abcdef12345678",
        "name": "Carol",
        "username": "carol_defi",
        "avatarEmoji": "🌸",
        "avatarColor": "#ec4899"
      }
    }
  ]
}
```

**Referral `status` values:**

| Status | Meaning |
|---|---|
| `pending` | Referred user signed up but hasn't staked yet |
| `verified` | Referred user made their first stake — referral counts |
| `rewarded` | On-chain reward has been distributed (`rewardTxHash` set) |

**Response 401:**
```json
{
  "error": "Unauthorized",
  "message": "Missing or invalid access token",
  "statusCode": 401
}
```

---

### POST /api/v1/referrals/track

**Auth required:** Yes  
**Description:** Records that the authenticated user was referred by someone. The `referralCode` is the referrer's wallet address. Call this once after the user signs up via a referral link. A user can only be referred once.

**Request Body:**
```json
{
  "referralCode": "0xd8da6bf26964af9d7eed9e03e53415d37aa96045"
}
```

The referral becomes `verified` automatically when the referred user makes their first on-chain stake (tracked by the indexer via BullMQ).

**Response 200:**
```json
{
  "success": true
}
```

**Response 400 – trying to refer yourself:**
```json
{
  "error": "BadRequest",
  "message": "Cannot refer yourself",
  "statusCode": 400
}
```

**Response 401:**
```json
{
  "error": "Unauthorized",
  "message": "Missing or invalid access token",
  "statusCode": 401
}
```

**Response 404 – referral code not found:**
```json
{
  "error": "NotFound",
  "message": "Referral code not found",
  "statusCode": 404
}
```

**Response 409 – already referred:**
```json
{
  "error": "Conflict",
  "message": "You have already been referred",
  "statusCode": 409
}
```

---

## WEBSOCKET

### ws://localhost:3001/ws/notifications?token=\<jwt\>

**Auth required:** Yes (JWT in query param)  
**Description:** Real-time notification stream. Connect once after login and keep the connection alive. The server pushes notifications as they arrive via Redis pub/sub.

**Connection:**
```
ws://localhost:3001/ws/notifications?token=eyJhbGciOiJIUzI1NiIs...
```

**On connect, server sends:**
```json
{
  "type": "connected",
  "message": "Connected to Circlo notifications",
  "userId": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Incoming notification push (same shape as REST):**
```json
{
  "id": "e5f6a7b8-c9d0-1234-efab-456789012345",
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "type": "reward.claimable",
  "entityType": "goal",
  "entityId": "c3d4e5f6-a7b8-9012-cdef-234567890123",
  "title": "You Won! Claim Your Reward",
  "description": "The goal resolved in your favor. Claim your reward!",
  "unread": true,
  "createdAt": "2025-01-01T12:00:00.000Z"
}
```

**Client → Server ping (optional, server also auto-pings every 30s):**
```json
{ "type": "ping" }
```

**Server → Client pong:**
```json
{ "type": "pong" }
```

**On auth failure (before upgrade):**
```json
{
  "error": "Unauthorized",
  "message": "Invalid token"
}
```
> Connection closes with code `1008`.

---

## APPENDIX

### Data Types

| Field | Format | Example |
|---|---|---|
| IDs | UUID v4 | `550e8400-e29b-41d4-a716-446655440000` |
| Wallet addresses | Lowercase hex `0x...` (42 chars) | `0xd8da6bf2...` |
| On-chain IDs (`chainId`) | Stringified `bigint` | `"42"` |
| USDT amounts | Decimal string, 6 places | `"5.000000"` |
| Timestamps | ISO 8601 UTC | `2024-06-01T12:00:00.000Z` |
| Colors | Hex `#rrggbb` | `"#3a86ff"` |

### Circle Categories

`general` · `crypto` · `fitness` · `gaming` · `music` · `other`

### Goal Outcome Types

| Type | Description |
|---|---|
| `binary` | Yes / No — two sides |
| `multi` | Multiple choices (custom labels in `sides`) |
| `numeric` | Numeric prediction (e.g. price target) |

### Goal Status Flow

```
open ──(deadline passed)──► locked ──(resolvers vote)──► resolving
                                                              │
                              ┌───────────────────────────────┘
                              │
                         ┌────▼────┐        ┌──────────┐
                         │resolved │        │ disputed │
                         └────┬────┘        └────┬─────┘
                              │                  │
                         ┌────▼────┐        ┌────▼─────┐
                         │paid_out │        │ refunded │
                         └─────────┘        └──────────┘
```

### Chain IDs

| Network | Chain ID |
|---|---|
| Celo Mainnet | `42220` |
| Celo Sepolia (testnet) | `11142220` |
