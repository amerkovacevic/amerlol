export const USERNAME_MIN_LENGTH = 3
export const USERNAME_MAX_LENGTH = 24

export function normalizeUsernameInput(value: string): string {
  return value
    .replace(/^@+/, "")
    .replace(/[^a-zA-Z0-9_]/g, "")
    .slice(0, USERNAME_MAX_LENGTH)
}

export function getUsernameError(value: string): string | null {
  if (value.length < USERNAME_MIN_LENGTH) {
    return `Use at least ${USERNAME_MIN_LENGTH} characters`
  }
  if (value.length > USERNAME_MAX_LENGTH) {
    return `Use no more than ${USERNAME_MAX_LENGTH} characters`
  }
  if (!/^[a-zA-Z0-9_]+$/.test(value)) {
    return "Use only letters, numbers, and underscores"
  }
  return null
}
