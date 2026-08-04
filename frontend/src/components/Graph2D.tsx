import { useEffect, useRef, useState, useCallback } from 'react'
import ForceGraph2D from 'react-force-graph-2d'
import { graphApi, type GraphData } from '../api/graph'
import { useAppStore } from '../store'

export default function Graph2D() {
  const containerRef = useRef<HTMLDivElement>(null)
  const fgRef = useRef<any>(null)
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 })
  const [graphData, setGraphData] = useState<GraphData>({ nodes: [], links: [] })
  const [loading, setLoading] = useState(true)
  const { setActiveNoteId } = useAppStore()

  useEffect(() => {
    if (containerRef.current) {
      const { clientWidth, clientHeight } = containerRef.current
      setDimensions({ width: clientWidth, height: clientHeight })
    }

    graphApi.getGraph()
      .then(res => setGraphData(res.data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const handleNodeClick = useCallback((node: { id?: string | number, x?: number, y?: number }) => {
    if (node.id) setActiveNoteId(String(node.id))
    if (node.x && node.y && fgRef.current) {
      fgRef.current.centerAt(node.x, node.y, 1000)
      fgRef.current.zoom(2, 1000)
    }
  }, [setActiveNoteId])

  const handleZoomIn = () => {
    if (fgRef.current) {
      const currentZoom = fgRef.current.zoom()
      fgRef.current.zoom(currentZoom * 1.5, 400)
    }
  }

  const handleZoomOut = () => {
    if (fgRef.current) {
      const currentZoom = fgRef.current.zoom()
      fgRef.current.zoom(currentZoom / 1.5, 400)
    }
  }

  const handleCenter = () => {
    if (fgRef.current) {
      fgRef.current.zoomToFit(400, 50)
    }
  }

  return (
    <div ref={containerRef} className="w-full h-full bg-zinc-950 overflow-hidden relative">
      <div className="absolute top-4 left-4 z-10 glass px-4 py-2 rounded-lg text-sm flex items-center gap-2">
        <span className="text-zinc-400">Grafo de Conhecimento</span>
        {loading && <span className="text-zinc-600 text-xs animate-pulse">carregando...</span>}
        {!loading && <span className="text-zinc-600 text-xs">{graphData.nodes.length} notas</span>}
      </div>
      <div className="absolute top-4 right-4 z-10 flex flex-col gap-1 text-xs text-zinc-500">
        <span><span className="text-orange-400">●</span> Wikilink</span>
        <span><span className="text-blue-400">●</span> Semântico</span>
      </div>
      
      <div className="absolute bottom-6 right-6 z-10 flex flex-col gap-2 glass-panel p-2 rounded-lg box-glow-neon border border-guara-neon/20">
        <button onClick={handleZoomIn} className="w-8 h-8 flex items-center justify-center bg-zinc-900 hover:bg-zinc-800 text-zinc-300 rounded transition-colors text-lg" title="Aumentar Zoom">
          +
        </button>
        <button onClick={handleZoomOut} className="w-8 h-8 flex items-center justify-center bg-zinc-900 hover:bg-zinc-800 text-zinc-300 rounded transition-colors text-lg" title="Diminuir Zoom">
          −
        </button>
        <button onClick={handleCenter} className="w-8 h-8 flex items-center justify-center bg-zinc-900 hover:bg-zinc-800 text-zinc-300 rounded transition-colors text-sm" title="Centralizar Grafo">
          🎯
        </button>
      </div>

      <ForceGraph2D
        ref={fgRef}
        width={dimensions.width}
        height={dimensions.height}
        graphData={{
          nodes: graphData.nodes.map(n => ({ id: n.id, name: n.title })),
          links: graphData.links.map(l => ({ source: l.source, target: l.target, type: l.type, value: l.weight })),
        }}
        nodeLabel="name"
        nodeColor={() => '#FF8C42'}
        nodeRelSize={5}
        linkColor={(link: { type?: string }) => link.type === 'wikilink' ? 'rgba(255,140,66,0.6)' : 'rgba(99,179,237,0.4)'}
        linkWidth={(link: { value?: number }) => (link.value || 0.5) * 2}
        backgroundColor="#09090b"
        onNodeClick={handleNodeClick}
      />
    </div>
  )
}
