import { Canvas } from '@react-three/fiber';
import { OrbitControls, Sphere } from '@react-three/drei';

const nodes = [
  { id: '1', position: [1, 1, 1], title: 'Note 1' },
  { id: '2', position: [-1, -1, -2], title: 'Note 2' },
  { id: '3', position: [2, -2, 1], title: 'Note 3' },
];

export default function Brain3D() {
  return (
    <div className="w-full h-full bg-zinc-950 relative">
      <div className="absolute top-4 left-4 z-10 glass px-4 py-2 rounded text-sm text-zinc-200">
        3D Brain (Semantic Space)
      </div>
      <Canvas camera={{ position: [0, 0, 5] }}>
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} intensity={1} />
        
        {nodes.map((node) => (
          <Sphere 
             key={node.id} 
             position={node.position as [number, number, number]} 
             args={[0.1, 16, 16]}
          >
            <meshStandardMaterial color="#FF6B1A" emissive="#FF6B1A" emissiveIntensity={0.5} />
          </Sphere>
        ))}
        
        <OrbitControls enablePan={true} enableZoom={true} enableRotate={true} />
      </Canvas>
    </div>
  );
}
