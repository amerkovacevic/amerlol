"use client"

import * as React from "react"
import { AtSign, Loader2 } from "lucide-react"
import { useAuth } from "@/components/auth/auth-provider"
import { saveProfile, useProfile } from "@/components/auth/profile-provider"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { getUsernameError, normalizeUsernameInput, USERNAME_MAX_LENGTH } from "@/lib/account/username"

function suggestedUsername(displayName?: string | null, email?: string | null) {
  const source = displayName || email?.split("@")[0] || ""
  return normalizeUsernameInput(source.replace(/\s+/g, "_"))
}

export function UsernameOnboarding() {
  const { account: user } = useAuth()
  const profile = useProfile()
  // null until the person types, so the suggestion tracks the account until then.
  const [draft, setDraft] = React.useState<string | null>(null)
  const [error, setError] = React.useState("")
  const [saving, setSaving] = React.useState(false)
  const [savedFor, setSavedFor] = React.useState<string | null>(null)

  const username = draft ?? suggestedUsername(user?.displayName, user?.email)
  const open = Boolean(
    user &&
      savedFor !== user.uid &&
      (profile.status === "ready" || profile.status === "error") &&
      !profile.username
  )

  const saveUsername = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!user) return

    const next = normalizeUsernameInput(username)
    const validationError = getUsernameError(next)
    if (validationError) {
      setError(validationError)
      return
    }

    setSaving(true)
    setError("")
    try {
      await saveProfile(user.uid, {
        username: next,
        email: user.email || "",
        ...(user.displayName ? { displayName: user.displayName } : {}),
      })
      setSavedFor(user.uid)
    } catch {
      setError("We couldn't save your username. Please try again.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent
        showCloseButton={false}
        className="sm:max-w-md"
        onEscapeKeyDown={(event) => event.preventDefault()}
        onPointerDownOutside={(event) => event.preventDefault()}
      >
        <DialogHeader>
          <div className="mb-2 grid h-11 w-11 place-items-center rounded-full bg-primary/10 text-primary">
            <AtSign className="h-5 w-5" aria-hidden="true" />
          </div>
          <DialogTitle>Choose your @username</DialogTitle>
          <DialogDescription>
            This is how you’ll appear across amer.lol. You can change it later in Account Settings.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={saveUsername} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="first-username">Username</Label>
            <div className="relative">
              <AtSign
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <Input
                id="first-username"
                value={username}
                onChange={(event) => {
                  setDraft(normalizeUsernameInput(event.target.value))
                  setError("")
                }}
                className="pl-9"
                placeholder="your_name"
                autoComplete="username"
                maxLength={USERNAME_MAX_LENGTH}
                autoFocus
                aria-invalid={Boolean(error)}
                aria-describedby="first-username-help first-username-error"
                disabled={saving}
              />
            </div>
            <p id="first-username-help" className="text-xs text-muted-foreground">
              3–24 characters. Letters, numbers, and underscores only.
            </p>
            {error && (
              <p id="first-username-error" role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}
          </div>
          <Button type="submit" className="w-full" disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving username…
              </>
            ) : (
              "Continue"
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
