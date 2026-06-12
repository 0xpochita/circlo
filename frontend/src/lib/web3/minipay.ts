/**
 * Query-string override used in dev / QA to fake the MiniPay
 * environment without actually launching inside the Mini App browser.
 * Append `?minipay=1` to any Circlo URL to flip the detection.
 */
export const MINIPAY_QUERY_PARAM = "minipay";
export const MINIPAY_QUERY_VALUE = "1";

/**
 * Detect whether the current page is running inside MiniPay's Mini App
 * browser on Celo. Two signals are checked, in priority order:
 *
 * 1. URL override — `?minipay=1` flips detection on for local dev
 *    and for previewing the MiniPay-only UI flow (hidden Connect
 *    button, implicit auto-connect) from a desktop browser.
 * 2. Provider flag — MiniPay's injected EIP-1193 provider sets
 *    `window.ethereum.isMiniPay = true`. This is the canonical
 *    runtime check inside the actual Mini App browser.
 *
 * Returns `false` on the server (no `window`) so the function is
 * safe to call from any code path. Components that need the value
 * reactively should use the {@link useMiniPay} hook instead, which
 * defers the check to a post-mount effect.
 */
export function isMiniPay(): boolean {
  if (typeof window === "undefined") return false;

  const search = window.location.search;
  if (
    search &&
    new URLSearchParams(search).get(MINIPAY_QUERY_PARAM) === MINIPAY_QUERY_VALUE
  ) {
    return true;
  }

  const eth = (window as { ethereum?: { isMiniPay?: boolean } }).ethereum;
  return Boolean(eth?.isMiniPay);
}
