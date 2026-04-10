"use client";

import { HiOutlineHome, HiOutlineMagnifyingGlass, HiOutlineCalendarDays, HiOutlineUser } from "react-icons/hi2";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence, type Variants } from "framer-motion";

const tabs = [
  { icon: HiOutlineHome, label: "Home", href: "/" },
  { icon: HiOutlineMagnifyingGlass, label: "Search", href: "/explore" },
  { icon: HiOutlineCalendarDays, label: "Events", href: "/" },
  { icon: HiOutlineUser, label: "Profile", href: "/profile" },
];

const labelVariants: Variants = {
  hidden: { width: 0, opacity: 0 },
  visible: { width: "auto", opacity: 1 },
};

export default function BottomTabBar() {
  const pathname = usePathname();
  const router = useRouter();

  const activeIndex = tabs.findIndex((tab) => tab.href === pathname);
  const active = activeIndex === -1 ? 0 : activeIndex;

  return (
    <nav className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 w-[calc(100%-32px)] max-w-[calc(448px-32px)]">
      <motion.div
        initial={{ y: 80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 30, delay: 0.3 }}
        className="flex items-center justify-between rounded-full bg-white/70 backdrop-blur-xl px-2 py-2"
      >
        {tabs.map((tab, i) => (
          <motion.button
            type="button"
            key={tab.label}
            onClick={() => router.push(tab.href)}
            layout
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className={`relative flex items-center gap-2 rounded-full px-4 py-2.5 cursor-pointer ${active === i ? "bg-white" : ""}`}
          >
            <tab.icon
              className={`w-5 h-5 shrink-0 ${active === i ? "text-main-text" : "text-muted"}`}
            />
            <AnimatePresence mode="wait">
              {active === i && (
                <motion.span
                  key={tab.label}
                  variants={labelVariants}
                  initial="hidden"
                  animate="visible"
                  exit="hidden"
                  transition={{ duration: 0.2, ease: "easeInOut" }}
                  className="text-sm font-medium text-main-text whitespace-nowrap overflow-hidden"
                >
                  {tab.label}
                </motion.span>
              )}
            </AnimatePresence>
          </motion.button>
        ))}
      </motion.div>
    </nav>
  );
}
