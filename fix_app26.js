const fs = require('fs')

let code = fs.readFileSync('frontend/src/App.tsx', 'utf-8')
code = code.replace(/import { WidthProvider } from 'react-grid-layout'/g, "import RGL from 'react-grid-layout'\nconst WidthProvider = (RGL as any).WidthProvider")
fs.writeFileSync('frontend/src/App.tsx', code)
