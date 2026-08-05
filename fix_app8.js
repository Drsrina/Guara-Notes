const fs = require('fs')

let code2 = fs.readFileSync('frontend/src/components/Editor.tsx', 'utf-8')
code2 = code2.replace(/(\/\/ eslint-disable-next-line @typescript-eslint\/no-unused-vars\n  )+/g, "// eslint-disable-next-line @typescript-eslint/no-unused-vars\n  ")
fs.writeFileSync('frontend/src/components/Editor.tsx', code2)
