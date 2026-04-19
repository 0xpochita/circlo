"use client";

import { useRouter } from "next/navigation";
import { HiOutlineArrowRightOnRectangle } from "react-icons/hi2";
import { toast } from "sonner";
import { useDisconnect } from "wagmi";
import { useMiniPay } from "@/hooks";
import { useAuthStore } from "@/stores/authStore";

export default function DisconnectButton() {
  const router = useRouter();
  const { disconnectAsync } = useDisconnect();
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const isMiniPayBrowser = useMiniPay();

  if (isMiniPayBrowser) return null;

  async function handleDisconnect() {
    try {
      await disconnectAsync();
    } catch {}
    clearAuth();
    localStorage.removeItem("circlo-onboarding-done");
    toast("Wallet disconnected");
    router.replace("/welcome");
  }

  return (
    <div className="px-4 py-2">
      <button
        type="button"
        onClick={handleDisconnect}
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-white py-4 text-sm font-medium text-red-400 cursor-pointer transition-all duration-200 active:scale-[0.97]"
      >
        <HiOutlineArrowRightOnRectangle className="w-5 h-5" />
        Disconnect Wallet
      </button>
    </div>
  );
}
