const fs = require('fs')
let code = fs.readFileSync('frontend/src/App.tsx', 'utf-8')
code = code.replace(/import { WidthProvider, Responsive as ResponsiveGridLayout } from 'react-grid-layout'/g, "import { Responsive as ResponsiveGridLayout } from 'react-grid-layout'\nimport WidthProvider from 'react-grid-layout/build/components/WidthProvider'")
fs.writeFileSync('frontend/src/App.tsx', code)
