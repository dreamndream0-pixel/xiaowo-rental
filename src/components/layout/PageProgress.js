'use client'
import { usePathname, useSearchParams } from 'next/navigation'
import { useEffect, useState, Suspense } from 'react'

function ProgressInner() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [visible, setVisible] = useState(false)
  const [width, setWidth] = useState(0)

  useEffect(() => {
    setVisible(true)
    setWidth(0)
    const t1 = setTimeout(() => setWidth(70), 50)
    const t2 = setTimeout(() => { setWidth(100) }, 400)
    const t3 = setTimeout(() => setVisible(false), 700)
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3) }
  }, [pathname, searchParams])

  if (!visible) return null
  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, zIndex: 99999,
      height: 3, background: 'var(--sage)',
      width: `${width}%`,
      transition: width === 0 ? 'none' : 'width 0.4s ease',
      boxShadow: '0 0 8px var(--sage)',
    }} />
  )
}

export default function PageProgress() {
  return (
    <Suspense fallback={null}>
      <ProgressInner />
    </Suspense>
  )
}
