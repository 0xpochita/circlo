"use client";

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { HiOutlineTicket } from "react-icons/hi2";
import { toast } from "sonner";
import { useAccount } from "wagmi";
import { circlesApi } from "@/lib/api/endpoints";

export default function InviteCodeInput() {
  const [code, setCode] = useState("");
  const [isJoining, setIsJoining] = useState(false);
  const { isConnected } = useAccount();
  const router = useRouter();

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim()) return;

    if (!isConnected) {
      toast("Connect your wallet first");
      return;
    }

    setIsJoining(true);
    try {
      const parts = code.trim().split("-");
      const circleId = parts.length > 1 ? parts[0] : "";
      const inviteCode =
        parts.length > 1 ? parts.slice(1).join("-") : code.trim();

      if (circleId) {
        await circlesApi.join(circleId, inviteCode);
        toast.success("Joined circle!");
        setCode("");
        router.push(`/circle-details?id=${circleId}`);
      } else {
        toast.error("Invalid invite code format");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "";
      if (message.includes("already")) {
        toast("You're already a member");
      } else if (message.includes("Invalid invite")) {
        toast.error("Invalid invite code");
      } else {
        toast.error("Could not join with this code");
      }
    } finally {
      setIsJoining(false);
    }
  }

  return (
    <div className="px-4 py-2">
      <form onSubmit={handleJoin} className="rounded-2xl bg-white p-4">
        <div className="flex items-start gap-3 mb-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-50">
            <HiOutlineTicket className="w-5 h-5 text-brand" />
          </div>
          <div>
            <p className="text-sm font-semibold text-main-text">
              Have an invite code?
            </p>
            <p className="text-xs text-muted mt-0.5">
              Paste it below to join a private circle
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="e.g. CIRCLO-1234"
            className="flex-1 rounded-xl bg-gray-50 px-4 py-3 text-sm text-main-text placeholder:text-muted outline-none transition-all duration-200 focus:ring-2 focus:ring-brand"
          />
          <motion.button
            type="submit"
            whileTap={{ scale: 0.95 }}
            disabled={!code.trim() || isJoining}
            className="rounded-xl bg-brand px-5 py-3 text-sm font-semibold text-white cursor-pointer transition-all duration-200 disabled:bg-gray-100 disabled:text-muted disabled:cursor-not-allowed"
          >
            {isJoining ? "..." : "Join"}
          </motion.button>
        </div>
      </form>
    </div>
  );
}
