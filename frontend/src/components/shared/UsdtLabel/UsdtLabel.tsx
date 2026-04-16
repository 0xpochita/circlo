"use client";

import Image from "next/image";
import { memo } from "react";

type UsdtLabelProps = {
  size?: number;
  className?: string;
};

function UsdtLabel({ size = 14, className = "" }: UsdtLabelProps) {
  return (
    <span
      className={`inline-flex items-center gap-1 align-middle ${className}`}
    >
      USDT
      <Image
        src="/Assets/Images/Logo/logo-coin/usdt-logo.svg"
        alt="USDT"
        width={size}
        height={size}
        className="inline-block"
      />
    </span>
  );
}

export default memo(UsdtLabel);
