const fs = require('fs')

let code = fs.readFileSync('frontend/src/App.tsx', 'utf-8')
code = code.replace(/import RGL from 'react-grid-layout'\nconst WidthProvider = \(RGL as any\)\.WidthProvider \|\| \(\(c: any\) => c\)\nconst ResponsiveGridLayout = \(RGL as any\)\.Responsive \|\| RGL/g, "import RGL, { WidthProvider, Responsive } from 'react-grid-layout'")
code = code.replace(/const ResponsiveGridLayoutWithProvider = WidthProvider\(ResponsiveGridLayout\)/g, "const ResponsiveGridLayoutWithProvider = WidthProvider(Responsive)")
fs.writeFileSync('frontend/src/App.tsx', code)
