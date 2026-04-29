import { getPresetById, clampStickerCount, type AlbumPreset } from "./album-presets"
import { filterNumericToAlbum } from "./format-sticker-list"
import {
  findTeamByCode,
  parseUsa2026StickerId,
  USA_2026_FWC_SPECIAL_COUNT,
  USA_2026_TEAM_STICKERS_PER_TEAM,
} from "./usa-2026-schema"
import {
  findQatar2022TeamByCode,
  parseQatar2022StickerId,
  QATAR_2022_FWC_SPECIAL_COUNT,
  QATAR_2022_TEAM_STICKERS_PER_TEAM,
} from "./qatar-2022-schema"

export type ShareCardTheme = "light" | "dark"

export interface StickrPersistedState {
  albumPresetId: string
  customStickerCount: number
  displayName: string
  shareCardTheme: ShareCardTheme
  duplicates: string[]
  needs: string[]
}

export const STICKR_STORAGE_KEY = "stickr-v1"

export const DEFAULT_STICKR_STATE: StickrPersistedState = {
  albumPresetId: "qatar-2022",
  customStickerCount: 670,
  displayName: "",
  shareCardTheme: "dark",
  duplicates: [],
  needs: [],
}

export function resolveStickerCount(state: StickrPersistedState): number {
  const preset = getPresetById(state.albumPresetId)
  if (state.albumPresetId === "custom") {
    return clampStickerCount(state.customStickerCount)
  }
  return preset?.stickerCount ?? clampStickerCount(state.customStickerCount)
}

function normalizeIdList(raw: unknown): string[] {
  if (!Array.isArray(raw)) return []
  return raw
    .map((v) => {
      if (typeof v === "number" && Number.isFinite(v)) return String(Math.floor(v))
      if (typeof v === "string") return v.trim()
      return ""
    })
    .filter(Boolean)
}

function filterUsa2026(ids: string[]): string[] {
  const out: string[] = []
  for (const id of ids) {
    const parsed = parseUsa2026StickerId(id)
    if (!parsed) continue
    if (parsed.kind === "fwc") {
      if (parsed.n >= 1 && parsed.n <= USA_2026_FWC_SPECIAL_COUNT) out.push(`FWC-${parsed.n}`)
      continue
    }
    if (parsed.kind === "team") {
      if (!findTeamByCode(parsed.code)) continue
      if (parsed.n >= 1 && parsed.n <= USA_2026_TEAM_STICKERS_PER_TEAM) out.push(`${parsed.code}-${parsed.n}`)
    }
  }
  return [...new Set(out)].sort((a, b) => a.localeCompare(b))
}

function filterQatar2022(ids: string[]): string[] {
  const out: string[] = []
  for (const id of ids) {
    const parsed = parseQatar2022StickerId(id)
    if (!parsed) continue
    if (parsed.kind === "fwc") {
      if (parsed.n >= 1 && parsed.n <= QATAR_2022_FWC_SPECIAL_COUNT) out.push(`FWC-${parsed.n}`)
      continue
    }
    if (parsed.kind === "team") {
      if (!findQatar2022TeamByCode(parsed.code)) continue
      if (parsed.n >= 1 && parsed.n <= QATAR_2022_TEAM_STICKERS_PER_TEAM) out.push(`${parsed.code}-${parsed.n}`)
    }
  }
  return [...new Set(out)].sort((a, b) => a.localeCompare(b))
}

export function normalizeState(
  raw: Partial<StickrPersistedState> | undefined,
  presetFallback: AlbumPreset | undefined
): StickrPersistedState {
  const albumPresetId =
    typeof raw?.albumPresetId === "string" && getPresetById(raw.albumPresetId)
      ? raw.albumPresetId
      : DEFAULT_STICKR_STATE.albumPresetId

  const customStickerCount = clampStickerCount(
    typeof raw?.customStickerCount === "number"
      ? raw.customStickerCount
      : presetFallback?.stickerCount ?? DEFAULT_STICKR_STATE.customStickerCount
  )

  const base: StickrPersistedState = {
    ...DEFAULT_STICKR_STATE,
    albumPresetId,
    customStickerCount,
    displayName:
      typeof raw?.displayName === "string" ? raw.displayName.slice(0, 80) : "",
    shareCardTheme:
      raw?.shareCardTheme === "light" || raw?.shareCardTheme === "dark"
        ? raw.shareCardTheme
        : DEFAULT_STICKR_STATE.shareCardTheme,
    duplicates: normalizeIdList(raw?.duplicates),
    needs: normalizeIdList(raw?.needs),
  }

  const max = resolveStickerCount(base)
  const filtered =
    base.albumPresetId === "usa-2026"
      ? {
          duplicates: filterUsa2026(base.duplicates),
          needs: filterUsa2026(base.needs),
        }
      : base.albumPresetId === "qatar-2022"
        ? {
            duplicates: filterQatar2022(base.duplicates),
            needs: filterQatar2022(base.needs),
          }
      : {
          duplicates: filterNumericToAlbum(base.duplicates, max),
          needs: filterNumericToAlbum(base.needs, max),
        }

  // Ensure no overlap between lists (prefer "needs" if both exist).
  const needSet = new Set(filtered.needs)
  const dedupDuplicates = filtered.duplicates.filter((id) => !needSet.has(id))

  return {
    ...base,
    duplicates: dedupDuplicates,
    needs: filtered.needs,
  }
}
