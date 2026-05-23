# Contributing to Circlo

Thanks for your interest. Circlo is open to contributions across the three main parts of the stack.

## Repo Structure

```
sc/         Solidity smart contracts (Foundry)
backend/    Fastify API + indexer + jobs (Node 20)
frontend/   Next.js mobile-first app (pnpm)
```

## Local Dev

### Smart Contracts

```bash
cd sc
forge build
forge test
```

### Backend

```bash
cd backend
cp .env.example .env  # fill DATABASE_URL, REDIS_URL, contract addresses
npm install
npx prisma generate
npm run dev
```

Backend needs PostgreSQL (Supabase) + Redis (local or Railway).

### Frontend

```bash
cd frontend
pnpm install
pnpm dev
```

Open http://localhost:3000.

To preview the MiniPay-only UI flow (implicit auto-connect,
hidden Connect button) from a desktop browser without launching
the actual Mini App, append `?minipay=1` to any route:

```
http://localhost:3000/?minipay=1
http://localhost:3000/profile?minipay=1
```

The query-string override is read by `frontend/src/lib/web3/minipay.ts`
and behaves identically to a real MiniPay environment for
client-side detection — the EIP-1193 provider checks still need a
real wallet for actual write txs.

## Branch & Commit Conventions

- Branch from `main`: `feat/<thing>`, `fix/<thing>`, `chore/<thing>`
- One feature per PR. Keep diffs reviewable.
- Conventional commits: `feat(scope): ...`, `fix(scope): ...`
- Run `pnpm exec biome check src` (frontend) and `tsc --noEmit` (backend) before pushing.

## PR Checklist

- [ ] Typecheck passes (CI)
- [ ] No console.log left behind
- [ ] README/docs updated if behavior changed
- [ ] Smart contract changes: tests + gas snapshot
- [ ] Migration changes: include both `up` and `down`

## Code Style

- TypeScript everywhere. No `any` unless interfacing with untyped libs.
- Frontend: Tailwind v4 (use `@utility` for custom utilities). Avoid CSS modules.
- Backend: Prisma for DB. No raw SQL except inside Prisma migrations.
- Contracts: Solidity 0.8.24. Stick to OpenZeppelin patterns.

## Reporting Issues

Use GitHub Issues. Include:
- Steps to reproduce
- Expected vs actual
- Browser/wallet for frontend issues
- Tx hash / Celoscan link for on-chain issues

## Questions

Open a discussion on GitHub or reach out at @alventendrawan123.
