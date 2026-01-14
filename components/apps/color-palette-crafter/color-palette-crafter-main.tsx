"use client"

import * as React from "react"
import { motion } from "framer-motion"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { 
  Plus,
  Heart,
  Copy,
  Download,
  Search,
  Palette,
  RefreshCw,
  Trash2,
  Edit2,
  X
} from "lucide-react"
import { toast } from "sonner"
import { useAuth } from "@/components/auth/auth-provider"
import { AuthDialog } from "@/components/auth/auth-dialog"
import { db } from "@/lib/firebase/config"
import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"

interface ColorPalette {
  id?: string
  colors: string[] // Array of hex colors (typically 4)
  title?: string
  description?: string
  likes: number
  createdBy?: string
  createdByName?: string
  createdAt?: Timestamp
  updatedAt?: Timestamp
}

export function ColorPaletteCrafterMain() {
  const { user, loading: authLoading } = useAuth()
  const [authDialogOpen, setAuthDialogOpen] = React.useState(false)
  const [loading, setLoading] = React.useState(true)
  const [palettes, setPalettes] = React.useState<ColorPalette[]>([])
  const [myPalettes, setMyPalettes] = React.useState<ColorPalette[]>([])
  const [favorites, setFavorites] = React.useState<string[]>([])
  const [searchQuery, setSearchQuery] = React.useState("")
  const [createDialogOpen, setCreateDialogOpen] = React.useState(false)
  const [editDialogOpen, setEditDialogOpen] = React.useState<string | null>(null)
  const [activeTab, setActiveTab] = React.useState<"browse" | "my-palettes" | "favorites">("browse")

  // New palette form state
  const [newPalette, setNewPalette] = React.useState({
    colors: ["#FF6B6B", "#4ECDC4", "#45B7D1", "#FFA07A"],
    title: "",
    description: "",
  })

  // Load palettes and favorites
  React.useEffect(() => {
    loadPalettes()
    if (user) {
      loadMyPalettes()
      loadFavorites()
    }
  }, [user])

  const loadPalettes = async () => {
    try {
      setLoading(true)
      const palettesRef = collection(db, "colorPalettes")
      const palettesQuery = query(palettesRef, orderBy("createdAt", "desc"), limit(100))
      const snapshot = await getDocs(palettesQuery)

      const palettesData: ColorPalette[] = []
      snapshot.forEach((doc) => {
        const data = doc.data()
        palettesData.push({
          id: doc.id,
          colors: data.colors || [],
          title: data.title || "",
          description: data.description || "",
          likes: data.likes || 0,
          createdBy: data.createdBy || "",
          createdByName: data.createdByName || "",
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
        })
      })

      setPalettes(palettesData)
    } catch (error: any) {
      console.error("Failed to load palettes:", error)
      if (error.code !== "permission-denied") {
        toast.error("Failed to load palettes")
      }
    } finally {
      setLoading(false)
    }
  }

  const loadMyPalettes = async () => {
    if (!user) return

    try {
      const palettesRef = collection(db, "colorPalettes")
      const myPalettesQuery = query(
        palettesRef,
        where("createdBy", "==", user.uid),
        orderBy("createdAt", "desc")
      )
      const snapshot = await getDocs(myPalettesQuery)

      const palettesData: ColorPalette[] = []
      snapshot.forEach((doc) => {
        const data = doc.data()
        palettesData.push({
          id: doc.id,
          colors: data.colors || [],
          title: data.title || "",
          description: data.description || "",
          likes: data.likes || 0,
          createdBy: data.createdBy || "",
          createdByName: data.createdByName || "",
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
        })
      })

      setMyPalettes(palettesData)
    } catch (error: any) {
      console.error("Failed to load my palettes:", error)
    }
  }

  const loadFavorites = async () => {
    if (!user) {
      setFavorites([])
      return
    }

    try {
      const favoritesRef = collection(db, "users", user.uid, "colorPaletteCrafterFavorites")
      const snapshot = await getDocs(favoritesRef)

      const favoriteIds: string[] = []
      snapshot.forEach((doc) => {
        favoriteIds.push(doc.id)
      })

      setFavorites(favoriteIds)
    } catch (error: any) {
      console.error("Failed to load favorites:", error)
    }
  }

  const generateRandomPalette = () => {
    const colors: string[] = []
    for (let i = 0; i < 4; i++) {
      colors.push(`#${Math.floor(Math.random() * 16777215).toString(16).padStart(6, "0")}`)
    }
    setNewPalette({ ...newPalette, colors })
  }

  const handleCreatePalette = async () => {
    if (!user) {
      setAuthDialogOpen(true)
      return
    }

    if (newPalette.colors.length < 2) {
      toast.error("Please add at least 2 colors")
      return
    }

    try {
      // Get user display name
      let displayName = "Unknown"
      try {
        const userDocRef = doc(db, "users", user.uid)
        const userDoc = await getDoc(userDocRef)
        if (userDoc.exists()) {
          const userData = userDoc.data()
          displayName = userData.displayName || userData.username || "Unknown"
        }
      } catch (error) {
        console.error("Failed to get user name:", error)
      }

      const paletteData = {
        colors: newPalette.colors,
        title: newPalette.title || "",
        description: newPalette.description || "",
        likes: 0,
        createdBy: user.uid,
        createdByName: displayName,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }

      await addDoc(collection(db, "colorPalettes"), paletteData)

      toast.success("Palette created successfully!")
      setCreateDialogOpen(false)
      setNewPalette({
        colors: ["#FF6B6B", "#4ECDC4", "#45B7D1", "#FFA07A"],
        title: "",
        description: "",
      })
      loadPalettes()
      loadMyPalettes()
    } catch (error: any) {
      console.error("Failed to create palette:", error)
      if (error.code === "permission-denied") {
        toast.error("Permission denied. Please sign in to create palettes.")
      } else {
        toast.error("Failed to create palette")
      }
    }
  }

  const handleUpdatePalette = async (paletteId: string) => {
    if (!user) return

    const palette = myPalettes.find((p) => p.id === paletteId)
    if (!palette) return

    try {
      const paletteRef = doc(db, "colorPalettes", paletteId)
      await updateDoc(paletteRef, {
        colors: newPalette.colors,
        title: newPalette.title || "",
        description: newPalette.description || "",
        updatedAt: serverTimestamp(),
      })

      toast.success("Palette updated successfully!")
      setEditDialogOpen(null)
      setNewPalette({
        colors: ["#FF6B6B", "#4ECDC4", "#45B7D1", "#FFA07A"],
        title: "",
        description: "",
      })
      loadPalettes()
      loadMyPalettes()
    } catch (error: any) {
      console.error("Failed to update palette:", error)
      toast.error("Failed to update palette")
    }
  }

  const handleDeletePalette = async (paletteId: string) => {
    if (!user) return

    if (!confirm("Are you sure you want to delete this palette? This cannot be undone.")) {
      return
    }

    try {
      await deleteDoc(doc(db, "colorPalettes", paletteId))
      toast.success("Palette deleted successfully")
      loadPalettes()
      loadMyPalettes()
    } catch (error: any) {
      console.error("Failed to delete palette:", error)
      toast.error("Failed to delete palette")
    }
  }

  const toggleFavorite = async (paletteId: string) => {
    if (!user) {
      setAuthDialogOpen(true)
      return
    }

    try {
      const favoriteRef = doc(db, "users", user.uid, "colorPaletteCrafterFavorites", paletteId)
      const favoriteDoc = await getDoc(favoriteRef)

      if (favoriteDoc.exists()) {
        await deleteDoc(favoriteRef)
        setFavorites((prev) => prev.filter((id) => id !== paletteId))
        toast.success("Removed from favorites")
      } else {
        await setDoc(favoriteRef, {
          paletteId,
          addedAt: serverTimestamp(),
        })
        setFavorites((prev) => [...prev, paletteId])
        toast.success("Added to favorites")
      }
    } catch (error: any) {
      console.error("Failed to toggle favorite:", error)
      toast.error("Failed to update favorites")
    }
  }

  const copyColor = (color: string) => {
    navigator.clipboard.writeText(color)
    toast.success(`Copied ${color} to clipboard`)
  }

  const copyPalette = (palette: ColorPalette) => {
    const colorsText = palette.colors.join(", ")
    navigator.clipboard.writeText(colorsText)
    toast.success("Palette colors copied to clipboard")
  }

  const exportPalette = (palette: ColorPalette) => {
    const data = {
      colors: palette.colors,
      title: palette.title || "",
      description: palette.description || "",
    }
    const dataStr = JSON.stringify(data, null, 2)
    const dataBlob = new Blob([dataStr], { type: "application/json" })
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement("a")
    link.href = url
    link.download = `palette-${palette.id || Date.now()}.json`
    link.click()
    URL.revokeObjectURL(url)
    toast.success("Palette exported")
  }

  const openEditDialog = (palette: ColorPalette) => {
    setNewPalette({
      colors: palette.colors,
      title: palette.title || "",
      description: palette.description || "",
    })
    setEditDialogOpen(palette.id || null)
  }

  const filteredPalettes = React.useMemo(() => {
    let filtered: ColorPalette[] = []

    if (activeTab === "my-palettes") {
      filtered = myPalettes
    } else if (activeTab === "favorites") {
      filtered = palettes.filter((p) => p.id && favorites.includes(p.id))
    } else {
      filtered = palettes
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (palette) =>
          palette.title?.toLowerCase().includes(query) ||
          palette.description?.toLowerCase().includes(query) ||
          palette.colors.some((color) => color.toLowerCase().includes(query))
      )
    }

    return filtered
  }, [palettes, myPalettes, favorites, activeTab, searchQuery])

  const renderPaletteCard = (palette: ColorPalette) => {
    const isOwner = user && palette.createdBy === user.uid
    const isFavorite = palette.id && favorites.includes(palette.id)

    return (
      <Card key={palette.id} className="overflow-hidden">
        <div className="flex h-32">
          {palette.colors.map((color, index) => (
            <div
              key={index}
              className="flex-1 cursor-pointer group relative"
              style={{ backgroundColor: color }}
              onClick={() => copyColor(color)}
              title={`Click to copy ${color}`}
            >
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                <span className="text-white text-xs font-mono opacity-0 group-hover:opacity-100 drop-shadow-lg">
                  {color}
                </span>
              </div>
            </div>
          ))}
        </div>
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-2">
            <div className="flex-1 min-w-0">
              {palette.title && (
                <h3 className="font-semibold text-sm truncate">{palette.title}</h3>
              )}
              {palette.description && (
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                  {palette.description}
                </p>
              )}
            </div>
            <div className="flex gap-1 ml-2">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => palette.id && toggleFavorite(palette.id)}
              >
                <Heart
                  className={`h-4 w-4 ${
                    isFavorite ? "fill-red-500 text-red-500" : "text-muted-foreground"
                  }`}
                />
              </Button>
              {isOwner && (
                <>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => openEditDialog(palette)}
                  >
                    <Edit2 className="h-4 w-4 text-muted-foreground" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => palette.id && handleDeletePalette(palette.id)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 mt-3">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 text-xs"
              onClick={() => copyPalette(palette)}
            >
              <Copy className="h-3 w-3 mr-1" />
              Copy
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-1 text-xs"
              onClick={() => exportPalette(palette)}
            >
              <Download className="h-3 w-3 mr-1" />
              Export
            </Button>
            {palette.likes > 0 && (
              <Badge variant="secondary" className="text-xs">
                {palette.likes} {palette.likes === 1 ? "like" : "likes"}
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      <div>
        <h2 className="text-2xl font-bold mb-2">Color Crafter</h2>
        <p className="text-muted-foreground">
          Discover, create, and share beautiful color palettes
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)} className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
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
              {favorites.length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {favorites.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <div className="flex gap-2 w-full sm:w-auto">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search palettes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => !user && setAuthDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>Create New Palette</DialogTitle>
                  <DialogDescription>
                    Create a beautiful color palette with up to 8 colors
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Colors</Label>
                    <div className="grid grid-cols-4 gap-2 mt-2">
                      {newPalette.colors.map((color, index) => (
                        <div key={index} className="space-y-1">
                          <div
                            className="w-full h-20 rounded border-2 border-border cursor-pointer"
                            style={{ backgroundColor: color }}
                            onClick={() => {
                              const newColors = [...newPalette.colors]
                              newColors[index] = `#${Math.floor(Math.random() * 16777215).toString(16).padStart(6, "0")}`
                              setNewPalette({ ...newPalette, colors: newColors })
                            }}
                            title="Click to randomize"
                          />
                          <Input
                            type="color"
                            value={color}
                            onChange={(e) => {
                              const newColors = [...newPalette.colors]
                              newColors[index] = e.target.value
                              setNewPalette({ ...newPalette, colors: newColors })
                            }}
                            className="h-8"
                          />
                          <Input
                            value={color}
                            onChange={(e) => {
                              const newColors = [...newPalette.colors]
                              newColors[index] = e.target.value
                              setNewPalette({ ...newPalette, colors: newColors })
                            }}
                            className="h-8 text-xs font-mono"
                            placeholder="#000000"
                          />
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-2 mt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={generateRandomPalette}
                        className="flex-1"
                      >
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Randomize
                      </Button>
                      {newPalette.colors.length < 8 && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setNewPalette({
                              ...newPalette,
                              colors: [...newPalette.colors, "#000000"],
                            })
                          }}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      )}
                      {newPalette.colors.length > 2 && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setNewPalette({
                              ...newPalette,
                              colors: newPalette.colors.slice(0, -1),
                            })
                          }}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="title">Title (Optional)</Label>
                    <Input
                      id="title"
                      value={newPalette.title}
                      onChange={(e) => setNewPalette({ ...newPalette, title: e.target.value })}
                      placeholder="e.g., Ocean Breeze"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Description (Optional)</Label>
                    <Input
                      id="description"
                      value={newPalette.description}
                      onChange={(e) =>
                        setNewPalette({ ...newPalette, description: e.target.value })
                      }
                      placeholder="A calming palette inspired by the ocean"
                    />
                  </div>

                  <div className="flex justify-end gap-3 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setCreateDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button onClick={handleCreatePalette}>Create Palette</Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <TabsContent value="browse" className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <p className="text-muted-foreground">Loading palettes...</p>
            </div>
          ) : filteredPalettes.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Palette className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">
                  {searchQuery ? "No palettes match your search" : "No palettes yet. Create the first one!"}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredPalettes.map((palette) => renderPaletteCard(palette))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="my-palettes" className="space-y-4">
          {!user ? (
            <Card>
              <CardContent className="py-12 text-center space-y-4">
                <Palette className="h-12 w-12 mx-auto text-muted-foreground" />
                <p className="text-muted-foreground">Please sign in to view your palettes</p>
                <Button onClick={() => setAuthDialogOpen(true)}>Sign In</Button>
              </CardContent>
            </Card>
          ) : myPalettes.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Palette className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">You haven't created any palettes yet</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredPalettes.map((palette) => renderPaletteCard(palette))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="favorites" className="space-y-4">
          {!user ? (
            <Card>
              <CardContent className="py-12 text-center space-y-4">
                <Heart className="h-12 w-12 mx-auto text-muted-foreground" />
                <p className="text-muted-foreground">Please sign in to view your favorites</p>
                <Button onClick={() => setAuthDialogOpen(true)}>Sign In</Button>
              </CardContent>
            </Card>
          ) : favorites.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Heart className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">No favorites yet</p>
                <p className="text-xs text-muted-foreground mt-2">
                  Click the heart icon on any palette to add it to favorites
                </p>
              </CardContent>
            </Card>
          ) : filteredPalettes.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">No favorites match your search</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredPalettes.map((palette) => renderPaletteCard(palette))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Edit Dialog */}
      {editDialogOpen && (() => {
        const palette = myPalettes.find((p) => p.id === editDialogOpen)
        if (!palette) return null

        return (
          <Dialog open={!!editDialogOpen} onOpenChange={(open) => !open && setEditDialogOpen(null)}>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Edit Palette</DialogTitle>
                <DialogDescription>Update your color palette</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Colors</Label>
                  <div className="grid grid-cols-4 gap-2 mt-2">
                    {newPalette.colors.map((color, index) => (
                      <div key={index} className="space-y-1">
                        <div
                          className="w-full h-20 rounded border-2 border-border cursor-pointer"
                          style={{ backgroundColor: color }}
                          onClick={() => {
                            const newColors = [...newPalette.colors]
                            newColors[index] = `#${Math.floor(Math.random() * 16777215).toString(16).padStart(6, "0")}`
                            setNewPalette({ ...newPalette, colors: newColors })
                          }}
                          title="Click to randomize"
                        />
                        <Input
                          type="color"
                          value={color}
                          onChange={(e) => {
                            const newColors = [...newPalette.colors]
                            newColors[index] = e.target.value
                            setNewPalette({ ...newPalette, colors: newColors })
                          }}
                          className="h-8"
                        />
                        <Input
                          value={color}
                          onChange={(e) => {
                            const newColors = [...newPalette.colors]
                            newColors[index] = e.target.value
                            setNewPalette({ ...newPalette, colors: newColors })
                          }}
                          className="h-8 text-xs font-mono"
                          placeholder="#000000"
                        />
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2 mt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={generateRandomPalette}
                      className="flex-1"
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Randomize
                    </Button>
                    {newPalette.colors.length < 8 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setNewPalette({
                            ...newPalette,
                            colors: [...newPalette.colors, "#000000"],
                          })
                        }}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    )}
                    {newPalette.colors.length > 2 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setNewPalette({
                            ...newPalette,
                            colors: newPalette.colors.slice(0, -1),
                          })
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-title">Title (Optional)</Label>
                  <Input
                    id="edit-title"
                    value={newPalette.title}
                    onChange={(e) => setNewPalette({ ...newPalette, title: e.target.value })}
                    placeholder="e.g., Ocean Breeze"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-description">Description (Optional)</Label>
                  <Input
                    id="edit-description"
                    value={newPalette.description}
                    onChange={(e) =>
                      setNewPalette({ ...newPalette, description: e.target.value })
                    }
                    placeholder="A calming palette inspired by the ocean"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setEditDialogOpen(null)}
                  >
                    Cancel
                  </Button>
                  <Button onClick={() => editDialogOpen && handleUpdatePalette(editDialogOpen)}>
                    Update Palette
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )
      })()}

      <AuthDialog open={authDialogOpen} onOpenChange={setAuthDialogOpen} />
    </motion.div>
  )
}
