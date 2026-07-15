export function buildLineContactUrl(target, message = '') {
  const value = String(target || '').trim()
  if (!value) return null

  if (/^line:\/\//i.test(value)) return value

  const appUrl = lineAppUrlFromWebUrl(value, message)
  if (appUrl) return appUrl

  if (/^https?:\/\//i.test(value)) return value

  const id = value.startsWith('@') ? value : `@${value}`
  if (message) {
    return `line://oaMessage/${encodeURIComponent(id)}/?${encodeURIComponent(message)}`
  }
  return `line://ti/p/${encodeURIComponent(id)}`
}

function lineAppUrlFromWebUrl(value, message = '') {
  try {
    const url = new URL(value)
    const host = url.hostname.toLowerCase()
    if (host !== 'line.me' && host !== 'www.line.me') return null

    const parts = url.pathname.split('/').filter(Boolean)
    const tiIndex = parts.indexOf('ti')
    if (tiIndex !== -1 && parts[tiIndex + 1] === 'p' && parts[tiIndex + 2]) {
      return `line://ti/p/${encodeURIComponent(decodeURIComponent(parts[tiIndex + 2]))}`
    }

    const oaIndex = parts.indexOf('oaMessage')
    if (oaIndex !== -1 && parts[oaIndex + 1]) {
      const id = decodeURIComponent(parts[oaIndex + 1])
      const text = message || decodeURIComponent((url.search || '').replace(/^\?/, ''))
      return text
        ? `line://oaMessage/${encodeURIComponent(id)}/?${encodeURIComponent(text)}`
        : `line://oaMessage/${encodeURIComponent(id)}`
    }
  } catch (_) {}
  return null
}
