import { SearchX } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"

interface EmptyStateProps {
  title?: string
  description?: string
  icon?: React.ReactNode
}

export function EmptyState({
  title = "No apps found",
  description = "Try adjusting your filters or search query",
  icon,
}: EmptyStateProps) {
  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center justify-center py-16">
        {icon || <SearchX className="h-12 w-12 text-muted-foreground mb-4" />}
        <h3 className="text-lg font-semibold mb-2">{title}</h3>
        <p className="text-sm text-muted-foreground text-center max-w-sm">
          {description}
        </p>
      </CardContent>
    </Card>
  )
}