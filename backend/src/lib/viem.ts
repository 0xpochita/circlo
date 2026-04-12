import { createPublicClient, http } from "viem";
import { celo, celoSepolia } from "viem/chains";
import { config } from "../config.js";

export const celoClient = createPublicClient({
  chain: celo,
  transport: http(config.celoRpcUrl),
}) as any;

export const celoSepoliaClient = createPublicClient({
  chain: celoSepolia,
  transport: http(config.celoRpcUrlTestnet),
}) as any;

export function getPublicClient(chainId?: number): any {
  if (chainId === config.celoChainIdTestnet) return celoSepoliaClient;
  return celoClient;
}

export default celoClient;
