const fs = require('fs')

let code2 = fs.readFileSync('frontend/src/components/Editor.tsx', 'utf-8')
code2 = code2.replace(/export default function Editor\(\{ noteId, inFocusMode = false, panelId \}: EditorProps\) \{\n  useEffect\(\(\) => \{\n    if \(\!panelId\) return\n    const handleExportMd = \(\) => _exportMD\(\)\n    const handleExportPdf = \(\) => _exportPDF\(\)\n    document.addEventListener\(`export-md-\$\{panelId\}`\, handleExportMd\)\n    document.addEventListener\(`export-pdf-\$\{panelId\}`\, handleExportPdf\)\n    return \(\) => \{\n      document.removeEventListener\(`export-md-\$\{panelId\}`\, handleExportMd\)\n      document.removeEventListener\(`export-pdf-\$\{panelId\}`\, handleExportPdf\)\n    \}\n  \}, \[panelId, content, title\]\)/g, "export default function Editor({ noteId, inFocusMode = false, panelId }: EditorProps) {")

code2 = code2.replace(/const _exportPDF = async \(\) => \{/g, "useEffect(() => {\n    if (!panelId) return\n    const handleExportMd = () => _exportMD()\n    const handleExportPdf = () => _exportPDF()\n    document.addEventListener(`export-md-${panelId}`, handleExportMd)\n    document.addEventListener(`export-pdf-${panelId}`, handleExportPdf)\n    return () => {\n      document.removeEventListener(`export-md-${panelId}`, handleExportMd)\n      document.removeEventListener(`export-pdf-${panelId}`, handleExportPdf)\n    }\n  }, [panelId, content, title])\n\n  const _exportPDF = async () => {")

fs.writeFileSync('frontend/src/components/Editor.tsx', code2)
