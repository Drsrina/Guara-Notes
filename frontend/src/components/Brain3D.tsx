import { useEffect, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Sphere } from '@react-three/drei'
import { graphApi, type GraphNode } from '../api/graph'
import { useAppStore } from '../store'

function NoteNode({ node, onClick }: { node: GraphNode; onClick: () => void }) {
  const hasEmbed = node.has_embedding
  return (
    <Sphere
      position={[node.x ?? 0, node.y ?? 0, node.z ?? 0]}
      args={[0.12, 16, 16]}
      onClick={(e) => { e.stopPropagation(); onClick() }}
    >
      <meshStandardMaterial
        color={hasEmbed ? '#FF6B1A' : '#555'}
        emissive={hasEmbed ? '#FF6B1A' : '#333'}
        emissiveIntensity={hasEmbed ? 0.6 : 0.1}
      />
    </Sphere>
  )
}

export default function Brain3D() {
  const [nodes, setNodes] = useState<GraphNode[]>([])
  const [loading, setLoading] = useState(true)
  const [ready, setReady] = useState(false)
  const { setActiveNoteId } = useAppStore()

  useEffect(() => {
    graphApi.getBrain3D()
      .then(res => {
        // Se os embeddings ainda não foram calculados, gera posições aleatórias para visualização
        const mapped = res.data.nodes.map(n => ({
          ...n,
          x: n.x !== 0 || n.y !== 0 ? n.x : (Math.random() - 0.5) * 10,
          y: n.y !== 0 || n.z !== 0 ? n.y : (Math.random() - 0.5) * 10,
          z: n.z !== 0 ? n.z : (Math.random() - 0.5) * 10,
        }))
        setNodes(mapped)
        setReady(res.data.ready)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="w-full h-full bg-zinc-950 relative">
      <div className="absolute top-4 left-4 z-10 glass px-4 py-2 rounded-lg text-sm text-zinc-200 flex items-center gap-2">
        <span>Cérebro Semântico 3D</span>
        {loading && <span className="text-zinc-500 text-xs animate-pulse">processando...</span>}
        {!loading && (
          <span className={`text-xs ${ready ? 'text-orange-400' : 'text-zinc-500'}`}>
            {ready ? `${nodes.length} notas indexadas` : 'aguardando embeddings'}
          </span>
        )}
      </div>
      {!ready && !loading && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 glass px-4 py-2 rounded-lg text-xs text-zinc-500 text-center max-w-xs">
          💡 Crie e edite notas para iniciar o processamento de embeddings pelo worker.
        </div>
      )}
      <Canvas camera={{ position: [0, 0, 15] }}>
        <ambientLight intensity={0.4} />
        <pointLight position={[10, 10, 10]} intensity={1.5} />
        <pointLight position={[-10, -10, -10]} intensity={0.5} color="#4ECDC4" />

        {nodes.map((node) => (
          <NoteNode
            key={node.id}
            node={node}
            onClick={() => setActiveNoteId(node.id)}
          />
        ))}

        <OrbitControls enablePan={true} enableZoom={true} enableRotate={true} />
      </Canvas>
    </div>
  )
}
