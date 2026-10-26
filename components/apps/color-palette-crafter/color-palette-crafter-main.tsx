"use client"

import * as React from "react"
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  type QueryDocumentSnapshot,
} from "firebase/firestore"
import { Copy, Download, Edit2, Heart, Palette, Plus, RefreshCw, Search, Trash2, X } from "lucide-react"
import { toast } from "sonner"
import { useAppSettings } from "@/components/apps/settings-provider"
import { AuthDialog } from "@/components/auth/auth-dialog"
import { useAuth } from "@/components/auth/auth-provider"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { AppSettings } from "@/lib/apps/settings"
import { copyText, downloadText } from "@/lib/browser"
import { db } from "@/lib/firebase/config"
import { getErrorCode, logUnexpectedError } from "@/lib/firebase/user-facing-errors"
import { useAsync } from "@/lib/hooks/use-async"

interface ColorPalette {
  id: string
  colors: string[]
  title: string
  description: string
  likes: number
  createdBy: string
}

interface PaletteDraft {
  colors: string[]
  title: string
  description: string
}

type Tab = "browse" | "my-palettes" | "favorites"
type ExportFormat = AppSettings<"color-palette-crafter">["defaultExportFormat"]

const MIN_COLORS = 2
const MAX_COLORS = 8
const BROWSE_LIMIT = 100
const HEX_COLOR = /^#[0-9a-f]{6}$/i

const randomColor = () =>
  `#${Math.floor(Math.random() * 0x1000000)
    .toString(16)
    .padStart(6, "0")}`

const emptyDraft = (colorCount: number): PaletteDraft => ({
  colors: Array.from({ length: colorCount }, randomColor),
  title: "",
  description: "",
})

function toPalette(snapshot: QueryDocumentSnapshot): ColorPalette {
  const data = snapshot.data()
  return {
    id: snapshot.id,
    colors: Array.isArray(data.colors) ? data.colors : [],
    title: data.title || "",
    description: data.description || "",
    likes: data.likes || 0,
    createdBy: data.createdBy || "",
  }
}

function formatPalette(palette: ColorPalette, format: ExportFormat): string {
  if (format === "json") {
    const { colors, title, description } = palette
    return JSON.stringify({ colors, title, description }, null, 2)
  }
  return palette.colors
    .map((color) =>
      format === "rgb"
        ? `rgb(${[1, 3, 5].map((start) => parseInt(color.slice(start, start + 2), 16)).join(", ")})`
        : color
    )
    .join("\n")
}

async function loadPublicPalettes() {
  const snapshot = await getDocs(
    query(collection(db, "colorPalettes"), orderBy("createdAt", "desc"), limit(BROWSE_LIMIT))
  )
  return snapshot.docs.map(toPalette)
}

async function loadAccountPalettes(uid: string) {
  const [mine, favorites] = await Promise.all([
    getDocs(
      query(collection(db, "colorPalettes"), where("createdBy", "==", uid), orderBy("createdAt", "desc"))
    ),
    getDocs(collection(db, "users", uid, "colorPaletteCrafterFavorites")),
  ])
  return { mine: mine.docs.map(toPalette), favorites: favorites.docs.map((favorite) => favorite.id) }
}

export function ColorPaletteCrafterMain() {
  const settings = useAppSettings("color-palette-crafter")
  const { account } = useAuth()
  const [authDialogOpen, setAuthDialogOpen] = React.useState(false)
  const [activeTab, setActiveTab] = React.useState<Tab>("browse")
  const [searchQuery, setSearchQuery] = React.useState("")
  // A `null` id means the editor is creating a new palette.
  const [editor, setEditor] = React.useState<{ id: string | null; draft: PaletteDraft } | null>(null)
  const [saving, setSaving] = React.useState(false)
  const [favoriteOverrides, setFavoriteOverrides] = React.useState<Record<string, boolean>>({})

  const publicPalettes = useAsync("public", loadPublicPalettes)
  const uid = account?.uid ?? null
  const accountPalettes = useAsync(uid, () => loadAccountPalettes(uid!))
  const palettes = React.useMemo(() => publicPalettes.data ?? [], [publicPalettes.data])
  const myPalettes = React.useMemo(() => accountPalettes.data?.mine ?? [], [accountPalettes.data])

  React.useEffect(() => {
    // Anyone may browse, so a denied read means the rules changed; it is not worth a toast.
    if (publicPalettes.error && getErrorCode(publicPalettes.error) !== "permission-denied") {
      toast.error("Failed to load palettes")
    }
  }, [publicPalettes.error])

  const favorites = React.useMemo(() => {
    const ids = new Set(accountPalettes.data?.favorites)
    for (const [id, favorite] of Object.entries(favoriteOverrides)) {
      if (favorite) ids.add(id)
      else ids.delete(id)
    }
    return ids
  }, [accountPalettes.data, favoriteOverrides])

  const reload = () => {
    publicPalettes.reload()
    accountPalettes.reload()
  }

  const filteredPalettes = React.useMemo(() => {
    const source =
      activeTab === "my-palettes"
        ? myPalettes
        : activeTab === "favorites"
          ? palettes.filter((palette) => favorites.has(palette.id))
          : palettes
    const needle = searchQuery.trim().toLowerCase()
    if (!needle) return source
    return source.filter(
      (palette) =>
        palette.title.toLowerCase().includes(needle) ||
        palette.description.toLowerCase().includes(needle) ||
        palette.colors.some((color) => color.toLowerCase().includes(needle))
    )
  }, [activeTab, favorites, myPalettes, palettes, searchQuery])

  const savePalette = async () => {
    if (!editor) return
    if (!account) {
      setAuthDialogOpen(true)
      return
    }
    const { id, draft } = editor
    if (draft.colors.length < MIN_COLORS) {
      toast.error("Please add at least 2 colors")
      return
    }
    if (!draft.colors.every((color) => HEX_COLOR.test(color))) {
      toast.error("Use six-digit hex colors such as #1A2B3C")
      return
    }

    setSaving(true)
    try {
      const fields = { colors: draft.colors, title: draft.title, description: draft.description }
      if (id) {
        await updateDoc(doc(db, "colorPalettes", id), { ...fields, updatedAt: serverTimestamp() })
        toast.success("Palette updated successfully!")
      } else {
        const profile = await getDoc(doc(db, "users", account.uid)).catch(() => null)
        const profileData = profile?.data()
        await addDoc(collection(db, "colorPalettes"), {
          ...fields,
          likes: 0,
          createdBy: account.uid,
          createdByName: profileData?.displayName || profileData?.username || "Unknown",
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        })
        toast.success("Palette created successfully!")
      }
      setEditor(null)
      reload()
    } catch (error) {
      logUnexpectedError("color-crafter:save", error)
      toast.error(
        getErrorCode(error) === "permission-denied"
          ? "Permission denied. Please sign in to create palettes."
          : `Failed to ${id ? "update" : "create"} palette`
      )
    } finally {
      setSaving(false)
    }
  }

  const deletePalette = async (palette: ColorPalette) => {
    if (!confirm("Are you sure you want to delete this palette? This cannot be undone.")) return
    try {
      await deleteDoc(doc(db, "colorPalettes", palette.id))
      toast.success("Palette deleted successfully")
      reload()
    } catch (error) {
      logUnexpectedError("color-crafter:delete", error)
      toast.error("Failed to delete palette")
    }
  }

  const toggleFavorite = async (paletteId: string) => {
    if (!account) {
      setAuthDialogOpen(true)
      return
    }
    const favorite = !favorites.has(paletteId)
    const favoriteRef = doc(db, "users", account.uid, "colorPaletteCrafterFavorites", paletteId)
    try {
      if (favorite) await setDoc(favoriteRef, { paletteId, addedAt: serverTimestamp() })
      else await deleteDoc(favoriteRef)
      setFavoriteOverrides((current) => ({ ...current, [paletteId]: favorite }))
      toast.success(favorite ? "Added to favorites" : "Removed from favorites")
    } catch (error) {
      logUnexpectedError("color-crafter:favorite", error)
      toast.error("Failed to update favorites")
    }
  }

  const exportPalette = (palette: ColorPalette) => {
    const format = settings.defaultExportFormat
    downloadText(
      formatPalette(palette, format),
      `palette-${palette.id}.${format === "json" ? "json" : "txt"}`,
      format === "json" ? "application/json" : "text/plain"
    )
    toast.success("Palette exported")
  }

  const signInPrompt = (icon: React.ReactNode, message: string) => (
    <EmptyCard icon={icon}>
      <p className="text-muted-foreground">{message}</p>
      <Button onClick={() => setAuthDialogOpen(true)}>Sign In</Button>
    </EmptyCard>
  )

  const grid = (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {filteredPalettes.map((palette) => (
        <PaletteCard
          key={palette.id}
          palette={palette}
          owned={palette.createdBy === account?.uid}
          favorite={favorites.has(palette.id)}
          showColorCodes={settings.showColorCodes}
          showLikes={settings.showLikes}
          onCopyColor={
            settings.autoCopyOnClick ? (color) => copyText(color, `Copied ${color} to clipboard`) : undefined
          }
          onCopy={() => copyText(palette.colors.join(", "), "Palette colors copied to clipboard")}
          onExport={() => exportPalette(palette)}
          onToggleFavorite={() => toggleFavorite(palette.id)}
          onEdit={() =>
            setEditor({
              id: palette.id,
              draft: { colors: palette.colors, title: palette.title, description: palette.description },
            })
          }
          onDelete={() => deletePalette(palette)}
        />
      ))}
    </div>
  )

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as Tab)} className="space-y-4">
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <TabsList>
            <TabsTrigger value="browse">Browse</TabsTrigger>
            <TabsTrigger value="my-palettes">
              My Palettes
              {myPalettes.length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {myPalettes.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="favorites">
              Favorites
              {favorites.size > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {favorites.size}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <div className="flex w-full gap-2 sm:w-auto">
            <div className="relative max-w-md flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                aria-label="Search palettes"
                placeholder="Search palettes..."
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="pl-10"
              />
            </div>
            {/* Anyone can design a palette; saving asks guests to sign in. */}
            <Button
              onClick={() => {
                setEditor({ id: null, draft: emptyDraft(settings.defaultColors) })
                if (!account) setAuthDialogOpen(true)
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              Create
            </Button>
          </div>
        </div>

        <TabsContent value="browse" className="space-y-4">
          {publicPalettes.loading ? (
            <p className="py-12 text-center text-muted-foreground">Loading palettes...</p>
          ) : filteredPalettes.length === 0 ? (
            <EmptyCard icon={<Palette className="h-12 w-12 text-muted-foreground" />}>
              <p className="text-muted-foreground">
                {searchQuery ? "No palettes match your search" : "No palettes yet. Create the first one!"}
              </p>
            </EmptyCard>
          ) : (
            grid
          )}
        </TabsContent>

        <TabsContent value="my-palettes" className="space-y-4">
          {!account ? (
            signInPrompt(
              <Palette className="h-12 w-12 text-muted-foreground" />,
              "Please sign in to view your palettes"
            )
          ) : myPalettes.length === 0 ? (
            <EmptyCard icon={<Palette className="h-12 w-12 text-muted-foreground" />}>
              <p className="text-muted-foreground">You haven't created any palettes yet</p>
            </EmptyCard>
          ) : (
            grid
          )}
        </TabsContent>

        <TabsContent value="favorites" className="space-y-4">
          {!account ? (
            signInPrompt(
              <Heart className="h-12 w-12 text-muted-foreground" />,
              "Please sign in to view your favorites"
            )
          ) : favorites.size === 0 ? (
            <EmptyCard icon={<Heart className="h-12 w-12 text-muted-foreground" />}>
              <p className="text-muted-foreground">No favorites yet</p>
              <p className="text-xs text-muted-foreground">
                Click the heart icon on any palette to add it to favorites
              </p>
            </EmptyCard>
          ) : filteredPalettes.length === 0 ? (
            <EmptyCard>
              <p className="text-muted-foreground">No favorites match your search</p>
            </EmptyCard>
          ) : (
            grid
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={editor !== null} onOpenChange={(open) => !open && setEditor(null)}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{editor?.id ? "Edit Palette" : "Create New Palette"}</DialogTitle>
            <DialogDescription>
              {editor?.id
                ? "Update your color palette"
                : "Create a beautiful color palette with up to 8 colors"}
            </DialogDescription>
          </DialogHeader>
          {editor && (
            <PaletteEditor
              draft={editor.draft}
              defaultColors={settings.defaultColors}
              onChange={(draft) => setEditor({ ...editor, draft })}
              onCancel={() => setEditor(null)}
              onSave={savePalette}
              saving={saving}
              saveLabel={editor.id ? "Update Palette" : "Create Palette"}
            />
          )}
        </DialogContent>
      </Dialog>

      <AuthDialog open={authDialogOpen} onOpenChange={setAuthDialogOpen} />
    </div>
  )
}

function EmptyCard({ icon, children }: { icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
        {icon}
        {children}
      </CardContent>
    </Card>
  )
}

function PaletteEditor({
  draft,
  defaultColors,
  onChange,
  onCancel,
  onSave,
  saving,
  saveLabel,
}: {
  draft: PaletteDraft
  defaultColors: number
  onChange: (draft: PaletteDraft) => void
  onCancel: () => void
  onSave: () => void
  saving: boolean
  saveLabel: string
}) {
  const setColor = (index: number, color: string) =>
    onChange({
      ...draft,
      colors: draft.colors.map((current, position) => (position === index ? color : current)),
    })

  return (
    <div className="space-y-4">
      <fieldset>
        <legend className="text-sm font-medium">Colors</legend>
        <div className="mt-2 grid grid-cols-4 gap-2">
          {draft.colors.map((color, index) => (
            <div key={index} className="space-y-1">
              <button
                type="button"
                className="h-20 w-full rounded border-2 border-border"
                style={{ backgroundColor: color }}
                onClick={() => setColor(index, randomColor())}
                aria-label={`Randomize color ${index + 1}`}
                title="Click to randomize"
              />
              <Input
                type="color"
                aria-label={`Color ${index + 1} picker`}
                value={HEX_COLOR.test(color) ? color : "#000000"}
                onChange={(event) => setColor(index, event.target.value)}
                className="h-8"
              />
              <Input
                aria-label={`Color ${index + 1} hex value`}
                value={color}
                onChange={(event) => setColor(index, event.target.value)}
                aria-invalid={!HEX_COLOR.test(color)}
                className="h-8 font-mono text-xs"
                placeholder="#000000"
              />
            </div>
          ))}
        </div>
        <div className="mt-2 flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onChange({ ...draft, colors: emptyDraft(defaultColors).colors })}
            className="flex-1"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Randomize
          </Button>
          {draft.colors.length < MAX_COLORS && (
            <Button
              variant="outline"
              size="sm"
              aria-label="Add a color"
              onClick={() => onChange({ ...draft, colors: [...draft.colors, "#000000"] })}
            >
              <Plus className="h-4 w-4" />
            </Button>
          )}
          {draft.colors.length > MIN_COLORS && (
            <Button
              variant="outline"
              size="sm"
              aria-label="Remove the last color"
              onClick={() => onChange({ ...draft, colors: draft.colors.slice(0, -1) })}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </fieldset>

      <div className="space-y-2">
        <Label htmlFor="palette-title">Title (Optional)</Label>
        <Input
          id="palette-title"
          value={draft.title}
          onChange={(event) => onChange({ ...draft, title: event.target.value })}
          placeholder="e.g., Ocean Breeze"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="palette-description">Description (Optional)</Label>
        <Input
          id="palette-description"
          value={draft.description}
          onChange={(event) => onChange({ ...draft, description: event.target.value })}
          placeholder="A calming palette inspired by the ocean"
        />
      </div>

      <div className="flex justify-end gap-3 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={onSave} disabled={saving}>
          {saveLabel}
        </Button>
      </div>
    </div>
  )
}

function PaletteCard({
  palette,
  owned,
  favorite,
  showColorCodes,
  showLikes,
  onCopyColor,
  onCopy,
  onExport,
  onToggleFavorite,
  onEdit,
  onDelete,
}: {
  palette: ColorPalette
  owned: boolean
  favorite: boolean
  showColorCodes: boolean
  showLikes: boolean
  /** Absent when click-to-copy is turned off in settings. */
  onCopyColor?: (color: string) => void
  onCopy: () => void
  onExport: () => void
  onToggleFavorite: () => void
  onEdit: () => void
  onDelete: () => void
}) {
  const label = palette.title || "palette"
  const swatchClass =
    "group relative flex flex-1 items-center justify-center transition-[filter] hover:brightness-90"

  return (
    <Card className="overflow-hidden">
      <div className="flex h-32">
        {palette.colors.map((color, index) => {
          const code = showColorCodes && (
            <span className="font-mono text-xs text-white opacity-0 drop-shadow-lg group-hover:opacity-100 group-focus-visible:opacity-100">
              {color}
            </span>
          )
          return onCopyColor ? (
            <button
              key={index}
              type="button"
              className={swatchClass}
              style={{ backgroundColor: color }}
              onClick={() => onCopyColor(color)}
              aria-label={`Copy ${color}`}
              title={`Click to copy ${color}`}
            >
              {code}
            </button>
          ) : (
            <div key={index} className={swatchClass} style={{ backgroundColor: color }} title={color}>
              {code}
            </div>
          )
        })}
      </div>
      <CardContent className="p-4">
        <div className="mb-2 flex items-start justify-between">
          <div className="min-w-0 flex-1">
            {palette.title && <h3 className="truncate text-sm font-semibold">{palette.title}</h3>}
            {palette.description && (
              <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{palette.description}</p>
            )}
          </div>
          <div className="ml-2 flex gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={onToggleFavorite}
              aria-pressed={favorite}
              aria-label={favorite ? `Remove ${label} from favorites` : `Add ${label} to favorites`}
            >
              <Heart
                className={`h-4 w-4 ${favorite ? "fill-red-500 text-red-500" : "text-muted-foreground"}`}
              />
            </Button>
            {owned && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={onEdit}
                  aria-label={`Edit ${label}`}
                >
                  <Edit2 className="h-4 w-4 text-muted-foreground" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={onDelete}
                  aria-label={`Delete ${label}`}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </>
            )}
          </div>
        </div>
        <div className="mt-3 flex items-center gap-2">
          <Button variant="outline" size="sm" className="flex-1 text-xs" onClick={onCopy}>
            <Copy className="mr-1 h-3 w-3" />
            Copy
          </Button>
          <Button variant="outline" size="sm" className="flex-1 text-xs" onClick={onExport}>
            <Download className="mr-1 h-3 w-3" />
            Export
          </Button>
          {showLikes && palette.likes > 0 && (
            <Badge variant="secondary" className="text-xs">
              {palette.likes} {palette.likes === 1 ? "like" : "likes"}
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
