# packages/

NPM-published source for the two Circlo developer packages.

| Package | Folder | NPM |
|---|---|---|
| `circlo-types` | [`circlo-types/`](./circlo-types) | https://www.npmjs.com/package/circlo-types |
| `circlo-sdk` | [`circlo-sdk/`](./circlo-sdk) | https://www.npmjs.com/package/circlo-sdk |

## Layering

```
                            ┌──────────────────────────┐
                            │  Your app                │
                            └────────────┬─────────────┘
                                         │
                            ┌────────────▼─────────────┐
                            │  circlo-sdk              │   ← high-level
                            │  (writeContract wrappers,│
                            │   event watchers,        │
                            │   typed errors)          │
                            └────────────┬─────────────┘
                                         │ depends on
                            ┌────────────▼─────────────┐
                            │  circlo-types            │   ← low-level
                            │  (addresses, ABIs, enums │
                            │   entity types, parsers) │
                            └────────────┬─────────────┘
                                         │ depends on
                            ┌────────────▼─────────────┐
                            │  viem (peer dep)         │
                            └──────────────────────────┘
```

`circlo-types` has zero runtime deps — install it alone if you only need
contract metadata (addresses, ABIs as `as const`, enums). `circlo-sdk`
adds the ergonomic helpers on top + brings viem in as a peer dep.

## Which package do I want?

- **"I just want to call a contract"** → install `circlo-sdk`. Done.
- **"I'm building an indexer / Discord bot / something that only reads events"** → `circlo-types` is enough (you bring your own viem).
- **"I need the contract addresses to send a transaction myself"** → `circlo-types` exposes them as `CIRCLO_CONTRACTS`.

## Working on a package locally

```bash
cd packages/circlo-sdk
# Install workspace-style: viem + typescript + local circlo-types
npm install --no-save ../circlo-types typescript@^5.7.3 viem@^2.48.0
npm run build
npm test
```

The `--no-save` flag prevents package.json from getting a `file:`
dependency on the local circlo-types — the published version always
points at the npm-published circlo-types.

## Releasing

See [docs/REPO_GOVERNANCE.md](../docs/REPO_GOVERNANCE.md) for the full
release process. TL;DR:

```bash
cd packages/circlo-sdk      # or circlo-types
npm version minor           # bumps + tags + commits
git push --follow-tags      # GitHub Actions publishes with provenance
```

The matching `circlo-sdk-v*` / `circlo-types-v*` tag triggers the
publish workflow in [.github/workflows/](../.github/workflows/).

## See Also

- [`circlo-sdk` README](./circlo-sdk/README.md) — full method reference + examples
- [`circlo-types` README](./circlo-types/README.md) — exported helpers + quick start
- [`docs/ARCHITECTURE.md`](../docs/ARCHITECTURE.md) — how the SDK fits into Circlo
- [`examples/`](../examples/) — runnable .mjs demos against Celo Mainnet
