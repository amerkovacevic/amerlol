"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { shuffle } from "@/lib/random"

const SEARCH_LINES = [
  "checking questionable directories...",
  "asking the server nicely...",
  "checking under the couch...",
  "interrogating DNS...",
  "blaming the frontend...",
  "blaming the backend...",
  "blaming the user...",
  "retracting previous statement...",
  "looking behind the cache...",
  "page definitely isn't here.",
]
function response(c: string): string[] {
  switch (c) {
    case "help":
      return [
        "help  ls  whoami  pwd  sudo  clear  home  projects  secrets  hack  exit  definitely-not-a-trap",
      ]
    case "ls":
      return ["home/  projects/  definitely-not-secrets/", "taxes-2009/  passwords.txt  404.exe"]
    case "whoami":
      return ["somebody with way too much free time"]
    case "pwd":
      return ["/amer/lol/where/the/hell/am/i"]
    case "sudo":
      return [
        "amer is not in the sudoers file.",
        "This incident will be reported.",
        "Actually, this entire website is Amer's.",
        "That's awkward.",
      ]
    case "secrets":
      return ["Nice try.", "I'm not giving you the answer key."]
    case "projects":
      return ["Fetching projects...", "No. Go look at the actual hub."]
    case "home":
      return ["The command line cannot click links for you. Probably."]
    case "hack":
      return [
        "INITIALIZING MAINFRAME...",
        "BYPASSING FIREWALL...",
        "ENHANCING...",
        "ENHANCING...",
        "ENHANCING...",
        "ACCESSING THE MAINFRAME...",
        "ERROR: We don't have a mainframe.",
      ]
    case "rm -rf /":
      return [
        "Deleting Amer.lol...",
        "12%  [██░░░░░░░░]",
        "37%  [████░░░░░░]",
        "64%  [██████░░░░]",
        "89%  [█████████░]",
        "99%  [██████████]",
        "Permission denied.",
        "nice try.",
      ]
    case "exit":
      return ["You can leave the terminal, but the terminal never leaves you."]
    case "definitely-not-a-trap":
      return ["It was a trap.", "Fortunately, it was also poorly implemented."]
    case "":
      return []
    default:
      return [`command not found: ${c}`, "The computer looks disappointed."]
  }
}
const LINE_DELAY_MS = 230
const CLOSING_LINES = ["CASE CLOSED", "HTTP 404", "We looked everywhere."]
const SECRET_COMMANDS = new Set(["hack", "rm -rf /"])
const COMMANDS_FOR_SECRET = 3

/** Plays a fake search on mount; remount it (change `key`) to search again. */
export function SearchTerminal({ onTerminalSecret }: { onTerminalSecret: () => void }) {
  const [lines, setLines] = React.useState(["> searching amer.lol..."])
  const [searching, setSearching] = React.useState(true)
  const [input, setInput] = React.useState("")
  const [commands, setCommands] = React.useState(0)
  const timers = React.useRef<ReturnType<typeof setTimeout>[]>([])

  const finish = React.useCallback(() => {
    timers.current.forEach(clearTimeout)
    timers.current = []
    setLines((current) => (current.includes(CLOSING_LINES[0]) ? current : [...current, ...CLOSING_LINES]))
    setSearching(false)
  }, [])

  React.useEffect(() => {
    const picked = shuffle(SEARCH_LINES).slice(0, 6)
    timers.current = [
      ...picked.map((line, index) =>
        setTimeout(() => setLines((current) => [...current, `> ${line}`]), LINE_DELAY_MS * (index + 1))
      ),
      setTimeout(finish, LINE_DELAY_MS * (picked.length + 2)),
    ]
    return () => timers.current.forEach(clearTimeout)
  }, [finish])

  const submit = (event: React.FormEvent) => {
    event.preventDefault()
    const command = input.trim().toLowerCase()
    setInput("")
    if (command === "clear") setLines([])
    else setLines((current) => [...current, `$ ${input}`, ...response(command)])
    if (!command) return
    const next = commands + 1
    setCommands(next)
    if (next >= COMMANDS_FOR_SECRET || SECRET_COMMANDS.has(command)) onTerminalSecret()
  }

  return (
    <div className="mt-5 overflow-hidden rounded-xl border border-emerald-500/30 bg-[#07110c] text-left font-mono text-xs text-emerald-300 shadow-inner sm:text-sm">
      <div className="flex items-center justify-between border-b border-emerald-500/20 px-3 py-2 text-[10px] uppercase tracking-widest text-emerald-400/60">
        <span>amer.lol recovery shell</span>
        {searching && (
          <Button
            variant="ghost"
            size="sm"
            onClick={finish}
            className="h-6 px-2 font-mono text-[10px] text-emerald-300 hover:bg-emerald-400/10 hover:text-emerald-200"
          >
            skip
          </Button>
        )}
      </div>
      <div className="max-h-56 min-h-32 overflow-y-auto p-3" aria-live="polite">
        {lines.map((line, index) => (
          <div
            key={`${index}-${line}`}
            className={line === CLOSING_LINES[0] ? "mt-2 font-bold text-white" : "min-h-5"}
          >
            {line}
          </div>
        ))}
      </div>
      {!searching && (
        <form onSubmit={submit} className="flex border-t border-emerald-500/20 px-3 py-2">
          <span aria-hidden>$&nbsp;</span>
          <input
            aria-label="Terminal command"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            autoComplete="off"
            spellCheck={false}
            className="min-w-0 flex-1 border-0 bg-transparent p-0 text-emerald-200 outline-none"
          />
          <span className="animate-pulse" aria-hidden>
            ▋
          </span>
        </form>
      )}
    </div>
  )
}
