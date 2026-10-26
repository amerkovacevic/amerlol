import { toast } from "sonner"

/**
 * Copies text and reports the outcome. Clipboard access can be denied (insecure
 * origin, missing permission, unfocused document), so failures are surfaced
 * instead of silently claiming success.
 */
export async function copyText(text: string, successMessage = "Copied to clipboard"): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    toast.success(successMessage)
    return true
  } catch {
    toast.error("Copy failed. Select the text and copy it manually.")
    return false
  }
}

/** Saves a Blob through a temporary link. */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  link.click()
  // Revoking synchronously can cancel the download in some browsers.
  setTimeout(() => URL.revokeObjectURL(url), 0)
}

export function downloadText(text: string, filename: string, type = "text/plain"): void {
  downloadBlob(new Blob([text], { type }), filename)
}
