import React from 'react'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  variant?: 'glass' | 'default'
}

export function Input({ variant = 'glass', className, ...props }: InputProps) {
  return (
    <input
      className={cn(
        variant === 'glass' ? 'input-glass' : 'bg-bg-tertiary border border-white/10 rounded-md px-3 py-2 text-text-primary focus:outline-none focus:border-accent-primary focus:ring-1 focus:ring-accent-primary',
        className
      )}
      {...props}
    />
  )
}
