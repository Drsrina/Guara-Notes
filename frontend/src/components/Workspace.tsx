import { useRef, useCallback, useState } from 'react'
import { useWorkspaceStore } from '../store'
import type { PaneState } from '../store'
import Pane from './Pane'

// Draggable divider handle (horizontal or vertical)
function Divider({
  direction,
  onDrag,
}: {
  direction: 'vertical' | 'horizontal'
  onDrag: (delta: number) => void
}) {
  const isDragging = useRef(false)

  const onMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    isDragging.current = true
    document.body.style.cursor = direction === 'vertical' ? 'col-resize' : 'row-resize'
    document.body.style.userSelect = 'none'

    const onMove = (ev: MouseEvent) => {
      if (!isDragging.current) return
      onDrag(direction === 'vertical' ? ev.movementX : ev.movementY)
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
  }

  return (
    <div
      onMouseDown={onMouseDown}
      className={`
        shrink-0 group relative z-10
        ${direction === 'vertical' ? 'w-1 cursor-col-resize' : 'h-1 cursor-row-resize'}
        bg-white/5 hover:bg-accent-primary/40 active:bg-accent-primary/60 transition-colors duration-150
      `}
    >
      <div className={`
        absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity
        ${direction === 'vertical' ? 'flex-col gap-0.5' : 'flex-row gap-0.5'}
      `}>
        {[0, 1, 2].map(i => (
          <div key={i} className={`rounded-full bg-accent-primary/80 ${direction === 'vertical' ? 'w-0.5 h-3' : 'h-0.5 w-3'}`} />
        ))}
      </div>
    </div>
  )
}

// 3 or 4 pane grid with full drag-resize support
function MultiPaneGrid({ panes }: { panes: PaneState[] }) {
  const containerRef = useRef<HTMLDivElement>(null)
  // colRatio: left/right column split (0-1)
  const [colRatio, setColRatio] = useState(0.5)
  // rowRatios: top/bottom split per column [leftRow, rightRow]
  const [rowRatios, setRowRatios] = useState([0.5, 0.5])

  const clamp = (v: number, min = 0.15, max = 0.85) => Math.min(max, Math.max(min, v))

  const dragCol = useCallback((delta: number) => {
    if (!containerRef.current) return
    const w = containerRef.current.getBoundingClientRect().width
    setColRatio(prev => clamp(prev + delta / w))
  }, [])

  const dragLeftRow = useCallback((delta: number) => {
    if (!containerRef.current) return
    const h = containerRef.current.getBoundingClientRect().height
    setRowRatios(prev => [clamp(prev[0] + delta / h), prev[1]])
  }, [])

  const dragRightRow = useCallback((delta: number) => {
    if (!containerRef.current) return
    const h = containerRef.current.getBoundingClientRect().height
    setRowRatios(prev => [prev[0], clamp(prev[1] + delta / h)])
  }, [])

  const lPct = `${(colRatio * 100).toFixed(1)}%`
  const rPct = `${((1 - colRatio) * 100).toFixed(1)}%`
  const lTopPct = `${(rowRatios[0] * 100).toFixed(1)}%`
  const lBotPct = `${((1 - rowRatios[0]) * 100).toFixed(1)}%`
  const rTopPct = `${(rowRatios[1] * 100).toFixed(1)}%`
  const rBotPct = `${((1 - rowRatios[1]) * 100).toFixed(1)}%`

  const is4 = panes.length === 4
  const canAdd = panes.length < 4

  return (
    <div ref={containerRef} className="flex-1 min-h-0 overflow-hidden flex flex-row">
      {/* LEFT COLUMN */}
      <div style={{ width: lPct }} className="flex flex-col min-w-0 min-h-0 overflow-hidden">
        {/* Top-left pane */}
        <div style={{ height: is4 ? lTopPct : '100%' }} className="overflow-hidden min-h-0">
          <Pane pane={panes[0]} canClose={true} canSplit={canAdd} />
        </div>

        {/* Horizontal divider for left col (only if 4 panes) */}
        {is4 && <Divider direction="horizontal" onDrag={dragLeftRow} />}

        {/* Bottom-left pane (only if 4 panes) */}
        {is4 && (
          <div style={{ height: lBotPct }} className="overflow-hidden min-h-0">
            <Pane pane={panes[2]} canClose={true} canSplit={false} />
          </div>
        )}
      </div>

      {/* Vertical divider between columns */}
      <Divider direction="vertical" onDrag={dragCol} />

      {/* RIGHT COLUMN */}
      <div style={{ width: rPct }} className="flex flex-col min-w-0 min-h-0 overflow-hidden">
        {/* Top-right pane */}
        <div style={{ height: rTopPct }} className="overflow-hidden min-h-0">
          <Pane pane={panes[1]} canClose={true} canSplit={canAdd} />
        </div>

        {/* Horizontal divider for right col (3 or 4 panes — right always has 2) */}
        <Divider direction="horizontal" onDrag={dragRightRow} />

        {/* Bottom-right pane */}
        <div style={{ height: rBotPct }} className="overflow-hidden min-h-0">
          <Pane pane={is4 ? panes[3] : panes[2]} canClose={true} canSplit={canAdd} />
        </div>
      </div>
    </div>
  )
}

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

  // ── 3-4 painéis: grade com divisores arrastáveis ──────────────────────────
  if (panes.length >= 3) {
    return <MultiPaneGrid panes={panes} />
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

