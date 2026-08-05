const fs = require('fs')

let code = fs.readFileSync('frontend/src/App.tsx', 'utf-8')
code = code.replace(/import { WidthProvider, Responsive } from 'react-grid-layout'/g, "import RGL from 'react-grid-layout'\nconst WidthProvider = (RGL as any).WidthProvider || ((c: any) => c)\nconst ResponsiveGridLayout = (RGL as any).Responsive || RGL")
code = code.replace(/const ResponsiveGridLayoutWithProvider = WidthProvider\(Responsive\)/g, "const ResponsiveGridLayoutWithProvider = WidthProvider(ResponsiveGridLayout)")
fs.writeFileSync('frontend/src/App.tsx', code)
