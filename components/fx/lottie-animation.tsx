"use client"

import * as React from "react"
import dynamic from "next/dynamic"

// Lazy load Lottie with fallback
const Lottie = dynamic(() => import("lottie-react"), {
  ssr: false,
  loading: () => <div className="w-full h-full bg-muted rounded-lg animate-pulse" />,
})

interface LottieAnimationProps {
  animationData?: any
  className?: string
}

export function LottieAnimation({ animationData, className }: LottieAnimationProps) {
  // In a real implementation, you would import animation data:
  // import animationData from "@/public/lottie/animation.json"
  
  // For now, return a placeholder
  if (!animationData) {
    return (
      <div className={`flex items-center justify-center ${className}`}>
        <div className="w-32 h-32 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 animate-pulse flex items-center justify-center">
          <div className="w-16 h-16 rounded-full bg-primary/30" />
        </div>
      </div>
    )
  }

  return (
    <Lottie
      animationData={animationData}
      loop={true}
      className={className}
    />
  )
}