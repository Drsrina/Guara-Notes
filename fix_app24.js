const fs = require('fs')
let code = fs.readFileSync('frontend/src/App.tsx', 'utf-8')
code = code.replace(/import RGL from 'react-grid-layout'\nimport \* as ReactGridLayoutModule from 'react-grid-layout'\nconst WidthProvider = \(ReactGridLayoutModule as any\)\.WidthProvider \|\| \(\(c: any\) => c\)/g, "import { Responsive as ResponsiveGridLayout, WidthProvider } from 'react-grid-layout'")
code = code.replace(/const ResponsiveGridLayoutWithProvider = WidthProvider\(\(ResponsiveGridLayout as any\).Responsive \|\| ResponsiveGridLayout\)/g, "const ResponsiveGridLayoutWithProvider = WidthProvider(ResponsiveGridLayout)")
fs.writeFileSync('frontend/src/App.tsx', code)

let code2 = fs.readFileSync('frontend/src/components/Editor.tsx', 'utf-8')
code2 = code2.replace(/<div className="h-full flex items-center justify-center bg-bg-primary">/g, "<div className=\"h-full flex items-center justify-center bg-transparent\">")
fs.writeFileSync('frontend/src/components/Editor.tsx', code2)
