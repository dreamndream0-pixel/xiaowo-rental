'use client'

export default function PropertyBackButton() {
  const goBack = () => {
    if (window.history.length > 1) {
      window.history.back()
      return
    }
    window.location.assign('/listings')
  }

  return (
    <button type="button" className="property-back-button" onClick={goBack} aria-label="返回上一頁">
      ←
    </button>
  )
}
