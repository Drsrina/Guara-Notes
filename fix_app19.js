const fs = require('fs')

let code = fs.readFileSync('frontend/src/App.tsx', 'utf-8')
code = code.replace(/import { Responsive as ResponsiveGridLayout, WidthProvider } from 'react-grid-layout'\n/g, "import ReactGridLayout from 'react-grid-layout'\nconst WidthProvider = (ReactGridLayout as any).WidthProvider\nconst ResponsiveGridLayout = (ReactGridLayout as any).Responsive\n")
fs.writeFileSync('frontend/src/App.tsx', code)
