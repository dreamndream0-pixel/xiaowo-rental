// src/components/ui/Badge.js

import clsx from 'clsx'

export default function Badge({ children, variant = 'sage', className }) {
  const variants = {
    sage:      'bg-[var(--sage)] text-white',
    oat:       'bg-[var(--oat)] text-[var(--charcoal)]',
    available: 'bg-[var(--sage-dark)] text-white',
    rented:    'bg-[var(--charcoal)] text-white opacity-75',
    pending:   'bg-[var(--warn)] text-white',
    rejected:  'bg-[var(--danger)] text-white',
    outline:   'bg-transparent text-[var(--sage-dark)] border border-[var(--sage-light)]',
  }

  return (
    <span className={clsx(
      'inline-block px-2.5 py-0.5 rounded-xl text-[10px] font-bold tracking-wide',
      variants[variant], className
    )}>
      {children}
    </span>
  )
}
