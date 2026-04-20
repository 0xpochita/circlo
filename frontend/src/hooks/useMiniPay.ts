"use client";

import { useEffect, useState } from "react";
import { isMiniPay } from "@/lib/web3/minipay";

export function useMiniPay(): boolean {
  const [value, setValue] = useState(false);
  useEffect(() => setValue(isMiniPay()), []);
  return value;
}
