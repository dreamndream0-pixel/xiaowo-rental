export function buildLineContactUrl(target, message = '') {
  const value = String(target || '').trim()
  if (!value) return null

  if (/^https?:\/\//i.test(value)) return value

  const id = value.startsWith('@') ? value : `@${value}`
  if (message) {
    return `https://line.me/R/oaMessage/${encodeURIComponent(id)}/?${encodeURIComponent(message)}`
  }
  return `https://line.me/R/ti/p/${encodeURIComponent(id)}`
}
