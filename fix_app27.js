const fs = require('fs')
let code = fs.readFileSync('frontend/src/App.tsx', 'utf-8')
code = code.replace(/import ResponsiveGridLayout from 'react-grid-layout'\nimport RGL from 'react-grid-layout'\nconst WidthProvider = \(RGL as any\)\.WidthProvider\n/g, "import { Responsive as ResponsiveGridLayout, WidthProvider } from 'react-grid-layout'\n")
fs.writeFileSync('frontend/src/App.tsx', code)
