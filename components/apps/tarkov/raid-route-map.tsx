"use client"

import * as React from "react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import type { RaidMapPlan, RaidPlanStep } from "@/lib/tarkov/domain/raid-planner"
import type { MapRoutingData, NormalizedPoint } from "@/lib/tarkov/routing/types"

interface RaidRouteMapProps {
  plan: RaidMapPlan
  mapName: string
  routingData?: MapRoutingData
}

interface PlotPoint {
  id: string
  label: string
  kind: "objective" | "spawn" | "extract"
  point: NormalizedPoint
  description?: string
}

const VIEWBOX_WIDTH = 1000
const VIEWBOX_HEIGHT = 620
const PADDING = 52

function resolveOverrideObjectivePoint(step: RaidPlanStep, data: MapRoutingData): NormalizedPoint | undefined {
  const ref = data.objectiveRefs.find(
    (entry) => entry.questId === step.questId && entry.objectiveId === step.objectiveId
  )
  if (!ref) return undefined
  return data.locations.find((location) => location.id === ref.locationId)?.point
}

function buildPlotPoints(plan: RaidMapPlan, routingData?: MapRoutingData): PlotPoint[] {
  const points: PlotPoint[] = []

  if (plan.route.coordinateSource === "override" && routingData) {
    const spawn = plan.route.selectedSpawnLocationId
      ? routingData.locations.find((location) => location.id === plan.route.selectedSpawnLocationId)
      : undefined
    if (spawn) {
      points.push({ id: `spawn:${spawn.id}`, label: "S", kind: "spawn", point: spawn.point, description: spawn.name })
    }

    plan.objectives.forEach((step, index) => {
      const point = resolveOverrideObjectivePoint(step, routingData)
      if (!point) return
      points.push({
        id: `objective:${step.questId}:${step.objectiveId}`,
        label: String(index + 1),
        kind: "objective",
        point,
        description: `${step.questName}: ${step.description}`,
      })
    })

    const extract = plan.route.selectedExtractLocationId
      ? routingData.locations.find((location) => location.id === plan.route.selectedExtractLocationId)
      : undefined
    if (extract) {
      points.push({ id: `extract:${extract.id}`, label: "E", kind: "extract", point: extract.point, description: extract.name })
    }

    return points
  }

  plan.objectives.forEach((step, index) => {
    if (!step.routePoint) return
    points.push({
      id: `objective:${step.questId}:${step.objectiveId}`,
      label: String(index + 1),
      kind: "objective",
      point: step.routePoint,
      description: `${step.questName}: ${step.description}`,
    })
  })

  return points
}

function project(points: PlotPoint[]): Array<PlotPoint & { sx: number; sy: number }> {
  if (points.length === 0) return []

  const xs = points.map((entry) => entry.point.x)
  const ys = points.map((entry) => entry.point.y)
  const minX = Math.min(...xs)
  const maxX = Math.max(...xs)
  const minY = Math.min(...ys)
  const maxY = Math.max(...ys)
  const width = Math.max(maxX - minX, 0.0001)
  const height = Math.max(maxY - minY, 0.0001)

  return points.map((entry) => ({
    ...entry,
    sx: PADDING + ((entry.point.x - minX) / width) * (VIEWBOX_WIDTH - PADDING * 2),
    sy: PADDING + ((maxY - entry.point.y) / height) * (VIEWBOX_HEIGHT - PADDING * 2),
  }))
}

export function RaidRouteMap({ plan, mapName, routingData }: RaidRouteMapProps) {
  const [activeId, setActiveId] = React.useState<string | undefined>()
  const plotted = React.useMemo(() => project(buildPlotPoints(plan, routingData)), [plan, routingData])

  if (plotted.length === 0) {
    return (
      <Card className="border-dashed">
        <CardHeader>
          <CardTitle>Raid route map</CardTitle>
          <CardDescription>No geographic points are available for this raid plan yet.</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  const active = plotted.find((entry) => entry.id === activeId)
  const polyline = plotted.map((entry) => `${entry.sx},${entry.sy}`).join(" ")

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle>Raid route map</CardTitle>
            <CardDescription>
              Relative route visualization for {mapName}. This plots known route geometry only; it is not a replacement for the in-game map image.
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">{plan.route.geographicObjectiveCount} located</Badge>
            {plan.route.fallbackObjectiveCount > 0 && <Badge variant="outline">{plan.route.fallbackObjectiveCount} fallback</Badge>}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="overflow-hidden rounded-lg border bg-muted/20">
          <svg
            viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
            className="block aspect-[16/10] w-full"
            role="img"
            aria-label={`Relative raid route for ${mapName}`}
          >
            <defs>
              <pattern id="tarkov-route-grid" width="50" height="50" patternUnits="userSpaceOnUse">
                <path d="M 50 0 L 0 0 0 50" fill="none" stroke="currentColor" strokeOpacity="0.07" strokeWidth="1" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#tarkov-route-grid)" />
            {plotted.length > 1 && (
              <polyline
                points={polyline}
                fill="none"
                stroke="currentColor"
                strokeOpacity="0.55"
                strokeWidth="5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}
            {plotted.map((entry) => (
              <g
                key={entry.id}
                transform={`translate(${entry.sx} ${entry.sy})`}
                className="cursor-pointer"
                tabIndex={0}
                role="button"
                aria-label={entry.description ?? entry.label}
                onMouseEnter={() => setActiveId(entry.id)}
                onMouseLeave={() => setActiveId(undefined)}
                onFocus={() => setActiveId(entry.id)}
                onBlur={() => setActiveId(undefined)}
              >
                <circle r={entry.kind === "objective" ? 18 : 21} className="fill-background stroke-foreground" strokeWidth="4" />
                <text textAnchor="middle" dominantBaseline="central" className="fill-foreground text-[15px] font-bold">
                  {entry.label}
                </text>
              </g>
            ))}
          </svg>
        </div>
        <div className="min-h-10 rounded-md border px-3 py-2 text-sm">
          {active ? (
            <>
              <span className="font-medium">{active.label}</span>
              {active.description ? <span className="text-muted-foreground"> · {active.description}</span> : null}
            </>
          ) : (
            <span className="text-muted-foreground">Hover or focus a route marker to inspect it.</span>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
