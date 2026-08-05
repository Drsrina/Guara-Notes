import type { ReactNode } from 'react'
import { Toaster } from 'react-hot-toast'

interface LayoutProps {
  children: ReactNode
}

export default function Layout({ children }: LayoutProps) {
  return (
    <div className="h-screen w-screen overflow-hidden flex bg-bg-primary text-text-primary antialiased font-sans">
      {children}
      <Toaster
        position="top-right"
        toastOptions={{
          className: '!bg-bg-secondary/80 !backdrop-blur-md !text-text-primary !border !border-white/10 !rounded-lg',
          duration: 3000
        }}
      />
    </div>
  )
}
