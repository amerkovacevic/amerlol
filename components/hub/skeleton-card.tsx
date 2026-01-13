import { Card, CardContent, CardHeader } from "@/components/ui/card"

export function SkeletonCard() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="h-10 w-10 rounded-lg bg-muted animate-pulse" />
          <div className="h-6 w-16 rounded-full bg-muted animate-pulse" />
        </div>
        <div className="space-y-2">
          <div className="h-6 w-3/4 rounded bg-muted animate-pulse" />
          <div className="h-4 w-full rounded bg-muted animate-pulse" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex gap-2">
          <div className="h-5 w-16 rounded-full bg-muted animate-pulse" />
          <div className="h-5 w-20 rounded-full bg-muted animate-pulse" />
          <div className="h-5 w-14 rounded-full bg-muted animate-pulse" />
        </div>
      </CardContent>
    </Card>
  )
}