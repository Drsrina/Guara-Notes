import { useEffect, useRef, useState } from 'react';
import ForceGraph2D from 'react-force-graph-2d';

const initData = {
  nodes: [
    { id: '1', name: 'Welcome', val: 1 },
    { id: '2', name: 'Ideas', val: 1 },
    { id: '3', name: 'AI Config', val: 1 }
  ],
  links: [
    { source: '1', target: '2' },
    { source: '2', target: '3' }
  ]
};

export default function Graph2D() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

  useEffect(() => {
    if (containerRef.current) {
      const { clientWidth, clientHeight } = containerRef.current;
      setDimensions({ width: clientWidth, height: clientHeight });
    }
  }, []);

  return (
    <div ref={containerRef} className="w-full h-full bg-zinc-950 overflow-hidden relative">
      <div className="absolute top-4 left-4 z-10 glass px-4 py-2 rounded text-sm">
        Knowledge Graph
      </div>
      <ForceGraph2D
        width={dimensions.width}
        height={dimensions.height}
        graphData={initData}
        nodeLabel="name"
        nodeColor={() => '#FF8C42'}
        linkColor={() => 'rgba(255,255,255,0.2)'}
        backgroundColor="#09090b"
      />
    </div>
  );
}
