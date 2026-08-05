import { useRef, useCallback } from 'react'
import { useWorkspaceStore } from '../store'
import Pane from './Pane'

export default function Workspace() {
  const { panes, splitDir, splitRatio, setSplitRatio } = useWorkspaceStore()
  const containerRef = useRef<HTMLDivElement>(null)
  const isDragging = useRef(false)

  const onDividerMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    isDragging.current = true
    document.body.style.cursor = splitDir === 'vertical' ? 'col-resize' : 'row-resize'
    document.body.style.userSelect = 'none'

    const onMove = (ev: MouseEvent) => {
      if (!isDragging.current || !containerRef.current) return
      const rect = containerRef.current.getBoundingClientRect()
      if (splitDir === 'vertical') {
        setSplitRatio((ev.clientX - rect.left) / rect.width)
      } else {
        setSplitRatio((ev.clientY - rect.top) / rect.height)
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

  // ── 1 painel ──────────────────────────────────────────────────────────────
  if (panes.length === 1) {
    return (
      <div className="flex-1 min-h-0 overflow-hidden">
        <Pane pane={panes[0]} canClose={false} canSplit={true} />
      </div>
    )
  }

  // ── 3-4 painéis: grade flex ────────────────────────────────────────────────
  if (panes.length >= 3) {
    return (
      <div
        ref={containerRef}
        className="flex-1 min-h-0 overflow-hidden flex flex-wrap"
      >
        {panes.map((pane, idx) => (
          <div
            key={pane.id}
            style={{
              width: panes.length === 3
                ? idx === 0 ? '50%' : '25%'
                : '50%',
              height: panes.length === 4 ? '50%' : '100%',
            }}
            className="overflow-hidden min-w-0 min-h-0 border-r border-white/5 last:border-r-0"
          >
            <Pane pane={pane} canClose={true} canSplit={panes.length < 4} />
          </div>
        ))}
      </div>
    )
  }

  // ── 2 painéis: split arrastável ───────────────────────────────────────────
  const isVertical = splitDir === 'vertical'
  const pct1 = `${(splitRatio * 100).toFixed(1)}%`
  const pct2 = `${((1 - splitRatio) * 100).toFixed(1)}%`

  return (
    <div
      ref={containerRef}
      className={`flex-1 min-h-0 overflow-hidden flex ${isVertical ? 'flex-row' : 'flex-col'}`}
    >
      <div
        style={isVertical ? { width: pct1 } : { height: pct1 }}
        className="overflow-hidden min-w-0 min-h-0"
      >
        <Pane pane={panes[0]} canClose={false} canSplit={true} />
      </div>

      {/* Divisor arrastável */}
      <div
        onMouseDown={onDividerMouseDown}
        className={`
          shrink-0 group relative
          ${isVertical ? 'w-1 cursor-col-resize' : 'h-1 cursor-row-resize'}
          bg-white/5 hover:bg-accent-primary/40 transition-colors duration-150
        `}
      >
        <div className={`
          absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity
          ${isVertical ? 'flex-col gap-0.5' : 'flex-row gap-0.5'}
        `}>
          {[0, 1, 2].map(i => (
            <div key={i} className={`rounded-full bg-accent-primary/80 ${isVertical ? 'w-0.5 h-3' : 'h-0.5 w-3'}`} />
          ))}
        </div>
      </div>

      <div
        style={isVertical ? { width: pct2 } : { height: pct2 }}
        className="overflow-hidden min-w-0 min-h-0"
      >
        <Pane pane={panes[1]} canClose={true} canSplit={true} />
      </div>
    </div>
  )
}
