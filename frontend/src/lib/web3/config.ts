import { defineChain } from "viem";
import { celo } from "viem/chains";
import { createConfig, http } from "wagmi";
import { IS_MAINNET, NETWORK } from "./network";

export const celoSepolia = defineChain({
  id: 11142220,
  name: "Celo Sepolia",
  nativeCurrency: {
    name: "CELO",
    symbol: "CELO",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ["https://forno.celo-sepolia.celo-testnet.org"],
    },
  },
  blockExplorers: {
    default: {
      name: "Blockscout",
      url: "https://celo-sepolia.blockscout.com",
    },
  },
  testnet: true,
});

export const activeChain = IS_MAINNET ? celo : celoSepolia;

export const config = IS_MAINNET
  ? createConfig({
      chains: [celo],
      transports: { [celo.id]: http(NETWORK.rpcUrl) },
    })
  : createConfig({
      chains: [celoSepolia],
      transports: { [celoSepolia.id]: http(NETWORK.rpcUrl) },
    });
