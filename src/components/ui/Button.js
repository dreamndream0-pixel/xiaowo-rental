'use client'
// src/components/ui/Button.js

import clsx from 'clsx'

export default function Button({
  children, variant = 'primary', size = 'md',
  className, loading, disabled, ...props
}) {
  const base = 'inline-flex items-center justify-center font-bold rounded-full transition-all duration-200 cursor-pointer border-none font-[inherit] tracking-wide'

  const variants = {
    primary: 'bg-[var(--sage)] text-white hover:bg-[var(--sage-dark)] hover:-translate-y-px hover:shadow-md disabled:opacity-50',
    outline: 'bg-transparent text-[var(--sage-dark)] border-[1.5px] border-[var(--sage)] hover:bg-[var(--sage-bg)]',
    ghost:   'bg-transparent text-[var(--gray-mid)] hover:bg-[var(--oat-light)] hover:text-[var(--sage-dark)]',
    danger:  'bg-transparent text-[var(--danger)] border-[1.5px] border-[var(--danger)] hover:bg-red-50',
  }

  const sizes = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-5 py-2.5 text-sm',
    lg: 'px-8 py-3 text-sm',
  }

  return (
    <button
      className={clsx(base, variants[variant], sizes[size], className)}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <span className="mr-2 inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
      )}
      {children}
    </button>
  )
}
