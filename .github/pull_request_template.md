## Summary

<!-- 1-2 sentences: what does this PR do? -->

## Changes

- [ ]
- [ ]

## Scope

- [ ] Smart contracts (`sc/`)
- [ ] Backend (`backend/`)
- [ ] Frontend (`frontend/`)
- [ ] Docs / config

## Test plan

- [ ] Typecheck passes locally
- [ ] CI green
- [ ] Manually tested in browser (if frontend)
- [ ] Manually tested inside MiniPay browser (if frontend touches wallet / SIWE / connect flow)
- [ ] New tests added (if logic change)

## On-chain / Celo Mainnet

<!-- Tick whichever applies; leave blank if PR doesn't touch on-chain code. -->

- [ ] Contract change → `forge test` passes + gas snapshot diff reviewed
- [ ] Contract change → new implementation verified on Celoscan after deploy
- [ ] Tx submission path → uses `type: "legacy"` (MiniPay compatibility)
- [ ] No `personal_sign` / `eth_sign` added (MiniPay support varies)

## Notes for reviewer

<!-- Anything tricky, intentional trade-offs, things to look out for -->
