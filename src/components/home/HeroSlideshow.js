'use client'
import { useState, useEffect, useCallback } from 'react'

export default function HeroSlideshow({ slides = [] }) {
  const [current, setCurrent] = useState(0)
  const [fading, setFading] = useState(false)

  const goTo = useCallback((idx) => {
    if (idx === current) return
    setFading(true)
    setTimeout(() => {
      setCurrent(idx)
      setFading(false)
    }, 350)
  }, [current])

  const prev = useCallback(() => {
    goTo((current - 1 + slides.length) % slides.length)
  }, [current, slides.length, goTo])

  const next = useCallback(() => {
    goTo((current + 1) % slides.length)
  }, [current, slides.length, goTo])

  // Auto-advance every 4 seconds
  useEffect(() => {
    if (slides.length <= 1) return
    const id = setInterval(next, 4000)
    return () => clearInterval(id)
  }, [next, slides.length])

  if (!slides.length || !slides[0].url) return null

  const slide = slides[current]

  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 0, overflow: 'hidden' }}>
      {/* Background image */}
      <div
        style={{
          position: 'absolute', inset: 0,
          backgroundImage: `url(${slide.url})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          opacity: fading ? 0 : 1,
          transition: 'opacity 0.35s ease',
        }}
        role="img"
        aria-label={slide.alt}
      />
      {/* Dark overlay for text legibility */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(to bottom, rgba(0,0,0,0.45) 0%, rgba(0,0,0,0.2) 60%, rgba(0,0,0,0.5) 100%)',
      }} />

      {/* Prev / Next arrows */}
      {slides.length > 1 && (
        <>
          <button
            onClick={prev}
            aria-label="上一張"
            style={{
              position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)',
              zIndex: 2, background: 'rgba(255,255,255,0.2)', border: '1.5px solid rgba(255,255,255,0.4)',
              color: 'white', width: 40, height: 40, borderRadius: '50%',
              fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              backdropFilter: 'blur(4px)',
            }}
          >‹</button>
          <button
            onClick={next}
            aria-label="下一張"
            style={{
              position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)',
              zIndex: 2, background: 'rgba(255,255,255,0.2)', border: '1.5px solid rgba(255,255,255,0.4)',
              color: 'white', width: 40, height: 40, borderRadius: '50%',
              fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              backdropFilter: 'blur(4px)',
            }}
          >›</button>
        </>
      )}

      {/* Dot indicators */}
      {slides.length > 1 && (
        <div style={{
          position: 'absolute', bottom: 20, left: '50%', transform: 'translateX(-50%)',
          display: 'flex', gap: 8, zIndex: 2,
        }}>
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              aria-label={`第 ${i + 1} 張`}
              style={{
                width: i === current ? 24 : 8,
                height: 8, borderRadius: 99, border: 'none',
                background: i === current ? 'white' : 'rgba(255,255,255,0.5)',
                cursor: 'pointer', padding: 0,
                transition: 'all 0.3s ease',
              }}
            />
          ))}
        </div>
      )}
    </div>
  )
}
