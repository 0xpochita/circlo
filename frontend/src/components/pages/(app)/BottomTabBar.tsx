"use client";

import { AnimatePresence, motion, type Variants } from "framer-motion";
import { usePathname, useRouter } from "next/navigation";
import {
  HiOutlineHome,
  HiOutlineMagnifyingGlass,
  HiOutlineUser,
  HiOutlineUserGroup,
} from "react-icons/hi2";

const tabs = [
  { icon: HiOutlineHome, label: "Home", href: "/" },
  { icon: HiOutlineMagnifyingGlass, label: "Search", href: "/explore" },
  { icon: HiOutlineUserGroup, label: "Circles", href: "/circles" },
  { icon: HiOutlineUser, label: "Profile", href: "/profile" },
] as const;

const NAV_ENTRANCE_DELAY = 0.3;
const LABEL_TRANSITION_DURATION = 0.2;
const NAV_SPRING_STIFFNESS = 300;
const NAV_SPRING_DAMPING = 30;
const TAB_SPRING_STIFFNESS = 400;
const TAB_SPRING_DAMPING = 30;

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
    <nav className="fixed bottom-safe left-1/2 z-50 -translate-x-1/2 w-[calc(100%-32px)] max-w-104">
      <motion.div
        initial={{ y: 80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: NAV_SPRING_STIFFNESS, damping: NAV_SPRING_DAMPING, delay: NAV_ENTRANCE_DELAY }}
        className="flex items-center justify-between rounded-full bg-white/95 shadow-lg px-2 py-2"
      >
        {tabs.map((tab, i) => (
          <motion.button
            type="button"
            key={tab.label}
            onClick={() => router.push(tab.href)}
            layout
            transition={{ type: "spring", stiffness: TAB_SPRING_STIFFNESS, damping: TAB_SPRING_DAMPING }}
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
                  transition={{ duration: LABEL_TRANSITION_DURATION, ease: "easeInOut" }}
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
