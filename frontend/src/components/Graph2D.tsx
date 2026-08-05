import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import ForceGraph2D from 'react-force-graph-2d'
import { graphApi, type GraphData } from '../api/graph'
import { useAppStore, useTagsStore, useSettingsStore } from '../store'

export default function Graph2D() {
  const containerRef = useRef<HTMLDivElement>(null)
  const fgRef = useRef<any>(null)
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 })
  const [graphData, setGraphData] = useState<GraphData>({ nodes: [], links: [] })
  const [loading, setLoading] = useState(true)

  const { setActiveNoteId, notes } = useAppStore()
  const { getTagColor } = useTagsStore()
  const { settings } = useSettingsStore()

  useEffect(() => {
    // Responsive handler
    const observer = new ResizeObserver((entries) => {
      for (let entry of entries) {
        setDimensions({
          width: entry.contentRect.width,
          height: entry.contentRect.height
        })
      }
    })

    if (containerRef.current) {
       observer.observe(containerRef.current)
    }

    graphApi.getGraph()
      .then(res => setGraphData(res.data))
      .catch(console.error)
      .finally(() => setLoading(false))

    return () => observer.disconnect()
  }, [])

  // Sync graph nodes with local notes store to get tags
  const processedGraphData = useMemo(() => {
    const nodes = graphData.nodes.map(n => {
      const note = notes.find(note => note.id === n.id)
      return {
        ...n,
        id: n.id,
        name: n.title,
        tags: note?.tags || []
      }
    })

    const links = graphData.links.map(l => ({
      source: l.source,
      target: l.target,
      type: l.type,
      value: l.weight
    }))

    return { nodes, links }
  }, [graphData, notes])

  const handleNodeClick = useCallback((node: any) => {
    if (node.id) setActiveNoteId(String(node.id))
    if (node.x && node.y && fgRef.current) {
      fgRef.current.centerAt(node.x, node.y, 1000)
      fgRef.current.zoom(2, 1000)
    }
  }, [setActiveNoteId])

  const handleZoomIn = () => fgRef.current?.zoom(fgRef.current.zoom() * 1.5, 400)
  const handleZoomOut = () => fgRef.current?.zoom(fgRef.current.zoom() / 1.5, 400)
  const handleCenter = () => fgRef.current?.zoomToFit(400, 50)

  // Configure forces based on settings
  useEffect(() => {
    if (fgRef.current) {
      fgRef.current.d3Force('charge').strength(-150 * settings.graphRepulsion)
      fgRef.current.d3Force('link').distance(30 * (2 - settings.graphAttraction))
    }
  }, [settings.graphAttraction, settings.graphRepulsion, processedGraphData])

  const getNodeColor = (node: any) => {
    if (settings.colorMode === 'tag' && node.tags && node.tags.length > 0) {
      return getTagColor(node.tags[0])
    }
    return '#FF8C42' // Default accent
  }

  const getNodeSize = () => {
    switch (settings.nodeSize) {
      case 'small': return 3
      case 'large': return 7
      case 'medium':
      default: return 5
    }
  }

  return (
    <div ref={containerRef} className="w-full h-full bg-bg-primary overflow-hidden relative">
      <div className="absolute top-4 left-4 z-10 glass-panel px-4 py-2 rounded-lg text-sm flex items-center gap-2">
        <span className="text-text-primary font-medium">Grafo</span>
        {loading && <span className="text-text-muted text-xs animate-pulse">carregando...</span>}
        {!loading && <span className="text-text-secondary text-xs bg-white/5 px-2 py-0.5 rounded-full">{processedGraphData.nodes.length} notas</span>}
      </div>

      <div className="absolute top-4 right-4 z-10 flex flex-col gap-1 text-xs text-text-muted glass px-3 py-2 rounded-md">
        <span><span className="text-accent-primary">●</span> Wikilink</span>
        <span><span className="text-blue-400">●</span> Semântico</span>
      </div>
      
      <div className="absolute bottom-6 right-6 z-10 flex flex-col gap-2 glass-panel p-2 rounded-lg border border-white/10">
        <button onClick={handleZoomIn} className="w-8 h-8 flex items-center justify-center bg-bg-tertiary hover:bg-white/10 text-text-primary rounded transition-colors text-lg" title="Aumentar Zoom">
          +
        </button>
        <button onClick={handleZoomOut} className="w-8 h-8 flex items-center justify-center bg-bg-tertiary hover:bg-white/10 text-text-primary rounded transition-colors text-lg" title="Diminuir Zoom">
          −
        </button>
        <button onClick={handleCenter} className="w-8 h-8 flex items-center justify-center bg-bg-tertiary hover:bg-white/10 text-text-primary rounded transition-colors text-sm" title="Centralizar Grafo">
          🎯
        </button>
      </div>

      <ForceGraph2D
        ref={fgRef}
        width={dimensions.width}
        height={dimensions.height}
        graphData={processedGraphData}
        nodeLabel="name"
        nodeColor={getNodeColor}
        nodeRelSize={getNodeSize()}
        linkColor={(link: any) => link.type === 'wikilink' ? 'rgba(255,140,66,0.6)' : 'rgba(99,179,237,0.4)'}
        linkWidth={(link: any) => (link.value || 0.5) * 2}
        backgroundColor="#0F0F1E"
        onNodeClick={handleNodeClick}
      />
    </div>
  )
}
