/**
 * Deployed Circlo contract addresses on Celo Mainnet (chainId 42220).
 *
 * These are baked into every `circlo-sdk` call — the SDK does not
 * accept per-call address overrides. If you fork to a different chain,
 * republish a fork of this package with the new addresses; downstream
 * apps just pin the fork.
 *
 * Versioning note: `CircleFactory` and `ResolutionModule` are UUPS
 * proxies — the underlying implementation contract can change without
 * the address here moving. `PredictionPool` was upgraded on Celo
 * Mainnet to ship the `settlement()` heartbeat — proxy address stable.
 */

/** Celo Mainnet chain id. Re-exported so consumers don't need a viem dep. */
export const CELO_MAINNET_CHAIN_ID = 42220 as const;

/**
 * Frozen contract address map. Treat as read-only — mutating an entry
 * silently breaks every downstream SDK call.
 */
export const CIRCLO_CONTRACTS = {
  CircleFactory: "0x6cB74ce06E35caEfaFA1491769DeeeA46aebe6Ab",
  PredictionPool: "0xE9cFa67358476194414ae3306888FfeCb8f41139",
  ResolutionModule: "0x5861CAAFDCAc4313f2c9941C4fd1291B34C2c4f5",
  /** Celo Mainnet USDT (Tether, 6 decimals). Used for stakes. */
  USDT: "0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e",
} as const;

/** Union of valid keys for `CIRCLO_CONTRACTS`. */
export type CircloContract = keyof typeof CIRCLO_CONTRACTS;
