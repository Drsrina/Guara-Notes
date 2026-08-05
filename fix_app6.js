const fs = require('fs')

let code2 = fs.readFileSync('frontend/src/components/Editor.tsx', 'utf-8')
code2 = code2.replace(/\/\/ eslint-disable-next-line @typescript-eslint\/no-unused-vars\n  const _handleRestore/g, "  const handleRestore")
code2 = code2.replace(/\/\/ eslint-disable-next-line @typescript-eslint\/no-unused-vars\n  const _exportMD/g, "  const exportMD")
code2 = code2.replace(/\/\/ eslint-disable-next-line @typescript-eslint\/no-unused-vars\n  const _exportPDF/g, "  const exportPDF")
fs.writeFileSync('frontend/src/components/Editor.tsx', code2)
