import React from "react";
import { motion } from "framer-motion";
import { useSwipeable } from "react-swipeable";

interface PanelProps {
  id: "left" | "center" | "right";
  children: React.ReactNode;
  onSwap: (from: "left" | "center" | "right", dir: "left" | "right") => void;
}

const Panel: React.FC<PanelProps> = ({ id, children, onSwap }) => {
  const handlers = useSwipeable({
    onSwipedLeft: () => onSwap(id, "left"),
    onSwipedRight: () => onSwap(id, "right"),
    preventScrollOnSwipe: true,
  });

  return (
    <motion.div
      {...handlers}
      className="relative flex flex-col bg-zinc-900/70 backdrop-blur border border-white/10 overflow-hidden rounded-xl shadow-inner"
      initial={{ opacity: 0, x: id === "left" ? -50 : id === "right" ? 50 : 0 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: id === "left" ? -50 : id === "right" ? 50 : 0 }}
      transition={{ duration: 0.35, ease: "easeInOut" }}
    >
      {children}
    </motion.div>
  );
};

export default Panel;
