/**
 * Deployed Circlo contract addresses on Celo Mainnet (chainId 42220).
 */

export const CELO_MAINNET_CHAIN_ID = 42220 as const;

export const CIRCLO_CONTRACTS = {
  CircleFactory: "0x6cB74ce06E35caEfaFA1491769DeeeA46aebe6Ab",
  PredictionPool: "0xE9cFa67358476194414ae3306888FfeCb8f41139",
  ResolutionModule: "0x5861CAAFDCAc4313f2c9941C4fd1291B34C2c4f5",
  /** Celo Mainnet USDT (Tether, 6 decimals). Used for stakes. */
  USDT: "0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e",
} as const;

export type CircloContract = keyof typeof CIRCLO_CONTRACTS;
