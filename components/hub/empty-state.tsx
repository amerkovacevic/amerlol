import { SearchX } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

export function EmptyState({ onClear }: { onClear: () => void }) {
  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center justify-center py-16 text-center">
        <SearchX className="mb-4 h-12 w-12 text-muted-foreground" aria-hidden="true" />
        <h2 className="mb-2 text-lg font-semibold">No apps found</h2>
        <p className="mb-6 max-w-sm text-sm text-muted-foreground">
          Nothing matches that search and category.
        </p>
        <Button variant="outline" onClick={onClear}>
          Clear filters
        </Button>
      </CardContent>
    </Card>
  )
}
