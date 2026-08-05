import { useRef, useCallback } from 'react'
import { useWorkspaceStore } from '../store'
import Pane from './Pane'

export default function Workspace() {
  const { panes, splitDir, splitRatio, setSplitRatio } = useWorkspaceStore()
  const containerRef = useRef<HTMLDivElement>(null)
  const isDragging = useRef(false)

  const hasSplit = panes.length >= 2

  // ── Divisor arrastável ──────────────────────────────────────────────────────
  const onDividerMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    isDragging.current = true
    document.body.style.cursor = splitDir === 'vertical' ? 'col-resize' : 'row-resize'
    document.body.style.userSelect = 'none'

    const onMove = (ev: MouseEvent) => {
      if (!isDragging.current || !containerRef.current) return
      const rect = containerRef.current.getBoundingClientRect()
      if (splitDir === 'vertical') {
        const ratio = (ev.clientX - rect.left) / rect.width
        setSplitRatio(ratio)
      } else {
        const ratio = (ev.clientY - rect.top) / rect.height
        setSplitRatio(ratio)
      }
    }

    const onUp = () => {
      isDragging.current = false
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [splitDir, setSplitRatio])

  // ── Layout único ────────────────────────────────────────────────────────────
  if (!hasSplit) {
    return (
      <div className="flex-1 min-h-0 overflow-hidden">
        <Pane pane={panes[0]} canClose={false} canSplit={true} />
      </div>
    )
  }

  // ── Layout split ────────────────────────────────────────────────────────────
  const isVertical = splitDir === 'vertical'
  const pct1 = `${(splitRatio * 100).toFixed(1)}%`
  const pct2 = `${((1 - splitRatio) * 100).toFixed(1)}%`

  return (
    <div
      ref={containerRef}
      className={`flex-1 min-h-0 overflow-hidden flex ${isVertical ? 'flex-row' : 'flex-col'}`}
    >
      {/* Pane 1 */}
      <div
        style={isVertical ? { width: pct1 } : { height: pct1 }}
        className="overflow-hidden min-w-0 min-h-0"
      >
        <Pane pane={panes[0]} canClose={false} canSplit={false} />
      </div>

      {/* Divisor */}
      <div
        onMouseDown={onDividerMouseDown}
        className={`
          shrink-0 group relative
          ${isVertical
            ? 'w-1 cursor-col-resize hover:w-1'
            : 'h-1 cursor-row-resize hover:h-1'
          }
          bg-white/5 hover:bg-accent-primary/40 transition-colors duration-150
        `}
      >
        {/* Handle visual indicator */}
        <div className={`
          absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity
          ${isVertical ? 'flex-col gap-0.5' : 'flex-row gap-0.5'}
        `}>
          {[0,1,2].map(i => (
            <div key={i} className={`
              rounded-full bg-accent-primary/80
              ${isVertical ? 'w-0.5 h-3' : 'h-0.5 w-3'}
            `} />
          ))}
        </div>
      </div>

      {/* Pane 2 */}
      <div
        style={isVertical ? { width: pct2 } : { height: pct2 }}
        className="overflow-hidden min-w-0 min-h-0"
      >
        <Pane pane={panes[1]} canClose={true} canSplit={false} />
      </div>
    </div>
  )
}
