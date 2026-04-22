import type { Abi } from "viem";
import CircleFactoryJSON from "@/lib/abis/CircleFactory.min.json";
import MockUSDTJSON from "@/lib/abis/MockUSDT.min.json";
import PredictionPoolJSON from "@/lib/abis/PredictionPool.min.json";
import ResolutionModuleJSON from "@/lib/abis/ResolutionModule.min.json";
import { NETWORK } from "./network";

function extractAbi(json: unknown): Abi {
  const obj = json as Record<string, unknown>;
  if (Array.isArray(obj)) return obj as unknown as Abi;
  if (Array.isArray(obj.abi)) return obj.abi as unknown as Abi;
  return [] as unknown as Abi;
}

export const circleFactoryContract = {
  address: NETWORK.contracts.circleFactory,
  abi: extractAbi(CircleFactoryJSON),
} as const;

export const predictionPoolContract = {
  address: NETWORK.contracts.predictionPool,
  abi: extractAbi(PredictionPoolJSON),
} as const;

export const resolutionModuleContract = {
  address: NETWORK.contracts.resolutionModule,
  abi: extractAbi(ResolutionModuleJSON),
} as const;

export const mockUSDTContract = {
  address: NETWORK.contracts.usdt,
  abi: extractAbi(MockUSDTJSON),
} as const;
