"use client"

import * as React from "react"
import { AnimatePresence, motion } from "framer-motion"
import { Check, Clock3, Flag, Globe2, Play, RotateCcw, Trophy } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { CONTINENTS, COUNTRIES, type Continent, normalizeCountry } from "./countries"
import { CountryMap } from "./country-map"
import { ATLAS_SPRINT_SETTINGS_EVENT, readAtlasSprintPreferences, type AtlasSprintPreferences } from "./atlas-sprint-settings"

type Region = "World" | Continent
type Status = "setup" | "playing" | "finished"

function formatTime(seconds: number) {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`
}

export function AtlasSprintMain() {
  const [region, setRegion] = React.useState<Region>("World")
  const [status, setStatus] = React.useState<Status>("setup")
  const [guessed, setGuessed] = React.useState<string[]>([])
  const [value, setValue] = React.useState("")
  const [remaining, setRemaining] = React.useState(15 * 60)
  const [feedback, setFeedback] = React.useState<string | null>(null)
  const [preferences, setPreferences] = React.useState<AtlasSprintPreferences>({ focusOnCorrectAnswer: true })
  const inputRef = React.useRef<HTMLInputElement>(null)

  const pool = React.useMemo(() => region === "World" ? COUNTRIES : COUNTRIES.filter((country) => country.continent === region), [region])
  const guessedSet = React.useMemo(() => new Set(guessed), [guessed])
  const progress = Math.round((guessed.length / pool.length) * 100)
  const finish = React.useCallback(() => setStatus("finished"), [])

  React.useEffect(() => {
    setPreferences(readAtlasSprintPreferences())
    const handleSettingsChange = (event: Event) => setPreferences((event as CustomEvent<AtlasSprintPreferences>).detail)
    window.addEventListener(ATLAS_SPRINT_SETTINGS_EVENT, handleSettingsChange)
    return () => window.removeEventListener(ATLAS_SPRINT_SETTINGS_EVENT, handleSettingsChange)
  }, [])

  React.useEffect(() => {
    if (status !== "playing") return
    if (guessed.length === pool.length) { finish(); return }
    const timer = window.setInterval(() => setRemaining((time) => {
      if (time <= 1) { window.clearInterval(timer); finish(); return 0 }
      return time - 1
    }), 1000)
    return () => window.clearInterval(timer)
  }, [status, guessed.length, pool.length, finish])

  const startGame = () => {
    setGuessed([])
    setValue("")
    setFeedback(null)
    setRemaining(region === "World" ? 15 * 60 : Math.max(3 * 60, pool.length * 8))
    setStatus("playing")
    window.setTimeout(() => inputRef.current?.focus(), 50)
  }

  const submitGuess = (raw: string) => {
    setValue(raw)
    const normalized = normalizeCountry(raw)
    if (!normalized) return
    const match = pool.find((country) => [country.name, ...(country.aliases ?? [])].some((name) => normalizeCountry(name) === normalized))
    if (!match) return
    if (guessedSet.has(match.name)) {
      setValue("")
      setFeedback(`${match.name} was already guessed`)
      return
    }
    setGuessed((current) => [...current, match.name])
    setFeedback(`${match.name} added`)
    setValue("")
  }

  if (status === "setup") return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">How much of the world can you name?</h2>
        <p className="text-muted-foreground">Race the clock and name all 197 countries, or practice one continent at a time.</p>
      </div>
      <Card>
        <CardHeader><CardTitle>Choose a quiz</CardTitle><CardDescription>Select the whole world or a continent to begin.</CardDescription></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {(["World", ...CONTINENTS] as Region[]).map((item) => {
              const count = item === "World" ? COUNTRIES.length : COUNTRIES.filter((country) => country.continent === item).length
              return <Button key={item} variant={region === item ? "default" : "outline"} onClick={() => setRegion(item)} className="h-auto justify-start px-4 py-3">
                <Globe2 className="mr-3 h-4 w-4 shrink-0" />
                <span className="text-left"><span className="block">{item}</span><span className={region === item ? "block text-xs text-primary-foreground/80" : "block text-xs text-muted-foreground"}>{count} countries</span></span>
              </Button>
            })}
          </div>
          <Button size="lg" onClick={startGame} className="mt-6"><Play className="mr-2 h-4 w-4" />Start {region} quiz</Button>
        </CardContent>
      </Card>
    </motion.div>
  )

  const missed = pool.filter((country) => !guessedSet.has(country.name))

  if (status === "finished") return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="space-y-6">
      <Card>
        <CardHeader><Trophy className="mb-2 h-8 w-8 text-primary" /><CardTitle>{guessed.length === pool.length ? "Perfect atlas!" : "Quiz complete"}</CardTitle><CardDescription>You named {guessed.length} of {pool.length} countries in {region}.</CardDescription></CardHeader>
        <CardContent>
          <div className="mb-6"><div className="mb-2 flex justify-between text-sm"><span>Final score</span><strong>{progress}%</strong></div><div className="h-2 rounded-full bg-secondary"><div className="h-2 rounded-full bg-primary" style={{ width: `${progress}%` }} /></div></div>
          <div className="flex flex-wrap gap-4"><Button onClick={startGame}><RotateCcw className="mr-2 h-4 w-4" />Play again</Button><Button variant="outline" onClick={() => setStatus("setup")}>Change quiz</Button></div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Map results</CardTitle><CardDescription>Guessed and missing countries are labeled for review.</CardDescription></CardHeader>
        <CardContent>
          <div className="mb-4 flex flex-wrap gap-4 text-sm text-muted-foreground"><span className="flex items-center gap-2"><span className="h-3 w-3 rounded-sm bg-primary" />Guessed</span><span className="flex items-center gap-2"><span className="h-3 w-3 rounded-sm bg-secondary" />Missed</span></div>
          <CountryMap region={region} guessed={guessed} revealRemaining />
        </CardContent>
      </Card>
      {missed.length > 0 && <Card><CardHeader><CardTitle>Countries you missed</CardTitle><CardDescription>Review these before your next attempt.</CardDescription></CardHeader><CardContent className="flex flex-wrap gap-2">{missed.map((country) => <Badge key={country.name} variant="secondary">{country.name}</Badge>)}</CardContent></Card>}
    </motion.div>
  )

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="space-y-6" onClick={() => inputRef.current?.focus()}>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card><CardContent className="p-6"><Flag className="mb-3 h-5 w-5 text-muted-foreground" /><div className="text-2xl font-bold tabular-nums">{guessed.length} <span className="text-base font-normal text-muted-foreground">of {pool.length}</span></div><p className="text-sm text-muted-foreground">Countries named</p></CardContent></Card>
        <Card><CardContent className="p-6"><Clock3 className="mb-3 h-5 w-5 text-muted-foreground" /><div className="text-2xl font-bold tabular-nums">{formatTime(remaining)}</div><p className="text-sm text-muted-foreground">Time remaining</p></CardContent></Card>
        <Card><CardContent className="p-6"><Globe2 className="mb-3 h-5 w-5 text-muted-foreground" /><div className="text-2xl font-bold">{region}</div><p className="text-sm text-muted-foreground">Current quiz</p></CardContent></Card>
      </div>
      <Card>
        <CardHeader><CardTitle>Progress map</CardTitle><CardDescription>Guessed countries are labeled. Empty markers show where answers are still missing.</CardDescription></CardHeader>
        <CardContent>
          <div className="mb-4 flex flex-wrap gap-4 text-sm text-muted-foreground"><span className="flex items-center gap-2"><span className="h-3 w-3 rounded-sm bg-primary" />Guessed</span><span className="flex items-center gap-2"><span className="h-3 w-3 rounded-sm bg-secondary" />Remaining</span></div>
          <CountryMap region={region} guessed={guessed} focusOnGuess={preferences.focusOnCorrectAnswer} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Name a country</CardTitle><CardDescription>Answers are accepted automatically when the name matches.</CardDescription></CardHeader>
        <CardContent>
          <div className="mb-6 h-2 rounded-full bg-secondary"><motion.div className="h-2 rounded-full bg-primary" animate={{ width: `${progress}%` }} /></div>
          <Label htmlFor="country-guess">Country</Label>
          <div className="mt-2 flex gap-4"><Input ref={inputRef} id="country-guess" value={value} onChange={(event) => submitGuess(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") submitGuess(value) }} placeholder="Start typing..." autoComplete="off" autoFocus /><Button variant="outline" onClick={finish}>Give up</Button></div>
          <AnimatePresence mode="wait">{feedback && <motion.p key={feedback} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-3 text-sm text-muted-foreground" aria-live="polite"><span className="inline-flex items-center"><Check className="mr-1 h-4 w-4 text-primary" />{feedback}</span></motion.p>}</AnimatePresence>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Your answers</CardTitle><CardDescription>{guessed.length ? "Every correct answer appears here." : "Your correct answers will appear here."}</CardDescription></CardHeader>
        <CardContent>{guessed.length > 0 && <div className="flex flex-wrap gap-2"><AnimatePresence>{[...guessed].reverse().map((name) => <motion.div key={name} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}><Badge variant="secondary"><Check className="mr-1 h-3 w-3" />{name}</Badge></motion.div>)}</AnimatePresence></div>}</CardContent>
      </Card>
    </motion.div>
  )
}
