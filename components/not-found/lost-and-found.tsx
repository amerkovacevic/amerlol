"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { AnimatePresence, MotionConfig, motion, useReducedMotion } from "framer-motion"
import { ArrowRight, Home, Search, Shuffle, Undo2 } from "lucide-react"
import { SiteHeader } from "@/components/layout/site-header"
import { Button } from "@/components/ui/button"
import { APP_REGISTRY } from "@/lib/apps/registry"
import { useHydrated } from "@/lib/hooks/use-hydrated"
import { Achievement, type AchievementData } from "./achievement"
import { SearchTerminal } from "./search-terminal"
import { SnakeGame } from "./snake-game"
import {
  countSecrets,
  getSecrets,
  recordSnakeScore,
  SECRET_IDS,
  unlockSecret,
  useSecretState,
  type SecretId,
} from "./use-secrets"

const TITLES: Record<SecretId, string> = {
  konami: "SHOULDN'T BE HERE",
  broken404: "BUTTERFINGERS",
  terminal: "TERMINALLY ONLINE",
  snake: "404: THE GAME",
  falseHope: "FALSE HOPE",
}
const KONAMI = [
  "arrowup",
  "arrowup",
  "arrowdown",
  "arrowdown",
  "arrowleft",
  "arrowright",
  "arrowleft",
  "arrowright",
  "b",
  "a",
]
const TAPS_TO_BREAK = 7
const TOUCH_WARNINGS: Record<number, string> = {
  4: "Please stop touching the 404.",
  5: "Seriously.",
  6: "I'm warning you.",
  7: "Fine.",
}
const ACHIEVEMENT_MS = 4200

type FalseHope = "idle" | "found" | "loading" | "lost"

const randomCaseNumber = () => `${Math.floor(1000 + Math.random() * 9000)}-${String(Date.now()).slice(-4)}`

export function LostAndFound() {
  return (
    <MotionConfig reducedMotion="user">
      <LostAndFoundPage />
    </MotionConfig>
  )
}

function LostAndFoundPage() {
  const pathname = usePathname()
  const router = useRouter()
  const reduced = useReducedMotion()
  const hydrated = useHydrated()
  const secrets = useSecretState()
  const count = countSecrets(secrets)
  // Generated per visit; the server and hydration render show a placeholder.
  const [caseNumber] = React.useState(randomCaseNumber)
  const [achievement, setAchievement] = React.useState<AchievementData | null>(null)
  const [completion, setCompletion] = React.useState(false)
  const [searchRun, setSearchRun] = React.useState(0)
  const [classified, setClassified] = React.useState(false)
  const [touches, setTouches] = React.useState(0)
  const [snakeBait, setSnakeBait] = React.useState(false)
  const [snakeOpen, setSnakeOpen] = React.useState(false)
  const [falseHope, setFalseHope] = React.useState<FalseHope>("idle")
  const achievementTimer = React.useRef<ReturnType<typeof setTimeout>>()
  const caseNumberTaps = React.useRef(0)
  const broken = touches >= TAPS_TO_BREAK

  const unlock = React.useCallback((id: SecretId) => {
    const { unlocked, completedAll } = unlockSecret(id)
    if (!unlocked) return
    setAchievement({ key: `${id}-${Date.now()}`, title: TITLES[id] })
    clearTimeout(achievementTimer.current)
    achievementTimer.current = setTimeout(() => setAchievement(null), ACHIEVEMENT_MS)
    if (completedAll) setCompletion(true)
  }, [])

  React.useEffect(() => () => clearTimeout(achievementTimer.current), [])

  React.useEffect(() => {
    let progress = 0
    const onKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase()
      progress = key === KONAMI[progress] ? progress + 1 : key === KONAMI[0] ? 1 : 0
      if (progress === KONAMI.length) {
        progress = 0
        setClassified(true)
        unlock("konami")
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [unlock])

  React.useEffect(() => {
    const timer = setTimeout(() => setSnakeBait(true), 30_000 + Math.random() * 9_000)
    return () => clearTimeout(timer)
  }, [])

  // A rare fake "we found it" sequence, rolled once per visit.
  React.useEffect(() => {
    const forced =
      process.env.NODE_ENV !== "production" &&
      new URLSearchParams(window.location.search).get("force404Secret") === "falseHope"
    if (getSecrets().falseHope || !(forced || Math.random() < 0.01)) return
    const timers = [
      setTimeout(() => setFalseHope("found"), 1800),
      setTimeout(() => setFalseHope("loading"), 3300),
      setTimeout(() => {
        setFalseHope("lost")
        unlock("falseHope")
      }, 5900),
    ]
    return () => timers.forEach(clearTimeout)
  }, [unlock])

  const hit404 = () => {
    const next = touches + 1
    setTouches(next)
    if (next >= TAPS_TO_BREAK) unlock("broken404")
  }

  const tapCaseNumber = () => {
    caseNumberTaps.current += 1
    if (caseNumberTaps.current === TAPS_TO_BREAK) {
      setClassified(true)
      unlock("konami")
    }
  }

  const openRandomApp = () => {
    const apps = APP_REGISTRY.filter((app) => app.status !== "comingSoon")
    router.push(`/a/${apps[Math.floor(Math.random() * apps.length)].appId}`)
  }

  const catchSnake = () => {
    setSnakeBait(false)
    setSnakeOpen(true)
    unlock("snake")
  }

  if (classified) return <Classified onExit={() => setClassified(false)} />

  const path = `amer.lol${pathname || "/somewhere"}`
  const warning = TOUCH_WARNINGS[touches] ?? ""
  const pageFound = falseHope === "found" || falseHope === "loading"

  return (
    <div className="min-h-screen overflow-hidden bg-background">
      <SiteHeader />
      <main
        id="main"
        className="relative isolate flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-10 sm:py-16"
      >
        <button
          aria-label="Decorative 404"
          onClick={hit404}
          className={`nf-backdrop absolute left-1/2 top-1/2 z-0 -translate-x-1/2 -translate-y-1/2 select-none bg-transparent font-space-grotesk text-[42vw] font-black leading-none tracking-[-.1em] text-foreground/[.035] outline-none transition-colors hover:text-primary/[.055] dark:text-white/[.035] ${broken ? "nf-fall" : ""}`}
        >
          404
        </button>
        {warning && !broken && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="pointer-events-none absolute bottom-5 z-20 text-xs font-medium text-muted-foreground"
          >
            {warning}
          </motion.p>
        )}
        <motion.section layout className="relative z-10 w-full max-w-3xl">
          <div className="mb-4 flex items-center justify-between px-1 text-[10px] font-bold uppercase tracking-[.2em] text-muted-foreground">
            <span>Amer.lol Lost &amp; Found Department</span>
            {count > 0 && (
              <span>
                Secrets Found: {count} / {SECRET_IDS.length}
              </span>
            )}
          </div>
          <div className="rounded-2xl border bg-card/90 p-5 shadow-2xl backdrop-blur-xl sm:p-9">
            <AnimatePresence mode="wait">
              <motion.div
                key={pageFound ? "200" : broken ? "405" : "404"}
                initial={reduced ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
              >
                {pageFound ? (
                  <Success loading={falseHope === "loading"} />
                ) : (
                  <>
                    <p className="mb-2 text-xs font-bold uppercase tracking-[.24em] text-primary">
                      {broken ? "405 · 404 Not Found" : "You have entered the void"}
                    </p>
                    <h1 className="break-all text-3xl font-bold tracking-tight sm:text-5xl">
                      {broken ? "Great. You lost the error page." : path}
                    </h1>
                    {falseHope === "lost" && (
                      <p className="mt-2 text-lg text-muted-foreground">We lost it again.</p>
                    )}
                    {!broken && (
                      <>
                        <div className="my-7 grid grid-cols-2 gap-px overflow-hidden rounded-xl border bg-border sm:grid-cols-4">
                          <Report label="Status" value="Missing" />
                          <Report label="Last Seen" value="Just now" />
                          <Report label="Recovery Chance" value="Questionable" />
                          <button
                            type="button"
                            onClick={tapCaseNumber}
                            className="bg-background p-3 text-left"
                          >
                            <span className="block text-[10px] uppercase tracking-wider text-muted-foreground">
                              Case Number
                            </span>
                            <span className="mt-1 block font-mono text-xs font-semibold">
                              {hydrated ? caseNumber : "----"}
                            </span>
                          </button>
                        </div>
                        <div className="flex flex-col gap-2 sm:flex-row">
                          <Button onClick={() => setSearchRun((run) => run + 1)} size="lg">
                            <Search className="mr-2 h-4 w-4" />
                            Find My Page
                          </Button>
                          <Button asChild variant="outline" size="lg">
                            <Link href="/">
                              <Home className="mr-2 h-4 w-4" />
                              Take Me Home
                            </Link>
                          </Button>
                          <Button variant="ghost" size="lg" onClick={openRandomApp}>
                            <Shuffle className="mr-2 h-4 w-4" />
                            Random Amer.lol App
                          </Button>
                        </div>
                        {searchRun > 0 && (
                          // Remounting restarts the search animation for every click.
                          <SearchTerminal key={searchRun} onTerminalSecret={() => unlock("terminal")} />
                        )}
                      </>
                    )}
                  </>
                )}
              </motion.div>
            </AnimatePresence>
            {broken && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 2 }}
                className="mt-6"
              >
                <Button variant="outline" onClick={() => setTouches(0)}>
                  <Undo2 className="mr-2 h-4 w-4" />
                  Fix What I Broke
                </Button>
              </motion.div>
            )}
          </div>
        </motion.section>
        {snakeBait && !snakeOpen && (
          <button
            type="button"
            onClick={catchSnake}
            aria-label="A tiny pixel snake"
            className="nf-snake fixed bottom-[max(3px,env(safe-area-inset-bottom))] z-40 flex h-5 items-center gap-[2px]"
          >
            <i />
            <i />
            <i />
            <i />
            <i />
          </button>
        )}
      </main>
      {snakeOpen && (
        <SnakeGame
          best={secrets.snakeHighScore}
          onScore={recordSnakeScore}
          onClose={() => setSnakeOpen(false)}
        />
      )}
      <Achievement achievement={achievement} />
      {completion && <Completion onClose={() => setCompletion(false)} />}
    </div>
  )
}

function Report({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-background p-3">
      <span className="block text-[10px] uppercase tracking-wider text-muted-foreground">{label}</span>
      <span className="mt-1 block text-xs font-semibold">{value}</span>
    </div>
  )
}

function Success({ loading }: { loading: boolean }) {
  return (
    <div className="py-8 text-center">
      <motion.div
        initial={{ scale: 0.3, rotate: -20 }}
        animate={{ scale: 1, rotate: 0 }}
        className="text-8xl font-black text-primary"
      >
        200
      </motion.div>
      <h1 className="mt-4 text-4xl font-bold">PAGE FOUND!</h1>
      <p className="mt-2 text-muted-foreground">Against all odds, we found it.</p>
      {loading && (
        <>
          <p className="mt-8 text-sm">Restoring requested page...</p>
          <div className="mx-auto mt-3 h-1.5 w-56 overflow-hidden rounded-full bg-muted">
            <motion.div
              className="h-full bg-primary"
              initial={{ width: 0 }}
              animate={{ width: "92%" }}
              transition={{ duration: 2 }}
            />
          </div>
        </>
      )}
    </div>
  )
}

function Classified({ onExit }: { onExit: () => void }) {
  return (
    <div className="nf-glitch min-h-screen bg-[#020b06] p-5 font-mono text-sm text-green-400 sm:grid sm:place-items-center">
      <div className="mx-auto max-w-2xl border border-green-500/40 p-6 shadow-[0_0_50px_rgba(34,197,94,.12)]">
        <p className="font-bold">AMER.LOL INTERNAL SYSTEM</p>
        <p>────────────────────────</p>
        <p>
          CLEARANCE LEVEL: QUESTIONABLE
          <br />
          USER: UNKNOWN
          <br />
          LOCATION: 404
        </p>
        <p className="my-5">
          ACCESSING CLASSIFIED SYSTEMS...
          <br />
          <b className="text-green-200">ACCESS GRANTED</b>
          <br />
          You weren't supposed to find this.
        </p>
        <div className="grid grid-cols-2 gap-x-8 gap-y-2 border-y border-green-500/20 py-4">
          <span>SERVER STATUS</span>
          <span>probably fine</span>
          <span>SECURITY</span>
          <span>concerning</span>
          <span>UPTIME</span>
          <span>don't ask</span>
          <span>TECH DEBT</span>
          <span>classified</span>
          <span>AMER'S TODO LIST</span>
          <span>847 items</span>
          <span>PRODUCTION BUGS</span>
          <span>features</span>
        </div>
        <p className="mt-6 text-xs">ACHIEVEMENT UNLOCKED</p>
        <p className="text-xl font-bold text-green-200">SHOULDN'T BE HERE</p>
        <button
          type="button"
          onClick={onExit}
          className="mt-8 text-xs text-green-500/60 hover:text-green-300"
        >
          [ disconnect ]
        </button>
      </div>
    </div>
  )
}

function Completion({ onClose }: { onClose: () => void }) {
  return (
    <motion.div
      className="fixed inset-0 z-[90] grid place-items-center bg-background/95 p-5 text-center backdrop-blur"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <div>
        <p className="text-xs font-bold uppercase tracking-[.3em] text-primary">5 / 5 secrets found</p>
        <h2 className="mt-4 text-4xl font-black sm:text-6xl">YOU FOUND EVERYTHING.</h2>
        <p className="mx-auto mt-4 max-w-md text-muted-foreground">
          I don't know whether to congratulate you
          <br />
          or ask why you spent this much time on a 404 page.
        </p>
        <div className="mx-auto my-8 max-w-sm rounded-xl border border-primary/30 p-4">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Achievement unlocked</p>
          <p className="text-2xl font-bold">TOUCH GRASS</p>
          <p className="text-xs text-muted-foreground">Discovered every Amer.lol 404 secret.</p>
        </div>
        <Button asChild size="lg" onClick={onClose}>
          <Link href="/">
            Fine. You Win.
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </div>
    </motion.div>
  )
}
