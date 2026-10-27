"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { LogIn, Menu, UserRound } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/components/auth/auth-provider"
import { AuthDialog } from "@/components/auth/auth-dialog"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { NAV_ITEMS } from "./nav-items"

export function MobileNavDrawer() {
  const [open, setOpen] = React.useState(false)
  const [authOpen, setAuthOpen] = React.useState(false)
  const pathname = usePathname()
  const { account, loading } = useAuth()
  const hasAccount = Boolean(account)

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden h-9 w-9"
        onClick={() => setOpen(true)}
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[300px]">
          <DialogHeader>
            <DialogTitle>Navigation</DialogTitle>
          </DialogHeader>
          <nav className="flex flex-col space-y-4 mt-4">
            {NAV_ITEMS.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "flex min-h-11 items-center rounded-md px-3 text-base font-medium transition-colors",
                    isActive
                      ? "bg-accent text-primary"
                      : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"
                  )}
                >
                  {item.label}
                </Link>
              )
            })}
            {!loading && (
              <div className="border-t pt-4">
                {hasAccount ? (
                  <Link
                    href="/account"
                    onClick={() => setOpen(false)}
                    aria-current={pathname === "/account" ? "page" : undefined}
                    className={cn(
                      "flex min-h-11 items-center gap-3 rounded-md px-3 text-base font-medium transition-colors",
                      pathname === "/account"
                        ? "bg-accent text-primary"
                        : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"
                    )}
                  >
                    <UserRound className="h-5 w-5" aria-hidden="true" />
                    Account
                  </Link>
                ) : (
                  <button
                    type="button"
                    className="flex min-h-11 w-full items-center gap-3 rounded-md px-3 text-left text-base font-medium text-muted-foreground transition-colors hover:bg-accent/60 hover:text-foreground"
                    onClick={() => {
                      setOpen(false)
                      setAuthOpen(true)
                    }}
                  >
                    <LogIn className="h-5 w-5" aria-hidden="true" />
                    Sign in or create account
                  </button>
                )}
              </div>
            )}
          </nav>
        </DialogContent>
      </Dialog>
      <AuthDialog open={authOpen} onOpenChange={setAuthOpen} />
    </>
  )
}
