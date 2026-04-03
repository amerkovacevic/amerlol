import { getPresetById, clampStickerCount, type AlbumPreset } from "./album-presets"
import { filterToAlbum } from "./format-sticker-list"

export type ShareCardTheme = "light" | "dark"

export interface StickrPersistedState {
  albumPresetId: string
  customStickerCount: number
  displayName: string
  shareCardTheme: ShareCardTheme
  duplicates: number[]
  needs: number[]
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
    duplicates: Array.isArray(raw?.duplicates)
      ? raw.duplicates.map(Number).filter((n) => Number.isFinite(n))
      : [],
    needs: Array.isArray(raw?.needs) ? raw.needs.map(Number).filter((n) => Number.isFinite(n)) : [],
  }

  const max = resolveStickerCount(base)
  return {
    ...base,
    duplicates: filterToAlbum(base.duplicates, max),
    needs: filterToAlbum(base.needs, max),
  }
}
