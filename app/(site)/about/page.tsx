import type { Metadata } from "next"
import { Calendar } from "lucide-react"
import { SignInReminder } from "@/components/auth/sign-in-reminder"
import { Card, CardContent } from "@/components/ui/card"
import { buildLog, formatBuildDate } from "@/lib/build-log"

export const metadata: Metadata = {
  title: "About",
  description: "Who builds amer.lol, and everything that has shipped so far.",
}

export default function AboutPage() {
  return (
    <main id="main" className="container mx-auto px-4 py-20">
      <div className="animate-enter mx-auto max-w-3xl">
        <h1 className="mb-6 font-space-grotesk text-4xl font-bold md:text-5xl">About amer.lol</h1>

        <p className="mb-16 text-lg leading-relaxed text-muted-foreground">
          I&apos;m Amer, a platform engineer and amateur developer. I&apos;m a big fan of the web and love to
          build things that are useful and fun. I am slowly building things that I find useful in my daily
          life and share them here.
        </p>

        <div className="mb-10">
          <SignInReminder />
        </div>

        <h2 className="mb-8 font-space-grotesk text-3xl font-bold">Build Log</h2>
        <ol className="space-y-4">
          {buildLog.map((entry) => (
            <li key={`${entry.date}-${entry.title}`}>
              <Card>
                <CardContent className="flex items-start gap-4 p-6">
                  <Calendar className="mt-1 h-5 w-5 flex-shrink-0 text-muted-foreground" aria-hidden="true" />
                  <div className="min-w-0 flex-1">
                    <div className="mb-2 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                      <h3 className="text-lg font-semibold">{entry.title}</h3>
                      <time dateTime={entry.date} className="text-sm text-muted-foreground">
                        {formatBuildDate(entry.date)}
                      </time>
                    </div>
                    <p className="text-muted-foreground">{entry.description}</p>
                  </div>
                </CardContent>
              </Card>
            </li>
          ))}
        </ol>
      </div>
    </main>
  )
}
