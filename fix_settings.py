import re

with open('frontend/src/components/SettingsModal.tsx', 'r') as f:
    content = f.read()

# Add config options for Ollama Host
ollama_ui_search = """              {/* Install New Model */}"""
ollama_ui_replace = """              {/* Configuração do Host */}
              <div className="bg-bg-tertiary/30 p-4 rounded-lg border border-white/10">
                <h4 className="text-sm font-medium mb-3 text-text-primary">Configurar Host (Avançado)</h4>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={ollamaStatus?.ollama_url || ''}
                    onChange={e => setOllamaStatus(s => s ? { ...s, ollama_url: e.target.value } : null)}
                    placeholder="ex: http://localhost:11434"
                    className="flex-1 bg-bg-tertiary border border-white/10 rounded p-2 text-sm focus:border-accent-primary"
                  />
                  <Button variant="primary" onClick={async () => {
                    try {
                      await ollamaApi.updateConfig({ ollama_url: ollamaStatus?.ollama_url });
                      toast.success('Ollama Host URL atualizado. Verificando conexão...');
                      loadOllamaData();
                    } catch(e) {
                      toast.error('Erro ao atualizar Ollama Host URL');
                    }
                  }}>Salvar Host</Button>
                </div>
              </div>

              {/* Install New Model */}"""
content = content.replace(ollama_ui_search, ollama_ui_replace)

editor_ui_search = """              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">Tamanho da Fonte (px)</label>"""
editor_ui_replace = """              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">Fonte da Família</label>
                  <select
                    value={settings.fontFamily}
                    onChange={e => updateSettings({ fontFamily: e.target.value as 'sans' | 'serif' | 'mono' })}
                    className="w-full bg-bg-tertiary border border-white/10 rounded p-2 text-sm text-text-primary focus:border-accent-primary"
                  >
                    <option value="sans">Sans-serif (Moderno)</option>
                    <option value="serif">Serif (Clássico)</option>
                    <option value="mono">Monospace (Técnico)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">Altura da Linha</label>
                  <select
                    value={settings.lineHeight}
                    onChange={e => updateSettings({ lineHeight: e.target.value as 'tight' | 'normal' | 'relaxed' })}
                    className="w-full bg-bg-tertiary border border-white/10 rounded p-2 text-sm text-text-primary focus:border-accent-primary"
                  >
                    <option value="tight">Justo</option>
                    <option value="normal">Normal</option>
                    <option value="relaxed">Relaxado</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">Tamanho da Fonte (px)</label>"""
content = content.replace(editor_ui_search, editor_ui_replace)

with open('frontend/src/components/SettingsModal.tsx', 'w') as f:
    f.write(content)
print("done")
