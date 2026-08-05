import { useEffect, useRef, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

export interface ContextMenuItem {
  type?: 'separator'
  label?: string
  icon?: string
  action?: () => void
  danger?: boolean
  disabled?: boolean
  submenu?: ContextMenuItem[]
}

interface ContextMenuProps {
  items: ContextMenuItem[]
  x: number
  y: number
  onClose: () => void
}

function MenuItems({
  items,
  onClose,
  level = 0,
}: {
  items: ContextMenuItem[]
  onClose: () => void
  level?: number
}) {
  const [activeSubmenu, setActiveSubmenu] = useState<number | null>(null)

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: -4 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.1 }}
      className={`
        min-w-[180px] py-1 rounded-lg border border-white/10
        bg-[#13132a]/95 backdrop-blur-xl shadow-2xl shadow-black/50
        ${level > 0 ? 'absolute left-full top-0 ml-1' : ''}
      `}
    >
      {items.map((item, idx) => {
        if (item.type === 'separator') {
          return <div key={idx} className="my-1 border-t border-white/8" />
        }

        const hasSubmenu = item.submenu && item.submenu.length > 0
        const isActive = activeSubmenu === idx

        return (
          <div
            key={idx}
            className="relative"
            onMouseEnter={() => hasSubmenu && setActiveSubmenu(idx)}
            onMouseLeave={() => hasSubmenu && setActiveSubmenu(null)}
          >
            <button
              onClick={() => {
                if (item.disabled || hasSubmenu) return
                item.action?.()
                onClose()
              }}
              disabled={item.disabled}
              className={`
                w-full flex items-center gap-2.5 px-3 py-1.5 text-sm text-left
                transition-colors duration-100 relative
                ${item.disabled
                  ? 'opacity-40 cursor-not-allowed text-text-muted'
                  : item.danger
                    ? 'text-red-400 hover:bg-red-500/10 hover:text-red-300'
                    : 'text-text-secondary hover:bg-white/8 hover:text-text-primary'
                }
              `}
            >
              {item.icon && (
                <span className="text-[13px] w-4 text-center shrink-0">{item.icon}</span>
              )}
              <span className="flex-1">{item.label}</span>
              {hasSubmenu && (
                <span className="text-text-muted text-[10px] ml-auto">▶</span>
              )}
            </button>

            {/* Submenu */}
            {hasSubmenu && isActive && (
              <MenuItems items={item.submenu!} onClose={onClose} level={level + 1} />
            )}
          </div>
        )
      })}
    </motion.div>
  )
}

export function ContextMenu({ items, x, y, onClose }: ContextMenuProps) {
  const ref = useRef<HTMLDivElement>(null)

  // Fecha ao clicar fora ou pressionar Escape
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose()
      }
    }
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKey)
    }
  }, [onClose])

  // Ajuste de posição para não sair da tela
  const [pos, setPos] = useState({ x, y })
  useEffect(() => {
    if (!ref.current) return
    const rect = ref.current.getBoundingClientRect()
    const vw = window.innerWidth
    const vh = window.innerHeight
    setPos({
      x: x + rect.width > vw ? x - rect.width : x,
      y: y + rect.height > vh ? y - rect.height : y,
    })
  }, [x, y])

  return (
    <div
      ref={ref}
      style={{ position: 'fixed', left: pos.x, top: pos.y, zIndex: 9999 }}
    >
      <AnimatePresence>
        <MenuItems items={items} onClose={onClose} />
      </AnimatePresence>
    </div>
  )
}

// ── Hook de conveniência ────────────────────────────────────────────────────────

export function useContextMenu() {
  const [menu, setMenu] = useState<{ x: number; y: number; items: ContextMenuItem[] } | null>(null)

  const open = useCallback((e: React.MouseEvent, items: ContextMenuItem[]) => {
    e.preventDefault()
    e.stopPropagation()
    setMenu({ x: e.clientX, y: e.clientY, items })
  }, [])

  const close = useCallback(() => setMenu(null), [])

  const render = menu ? (
    <ContextMenu items={menu.items} x={menu.x} y={menu.y} onClose={close} />
  ) : null

  return { open, close, render }
}
