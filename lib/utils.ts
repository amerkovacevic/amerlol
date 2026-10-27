import type { CSSProperties } from "react"
import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Staggers the CSS `.animate-enter` animation defined in app/globals.css. */
export function enterDelay(ms: number): CSSProperties {
  return { "--enter-delay": `${ms}ms` } as CSSProperties
}
