const fs = require('fs')

let code = fs.readFileSync('frontend/src/App.tsx', 'utf-8')
code = code.replace(/import \* as ReactGridLayoutModule from 'react-grid-layout'\nconst WidthProvider = \(ReactGridLayoutModule as any\)\.WidthProvider \|\| \(\(c: any\) => c\)/g, "import { WidthProvider } from 'react-grid-layout'")
fs.writeFileSync('frontend/src/App.tsx', code)
