/**
 * Phrase contained in every error caused by missing local network access
 * (Android 17 ACCESS_LOCAL_NETWORK, iOS Local Network privacy).
 */
export const LOCAL_NETWORK_PERMISSION_DENIED = 'local network permission denied'

/**
 * True when `error` (an Error, or a message passed to an `onError` callback)
 * means local network access is denied: Android 17's ACCESS_LOCAL_NETWORK
 * permission is missing, or iOS Local Network privacy is off for the app.
 */
export function isLocalNetworkPermissionError(error: unknown): boolean {
  const message =
    typeof error === 'string'
      ? error
      : error instanceof Error
        ? error.message
        : typeof error === 'object' && error !== null && 'message' in error
          ? String((error as { message: unknown }).message)
          : ''
  return message.toLowerCase().includes(LOCAL_NETWORK_PERMISSION_DENIED)
}
