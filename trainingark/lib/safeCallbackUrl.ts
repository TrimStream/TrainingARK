// Only ever redirect to same-origin paths. Blocks `//evil.com` and absolute
// URLs smuggled in through ?callbackUrl=.
export function safeCallbackUrl(raw: string | null | undefined, fallback = '/'): string {
  if (!raw) return fallback
  if (!raw.startsWith('/') || raw.startsWith('//')) return fallback
  return raw
}
