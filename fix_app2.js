const fs = require('fs')

let code = fs.readFileSync('frontend/src/App.tsx', 'utf-8')
code = code.replace(/import { Responsive, WidthProvider } from 'react-grid-layout'/g, "import RGL, { WidthProvider } from 'react-grid-layout'")
code = code.replace(/const ResponsiveGridLayout = WidthProvider\(Responsive\)/g, "const ResponsiveGridLayout = WidthProvider(RGL)")
fs.writeFileSync('frontend/src/App.tsx', code)

let code2 = fs.readFileSync('frontend/src/components/Editor.tsx', 'utf-8')
code2 = code2.replace(/const handleRestore/g, "const _handleRestore")
fs.writeFileSync('frontend/src/components/Editor.tsx', code2)
