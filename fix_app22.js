const fs = require('fs')
let code = fs.readFileSync('frontend/src/App.tsx', 'utf-8')
code = code.replace(/import RGL from 'react-grid-layout'\nconst WidthProvider = \(RGL as any\).WidthProvider \|\| \(\(c: any\) => c\)\nconst ResponsiveGridLayout = \(RGL as any\).Responsive \|\| RGL/g, "import { Responsive as ResponsiveGridLayout, WidthProvider } from 'react-grid-layout'")
fs.writeFileSync('frontend/src/App.tsx', code)
