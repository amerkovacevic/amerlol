"use client"

import * as React from "react"
import { AnimatePresence, motion, useReducedMotion } from "framer-motion"
import { Check, Clapperboard, FileUp, Plus, Search, Trash2, Upload, X } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"

interface Movie { id: string; name: string; year?: string; uri?: string }

const COLORS = ["#ff8000", "#00c030", "#40bcf4", "#9b5de5", "#f15bb5", "#f5c518", "#ef476f", "#06d6a0"]
const STORAGE_KEY = "next-watch-movies-v1"

function parseRow(row: string) {
  const fields: string[] = []; let value = ""; let quoted = false
  for (let i = 0; i < row.length; i += 1) {
    const char = row[i]
    if (char === '"' && quoted && row[i + 1] === '"') { value += '"'; i += 1 }
    else if (char === '"') quoted = !quoted
    else if (char === "," && !quoted) { fields.push(value.trim()); value = "" }
    else value += char
  }
  fields.push(value.trim()); return fields
}

function parseLetterboxdCsv(text: string): Movie[] {
  const rows = text.replace(/^\uFEFF/, "").split(/\r?\n/).filter(Boolean)
  if (rows.length < 2) return []
  const headers = parseRow(rows[0]).map((header) => header.toLowerCase())
  const nameAt = headers.indexOf("name"), yearAt = headers.indexOf("year")
  const uriAt = headers.findIndex((header) => header.includes("letterboxd uri"))
  if (nameAt < 0) return []
  const seen = new Set<string>()
  return rows.slice(1).map(parseRow).map((fields, index) => ({ id: `import-${Date.now()}-${index}`, name: fields[nameAt]?.trim(), year: yearAt >= 0 ? fields[yearAt]?.trim() : undefined, uri: uriAt >= 0 ? fields[uriAt]?.trim() : undefined })).filter((movie) => {
    const key = `${movie.name.toLowerCase()}-${movie.year || ""}`
    if (!movie.name || seen.has(key)) return false
    seen.add(key); return true
  })
}

export function NextWatchMain() {
  const reduceMotion = useReducedMotion()
  const fileInput = React.useRef<HTMLInputElement>(null)
  const resultTimer = React.useRef<ReturnType<typeof setTimeout>>()
  const [movies, setMovies] = React.useState<Movie[]>([])
  const [rotation, setRotation] = React.useState(0)
  const [spinning, setSpinning] = React.useState(false)
  const [winner, setWinner] = React.useState<Movie | null>(null)
  const [search, setSearch] = React.useState("")
  const [newMovie, setNewMovie] = React.useState("")
  const [dragging, setDragging] = React.useState(false)
  const [loaded, setLoaded] = React.useState(false)

  React.useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const savedMovies = JSON.parse(saved) as Movie[]
        setMovies(savedMovies.every((movie) => movie.id.startsWith("sample-")) ? [] : savedMovies)
      }
    } catch {}
    setLoaded(true)
    return () => { if (resultTimer.current) clearTimeout(resultTimer.current) }
  }, [])
  React.useEffect(() => { if (loaded) localStorage.setItem(STORAGE_KEY, JSON.stringify(movies)) }, [loaded, movies])

  const segments = React.useMemo(() => movies.map((_, i) => `${COLORS[i % COLORS.length]} ${(i / movies.length) * 360}deg ${((i + 1) / movies.length) * 360}deg`).join(", "), [movies])
  const visible = movies.filter((movie) => `${movie.name} ${movie.year || ""}`.toLowerCase().includes(search.toLowerCase()))

  const importFile = async (file?: File) => {
    if (!file) return
    if (!file.name.toLowerCase().endsWith(".csv")) return toast.error("Choose the CSV file from your Letterboxd export")
    try {
      const imported = parseLetterboxdCsv(await file.text())
      if (!imported.length) return toast.error("We couldn't find any movies in that CSV")
      setMovies(imported); setSearch(""); toast.success(`Imported ${imported.length} movies from Letterboxd`)
    } catch { toast.error("That watchlist couldn't be imported") }
  }
  const addMovie = () => { const name = newMovie.trim(); if (name) { setMovies((list) => [...list, { id: `manual-${Date.now()}`, name }]); setNewMovie("") } }
  const spin = () => {
    if (movies.length < 2 || spinning) return
    const index = Math.floor(Math.random() * movies.length), angle = 360 / movies.length
    const desired = 360 - (index + 0.5) * angle, normalized = ((rotation % 360) + 360) % 360
    setSpinning(true); setRotation((value) => value + ((desired - normalized + 360) % 360) + (reduceMotion ? 360 : 1800))
    resultTimer.current = setTimeout(() => { setWinner(movies[index]); setSpinning(false) }, reduceMotion ? 500 : 3200)
  }

  return <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h2 className="mb-2 text-2xl font-bold">What are we watching?</h2>
          <p className="text-muted-foreground">Bring your Letterboxd watchlist. We&apos;ll handle the impossible part.</p>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Download your data from{" "}
            <a className="font-medium text-primary underline-offset-4 hover:underline" href="https://letterboxd.com/settings/data/" target="_blank" rel="noreferrer">Letterboxd settings</a>,
            unzip the downloaded file, then select <span className="font-medium text-foreground">watchlist.csv</span> from inside the folder.
          </p>
        </div>
        <input ref={fileInput} type="file" accept=".csv,text/csv" className="hidden" onChange={(event) => { importFile(event.target.files?.[0]); event.target.value = "" }} />
        <Button variant="outline" onClick={() => fileInput.current?.click()}><FileUp className="mr-2 h-4 w-4" /> Import Letterboxd CSV</Button>
      </div>
      <div className="grid gap-6 lg:grid-cols-[1.25fr_.75fr]">
        <Card><CardHeader><CardTitle>Picker wheel</CardTitle><CardDescription>Spin to choose one movie from your watchlist.</CardDescription></CardHeader><CardContent className="flex min-h-[440px] flex-col items-center justify-center p-4 pt-0 sm:p-6 sm:pt-0">
          {movies.length ? <>
            <div className="relative mb-8 grid place-items-center"><div className="absolute -top-3 z-20 h-0 w-0 border-x-[14px] border-t-[24px] border-x-transparent border-t-foreground drop-shadow-sm" />
              <div className="relative aspect-square w-[min(76vw,360px)] rounded-full border-8 border-background shadow-lg ring-1 ring-border" style={{ background: `conic-gradient(${segments})`, transform: `rotate(${rotation}deg)`, transition: spinning ? `transform ${reduceMotion ? .5 : 3.2}s cubic-bezier(.12,.7,.18,1)` : "none" }} aria-label={`Wheel containing ${movies.length} movies`}>
                {movies.length <= 14 && movies.map((movie, i) => {
                  const angle = i * (360 / movies.length) + 180 / movies.length
                  const flip = angle > 90 && angle < 270
                  return <span key={movie.id} className="absolute left-1/2 top-1/2 flex h-12 w-[42%] origin-left items-center justify-center px-2 text-center text-[9px] font-bold leading-tight text-white drop-shadow-md sm:text-[11px]" style={{ transform: `rotate(${angle}deg) translateY(-50%)` }}><span className="line-clamp-2" style={{ transform: flip ? "rotate(180deg)" : undefined }}>{movie.name}</span></span>
                })}
                <div className="absolute inset-[39%] grid place-items-center rounded-full border-4 border-background bg-card text-foreground shadow-md"><Clapperboard className="h-5 w-5 sm:h-7 sm:w-7" /></div>
              </div>
            </div>
            <Button size="lg" className="min-w-52 text-base font-bold" disabled={spinning || movies.length < 2} onClick={spin}>{spinning ? "Choosing…" : "Spin the wheel"}</Button>
            <p className="mt-3 text-center text-xs text-muted-foreground">Every movie has an equal chance. No overthinking allowed.</p>
          </> : <button type="button" className={`flex w-full max-w-md flex-col items-center rounded-lg border border-dashed p-12 text-center transition ${dragging ? "border-primary bg-primary/5" : "hover:bg-muted/50"}`} onClick={() => fileInput.current?.click()} onDragOver={(e) => { e.preventDefault(); setDragging(true) }} onDragLeave={() => setDragging(false)} onDrop={(e) => { e.preventDefault(); setDragging(false); importFile(e.dataTransfer.files[0]) }}><Upload className="mb-4 h-7 w-7 text-muted-foreground" /><span className="font-semibold">Drop watchlist.csv here</span><span className="mt-2 text-sm text-muted-foreground">or click to choose it from your unzipped Letterboxd export</span></button>}
        </CardContent></Card>
        <Card><CardHeader><div className="flex items-start justify-between gap-4"><div><CardTitle>Your watchlist</CardTitle><CardDescription>Search, add, or remove movies.</CardDescription></div><span className="text-sm text-muted-foreground">{movies.length} {movies.length === 1 ? "movie" : "movies"}</span></div></CardHeader><CardContent className="flex h-full max-h-[520px] flex-col">
          <div className="relative mb-3"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Find a movie…" className="pl-9" /></div>
          <div className="mb-4 flex gap-2"><Input value={newMovie} onChange={(e) => setNewMovie(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") addMovie() }} placeholder="Add a movie" /><Button size="icon" onClick={addMovie} aria-label="Add movie" className="shrink-0"><Plus className="h-4 w-4" /></Button></div>
          <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1"><AnimatePresence initial={false}>{visible.map((movie) => { const index = movies.findIndex((item) => item.id === movie.id); return <motion.div layout exit={{ opacity: 0, x: 20 }} key={movie.id} className="group flex items-center gap-3 rounded-lg border bg-card px-3 py-3"><span className="h-8 w-1 shrink-0 rounded-sm" style={{ background: COLORS[index % COLORS.length] }} /><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{movie.name}</p><p className="text-xs text-muted-foreground">{movie.year || "Ready to watch"}</p></div><Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground opacity-100 hover:text-destructive sm:opacity-0 sm:group-hover:opacity-100" onClick={() => setMovies((list) => list.filter((item) => item.id !== movie.id))} aria-label={`Remove ${movie.name}`}><X className="h-4 w-4" /></Button></motion.div> })}</AnimatePresence>{!visible.length && <p className="py-8 text-center text-sm text-muted-foreground">No movies found.</p>}</div>
          {movies.length > 0 && <Button variant="ghost" size="sm" className="mt-4 text-muted-foreground hover:text-destructive" onClick={() => { setMovies([]); setWinner(null) }}><Trash2 className="mr-2 h-3.5 w-3.5" /> Clear watchlist</Button>}
        </CardContent></Card>
      </div>
    <Dialog open={Boolean(winner)} onOpenChange={(open) => { if (!open) setWinner(null) }}><DialogContent className="sm:max-w-md"><DialogHeader className="items-center text-center"><Check className="mb-2 h-8 w-8 text-primary" /><DialogDescription>Your next watch</DialogDescription><DialogTitle className="pt-1 text-center text-3xl">{winner?.name}</DialogTitle>{winner?.year && <p className="text-muted-foreground">{winner.year}</p>}</DialogHeader><div className="mt-4 grid gap-2">{winner?.uri && <Button asChild><a href={winner.uri} target="_blank" rel="noreferrer">Open on Letterboxd</a></Button>}<Button variant="outline" onClick={() => { setWinner(null); setTimeout(spin, 150) }}>Spin again</Button></div></DialogContent></Dialog>
  </motion.div>
}
