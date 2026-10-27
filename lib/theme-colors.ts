export const THEME_COLORS = [
  { id: "teal", label: "Teal", hex: "#01655C", hue: 175 },
  { id: "ocean", label: "Ocean", hex: "#0369A1", hue: 201 },
  { id: "violet", label: "Violet", hex: "#6D28D9", hue: 263 },
  { id: "rose", label: "Rose", hex: "#BE123C", hue: 347 },
  { id: "amber", label: "Amber", hex: "#A16207", hue: 32 },
] as const

export type ThemeColor = (typeof THEME_COLORS)[number]["id"]

export const DEFAULT_THEME_COLOR: ThemeColor = "teal"
export const THEME_COLOR_STORAGE_KEY = "amerlol:theme-color"

export function isThemeColor(value: unknown): value is ThemeColor {
  return THEME_COLORS.some((color) => color.id === value)
}

/**
 * Inline <head> script that applies the stored accent before first paint, so
 * pages don't flash the default colour while React hydrates.
 */
export const ACCENT_BOOTSTRAP_SCRIPT = `try{var c=localStorage.getItem(${JSON.stringify(THEME_COLOR_STORAGE_KEY)});if(${JSON.stringify(
  THEME_COLORS.map((color) => color.id)
)}.indexOf(c)>-1)document.documentElement.dataset.accent=c}catch(e){}`
