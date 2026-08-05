const fs = require('fs')

let code2 = fs.readFileSync('frontend/src/components/Editor.tsx', 'utf-8')
code2 = code2.replace(/export const _handleRestore/g, "const _handleRestore")
code2 = code2.replace(/export const _exportMD/g, "const _exportMD")
code2 = code2.replace(/export const _exportPDF/g, "const _exportPDF")

code2 = code2.replace(/\/\/ eslint-disable-next-line @typescript-eslint\/no-unused-vars\n  const _handleRestore/g, "  // @ts-ignore\n  const _handleRestore")
code2 = code2.replace(/\/\/ eslint-disable-next-line @typescript-eslint\/no-unused-vars\n  const _exportMD/g, "  // @ts-ignore\n  const _exportMD")
code2 = code2.replace(/\/\/ eslint-disable-next-line @typescript-eslint\/no-unused-vars\n  const _exportPDF/g, "  // @ts-ignore\n  const _exportPDF")
fs.writeFileSync('frontend/src/components/Editor.tsx', code2)
