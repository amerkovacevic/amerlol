import Link from "next/link"
import Image from "next/image"
import { ArrowRight } from "lucide-react"
import { SignInReminder } from "@/components/auth/sign-in-reminder"
import { Button } from "@/components/ui/button"
import { enterDelay } from "@/lib/utils"

export function Hero() {
  return (
    <section className="relative flex min-h-[80vh] items-center justify-center overflow-hidden">
      <div className="container relative z-10 mx-auto px-4 py-20 text-center">
        <Image
          src="/logo-512.webp"
          alt=""
          width={256}
          height={256}
          className="animate-enter mx-auto mb-8 h-32 w-32 object-contain drop-shadow-2xl md:h-48 md:w-48 lg:h-64 lg:w-64"
          priority
        />

        <h1
          className="animate-enter mb-6 bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text font-space-grotesk text-5xl font-bold text-transparent md:text-7xl"
          style={enterDelay(100)}
        >
          amer.lol
        </h1>

        <p
          className="animate-enter mx-auto mb-12 max-w-2xl text-xl text-muted-foreground md:text-2xl"
          style={enterDelay(200)}
        >
          A premium, playful hub for mini-apps and experiments
        </p>

        <div
          className="animate-enter flex flex-col items-center justify-center gap-4 sm:flex-row"
          style={enterDelay(300)}
        >
          <Button asChild size="lg" className="group">
            <Link href="/hub">
              Enter the Hub
              <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/about">About this project</Link>
          </Button>
        </div>

        <div className="mx-auto mt-8 max-w-xl text-left">
          <SignInReminder />
        </div>
      </div>
    </section>
  )
}
