"use client"

import * as React from "react"

// Rive fallback component
export function RiveAnimation() {
  // In a real implementation, you would use:
  // import { useRive } from "rive-react"
  // const { RiveComponent } = useRive({ src: "/rive/hero.riv" })
  // return <RiveComponent />
  
  // For now, return a placeholder with gradient animation
  return (
    <div className="w-full h-full rounded-lg bg-gradient-to-br from-primary/20 via-primary/10 to-transparent flex items-center justify-center">
      <div className="w-32 h-32 rounded-full bg-gradient-to-br from-primary/30 to-primary/10 animate-pulse" />
    </div>
  )
}