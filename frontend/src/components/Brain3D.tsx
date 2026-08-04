import { useEffect, useState, useRef, useCallback } from 'react'
import ForceGraph3D from 'react-force-graph-3d'
import { graphApi, type GraphNode } from '../api/graph'
import { useAppStore } from '../store'

// Função para calcular a similaridade de cosseno entre dois vetores (embeddings)
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
  const [similarityThreshold, setSimilarityThreshold] = useState(0.70)
  const { setActiveNoteId } = useAppStore()
  const fgRef = useRef<any>()

  const [dimensions, setDimensions] = useState({ width: window.innerWidth, height: window.innerHeight })

  useEffect(() => {
    const handleResize = () => {
      // Pequeno ajuste para garantir que o flex-1 ocupe o espaço correto
      const container = document.getElementById('brain-container')
      if (container) {
        setDimensions({ width: container.clientWidth, height: container.clientHeight })
      }
    }
    window.addEventListener('resize', handleResize)
    // Chamada inicial
    setTimeout(handleResize, 100)
    return () => window.removeEventListener('resize', handleResize)
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
    
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const nodeA = nodes[i]
        const nodeB = nodes[j]
        
        // Verifica as propriedades de array (pgvector retorna float array)
        if (nodeA.embedding && nodeB.embedding && Array.isArray(nodeA.embedding) && Array.isArray(nodeB.embedding)) {
          const sim = cosineSim(nodeA.embedding, nodeB.embedding)
          
          if (sim >= similarityThreshold) {
            newLinks.push({
              source: nodeA.id,
              target: nodeB.id,
              similarity: sim
            })
          }
        }
      }
    }
    
    setLinks(newLinks)
  }, [nodes, similarityThreshold])

  return (
    <div id="brain-container" className="w-full h-full bg-zinc-950 relative flex overflow-hidden">
      <div className="absolute top-4 left-4 z-10 glass-panel px-4 py-3 rounded-lg text-sm text-zinc-200 flex flex-col gap-3 min-w-[250px] shadow-lg box-glow-neon border border-guara-neon/20">
        <div className="flex items-center justify-between">
          <span className="font-semibold text-guara-neon tracking-wide drop-shadow-[0_0_8px_rgba(255,107,26,0.8)]">Cérebro Semântico</span>
          {loading && <span className="text-zinc-500 text-xs animate-pulse">carregando...</span>}
        </div>
        
        {!loading && (
          <div className="flex flex-col gap-1">
            <span className={`text-xs ${ready ? 'text-zinc-300' : 'text-zinc-500'}`}>
              {nodes.length} notas ({nodes.filter(n => n.has_embedding).length} vetorizadas)
            </span>
            <span className="text-xs text-zinc-400">
              {links.length} conexões semânticas
            </span>
          </div>
        )}
        
        <div className="mt-2 flex flex-col gap-2">
          <div className="flex justify-between items-center text-xs text-zinc-400">
            <span>Sensibilidade</span>
            <span className="text-guara-neon font-mono">{(similarityThreshold * 100).toFixed(0)}%</span>
          </div>
          <input 
            type="range" 
            min="0.50" 
            max="0.99" 
            step="0.01" 
            value={similarityThreshold} 
            onChange={(e) => setSimilarityThreshold(parseFloat(e.target.value))}
            className="w-full accent-guara-neon cursor-pointer"
          />
        </div>
      </div>

      {!ready && !loading && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 glass-panel px-6 py-3 rounded-lg text-sm text-zinc-400 text-center max-w-sm shadow-xl border border-white/5 backdrop-blur-md">
          💡 Crie e edite notas para iniciar o processamento de embeddings. O cérebro revelará conexões ocultas.
        </div>
      )}

      <div className="w-full h-full flex-1">
        <ForceGraph3D
          ref={fgRef}
          width={dimensions.width}
          height={dimensions.height}
          graphData={{ nodes, links }}
          nodeLabel="title"
          nodeColor={(node: any) => node.has_embedding ? '#FF6B1A' : '#555555'}
          nodeResolution={16}
          linkColor={() => 'rgba(255, 107, 26, 0.4)'}
          linkWidth={1.5}
          linkOpacity={0.6}
          onNodeClick={(node: any) => setActiveNoteId(node.id)}
          backgroundColor="#09090b"
          enableNodeDrag={false}
          showNavInfo={false}
        />
      </div>
    </div>
  )
}
