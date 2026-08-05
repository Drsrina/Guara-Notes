const fs = require('fs')
let code = fs.readFileSync('frontend/src/App.tsx', 'utf-8')
code = code.replace(/const WidthProvider = \(RGL as any\)\.WidthProvider \|\| \(\(c: any\) => c\)\n/g, "")
fs.writeFileSync('frontend/src/App.tsx', code)
