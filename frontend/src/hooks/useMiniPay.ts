"use client";

import { useEffect, useState } from "react";
import { isMiniPay } from "@/lib/web3/minipay";

/**
 * Reactive React hook wrapping the synchronous `isMiniPay()` detector.
 *
 * Returns `false` on the server and during the first client render
 * (matching SSR), then flips to the real detected value on mount.
 * This deferral avoids a hydration mismatch — the server has no
 * `window`, so SSR can't know whether the MiniPay provider exists,
 * and the post-mount effect is the earliest safe point to read it.
 *
 * Use this in components that need to conditionally hide a Connect
 * button or auto-trigger SIWE — see `docs/MINIPAY_INTEGRATION.md`
 * for the surrounding flow.
 *
 * @example
 * ```tsx
 * const isMiniPayBrowser = useMiniPay();
 * return isMiniPayBrowser ? <ConnectingPill /> : <ConnectWalletButton />;
 * ```
 */
export function useMiniPay(): boolean {
  const [value, setValue] = useState(false);
  useEffect(() => setValue(isMiniPay()), []);
  return value;
}
