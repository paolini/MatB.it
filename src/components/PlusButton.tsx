import Link from 'next/link'
import React from 'react'

export type PlusButtonProps = {
  href: string
  title?: string
  className?: string
}

export default function PlusButton({ href, title, className }: PlusButtonProps) {
  return (
    <Link
      href={href}
      className={`flex items-center justify-center w-10 h-10 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition-colors text-3xl ${className || ''}`}
      title={title || 'Aggiungi'}
    >
      +
    </Link>
  )
}
