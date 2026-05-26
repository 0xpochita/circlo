# MiniPay Integration Guide

How Circlo is integrated with MiniPay (Opera's Celo wallet) end-to-end —
written for contributors who need to touch any wallet, SIWE, or
on-chain code path in the frontend.

> Sister doc: [`ARCHITECTURE.md`](../ARCHITECTURE.md) for the wider
> system map. This file zooms in on MiniPay-specific behaviours.

## Why MiniPay matters

MiniPay ships embedded in Opera Mobile with 15M+ wallet users already
onboarded — no seed phrase, no KYC for small stakes, native USDT on
Celo Mainnet. For a social prediction game like Circlo, that's our
single largest distribution channel and the primary surface our
front-end is tuned for.

## Detection

```ts
// frontend/src/lib/web3/minipay.ts
isMiniPay(): boolean
```

Two signals, priority order:

1. **URL override** — `?minipay=1` flips detection on. Useful for
   QA / desktop preview of the MiniPay-only UI flow.
2. **EIP-1193 provider flag** — `window.ethereum.isMiniPay === true`
   inside the actual Mini App browser.

SSR-safe (returns `false` when `window` is undefined). Use the
`useMiniPay()` hook for reactive React consumers.

## Auto-connect (no Connect button)

MiniPay listing guideline: **the user is never asked to tap a
Connect button**. Wallet connection is implicit on first paint.

Implemented in three places:

- `(onboarding)/ConnectStep.tsx` — fires SIWE flow on mount if
  `isMiniPayBrowser`
- `(app)/Header.tsx` — silent `connectAsync` (no SIWE) on every
  page mount when `isMiniPayBrowser && !isConnected && !isAuthenticated`
- `(profile)/ProfileHero.tsx` — same pattern

Guard against re-triggering SIWE: every auto-connect effect checks
`isAuthenticated` from authStore. wagmi `isConnected` briefly reads
`false` across in-app navigations, and without the guard the effect
would race and pop a second "Digital signature" prompt right after
the user just signed.

## UI gating

Components that depend on the wallet must read
`isConnected || isAuthenticated`, **not just `isConnected`**, because
wagmi state can drop momentarily during in-app navigation while the
session JWT is still valid.

Pattern:

```tsx
{isConnected || isAuthenticated ? (
  <ActionsRequiringWallet />
) : isMiniPayBrowser ? (
  <ConnectingPill />     // implicit auto-connect in flight
) : (
  <ConnectWalletButton />  // external wallets only
)}
```

## On-chain membership truth

Backend `circle.membersPreview` lags the chain after a fresh join.
To avoid stranding a member on the JoinButton instead of the Create
Goal CTA, both `circle-details/page.tsx` and `JoinButton.tsx` read
`CircleFactory.isCircleMember(circleId, address)` directly via the
wagmi public client and OR it into `isMember`.

## SIWE

MiniPay does sign `personal_sign` messages silently (no prompt). The
SIWE round-trip in `ConnectStep.tsx` is the only path to a real JWT
— don't skip it for MiniPay, even though it might seem invisible to
the user. Skipping it leaves the backend without a real session and
every subsequent `usersApi.*` call returns 401.

If SIWE genuinely fails (e.g., RPC issue), the flow falls back to a
clear "Sign-in didn't complete" toast + a manual retry button rather
than auto-proceeding to a stuck profile-fetch error.

## EIP-712 typed data (NOT supported)

`personal_sign` and `signTypedData` are different EIPs. MiniPay's
`signTypedData` support is **inconsistent across versions** — the
call can silently hang or surface a generic failure. Currently only
one surface relies on it: `GenerateInviteSheet.tsx` (mints the
EIP-712 invite proof for private circles).

Pattern in `GenerateInviteSheet.tsx`:

```ts
if (isMiniPayBrowser) {
  toast.error(
    "Generating an invite uses typed-data signing, which MiniPay " +
    "doesn't reliably support yet. Open Circlo in a desktop browser " +
    "to generate the link, then share the URL back here."
  );
  return;
}
```

The signed link itself works in any wallet once generated — only
the **signing step** needs the desktop fallback. The invitee can
still accept on MiniPay.

If a future feature needs typed-data signing in MiniPay, prefer
either:

- A backend-signed alternative (server signs with a hot key, frontend
  just submits the resulting proof).
- A non-typed-data signature scheme (e.g., raw `personal_sign` of
  the hashed payload, with on-chain recovery via ECDSA).

## Transactions

- **Legacy only.** Every `writeContract` call must use
  `type: "legacy"`. MiniPay does not honour EIP-1559
  `maxFeePerGas` / `maxPriorityFeePerGas`.
- **Approve-then-stake.** The SDK's `stake(wallet, params)` handles
  the USDT `approve` round-trip automatically when allowance is
  below the stake amount.
- **Fee currency.** Default to CELO (native gas). Setting
  `feeCurrency: USDT` is allowed but not necessary for MVP — users
  with any CELO balance can transact.

## PWA shell

The MiniPay listing form (`developer.minipay.to/mini-app-listing`)
expects an icon at the root URL plus a manifest. Wired in
`frontend/src/app/layout.tsx`:

- `/manifest.json` — declares Circlo as a standalone PWA in the
  social + finance categories
- `/icon-512.png`, `/icon-192.png` — generated from the brand logo
- `/apple-touch-icon.png` — 180×180 for iOS home-screen install
- `/terms` and `/privacy` Next.js routes — required ToS + Privacy
  Policy URLs in the listing form

## Testing the flow from desktop

```bash
cd frontend
pnpm dev
# Then open with the override:
#   http://localhost:3000/?minipay=1
#   http://localhost:3000/profile?minipay=1
```

UI flips into MiniPay mode without a real EIP-1193 provider being
present. Real write txs still need a wallet; the override only
affects client-side detection.

## When to re-test inside the actual MiniPay app

Any PR that touches:

- `lib/web3/minipay.ts` or `hooks/useMiniPay.ts`
- `(onboarding)/ConnectStep.tsx`
- `(app)/Header.tsx`
- `(profile)/ProfileHero.tsx`
- `(circle-details)/JoinButton.tsx` or `circle-details/page.tsx`
- `lib/web3/contracts.ts`, `network.ts`, or `usdt.ts`

… must be exercised inside MiniPay (test mode is fine) on the
preview Vercel URL, not just `localhost:3000?minipay=1`. The
in-app browser has lifecycle quirks the override can't reproduce.
