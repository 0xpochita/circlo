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

/**
 * Construct a viem PublicClient wrapped in the `IndexerClient`
 * lifecycle hooks the indexer uses.
 *
 * Uses HTTP polling at a 4-second interval rather than WebSocket
 * because Forno's WS endpoint has been unstable historically — a
 * reconnect storm would surface as gaps in our event stream. HTTP
 * polling with 4s cadence catches new blocks within ~1 block of
 * latency (Celo block time ~1s) at a fraction of the operational
 * overhead.
 *
 * Reconnect hooks are stubs today; if we move back to WS, this is
 * where the indexer registers its "rewind backfill" handler.
 */
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
