'use client'
// src/components/ui/Toast.js

import { createContext, useContext, useState, useCallback } from 'react'

const ToastContext = createContext(null)

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const show = useCallback((message, type = 'default') => {
    const id = Date.now()
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000)
  }, [])

  const icons = { success: '✓', warn: '⚠', error: '✕', default: 'ℹ' }
  const bg = {
    success: 'bg-[var(--sage-dark)]',
    warn:    'bg-[var(--warn)]',
    error:   'bg-[var(--danger)]',
    default: 'bg-[var(--charcoal)]',
  }

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div className="fixed top-20 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
        {toasts.map(t => (
          <div key={t.id} className={`flex items-center gap-2.5 px-4 py-3 rounded-xl text-white text-sm shadow-xl min-w-[220px] animate-slide-in ${bg[t.type]}`}>
            <span className="text-base">{icons[t.type]}</span>
            <span>{t.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export const useToast = () => useContext(ToastContext)
