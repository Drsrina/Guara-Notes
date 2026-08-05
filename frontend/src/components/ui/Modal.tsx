import React, { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useSettingsStore } from '../../store'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
  className?: string
}

export function Modal({ isOpen, onClose, title, children, className }: ModalProps) {
  const { settings } = useSettingsStore()

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose()
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const isAnimated = settings.animations !== 'off'

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: isAnimated ? 0.2 : 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={isAnimated ? { opacity: 0, y: 20, scale: 0.95 } : { opacity: 1 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={isAnimated ? { opacity: 0, y: 20, scale: 0.95 } : { opacity: 0 }}
            transition={{ type: 'spring', bounce: 0, duration: isAnimated ? 0.4 : 0 }}
            className={`glass-panel box-glow-neon flex flex-col max-h-[90vh] overflow-hidden ${className || ''}`}
          >
            {title && (
              <div className="px-6 py-4 border-b border-white/10 flex justify-between items-center shrink-0">
                <h2 className="text-lg font-bold text-accent-primary text-glow-neon">{title}</h2>
                <button
                  onClick={onClose}
                  className="text-text-muted hover:text-text-primary transition-colors"
                >
                  ✕
                </button>
              </div>
            )}
            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
