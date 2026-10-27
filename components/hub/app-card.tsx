"use client"

import * as React from "react"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import type { AppEntry } from "@/lib/apps/registry"
import { cn } from "@/lib/utils"

const MAX_TILT_DEGREES = 5

// Tilt is written straight to CSS variables, so following the pointer never re-renders the card.
function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
  if (event.pointerType !== "mouse" || event.buttons) return
  const card = event.currentTarget
  const rect = card.getBoundingClientRect()
  card.style.setProperty(
    "--tilt-x",
    `${((event.clientY - rect.top) / rect.height - 0.5) * -2 * MAX_TILT_DEGREES}deg`
  )
  card.style.setProperty(
    "--tilt-y",
    `${((event.clientX - rect.left) / rect.width - 0.5) * 2 * MAX_TILT_DEGREES}deg`
  )
}

function resetTilt(event: React.PointerEvent<HTMLDivElement>) {
  event.currentTarget.style.removeProperty("--tilt-x")
  event.currentTarget.style.removeProperty("--tilt-y")
}

export function AppCard({ app }: { app: AppEntry }) {
  const comingSoon = app.status === "comingSoon"

  const card = (
    <div
      onPointerMove={handlePointerMove}
      onPointerLeave={resetTilt}
      className="h-full transition-transform duration-200 ease-out [transform:perspective(800px)_translateY(var(--lift,0))_rotateX(var(--tilt-x,0))_rotateY(var(--tilt-y,0))] motion-safe:group-hover/link:[--lift:-4px] motion-reduce:![transform:none]"
    >
      <Card className="group relative h-full overflow-hidden border-2 transition-colors hover:border-primary/50">
        <div
          className={cn(
            "absolute inset-0 bg-gradient-to-br opacity-0 transition-opacity group-hover:opacity-10",
            app.accent
          )}
        />
        <CardHeader>
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

        {comingSoon && (
          <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-background/60 backdrop-blur-sm">
            <Badge variant="outline" className="px-3 py-1 text-sm">
              Coming Soon
            </Badge>
          </div>
        )}
      </Card>
    </div>
  )

  if (comingSoon) return card

  return (
    <Link
      href={`/a/${app.appId}`}
      className="group/link block h-full rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      {card}
    </Link>
  )
}
