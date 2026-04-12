# Circlo Smart Contract — Panduan Integrasi FE

> Dokumen ini untuk **Bima** (FE developer). Berisi semua yang perlu kamu tahu
> untuk berinteraksi dengan smart contract Circlo dari Next.js + viem + wagmi.

---

## Daftar Isi

1. [Network Setup](#1-network-setup)
2. [Contract Addresses & ABI](#2-contract-addresses--abi)
3. [MockUSDT — Faucet & Approve](#3-mockusdt--faucet--approve)
4. [CircleFactory — Semua Fungsi](#4-circlefactory--semua-fungsi)
5. [PredictionPool — Semua Fungsi](#5-predictionpool--semua-fungsi)
6. [ResolutionModule — Fungsi Resolver](#6-resolutionmodule--fungsi-resolver)
7. [Events — Listen dari FE](#7-events--listen-dari-fe)
8. [Payout Calculation](#8-payout-calculation)
9. [Error Handling](#9-error-handling)
10. [Testing Checklist](#10-testing-checklist)
11. [Catatan Penting MiniPay](#11-catatan-penting-minipay)

---

## 1. Network Setup

### Contract Addresses (Celo Sepolia Testnet)

```typescript
// src/lib/contracts.ts

export const CONTRACTS = {
  CIRCLE_FACTORY:    '0x6cB74ce06E35caEfaFA1491769DeeeA46aebe6Ab',
  PREDICTION_POOL:   '0x256d2067A074fB2fB6aE0081E86B6739c5CD6D12',
  RESOLUTION_MODULE: '0x5861CAAFDCAc4313f2c9941C4fd1291B34C2c4f5',
  USDT:              '0x09B97b024E399261D1633AA48Adc0671863E5c2B', // MockUSDT testnet
} as const

export const DEPLOY_BLOCK = 22631570n
```

### Setup viem + wagmi untuk Celo Sepolia

```typescript
// src/lib/wagmi.ts
import { createConfig, http } from 'wagmi'
import { celoSepolia } from 'wagmi/chains'   // ✅ celoSepolia, BUKAN celoAlfajores
import { injected } from 'wagmi/connectors'

export const wagmiConfig = createConfig({
  chains: [celoSepolia],
  connectors: [injected()],
  transports: {
    [celoSepolia.id]: http('https://forno.celo-sepolia.celo-testnet.org'),
  },
})

// Chain info untuk referensi
// chainId  : 11142220
// RPC      : https://forno.celo-sepolia.celo-testnet.org
// Explorer : https://celo-sepolia.blockscout.com
```

### Deteksi MiniPay & Auto-Connect

```typescript
// src/hooks/useMiniPay.ts
import { useEffect } from 'react'
import { useConnect } from 'wagmi'
import { injected } from 'wagmi/connectors'

export function useMiniPay() {
  const isMiniPay =
    typeof window !== 'undefined' && Boolean(window.ethereum?.isMiniPay)

  const { connect } = useConnect()

  useEffect(() => {
    // Auto-connect kalau di dalam MiniPay
    if (isMiniPay) {
      connect({ connector: injected() })
    }
  }, [isMiniPay, connect])

  return { isMiniPay }
}
```

```tsx
// src/components/ConnectButton.tsx
import { useMiniPay } from '@/hooks/useMiniPay'

export function ConnectButton() {
  const { isMiniPay } = useMiniPay()

  // 📌 Sembunyikan tombol connect kalau sudah di MiniPay (auto-connected)
  if (isMiniPay) return null

  return <button onClick={() => connect({ connector: injected() })}>Connect Wallet</button>
}
```

⚠️ **MiniPay = Legacy Transaction** — JANGAN set `maxFeePerGas` atau
`maxPriorityFeePerGas`. Biarkan viem handle otomatis. Lihat [Section 11](#11-catatan-penting-minipay).

---

## 2. Contract Addresses & ABI

### Ambil ABI dari hasil `forge build`

```bash
# Di folder sc/, jalankan:
forge build

# ABI ada di:
# sc/out/CircleFactory.sol/CircleFactory.json
# sc/out/PredictionPool.sol/PredictionPool.json
# sc/out/ResolutionModule.sol/ResolutionModule.json
# sc/out/MockUSDT.sol/MockUSDT.json
```

Salin ke frontend:

```bash
# Dari root project
cp sc/out/CircleFactory.sol/CircleFactory.json      frontend/src/lib/abis/CircleFactory.json
cp sc/out/PredictionPool.sol/PredictionPool.json    frontend/src/lib/abis/PredictionPool.json
cp sc/out/ResolutionModule.sol/ResolutionModule.json frontend/src/lib/abis/ResolutionModule.json
cp sc/out/MockUSDT.sol/MockUSDT.json                frontend/src/lib/abis/MockUSDT.json
```

### Setup client di viem

```typescript
// src/lib/viemClients.ts
import { createPublicClient, createWalletClient, custom, http } from 'viem'
import { celoSepolia } from 'viem/chains'

const RPC_URL = 'https://forno.celo-sepolia.celo-testnet.org'

// Public client — untuk membaca data dari contract (view functions)
export const publicClient = createPublicClient({
  chain: celoSepolia,
  transport: http(RPC_URL),
})

// Wallet client — untuk mengirim transaksi (write functions)
// Gunakan window.ethereum (MiniPay / MetaMask)
export function getWalletClient() {
  if (typeof window === 'undefined' || !window.ethereum) {
    throw new Error('No wallet found')
  }
  return createWalletClient({
    chain: celoSepolia,
    transport: custom(window.ethereum),
  })
}
```

### Import ABI

```typescript
// src/lib/abis/index.ts
import CircleFactoryJson    from './CircleFactory.json'
import PredictionPoolJson   from './PredictionPool.json'
import ResolutionModuleJson from './ResolutionModule.json'
import MockUSDTJson         from './MockUSDT.json'

// Ambil hanya field 'abi' dari JSON forge output
export const circleFactoryAbi    = CircleFactoryJson.abi    as const
export const predictionPoolAbi   = PredictionPoolJson.abi   as const
export const resolutionModuleAbi = ResolutionModuleJson.abi as const
export const mockUsdtAbi         = MockUSDTJson.abi         as const
```

### Contoh readContract dan writeContract

```typescript
import { publicClient, getWalletClient } from '@/lib/viemClients'
import { circleFactoryAbi } from '@/lib/abis'
import { CONTRACTS } from '@/lib/contracts'

// ── READ (tidak butuh wallet, gratis) ──────────────────────────────────────
const isMember = await publicClient.readContract({
  address: CONTRACTS.CIRCLE_FACTORY,
  abi: circleFactoryAbi,
  functionName: 'isCircleMember',
  args: [1n, '0xUserAddress'],  // args harus bigint untuk uint256
})

// ── WRITE (butuh wallet, bayar gas) ────────────────────────────────────────
const walletClient = getWalletClient()
const [account] = await walletClient.getAddresses()

// 1. Simulate dulu (validasi tanpa kirim txn)
const { request } = await publicClient.simulateContract({
  address: CONTRACTS.CIRCLE_FACTORY,
  abi: circleFactoryAbi,
  functionName: 'createCircle',
  args: [false, 'https://api.circlo.app/circles/1'],
  account,
})

// 2. Kirim transaksi
const hash = await walletClient.writeContract(request)

// 3. Tunggu konfirmasi
const receipt = await publicClient.waitForTransactionReceipt({ hash })
```

---

## 3. MockUSDT — Faucet & Approve

⚠️ **MockUSDT hanya ada di testnet (Celo Sepolia)**. Di mainnet, pakai USDT asli.

### Konversi USDT

```typescript
// src/lib/usdt.ts
import { parseUnits, formatUnits } from 'viem'

// ⚠️ USDT = 6 decimal. JANGAN pakai parseEther() — itu untuk 18 decimal!
export const toUsdt   = (amount: string)  => parseUnits(amount, 6)   // '1' → 1_000_000n
export const fromUsdt = (amount: bigint)  => formatUnits(amount, 6)  // 1_000_000n → '1'

// Contoh:
// 1 USDT    = parseUnits('1', 6)    = 1_000_000n
// 0.5 USDT  = parseUnits('0.5', 6) = 500_000n
// 100 USDT  = parseUnits('100', 6) = 100_000_000n
```

### faucet() — Dapat 100 USDT Gratis

Dipanggil dari halaman testing atau tombol "Get Test USDT".

```typescript
// src/hooks/useFaucet.ts
import { publicClient, getWalletClient } from '@/lib/viemClients'
import { mockUsdtAbi } from '@/lib/abis'
import { CONTRACTS } from '@/lib/contracts'

export async function claimFaucet(): Promise<string> {
  const walletClient = getWalletClient()
  const [account] = await walletClient.getAddresses()

  const { request } = await publicClient.simulateContract({
    address: CONTRACTS.USDT,
    abi: mockUsdtAbi,
    functionName: 'faucet',   // mint 100 USDT ke msg.sender
    account,
  })

  const hash = await walletClient.writeContract(request)
  await publicClient.waitForTransactionReceipt({ hash })

  return hash
}

// Di komponen:
// <button onClick={() => claimFaucet()}>Claim 100 USDT (Testnet)</button>
```

### allowance() — Cek Sisa Allowance

Selalu cek allowance sebelum stake, supaya tidak trigger approve 2x.

```typescript
// src/lib/usdt.ts

export async function getUsdtAllowance(
  owner: `0x${string}`,
  spender: `0x${string}`,
): Promise<bigint> {
  return publicClient.readContract({
    address: CONTRACTS.USDT,
    abi: mockUsdtAbi,
    functionName: 'allowance',
    args: [owner, spender],
  })
}

// Contoh cek apakah perlu approve:
const allowance = await getUsdtAllowance(userAddress, CONTRACTS.PREDICTION_POOL)
const needsApprove = allowance < stakeAmount
```

### approve() — Izinkan PredictionPool Ambil USDT

⚠️ **Wajib dipanggil sebelum `stake()`**. Kalau tidak approve dulu, transaksi stake
akan gagal dengan error `ERC20InsufficientAllowance`.

```typescript
// src/lib/usdt.ts

export async function approveUsdt(
  spender: `0x${string}`,
  amount: bigint,
): Promise<string> {
  const walletClient = getWalletClient()
  const [account] = await walletClient.getAddresses()

  const { request } = await publicClient.simulateContract({
    address: CONTRACTS.USDT,
    abi: mockUsdtAbi,
    functionName: 'approve',
    args: [spender, amount],
    account,
  })

  const hash = await walletClient.writeContract(request)
  await publicClient.waitForTransactionReceipt({ hash })
  return hash
}
```

### Flow 2-Step: Approve → Stake

Tampilkan progress "Step 1/2: Approve" dan "Step 2/2: Stake" di UI.

```typescript
// src/hooks/useStake.ts
import { parseUnits } from 'viem'
import { getUsdtAllowance, approveUsdt } from '@/lib/usdt'
import { CONTRACTS } from '@/lib/contracts'
import { publicClient, getWalletClient } from '@/lib/viemClients'
import { predictionPoolAbi } from '@/lib/abis'

type StakeStep = 'idle' | 'approving' | 'staking' | 'done' | 'error'

export async function stakeWithApprove(
  goalId: bigint,
  side: 0 | 1,         // 0 = No, 1 = Yes
  amountUsdt: string,  // misal: '5' untuk 5 USDT
  onStep: (step: StakeStep) => void,
): Promise<string> {
  const walletClient  = getWalletClient()
  const [account]     = await walletClient.getAddresses()
  const amount        = parseUnits(amountUsdt, 6) // konversi ke 6 decimal

  try {
    // ── STEP 1: Approve (kalau allowance tidak cukup) ─────────────────────
    const allowance = await getUsdtAllowance(account, CONTRACTS.PREDICTION_POOL)

    if (allowance < amount) {
      onStep('approving')
      await approveUsdt(CONTRACTS.PREDICTION_POOL, amount)
      // Atau approve MAX agar tidak perlu approve lagi:
      // await approveUsdt(CONTRACTS.PREDICTION_POOL, maxUint256)
    }

    // ── STEP 2: Stake ─────────────────────────────────────────────────────
    onStep('staking')
    const { request } = await publicClient.simulateContract({
      address: CONTRACTS.PREDICTION_POOL,
      abi: predictionPoolAbi,
      functionName: 'stake',
      args: [goalId, side, amount],
      account,
    })

    const hash = await walletClient.writeContract(request)
    await publicClient.waitForTransactionReceipt({ hash })

    onStep('done')
    return hash

  } catch (err) {
    onStep('error')
    throw err
  }
}

// Di komponen React:
// const [step, setStep] = useState<StakeStep>('idle')
//
// <button onClick={() => stakeWithApprove(goalId, 1, '5', setStep)}>
//   Stake 5 USDT — Yes
// </button>
//
// {step === 'approving' && <p>Step 1/2: Approving USDT...</p>}
// {step === 'staking'   && <p>Step 2/2: Staking...</p>}
// {step === 'done'      && <p>Stake berhasil! ✅</p>}
```

---

## 4. CircleFactory — Semua Fungsi

Contract address: `0x6cB74ce06E35caEfaFA1491769DeeeA46aebe6Ab`

---

### `createCircle` — Buat Circle Baru

Dipanggil setelah user submit form "Buat Circle". `metadataURI` didapat dari
response backend setelah POST `/circles`.

```typescript
// src/lib/circleFactory.ts
import { parseEventLogs } from 'viem'
import { publicClient, getWalletClient } from '@/lib/viemClients'
import { circleFactoryAbi } from '@/lib/abis'
import { CONTRACTS } from '@/lib/contracts'

export async function createCircle(
  isPrivate: boolean,
  metadataURI: string,   // URL dari backend: 'https://api.circlo.app/circles/123'
): Promise<{ hash: string; circleId: bigint }> {
  const walletClient = getWalletClient()
  const [account]    = await walletClient.getAddresses()

  const { request } = await publicClient.simulateContract({
    address: CONTRACTS.CIRCLE_FACTORY,
    abi: circleFactoryAbi,
    functionName: 'createCircle',
    args: [isPrivate, metadataURI],
    account,
  })

  const hash    = await walletClient.writeContract(request)
  const receipt = await publicClient.waitForTransactionReceipt({ hash })

  // Parse event untuk ambil circleId yang baru dibuat
  const logs = parseEventLogs({
    abi: circleFactoryAbi,
    eventName: 'CircleCreated',
    logs: receipt.logs,
  })

  const circleId = logs[0].args.id
  return { hash, circleId }
}

// Event yang di-emit:
// CircleCreated(uint256 indexed id, address indexed owner, bool isPrivate, string metadataURI)
```

**Error yang mungkin:**
| Error | Penyebab | Cara Handle |
|-------|----------|-------------|
| Wallet not connected | User belum connect | Redirect ke connect wallet |

---

### `joinCircle` — Gabung Circle Public

Dipanggil saat user klik tombol "Join" di circle yang `isPrivate = false`.

```typescript
export async function joinCircle(circleId: bigint): Promise<string> {
  const walletClient = getWalletClient()
  const [account]    = await walletClient.getAddresses()

  const { request } = await publicClient.simulateContract({
    address: CONTRACTS.CIRCLE_FACTORY,
    abi: circleFactoryAbi,
    functionName: 'joinCircle',
    args: [circleId],
    account,
  })

  const hash = await walletClient.writeContract(request)
  await publicClient.waitForTransactionReceipt({ hash })
  return hash
}

// Event yang di-emit:
// CircleJoined(uint256 indexed id, address indexed member)
```

**Error yang mungkin:**
| Error | Penyebab | Cara Handle |
|-------|----------|-------------|
| `CircleIsPrivate()` | Circle ini private, pakai invite | Tampilkan "Circle ini private. Minta invite dari owner." |
| `AlreadyMember()` | User sudah member | Tampilkan "Kamu sudah member circle ini" |
| `CircleNotFound()` | Circle ID tidak valid | Tampilkan "Circle tidak ditemukan" |

---

### `joinCirclePrivate` — Gabung Circle Private dengan Invite

`inviteProof` didapat dari backend setelah owner generate invite link.
Backend yang handle proses EIP-712 signing, FE tinggal pakai hasilnya.

```typescript
export async function joinCirclePrivate(
  circleId: bigint,
  inviteProof: `0x${string}`,   // bytes dari backend (sudah abi.encode)
): Promise<string> {
  const walletClient = getWalletClient()
  const [account]    = await walletClient.getAddresses()

  const { request } = await publicClient.simulateContract({
    address: CONTRACTS.CIRCLE_FACTORY,
    abi: circleFactoryAbi,
    functionName: 'joinCirclePrivate',
    args: [circleId, inviteProof],
    account,
  })

  const hash = await walletClient.writeContract(request)
  await publicClient.waitForTransactionReceipt({ hash })
  return hash
}
```

📌 **Format `inviteProof`** yang di-generate backend:
```typescript
// Ini dikerjakan di BACKEND (bukan FE), tapi untuk referensi:
// inviteProof = abi.encode(bytes signature, uint256 expiry)
// Artinya backend kirim JSON seperti:
// { "inviteProof": "0xaabbcc....", "circleId": 1, "expiry": 1700000000 }
// FE tinggal pakai inviteProof-nya langsung
```

**Error yang mungkin:**
| Error | Penyebab | Cara Handle |
|-------|----------|-------------|
| `InvalidProof()` | Tanda tangan tidak valid / bukan dari owner | Tampilkan "Invite tidak valid" |
| `ProofExpired()` | Invite sudah kedaluwarsa | Tampilkan "Invite sudah expired. Minta invite baru." |
| `AlreadyMember()` | User sudah member | Tampilkan "Kamu sudah member circle ini" |

---

### `isCircleMember` — Cek Status Membership

Dipakai untuk gate fitur "hanya member yang bisa lihat goals circle ini".

```typescript
export async function isCircleMember(
  circleId: bigint,
  userAddress: `0x${string}`,
): Promise<boolean> {
  return publicClient.readContract({
    address: CONTRACTS.CIRCLE_FACTORY,
    abi: circleFactoryAbi,
    functionName: 'isCircleMember',
    args: [circleId, userAddress],
  })
}

// Contoh penggunaan di komponen:
// const isMember = await isCircleMember(1n, address)
// if (!isMember) router.push('/circles') // redirect kalau bukan member
```

---

### `getMembers` — Ambil Daftar Member (Paginated)

```typescript
export async function getCircleMembers(
  circleId: bigint,
  page: number = 0,
  pageSize: number = 20,
): Promise<readonly `0x${string}`[]> {
  const offset = BigInt(page * pageSize)
  const limit  = BigInt(pageSize)

  return publicClient.readContract({
    address: CONTRACTS.CIRCLE_FACTORY,
    abi: circleFactoryAbi,
    functionName: 'getMembers',
    args: [circleId, offset, limit],
  })
}

// Contoh: ambil page pertama (member 0–19)
const members = await getCircleMembers(1n, 0, 20)
// [0x123..., 0x456..., ...]

// Contoh: page kedua (member 20–39)
const page2 = await getCircleMembers(1n, 1, 20)
```

---

### `getCircle` — Ambil Data Circle

```typescript
export async function getCircle(circleId: bigint) {
  return publicClient.readContract({
    address: CONTRACTS.CIRCLE_FACTORY,
    abi: circleFactoryAbi,
    functionName: 'getCircle',
    args: [circleId],
  })
}

// Return type:
// {
//   owner      : `0x${string}`
//   isPrivate  : boolean
//   createdAt  : bigint   (unix timestamp)
//   metadataURI: string
// }
```

---

## 5. PredictionPool — Semua Fungsi

Contract address: `0x256d2067A074fB2fB6aE0081E86B6739c5CD6D12`

⚠️ **Side encoding** (penting, jangan terbalik!):
- **Side 0 = No**
- **Side 1 = Yes**

---

### `createGoal` — Buat Goal Baru

Dipanggil setelah user submit form "Buat Prediction". `metadataURI` didapat dari
backend setelah POST `/goals`.

```typescript
// src/lib/predictionPool.ts
import { parseEventLogs, parseUnits } from 'viem'
import { publicClient, getWalletClient } from '@/lib/viemClients'
import { predictionPoolAbi } from '@/lib/abis'
import { CONTRACTS } from '@/lib/contracts'

export async function createGoal(params: {
  circleId    : bigint
  deadline    : Date           // JavaScript Date → dikonversi ke unix timestamp
  minStakeUsdt: string         // misal '1' untuk 1 USDT minimum
  resolverList: `0x${string}`[]
  metadataURI : string         // dari backend POST /goals
}): Promise<{ hash: string; goalId: bigint }> {
  const walletClient = getWalletClient()
  const [account]    = await walletClient.getAddresses()

  // Konversi
  const deadline  = BigInt(Math.floor(params.deadline.getTime() / 1000))  // ms → seconds
  const minStake  = parseUnits(params.minStakeUsdt, 6)                    // USDT 6 decimal
  const outcomeType = 0  // 0 = Binary (v1 hanya Binary)

  // Validasi deadline minimal 1 jam dari sekarang
  const nowSeconds = BigInt(Math.floor(Date.now() / 1000))
  if (deadline <= nowSeconds + 3600n) {
    throw new Error('Deadline harus minimal 1 jam dari sekarang')
  }

  const { request } = await publicClient.simulateContract({
    address: CONTRACTS.PREDICTION_POOL,
    abi: predictionPoolAbi,
    functionName: 'createGoal',
    args: [
      params.circleId,
      outcomeType,           // uint8: 0=Binary, 1=Multi, 2=Numeric
      deadline,              // uint64: unix timestamp detik
      minStake,              // uint128: dalam 6 decimal
      params.resolverList,   // address[]
      params.metadataURI,    // string
    ],
    account,
  })

  const hash    = await walletClient.writeContract(request)
  const receipt = await publicClient.waitForTransactionReceipt({ hash })

  // Ambil goalId dari event
  const logs = parseEventLogs({
    abi: predictionPoolAbi,
    eventName: 'GoalCreated',
    logs: receipt.logs,
  })

  const goalId = logs[0].args.id
  return { hash, goalId }
}

// Event yang di-emit:
// GoalCreated(
//   uint256 indexed id, uint256 indexed circleId, address indexed creator,
//   uint8 outcomeType, uint64 deadline, uint128 minStake,
//   address[] resolvers, string metadataURI
// )
```

**Error yang mungkin:**
| Error | Penyebab | Cara Handle |
|-------|----------|-------------|
| `NotCircleMember()` | Caller bukan member circle | Redirect ke halaman circle |
| `DeadlineTooSoon()` | Deadline < sekarang + 1 jam | Validasi di form sebelum submit |
| `NoResolvers()` | Daftar resolver kosong | Validasi di form: minimal 1 resolver |
| `TooManyResolvers()` | > 32 resolver | Batasi input di form max 32 |
| `ResolverNotMember()` | Ada resolver yang bukan member circle | Tampilkan mana yang bukan member |

---

### `stake` — Stake USDT pada Goal

⚠️ **Wajib approve USDT dulu** sebelum stake. Pakai `stakeWithApprove()` dari
[Section 3](#flow-2-step-approve--stake) yang sudah include flow approve.

```typescript
// Versi bare (tanpa approve flow) — pakai kalau sudah approve sebelumnya
export async function stake(
  goalId: bigint,
  side: 0 | 1,         // 0 = No, 1 = Yes
  amountUsdt: string,  // misal '5' untuk 5 USDT
): Promise<string> {
  const walletClient = getWalletClient()
  const [account]    = await walletClient.getAddresses()
  const amount       = parseUnits(amountUsdt, 6)

  const { request } = await publicClient.simulateContract({
    address: CONTRACTS.PREDICTION_POOL,
    abi: predictionPoolAbi,
    functionName: 'stake',
    args: [goalId, side, amount],
    account,
  })

  const hash = await walletClient.writeContract(request)
  await publicClient.waitForTransactionReceipt({ hash })
  return hash
}

// ⚠️ Untuk usage production, pakai stakeWithApprove() dari Section 3!
// Event yang di-emit:
// Staked(uint256 indexed goalId, address indexed user, uint8 side, uint256 amount)
```

**Error yang mungkin:**
| Error | Penyebab | Cara Handle |
|-------|----------|-------------|
| `GoalNotOpen()` | Goal bukan status Open | Disable tombol stake di UI |
| `DeadlinePassed()` | Deadline sudah lewat | Disable tombol stake, tampilkan "Closed" |
| `BelowMinStake()` | Amount < minStake | Tampilkan minimum di form |
| `CannotSwitchSides()` | Sudah stake di sisi lain | Tampilkan "Sudah stake di sisi lain" |
| `NotCircleMember()` | Caller bukan member | Redirect ke halaman circle |
| `ERC20InsufficientAllowance` | Belum approve USDT | Trigger approve flow (Step 1/2) |

---

### `lockGoal` — Kunci Goal setelah Deadline

Siapa saja bisa panggil setelah deadline lewat. Biasanya dipanggil oleh sistem
(backend job) atau bisa dari FE kalau user klik "Lock Goal".

```typescript
export async function lockGoal(goalId: bigint): Promise<string> {
  const walletClient = getWalletClient()
  const [account]    = await walletClient.getAddresses()

  const { request } = await publicClient.simulateContract({
    address: CONTRACTS.PREDICTION_POOL,
    abi: predictionPoolAbi,
    functionName: 'lockGoal',
    args: [goalId],
    account,
  })

  const hash = await walletClient.writeContract(request)
  await publicClient.waitForTransactionReceipt({ hash })
  return hash
}

// Event yang di-emit:
// GoalLocked(uint256 indexed goalId)
```

**Error yang mungkin:**
| Error | Penyebab | Cara Handle |
|-------|----------|-------------|
| `DeadlineNotPassed()` | Deadline belum lewat | Disable tombol, tampilkan countdown |
| `GoalNotOpen()` | Goal sudah locked/resolved | Jangan tampilkan tombol |

---

### `claim` — Ambil Kemenangan

Hanya bisa dipanggil oleh pemenang (yang stake di sisi yang menang).
Status goal harus `PaidOut` (= 5).

```typescript
export async function claim(goalId: bigint): Promise<string> {
  const walletClient = getWalletClient()
  const [account]    = await walletClient.getAddresses()

  const { request } = await publicClient.simulateContract({
    address: CONTRACTS.PREDICTION_POOL,
    abi: predictionPoolAbi,
    functionName: 'claim',
    args: [goalId],
    account,
  })

  const hash = await walletClient.writeContract(request)
  await publicClient.waitForTransactionReceipt({ hash })
  return hash
}

// Event yang di-emit:
// Claimed(uint256 indexed goalId, address indexed user, uint256 amount)
```

**Error yang mungkin:**
| Error | Penyebab | Cara Handle |
|-------|----------|-------------|
| `GoalNotPaidOut()` | Goal belum resolved | Disable tombol claim |
| `NothingToClaim()` | User stake di sisi yang kalah | Tampilkan "Kamu tidak menang di goal ini" |
| `AlreadyClaimed()` | Sudah pernah claim | Tampilkan "Sudah di-claim" |

---

### `refund` — Refund jika Goal Disputed

Dipanggil saat goal statusnya `Disputed` (= 4). Semua staker bisa refund
sesuai jumlah stake mereka.

```typescript
export async function refund(goalId: bigint): Promise<string> {
  const walletClient = getWalletClient()
  const [account]    = await walletClient.getAddresses()

  const { request } = await publicClient.simulateContract({
    address: CONTRACTS.PREDICTION_POOL,
    abi: predictionPoolAbi,
    functionName: 'refund',
    args: [goalId],
    account,
  })

  const hash = await walletClient.writeContract(request)
  await publicClient.waitForTransactionReceipt({ hash })
  return hash
}

// Event yang di-emit (hanya sekali per goal):
// GoalRefunded(uint256 indexed goalId)
```

**Error yang mungkin:**
| Error | Penyebab | Cara Handle |
|-------|----------|-------------|
| `GoalNotDisputed()` | Goal bukan status Disputed | Jangan tampilkan tombol refund |
| `NothingToClaim()` | User tidak punya stake di goal ini | Tidak perlu tampilkan tombol |
| `AlreadyClaimed()` | Sudah refund | Tampilkan "Sudah di-refund" |

---

### Read Functions — Ambil Data Goal

```typescript
// ── goals(goalId) — ambil semua data goal ──────────────────────────────────
export async function getGoal(goalId: bigint) {
  return publicClient.readContract({
    address: CONTRACTS.PREDICTION_POOL,
    abi: predictionPoolAbi,
    functionName: 'goals',
    args: [goalId],
  })
}

// Return type:
// {
//   circleId   : bigint
//   creator    : `0x${string}`
//   outcomeType: number   // 0=Binary, 1=Multi, 2=Numeric
//   status     : number   // 0=Open, 1=Locked, 2=Resolving, 3=Resolved, 4=Disputed, 5=PaidOut
//   deadline   : bigint   // unix timestamp
//   minStake   : bigint   // dalam 6 decimal
//   totalPool  : bigint   // total USDT di pool
//   winningSide: number   // 0=No, 1=Yes, 255=belum diputuskan
//   metadataURI: string
// }

// Helper untuk decode status
export const GOAL_STATUS = {
  0: 'Open',
  1: 'Locked',
  2: 'Resolving',
  3: 'Resolved',
  4: 'Disputed',
  5: 'PaidOut',
} as const

// ── poolPerSide(goalId, side) — total USDT di setiap sisi ──────────────────
export async function getPoolPerSide(goalId: bigint, side: 0 | 1): Promise<bigint> {
  return publicClient.readContract({
    address: CONTRACTS.PREDICTION_POOL,
    abi: predictionPoolAbi,
    functionName: 'poolPerSide',
    args: [goalId, side],
  })
}

// Contoh: tampilkan pool di UI
const noPool  = await getPoolPerSide(goalId, 0)  // USDT di sisi No
const yesPool = await getPoolPerSide(goalId, 1)  // USDT di sisi Yes

// ── stakeOf(goalId, user, side) — stake user di sisi tertentu ──────────────
export async function getUserStake(
  goalId: bigint,
  userAddress: `0x${string}`,
  side: 0 | 1,
): Promise<bigint> {
  return publicClient.readContract({
    address: CONTRACTS.PREDICTION_POOL,
    abi: predictionPoolAbi,
    functionName: 'stakeOf',
    args: [goalId, userAddress, side],
  })
}

// ── isResolver(goalId, user) — cek apakah user adalah resolver ─────────────
export async function checkIsResolver(
  goalId: bigint,
  userAddress: `0x${string}`,
): Promise<boolean> {
  return publicClient.readContract({
    address: CONTRACTS.PREDICTION_POOL,
    abi: predictionPoolAbi,
    functionName: 'isResolver',
    args: [goalId, userAddress],
  })
}
```

---

## 6. ResolutionModule — Fungsi Resolver

Contract address: `0x5861CAAFDCAc4313f2c9941C4fd1291B34C2c4f5`

Resolver adalah member circle yang dipilih creator untuk vote outcome.
Hanya ditampilkan UI voting kalau user memang resolver dari goal tersebut.

### `submitVote` — Submit Vote sebagai Resolver

```typescript
// src/lib/resolutionModule.ts
import { publicClient, getWalletClient } from '@/lib/viemClients'
import { resolutionModuleAbi } from '@/lib/abis'
import { CONTRACTS } from '@/lib/contracts'

export async function submitVote(
  goalId: bigint,
  choice: 0 | 1,   // 0 = No, 1 = Yes
): Promise<string> {
  const walletClient = getWalletClient()
  const [account]    = await walletClient.getAddresses()

  const { request } = await publicClient.simulateContract({
    address: CONTRACTS.RESOLUTION_MODULE,
    abi: resolutionModuleAbi,
    functionName: 'submitVote',
    args: [goalId, choice],
    account,
  })

  const hash = await walletClient.writeContract(request)
  await publicClient.waitForTransactionReceipt({ hash })
  return hash
}

// ⚠️ Setelah vote mencapai kuorum (>51% resolver), goal otomatis di-finalize
// di dalam transaksi ini. Tidak perlu panggil finalize() terpisah.

// Event yang di-emit:
// VoteSubmitted(uint256 indexed goalId, address indexed resolver, uint8 choice)
// + otomatis: GoalFinalized / GoalDisputed jika kuorum tercapai
```

**Cek apakah user sudah vote:**
```typescript
export async function hasVoted(
  goalId: bigint,
  userAddress: `0x${string}`,
): Promise<boolean> {
  const [, voted] = await publicClient.readContract({
    address: CONTRACTS.RESOLUTION_MODULE,
    abi: resolutionModuleAbi,
    functionName: 'votes',
    args: [goalId, userAddress],
  })
  return voted
}
```

**Error yang mungkin:**
| Error | Penyebab | Cara Handle |
|-------|----------|-------------|
| `NotResolver()` | User bukan resolver goal ini | Jangan tampilkan UI voting |
| `AlreadyVoted()` | Sudah vote | Tampilkan "Sudah vote" |
| `VoteWindowExpired()` | 72 jam voting sudah habis | Tampilkan "Waktu voting habis. Tunggu finalize." |
| `AlreadyFinalized()` | Goal sudah di-finalize | Tidak perlu vote lagi |

---

### `finalize` — Finalisasi Hasil Vote

Dipanggil siapa saja setelah vote window (72 jam) habis, atau kalau kuorum sudah
tercapai tapi belum ter-finalize. Biasanya dipanggil oleh backend job, tapi bisa
juga dari FE.

```typescript
export async function finalize(goalId: bigint): Promise<string> {
  const walletClient = getWalletClient()
  const [account]    = await walletClient.getAddresses()

  const { request } = await publicClient.simulateContract({
    address: CONTRACTS.RESOLUTION_MODULE,
    abi: resolutionModuleAbi,
    functionName: 'finalize',
    args: [goalId],
    account,
  })

  const hash = await walletClient.writeContract(request)
  await publicClient.waitForTransactionReceipt({ hash })
  return hash
}

// Event yang di-emit:
// GoalFinalized(uint256 indexed goalId, uint8 winningChoice)  ← kalau ada winner
// GoalDisputed(uint256 indexed goalId)                        ← kalau seri/0 vote
```

**Error yang mungkin:**
| Error | Penyebab | Cara Handle |
|-------|----------|-------------|
| `CannotFinalizeYet()` | Kuorum belum tercapai dan window belum expired | Tunggu, atau tampilkan countdown |
| `AlreadyFinalized()` | Sudah di-finalize | Tidak perlu dipanggil lagi |

---

### `getTally` — Ambil Hasil Vote Saat Ini

```typescript
export async function getVoteTally(goalId: bigint) {
  const [counts, total] = await publicClient.readContract({
    address: CONTRACTS.RESOLUTION_MODULE,
    abi: resolutionModuleAbi,
    functionName: 'getTally',
    args: [goalId],
  })

  return {
    noVotes:   counts[0],   // jumlah vote untuk No (side 0)
    yesVotes:  counts[1],   // jumlah vote untuk Yes (side 1)
    total,                  // total semua vote
  }
}

// Contoh di UI:
// const { noVotes, yesVotes, total } = await getVoteTally(goalId)
// <p>Yes: {yesVotes.toString()} / No: {noVotes.toString()} / Total: {total.toString()}</p>
```

---

## 7. Events — Listen dari FE

### Cara Listen Event dengan viem

```typescript
// src/hooks/useContractEvents.ts
import { publicClient } from '@/lib/viemClients'
import { circleFactoryAbi, predictionPoolAbi, resolutionModuleAbi } from '@/lib/abis'
import { CONTRACTS } from '@/lib/contracts'

// watchContractEvent — real-time listener (aktif selama komponen mounted)
// getLogs — one-time fetch riwayat events (untuk load data awal)
```

---

### Events dari CircleFactory

#### `CircleCreated`

```typescript
// Listen real-time
const unwatch = publicClient.watchContractEvent({
  address: CONTRACTS.CIRCLE_FACTORY,
  abi: circleFactoryAbi,
  eventName: 'CircleCreated',
  onLogs: (logs) => {
    logs.forEach((log) => {
      console.log('Circle baru:', {
        id:          log.args.id,          // bigint
        owner:       log.args.owner,       // address
        isPrivate:   log.args.isPrivate,   // boolean
        metadataURI: log.args.metadataURI, // string
      })
    })
  },
})
// Panggil unwatch() saat komponen unmount

// Fetch riwayat (sejak deploy)
const logs = await publicClient.getLogs({
  address: CONTRACTS.CIRCLE_FACTORY,
  event: {
    type: 'event',
    name: 'CircleCreated',
    inputs: [
      { name: 'id',          type: 'uint256', indexed: true  },
      { name: 'owner',       type: 'address', indexed: true  },
      { name: 'isPrivate',   type: 'bool',    indexed: false },
      { name: 'metadataURI', type: 'string',  indexed: false },
    ],
  },
  fromBlock: DEPLOY_BLOCK,
  toBlock:   'latest',
})
```

#### `CircleJoined` dan `CircleLeft`

```typescript
// Listen member join/leave untuk update member list real-time
publicClient.watchContractEvent({
  address: CONTRACTS.CIRCLE_FACTORY,
  abi: circleFactoryAbi,
  eventName: 'CircleJoined',
  args: { id: circleId },  // filter hanya circle tertentu
  onLogs: (logs) => {
    const newMember = logs[0].args.member  // address member baru
    // Update state member list di FE
  },
})

publicClient.watchContractEvent({
  address: CONTRACTS.CIRCLE_FACTORY,
  abi: circleFactoryAbi,
  eventName: 'CircleLeft',
  args: { id: circleId },
  onLogs: (logs) => {
    const leftMember = logs[0].args.member
    // Hapus dari member list di FE
  },
})
```

---

### Events dari PredictionPool

#### `GoalCreated`

```typescript
// Filter goals dari circle tertentu
publicClient.watchContractEvent({
  address: CONTRACTS.PREDICTION_POOL,
  abi: predictionPoolAbi,
  eventName: 'GoalCreated',
  args: { circleId },  // filter indexed parameter
  onLogs: (logs) => {
    logs.forEach((log) => {
      console.log('Goal baru:', {
        id:          log.args.id,          // bigint — goalId
        circleId:    log.args.circleId,    // bigint
        creator:     log.args.creator,     // address
        outcomeType: log.args.outcomeType, // 0=Binary
        deadline:    log.args.deadline,    // bigint unix timestamp
        minStake:    log.args.minStake,    // bigint 6 decimal
        resolvers:   log.args.resolvers,   // address[]
        metadataURI: log.args.metadataURI, // string
      })
    })
  },
})
```

#### `Staked`

```typescript
// Untuk update pool size real-time saat ada yang stake
publicClient.watchContractEvent({
  address: CONTRACTS.PREDICTION_POOL,
  abi: predictionPoolAbi,
  eventName: 'Staked',
  args: { goalId },
  onLogs: (logs) => {
    logs.forEach((log) => {
      // log.args.side   : 0=No, 1=Yes
      // log.args.amount : bigint (6 decimal)
      // Re-fetch poolPerSide untuk update tampilan odds
    })
  },
})
```

#### `GoalLocked`, `GoalResolved`, `GoalRefunded`, `Claimed`

```typescript
// Update status goal saat ada perubahan
publicClient.watchContractEvent({
  address: CONTRACTS.PREDICTION_POOL,
  abi: predictionPoolAbi,
  eventName: 'GoalResolved',
  args: { goalId },
  onLogs: (logs) => {
    const winningSide = logs[0].args.winningSide  // 0=No, 1=Yes
    // Update UI: tampilkan siapa pemenang, aktifkan tombol Claim
  },
})

publicClient.watchContractEvent({
  address: CONTRACTS.PREDICTION_POOL,
  abi: predictionPoolAbi,
  eventName: 'Claimed',
  args: { goalId },
  onLogs: (logs) => {
    // log.args.user   : address yang claim
    // log.args.amount : bigint jumlah yang diclaim (6 decimal)
  },
})
```

---

### Events dari ResolutionModule

```typescript
// Update hasil voting real-time
publicClient.watchContractEvent({
  address: CONTRACTS.RESOLUTION_MODULE,
  abi: resolutionModuleAbi,
  eventName: 'VoteSubmitted',
  args: { goalId },
  onLogs: (logs) => {
    // log.args.resolver : address resolver
    // log.args.choice   : 0=No, 1=Yes
    // Re-fetch getTally() untuk update vote count
  },
})

publicClient.watchContractEvent({
  address: CONTRACTS.RESOLUTION_MODULE,
  abi: resolutionModuleAbi,
  eventName: 'GoalFinalized',
  args: { goalId },
  onLogs: (logs) => {
    const winningChoice = logs[0].args.winningChoice  // 0=No, 1=Yes
    // Goal sekarang PaidOut, aktifkan tombol Claim untuk pemenang
  },
})

publicClient.watchContractEvent({
  address: CONTRACTS.RESOLUTION_MODULE,
  abi: resolutionModuleAbi,
  eventName: 'GoalDisputed',
  args: { goalId },
  onLogs: () => {
    // Goal Disputed, aktifkan tombol Refund untuk semua staker
  },
})
```

---

## 8. Payout Calculation

Tampilkan estimasi payout sebelum user stake, supaya user tahu berapa yang akan
didapat kalau menang.

### Formula Payout

```
payout = userStake + (userStake × losingPool) / winningPool
```

- `userStake` = jumlah USDT user stake
- `winningPool` = total pool di sisi yang dipilih user (sisi yang akan menang)
- `losingPool` = total pool di sisi lawan

### Contoh Kode

```typescript
// src/lib/payout.ts
import { formatUnits } from 'viem'
import { getPoolPerSide } from '@/lib/predictionPool'

export async function estimatePayout(
  goalId: bigint,
  userSide: 0 | 1,     // sisi yang akan dipilih user
  stakeAmountUsdt: string,  // misal '5'
): Promise<{
  estimatedPayout: string  // dalam USDT, formatted
  potentialProfit: string  // keuntungan bersih
  odds:            string  // misal '2.5x'
}> {
  const userStake = BigInt(parseFloat(stakeAmountUsdt) * 1_000_000)

  // Ambil pool saat ini dari contract
  const winSidePool  = await getPoolPerSide(goalId, userSide)
  const loseSidePool = await getPoolPerSide(goalId, userSide === 0 ? 1 : 0)

  // Pool setelah user stake (simulasi)
  const totalWinPool = winSidePool + userStake

  // Kalau belum ada yang stake di sisi lawan
  if (loseSidePool === 0n) {
    return {
      estimatedPayout: stakeAmountUsdt,  // hanya dapat balik modal
      potentialProfit: '0',
      odds: '1x',
    }
  }

  // Hitung payout
  const payout = userStake + (userStake * loseSidePool) / totalWinPool
  const profit = payout - userStake

  return {
    estimatedPayout: formatUnits(payout, 6),
    potentialProfit: formatUnits(profit, 6),
    odds: (Number(payout) / Number(userStake)).toFixed(2) + 'x',
  }
}

// Contoh di komponen:
// const preview = await estimatePayout(goalId, 1, '5')
// <p>Estimasi kemenangan: {preview.estimatedPayout} USDT ({preview.odds})</p>
// <p>Potensi profit: +{preview.potentialProfit} USDT</p>
```

### Tampilkan Pool Saat Ini

```typescript
// src/hooks/useGoalPools.ts
import { formatUnits } from 'viem'
import { useReadContracts } from 'wagmi'
import { predictionPoolAbi } from '@/lib/abis'
import { CONTRACTS } from '@/lib/contracts'

export function useGoalPools(goalId: bigint) {
  const { data } = useReadContracts({
    contracts: [
      {
        address: CONTRACTS.PREDICTION_POOL,
        abi: predictionPoolAbi,
        functionName: 'poolPerSide',
        args: [goalId, 0],  // No pool
      },
      {
        address: CONTRACTS.PREDICTION_POOL,
        abi: predictionPoolAbi,
        functionName: 'poolPerSide',
        args: [goalId, 1],  // Yes pool
      },
    ],
  })

  const noPool  = data?.[0]?.result ?? 0n
  const yesPool = data?.[1]?.result ?? 0n
  const total   = noPool + yesPool

  return {
    noPool:       formatUnits(noPool, 6),   // '10.5'
    yesPool:      formatUnits(yesPool, 6),  // '5.0'
    total:        formatUnits(total, 6),    // '15.5'
    noPercent:    total > 0n ? Number(noPool * 100n / total) : 50,
    yesPercent:   total > 0n ? Number(yesPool * 100n / total) : 50,
  }
}
```

---

## 9. Error Handling

### Pattern Handle Error dari simulateContract

```typescript
// src/lib/errors.ts

// Error codes dari contract (dalam hex, sesuai Solidity custom errors)
export const CONTRACT_ERRORS: Record<string, string> = {
  // CircleFactory
  CircleNotFound:    'Circle tidak ditemukan',
  AlreadyMember:     'Kamu sudah member circle ini',
  NotMember:         'Kamu bukan member circle ini',
  OwnerCannotLeave:  'Owner tidak bisa keluar dari circle',
  NotCircleOwner:    'Hanya owner circle yang bisa melakukan ini',
  CircleIsPrivate:   'Circle ini private. Minta invite dari owner.',
  InvalidProof:      'Invite code tidak valid',
  ProofExpired:      'Invite code sudah kedaluwarsa. Minta invite baru.',

  // PredictionPool
  NotCircleMember:   'Kamu harus jadi member circle dulu',
  DeadlineTooSoon:   'Deadline harus minimal 1 jam dari sekarang',
  NoResolvers:       'Harus ada minimal 1 resolver',
  TooManyResolvers:  'Maksimal 32 resolver',
  ResolverNotMember: 'Semua resolver harus jadi member circle',
  GoalNotOpen:       'Goal ini sudah tidak bisa diubah',
  GoalNotPaidOut:    'Hasil belum diputuskan',
  GoalNotDisputed:   'Goal ini tidak dalam status Disputed',
  DeadlineNotPassed: 'Deadline belum lewat',
  DeadlinePassed:    'Waktu stake sudah habis',
  BelowMinStake:     'Jumlah stake terlalu kecil',
  CannotSwitchSides: 'Tidak bisa ganti sisi setelah stake',
  NothingToClaim:    'Tidak ada yang bisa diklaim',
  AlreadyClaimed:    'Sudah pernah diklaim',

  // ResolutionModule
  AlreadyFinalized:  'Goal sudah difinalisasi',
  AlreadyVoted:      'Kamu sudah vote',
  NotResolver:       'Kamu bukan resolver untuk goal ini',
  VoteWindowExpired: 'Waktu voting sudah habis',
  CannotFinalizeYet: 'Belum bisa difinalisasi. Tunggu quorum atau vote window habis.',
}

export function parseContractError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error)

  // Cari nama error di pesan
  for (const [errorName, friendlyMessage] of Object.entries(CONTRACT_ERRORS)) {
    if (message.includes(errorName)) {
      return friendlyMessage
    }
  }

  // ERC20 errors
  if (message.includes('ERC20InsufficientAllowance')) {
    return 'Perlu approve USDT dulu'
  }
  if (message.includes('ERC20InsufficientBalance')) {
    return 'Saldo USDT tidak cukup'
  }

  // User rejected
  if (message.includes('User rejected') || message.includes('user rejected')) {
    return 'Transaksi dibatalkan'
  }

  return 'Terjadi kesalahan. Coba lagi.'
}

// Penggunaan:
// try {
//   await stakeWithApprove(goalId, 1, '5', setStep)
// } catch (err) {
//   toast.error(parseContractError(err))
// }
```

### Disable/Enable Tombol Berdasarkan Status

```typescript
// src/lib/goalHelpers.ts

// Goal Status enum (sesuai dengan contract)
export enum GoalStatus {
  Open      = 0,
  Locked    = 1,
  Resolving = 2,
  Resolved  = 3,
  Disputed  = 4,
  PaidOut   = 5,
}

export function canStake(status: number, deadline: bigint): boolean {
  const now = BigInt(Math.floor(Date.now() / 1000))
  return status === GoalStatus.Open && now < deadline
}

export function canLock(status: number, deadline: bigint): boolean {
  const now = BigInt(Math.floor(Date.now() / 1000))
  return status === GoalStatus.Open && now >= deadline
}

export function canClaim(status: number): boolean {
  return status === GoalStatus.PaidOut
}

export function canRefund(status: number): boolean {
  return status === GoalStatus.Disputed
}

export function canVote(status: number, voteStartTime: bigint): boolean {
  const voteWindow = 259200n  // 72 jam
  const now = BigInt(Math.floor(Date.now() / 1000))
  return (
    status === GoalStatus.Resolving &&
    now <= voteStartTime + voteWindow
  )
}
```

---

## 10. Testing Checklist

Checklist yang harus Bima selesaikan sebelum bilang "done":

- [ ] **Setup**: Connect MiniPay di HP fisik (bukan emulator)
- [ ] **Faucet**: Klik "Get Test USDT" → saldo +100 USDT di MockUSDT
- [ ] **Circle**: Buat public circle → dapat `circleId` dari event
- [ ] **Circle**: Buat private circle → generate invite link lewat backend
- [ ] **Circle**: Gabung public circle dari wallet lain → masuk member list
- [ ] **Circle**: Gabung private circle via invite link → masuk member list
- [ ] **Goal**: Buat prediction goal (Binary, deadline besok) → dapat `goalId`
- [ ] **Stake Yes**: Approve USDT → tampil "Step 1/2" → confirm di MiniPay → tampil "Step 2/2" → Stake → confirm → done
- [ ] **Stake No**: Dari wallet lain, stake sisi No
- [ ] **Lock**: Tunggu deadline lewat → klik "Lock Goal" → status berubah ke Resolving
- [ ] **Vote**: Login sebagai resolver → tampil UI voting → submit vote
- [ ] **Finalize**: Setelah quorum/72 jam → goal resolved atau disputed
- [ ] **Claim**: Dari akun pemenang → klik Claim → USDT bertambah di wallet
- [ ] **Verifikasi**: Cek balance USDT sebelum dan sesudah claim — harus bertambah sesuai formula payout
- [ ] **Disputed**: Simulasi seri → akun staker bisa refund → saldo kembali

---

## 11. Catatan Penting MiniPay

⚠️ **Baca ini dulu sebelum testing di HP!**

### MiniPay = Legacy Transaction

MiniPay tidak support EIP-1559 (type 2 transactions). Jangan pernah set:

```typescript
// ❌ JANGAN LAKUKAN INI di MiniPay
const hash = await walletClient.writeContract({
  ...request,
  maxFeePerGas:         100000000n,  // ❌
  maxPriorityFeePerGas: 100000000n,  // ❌
})

// ✅ BENAR: Biarkan viem handle otomatis
const hash = await walletClient.writeContract(request)
```

### Auto-Connect di MiniPay

```typescript
// MiniPay inject window.ethereum otomatis
// Cukup request accounts saja:
const [address] = await window.ethereum.request({
  method: 'eth_requestAccounts',
})
// Tidak perlu tampilkan ConnectButton di dalam MiniPay
```

### Testing di HP + ngrok

```bash
# Jalankan dev server
npm run dev

# Expose ke internet (agar bisa dibuka di MiniPay HP)
ngrok http 3000

# Copy URL dari ngrok (misal: https://abcd-123.ngrok.io)
# Di MiniPay → Settings → Developer Mode → paste URL
```

📌 **Tips**: Kalau ngrok putus, MiniPay harus di-restart juga.

### User Kehabisan Saldo Celo untuk Gas

```typescript
// Kalau transaksi gagal karena kurang gas (CELO), redirect user ke faucet
const MINIPAY_ADD_CASH_URL = 'https://minipay.opera.com/add_cash'

// Deteksi error gas
if (error.message.includes('insufficient funds')) {
  window.open(MINIPAY_ADD_CASH_URL, '_blank')
}
```

### USDT = 6 Decimal — Jangan Sampai Salah

```typescript
// ✅ BENAR
import { parseUnits, formatUnits } from 'viem'

const amount = parseUnits('1', 6)    // 1 USDT = 1_000_000n
const display = formatUnits(amount, 6) // 1_000_000n = '1'

// ❌ SALAH — ini untuk ETH/CELO (18 decimal)
const amount = parseEther('1')   // 1_000_000_000_000_000_000n ← SALAH untuk USDT!
```

### feeCurrency untuk Non-MiniPay Users (Optional)

Kalau user mau bayar gas pakai USDT (bukan CELO), set `feeCurrency`:

```typescript
// feeCurrency adapter untuk USDT di Celo Sepolia
const FEE_CURRENCY_USDT_ADAPTER = '0x0e2a3e05bc9a16f5292a6170456a710cb89c6f72'

// ⚠️ Ini BUKAN token address USDT — ini adapter khusus untuk fee currency
// Untuk Celo Sepolia testnet saja
const hash = await walletClient.writeContract({
  ...request,
  feeCurrency: FEE_CURRENCY_USDT_ADAPTER,  // opsional
})
```

📌 Di MiniPay, fee currency sudah dihandle otomatis oleh app-nya. Tidak perlu set manual.

---

## Quick Reference

### Addresses Ringkas

| Contract | Address |
|----------|---------|
| CircleFactory | `0x6cB74ce06E35caEfaFA1491769DeeeA46aebe6Ab` |
| PredictionPool | `0x256d2067A074fB2fB6aE0081E86B6739c5CD6D12` |
| ResolutionModule | `0x5861CAAFDCAc4313f2c9941C4fd1291B34C2c4f5` |
| MockUSDT | `0x09B97b024E399261D1633AA48Adc0671863E5c2B` |

### Nilai-Nilai Penting

| Konstanta | Nilai | Keterangan |
|-----------|-------|------------|
| USDT decimals | 6 | 1 USDT = 1_000_000 |
| Chain ID | 11142220 | Celo Sepolia |
| Vote window | 259200 detik | = 72 jam |
| Quorum | >51% | Resolver yang harus vote |
| Max resolvers | 32 | Per goal |
| Min goal duration | 3600 detik | = 1 jam |
| UNRESOLVED | 255 | winningSide sebelum diputuskan |
| Side 0 | No | stake/vote untuk No |
| Side 1 | Yes | stake/vote untuk Yes |

### Goal Status

| Nilai | Status | Keterangan |
|-------|--------|------------|
| 0 | Open | Bisa stake |
| 1 | Locked | Deadline lewat, menunggu vote |
| 2 | Resolving | Sedang voting |
| 3 | Resolved | Ada winner (transient) |
| 4 | Disputed | Seri / tidak ada vote → refund |
| 5 | PaidOut | Bisa claim |
