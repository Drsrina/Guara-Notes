const fs = require('fs')

let code = fs.readFileSync('frontend/src/App.tsx', 'utf-8')
code = code.replace(/import ReactGridLayout, { WidthProvider, Responsive as ResponsiveGridLayoutAlias } from "react-grid-layout"/g, "import { Responsive, WidthProvider } from 'react-grid-layout'")

code = code.replace(/const ResponsiveGridLayout = WidthProvider\(ResponsiveGridLayoutAlias\)/g, "const ResponsiveGridLayout = WidthProvider(Responsive)")

fs.writeFileSync('frontend/src/App.tsx', code)

let code2 = fs.readFileSync('frontend/src/components/Editor.tsx', 'utf-8')
code2 = code2.replace(/const _handleRestore/g, "const handleRestore")
code2 = code2.replace(/const exportMD/g, "const _exportMD")
code2 = code2.replace(/const exportPDF/g, "const _exportPDF")
fs.writeFileSync('frontend/src/components/Editor.tsx', code2)
