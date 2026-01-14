"use client"

import * as React from "react"
import { motion } from "framer-motion"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { 
  Plus, 
  Calendar, 
  DollarSign, 
  Users, 
  Gift,
  X,
  Trash2,
  Search,
  UserPlus,
  UserMinus,
  Shuffle,
  Eye,
  EyeOff,
  Edit2,
  Move
} from "lucide-react"
import { toast } from "sonner"
import { useAuth } from "@/components/auth/auth-provider"
import { AuthDialog } from "@/components/auth/auth-dialog"
import { db } from "@/lib/firebase/config"
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  getDocs, 
  getDoc,
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  serverTimestamp,
  Timestamp
} from "firebase/firestore"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface CustomField {
  id: string
  label: string
  type: "text" | "number" | "select"
  required: boolean
  options?: string[] // For select type
}

interface Exchange {
  id: string
  name: string
  description: string
  budget: string
  exchangeDate: string
  participants: string[]
  assignments: Record<string, string> // giverId -> receiverId
  drawn: boolean
  customFields?: CustomField[]
  participantResponses?: Record<string, Record<string, string>> // participantId -> { fieldId: value }
  createdBy: string
  createdByName: string
  createdAt: Timestamp
  updatedAt: Timestamp
}

interface ParticipantInfo {
  uid: string
  name: string
}

export function SecretSantaMain() {
  const { user } = useAuth()
  const [exchanges, setExchanges] = React.useState<Exchange[]>([])
  const [loading, setLoading] = React.useState(true)
  const [authDialogOpen, setAuthDialogOpen] = React.useState(false)
  const [createDialogOpen, setCreateDialogOpen] = React.useState(false)
  const [joinDialogOpen, setJoinDialogOpen] = React.useState<string | null>(null)
  const [searchQuery, setSearchQuery] = React.useState("")
  const [participantNames, setParticipantNames] = React.useState<Record<string, string>>({})
  const [revealedAssignments, setRevealedAssignments] = React.useState<Record<string, boolean>>({})
  const [viewResponsesOpen, setViewResponsesOpen] = React.useState<string | null>(null)

  // Form state
  const [formData, setFormData] = React.useState({
    name: "",
    description: "",
    budget: "",
    exchangeDate: "",
    customFields: [] as CustomField[],
  })

  // Join form responses
  const [joinResponses, setJoinResponses] = React.useState<Record<string, string>>({})

  // Load exchanges from Firestore
  React.useEffect(() => {
    loadExchanges()
  }, [])

  const loadExchanges = async () => {
    try {
      setLoading(true)
      const exchangesRef = collection(db, "secretSantaExchanges")
      
      let snapshot
      try {
        const q = query(exchangesRef, orderBy("exchangeDate", "asc"))
        snapshot = await getDocs(q)
      } catch (indexError: any) {
        if (indexError?.code === "failed-precondition") {
          console.warn("Index not found, fetching all exchanges")
          snapshot = await getDocs(exchangesRef)
        } else {
          snapshot = await getDocs(exchangesRef)
        }
      }
      
      const exchangesData: Exchange[] = []
      const participantUids = new Set<string>()

      snapshot.forEach((doc) => {
        const data = doc.data()
        exchangesData.push({
          id: doc.id,
          name: data.name || "",
          description: data.description || "",
          budget: data.budget || "",
          exchangeDate: data.exchangeDate || "",
          participants: Array.isArray(data.participants) ? data.participants : [],
          assignments: data.assignments || {},
          drawn: data.drawn || false,
          customFields: data.customFields || [],
          participantResponses: data.participantResponses || {},
          createdBy: data.createdBy || "",
          createdByName: data.createdByName || "",
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
        } as Exchange)

        // Collect all participant UIDs to fetch names
        if (Array.isArray(data.participants)) {
          data.participants.forEach((uid: string) => {
            if (uid) participantUids.add(uid)
          })
        }
        if (data.createdBy) {
          participantUids.add(data.createdBy)
        }
      })

      // Sort exchanges by date client-side if query didn't order them
      exchangesData.sort((a, b) => {
        if (a.exchangeDate !== b.exchangeDate) {
          return a.exchangeDate.localeCompare(b.exchangeDate)
        }
        return 0
      })

      setExchanges(exchangesData)

      // Load participant names
      if (participantUids.size > 0) {
        await loadParticipantNames(Array.from(participantUids))
      }
    } catch (error: any) {
      console.error("Failed to load exchanges:", error)
      if (error?.code === "permission-denied") {
        toast.error("Permission denied. Please check Firestore rules.")
      } else {
        toast.error("Failed to load exchanges. Please try again.")
      }
    } finally {
      setLoading(false)
    }
  }

  const loadParticipantNames = async (uids: string[]) => {
    const names: Record<string, string> = {}
    
    await Promise.all(
      uids.map(async (uid) => {
        try {
          const userDocRef = doc(db, "users", uid)
          const userDoc = await getDoc(userDocRef)
          if (userDoc.exists()) {
            const userData = userDoc.data()
            names[uid] = userData.displayName || userData.username || "Unknown Participant"
          } else {
            names[uid] = "Unknown Participant"
          }
        } catch (error) {
          console.error(`Failed to load name for ${uid}:`, error)
          names[uid] = "Unknown Participant"
        }
      })
    )

    setParticipantNames(names)
  }

  const getUserDisplayName = async (uid: string): Promise<string> => {
    if (participantNames[uid]) {
      return participantNames[uid]
    }

    try {
      const userDocRef = doc(db, "users", uid)
      const userDoc = await getDoc(userDocRef)
      if (userDoc.exists()) {
        const userData = userDoc.data()
        const name = userData.displayName || userData.username || "Unknown Participant"
        setParticipantNames((prev) => ({ ...prev, [uid]: name }))
        return name
      }
    } catch (error) {
      console.error(`Failed to load name for ${uid}:`, error)
    }

    return "Unknown Participant"
  }

  const handleCreateExchange = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!user) {
      setAuthDialogOpen(true)
      return
    }

    // Check if user has display name set
    try {
      const userDocRef = doc(db, "users", user.uid)
      const userDoc = await getDoc(userDocRef)
      if (!userDoc.exists()) {
        toast.error("Please set your display name in Account Settings before creating an exchange")
        return
      }
      const userData = userDoc.data()
      if (!userData.displayName && !userData.username) {
        toast.error("Please set your display name in Account Settings before creating an exchange")
        return
      }
    } catch (error) {
      toast.error("Failed to verify user profile")
      return
    }

    try {
      const exchangeData = {
        name: formData.name,
        description: formData.description,
        budget: formData.budget,
        exchangeDate: formData.exchangeDate,
        participants: [user.uid],
        assignments: {},
        drawn: false,
        customFields: formData.customFields,
        participantResponses: {},
        createdBy: user.uid,
        createdByName: participantNames[user.uid] || await getUserDisplayName(user.uid),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }

      await addDoc(collection(db, "secretSantaExchanges"), exchangeData)
      
      toast.success("Exchange created successfully! You've been added as a participant.")
      setCreateDialogOpen(false)
      setFormData({
        name: "",
        description: "",
        budget: "",
        exchangeDate: "",
        customFields: [],
      })
      
      loadExchanges()
    } catch (error: any) {
      console.error("Failed to create exchange:", error)
      if (error.code === "permission-denied") {
        toast.error("Permission denied. Please sign in to create exchanges.")
      } else {
        toast.error("Failed to create exchange")
      }
    }
  }

  const handleJoinExchange = async (exchangeId: string) => {
    if (!user) {
      setAuthDialogOpen(true)
      return
    }

    // Check if user has display name
    try {
      const userDocRef = doc(db, "users", user.uid)
      const userDoc = await getDoc(userDocRef)
      if (!userDoc.exists()) {
        toast.error("Please set your display name in Account Settings before joining an exchange")
        return
      }
      const userData = userDoc.data()
      if (!userData.displayName && !userData.username) {
        toast.error("Please set your display name in Account Settings before joining an exchange")
        return
      }
    } catch (error) {
      toast.error("Failed to verify user profile")
      return
    }

    const exchange = exchanges.find((e) => e.id === exchangeId)
    if (!exchange) return

    if (exchange.participants.includes(user.uid)) {
      toast.error("You're already in this exchange")
      return
    }

    if (exchange.drawn) {
      toast.error("Cannot join an exchange after names have been drawn")
      return
    }

    // If there are custom fields, show dialog to fill them out
    if (exchange.customFields && exchange.customFields.length > 0) {
      // Reset responses and open dialog
      const initialResponses: Record<string, string> = {}
      exchange.customFields.forEach((field) => {
        initialResponses[field.id] = ""
      })
      setJoinResponses(initialResponses)
      setJoinDialogOpen(exchangeId)
      return
    }

    // No custom fields, join directly
    await performJoin(exchangeId)
  }

  const performJoin = async (exchangeId: string) => {
    if (!user) return

    try {
      const exchange = exchanges.find((e) => e.id === exchangeId)
      if (!exchange) return

      // Validate required fields
      if (exchange.customFields && exchange.customFields.length > 0) {
        const missingFields: string[] = []
        exchange.customFields.forEach((field) => {
          if (field.required && (!joinResponses[field.id] || joinResponses[field.id].trim() === "")) {
            missingFields.push(field.label)
          }
        })
        if (missingFields.length > 0) {
          toast.error(`Please fill in required fields: ${missingFields.join(", ")}`)
          return
        }
      }

      const exchangeRef = doc(db, "secretSantaExchanges", exchangeId)
      const updateData: any = {
        participants: [...exchange.participants, user.uid],
        updatedAt: serverTimestamp(),
      }

      // Add participant responses if there are custom fields
      if (exchange.customFields && exchange.customFields.length > 0 && Object.keys(joinResponses).length > 0) {
        const currentResponses = exchange.participantResponses || {}
        updateData.participantResponses = {
          ...currentResponses,
          [user.uid]: joinResponses,
        }
      }

      await updateDoc(exchangeRef, updateData)

      toast.success("Joined exchange successfully!")
      setJoinDialogOpen(null)
      setJoinResponses({})
      loadExchanges()
    } catch (error: any) {
      console.error("Failed to join exchange:", error)
      if (error.code === "permission-denied") {
        toast.error("Permission denied")
      } else {
        toast.error("Failed to join exchange")
      }
    }
  }

  const handleLeaveExchange = async (exchangeId: string) => {
    if (!user) {
      setAuthDialogOpen(true)
      return
    }

    try {
      const exchange = exchanges.find((e) => e.id === exchangeId)
      if (!exchange) return

      if (!exchange.participants.includes(user.uid)) {
        toast.error("You're not in this exchange")
        return
      }

      if (exchange.drawn) {
        toast.error("Cannot leave an exchange after names have been drawn")
        return
      }

      const exchangeRef = doc(db, "secretSantaExchanges", exchangeId)
      const updateData: any = {
        participants: exchange.participants.filter((uid) => uid !== user.uid),
        updatedAt: serverTimestamp(),
      }

      // Remove participant responses if they exist
      if (exchange.participantResponses && exchange.participantResponses[user.uid]) {
        const updatedResponses = { ...exchange.participantResponses }
        delete updatedResponses[user.uid]
        updateData.participantResponses = updatedResponses
      }

      await updateDoc(exchangeRef, updateData)

      toast.success("Left exchange successfully")
      loadExchanges()
    } catch (error: any) {
      console.error("Failed to leave exchange:", error)
      toast.error("Failed to leave exchange")
    }
  }

  const handleDrawNames = async (exchangeId: string) => {
    if (!user) {
      setAuthDialogOpen(true)
      return
    }

    const exchange = exchanges.find((e) => e.id === exchangeId)
    if (!exchange) return

    if (exchange.createdBy !== user.uid) {
      toast.error("Only the organizer can draw names")
      return
    }

    if (exchange.drawn) {
      toast.error("Names have already been drawn for this exchange")
      return
    }

    if (exchange.participants.length < 2) {
      toast.error("Need at least 2 participants to draw names")
      return
    }

    if (!confirm("Are you sure you want to draw names? This cannot be undone.")) {
      return
    }

    try {
      // Shuffle participants and create assignments
      const shuffled = [...exchange.participants].sort(() => Math.random() - 0.5)
      const assignments: Record<string, string> = {}
      
      for (let i = 0; i < shuffled.length; i++) {
        const giver = shuffled[i]
        const receiver = shuffled[(i + 1) % shuffled.length]
        assignments[giver] = receiver
      }

      const exchangeRef = doc(db, "secretSantaExchanges", exchangeId)
      await updateDoc(exchangeRef, {
        assignments,
        drawn: true,
        updatedAt: serverTimestamp(),
      })

      toast.success("Names drawn successfully! Participants can now view their assignments.")
      loadExchanges()
    } catch (error: any) {
      console.error("Failed to draw names:", error)
      toast.error("Failed to draw names")
    }
  }

  const handleDeleteExchange = async (exchangeId: string) => {
    if (!user) return

    const exchange = exchanges.find((e) => e.id === exchangeId)
    if (!exchange || exchange.createdBy !== user.uid) {
      toast.error("You can only delete exchanges you created")
      return
    }

    if (!confirm("Are you sure you want to delete this exchange? This cannot be undone.")) {
      return
    }

    try {
      await deleteDoc(doc(db, "secretSantaExchanges", exchangeId))
      toast.success("Exchange deleted successfully")
      loadExchanges()
    } catch (error: any) {
      console.error("Failed to delete exchange:", error)
      toast.error("Failed to delete exchange")
    }
  }

  const toggleRevealAssignment = (exchangeId: string) => {
    setRevealedAssignments((prev) => ({
      ...prev,
      [exchangeId]: !prev[exchangeId],
    }))
  }

  const filteredExchanges = React.useMemo(() => {
    let filtered = exchanges

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (exchange) =>
          exchange.name.toLowerCase().includes(query) ||
          exchange.description.toLowerCase().includes(query)
      )
    }

    return filtered
  }, [exchanges, searchQuery])

  const isUserInExchange = (exchange: Exchange) => {
    return user && Array.isArray(exchange.participants) && exchange.participants.includes(user.uid)
  }

  const canManageExchange = (exchange: Exchange) => {
    return user && exchange.createdBy && exchange.createdBy === user.uid
  }

  const getUserAssignment = (exchange: Exchange) => {
    if (!user || !exchange.drawn || !exchange.assignments) return null
    return exchange.assignments[user.uid] || null
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return "Date TBD"
    try {
      const date = new Date(dateString + "T00:00:00")
      return date.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    } catch {
      return dateString
    }
  }

  const addCustomField = () => {
    const newField: CustomField = {
      id: `field-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      label: "",
      type: "text",
      required: false,
    }
    setFormData({
      ...formData,
      customFields: [...formData.customFields, newField],
    })
  }

  const updateCustomField = (fieldId: string, updates: Partial<CustomField>) => {
    setFormData({
      ...formData,
      customFields: formData.customFields.map((field) =>
        field.id === fieldId ? { ...field, ...updates } : field
      ),
    })
  }

  const removeCustomField = (fieldId: string) => {
    setFormData({
      ...formData,
      customFields: formData.customFields.filter((field) => field.id !== fieldId),
    })
  }

  const updateCustomFieldOptions = (fieldId: string, optionsString: string) => {
    const options = optionsString.split(",").map((opt) => opt.trim()).filter((opt) => opt.length > 0)
    updateCustomField(fieldId, { options })
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      <div>
        <h2 className="text-2xl font-bold mb-2">Secret Santa</h2>
        <p className="text-muted-foreground">
          Organize and manage Secret Santa gift exchanges
        </p>
      </div>

      {/* Actions Bar */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search exchanges..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => !user && setAuthDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Exchange
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Create New Exchange</DialogTitle>
              <DialogDescription>
                Set up a new Secret Santa gift exchange
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateExchange} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Exchange Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Office Secret Santa 2025"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Add any additional details..."
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="budget">Budget</Label>
                  <Input
                    id="budget"
                    value={formData.budget}
                    onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                    placeholder="e.g., $25"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="exchangeDate">Exchange Date *</Label>
                  <Input
                    id="exchangeDate"
                    type="date"
                    value={formData.exchangeDate}
                    onChange={(e) => setFormData({ ...formData, exchangeDate: e.target.value })}
                    min={new Date().toISOString().split("T")[0]}
                    required
                  />
                </div>
              </div>

              {/* Custom Fields Section */}
              <div className="space-y-3 pt-4 border-t">
                <div className="flex items-center justify-between">
                  <Label>Custom Fields (Optional)</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addCustomField}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Field
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Add custom fields for participants to fill out when joining (e.g., Size for jersey swap)
                </p>
                
                {formData.customFields.map((field, index) => (
                  <Card key={field.id} className="p-3">
                    <div className="space-y-3">
                      <div className="flex items-start gap-2">
                        <div className="flex-1 space-y-2">
                          <Input
                            placeholder="Field label (e.g., Jersey Size)"
                            value={field.label}
                            onChange={(e) => updateCustomField(field.id, { label: e.target.value })}
                          />
                          <div className="grid grid-cols-2 gap-2">
                            <Select
                              value={field.type}
                              onValueChange={(value: "text" | "number" | "select") =>
                                updateCustomField(field.id, { type: value, options: value === "select" ? [] : undefined })
                              }
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="text">Text</SelectItem>
                                <SelectItem value="number">Number</SelectItem>
                                <SelectItem value="select">Select (Dropdown)</SelectItem>
                              </SelectContent>
                            </Select>
                            <label className="flex items-center gap-2 text-sm">
                              <input
                                type="checkbox"
                                checked={field.required}
                                onChange={(e) => updateCustomField(field.id, { required: e.target.checked })}
                                className="rounded"
                              />
                              Required
                            </label>
                          </div>
                          {field.type === "select" && (
                            <Input
                              placeholder="Options (comma-separated, e.g., Small, Medium, Large)"
                              value={field.options?.join(", ") || ""}
                              onChange={(e) => updateCustomFieldOptions(field.id, e.target.value)}
                            />
                          )}
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeCustomField(field.id)}
                          className="h-8 w-8"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setCreateDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit">Create Exchange</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Exchanges List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <p className="text-muted-foreground">Loading exchanges...</p>
        </div>
      ) : filteredExchanges.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-4">
              {searchQuery
                ? "No exchanges match your search"
                : "No exchanges created yet. Create the first one!"}
            </p>
            {!user && (
              <Button onClick={() => setAuthDialogOpen(true)}>
                Sign In to Create Exchange
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredExchanges.map((exchange) => {
            const userAssignment = getUserAssignment(exchange)
            const isRevealed = revealedAssignments[exchange.id]
            
            return (
              <Card key={exchange.id} className="relative">
                <CardHeader>
                  <div className="flex items-start justify-between mb-2">
                    <CardTitle className="text-lg flex-1">{exchange.name}</CardTitle>
                    {canManageExchange(exchange) && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleDeleteExchange(exchange.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                  {exchange.description && (
                    <CardDescription className="line-clamp-2">
                      {exchange.description}
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span>{formatDate(exchange.exchangeDate)}</span>
                    </div>
                    {exchange.budget && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <DollarSign className="h-4 w-4" />
                        <span>{exchange.budget}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Users className="h-4 w-4" />
                      <span>
                        {exchange.participants.length} participant{exchange.participants.length !== 1 ? "s" : ""}
                      </span>
                    </div>
                    {exchange.drawn && (
                      <Badge variant="secondary" className="mt-2">
                        Names Drawn
                      </Badge>
                    )}
                    {exchange.createdBy && (
                      <div className="text-xs text-muted-foreground">
                        Organized by {participantNames[exchange.createdBy] || "Unknown"}
                      </div>
                    )}
                    {exchange.customFields && exchange.customFields.length > 0 && (
                      <Badge variant="outline" className="mt-1">
                        {exchange.customFields.length} custom field{exchange.customFields.length !== 1 ? "s" : ""}
                      </Badge>
                    )}
                  </div>

                  {/* Custom Fields Info */}
                  {exchange.customFields && exchange.customFields.length > 0 && (
                    <div className="pt-2 border-t">
                      <p className="text-xs font-medium mb-2">Custom Fields:</p>
                      <div className="space-y-1">
                        {exchange.customFields.map((field) => (
                          <div key={field.id} className="text-xs text-muted-foreground">
                            • {field.label} ({field.type}){field.required && " *"}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Participants List */}
                  {Array.isArray(exchange.participants) && exchange.participants.length > 0 && (
                    <div className="pt-2 border-t">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-medium">Participants:</p>
                        {canManageExchange(exchange) && exchange.participantResponses && Object.keys(exchange.participantResponses).length > 0 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 text-xs"
                            onClick={() => setViewResponsesOpen(exchange.id)}
                          >
                            View Responses
                          </Button>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {exchange.participants.map((participantId) => (
                          <Badge key={participantId} variant="outline" className="text-xs">
                            {participantNames[participantId] || "Loading..."}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Assignment Display */}
                  {exchange.drawn && isUserInExchange(exchange) && userAssignment && (
                    <div className="pt-2 border-t">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-medium">Your Assignment:</p>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleRevealAssignment(exchange.id)}
                        >
                          {isRevealed ? (
                            <EyeOff className="h-3 w-3" />
                          ) : (
                            <Eye className="h-3 w-3" />
                          )}
                        </Button>
                      </div>
                      {isRevealed ? (
                        <Badge variant="default" className="text-sm p-2">
                          <Gift className="h-3 w-3 mr-1" />
                          {participantNames[userAssignment] || "Loading..."}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-sm p-2">
                          Click to reveal
                        </Badge>
                      )}
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-2 pt-2">
                    {canManageExchange(exchange) && !exchange.drawn && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1"
                        onClick={() => handleDrawNames(exchange.id)}
                        disabled={exchange.participants.length < 2}
                      >
                        <Shuffle className="h-4 w-4 mr-2" />
                        Draw Names
                      </Button>
                    )}
                    {isUserInExchange(exchange) ? (
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => handleLeaveExchange(exchange.id)}
                        disabled={exchange.drawn}
                      >
                        <UserMinus className="h-4 w-4 mr-2" />
                        Leave
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        className="flex-1"
                        onClick={() => handleJoinExchange(exchange.id)}
                        disabled={exchange.drawn || !user}
                      >
                        <UserPlus className="h-4 w-4 mr-2" />
                        {exchange.drawn ? "Closed" : "Join"}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Join Dialog with Custom Fields */}
      {joinDialogOpen && (() => {
        const exchange = exchanges.find((e) => e.id === joinDialogOpen)
        if (!exchange) return null

        return (
          <Dialog open={!!joinDialogOpen} onOpenChange={(open) => !open && setJoinDialogOpen(null)}>
            <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Join {exchange.name}</DialogTitle>
                <DialogDescription>
                  {exchange.customFields && exchange.customFields.length > 0
                    ? "Please fill out the following information:"
                    : "Join this exchange"}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                {exchange.customFields && exchange.customFields.map((field) => (
                  <div key={field.id} className="space-y-2">
                    <Label htmlFor={`join-${field.id}`}>
                      {field.label} {field.required && <span className="text-destructive">*</span>}
                    </Label>
                    {field.type === "text" && (
                      <Input
                        id={`join-${field.id}`}
                        value={joinResponses[field.id] || ""}
                        onChange={(e) =>
                          setJoinResponses({ ...joinResponses, [field.id]: e.target.value })
                        }
                        required={field.required}
                        placeholder={`Enter ${field.label.toLowerCase()}`}
                      />
                    )}
                    {field.type === "number" && (
                      <Input
                        id={`join-${field.id}`}
                        type="number"
                        value={joinResponses[field.id] || ""}
                        onChange={(e) =>
                          setJoinResponses({ ...joinResponses, [field.id]: e.target.value })
                        }
                        required={field.required}
                        placeholder={`Enter ${field.label.toLowerCase()}`}
                      />
                    )}
                    {field.type === "select" && (
                      <Select
                        value={joinResponses[field.id] || ""}
                        onValueChange={(value) =>
                          setJoinResponses({ ...joinResponses, [field.id]: value })
                        }
                        required={field.required}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={`Select ${field.label.toLowerCase()}`} />
                        </SelectTrigger>
                        <SelectContent>
                          {field.options?.map((option) => (
                            <SelectItem key={option} value={option}>
                              {option}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                ))}
                <div className="flex justify-end gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setJoinDialogOpen(null)
                      setJoinResponses({})
                    }}
                  >
                    Cancel
                  </Button>
                  <Button onClick={() => performJoin(joinDialogOpen)}>
                    Join Exchange
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )
      })()}

      {/* View Responses Dialog */}
      {viewResponsesOpen && (() => {
        const exchange = exchanges.find((e) => e.id === viewResponsesOpen)
        if (!exchange || !exchange.participantResponses || !exchange.customFields) return null

        return (
          <Dialog open={!!viewResponsesOpen} onOpenChange={(open) => !open && setViewResponsesOpen(null)}>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Participant Responses</DialogTitle>
                <DialogDescription>
                  View responses to custom fields from all participants
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                {exchange.participants.map((participantId) => {
                  const responses = exchange.participantResponses?.[participantId] || {}
                  return (
                    <Card key={participantId} className="p-4">
                      <div className="font-medium mb-3">
                        {participantNames[participantId] || "Unknown"}
                      </div>
                      <div className="space-y-2">
                        {exchange.customFields!.map((field) => {
                          const value = responses[field.id] || "—"
                          return (
                            <div key={field.id} className="text-sm">
                              <span className="text-muted-foreground">{field.label}:</span>{" "}
                              <span className="font-medium">{value}</span>
                            </div>
                          )
                        })}
                      </div>
                    </Card>
                  )
                })}
              </div>
              <div className="flex justify-end pt-4">
                <Button variant="outline" onClick={() => setViewResponsesOpen(null)}>
                  Close
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )
      })()}

      <AuthDialog open={authDialogOpen} onOpenChange={setAuthDialogOpen} />
    </motion.div>
  )
}
