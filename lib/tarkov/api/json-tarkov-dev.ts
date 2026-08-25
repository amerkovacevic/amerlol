import { parseTarkovEnvelope, type TarkovJsonEnvelope } from "@/lib/tarkov/schemas/common"
import { toUpstreamGameMode, type TarkovGameMode } from "@/lib/tarkov/types"

const TARKOV_JSON_BASE_URL = "https://json.tarkov.dev"
const DEFAULT_TIMEOUT_MS = 12_000
const DEFAULT_RETRIES = 2

export type TarkovDataset =
  | "tasks"
  | "items"
  | "maps"
  | "traders"
  | "hideout"
  | "crafts"
  | "barters"

export interface FetchDatasetOptions {
  mode: TarkovGameMode
  dataset: TarkovDataset
  signal?: AbortSignal
  timeoutMs?: number
  retries?: number
}

function buildDatasetUrl(mode: TarkovGameMode, dataset: TarkovDataset): string {
  return `${TARKOV_JSON_BASE_URL}/${toUpstreamGameMode(mode)}/${dataset}`
}

function combineSignals(signals: Array<AbortSignal | undefined>): AbortSignal {
  const controller = new AbortController()

  const abort = () => controller.abort()
  for (const signal of signals) {
    if (!signal) continue
    if (signal.aborted) {
      controller.abort()
      break
    }
    signal.addEventListener("abort", abort, { once: true })
  }

  return controller.signal
}

async function fetchOnce(url: string, signal: AbortSignal | undefined, timeoutMs: number): Promise<TarkovJsonEnvelope> {
  const timeoutController = new AbortController()
  const timeout = setTimeout(() => timeoutController.abort(), timeoutMs)

  try {
    const response = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: combineSignals([signal, timeoutController.signal]),
    })

    if (!response.ok) {
      throw new Error(`Tarkov data request failed with HTTP ${response.status}`)
    }

    return parseTarkovEnvelope(await response.json())
  } finally {
    clearTimeout(timeout)
  }
}

export async function fetchTarkovDataset({
  mode,
  dataset,
  signal,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  retries = DEFAULT_RETRIES,
}: FetchDatasetOptions): Promise<TarkovJsonEnvelope> {
  const url = buildDatasetUrl(mode, dataset)
  let lastError: unknown

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      return await fetchOnce(url, signal, timeoutMs)
    } catch (error) {
      lastError = error

      if (signal?.aborted || attempt === retries) {
        break
      }

      await new Promise((resolve) => setTimeout(resolve, 250 * 2 ** attempt))
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("Unable to load Tarkov game data")
}
