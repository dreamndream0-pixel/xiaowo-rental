'use client'

export default function ListingsBackButton() {
  return (
    <button
      type="button"
      className="map-back-button"
      aria-label="返回首頁"
      onClick={() => window.location.assign('/')}
    >
      ‹
    </button>
  )
}
