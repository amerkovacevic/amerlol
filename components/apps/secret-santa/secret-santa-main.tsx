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
} from "lucide-react"
import { toast } from "sonner"
import { useAppSettings } from "@/components/apps/settings-provider"
import { useAuth } from "@/components/auth/auth-provider"
import { AuthDialog } from "@/components/auth/auth-dialog"
import { db } from "@/lib/firebase/config"
import {
  collection,
  query,
  orderBy,
  getDocs,
  getDoc,
  addDoc,
  doc,
  serverTimestamp,
  runTransaction,
  writeBatch,
} from "firebase/firestore"
import { getProfileName } from "@/lib/account/profile"
import { getDataErrorMessage, getErrorCode, logUnexpectedError } from "@/lib/firebase/user-facing-errors"
import { useAsync } from "@/lib/hooks/use-async"
import { createSecretSantaAssignments } from "@/lib/secret-santa/draw"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
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
  drawn: boolean
  participantNames: Record<string, string>
  legacyAssignments?: Record<string, string>
  customFields?: CustomField[]
  participantResponses?: Record<string, Record<string, string>> // participantId -> { fieldId: value }
  createdBy: string
  createdByName: string
}

const UNKNOWN_PARTICIPANT = "Unknown Participant"

async function queryExchanges() {
  const exchangesRef = collection(db, "secretSantaExchanges")
  try {
    return await getDocs(query(exchangesRef, orderBy("exchangeDate", "asc")))
  } catch (error) {
    // Without the index, fall back to an unordered read and sort below.
    if (getErrorCode(error) !== "failed-precondition") throw error
    return getDocs(exchangesRef)
  }
}

async function loadExchanges(uid: string | null) {
  const snapshot = await queryExchanges()
  const names: Record<string, string> = {}
  const exchanges = snapshot.docs
    .map((entry): Exchange => {
      const data = entry.data()
      Object.assign(names, data.participantNames || {})
      if (data.createdBy && data.createdByName) names[data.createdBy] = data.createdByName
      return {
        id: entry.id,
        name: data.name || "",
        description: data.description || "",
        budget: data.budget || "",
        exchangeDate: data.exchangeDate || "",
        participants: Array.isArray(data.participants) ? data.participants : [],
        drawn: data.drawn || false,
        participantNames: data.participantNames || {},
        legacyAssignments: data.assignments || {},
        customFields: data.customFields || [],
        participantResponses: data.participantResponses || {},
        createdBy: data.createdBy || "",
        createdByName: data.createdByName || "",
      }
    })
    .sort((a, b) => a.exchangeDate.localeCompare(b.exchangeDate))

  // Each participant can read only their own assignment document.
  const assignments: Record<string, string> = {}
  if (uid) {
    await Promise.all(
      exchanges
        .filter((exchange) => exchange.drawn && exchange.participants.includes(uid))
        .map(async (exchange) => {
          const assignment = await getDoc(doc(db, "secretSantaExchanges", exchange.id, "assignments", uid))
          const receiverId = assignment.exists()
            ? (assignment.data().receiverId as string)
            : exchange.legacyAssignments?.[uid]
          if (receiverId) assignments[exchange.id] = receiverId
        })
    )
  }
  return { exchanges, names, assignments }
}

const emptyForm = (budget: string) => ({
  name: "",
  description: "",
  budget,
  exchangeDate: "",
  customFields: [] as CustomField[],
})

/** Validation messages thrown inside transactions are already user-facing. */
const failureMessage = (error: unknown, action: string) =>
  getErrorCode(error) || !(error instanceof Error) ? getDataErrorMessage(error, action) : error.message

export function SecretSantaMain() {
  const settings = useAppSettings("secret-santa")
  const { account } = useAuth()
  const uid = account?.uid ?? null
  const exchangesQuery = useAsync(uid ?? "guest", () => loadExchanges(uid))
  const exchanges = React.useMemo(() => exchangesQuery.data?.exchanges ?? [], [exchangesQuery.data])
  const participantNames = exchangesQuery.data?.names ?? {}
  const userAssignments = exchangesQuery.data?.assignments ?? {}
  const loading = exchangesQuery.loading
  const reload = exchangesQuery.reload
  const [authDialogOpen, setAuthDialogOpen] = React.useState(false)
  const [createDialogOpen, setCreateDialogOpen] = React.useState(false)
  const [joinDialogOpen, setJoinDialogOpen] = React.useState<string | null>(null)
  const [searchQuery, setSearchQuery] = React.useState("")
  const [revealedAssignments, setRevealedAssignments] = React.useState<Record<string, boolean>>({})
  const [viewResponsesOpen, setViewResponsesOpen] = React.useState<string | null>(null)
  const [formData, setFormData] = React.useState(() => emptyForm(""))
  const [joinResponses, setJoinResponses] = React.useState<Record<string, string>>({})

  React.useEffect(() => {
    if (exchangesQuery.error) toast.error(getDataErrorMessage(exchangesQuery.error, "load exchanges"))
  }, [exchangesQuery.error])

  /** Returns the account's public name, or null after telling the user to set one. */
  const requireProfileName = async (uid: string, action: string) => {
    try {
      const name = participantNames[uid] || (await getProfileName(uid))
      if (name) return name
      toast.error(`Please set your display name in Account Settings before ${action} an exchange`)
    } catch {
      toast.error("Failed to verify user profile")
    }
    return null
  }

  const handleCreateExchange = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!account) {
      setAuthDialogOpen(true)
      return
    }
    const displayName = await requireProfileName(account.uid, "creating")
    if (!displayName) return

    try {
      await addDoc(collection(db, "secretSantaExchanges"), {
        ...formData,
        participants: [account.uid],
        drawn: false,
        participantResponses: {},
        participantNames: { [account.uid]: displayName },
        createdBy: account.uid,
        createdByName: displayName,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
      toast.success("Exchange created successfully! You've been added as a participant.")
      setCreateDialogOpen(false)
      reload()
    } catch (error) {
      logUnexpectedError("secret-santa:create", error)
      toast.error(
        getErrorCode(error) === "permission-denied"
          ? "Permission denied. Please sign in to create exchanges."
          : "Failed to create exchange"
      )
    }
  }

  const handleJoinExchange = async (exchangeId: string) => {
    if (!account) {
      setAuthDialogOpen(true)
      return
    }
    if (!(await requireProfileName(account.uid, "joining"))) return

    const exchange = exchanges.find((e) => e.id === exchangeId)
    if (!exchange) return

    if (exchange.participants.includes(account.uid)) {
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
    if (!account) return

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

      const displayName = (await requireProfileName(account.uid, "joining")) ?? UNKNOWN_PARTICIPANT
      const exchangeRef = doc(db, "secretSantaExchanges", exchangeId)
      await runTransaction(db, async (transaction) => {
        const snapshot = await transaction.get(exchangeRef)
        if (!snapshot.exists()) throw new Error("Exchange no longer exists")
        const current = snapshot.data()
        const participants = Array.isArray(current.participants) ? current.participants : []
        if (current.drawn) throw new Error("Names have already been drawn")
        if (participants.includes(account.uid)) throw new Error("You are already in this exchange")

        transaction.update(exchangeRef, {
          participants: [...participants, account.uid],
          participantNames: { ...(current.participantNames || {}), [account.uid]: displayName },
          participantResponses: {
            ...(current.participantResponses || {}),
            ...(Object.keys(joinResponses).length > 0 ? { [account.uid]: joinResponses } : {}),
          },
          updatedAt: serverTimestamp(),
        })
      })

      toast.success("Joined exchange successfully!")
      setJoinDialogOpen(null)
      setJoinResponses({})
      reload()
    } catch (error) {
      logUnexpectedError("secret-santa:join", error)
      toast.error(failureMessage(error, "join the exchange"))
    }
  }

  const handleLeaveExchange = async (exchangeId: string) => {
    if (!account) {
      setAuthDialogOpen(true)
      return
    }

    try {
      const exchangeRef = doc(db, "secretSantaExchanges", exchangeId)
      await runTransaction(db, async (transaction) => {
        const snapshot = await transaction.get(exchangeRef)
        if (!snapshot.exists()) throw new Error("Exchange no longer exists")
        const current = snapshot.data()
        const participants = Array.isArray(current.participants) ? current.participants : []
        if (current.drawn) throw new Error("Names have already been drawn")
        if (!participants.includes(account.uid)) throw new Error("You are not in this exchange")

        const responses = { ...(current.participantResponses || {}) }
        const names = { ...(current.participantNames || {}) }
        delete responses[account.uid]
        delete names[account.uid]
        transaction.update(exchangeRef, {
          participants: participants.filter((participant: string) => participant !== account.uid),
          participantResponses: responses,
          participantNames: names,
          updatedAt: serverTimestamp(),
        })
      })

      toast.success("Left exchange successfully")
      reload()
    } catch (error) {
      logUnexpectedError("secret-santa:leave", error)
      toast.error(failureMessage(error, "leave the exchange"))
    }
  }

  const handleDrawNames = async (exchangeId: string) => {
    if (!account) {
      setAuthDialogOpen(true)
      return
    }

    const exchange = exchanges.find((e) => e.id === exchangeId)
    if (!exchange) return

    if (exchange.createdBy !== account.uid) {
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
      const exchangeRef = doc(db, "secretSantaExchanges", exchangeId)
      await runTransaction(db, async (transaction) => {
        const snapshot = await transaction.get(exchangeRef)
        if (!snapshot.exists()) throw new Error("Exchange no longer exists")
        const current = snapshot.data()
        if (current.createdBy !== account.uid) throw new Error("Only the organizer can draw names")
        if (current.drawn) throw new Error("Names have already been drawn")

        const participants = Array.isArray(current.participants) ? current.participants : []
        const assignments = createSecretSantaAssignments(participants)
        Object.entries(assignments).forEach(([giverId, receiverId]) => {
          transaction.set(doc(exchangeRef, "assignments", giverId), { receiverId })
        })
        transaction.update(exchangeRef, { drawn: true, updatedAt: serverTimestamp() })
      })

      toast.success("Names drawn successfully! Participants can now view their assignments.")
      reload()
    } catch (error) {
      logUnexpectedError("secret-santa:draw", error)
      toast.error(failureMessage(error, "draw names"))
    }
  }

  const handleDeleteExchange = async (exchangeId: string) => {
    const exchange = exchanges.find((e) => e.id === exchangeId)
    if (!account || !exchange || exchange.createdBy !== account.uid) {
      toast.error("You can only delete exchanges you created")
      return
    }

    if (!confirm("Are you sure you want to delete this exchange? This cannot be undone.")) {
      return
    }

    try {
      const exchangeRef = doc(db, "secretSantaExchanges", exchangeId)
      const batch = writeBatch(db)
      exchange.participants.forEach((participantId) => {
        batch.delete(doc(exchangeRef, "assignments", participantId))
      })
      batch.delete(exchangeRef)
      await batch.commit()
      toast.success("Exchange deleted successfully")
      reload()
    } catch (error) {
      logUnexpectedError("secret-santa:delete", error)
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
    let filtered = exchanges.filter(
      (exchange) =>
        !settings.showMyExchangesOnly ||
        Boolean(uid && (exchange.createdBy === uid || exchange.participants.includes(uid)))
    )

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (exchange) =>
          exchange.name.toLowerCase().includes(query) || exchange.description.toLowerCase().includes(query)
      )
    }

    return filtered
  }, [exchanges, searchQuery, settings.showMyExchangesOnly, uid])

  const isUserInExchange = (exchange: Exchange) => Boolean(uid && exchange.participants.includes(uid))
  const canManageExchange = (exchange: Exchange) => Boolean(uid && exchange.createdBy === uid)
  const getUserAssignment = (exchange: Exchange) => (exchange.drawn && userAssignments[exchange.id]) || null

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
    const options = optionsString
      .split(",")
      .map((opt) => opt.trim())
      .filter((opt) => opt.length > 0)
    updateCustomField(fieldId, { options })
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      {/* Actions Bar */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            aria-label="Search exchanges"
            placeholder="Search exchanges..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <Dialog
          open={createDialogOpen}
          onOpenChange={(open) => {
            if (open) setFormData(emptyForm(settings.defaultBudget))
            setCreateDialogOpen(open)
          }}
        >
          <DialogTrigger asChild>
            <Button onClick={() => !account && setAuthDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Exchange
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Create New Exchange</DialogTitle>
              <DialogDescription>Set up a new Secret Santa gift exchange</DialogDescription>
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
                  <Button type="button" variant="outline" size="sm" onClick={addCustomField}>
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
                                updateCustomField(field.id, {
                                  type: value,
                                  options: value === "select" ? [] : undefined,
                                })
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
                <Button type="button" variant="outline" onClick={() => setCreateDialogOpen(false)}>
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
            {!account && <Button onClick={() => setAuthDialogOpen(true)}>Sign In to Create Exchange</Button>}
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
                    <CardDescription className="line-clamp-2">{exchange.description}</CardDescription>
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
                        {exchange.participants.length} participant
                        {exchange.participants.length !== 1 ? "s" : ""}
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
                        {exchange.customFields.length} custom field
                        {exchange.customFields.length !== 1 ? "s" : ""}
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
                        {canManageExchange(exchange) &&
                          exchange.participantResponses &&
                          Object.keys(exchange.participantResponses).length > 0 && (
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
                      <p className="mb-2 text-xs font-medium">Your Assignment:</p>
                      {isRevealed ? (
                        <div
                          className="rounded-lg border border-primary/30 bg-primary/5 p-4"
                          aria-live="polite"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex min-w-0 items-center gap-2 text-base font-semibold">
                              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground">
                                <Gift className="h-4 w-4" aria-hidden="true" />
                              </span>
                              <span className="truncate">
                                {participantNames[userAssignment] || "Loading..."}
                              </span>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-8 shrink-0 gap-1.5 px-2 text-xs text-muted-foreground"
                              onClick={() => toggleRevealAssignment(exchange.id)}
                              aria-label="Hide assignment"
                            >
                              <EyeOff className="h-3.5 w-3.5" aria-hidden="true" />
                              Hide
                            </Button>
                          </div>

                          {exchange.customFields && exchange.customFields.length > 0 && (
                            <dl className="mt-4 space-y-3 border-t border-primary/15 pt-3">
                              {exchange.customFields.map((field) => {
                                const answer =
                                  exchange.participantResponses?.[userAssignment]?.[field.id]?.trim()
                                return (
                                  <div key={field.id}>
                                    <dt className="text-xs font-medium text-muted-foreground">
                                      {field.label}
                                    </dt>
                                    <dd className="mt-0.5 break-words text-sm font-medium">
                                      {answer || "No answer provided"}
                                    </dd>
                                  </div>
                                )
                              })}
                            </dl>
                          )}
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => toggleRevealAssignment(exchange.id)}
                          className="flex min-h-12 w-full items-center justify-between rounded-lg border border-dashed border-primary/40 bg-primary/5 px-4 py-3 text-left text-sm font-medium text-primary transition-colors hover:border-primary/70 hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                          aria-label={`Reveal your assignment for ${exchange.name}`}
                        >
                          <span className="flex items-center gap-2">
                            <Gift className="h-4 w-4" aria-hidden="true" />
                            Click to reveal
                          </span>
                          <Eye className="h-4 w-4" aria-hidden="true" />
                        </button>
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
                        disabled={exchange.drawn || !account}
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
      {joinDialogOpen &&
        (() => {
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
                  {exchange.customFields &&
                    exchange.customFields.map((field) => (
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
                    <Button onClick={() => performJoin(joinDialogOpen)}>Join Exchange</Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )
        })()}

      {/* View Responses Dialog */}
      {viewResponsesOpen &&
        (() => {
          const exchange = exchanges.find((e) => e.id === viewResponsesOpen)
          if (!exchange || !exchange.participantResponses || !exchange.customFields) return null

          return (
            <Dialog open={!!viewResponsesOpen} onOpenChange={(open) => !open && setViewResponsesOpen(null)}>
              <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Participant Responses</DialogTitle>
                  <DialogDescription>View responses to custom fields from all participants</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  {exchange.participants.map((participantId) => {
                    const responses = exchange.participantResponses?.[participantId] || {}
                    return (
                      <Card key={participantId} className="p-4">
                        <div className="font-medium mb-3">{participantNames[participantId] || "Unknown"}</div>
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
