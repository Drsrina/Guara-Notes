import { useState } from 'react';

export default function AIChat() {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Olá! Sou o seu Guará-Companion. Como posso ajudar com suas anotações hoje?' }
  ]);
  const [input, setInput] = useState('');
  const [scope, setScope] = useState('database');

  const handleSend = () => {
    if (!input.trim()) return;
    
    setMessages(prev => [...prev, { role: 'user', content: input }]);
    
    setTimeout(() => {
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: `Esta é uma resposta simulada para a query: "${input}" no escopo: ${scope}.` 
      }]);
    }, 1000);
    
    setInput('');
  };

  return (
    <div className="flex flex-col h-full bg-zinc-950/80 backdrop-blur-md border-l border-white/10 w-80">
      <div className="p-4 border-b border-white/10 flex justify-between items-center">
        <h2 className="font-semibold text-guara-neon">Guará AI</h2>
        <select 
          className="bg-zinc-900 border border-white/10 rounded px-2 py-1 text-xs text-zinc-300 outline-none"
          value={scope}
          onChange={(e) => setScope(e.target.value)}
        >
          <option value="note">Current Note</option>
          <option value="folder">Current Folder</option>
          <option value="database">Full Database</option>
        </select>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-lg p-3 text-sm ${
              msg.role === 'user' 
                ? 'bg-guara-neon/20 text-zinc-100 border border-guara-neon/30' 
                : 'bg-zinc-900/80 text-zinc-300 border border-white/5'
            }`}>
              {msg.content}
            </div>
          </div>
        ))}
      </div>
      
      <div className="p-4 border-t border-white/10">
        <div className="flex relative">
          <textarea
            className="w-full bg-zinc-900 rounded-lg pr-10 pl-3 py-2 text-sm text-zinc-200 border border-white/10 focus:border-guara-neon/50 outline-none resize-none h-10 min-h-[40px]"
            placeholder="Pergunte algo..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
          />
          <button 
            onClick={handleSend}
            className="absolute right-2 top-1.5 p-1 text-guara-neon hover:text-guara-neon-light"
          >
            ➤
          </button>
        </div>
      </div>
    </div>
  );
}
