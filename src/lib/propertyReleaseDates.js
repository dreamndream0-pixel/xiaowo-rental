export async function attachAvailableFrom(db, properties = []) {
  const ids = properties.map(p => p.id).filter(Boolean)
  if (!ids.length) return properties

  try {
    const placeholders = ids.map((_, i) => `$${i + 1}`).join(',')
    const rows = await db.$queryRawUnsafe(
      `SELECT id, "availableFrom" FROM properties WHERE id IN (${placeholders})`,
      ...ids
    )
    const releaseMap = {}
    rows.forEach(row => {
      releaseMap[row.id] = row.availableFrom ? new Date(row.availableFrom).toISOString() : null
    })
    return properties.map(p => ({ ...p, availableFrom: releaseMap[p.id] || null }))
  } catch (_) {
    return properties
  }
}
