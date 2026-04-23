import { createPublicClient, webSocket } from "viem";
import { celo, celoSepolia } from "viem/chains";
import { config } from "../config.js";

type UnwatchFn = () => void;

export type AnyPublicClient = any;

export interface IndexerClient {
  getClient: () => AnyPublicClient;
  onReconnect: (cb: () => Promise<void>) => void;
  triggerReconnect: (delayMs?: number) => void;
  destroy: () => void;
}

export function createIndexerClient(testnet = false): IndexerClient {
  const wsUrl = testnet ? config.celoWsUrlTestnet : config.celoWsUrl;
  const chain = testnet ? celoSepolia : celo;

  let client = makeClient(wsUrl, chain);
  const unwatchFns: UnwatchFn[] = [];
  const reconnectCallbacks: Array<() => Promise<void>> = [];
  let backoffMs = 1000;
  let destroyed = false;
  let reconnectScheduled = false;

  function makeClient(url: string, c: typeof celo | typeof celoSepolia) {
    return createPublicClient({
      chain: c,
      transport: webSocket(url, {
        reconnect: { delay: 1000, attempts: 5 },
        timeout: 30_000,
      }),
    });
  }

  async function reconnect() {
    if (destroyed) return;

    console.log("[Indexer] Reconnecting WebSocket client...");

    for (const unwatch of unwatchFns.splice(0)) {
      try { unwatch(); } catch {}
    }

    client = makeClient(wsUrl, chain);

    for (const cb of reconnectCallbacks) {
      try {
        await cb();
        backoffMs = 1000;
      } catch (err) {
        console.error("[Indexer] Reconnect callback failed:", err);
        backoffMs = Math.min(backoffMs * 2, 60_000);
        setTimeout(reconnect, backoffMs);
        return;
      }
    }

    console.log("[Indexer] Reconnected successfully");
  }

  function triggerReconnect(delayMs = 5000) {
    if (destroyed || reconnectScheduled) return;
    reconnectScheduled = true;
    console.log(`[Indexer] Reconnecting in ${delayMs}ms...`);
    setTimeout(() => {
      reconnectScheduled = false;
      reconnect().catch((err) =>
        console.error("[Indexer] Triggered reconnect error:", err)
      );
    }, delayMs);
  }

  const proactiveInterval = setInterval(() => {
    reconnect().catch((err) =>
      console.error("[Indexer] Proactive reconnect error:", err)
    );
  }, 15 * 60 * 1000);

  return {
    getClient: () => client,

    onReconnect: (cb: () => Promise<void>) => {
      reconnectCallbacks.push(cb);
    },

    triggerReconnect,

    destroy: () => {
      destroyed = true;
      clearInterval(proactiveInterval);
      for (const unwatch of unwatchFns.splice(0)) {
        try { unwatch(); } catch {}
      }
    },
  };
}
