export interface AlbumPreset {
  id: string
  label: string
  stickerCount: number
  /** Short note shown in the UI (e.g. estimated counts) */
  note?: string
}

/** Common Panini FIFA World Cup album sizes — use Custom if yours differs. */
export const ALBUM_PRESETS: AlbumPreset[] = [
  {
    id: "qatar-2022",
    label: "FIFA World Cup Qatar 2022™",
    stickerCount: 670,
    note: "Main collection (670)",
  },
  {
    id: "usa-2026",
    label: "FIFA World Cup 2026™ (North America)",
    stickerCount: 680,
    note: "Estimated; adjust with Custom if your album differs",
  },
  {
    id: "custom",
    label: "Custom album",
    stickerCount: 670,
    note: "Set the sticker count below",
  },
]

export function getPresetById(id: string): AlbumPreset | undefined {
  return ALBUM_PRESETS.find((p) => p.id === id)
}

export function clampStickerCount(n: number, min = 1, max = 900): number {
  return Math.min(max, Math.max(min, Math.floor(n)))
}
