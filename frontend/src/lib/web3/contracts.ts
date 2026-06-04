import type { Abi } from "viem";
import CircleFactoryJSON from "@/lib/abis/CircleFactory.min.json";
import MockUSDTJSON from "@/lib/abis/MockUSDT.min.json";
import PredictionPoolJSON from "@/lib/abis/PredictionPool.min.json";
import ResolutionModuleJSON from "@/lib/abis/ResolutionModule.min.json";
import { NETWORK } from "./network";

/**
 * Pull the ABI array out of a Foundry/Hardhat artifact JSON.
 *
 * Foundry emits `{ abi: [...] }` envelopes, but our `.min.json` build
 * step also handles the raw-array case for hand-trimmed ABIs. Returns
 * an empty array on miss rather than throwing — the runtime
 * `writeContract` will error loudly enough on its own and we prefer
 * not to crash the whole module on a bad import.
 */
function extractAbi(json: unknown): Abi {
  const obj = json as Record<string, unknown>;
  if (Array.isArray(obj)) return obj as unknown as Abi;
  if (Array.isArray(obj.abi)) return obj.abi as unknown as Abi;
  return [] as unknown as Abi;
}

/**
 * Pre-bundled `{ address, abi }` for `CircleFactory`, ready to spread
 * into a viem `{ ...circleFactoryContract, functionName: "..." }` call.
 *
 * The address is resolved at module-load time from {@link NETWORK},
 * so this constant is network-aware — no per-call `chainId` switching
 * needed. Re-imports across the app share the same trimmed ABI.
 */
export const circleFactoryContract = {
  address: NETWORK.contracts.circleFactory,
  abi: extractAbi(CircleFactoryJSON),
} as const;

/**
 * Pre-bundled `{ address, abi }` for `PredictionPool` — the escrow
 * + lifecycle contract that holds USDT stakes and pays winners.
 *
 * Most user-facing actions (stake, claim, refund) target this bundle.
 * See `packages/circlo-sdk/src/stakes.ts` for the higher-level
 * helpers that wrap these reads/writes with type-safe params.
 */
export const predictionPoolContract = {
  address: NETWORK.contracts.predictionPool,
  abi: extractAbi(PredictionPoolJSON),
} as const;

/**
 * Pre-bundled `{ address, abi }` for `ResolutionModule` — the
 * resolver-vote contract that finalizes goals via `submitVote`,
 * `finalize`, and the tied-vote `Disputed` path.
 */
export const resolutionModuleContract = {
  address: NETWORK.contracts.resolutionModule,
  abi: extractAbi(ResolutionModuleJSON),
} as const;

/**
 * Pre-bundled `{ address, abi }` for the **MockUSDT** contract.
 *
 * Despite the name, on Mainnet this resolves to the **real** Celo USDT
 * (Tether, 6 decimals) at the address configured in {@link NETWORK}.
 * The `Mock` name is a holdover from Sepolia testnet where we deploy
 * an OZ ERC20 stand-in. The minimal ABI exposes `balanceOf`,
 * `transfer`, `approve`, and `allowance` — enough for the stake
 * approve flow and `useUSDTBalance` reads.
 */
export const mockUSDTContract = {
  address: NETWORK.contracts.usdt,
  abi: extractAbi(MockUSDTJSON),
} as const;
