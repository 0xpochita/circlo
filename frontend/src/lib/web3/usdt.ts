export const USDT_DECIMALS = 6;
export const DEFAULT_MIN_STAKE = "0.0001";

export function toUSDT(amount: number): bigint {
  return BigInt(Math.round(amount * 10 ** USDT_DECIMALS));
}

export function fromUSDT(amount: bigint): number {
  return Number(amount) / 10 ** USDT_DECIMALS;
}
