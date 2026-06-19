'use client'
export default function PropertyError({ error }) {
  return (
    <div style={{ padding: 40, fontFamily: 'monospace', whiteSpace: 'pre-wrap', background: '#fff5f5', minHeight: '100vh' }}>
      <h2 style={{ color: 'red' }}>房源頁錯誤（暫時顯示用）</h2>
      <p><b>Message:</b> {error?.message}</p>
      <p><b>Digest:</b> {error?.digest}</p>
      <pre style={{ fontSize: 12, color: '#333', overflow: 'auto' }}>{error?.stack}</pre>
    </div>
  )
}
