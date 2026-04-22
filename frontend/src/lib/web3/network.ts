import type { Address } from "viem";

export const IS_MAINNET = process.env.NEXT_PUBLIC_USE_MAINNET === "true";

type NetworkConfig = {
  id: 42220 | 11142220;
  name: string;
  shortName: "mainnet" | "testnet";
  rpcUrl: string;
  explorerUrl: string;
  contracts: {
    circleFactory: Address;
    predictionPool: Address;
    resolutionModule: Address;
    usdt: Address;
  };
  usdtDecimals: number;
};

const TESTNET: NetworkConfig = {
  id: 11142220,
  name: "Celo Sepolia",
  shortName: "testnet",
  rpcUrl: "https://forno.celo-sepolia.celo-testnet.org",
  explorerUrl: "https://celo-sepolia.blockscout.com",
  contracts: {
    circleFactory: (process.env.NEXT_PUBLIC_CIRCLE_FACTORY ||
      "0x0000000000000000000000000000000000000000") as Address,
    predictionPool: (process.env.NEXT_PUBLIC_PREDICTION_POOL ||
      "0x0000000000000000000000000000000000000000") as Address,
    resolutionModule: (process.env.NEXT_PUBLIC_RESOLUTION_MODULE ||
      "0x0000000000000000000000000000000000000000") as Address,
    usdt: (process.env.NEXT_PUBLIC_USDT ||
      "0x0000000000000000000000000000000000000000") as Address,
  },
  usdtDecimals: 6,
};

const MAINNET: NetworkConfig = {
  id: 42220,
  name: "Celo Mainnet",
  shortName: "mainnet",
  rpcUrl: "https://forno.celo.org",
  explorerUrl: "https://celoscan.io",
  contracts: {
    circleFactory: (process.env.NEXT_PUBLIC_CIRCLE_FACTORY ||
      "0x6cB74ce06E35caEfaFA1491769DeeeA46aebe6Ab") as Address,
    predictionPool: (process.env.NEXT_PUBLIC_PREDICTION_POOL ||
      "0xE9cFa67358476194414ae3306888FfeCb8f41139") as Address,
    resolutionModule: (process.env.NEXT_PUBLIC_RESOLUTION_MODULE ||
      "0x5861CAAFDCAc4313f2c9941C4fd1291B34C2c4f5") as Address,
    usdt: (process.env.NEXT_PUBLIC_USDT ||
      "0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e") as Address,
  },
  usdtDecimals: 6,
};

export const NETWORK: NetworkConfig = IS_MAINNET ? MAINNET : TESTNET;

export const ZERO_ADDRESS =
  "0x0000000000000000000000000000000000000000" as Address;

if (typeof window !== "undefined") {
  const tag = IS_MAINNET ? "%cMAINNET" : "%cTESTNET";
  const style = IS_MAINNET
    ? "background:#10b981;color:#fff;padding:2px 6px;border-radius:4px;font-weight:bold"
    : "background:#f59e0b;color:#fff;padding:2px 6px;border-radius:4px;font-weight:bold";
  console.info(`Circlo running on ${tag}`, style, NETWORK.name);

  if (NETWORK.contracts.predictionPool === ZERO_ADDRESS) {
    console.error(
      `[Circlo] PredictionPool address not configured for ${NETWORK.shortName}. Set NEXT_PUBLIC_PREDICTION_POOL.`,
    );
  }
}
