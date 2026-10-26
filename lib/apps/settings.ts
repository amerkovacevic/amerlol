import { z } from "zod"

const bool = z.boolean()
const integer = (min: number, max: number) => z.number().int().min(min).max(max)
const text = z.string().max(200)
const categories = z.object({
  traffic: bool,
  weather: bool,
  transit: bool,
  news: bool,
  crime: bool,
})

// Existing Firestore paths and local keys are deliberately retained. Reading never migrates data.
export const SETTINGS = {
  encryption: {
    collection: "encryptionSettings",
    legacyKey: "encryption-platform-settings",
    schema: z.object({
      autoConvert: bool.default(true),
      clearOnTabChange: bool.default(false),
      defaultTab: z
        .enum(["base64", "url", "hex", "binary", "ascii", "caesar", "rot13", "morse", "md5", "sha256"])
        .default("base64"),
      fontSize: integer(10, 24).default(14),
    }),
  },
  diffchecker: {
    collection: "diffCheckerSettings",
    legacyKey: "diff-checker-settings",
    schema: z.object({
      fontSize: integer(10, 24).default(14),
      showLineNumbers: bool.default(true),
      ignoreWhitespace: bool.default(false),
      ignoreCase: bool.default(false),
    }),
  },
  timezone: {
    collection: "timezoneSettings",
    legacyKey: "timezone-converter-settings",
    schema: z.object({
      timeFormat: z.enum(["12", "24"]).default("12"),
      showSeconds: bool.default(true),
      showDayNight: bool.default(true),
      autoRefresh: bool.default(true),
      defaultTimeZones: z
        .array(
          z.string().refine((value) => {
            try {
              new Intl.DateTimeFormat("en", { timeZone: value })
              return true
            } catch {
              return false
            }
          }, "Use valid IANA time zones")
        )
        .min(1)
        .max(12)
        .default(["America/New_York", "Europe/London", "Asia/Tokyo"]),
    }),
  },
  "pickup-soccer": {
    collection: "pickupSoccerSettings",
    schema: z.object({
      defaultMaxPlayers: integer(2, 100).default(10),
      defaultLocation: text.default(""),
      showMyGamesOnly: bool.default(false),
      autoJoin: bool.default(false),
    }),
  },
  "secret-santa": {
    collection: "secretSantaSettings",
    schema: z.object({
      defaultBudget: z.string().max(50).default(""),
      showMyExchangesOnly: bool.default(false),
    }),
  },
  "football-manager-team-picker": {
    collection: "footballManagerTeamPickerSettings",
    schema: z.object({
      defaultPickMode: z.enum(["single", "multiple"]).default("single"),
      defaultNumPicks: integer(2, 20).default(4),
      defaultMinTier: integer(0, 3).default(1),
      defaultSameCountry: bool.default(false),
      defaultSameLeague: bool.default(false),
      autoAddToHistory: bool.default(true),
      showFavoritesOnly: bool.default(false),
    }),
  },
  "color-palette-crafter": {
    collection: "colorPaletteCrafterSettings",
    schema: z.object({
      defaultColors: integer(2, 8).default(4),
      showColorCodes: bool.default(true),
      autoCopyOnClick: bool.default(true),
      defaultExportFormat: z.enum(["hex", "rgb", "json"]).default("hex"),
      showLikes: bool.default(true),
    }),
  },
  "amer-gauntlet": {
    collection: "amerGauntletSettings",
    schema: z.object({
      showTimer: bool.default(true),
      showHints: bool.default(true),
      animations: bool.default(true),
      autoSubmit: bool.default(false),
    }),
  },
  "stl-monitor": {
    collection: "stlMonitorSettings",
    schema: z.object({
      defaultCategories: categories.default({
        traffic: true,
        weather: true,
        transit: true,
        news: true,
        crime: false,
      }),
      defaultSeverityRange: z
        .tuple([integer(0, 100), integer(0, 100)])
        .refine(([min, max]) => min <= max, "Minimum severity must not exceed maximum")
        .default([0, 100]),
      defaultTimeWindow: z.enum(["15m", "1h", "6h", "24h"]).default("1h"),
      autoRefresh: bool.default(true),
      refreshInterval: integer(15, 300).default(30),
      mapStyle: z.enum(["dark", "light"]).default("dark"),
    }),
  },
  lmgtfy: {
    collection: "lmgtfySettings",
    schema: z.object({
      defaultAnimationSpeed: z.number().min(0.5).max(2).default(1),
      redirectDelay: integer(0, 10000).default(1500),
      showQueryInAnimation: bool.default(true),
    }),
  },
  "atlas-sprint": {
    legacyKey: "atlas-sprint-settings",
    schema: z.object({ focusOnCorrectAnswer: bool.default(true) }),
  },
  "next-watch": {
    schema: z.object({
      spinDuration: z.number().min(1).max(8).default(3.2),
      showYear: bool.default(true),
    }),
  },
  "football-deepcuts": {
    schema: z.object({
      showAnswerCount: bool.default(true),
      showQuestionMix: bool.default(true),
    }),
  },
} satisfies Record<string, { collection?: string; legacyKey?: string; schema: z.AnyZodObject }>

export type SettingsAppId = keyof typeof SETTINGS
export type AppSettings<K extends SettingsAppId> = z.infer<(typeof SETTINGS)[K]["schema"]>
export type SettingsValues = Record<string, unknown>

export function settingsDefinition(appId: SettingsAppId): {
  collection?: string
  legacyKey?: string
  schema: z.AnyZodObject
} {
  return SETTINGS[appId]
}
export function defaultSettings(appId: SettingsAppId): SettingsValues {
  return settingsDefinition(appId).schema.parse({})
}

// Recover valid fields independently from malformed legacy documents, without writing repairs.
export function readSettings(appId: SettingsAppId, raw: unknown): SettingsValues {
  const values = defaultSettings(appId)
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return values
  for (const [key, validator] of Object.entries(settingsDefinition(appId).schema.shape)) {
    const parsed = (validator as z.ZodTypeAny).safeParse((raw as SettingsValues)[key])
    if (parsed.success) values[key] = parsed.data
  }
  return values
}

export function validateSettings(appId: SettingsAppId, raw: unknown): SettingsValues {
  return settingsDefinition(appId).schema.parse(raw)
}

export function parseSettingsImport(appId: SettingsAppId, raw: unknown): SettingsValues {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new Error("Invalid settings file")
  const document = raw as SettingsValues
  let settings: unknown = document
  if ("appId" in document || "version" in document || "settings" in document) {
    if (document.appId !== appId || document.version !== 1)
      throw new Error("Choose a settings export for this app")
    settings = document.settings
  }
  if (
    !settings ||
    typeof settings !== "object" ||
    Array.isArray(settings) ||
    !Object.keys(settings).some((key) => Object.hasOwn(settingsDefinition(appId).schema.shape, key))
  )
    throw new Error("No preferences for this app were found")
  return validateSettings(appId, settings)
}

export function settingsStorageKey(appId: SettingsAppId, uid?: string): string {
  return `amerlol:settings:${appId}:${uid ?? "guest"}`
}

export const SETTING_LABELS: Record<string, string> = {
  autoConvert: "Convert as you type",
  clearOnTabChange: "Clear input when switching tools",
  defaultTab: "Default tool",
  fontSize: "Text size (px)",
  showLineNumbers: "Show line numbers",
  ignoreWhitespace: "Ignore leading and trailing whitespace",
  ignoreCase: "Ignore letter case",
  timeFormat: "Time format",
  showSeconds: "Show seconds",
  showDayNight: "Show day/night indicator",
  autoRefresh: "Refresh automatically",
  defaultTimeZones: "Default time zones (comma-separated IANA names)",
  defaultMaxPlayers: "Default player limit",
  defaultLocation: "Default game location",
  showMyGamesOnly: "Show only games I created or joined",
  autoJoin: "Join games I create",
  defaultBudget: "Default gift budget",
  showMyExchangesOnly: "Show only exchanges I created or joined",
  defaultPickMode: "Default picking mode",
  defaultNumPicks: "Default number of picks",
  defaultMinTier: "Default tier filter",
  defaultSameCountry: "Pick from the same country",
  defaultSameLeague: "Pick from the same league",
  autoAddToHistory: "Save picks to history",
  showFavoritesOnly: "Pick from favorites only",
  defaultColors: "Colors in new palettes",
  showColorCodes: "Show color codes",
  autoCopyOnClick: "Copy a color when clicked",
  defaultExportFormat: "Palette export format",
  showLikes: "Show like counts",
  showTimer: "Show elapsed time",
  showHints: "Enable hints",
  animations: "Animate guess results",
  autoSubmit: "Submit a complete guess with Enter",
  defaultCategories: "Default incident categories",
  defaultSeverityRange: "Default severity range (minimum, maximum)",
  defaultTimeWindow: "Default incident time window",
  refreshInterval: "Refresh interval (seconds)",
  mapStyle: "Map appearance",
  defaultAnimationSpeed: "Animation speed",
  redirectDelay: "Delay before search (milliseconds)",
  showQueryInAnimation: "Show query during animation",
  focusOnCorrectAnswer: "Focus map on correct answers",
  spinDuration: "Wheel duration (seconds)",
  showYear: "Show movie release years",
  showAnswerCount: "Show sourced answer counts",
  showQuestionMix: "Show question mix guide",
}
