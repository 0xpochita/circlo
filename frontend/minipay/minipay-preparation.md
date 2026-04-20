# MiniPay — Preparation & Next Steps

Practical checklist untuk membawa Circlo dari "MiniPay-aware" (sekarang) ke "live di MiniPay App Store".

> Lihat `minipay.md` untuk technical integration plan (10 steps). Dokumen ini fokus pada **urutan deploy & operations** yang harus dikerjakan.

---

## ✅ Sudah selesai (commit `c65d1bd`)

- `isMiniPay()` detection helper + `useMiniPay()` hook
- Auto-connect saat dApp dibuka via MiniPay browser
- Hide "Connect Wallet" button + back link di ConnectStep
- SIWE label switch (no popup expected in MiniPay)
- Hide "Disconnect Wallet" di profile page
- QA flag `?minipay=1` untuk simulasi di browser biasa

➡️ **Bisa di-test sekarang**: buka `http://localhost:3000/welcome?minipay=1` → harusnya auto-trigger flow connect tanpa tombol manual.

---

## 🔥 Blockers untuk go-live di MiniPay

MiniPay user hanya bisa pakai **Celo Mainnet** + **cUSD**. Kita masih di Celo Sepolia + Mock USDT. Ini blocker terbesar.

### Blocker 1 — Smart Contract Deploy ke Celo Mainnet

**Owner**: Tim smart contract (Alven)

Yang harus dideploy ulang ke mainnet (`chainId 42220`):

1. `CircleFactory.sol` — tanpa modifikasi
2. `PredictionPool.sol` — **hapus `MockUSDT`**, ganti `IERC20` ke alamat cUSD mainnet:
   - `0x765DE816845861e75A25fCA122bb6898B8B1282a`
3. `ResolutionModule.sol` — tanpa modifikasi
4. **Skip `MockUSDT.sol`** — di mainnet pakai cUSD asli, jangan deploy mock token
5. Faucet endpoint backend → **disable di mainnet** (tidak relevan)

**Deliverable**:
- `CIRCLE_FACTORY_ADDRESS_MAINNET`
- `PREDICTION_POOL_ADDRESS_MAINNET`
- `RESOLUTION_MODULE_ADDRESS_MAINNET`
- `STABLE_TOKEN_MAINNET=0x765DE816845861e75A25fCA122bb6898B8B1282a`

**Estimasi gas**: ~0.5-1 CELO untuk deploy semua contracts. Beli CELO real money di exchange (Coinbase, Binance, Bitget).

---

### Blocker 2 — Backend Indexer Mainnet

**Owner**: Tim backend

1. Spin up indexer instance baru pointing ke Celo mainnet RPC:
   - RPC: `https://forno.celo.org`
   - WebSocket: `wss://forno.celo.org/ws`
2. Update event ABIs — tetap sama, cuma alamat contract berubah
3. Update env:
   ```
   CHAIN_ID=42220
   CIRCLE_FACTORY_ADDRESS=0x...
   PREDICTION_POOL_ADDRESS=0x...
   RESOLUTION_MODULE_ADDRESS=0x...
   STABLE_TOKEN_ADDRESS=0x765DE816845861e75A25fCA122bb6898B8B1282a
   STABLE_TOKEN_DECIMALS=18  # cUSD = 18 decimals (BUKAN 6 seperti USDT)
   ```
4. **Hapus faucet route** dari API mainnet (atau gate dengan env flag)
5. Pastikan database production terpisah dari testnet

---

### Blocker 3 — Frontend Multi-chain Config

**Owner**: Frontend (saya/Bima)

File yang harus diupdate setelah blocker 1 & 2 selesai:

1. **`src/lib/web3/config.ts`** — tambah `celo` mainnet di chains array
2. **`src/lib/web3/contracts.ts`** — switch alamat berdasarkan env:
   ```ts
   const IS_MAINNET = process.env.NEXT_PUBLIC_USE_MAINNET === "true";
   ```
3. **`src/lib/web3/usdt.ts`** — rename → `stable.ts`, jadi token-agnostic, decimals dari env
4. **`.env.production`**:
   ```
   NEXT_PUBLIC_USE_MAINNET=true
   NEXT_PUBLIC_CIRCLE_FACTORY=0x...
   NEXT_PUBLIC_PREDICTION_POOL=0x...
   NEXT_PUBLIC_RESOLUTION_MODULE=0x...
   NEXT_PUBLIC_STABLE_TOKEN=0x765DE816845861e75A25fCA122bb6898B8B1282a
   NEXT_PUBLIC_STABLE_DECIMALS=18
   NEXT_PUBLIC_API_URL=https://api.circlo.app
   ```
5. **Hapus Faucet UI** di mainnet build (gate dengan `IS_MAINNET`)
6. **Update icon coin** dari USDT logo → cUSD logo (`/Assets/Images/Logo/logo-coin/cusd-logo.svg`)

---

## 💰 Platform Fee Setup

`PredictionPool.sol` sudah punya infrastruktur fee (`protocolFeeBps` + `feeRecipient`, FEE_SETTER_ROLE). Default `0`, harus diaktifkan post-deploy mainnet.

### Cara kerja fee

- Fee diambil **saat user claim reward** (bukan saat stake), basis: payout user
- Hitungan: `fee = payout × protocolFeeBps / 10_000`
- User terima: `payout - fee`, Treasury terima: `fee`
- Max cap di contract: **10% (1000 bps)** — tidak bisa lebih
- Loser tidak kena fee (karena payout = 0)

### Rekomendasi fee structure

| Tier | bps | % | Use case |
|------|-----|---|----------|
| **Soft launch (week 1-4)** | `0` | 0% | Acquisition, no friction |
| **Growth phase** | `100` | 1% | Cover ops cost, masih kompetitif |
| **Sustainable** | `200-300` | 2-3% | Industry standard prediction market |
| **Premium** | `500` | 5% | Hanya kalau ada value-add jelas (insurance, instant resolve) |

> Polymarket: 0% trading fee, 2% on resolution. Augur: 1% reporter + 1% creator. Manifold: 0% (no real money).
>
> **Saran**: start `0` untuk MiniPay launch (4-8 minggu), naikin ke `100` (1%) setelah ada engaged user base.

### Setup steps

1. **Setup treasury wallet** (sebelum deploy)
   - Idealnya **Gnosis Safe multisig** di Celo mainnet (2-of-3 atau 3-of-5)
   - Alternatif sementara: hardware wallet (Ledger) single signer
   - **JANGAN** pakai EOA hot wallet — kena hack langsung treasury habis
   - Setup di: https://safe.global → New Safe → Pilih Celo network

2. **Deploy contract** (lihat Blocker 1)

3. **Set fee post-deploy**:
   ```solidity
   // Via cast / Foundry script (FEE_SETTER_ROLE holder only)
   predictionPool.setFee(0, TREASURY_ADDRESS);
   ```
   Set ke `0` dulu, recipient sudah dipasang treasury. Nanti tinggal panggil `setFee(100, TREASURY_ADDRESS)` saat mau aktifkan tanpa upgrade contract.

4. **Frontend disclosure** — wajib tampilkan fee ke user **sebelum** mereka stake:
   - Stake screen: "Platform fee: X% on winnings"
   - Claim screen: tampilkan breakdown `Gross payout / Platform fee / Net to you`
   - Tooltip / info icon dengan detail
   - **Tanpa disclosure = MiniPay reject** (consumer protection)

5. **Treasury management policy** (dokumenkan):
   - Siapa boleh sign transactions (founders + advisor)
   - Kapan withdraw (monthly? quarterly?)
   - Allocation: ops cost / dev / marketing / reserve
   - Public reporting? (dashboard balance treasury)

### Tax & compliance

- Treasury inflow = **revenue** untuk perusahaan (kena pajak penghasilan)
- Indonesia: pajak crypto 0.11% PPN + 0.1% PPh per transaksi (PMK 68/2022)
- Pertimbangkan setup entity (PT) sebelum activate fee
- Konsultasi tax advisor sebelum revenue > Rp 500M/tahun
- Simpan log semua tx ke treasury (block explorer + spreadsheet)

### Alternative monetization (kalau fee 0%)

Untuk MiniPay launch tanpa fee, revenue sources:
- **Premium circles** (subscription off-chain via Stripe/RevenueCat)
- **Sponsored predictions** (brand sponsor topup pool)
- **API access** untuk developer
- **NFT badges** untuk top resolvers
- Grant program Celo Foundation (typical $5-50K untuk MiniPay dApps)

### UI implementation checklist

File yang harus diupdate untuk disclosure:

- [ ] `StakeButton.tsx` — show fee % di confirmation
- [ ] `ClaimRewardButton.tsx` — breakdown gross/fee/net
- [ ] `(prediction-detail)/StakeStats.tsx` — info badge "Y% platform fee"
- [ ] Settings/About page — link ke fee policy
- [ ] Read fee dari contract (`protocolFeeBps()`) di config helper, jangan hardcode

```ts
// src/lib/web3/fee.ts
export async function getPlatformFeeBps(client: PublicClient): Promise<number> {
  const bps = await client.readContract({
    address: predictionPoolContract.address,
    abi: predictionPoolContract.abi,
    functionName: "protocolFeeBps",
  });
  return Number(bps);
}
```

Cache 5 menit di `dataCache` biar nggak fetch tiap render.

---

## 🚀 Deployment Checklist

### Step 1 — Domain & HTTPS

MiniPay **wajib HTTPS** dan **valid SSL cert**.

- [ ] Beli domain (Cloudflare Registrar, Namecheap, dll)
- [ ] Setup DNS A/CNAME ke hosting
- [ ] Deploy frontend ke **Vercel** atau **Cloudflare Pages**
- [ ] Verify SSL aktif (auto via Vercel/CF)
- [ ] Suggested: `app.circlo.xyz` atau `circlo.app`

### Step 2 — Backend Production

- [ ] Deploy backend (Railway / Fly.io / VPS)
- [ ] Postgres production (Neon / Supabase / RDS)
- [ ] Indexer running 24/7 dengan auto-restart
- [ ] Health check endpoint untuk monitoring (`GET /health`)
- [ ] Sentry / Logtail untuk error tracking

### Step 3 — Frontend Production Build

- [ ] Set semua `NEXT_PUBLIC_*` env vars di Vercel dashboard
- [ ] Build & verify: `pnpm build && pnpm start` lokal dulu
- [ ] Lighthouse score: target Mobile Performance ≥ 80
- [ ] Test di Chrome DevTools mobile emulation (iPhone SE viewport min)

### Step 4 — PWA Manifest (recommended)

MiniPay treat dApp sebagai pseudo-PWA. Tambahkan:

- [ ] `app/manifest.ts` dengan name, icons, theme_color, display: "standalone"
- [ ] `apple-touch-icon.png` 180x180
- [ ] OG image untuk preview di MiniPay

```ts
// src/app/manifest.ts
export default function manifest() {
  return {
    name: "Circlo",
    short_name: "Circlo",
    description: "Circle predictions on Celo",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#10b981",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
```

### Step 5 — Testing di Real MiniPay

- [ ] Install **Opera Mini** di Android device
- [ ] Buat MiniPay wallet (Settings → MiniPay → Create)
- [ ] Top up cUSD via exchange atau faucet (Alfajores faucet untuk dev)
- [ ] Buka URL production di Opera Mini browser
- [ ] Test full flow:
  - [ ] Auto-connect berhasil tanpa popup
  - [ ] SIWE selesai tanpa popup
  - [ ] Create circle → tx confirm tanpa popup
  - [ ] Join circle → tx confirm tanpa popup
  - [ ] Create goal → tx confirm tanpa popup
  - [ ] Stake → tx confirm tanpa popup (pastikan approve cUSD jalan)
  - [ ] Resolve goal → tx confirm tanpa popup
  - [ ] Claim reward → tx confirm tanpa popup
- [ ] Test di Android low-end (target audience MiniPay)
- [ ] Test koneksi 3G slow (Opera Mini = emerging market focus)

### Step 6 — Submission ke MiniPay App Store

MiniPay punya curated dApp store di home screen.

- [ ] Daftar developer account: https://docs.celo.org/developer/build-on-minipay/quickstart
- [ ] Submit form: https://forms.gle/... (cek Celo docs untuk link terbaru)
- [ ] Required materials:
  - Logo 512x512 PNG transparent
  - Banner 1200x630
  - Short description (max 80 chars)
  - Long description (max 500 chars)
  - Screenshot mobile (3-5 buah, 1080x1920)
  - dApp URL production
  - Twitter/X account aktif
  - Privacy policy URL
  - Terms of service URL
- [ ] Wait for approval (typical 1-2 minggu)
- [ ] Setelah approved, dApp muncul di MiniPay home

---

## ⚠️ Hal yang sering bikin reject di MiniPay

1. **Popup signature** — kalau ada modal yang tunggu user click "Sign", ditolak. Harus seamless.
2. **Network switch prompt** — MiniPay tidak support, harus auto-detect chain.
3. **Mobile-only friendly** — kalau ada tombol kecil < 44px atau scroll horizontal, ditolak.
4. **Loading > 3 detik** — Opera Mini target slow network, harus fast first paint.
5. **External wallet UI** — jangan tampilkan "MetaMask not found", "Install Wallet", dll.
6. **Self-custody disclaimer** — wajib ada section "Your keys, your funds" (sudah ada di ConnectStep).
7. **Privacy policy + ToS** — wajib link di footer.
8. **No spam notification** — push notif harus opt-in.

---

## 💸 Estimasi biaya go-live

| Item | Cost |
|------|------|
| Domain (1 tahun) | $10-15 |
| Vercel Pro (frontend) | $20/bulan |
| Backend hosting (Railway) | $5-20/bulan |
| Postgres (Neon free tier OK awalnya) | $0-19/bulan |
| Indexer compute (1 vCPU) | $5-10/bulan |
| CELO untuk deploy contracts | ~$5 (1 CELO @ ~$0.5) |
| **Total bulanan** | **~$30-65/bulan** |
| **Setup awal** | **~$25** |

Free tier alternatives: Vercel Hobby + Railway free + Neon free = $0/bulan untuk MVP.

---

## 📅 Timeline rekomendasi

| Minggu | Milestone |
|--------|-----------|
| 1 | Smart contract refactor + deploy ke mainnet (blocker 1) |
| 2 | Backend indexer mainnet + production deploy (blocker 2) |
| 3 | Frontend multi-chain config + test di MiniPay test mode (blocker 3) |
| 4 | PWA manifest, polish UI, real device testing |
| 5 | Submit ke MiniPay App Store, fix feedback |
| 6 | Approved & live 🎉 |

---

## 🆘 Resource & Help

- **MiniPay Docs**: https://docs.celo.org/developer/build-on-minipay
- **MiniPay Quickstart Repo**: https://github.com/celo-org/minipay-template
- **Celo Discord** (bantuan dev): https://discord.gg/celo
- **MiniPay Submission Form**: cek halaman docs paling baru
- **Celo Mainnet Block Explorer**: https://celoscan.io
- **cUSD Contract**: https://celoscan.io/token/0x765de816845861e75a25fca122bb6898b8b1282a

---

## ✅ Definition of Done

dApp siap submission ke MiniPay App Store kalau:

- [ ] Semua 3 blockers selesai (mainnet deploy + backend + frontend)
- [ ] Production URL HTTPS aktif
- [ ] Full flow tested di real Opera Mini device
- [ ] PWA manifest + icons lengkap
- [ ] Privacy policy + ToS published
- [ ] Logo, banner, screenshots ready
- [ ] Tidak ada popup signature di seluruh flow
- [ ] Performance Lighthouse mobile ≥ 80
- [ ] Crash-free rate > 99% dalam testing
- [ ] Treasury wallet (multisig) ready, fee policy documented + disclosed di UI
