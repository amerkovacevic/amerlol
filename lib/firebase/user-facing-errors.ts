type ErrorWithDetails = {
  code?: unknown
  message?: unknown
}

export function getErrorCode(error: unknown): string {
  if (!error || typeof error !== "object") return ""
  const code = (error as ErrorWithDetails).code
  return typeof code === "string" ? code : ""
}

export function logUnexpectedError(context: string, error: unknown) {
  if (process.env.NODE_ENV !== "production") {
    const details = error as ErrorWithDetails
    console.error(`[${context}]`, {
      code: getErrorCode(error) || "unknown",
      message: typeof details?.message === "string" ? details.message : "Unknown error",
    })
  }
}

export function getAuthErrorMessage(error: unknown): string {
  switch (getErrorCode(error)) {
    case "auth/invalid-credential":
    case "auth/user-not-found":
    case "auth/wrong-password":
      return "The email or password is incorrect. Please try again."
    case "auth/email-already-in-use":
      return "An account already exists for this email. Try signing in instead."
    case "auth/invalid-email":
      return "Enter a valid email address."
    case "auth/weak-password":
      return "Choose a stronger password with at least 6 characters."
    case "auth/popup-closed-by-user":
      return "Google sign-in was closed before it finished."
    case "auth/popup-blocked":
      return "Your browser blocked the sign-in window. Allow pop-ups and try again."
    case "auth/network-request-failed":
      return "We could not connect. Check your internet connection and try again."
    case "auth/too-many-requests":
      return "Too many attempts. Wait a few minutes, then try again."
    default:
      return "We could not sign you in right now. Please try again."
  }
}

export function getDataErrorMessage(error: unknown, action: string): string {
  switch (getErrorCode(error)) {
    case "permission-denied":
      return "Your session may have expired. Sign in again and retry."
    case "unavailable":
    case "deadline-exceeded":
      return "The service is temporarily unavailable. Please try again shortly."
    case "not-found":
      return "This no longer exists. Refresh the page to see the latest version."
    case "already-exists":
    case "aborted":
      return "Someone else updated this at the same time. Refresh and try again."
    default:
      return `We could not ${action}. Please try again.`
  }
}
