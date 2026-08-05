import { useEffect, useState, useRef, useMemo } from 'react'
import ForceGraph3D from 'react-force-graph-3d'
import { graphApi, type GraphNode } from '../api/graph'
import { useAppStore, useTagsStore, useSettingsStore, useWorkspaceStore } from '../store'

function cosineSim(vecA: number[], vecB: number[]) {
  let dotProduct = 0
  let normA = 0
  let normB = 0
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i]
    normA += vecA[i] * vecA[i]
    normB += vecB[i] * vecB[i]
  }
  if (normA === 0 || normB === 0) return 0
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB))
}

export default function Brain3D() {
  const [nodes, setNodes] = useState<GraphNode[]>([])
  const [links, setLinks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [ready, setReady] = useState(false)
  const { notes } = useAppStore()
  const { openNoteInFocusedPane } = useWorkspaceStore()
  const { getTagColor } = useTagsStore()
  const { settings, updateSettings } = useSettingsStore()
  const fgRef = useRef<any>(null)

  const [dimensions, setDimensions] = useState({ width: window.innerWidth, height: window.innerHeight })

  useEffect(() => {
    const observer = new ResizeObserver((entries) => {
      for (let entry of entries) {
        setDimensions({
          width: entry.contentRect.width,
          height: entry.contentRect.height
        })
      }
    })

    const container = document.getElementById('brain-container')
    if (container) {
       observer.observe(container)
    }
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    graphApi.getBrain3D()
      .then(res => {
        setNodes(res.data.nodes)
        setReady(res.data.ready)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!nodes || nodes.length === 0) return
    const newLinks: any[] = []
    
    if (settings.renderSemantic) {
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const nodeA = nodes[i]
          const nodeB = nodes[j]
          if ((nodeA as any).embedding && (nodeB as any).embedding && Array.isArray((nodeA as any).embedding) && Array.isArray((nodeB as any).embedding)) {
            const sim = cosineSim((nodeA as any).embedding, (nodeB as any).embedding)
            if (sim >= settings.semanticThreshold) {
              newLinks.push({ source: nodeA.id, target: nodeB.id, similarity: sim })
            }
          }
        }
      }
    }
    setLinks(newLinks)
  }, [nodes, settings.semanticThreshold, settings.renderSemantic])

  const processedNodes = useMemo(() => {
    return nodes.map(n => {
      const note = notes.find(note => note.id === n.id)
      return { ...n, tags: note?.tags || [] }
    }).filter(n => settings.hideEmptyNotes ? n.has_embedding : true)
  }, [nodes, notes, settings.hideEmptyNotes])

  const handleZoomIn = () => {
    if (fgRef.current) {
      const pos = fgRef.current.cameraPosition()
      fgRef.current.cameraPosition({ x: pos.x * 0.8, y: pos.y * 0.8, z: pos.z * 0.8 }, null, 400)
    }
  }

  const handleZoomOut = () => {
    if (fgRef.current) {
      const pos = fgRef.current.cameraPosition()
      fgRef.current.cameraPosition({ x: pos.x * 1.2, y: pos.y * 1.2, z: pos.z * 1.2 }, null, 400)
    }
  }

  const handleCenter = () => fgRef.current?.zoomToFit(400, 50)

  const getNodeColor = (node: any) => {
    if (!node.has_embedding) return '#555555'
    if (settings.colorMode === 'tag' && node.tags && node.tags.length > 0) {
      return getTagColor(node.tags[0])
    }
    return '#FF6B1A'
  }

  return (
    <div id="brain-container" className="w-full h-full bg-bg-primary relative flex overflow-hidden">
      <div className="absolute top-4 left-4 z-10 glass-panel px-4 py-3 rounded-lg text-sm text-text-primary flex flex-col gap-3 min-w-[250px]">
        <div className="flex items-center justify-between border-b border-white/5 pb-2">
          <span className="font-semibold text-accent-primary tracking-wide text-glow-neon">Cérebro Semântico</span>
          {loading && <span className="text-text-muted text-xs animate-pulse">carregando...</span>}
        </div>
        
        {!loading && (
          <div className="flex flex-col gap-1">
            <span className={`text-xs ${ready ? 'text-text-secondary' : 'text-text-muted'}`}>
              {processedNodes.length} notas ({processedNodes.filter(n => n.has_embedding).length} vetorizadas)
            </span>
            {settings.renderSemantic && (
              <span className="text-xs text-text-muted">
                {links.length} conexões semânticas
              </span>
            )}
          </div>
        )}
        
        {settings.renderSemantic && (
          <div className="mt-2 flex flex-col gap-2">
            <div className="flex justify-between items-center text-xs text-text-muted">
              <span>Sensibilidade (RAG)</span>
              <span className="text-accent-primary font-mono">{(settings.semanticThreshold * 100).toFixed(0)}%</span>
            </div>
            <input
              type="range"
              min="0.50"
              max="0.99"
              step="0.01"
              value={settings.semanticThreshold}
              onChange={(e) => updateSettings({ semanticThreshold: parseFloat(e.target.value) })}
              className="w-full accent-accent-primary cursor-pointer"
            />
          </div>
        )}
      </div>

      {!ready && !loading && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 glass-panel px-6 py-3 rounded-lg text-sm text-text-muted text-center max-w-sm">
          💡 Crie e edite notas para iniciar o processamento de embeddings. O cérebro revelará conexões ocultas.
        </div>
      )}

      <div className="absolute bottom-6 right-6 z-10 flex flex-col gap-2 glass-panel p-2 rounded-lg">
        <button onClick={handleZoomIn} className="w-8 h-8 flex items-center justify-center bg-bg-tertiary hover:bg-white/10 text-text-primary rounded transition-colors text-lg" title="Aproximar">
          +
        </button>
        <button onClick={handleZoomOut} className="w-8 h-8 flex items-center justify-center bg-bg-tertiary hover:bg-white/10 text-text-primary rounded transition-colors text-lg" title="Afastar">
          −
        </button>
        <button onClick={handleCenter} className="w-8 h-8 flex items-center justify-center bg-bg-tertiary hover:bg-white/10 text-text-primary rounded transition-colors text-sm" title="Centralizar Cérebro">
          🎯
        </button>
      </div>

      <div className="w-full h-full flex-1">
        <ForceGraph3D
          ref={fgRef}
          width={dimensions.width}
          height={dimensions.height}
          graphData={{ nodes: processedNodes, links }}
          nodeLabel="title"
          nodeColor={getNodeColor}
          nodeResolution={16}
          linkColor={() => 'rgba(255, 107, 26, 0.4)'}
          linkWidth={1.5}
          linkOpacity={0.6}
          onNodeClick={(node: any) => openNoteInFocusedPane(node.id)}
          backgroundColor="#0F0F1E"
          enableNodeDrag={false}
          showNavInfo={false}
        />
      </div>
    </div>
  )
}
