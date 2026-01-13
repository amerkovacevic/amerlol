"use client"

import { motion } from "framer-motion"

export function BackgroundFX() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
      <motion.div
        className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-background"
        animate={{
          background: [
            "radial-gradient(circle at 20% 50%, hsl(199, 89%, 48%, 0.05) 0%, transparent 50%)",
            "radial-gradient(circle at 80% 50%, hsl(199, 89%, 48%, 0.05) 0%, transparent 50%)",
            "radial-gradient(circle at 50% 20%, hsl(199, 89%, 48%, 0.05) 0%, transparent 50%)",
            "radial-gradient(circle at 20% 50%, hsl(199, 89%, 48%, 0.05) 0%, transparent 50%)",
          ],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: "linear",
        }}
      />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />
    </div>
  )
}