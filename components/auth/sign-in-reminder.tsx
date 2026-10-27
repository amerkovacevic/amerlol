"use client"

import * as React from "react"
import { useAuth } from "./auth-provider"
import { AuthDialog } from "./auth-dialog"
import { Button } from "@/components/ui/button"

export function SignInReminder() {
  const { user, loading } = useAuth()
  const [open, setOpen] = React.useState(false)
  if (loading || (user && !user.isAnonymous)) return null

  return (
    <aside
      aria-label="Account benefits"
      className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border bg-muted/40 px-4 py-3 text-sm"
    >
      <p className="text-muted-foreground">
        Better with an account: sign in to sync app settings across devices.
      </p>
      <Button variant="link" className="h-auto whitespace-normal p-0 text-sm" onClick={() => setOpen(true)}>
        Sign in
      </Button>
      <AuthDialog open={open} onOpenChange={setOpen} />
    </aside>
  )
}
