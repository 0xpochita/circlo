# CIRCLO

## Frontend Integration Guide

```
Backend API + Smart Contract Reference · 13 April 2026 · For: Bima (FE Dev)
```
Backend URL circlo-produ
ction.up.railway.app Network Celo Sepolia Chain ID 11142220

```
USDT Decimals 6 (1 USDT
= 1_000_000)
```
### 1. BACKEND API

#### Base URL & Environment Variable

```
Base URL https://circlo-production.up.railway.app
# .env.local di frontend
NEXT_PUBLIC_API_URL=https://circlo-production.up.railway.app
```
#### Public Endpoints (Tanpa Auth)

```
Method Endpoint Deskripsi
GET /health Cek status server (db, redis, chain)
GET /api/v1/config Contract addresses + config
POST /api/v1/auth/nonce Request nonce untuk SIWE login
POST /api/v1/auth/verify Verify SIWE signature, dapat JWT
POST /api/v1/auth/refresh Refresh JWT token
POST /api/v1/auth/logout Logout
GET /api/v1/circles/public List circle public (paginated)
GET /api/v1/goals/feed Feed goals dari public circles
GET /api/v1/users/:wallet Profile user by wallet address
```
#### Protected Endpoints (Butuh JWT Token)

```
Method Endpoint Deskripsi
GET /api/v1/users/me Profile sendiri
PATCH /api/v1/users/me Update profile
GET /api/v1/users/search Cari user by username/wallet
POST /api/v1/circles Buat circle baru
```

POST /api/v1/circles/:id/join Join circle public
POST /api/v1/circles/:id/invite Invite member ke circle
DELETE /api/v1/circles/:id/leave Keluar dari circle
GET /api/v1/circles/:id/members List member circle
GET /api/v1/circles/:id/goals List goals dalam circle
POST /api/v1/goals Konfirmasi goal on-chain ke backend
POST /api/v1/goals/:id/confirm Konfirmasi goal setelah tx
GET /api/v1/goals/mine Goals milik user
GET /api/v1/goals/:id Detail goal
GET /api/v1/notifications List notifikasi
POST /api/v1/notifications/mark-read Mark notif as read
GET /api/v1/referrals/me Info referral user
POST /api/v1/referrals/track Track referral

#### Auth Header

```
// Semua request yang butuh auth:
headers: {
"Authorization": `Bearer ${accessToken}`,
"Content-Type": "application/json"
}
```
### 2. SIWE LOGIN FLOW

## 1 Request NoncePOST /api/v1/auth/nonce dengan body { walletAddress }

## 2 Sign MessageUser sign SIWE message dengan wallet (wagmi signMessage)

## 3 Verify SignaturePOST /api/v1/auth/verify dengan body { message, signature }

## 4 Simpan TokenSimpan accessToken dan refreshToken dari response

## 5 Gunakan TokenSemua request auth pakai Authorization: Bearer

```
// Step 1: Request nonce
const { nonce } = await fetch(`${API_URL}/api/v1/auth/nonce`, {
method: 'POST',
body: JSON.stringify({ walletAddress: address })
```

}).then(r => r.json())
// Step 2: Sign message (wagmi)
const message = createSiweMessage({ address, chainId: 11142220, nonce, ... })
const signature = await signMessageAsync({ message })
// Step 3: Verify
const { accessToken, refreshToken } = await fetch(`${API_URL}/api/v1/auth/verify`, {
method: 'POST',
body: JSON.stringify({ message, signature })
}).then(r => r.json())


### 3. SMART CONTRACT — ADDRESSES

CircleFactory (Proxy) 0x6cB74ce06E35caEfaFA1491769DeeeA46aebe6Ab

PredictionPool (Proxy) 0x256d2067A074fB2fB6aE0081E86B6739c5CD6D

ResolutionModule (Proxy) 0x5861CAAFDCAc4313f2c9941C4fd1291B34C2c4f

MockUSDT 0x09B97b024E399261D1633AA48Adc0671863E5c2B

Chain ID 11142220 (Celo Sepolia)

RPC URL https://forno.celo-sepolia.celo-testnet.org

Explorer https://celo-sepolia.blockscout.com

```
// ABI files location:
frontend/src/lib/abis/CircleFactory.json
frontend/src/lib/abis/PredictionPool.json
frontend/src/lib/abis/ResolutionModule.json
```
### 4. SMART CONTRACT — FLOW

## 1

```
FAUCET USDT (Testing Only)
MockUSDT → faucet()
Dapat 100 USDT gratis untuk testing
```
## 2

##### CREATE CIRCLE

```
CircleFactory → createCircle(name, isPrivate, metadataURI)
Event: CircleCreated(circleId, owner, isPrivate)
```
## 3

##### JOIN CIRCLE

```
CircleFactory → joinCircle(circleId) untuk public
CircleFactory → joinCirclePrivate(circleId, inviteCode) untuk private
```
## 4

##### CREATE GOAL

```
PredictionPool → createGoal(circleId, outcomeType, deadline, minStake, resolverList, metadataURI)
outcomeType=0 (Binary), deadline=unix timestamp
Event: GoalCreated(goalId, circleId, creator, deadline)
```
## 5

##### APPROVE USDT

```
MockUSDT → approve(predictionPoolAddress, amount)
Harus dilakukan sebelum stake! (2 transaksi)
```
## 6

##### STAKE

```
PredictionPool → stake(goalId, side, amount)
side: 0=Yes, 1=No | amount dalam 6 decimal
Event: Staked(goalId, user, side, amount)
```

## 7

##### LOCK GOAL

```
PredictionPool → lockGoal(goalId)
Hanya bisa dipanggil setelah deadline lewat
```
## 8

```
SUBMIT VOTE (Resolver)
ResolutionModule → submitVote(goalId, choice)
choice: 0=Yes, 1=No
Hanya resolver yang bisa vote
```
## 9

##### CLAIM REWARD

```
PredictionPool → claim(goalId)
Hanya pemenang yang bisa claim setelah goal resolved
```
#### Goal Status

Value Status Keterangan
0 Open Bisa stake
1 Locked Voting berlangsung
2 Resolving Menunggu finalisasi
3 PaidOut Sudah bisa claim
4 Disputed Dalam sengketa


### 5. CATATAN PENTING

nn Testnet Gunakan Celo Sepolia (chainId 11142220), BUKAN Alfajores yang sudah deprecated

nn USDT Decimal USDT menggunakan 6 decimal. 1 USDT = 1_000_000. Jangan salah decimal!

nn Approve Dulu Wajib approve USDT ke PredictionPool sebelum stake — ini 2 transaksi terpisah

nn MiniPay TX MiniPay hanya support legacy transaction. Jangan set maxFeePerGas atau maxPriorityFeePerGas

nn feeCurrency Adapter feeCurrency: 0x0e2a3e05bc9a16f5292a6170456a710cb89c6f

n Test Device Test MiniPay harus pakai HP fisik, tidak bisa di browser biasa

n Faucet USDT Panggil faucet() di MockUSDT untuk dapat 100 USDT gratis untuk testing

n Low Balance Redirect user ke https://minipay.opera.com/add_cash jika saldo CELO kurang

### 6. WAGMI CONFIG (Celo Sepolia)

```
import { defineChain } from 'viem'
export const celoSepolia = defineChain({
id: 11142220,
name: 'Celo Sepolia',
nativeCurrency: { name: 'CELO', symbol: 'CELO', decimals: 18 },
rpcUrls: {
default: { http: ['https://forno.celo-sepolia.celo-testnet.org'] },
},
blockExplorers: {
default: { name: 'Blockscout',
url: 'https://celo-sepolia.blockscout.com' },
},
})
// Contract addresses
export const CONTRACTS = {
circleFactory: '0x6cB74ce06E35caEfaFA1491769DeeeA46aebe6Ab',
predictionPool: '0x256d2067A074fB2fB6aE0081E86B6739c5CD6D12',
resolutionModule: '0x5861CAAFDCAc4313f2c9941C4fd1291B34C2c4f5',
usdt: '0x09B97b024E399261D1633AA48Adc0671863E5c2B',
} as const
// USDT helper
export const toUSDT = (amount: number) => BigInt(amount * 1_000_000)
export const fromUSDT = (amount: bigint) => Number(amount) / 1_000_
Circlo — Frontend Integration Guide · 13 April 2026 · Untuk Bima (FE Dev)
```

