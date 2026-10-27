"use client"

import * as React from "react"
import Link from "next/link"
import { LogOut, Settings, UserRound } from "lucide-react"
import { toast } from "sonner"
import { AuthDialog } from "@/components/auth/auth-dialog"
import { useAuth } from "@/components/auth/auth-provider"
import { useProfile } from "@/components/auth/profile-provider"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

/** Desktop header account control: sign in, or the account's menu. */
export function AccountMenu() {
  const { account, loading, signOut } = useAuth()
  const { username } = useProfile()
  const [authOpen, setAuthOpen] = React.useState(false)

  // Reserve the space while auth restores so the header doesn't shift.
  if (loading) return <div className="h-9 w-20" aria-hidden="true" />

  if (!account) {
    return (
      <>
        <Button size="sm" onClick={() => setAuthOpen(true)}>
          Sign in
        </Button>
        <AuthDialog open={authOpen} onOpenChange={setAuthOpen} />
      </>
    )
  }

  const name = username ? `@${username}` : account.displayName || account.email || "Account"

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="max-w-[200px] gap-2">
          <UserRound className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span className="truncate">{name}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="truncate font-normal text-muted-foreground">
          {account.email || name}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/account">
            <Settings className="mr-2 h-4 w-4" aria-hidden="true" />
            Account settings
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={() => signOut().catch(() => toast.error("We could not sign you out. Please try again."))}
        >
          <LogOut className="mr-2 h-4 w-4" aria-hidden="true" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
