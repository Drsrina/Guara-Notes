const fs = require('fs')

let code2 = fs.readFileSync('frontend/src/components/Editor.tsx', 'utf-8')
code2 = code2.replace(/<div className="h-full flex items-center justify-center bg-transparent">/g, "<div className=\"h-full flex flex-col items-center justify-center bg-transparent\">")
fs.writeFileSync('frontend/src/components/Editor.tsx', code2)
