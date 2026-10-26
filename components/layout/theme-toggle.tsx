"use client"

import * as React from "react"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"
import { useHydrated } from "@/lib/hooks/use-hydrated"

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()
  // The resolved theme is only known in the browser.
  const hydrated = useHydrated()

  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-9 w-9"
      disabled={!hydrated}
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
    >
      <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
      <span className="sr-only">Toggle theme</span>
    </Button>
  )
}
