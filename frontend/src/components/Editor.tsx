import { useState, useEffect } from 'react';

interface EditorProps {
  initialContent?: string;
}

export default function Editor({ initialContent = "# Nova Nota\n\nComece a escrever..." }: EditorProps) {
  const [content, setContent] = useState(initialContent);

  useEffect(() => {
    const handler = setTimeout(() => {
      console.log('Autosaving content...', content);
    }, 2000);
    return () => clearTimeout(handler);
  }, [content]);

  return (
    <div className="h-full flex flex-col bg-zinc-950">
      <div className="flex-1 p-8 max-w-4xl mx-auto w-full">
        <textarea
          className="w-full h-full bg-transparent text-zinc-200 resize-none outline-none font-mono leading-relaxed"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Comece a escrever..."
        />
      </div>
    </div>
  );
}
