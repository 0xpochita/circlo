import { createPublicClient, http } from "viem";
import { celo, celoSepolia } from "viem/chains";
import { config } from "../config.js";

export type AnyPublicClient = any;

export interface IndexerClient {
  getClient: () => AnyPublicClient;
  onReconnect: (cb: () => Promise<void>) => void;
  triggerReconnect: (delayMs?: number) => void;
  destroy: () => void;
}

export function createIndexerClient(testnet = false): IndexerClient {
  const rpcUrl = testnet ? config.celoRpcUrlTestnet : config.celoRpcUrl;
  const chain = testnet ? celoSepolia : celo;

  const client = createPublicClient({
    chain,
    transport: http(rpcUrl),
    pollingInterval: 4_000,
  });

  return {
    getClient: () => client,
    onReconnect: () => {},
    triggerReconnect: () => {},
    destroy: () => {},
  };
}
