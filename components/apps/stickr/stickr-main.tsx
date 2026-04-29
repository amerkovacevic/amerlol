"use client"

import * as React from "react"
import html2canvas from "html2canvas"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import {
  Download,
  Image as ImageIcon,
  LayoutGrid,
  Trash2,
  Copy,
  Loader2,
  CheckSquare,
} from "lucide-react"
import { toast } from "sonner"
import { getPresetById } from "@/lib/stickr/album-presets"
import {
  formatNumericStickerList,
  formatQatar2022StickerList,
  formatUsa2026StickerList,
  filterNumericToAlbum,
} from "@/lib/stickr/format-sticker-list"
import {
  USA_2026_GROUPS,
  USA_2026_FWC_SPECIAL_COUNT,
  USA_2026_TEAM_STICKERS_PER_TEAM,
  findTeamByCode,
  makeFwcStickerId,
  makeTeamStickerId,
} from "@/lib/stickr/usa-2026-schema"
import {
  QATAR_2022_GROUPS,
  QATAR_2022_FWC_SPECIAL_COUNT,
  QATAR_2022_TEAM_STICKERS_PER_TEAM,
  findQatar2022TeamByCode,
  makeQatar2022FwcStickerId,
  makeQatar2022TeamStickerId,
} from "@/lib/stickr/qatar-2022-schema"
import { useStickr } from "./stickr-provider"

type EditMode = "duplicates" | "needs"

export function StickrMain() {
  const { state, setState, hydrated, stickerCount } = useStickr()
  const [mode, setMode] = React.useState<EditMode>("needs")
  const [search, setSearch] = React.useState("")
  const [rangeStart, setRangeStart] = React.useState("")
  const [rangeEnd, setRangeEnd] = React.useState("")
  const [activeTeam, setActiveTeam] = React.useState("USA")
  const [activePanel, setActivePanel] = React.useState<"team" | "fwc">("team")
  const shareRef = React.useRef<HTMLDivElement>(null)
  const [downloading, setDownloading] = React.useState(false)

  const albumLabel = getPresetById(state.albumPresetId)?.label ?? "Custom album"

  const teamAlbum = React.useMemo(() => {
    if (state.albumPresetId === "usa-2026") {
      return {
        kind: "usa-2026" as const,
        groups: USA_2026_GROUPS,
        teamPerTeam: USA_2026_TEAM_STICKERS_PER_TEAM,
        fwcCount: USA_2026_FWC_SPECIAL_COUNT,
        findTeam: findTeamByCode,
        makeTeamId: makeTeamStickerId,
        makeFwcId: makeFwcStickerId,
        formatList: formatUsa2026StickerList,
        defaultTeam: "USA",
      }
    }
    if (state.albumPresetId === "qatar-2022") {
      return {
        kind: "qatar-2022" as const,
        groups: QATAR_2022_GROUPS,
        teamPerTeam: QATAR_2022_TEAM_STICKERS_PER_TEAM,
        fwcCount: QATAR_2022_FWC_SPECIAL_COUNT,
        findTeam: findQatar2022TeamByCode,
        makeTeamId: makeQatar2022TeamStickerId,
        makeFwcId: makeQatar2022FwcStickerId,
        formatList: formatQatar2022StickerList,
        defaultTeam: "QAT",
      }
    }
    return null
  }, [state.albumPresetId])

  React.useEffect(() => {
    if (!teamAlbum) return
    const exists = teamAlbum.findTeam(activeTeam)
    if (!exists) {
      setActiveTeam(teamAlbum.defaultTeam)
    }
  }, [teamAlbum, activeTeam])

  const dupSet = React.useMemo(() => new Set(state.duplicates), [state.duplicates])
  const needSet = React.useMemo(() => new Set(state.needs), [state.needs])

  const numbers = React.useMemo(
    () => Array.from({ length: stickerCount }, (_, i) => i + 1),
    [stickerCount]
  )

  const filteredNumbers = React.useMemo(() => {
    const q = search.trim()
    if (!q) return numbers
    return numbers.filter((n) => String(n).includes(q))
  }, [numbers, search])

  const toggleId = (id: string) => {
    setState((prev) => {
      const dup = new Set(prev.duplicates)
      const need = new Set(prev.needs)
      if (mode === "duplicates") {
        if (dup.has(id)) dup.delete(id)
        else {
          dup.add(id)
          need.delete(id)
        }
      } else {
        if (need.has(id)) need.delete(id)
        else {
          need.add(id)
          dup.delete(id)
        }
      }
      return {
        ...prev,
        duplicates: [...dup].sort((a, b) => a.localeCompare(b)),
        needs: [...need].sort((a, b) => a.localeCompare(b)),
      }
    })
  }

  const clearCurrentList = () => {
    const label = mode === "duplicates" ? "duplicates" : "needs"
    if (!confirm(`Clear all ${label}?`)) return
    setState((prev) =>
      mode === "duplicates"
        ? { ...prev, duplicates: [] }
        : { ...prev, needs: [] }
    )
  }

  const applyRange = () => {
    const a = parseInt(rangeStart, 10)
    const b = parseInt(rangeEnd, 10)
    if (!Number.isFinite(a) || !Number.isFinite(b)) {
      toast.error("Enter valid start and end numbers")
      return
    }
    const start = Math.min(a, b)
    const end = Math.max(a, b)
    const maxRange = teamAlbum ? teamAlbum.teamPerTeam : stickerCount
    if (start < 1 || end > maxRange) {
      toast.error(`Numbers must be between 1 and ${maxRange}`)
      return
    }
    setState((prev) => {
      const dup = new Set(prev.duplicates)
      const need = new Set(prev.needs)
      for (let n = start; n <= end; n++) {
        const id = teamAlbum ? teamAlbum.makeTeamId(activeTeam, n) : String(n)
        if (mode === "duplicates") {
          dup.add(id)
          need.delete(id)
        } else {
          need.add(id)
          dup.delete(id)
        }
      }
      return {
        ...prev,
        duplicates: teamAlbum ? [...dup].sort((x, y) => x.localeCompare(y)) : filterNumericToAlbum([...dup], stickerCount),
        needs: teamAlbum ? [...need].sort((x, y) => x.localeCompare(y)) : filterNumericToAlbum([...need], stickerCount),
      }
    })
    setRangeStart("")
    setRangeEnd("")
    toast.success(`Updated ${end - start + 1} stickers`)
  }

  const selectAllCurrent = () => {
    setState((prev) => {
      const dup = new Set(prev.duplicates)
      const need = new Set(prev.needs)

      const addIds: string[] = []
      if (teamAlbum) {
        if (activePanel === "fwc") {
          for (let n = 1; n <= teamAlbum.fwcCount; n++) addIds.push(teamAlbum.makeFwcId(n))
        } else {
          // Select all 1..N for active team
          for (let n = 1; n <= teamAlbum.teamPerTeam; n++) addIds.push(teamAlbum.makeTeamId(activeTeam, n))
        }
      } else {
        // Select all currently visible numbers (respects filter)
        for (const n of filteredNumbers) addIds.push(String(n))
      }

      for (const id of addIds) {
        if (mode === "duplicates") {
          dup.add(id)
          need.delete(id)
        } else {
          need.add(id)
          dup.delete(id)
        }
      }

      return {
        ...prev,
        duplicates: teamAlbum ? [...dup].sort((a, b) => a.localeCompare(b)) : filterNumericToAlbum([...dup], stickerCount),
        needs: teamAlbum ? [...need].sort((a, b) => a.localeCompare(b)) : filterNumericToAlbum([...need], stickerCount),
      }
    })
    if (teamAlbum) {
      toast.success(activePanel === "fwc" ? "Selected all FWC specials" : "Selected all stickers for this team")
    } else {
      toast.success("Selected all visible stickers")
    }
  }

  const copyListsText = async () => {
    const lookingFor = teamAlbum ? teamAlbum.formatList(state.needs) : formatNumericStickerList(state.needs)
    const duplicatesForTrade = teamAlbum ? teamAlbum.formatList(state.duplicates) : formatNumericStickerList(state.duplicates)
    const lines = [
      `Album: ${albumLabel}`,
      state.displayName ? `Collector: ${state.displayName}` : "",
      "",
      `Looking for: ${lookingFor}`,
      `Duplicates for trade: ${duplicatesForTrade}`,
      "",
      "Made with Stickr — amer.lol",
    ].filter(Boolean)
    try {
      await navigator.clipboard.writeText(lines.join("\n"))
      toast.success("Copied to clipboard")
    } catch {
      toast.error("Could not copy")
    }
  }

  const downloadPng = async () => {
    const el = shareRef.current
    if (!el) return
    setDownloading(true)
    try {
      const canvas = await html2canvas(el, {
        scale: 2,
        backgroundColor: state.shareCardTheme === "dark" ? "#0f172a" : "#fafafa",
        useCORS: true,
        logging: false,
      })
      const url = canvas.toDataURL("image/png")
      const a = document.createElement("a")
      a.href = url
      a.download = `stickr-${state.displayName?.replace(/\s+/g, "-") || "trade"}.png`
      a.click()
      toast.success("Image downloaded")
    } catch (e) {
      console.error(e)
      toast.error("Could not create image — try another browser")
    } finally {
      setDownloading(false)
    }
  }

  const isDark = state.shareCardTheme === "dark"
  const isTeamAlbum = !!teamAlbum
  const activeTeamMeta = teamAlbum ? teamAlbum.findTeam(activeTeam) : undefined
  const filteredGroups = React.useMemo(() => {
    if (!teamAlbum) return []
    const q = search.trim().toLowerCase()
    if (!q) return teamAlbum.groups
    return teamAlbum.groups.map((g) => ({
      ...g,
      teams: g.teams.filter((t) => t.code.toLowerCase().includes(q) || t.name.toLowerCase().includes(q)),
    })).filter((g) => g.teams.length > 0)
  }, [teamAlbum, search])

  if (!hydrated) {
    return (
      <div className="flex items-center justify-center py-24 text-muted-foreground gap-2">
        <Loader2 className="h-5 w-5 animate-spin" />
        Loading your album…
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LayoutGrid className="h-5 w-5" />
            Track stickers
          </CardTitle>
          <CardDescription>
            Tap numbers you have <strong>extras</strong> of (duplicates) and stickers you still{" "}
            <strong>need</strong>. A sticker can only be on one list — picking it for one side removes it from the
            other.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2 items-center justify-between">
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">{albumLabel}</Badge>
              {isTeamAlbum ? (
                <>
                  <Badge variant="outline">{teamAlbum?.groups.reduce((acc, g) => acc + g.teams.length, 0) ?? 0} teams × {teamAlbum?.teamPerTeam ?? 20}</Badge>
                  <Badge variant="outline">FWC specials: {teamAlbum?.fwcCount}</Badge>
                </>
              ) : (
                <Badge variant="outline">1–{stickerCount}</Badge>
              )}
              <Badge variant="outline" className="border-amber-500/50 text-amber-700 dark:text-amber-400">
                Needs: {state.needs.length}
              </Badge>
              <Badge variant="outline" className="border-emerald-500/50 text-emerald-700 dark:text-emerald-400">
                Duplicates: {state.duplicates.length}
              </Badge>
            </div>
          </div>

          <Tabs id="stickr-edit-mode" value={mode} onValueChange={(v) => setMode(v as EditMode)}>
            <TabsList className="grid w-full max-w-md grid-cols-2">
              <TabsTrigger value="needs">I need</TabsTrigger>
              <TabsTrigger value="duplicates">Duplicates (trade)</TabsTrigger>
            </TabsList>
            <TabsContent value="needs" className="mt-4">
              <p className="text-sm text-muted-foreground">
                Select sticker numbers you are still missing for your album.
              </p>
            </TabsContent>
            <TabsContent value="duplicates" className="mt-4">
              <p className="text-sm text-muted-foreground">
                Select numbers you have spares of and can trade away.
              </p>
            </TabsContent>
          </Tabs>

          <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
            <div className="space-y-2 flex-1">
              <Label htmlFor="stickr-search">{isTeamAlbum ? "Find team" : "Jump / filter"}</Label>
              <Input
                id="stickr-search"
                placeholder={isTeamAlbum ? "e.g. USA or Mexico" : "e.g. 12 or 120"}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="flex flex-wrap gap-2 items-end">
              <div className="space-y-2">
                <Label htmlFor="r1">{isTeamAlbum ? "Team range" : "Range"}</Label>
                <div className="flex gap-2">
                  <Input
                    id="r1"
                    className="w-20"
                    inputMode="numeric"
                    placeholder="from"
                    value={rangeStart}
                    onChange={(e) => setRangeStart(e.target.value)}
                  />
                  <Input
                    className="w-20"
                    inputMode="numeric"
                    placeholder="to"
                    value={rangeEnd}
                    onChange={(e) => setRangeEnd(e.target.value)}
                  />
                </div>
              </div>
              <Button type="button" variant="secondary" onClick={applyRange} disabled={isTeamAlbum && !activeTeamMeta}>
                Apply range
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={selectAllCurrent}
                disabled={isTeamAlbum && !activeTeamMeta}
              >
                <CheckSquare className="h-4 w-4 mr-2" />
                Select all
              </Button>
              <Button type="button" variant="outline" onClick={clearCurrentList}>
                <Trash2 className="h-4 w-4 mr-2" />
                Clear {mode}
              </Button>
            </div>
          </div>

          {isTeamAlbum ? (
            <div className="grid grid-cols-1 lg:grid-cols-[360px,1fr] gap-4">
              <div className="rounded-lg border bg-muted/20 p-3 max-h-[min(520px,60vh)] overflow-y-auto space-y-4">
                {filteredGroups.map((group) => (
                  <div key={group.id}>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Group {group.id}
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {group.teams.map((t) => {
                        const selected = t.code === activeTeam
                        return (
                          <button
                            key={t.code}
                            type="button"
                            onClick={() => {
                              setActiveTeam(t.code)
                              setActivePanel("team")
                            }}
                            className={[
                              "rounded-md border px-3 py-2 text-left transition-colors",
                              selected
                                ? "bg-primary text-primary-foreground border-primary"
                                : "bg-background hover:bg-accent border-input",
                            ].join(" ")}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-semibold">{t.code}</span>
                            </div>
                            <div className="text-xs opacity-80 line-clamp-1">{t.name}</div>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                ))}

                <div className="pt-3 border-t">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                    Specials
                  </p>
                  <button
                    type="button"
                    onClick={() => setActivePanel("fwc")}
                    className={[
                      "w-full rounded-md border px-3 py-2 text-left transition-colors",
                      activePanel === "fwc"
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background hover:bg-accent border-input",
                    ].join(" ")}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold">FWC</span>
                      <span className="text-xs opacity-80">{teamAlbum?.fwcCount ?? 0}</span>
                    </div>
                    <div className="text-xs opacity-80">FWC specials</div>
                  </button>
                </div>
              </div>

              <div className="rounded-lg border bg-muted/20 p-3 max-h-[min(520px,60vh)] overflow-y-auto">
                {activePanel === "fwc" ? (
                  <div className="rounded-lg border bg-background p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="text-sm font-semibold">FWC specials</p>
                        <p className="text-xs text-muted-foreground">
                          Special stickers labeled FWC-1…{teamAlbum?.fwcCount}
                        </p>
                      </div>
                      <Badge variant="outline">FWC</Badge>
                    </div>
                    <div className="grid grid-cols-[repeat(6,minmax(0,1fr))] gap-2">
                      {Array.from({ length: teamAlbum?.fwcCount ?? 0 }, (_, i) => i + 1).map((n) => {
                        const id = teamAlbum?.makeFwcId(n) ?? `FWC-${n}`
                        const active = mode === "duplicates" ? dupSet.has(id) : needSet.has(id)
                        const other = mode === "duplicates" ? needSet.has(id) : dupSet.has(id)
                        return (
                          <button
                            key={id}
                            type="button"
                            onClick={() => toggleId(id)}
                            className={[
                              "h-10 rounded-md text-sm font-semibold transition-colors border",
                              active
                                ? mode === "duplicates"
                                  ? "bg-emerald-600 text-white border-emerald-700"
                                  : "bg-amber-500 text-slate-950 border-amber-600"
                                : other
                                  ? "bg-muted/80 text-muted-foreground border-transparent opacity-70"
                                  : "bg-background hover:bg-accent border-input",
                            ].join(" ")}
                            title={id}
                          >
                            {n}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="rounded-lg border bg-background p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                      <div>
                        <p className="text-sm font-semibold">
                          {activeTeamMeta ? `${activeTeamMeta.name} (${activeTeamMeta.code})` : `Team ${activeTeam}`}
                        </p>
                        <p className="text-xs text-muted-foreground">Select 1–20 for this team</p>
                      </div>
                      <Badge variant="outline">Group {activeTeamMeta?.group ?? "—"}</Badge>
                    </div>
                    <div className="grid grid-cols-[repeat(5,minmax(0,1fr))] gap-2">
                      {Array.from({ length: teamAlbum?.teamPerTeam ?? 20 }, (_, i) => i + 1).map((n) => {
                        const id = teamAlbum?.makeTeamId(activeTeam, n) ?? `${activeTeam}-${n}`
                        const active = mode === "duplicates" ? dupSet.has(id) : needSet.has(id)
                        const other = mode === "duplicates" ? needSet.has(id) : dupSet.has(id)
                        return (
                          <button
                            key={id}
                            type="button"
                            onClick={() => toggleId(id)}
                            className={[
                              "h-10 rounded-md text-sm font-semibold transition-colors border",
                              active
                                ? mode === "duplicates"
                                  ? "bg-emerald-600 text-white border-emerald-700"
                                  : "bg-amber-500 text-slate-950 border-amber-600"
                                : other
                                  ? "bg-muted/80 text-muted-foreground border-transparent opacity-70"
                                  : "bg-background hover:bg-accent border-input",
                            ].join(" ")}
                            title={`${activeTeam}-${n}`}
                          >
                            {n}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="rounded-lg border bg-muted/30 p-3 max-h-[min(420px,50vh)] overflow-y-auto">
              <div className="grid grid-cols-[repeat(auto-fill,minmax(2.5rem,1fr))] gap-1.5">
                {filteredNumbers.map((n) => {
                  const id = String(n)
                  const active = mode === "duplicates" ? dupSet.has(id) : needSet.has(id)
                  const other = mode === "duplicates" ? needSet.has(id) : dupSet.has(id)
                  return (
                    <button
                      key={n}
                      type="button"
                      onClick={() => toggleId(id)}
                      className={[
                        "h-9 rounded-md text-xs font-medium transition-colors border",
                        active
                          ? mode === "duplicates"
                            ? "bg-emerald-600 text-white border-emerald-700"
                            : "bg-amber-500 text-slate-950 border-amber-600"
                          : other
                            ? "bg-muted/80 text-muted-foreground border-transparent opacity-70"
                            : "bg-background hover:bg-accent border-input",
                      ].join(" ")}
                      title={other ? `On ${mode === "duplicates" ? "needs" : "duplicates"} list` : String(n)}
                    >
                      {n}
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5" />
            Share card
          </CardTitle>
          <CardDescription>
            Screenshot-friendly layout for Instagram, group chats, or marketplace posts. Download a PNG or copy plain
            text.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={downloadPng} disabled={downloading}>
              {downloading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              Download PNG
            </Button>
            <Button type="button" variant="outline" onClick={copyListsText}>
              <Copy className="h-4 w-4 mr-2" />
              Copy text
            </Button>
          </div>

          <div className="flex justify-center overflow-x-auto py-4 rounded-xl bg-muted/40">
            <div
              ref={shareRef}
              className={[
                "w-[min(100%,420px)] min-h-[320px] shrink-0 rounded-2xl p-8 flex flex-col shadow-xl border text-left",
                isDark
                  ? "bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950 border-slate-700 text-white"
                  : "bg-gradient-to-br from-white to-slate-100 border-slate-200 text-slate-900",
              ].join(" ")}
            >
              <div className="mb-6">
                <p className="text-xs uppercase tracking-[0.2em] opacity-70">Panini · FIFA World Cup™</p>
                <h2 className="text-2xl font-bold font-space-grotesk mt-1 leading-tight">Sticker trades</h2>
                <p className={`text-sm mt-1 ${isDark ? "text-slate-300" : "text-slate-600"}`}>{albumLabel}</p>
                {state.displayName ? (
                  <p className={`text-sm mt-3 font-medium ${isDark ? "text-white" : "text-slate-900"}`}>
                    {state.displayName}
                  </p>
                ) : null}
              </div>

              <div className="flex-1 space-y-5">
                <div>
                  <p
                    className={`text-xs font-semibold uppercase tracking-wider mb-1.5 ${
                      isDark ? "text-amber-400" : "text-amber-700"
                    }`}
                  >
                    Looking for
                  </p>
                  <p
                    className={`text-sm leading-relaxed break-words ${
                      isDark ? "text-slate-100" : "text-slate-800"
                    }`}
                  >
                    {teamAlbum ? teamAlbum.formatList(state.needs) : formatNumericStickerList(state.needs)}
                  </p>
                </div>
                <div>
                  <p
                    className={`text-xs font-semibold uppercase tracking-wider mb-1.5 ${
                      isDark ? "text-emerald-400" : "text-emerald-700"
                    }`}
                  >
                    Duplicates for trade
                  </p>
                  <p
                    className={`text-sm leading-relaxed break-words ${
                      isDark ? "text-slate-100" : "text-slate-800"
                    }`}
                  >
                    {teamAlbum ? teamAlbum.formatList(state.duplicates) : formatNumericStickerList(state.duplicates)}
                  </p>
                </div>
              </div>

              <div
                className={`mt-6 pt-4 border-t text-xs ${isDark ? "border-slate-700 text-slate-400" : "border-slate-200 text-slate-500"}`}
              >
                Stickr on amer.lol
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
