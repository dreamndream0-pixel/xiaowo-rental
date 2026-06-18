'use client'
// 全域按鈕 Ripple 波紋特效
import { useEffect } from 'react'

export default function ButtonEffects() {
  useEffect(() => {
    const handler = (e) => {
      const btn = e.target.closest('button:not(:disabled), a[role="button"]')
      if (!btn) return

      // 加 ripple-host 讓 overflow:hidden 生效
      if (!btn.classList.contains('ripple-host')) {
        btn.classList.add('ripple-host')
      }

      const rect = btn.getBoundingClientRect()
      const size = Math.max(rect.width, rect.height)
      const el = document.createElement('span')
      el.className = 'xiaowo-ripple-el'
      el.style.cssText = [
        `width:${size}px`,
        `height:${size}px`,
        `left:${e.clientX - rect.left - size / 2}px`,
        `top:${e.clientY - rect.top - size / 2}px`,
      ].join(';')
      btn.appendChild(el)
      el.addEventListener('animationend', () => el.remove(), { once: true })
    }

    document.addEventListener('click', handler)
    return () => document.removeEventListener('click', handler)
  }, [])

  return null
}
