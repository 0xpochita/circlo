# Repo Governance

How changes get from a branch into Circlo's main + how a release reaches
NPM. Companion to [CONTRIBUTING.md](../CONTRIBUTING.md) (which covers
*what* a good PR looks like) and [ARCHITECTURE.md](./ARCHITECTURE.md)
(which covers *what* gets changed).

## Branch Protection

`main` is the only long-lived branch. The intended GitHub branch
protection settings (configured at github.com/.../settings/branches):

| Rule | Setting |
|---|---|
| Require a pull request before merging | ✅ |
| Required approvals | 1 (relaxed for solo work; bump to 2 once team grows) |
| Dismiss stale approvals on new commits | ✅ |
| Require status checks to pass | ✅ — see "Required checks" below |
| Require branches to be up to date before merging | ✅ |
| Require linear history | ✅ — no merge commits, only squash + rebase |
| Require signed commits | ⚠️ aspirational — wait until all contributors have GPG/SSH signing wired up |
| Restrict who can push | ✅ — admin-only direct push, blocks accidental `git push` to main |
| Restrict who can force push | ✅ — never allowed on main |

### Required checks

These jobs from [`.github/workflows/ci.yml`](../.github/workflows/ci.yml)
must pass before a PR can merge:

- `Frontend (typecheck + lint)`
- `Backend (typecheck)`
- `Smart Contracts (build + test)`
- `circlo-sdk (build + test)`
- `Analyze (javascript-typescript)` — from [`codeql.yml`](../.github/workflows/codeql.yml)

A failing CodeQL alert at `error` severity blocks merge by policy; `warning`
and `note` levels surface in the PR Files Changed tab but don't block.

## Release Process — circlo-types & circlo-sdk

Both packages publish from tags. No need to log into npm on a workstation
for releases — the GitHub Action handles auth via the `NPM_TOKEN` secret +
OIDC for provenance attestation.

### One-time setup

1. Create an npm automation token at npmjs.com → Access Tokens → Generate.
   Use the **Granular access token** type with:
   - Scope: package-specific (separate token per package, or one token with
     publish access to both)
   - Bypass 2FA for publish: **ON** (required because the workflow can't prompt)
2. Add the token as repo secret `NPM_TOKEN` at
   github.com/alventendrawan123/circlo/settings/secrets/actions

### Cutting a release

```bash
# 1. Bump the version in package.json + add a CHANGELOG entry
cd packages/circlo-sdk
npm version minor    # or patch/major
# (this commits + tags automatically; or do it by hand if you prefer)

# 2. Push the tag — the workflow takes over
git push --follow-tags
```

The matching tag triggers [`publish-sdk.yml`](../.github/workflows/publish-sdk.yml)
(for circlo-sdk) or [`publish-types.yml`](../.github/workflows/publish-types.yml)
(for circlo-types). Both:

1. Check out the tagged commit
2. Install deps, run `npm run build`, run `npm test`
3. Publish with `--provenance --access public`

The provenance attestation is visible on npmjs.com as a green checkmark
next to the version — it cryptographically links the published tarball
back to the GitHub workflow run that produced it.

### Versioning policy

Both packages follow [SemVer](https://semver.org):

- **MAJOR** — breaking API change (renamed method, removed export, behaviour
  shift that requires code updates by consumers)
- **MINOR** — additive (new method, new optional param, new typed error class)
- **PATCH** — bug fix / docs / non-breaking internal refactor

The CHANGELOG.md is the source of truth for what landed in each release.
PRs touching a published package should update it in the same commit.

## Commit Style

Conventional Commits, scoped:

```
feat(circlo-sdk): add resolveGoal helper
fix(prediction-detail): handle missing walletClient on StakeButton
refactor(frontend): replace useWriteContract with circlo-sdk calls
test(circlo-sdk): cover stake auto-approve flow
docs(readme): add NPM badges
ci: add CodeQL workflow
chore(release): circlo-sdk v0.2.0
```

The scope is the package or area; types follow the standard
[Angular convention](https://www.conventionalcommits.org/en/v1.0.0/).

Commits should be granular — one logical change per commit. A feature
that touches the SDK, the frontend, and the README usually wants three
commits (one per surface), reviewed together in a single PR.

## Security Disclosure

For non-public security issues, email the maintainer (see [README](../README.md#team))
rather than filing a public issue. Routine bugs and feature requests
should go through the normal GitHub issue tracker.
