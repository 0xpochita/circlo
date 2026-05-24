# circlo-sdk Examples

Minimal, runnable scripts that demonstrate how to use [`circlo-sdk`](../packages/circlo-sdk)
against Celo Mainnet. Each example is a single `.mjs` file so you can
copy + run without a build step.

## Running an example

```bash
cd examples
npm install
node monitor-events.mjs
```

Examples are read-only by default — they don't need a wallet, just a
public RPC endpoint. Examples that demonstrate write flows are clearly
labelled and require a funded private key in `.env`.

## Index

| File | What it does | Needs wallet? |
|---|---|---|
| [`monitor-events.mjs`](./monitor-events.mjs) | Streams `CircleCreated` and `GoalCreated` events live as they hit the chain | No |
| [`read-stats.mjs`](./read-stats.mjs) | Reads total circles + goals + lists the 5 most recent goals with their pools | No |
| [`tap-settlement.mjs`](./tap-settlement.mjs) | Calls the permissionless `settlement()` heartbeat on PredictionPool and prints the resulting Celoscan tx link | **Yes** (tiny gas only — no USDT) |

More examples land as the SDK gains methods — `stake`, `claim`, and
resolver-vote flows are tracked but not included here yet because they
need a funded wallet + careful gas planning.

## Why these are .mjs, not .ts

To stay copy-paste runnable for anyone landing here from the npm page.
A `.mjs` file runs with `node` directly, no `tsx` install or `tsc`
build. Trade-off is no compile-time type checking — accept that for the
demo surface; production code should still use `.ts`.
