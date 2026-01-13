"use client"

import * as React from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { AppEntry } from "@/lib/apps/registry"
import { cn } from "@/lib/utils"
import { Lock } from "lucide-react"
import { Button } from "@/components/ui/button"

interface AppCardProps {
  app: AppEntry
  locked?: boolean
}

export function AppCard({ app, locked = false }: AppCardProps) {
  const [mousePosition, setMousePosition] = React.useState({ x: 0, y: 0 })
  const cardRef = React.useRef<HTMLDivElement>(null)

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current || locked) return
    const rect = cardRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    setMousePosition({ x, y })
  }

  const handleMouseLeave = () => {
    setMousePosition({ x: 0.5, y: 0.5 })
  }

  const statusVariants = {
    live: "default",
    beta: "secondary",
    comingSoon: "outline",
  } as const

  const statusLabels = {
    live: "Live",
    beta: "Beta",
    comingSoon: "Coming Soon",
  }

  const tiltX = (mousePosition.x / (cardRef.current?.offsetWidth || 1) - 0.5) * 10
  const tiltY = (mousePosition.y / (cardRef.current?.offsetHeight || 1) - 0.5) * -10

  const cardContent = (
    <motion.div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      whileHover={{ y: -4 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      style={{
        rotateX: locked ? 0 : tiltY,
        rotateY: locked ? 0 : tiltX,
        transformStyle: "preserve-3d",
      }}
      className="relative"
    >
      <Card className="group relative overflow-hidden h-full cursor-pointer border-2 hover:border-primary/50 transition-colors">
        <div className={cn("absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-10 transition-opacity", `bg-gradient-to-br ${app.accent}`)} />
        
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className={cn("p-2 rounded-lg bg-gradient-to-br", app.accent)}>
              <app.icon className="h-5 w-5 text-white" />
            </div>
            <Badge variant={statusVariants[app.status]}>
              {statusLabels[app.status]}
            </Badge>
          </div>
          <CardTitle className="font-space-grotesk">{app.name}</CardTitle>
          <CardDescription>{app.description}</CardDescription>
        </CardHeader>

        <CardContent>
          <div className="flex flex-wrap gap-2">
            {app.tags.slice(0, 3).map((tag) => (
              <Badge key={tag} variant="outline" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
        </CardContent>

        {locked && (
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center rounded-lg">
            <div className="text-center space-y-3">
              <Lock className="h-8 w-8 mx-auto text-muted-foreground" />
              <Button size="sm" variant="default">
                Login to unlock
              </Button>
            </div>
          </div>
        )}
      </Card>
    </motion.div>
  )

  if (locked || app.status === "comingSoon") {
    return cardContent
  }

  return (
    <Link href={`/a/${app.appId}`} className="block">
      {cardContent}
    </Link>
  )
}