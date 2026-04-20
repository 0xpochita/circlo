# MiniPay Integration Plan

## Context

- **Stack**: Next.js 16, wagmi v3, viem, SIWE, Celo Sepolia (chainId `11142220`).
- **Connector saat ini**: `injected()` dari `wagmi/connectors`, manual click di `ConnectStep.tsx`.
- **Auth**: SIWE → backend `authApi.nonce/verify` → JWT.
- **Token**: Mock USDT 6 decimals (Sepolia) di `lib/web3/contracts.ts`.

## Target

Aplikasi tetap jalan normal di MetaMask desktop, tapi kalau dibuka via MiniPay (Opera Mini) di mobile:

- Auto-connect tanpa tombol "Connect Wallet"
- Tidak ada popup signature MetaMask-style (MiniPay handle in-app)
- Tidak menampilkan UI chain switch / wallet picker
- (Opsional) Bayar gas pakai cUSD di mainnet
- (Opsional) Pakai cUSD bukan USDT untuk transaksi staking

## Requirements

- MiniPay hanya berjalan di **Celo Mainnet** (id `42220`) untuk user akhir.
- Untuk dev/test, pakai **MiniPay site test mode** di Opera Mini (Settings → Site Tests / Developer Mode).
- `viewport-fit=cover` + mobile-first — sudah OK di `app/layout.tsx`.

---

## Step 1 — Detection helper

File baru: `src/lib/web3/minipay.ts`

```ts
export function isMiniPay(): boolean {
  if (typeof window === "undefined") return false;
  const eth = (window as unknown as { ethereum?: { isMiniPay?: boolean } })
    .ethereum;
  return Boolean(eth?.isMiniPay);
}
```

Export dari `src/lib/web3/index.ts`.

---

## Step 2 — Wagmi config: tambah Celo mainnet + injected MiniPay

File: `src/lib/web3/config.ts`

```ts
import { celo } from "wagmi/chains";
import { defineChain } from "viem";
import { createConfig, http } from "wagmi";
import { injected } from "wagmi/connectors";

export const celoSepolia = defineChain({ /* unchanged */ });

export const config = createConfig({
  chains: [celoSepolia, celo],
  connectors: [
    injected({ shimDisconnect: false, target: "metaMask" }),
    // MiniPay terdeteksi sebagai injected dengan flag isMiniPay,
    // wagmi `injected()` default cukup; shimDisconnect=false biar MiniPay
    // tidak retry connect manual.
  ],
  transports: {
    [celoSepolia.id]: http("https://forno.celo-sepolia.celo-testnet.org"),
    [celo.id]: http("https://forno.celo.org"),
  },
});
```

> Catatan: production dApp di MiniPay = mainnet. Sepolia dipertahankan untuk dev/staging.

---

## Step 3 — Auto-connect di MiniPay

File: `src/components/pages/(onboarding)/ConnectStep.tsx`

```ts
import { isMiniPay } from "@/lib/web3";

useEffect(() => {
  if (isMiniPay()) {
    handleConnect();
  } else {
    disconnectAsync().catch(() => {});
  }
}, []);
```

Tambahan:

- Sembunyikan tombol "Connect Wallet" kalau `isMiniPay()` — ganti dengan loader full screen.
- Skip "Go back" button kalau MiniPay (user nggak bisa keluar dari dApp via tombol).

---

## Step 4 — SIWE flow tanpa popup di MiniPay

MiniPay support `personal_sign`, jadi `signMessageAsync` tetap jalan **tanpa** popup signature. UX-nya:

- Hilangkan teks "Sign the message in your wallet…" → ganti "Verifying…".
- Jangan tampilkan tombol abort selama signing (MiniPay sudah lock UI).
- Tetap simpan accessToken + refreshToken di localStorage seperti biasa.

```ts
setStatusText(isMiniPay() ? "Verifying..." : "Sign the message...");
```

---

## Step 5 — Network gating

MiniPay tidak punya network switcher. Kalau dApp pakai `celoSepolia` tapi MiniPay user di mainnet:

- Production build → set `chainId` ke `celo.id` di semua `useConnect`, `writeContractAsync`, `readContract`.
- Pisahkan `lib/web3/contracts.ts` jadi mainnet vs testnet via env:

```ts
const IS_MAINNET = process.env.NEXT_PUBLIC_USE_MAINNET === "true";
export const ACTIVE_CHAIN = IS_MAINNET ? celo : celoSepolia;
```

---

## Step 6 — Token: cUSD untuk MiniPay user

MiniPay user pegang **cUSD**, bukan mock USDT.

| Network | cUSD address |
|---|---|
| Celo Mainnet | `0x765DE816845861e75A25fCA122bb6898B8B1282a` |
| Alfajores | `0x874069Fa1Eb16D44d622F2e0Ca25eeA172369bC1` |

Update `contracts.ts`:

```ts
export const stableCoinAddress = IS_MAINNET
  ? ("0x765DE816845861e75A25fCA122bb6898B8B1282a" as const)
  : (process.env.NEXT_PUBLIC_USDT as `0x${string}`);
```

cUSD juga 18 decimals (bukan 6). Update `lib/web3/usdt.ts` jadi token-agnostic atau tambahkan helper baru `toCUSD/fromCUSD`. **Smart contract `MockUSDT` perlu diganti** dengan adapter cUSD untuk mainnet — koordinasi dengan tim sc.

---

## Step 7 — Gas-less / fee currency cUSD (opsional)

MiniPay support pay gas dengan cUSD via Celo `feeCurrency`:

```ts
import { celo } from "viem/chains";

const CUSD = "0x765DE816845861e75A25fCA122bb6898B8B1282a";

await writeContractAsync({
  address: predictionPoolContract.address,
  abi: predictionPoolContract.abi,
  functionName: "createGoal",
  args: [...],
  // viem celo chain accepts feeCurrency
  // @ts-expect-error celo-specific tx field
  feeCurrency: CUSD,
});
```

Catatan: tidak semua wagmi version meng-passthrough field ini. Alternatif: gunakan `viem`'s celo wallet client langsung untuk transaksi.

---

## Step 8 — UI conditionals

File-file yang harus aware MiniPay:

- `ConnectStep.tsx` → auto-connect, hide manual button
- `BottomNav.tsx` / wallet display → hide "Disconnect" button (MiniPay user tidak bisa disconnect)
- `ConfirmButton.tsx` → ubah label "Confirm in your wallet" → "Confirming…" (no popup expected)
- `JoinButton.tsx`, `StakeButton.tsx`, `ClaimRewardButton.tsx` → sama

Tambah hook helper `useMiniPay()` biar konsisten:

```ts
export function useMiniPay() {
  const [v, setV] = useState(false);
  useEffect(() => setV(isMiniPay()), []);
  return v;
}
```

---

## Step 9 — Layout & viewport

`app/layout.tsx`:

```ts
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#ffffff",
  userScalable: false,
};
```

Plus `<meta name="mobile-web-app-capable" content="yes" />` agar MiniPay treat sebagai standalone.

---

## Step 10 — Testing

### Lokal (tanpa MiniPay)

- Tambah toggle `?minipay=1` di URL untuk simulate detection (untuk QA UX).

```ts
export function isMiniPay(): boolean {
  if (typeof window === "undefined") return false;
  if (new URLSearchParams(window.location.search).get("minipay") === "1") return true;
  ...
}
```

### Real device

1. Install **Opera Mini** di Android.
2. Aktifkan **Mini Wallet** (top up via faucet untuk Alfajores).
3. Buka URL dApp di Opera Mini.
4. Untuk dev, gunakan **Site Tests**: Opera Settings → Developer → enable test mode untuk Alfajores.

### Checklist QA

- [ ] dApp auto-connect tanpa tombol di MiniPay
- [ ] SIWE selesai tanpa popup
- [ ] Create circle / join circle / create goal / stake / claim → semua transaksi sukses tanpa popup
- [ ] Tidak ada layout shift / horizontal scroll di Opera Mini viewport
- [ ] Logout button tidak tampil di MiniPay
- [ ] Error toast muncul kalau RPC gagal

---

## Migration order (rekomendasi)

1. **Step 1, 3, 8** — detection + auto-connect + UI conditionals (zero impact ke MetaMask user)
2. **Step 9, 10** — viewport + lokal QA simulator
3. **Step 2, 5** — multichain config (perlu env var split)
4. **Step 4** — SIWE label tweaks
5. **Step 6** — cUSD migration (block by deploy mainnet contract)
6. **Step 7** — fee currency cUSD (last, optional polish)

Step 1-4 + 8 + 10 bisa dikerjakan sekarang tanpa nunggu mainnet deploy.

---

## Referensi

- MiniPay docs: https://docs.celo.org/developer/build-on-minipay
- Celo cUSD/feeCurrency: https://docs.celo.org/developer/contractkit/usage
- viem Celo chain: https://viem.sh/docs/chains/celo
