const fs = require('fs')

let code = fs.readFileSync('frontend/src/App.tsx', 'utf-8')
code = code.replace(/import RGL, { WidthProvider } from 'react-grid-layout'/g, "import RGL from 'react-grid-layout';\nconst WidthProvider = require('react-grid-layout').WidthProvider;")
fs.writeFileSync('frontend/src/App.tsx', code)

let code2 = fs.readFileSync('frontend/src/components/Editor.tsx', 'utf-8')
code2 = code2.replace(/const _handleRestore/g, "// eslint-disable-next-line @typescript-eslint/no-unused-vars\n  const _handleRestore")
code2 = code2.replace(/const _exportMD/g, "// eslint-disable-next-line @typescript-eslint/no-unused-vars\n  const _exportMD")
code2 = code2.replace(/const _exportPDF/g, "// eslint-disable-next-line @typescript-eslint/no-unused-vars\n  const _exportPDF")
fs.writeFileSync('frontend/src/components/Editor.tsx', code2)
