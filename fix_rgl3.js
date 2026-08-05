const fs = require('fs')
let code = fs.readFileSync('frontend/src/App.tsx', 'utf-8')
code = code.replace(/\/\/ @ts-ignore\nimport WidthProvider from 'react-grid-layout\/build\/components\/WidthProvider'/g, "")
fs.writeFileSync('frontend/src/App.tsx', code)
