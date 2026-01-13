import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { SearchX } from "lucide-react"

export default function NotFound() {
  return (
    <div className="container mx-auto px-4 py-20 flex items-center justify-center min-h-[60vh]">
      <Card className="max-w-md w-full text-center">
        <CardHeader>
          <SearchX className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <CardTitle className="text-2xl">App Not Found</CardTitle>
          <CardDescription>
            The app you&apos;re looking for doesn&apos;t exist or has been removed.
          </CardDescription>
        </CardHeader>
        <CardFooter className="justify-center">
          <Button asChild>
            <Link href="/hub">Back to Hub</Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}