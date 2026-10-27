import { Calendar } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { buildLog, formatBuildDate } from "@/lib/build-log"

export function LatestDrops() {
  return (
    <section className="container mx-auto px-4 py-20">
      <div className="mb-12 text-center">
        <h2 className="mb-4 font-space-grotesk text-3xl font-bold md:text-4xl">Latest Drops</h2>
        <p className="text-lg text-muted-foreground">Recent updates and new additions</p>
      </div>

      <div className="mx-auto grid max-w-4xl grid-cols-1 gap-6 md:grid-cols-2">
        {buildLog.slice(0, 4).map((item) => (
          <Card key={`${item.date}-${item.title}`} className="h-full">
            <CardHeader>
              <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
                <Badge variant="secondary">Update</Badge>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" aria-hidden="true" />
                  <time dateTime={item.date}>{formatBuildDate(item.date)}</time>
                </div>
              </div>
              <CardTitle className="text-xl">{item.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">{item.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  )
}
