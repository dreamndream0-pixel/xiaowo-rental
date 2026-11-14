'use client'
// src/components/layout/PullToRefresh.js
// iPhone 主畫面 App（standalone）模式的下拉重新整理；一般瀏覽器不啟用。
import { useEffect, useState } from 'react'

const START_THRESHOLD = 6
const TRIGGER = 70
const MAX_PULL = 110

function isStandalone() {
  return (
    window.navigator.standalone === true ||
    (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches)
  )
}

function shouldBlock(target) {
  if (window.scrollY > 0) return true
  if (!(target instanceof Element)) return true
  if (target.closest('input, textarea, select, [contenteditable]')) return true
  if (target.closest('.leaflet-container') || target.closest('canvas')) return true

  for (let el = target; el && el !== document.documentElement; el = el.parentElement) {
    const style = window.getComputedStyle(el)
    if (style.position === 'fixed' || style.position === 'sticky') return true
    if (el.scrollTop > 0) return true
  }

  const htmlOverflow = window.getComputedStyle(document.documentElement).overflow
  const bodyOverflow = window.getComputedStyle(document.body).overflow
  if (htmlOverflow === 'hidden' || bodyOverflow === 'hidden') return true
  return false
}

export default function PullToRefresh() {
  const [enabled, setEnabled] = useState(false)
  const [pull, setPull] = useState(0)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    if (isStandalone()) setEnabled(true)
  }, [])

  useEffect(() => {
    if (!enabled) return undefined

    let startY = 0
    let tracking = false
    let pulling = false
    let distance = 0

    const reset = () => {
      tracking = false
      pulling = false
      distance = 0
      setPull(0)
    }

    const onStart = (e) => {
      tracking = false
      pulling = false
      distance = 0
      if (e.touches.length !== 1) return
      if (shouldBlock(e.target)) return
      startY = e.touches[0].clientY
      tracking = true
    }

    const onMove = (e) => {
      if (!tracking) return
      if (e.touches.length !== 1) {
        reset()
        return
      }
      const dy = e.touches[0].clientY - startY
      if (dy <= 0) {
        if (pulling || dy < -START_THRESHOLD) reset()
        return
      }
      if (!pulling) {
        if (dy <= START_THRESHOLD) return
        pulling = true
      }
      if (e.cancelable) e.preventDefault()
      distance = Math.min(MAX_PULL, dy * 0.5)
      setPull(distance)
    }

    const onEnd = () => {
      if (!tracking) return
      const reached = pulling && distance >= TRIGGER
      tracking = false
      pulling = false
      if (reached) {
        setPull(TRIGGER)
        setRefreshing(true)
        window.location.reload()
      } else {
        reset()
      }
    }

    const onCancel = () => {
      if (tracking) reset()
    }

    document.addEventListener('touchstart', onStart, { passive: true })
    document.addEventListener('touchmove', onMove, { passive: false })
    document.addEventListener('touchend', onEnd, { passive: true })
    document.addEventListener('touchcancel', onCancel, { passive: true })
    return () => {
      document.removeEventListener('touchstart', onStart)
      document.removeEventListener('touchmove', onMove)
      document.removeEventListener('touchend', onEnd)
      document.removeEventListener('touchcancel', onCancel)
    }
  }, [enabled])

  if (!enabled) return null
  if (pull <= 0 && !refreshing) return null

  const dragging = !refreshing && pull > 0
  return (
    <div
      aria-hidden="true"
      style={{
        position: 'fixed',
        top: 'env(safe-area-inset-top)',
        left: '50%',
        width: 40,
        height: 40,
        marginLeft: -20,
        borderRadius: '50%',
        background: '#fff',
        boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        pointerEvents: 'none',
        zIndex: 9999,
        transform: `translateY(${pull - 40}px)`,
        opacity: Math.min(1, pull / 30),
        transition: dragging ? 'none' : 'transform 0.2s ease, opacity 0.2s ease',
      }}
    >
      {refreshing ? (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#333" strokeWidth="2.5" strokeLinecap="round">
          <path d="M12 3a9 9 0 1 0 9 9">
            <animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="0.8s" repeatCount="indefinite" />
          </path>
        </svg>
      ) : (
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#333"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            transform: `rotate(${pull >= TRIGGER ? 180 : 0}deg)`,
            transition: 'transform 0.15s ease',
          }}
        >
          <path d="M12 5v14M6 13l6 6 6-6" />
        </svg>
      )}
    </div>
  )
}
