"use client"

import * as React from "react"
import Link from "next/link"
import { motion, useReducedMotion } from "framer-motion"
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
  const reduceMotion = useReducedMotion()

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (locked || reduceMotion || e.buttons) return
    const rect = e.currentTarget.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width - 0.5) * 10
    const y = ((e.clientY - rect.top) / rect.height - 0.5) * -10
    setMousePosition({ x, y })
  }

  const handleMouseLeave = () => {
    setMousePosition({ x: 0, y: 0 })
  }

  const cardContent = (
    <motion.div
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      whileHover={reduceMotion ? undefined : { y: -4 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      style={{
        rotateX: locked || reduceMotion ? 0 : mousePosition.y,
        rotateY: locked || reduceMotion ? 0 : mousePosition.x,
        transformStyle: "preserve-3d",
      }}
      className="relative h-full"
    >
      <Card className="group relative overflow-hidden h-full cursor-pointer border-2 hover:border-primary/50 transition-colors">
        <div className={cn("absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-10 transition-opacity", `bg-gradient-to-br ${app.accent}`)} />
        
        <CardHeader>
          {app.status === "comingSoon" && (
            <div className="flex items-start justify-between mb-2">
              <Badge variant="outline">Coming Soon</Badge>
            </div>
          )}
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
              <div className="p-3 rounded-full bg-foreground/10 border-2 border-foreground/20 mx-auto w-fit">
                <Lock className="h-8 w-8 text-slate-900 dark:text-slate-100" strokeWidth={2.5} />
              </div>
              <Button size="sm" variant="default">
                Login to unlock
              </Button>
            </div>
          </div>
        )}

        {app.status === "comingSoon" && (
          <div className="absolute inset-0 bg-background/60 backdrop-blur-sm flex items-center justify-center rounded-lg">
            <div className="text-center space-y-2">
              <Badge variant="outline" className="text-sm px-3 py-1">
                Coming Soon
              </Badge>
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
    <Link href={`/a/${app.appId}`} className="block h-full rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background">
      {cardContent}
    </Link>
  )
}
