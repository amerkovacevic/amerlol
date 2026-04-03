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
    id: "usa-2026",
    label: "FIFA World Cup 2026™ (North America)",
    stickerCount: 980,
    note: "Main collection (980)",
  },
  {
    id: "qatar-2022",
    label: "FIFA World Cup Qatar 2022™",
    stickerCount: 670,
    note: "Main collection (670)",
  },
  {
    id: "russia-2018",
    label: "FIFA World Cup Russia 2018™",
    stickerCount: 681 ,
    note: "Main collection (681)",
  },
  {
    id: "brazil-2014",
    label: "FIFA World Cup Brazil 2014™",
    stickerCount: 640 ,
    note: "Main collection (640)",
  },
  {
    id: "south-africa-2010",
    label: "FIFA World Cup South Africa 2010™",
    stickerCount: 640 ,
    note: "Main collection (640)",
  },
  {
    id: "germany-2006",
    label: "FIFA World Cup Germany 2006™",
    stickerCount: 605 ,
    note: "Main collection (605)",
  },
  {
    id: "korea-japan-2002",
    label: "FIFA World Cup Korea/Japan 2002™",
    stickerCount: 581 ,
    note: "Main collection (581)",
  },
  {
    id: "france-1998",
    label: "FIFA World Cup France 1998™",
    stickerCount: 561 ,
    note: "Main collection (561)",
  },
  {
    id: "usa-1994",
    label: "FIFA World Cup USA 1994™",
    stickerCount: 444 ,
    note: "Main collection (444)",
  },
  {
    id: "italy-1990",
    label: "FIFA World Cup Italy 1990™",
    stickerCount: 448 ,
    note: "Main collection (448)",
  },{
    id: "mexico-1986",
    label: "FIFA World Cup Mexico 1986™",
    stickerCount: 427 ,
    note: "Main collection (427)",
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
