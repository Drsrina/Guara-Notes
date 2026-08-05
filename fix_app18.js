const fs = require('fs')

let code = fs.readFileSync('frontend/src/App.tsx', 'utf-8')
code = code.replace(/import RGL from 'react-grid-layout'\nconst WidthProvider = \(RGL as any\)\.WidthProvider \|\| \(\(c: any\) => c\)\nconst ResponsiveGridLayout = \(RGL as any\)\.Responsive \|\| RGL\n/g, "import { Responsive as ResponsiveGridLayout, WidthProvider } from 'react-grid-layout'\n")
code = code.replace(/const ResponsiveGridLayoutWithProvider = WidthProvider\(ResponsiveGridLayout\)/g, "const ResponsiveGridLayoutWithProvider = WidthProvider(ResponsiveGridLayout)")
fs.writeFileSync('frontend/src/App.tsx', code)

let code2 = fs.readFileSync('frontend/src/components/Editor.tsx', 'utf-8')
code2 = code2.replace(/<div className="text-5xl mb-4 text-glow-neon text-accent-primary">🐺<\/div>/g, "<div className=\"text-5xl mb-4\">🐺</div>")
fs.writeFileSync('frontend/src/components/Editor.tsx', code2)
