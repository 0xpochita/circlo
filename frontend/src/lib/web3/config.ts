import { defineChain } from "viem";
import { createConfig, http } from "wagmi";

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
  testnet: true,
});

export const config = createConfig({
  chains: [celoSepolia],
  transports: {
    [celoSepolia.id]: http("https://forno.celo-sepolia.celo-testnet.org"),
  },
});
