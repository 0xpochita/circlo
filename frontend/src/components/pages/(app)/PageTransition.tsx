"use client";

import { motion } from "framer-motion";

const STAGGER_CHILDREN_DELAY = 0.08;
const ITEM_TRANSITION_DURATION = 0.4;

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: STAGGER_CHILDREN_DELAY,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: ITEM_TRANSITION_DURATION, ease: "easeOut" as const },
  },
};

export default function PageTransition({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="flex flex-col"
    >
      {Array.isArray(children) ? (
        children.map((child, i) => (
          <motion.div key={`item-${i}`} variants={itemVariants}>
            {child}
          </motion.div>
        ))
      ) : (
        <motion.div variants={itemVariants}>{children}</motion.div>
      )}
    </motion.div>
  );
}
