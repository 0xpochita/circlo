import { defineChain } from "viem";
import { celo } from "viem/chains";
import { createConfig, http } from "wagmi";
import { IS_MAINNET, NETWORK } from "./network";

/**
 * viem chain definition for Celo Sepolia (testnet).
 *
 * viem ships `celo` as a built-in but not its Sepolia counterpart at
 * the time this file was written — so we define it locally to keep
 * the SDK + wagmi config in lockstep on the testnet build. RPC and
 * explorer URLs match {@link NETWORK} for consistency.
 */
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

/**
 * The viem chain currently active on this build — `celo` (Mainnet)
 * or `celoSepolia`. Pass this to `wallet.writeContract({ chain })`
 * when you don't want to hard-code one or the other.
 */
export const activeChain = IS_MAINNET ? celo : celoSepolia;

/**
 * wagmi config wired to a single Celo chain per build (Mainnet OR
 * Sepolia, never both).
 *
 * Single-chain config keeps `useSwitchChain` round-trips out of the
 * MiniPay flow — there's no scenario where a Circlo user is
 * expected to bounce between Mainnet and Sepolia. The HTTP transport
 * points at {@link NETWORK.rpcUrl} (Forno by default) so reads share
 * the same RPC as the SDK's `PublicClient`.
 */
export const config = IS_MAINNET
  ? createConfig({
      chains: [celo],
      transports: { [celo.id]: http(NETWORK.rpcUrl) },
    })
  : createConfig({
      chains: [celoSepolia],
      transports: { [celoSepolia.id]: http(NETWORK.rpcUrl) },
    });
