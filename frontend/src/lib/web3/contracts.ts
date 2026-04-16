import type { Abi, Address } from "viem";
import CircleFactoryJSON from "@/lib/abis/CircleFactory.min.json";
import MockUSDTJSON from "@/lib/abis/MockUSDT.min.json";
import PredictionPoolJSON from "@/lib/abis/PredictionPool.min.json";
import ResolutionModuleJSON from "@/lib/abis/ResolutionModule.min.json";

function extractAbi(json: unknown): Abi {
  const obj = json as Record<string, unknown>;
  if (Array.isArray(obj)) return obj as unknown as Abi;
  if (Array.isArray(obj.abi)) return obj.abi as unknown as Abi;
  return [] as unknown as Abi;
}

export const circleFactoryContract = {
  address: (process.env.NEXT_PUBLIC_CIRCLE_FACTORY || "0x") as Address,
  abi: extractAbi(CircleFactoryJSON),
} as const;

export const predictionPoolContract = {
  address: (process.env.NEXT_PUBLIC_PREDICTION_POOL || "0x") as Address,
  abi: extractAbi(PredictionPoolJSON),
} as const;

export const resolutionModuleContract = {
  address: (process.env.NEXT_PUBLIC_RESOLUTION_MODULE || "0x") as Address,
  abi: extractAbi(ResolutionModuleJSON),
} as const;

export const mockUSDTContract = {
  address: (process.env.NEXT_PUBLIC_USDT || "0x") as Address,
  abi: extractAbi(MockUSDTJSON),
} as const;
