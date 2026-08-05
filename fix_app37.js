const fs = require('fs')
let code = fs.readFileSync('frontend/src/App.tsx', 'utf-8')
code = code.replace(/import \{ Responsive as ResponsiveGridLayout, WidthProvider \} from 'react-grid-layout'/g, "import { Responsive as ResponsiveGridLayout } from 'react-grid-layout'")
fs.writeFileSync('frontend/src/App.tsx', code)
