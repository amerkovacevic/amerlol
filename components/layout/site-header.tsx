"use client"

import * as React from "react"
import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { AccountMenu } from "./account-menu"
import { MobileNavDrawer } from "./mobile-nav-drawer"
import { NAV_ITEMS } from "./nav-items"
import { ThemeToggle } from "./theme-toggle"

export function SiteHeader() {
  const pathname = usePathname()
  const [isScrolled, setIsScrolled] = React.useState(false)

  React.useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20)
    handleScroll()
    window.addEventListener("scroll", handleScroll, { passive: true })
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  return (
    <header
      className={cn(
        "sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur transition-shadow supports-[backdrop-filter]:bg-background/60",
        isScrolled && "shadow-sm"
      )}
    >
      <a
        href="#main"
        className="sr-only rounded-md bg-background px-3 py-2 focus:not-sr-only focus:absolute focus:left-4 focus:top-3"
      >
        Skip to content
      </a>
      <div className="container flex h-16 items-center justify-between">
        <Link href="/" className="flex items-center space-x-2 transition-opacity hover:opacity-80">
          <Image
            src="/logo-64.webp"
            alt=""
            width={32}
            height={32}
            className="h-8 w-8 object-contain"
            priority
          />
          <span className="font-space-grotesk text-xl font-bold">amer.lol</span>
        </Link>

        <nav aria-label="Main" className="hidden items-center space-x-6 md:flex">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "text-sm font-medium transition-colors hover:text-primary",
                  isActive ? "text-primary" : "text-muted-foreground"
                )}
              >
                {item.label}
              </Link>
            )
          })}
        </nav>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <div className="hidden md:block">
            <AccountMenu />
          </div>
          <MobileNavDrawer />
        </div>
      </div>
    </header>
  )
}
