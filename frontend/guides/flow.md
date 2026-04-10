# Circlo — User Flow Documentation

> Complete user journey and navigation map for the Circlo MiniApp.
> Reference this document to understand state transitions, expected UX, and component boundaries.

---

## 1. Product Summary

Circlo is a social prediction game on Celo where friends set personal goals ("Will Sandra land a job in 2026?"), stake small amounts of USDT, and a trusted subset of circle members resolves the outcome. Winners split the pool automatically on-chain.

**Core concepts**
- **Circle** — a named group of friends (private or public) that acts as the social container for goals.
- **Goal (Prediction)** — a yes/no (or multi-choice) question about a circle member's real-world achievement.
- **Stake** — USDT amount a participant locks to back a side.
- **Resolver** — a trusted member selected by the goal creator to vote on the outcome.
- **Pool** — total staked USDT for a goal, distributed to winners on resolution.

---

## 2. Primary User Journeys

### 2.1 First-time Onboarding
1. User opens the MiniApp inside MiniPay.
2. Wallet auto-connects (Celo, MiniPay-provided signer).
3. Home (`/`) loads with default emoji avatar + welcome greeting.
4. User can tap avatar in Profile to open **Emoji Picker** and personalize (emoji + color).
5. Empty states invite user to **Create Circle** or **Explore Circles**.

**Outcome:** User has a persistent identity (wallet + local profile via Zustand, mirrored server-side).

---

### 2.2 Create a Circle (2-step wizard)

| Step | Route | Component | Inputs |
|------|-------|-----------|--------|
| 1 | `/create-circle` | `CircleSetupForm` | Emoji logo, name, description, category, privacy (public/private) |
| 2 | `/create-circle/invite` | `MemberList` | Search friends, toggle Invite/Invited |
| 3 | `/circle-success` | `SuccessHero` | Confirmation + CTA to create first goal |

**Transitions**
- `Continue` (step 1) → `/create-circle/invite`
- `Create Circle` (step 2) → on-chain tx `createCircle(...)` → `/circle-success`
- On success: user can tap **Create your first prediction** → `/create-prediction`

**Validation (backend + contract)**
- Name: 3–40 chars, trimmed. Uniqueness enforced server-side, not on-chain.
- Category: enum `general | crypto | fitness | gaming | music | other`.
- Privacy: `public` requires no code; `private` auto-generates an invite code.
- Contract stores the circle root (id, creator, privacy flag); backend stores metadata (name, description, emoji, member list).

---

### 2.3 Join a Circle

Three entry points:
1. **Explore (`/explore`)** — browse public circles → tap card → `/circle-details` → **Join Circle**.
2. **Invite Code** — paste code in `/circles` `CirclesActions` or `/explore` `InviteCodeInput` → **Join**.
3. **Direct Invitation** — friend invites via `MemberList` (invite row becomes "Invited"); recipient sees it in `NotificationSheet`.

**State after joining**
- Backend adds `user` to `circle.members`.
- Contract adds `user` to on-chain membership set (if circle is private/gated).
- Circle appears in user's `/circles` list.
- User can now create and participate in goals inside that circle.

---

### 2.4 Create a Goal (Prediction)

Route: `/create-prediction`

**Required inputs (PredictionForm + sub-components)**
1. **Goal Image** (`EmojiPicker`) — emoji + color for visual identity (stored off-chain).
2. **Circle** (`CircleSelector`) — which circle hosts this goal.
3. **Title** — e.g. "Will Sandra get a job in 2026?"
4. **Description** — optional context.
5. **Outcome Type** — `Yes/No`, `Multiple Choice`, `Numeric Range`.
6. **Deadline** — 1D / 3D / 7D / 14D / 30D.
7. **Stake Amount** — USDT value + quick amounts (0.10, 0.50, 1.00, 5.00).
8. **Resolvers** (`ResolverPicker`) — select ≥ 1 trusted circle members.

**Submission flow**
1. Frontend validates client-side (required fields, min stake).
2. Frontend POSTs metadata to backend (title, description, emoji, circle id).
3. Backend returns `goalId` (or a pre-signed payload with metadata hash).
4. Frontend calls contract `createGoal(circleId, outcomeType, deadline, minStake, resolvers, metadataURI)`.
5. User signs tx in MiniPay.
6. On confirmation: toast → navigate to `/prediction-detail?id=...`.

**Constraints**
- Must be a circle member.
- Resolver list must be ≥ 1 and all must be members of the selected circle.
- Creator may stake during creation (treated as first participant bet).

---

### 2.5 Stake on a Goal

Route: `/prediction-detail`

1. User selects a side (`Yes` / `No` in `OddsCard`).
2. Enters stake amount (prefilled from `StakeButton`).
3. If ERC-20 allowance insufficient: contract `USDT.approve(PredictionPool, amount)`.
4. Call `stake(goalId, side, amount)` → tx confirmation.
5. Backend indexer picks up `Staked` event → participant list updates.

**Rules**
- Cannot stake after deadline.
- Cannot stake on a resolved goal.
- Minimum stake enforced on-chain.
- Once staked on a side, cannot flip to the other side (only top up same side).

---

### 2.6 Resolve a Goal

After the deadline, the **resolver set** votes on the actual outcome.

1. Each resolver sees the goal in a "Needs your vote" list (Notification + Circle).
2. Resolver taps the goal → sees choices → submits vote via contract `submitVote(goalId, choice)`.
3. When quorum (e.g. > 50% of resolvers) is reached, contract auto-resolves.
4. Payouts are calculated: winning side shares the losing side's pool proportionally to their stake.
5. Winners can `claim(goalId)` — or backend relayer can auto-distribute (v2).

**Notification triggers**
- `goal.resolution_needed` — to resolvers at deadline.
- `goal.resolved` — to all participants with result + payout.
- `goal.claimable` — to winners after resolution.

---

### 2.7 Claim Rewards / View History

Route: `/profile` (`RecentPredictions`, `ActiveCircles`)

- Each prediction shows: title, result (Won/Lost), net amount.
- Wallet balance reflects claimed rewards (read from USDT contract).
- Referral rewards (`/referral`) also accrue here.

---

### 2.8 Referral Flow

Route: `/referral`

1. User shares referral link (wallet-derived code).
2. New user signs up via link → backend records "Pending".
3. After the new user places their first stake → status becomes "Verified".
4. Referrer is credited bonus USDT (backend-triggered `RewardDistributor.claimReferral(...)`, or held in escrow).

---

## 3. Global UI Patterns

### 3.1 Navigation
- `BottomTabBar` exists on Home, Explore, Circles, Profile.
- `Home` → `/`
- `Search` → `/explore`
- `Circles` → `/circles`
- `Profile` → `/profile`
- Wizard pages (`create-circle/*`, `create-prediction`, `prediction-detail`, `circle-details`) hide the tab bar and use a back button.

### 3.2 Identity
- Current user avatar and name live in Zustand (`userStore`) and persist via localStorage.
- Real users are keyed by wallet address; off-chain profile (name, username, avatar) comes from backend.

### 3.3 Animations
- Framer Motion stagger via `PageTransition` wrapper.
- Spring physics for avatars, progress bars, tab bar.

### 3.4 State & Data Layers

| Layer | Source of truth | Example |
|-------|----------------|---------|
| Client state | Zustand | Current user, draft forms, modal flags |
| API state | Backend | Circles list, goals metadata, notifications |
| On-chain state | Smart contract | Pools, stakes, votes, payouts |
| Chain → API bridge | Indexer | `Staked` event → `participant` row |

---

## 4. State Machine Summary

### Circle
```
DRAFT → CREATED → ACTIVE → ARCHIVED
```

### Goal (Prediction)
```
CREATED → OPEN (staking) → LOCKED (deadline reached) → RESOLVING → RESOLVED → PAID_OUT
                                                                ↘ DISPUTED (v2)
```

### Participant (per goal)
```
STAKED → (if win) CLAIMABLE → CLAIMED
       → (if lose) SETTLED
```

### Referral
```
INVITED → PENDING → VERIFIED → REWARDED
```

---

## 5. Error & Edge Cases

| Scenario | Expected UX |
|----------|-------------|
| User stakes below minimum | Disable Place Stake, show hint |
| Deadline passed before tx lands | Toast "Goal is locked", refresh list |
| Contract reverts (insufficient allowance) | Prompt USDT approval, retry stake |
| Resolver tries to vote twice | Contract reverts; UI shows "Already voted" |
| Network disconnects mid-flow | Retry banner, persist draft in Zustand |
| No circles yet | Empty state with CTA to Create Circle |
| No predictions yet | Empty state "No goals yet" |
| Quorum never reached | Fallback: refund all participants after `disputeWindow` |

---

## 6. Hand-off Checklist

- [ ] Backend provides `/users/me` with avatar + wallet (see `backend.md`).
- [ ] Backend returns circles, goals, participants, notifications.
- [ ] Contract exposes `createCircle`, `joinCircle`, `createGoal`, `stake`, `submitVote`, `claim` (see `smart-contract.md`).
- [ ] Indexer syncs chain events → backend → pushes to frontend via WebSocket / polling.
- [ ] Frontend listens to wallet events from MiniPay (connect, chain change, disconnect).
