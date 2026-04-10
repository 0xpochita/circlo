# CIRCLO

**"Tokenize Your Circle, Turn Predictions into Real Goals"**

BUILD GUIDE · Celo Proof of Ship · April 2026  

Alven (SC Developer - Foundry)  
Bima (FE Developer - Next.js + viem)  
Natalie (Designer / Editor)  

---

## 1. App Overview & Positioning

### Apa itu Circlo?
Circlo adalah social prediction game berbasis Web3 yang berjalan di Celo Blockchain sebagai MiniApp di MiniPay.

User:
- Membuat / join circle (grup)
- Membuat prediksi
- Stake USDm kecil
- Winner dapat pool otomatis via smart contract

→ Transparan, trustless, on-chain

---

### Problem vs Solusi

| Problem | Solusi Circlo |
|--------|--------------|
| Polling WA tidak seru | Ada stake kecil (skin in the game) |
| Polymarket terlalu kompleks | Social-first, circle-based |
| Fantasy terlalu ribet | Simple prediction |
| Tidak ada accountability | Circle jadi saksi |

---

## 2. Features Breakdown

### Core Features (MVP)

- Create Circle (private/public)
- Join Circle
- Create Prediction Event
- Stake USDm
- Resolve & Distribute reward

### Social Features

- Share Prediction Card (viral loop)
- Leaderboard
- Streak & Achievement
- Cross-circle challenge
- NFT Badge

---

## 3. B2C Strategy

### Target User
- Gen Z / Mahasiswa
- Komunitas hobi
- Friend group
- Personal growth users

### Retention Loop
1. Join circle  
2. Predict  
3. Wait result  
4. Leaderboard  
5. Repeat  

---

## 4. Tech Stack

- Smart Contract: Solidity + Foundry
- Frontend: Next.js + viem
- Wallet: MiniPay
- Token: USDm
- Chain: Celo Mainnet

---

## 5. Smart Contract

- CircleFactory.sol
- PredictionPool.sol

Core functions:
- createCircle()
- joinCircle()
- createPrediction()
- stake()
- resolve()
- distribute()

---

## 6. Frontend

- Next.js (App Router)
- viem + wagmi
- MiniPay integration

---

## 7. MiniPay Rules

- ❌ Jangan pakai ethers.js  
- ✅ Gunakan viem / wagmi  
- Auto-connect wallet  
- Stablecoin only  

---

## 8. MVP Checklist

- [ ] Create circle
- [ ] Join circle
- [ ] Create prediction
- [ ] Stake USDm
- [ ] Resolve
- [ ] Distribute reward
- [ ] Leaderboard
- [ ] MiniPay integration
- [ ] Contract verifiedp