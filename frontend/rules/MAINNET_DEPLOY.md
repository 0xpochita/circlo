# Circlo — Mainnet Deployment

## Network

- Chain: Celo Mainnet
- Chain ID: 42220
- RPC: https://forno.celo.org
- Explorer: https://celoscan.io

## Token

- Name: Tether USDT
- Address: 0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e
- Decimals: 6

## Contract Addresses (Proxy)

- CircleFactory: 0x6cB74ce06E35caEfaFA1491769DeeeA46aebe6Ab
- PredictionPool: 0xE9cFa67358476194414ae3306888FfeCb8f41139
- ResolutionModule: 0x5861CAAFDCAc4313f2c9941C4fd1291B34C2c4f5
- RewardDistributor: 0xb425fe1699e81E2Ef00Fc5592Fc865F6E93cBa7a
- TimelockController: 0xc6B9554fAA6703645f9AC65794CF2321cB82fE47

## Implementation Addresses

- CircleFactory impl: 0x666a0Dc1a8FF47eE1D2Ad823aBe175A45A7dbeC0
- ResolutionModule impl: 0x06aA579debC2Cb983Ab19215C6b12bB0D578B1Ec
- PredictionPool impl: 0x09B97b024E399261D1633AA48Adc0671863E5c2B
- RewardDistributor impl: 0x256d2067A074fB2fB6aE0081E86B6739c5CD6D12

## Deploy Info

- Deploy Block: 64716981
- Deployer: 0xff54De834290795E28b5eE2C018d760a2921b80d
- Date: 20 April 2026
- Gas Used: ~0.45 CELO

## Verification

Semua contract verified di Celoscan:

- https://celoscan.io/address/0x6cB74ce06E35caEfaFA1491769DeeeA46aebe6Ab
- https://celoscan.io/address/0xE9cFa67358476194414ae3306888FfeCb8f41139
- https://celoscan.io/address/0x5861CAAFDCAc4313f2c9941C4fd1291B34C2c4f5
- https://celoscan.io/address/0xb425fe1699e81E2Ef00Fc5592Fc865F6E93cBa7a
- https://celoscan.io/address/0xc6B9554fAA6703645f9AC65794CF2321cB82fE47

## SC Parameters

- quorumNumerator: 51
- quorumDenominator: 100
- voteWindow: 259200 (72 jam)
- protocolFeeBps: 0 (no fee untuk v1)

## Backend

- URL: https://circlo-production.up.railway.app
- Indexer Start Block: 64716981

## Environment Variables (Railway)

```
CELO_RPC_URL=https://forno.celo.org
CELO_WS_URL=wss://forno.celo.org/ws
CELO_CHAIN_ID=42220
CONTRACT_CIRCLE_FACTORY=0x6cB74ce06E35caEfaFA1491769DeeeA46aebe6Ab
CONTRACT_PREDICTION_POOL=0xE9cFa67358476194414ae3306888FfeCb8f41139
CONTRACT_RESOLUTION_MODULE=0x5861CAAFDCAc4313f2c9941C4fd1291B34C2c4f5
CONTRACT_USDT=0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e
INDEXER_START_BLOCK=64716981
```





Contract addresses Mainnet (chainId 42220):
NEXT_PUBLIC_CIRCLE_FACTORY=0x6cB74ce06E35caEfaFA1491769DeeeA46aebe6Ab
NEXT_PUBLIC_PREDICTION_POOL=0xE9cFa67358476194414ae3306888FfeCb8f41139
NEXT_PUBLIC_RESOLUTION_MODULE=0x5861CAAFDCAc4313f2c9941C4fd1291B34C2c4f5
NEXT_PUBLIC_STABLE_TOKEN=0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e
NEXT_PUBLIC_STABLE_DECIMALS=6
NEXT_PUBLIC_USE_MAINNET=true
NEXT_PUBLIC_API_URL=https://circlo-production.up.railway.app

Token: USDT (6 decimal, sama seperti testnet)
Backend: https://circlo-production.up.railway.app
Deploy Block: 64716981

Yang perlu kamu update (sesuai minipay-preparation.md):
1. src/lib/web3/config.ts → tambah celo mainnet
2. src/lib/web3/contracts.ts → switch berdasarkan IS_MAINNET
3. src/lib/web3/usdt.ts → rename stable.ts, token-agnostic
4. .env.production → isi semua env vars di atas
5. Hapus Faucet UI untuk mainnet build