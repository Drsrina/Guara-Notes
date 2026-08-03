import { useState } from 'react';
import Layout from './components/Layout';
import Editor from './components/Editor';
import AIChat from './components/AIChat';
import Graph2D from './components/Graph2D';
import Brain3D from './components/Brain3D';

function App() {
  const [activeTab, setActiveTab] = useState<'editor' | 'graph2d' | 'brain3d'>('editor');

  return (
    <Layout>
      <div className="flex h-full w-full">
        <div className="flex-1 flex flex-col relative h-full">
            <div className="flex border-b border-white/10 bg-zinc-950 px-2 pt-2 gap-1 z-20">
               <button 
                 className={`px-4 py-2 text-sm rounded-t ${activeTab === 'editor' ? 'bg-white/10 text-guara-neon' : 'text-zinc-400 hover:bg-white/5'}`}
                 onClick={() => setActiveTab('editor')}
               >
                 Editor
               </button>
               <button 
                 className={`px-4 py-2 text-sm rounded-t ${activeTab === 'graph2d' ? 'bg-white/10 text-guara-neon' : 'text-zinc-400 hover:bg-white/5'}`}
                 onClick={() => setActiveTab('graph2d')}
               >
                 Grafo 2D
               </button>
               <button 
                 className={`px-4 py-2 text-sm rounded-t ${activeTab === 'brain3d' ? 'bg-white/10 text-guara-neon' : 'text-zinc-400 hover:bg-white/5'}`}
                 onClick={() => setActiveTab('brain3d')}
               >
                 Cérebro 3D
               </button>
            </div>
            
            <div className="flex-1 overflow-hidden">
                {activeTab === 'editor' && <Editor />}
                {activeTab === 'graph2d' && <Graph2D />}
                {activeTab === 'brain3d' && <Brain3D />}
            </div>
        </div>
        <AIChat />
      </div>
    </Layout>
  );
}

export default App;
