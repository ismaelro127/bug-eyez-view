// components/SplashScreen.tsx
import { motion } from "framer-motion";

export default function SplashScreen() {
  return (
    <motion.div
      className="fixed inset-0 flex items-center justify-center bg-black text-emerald-400"
      initial={{ opacity: 1 }}
      animate={{ opacity: 0 }}
      transition={{ duration: 1.2, delay: 1 }}
    >
      <motion.div
        initial={{ scale: 0.7 }}
        animate={{ scale: [0.7, 1.2, 1] }}
        transition={{ duration: 1 }}
        className="text-4xl font-bold tracking-widest"
      >
        BUG EYEZ VIEW
      </motion.div>
    </motion.div>
  );
}
