"use client"

import * as React from "react"
import Link from "next/link"
import Image from "next/image"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { ArrowRight } from "lucide-react"

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.2,
    },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
    },
  },
}

export function Hero() {
  return (
    <section className="relative min-h-[80vh] flex items-center justify-center overflow-hidden">
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="container mx-auto px-4 py-20 text-center relative z-10"
      >
        <motion.div
          variants={itemVariants}
          className="flex justify-center mb-8"
        >
          <Image
            src="/logo.png"
            alt="amer.lol"
            width={200}
            height={200}
            className="h-32 w-32 md:h-48 md:w-48 lg:h-64 lg:w-64 object-contain drop-shadow-2xl"
            priority
          />
        </motion.div>

        <motion.h1
          variants={itemVariants}
          className="font-space-grotesk text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent"
        >
          amer.lol
        </motion.h1>

        <motion.p
          variants={itemVariants}
          className="text-xl md:text-2xl text-muted-foreground mb-12 max-w-2xl mx-auto"
        >
          A premium, playful hub for mini-apps and experiments
        </motion.p>

        <motion.div
          variants={itemVariants}
          className="flex flex-col sm:flex-row gap-4 justify-center items-center"
        >
          <Button asChild size="lg" className="group">
            <Link href="/hub">
              Enter the Hub
              <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/about">Explore</Link>
          </Button>
        </motion.div>

      </motion.div>
    </section>
  )
}