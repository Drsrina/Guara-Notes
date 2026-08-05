const fs = require('fs')
let code = fs.readFileSync('frontend/src/App.tsx', 'utf-8')
code = code.replace(/<div className="flex h-full w-full bg-bg-primary items-center justify-center relative p-8">/g, "<div className=\"flex h-full w-full bg-bg-primary items-center justify-center relative\">")
code = code.replace(/<div className="w-full max-w-4xl h-full glass-panel flex flex-col relative z-10 overflow-hidden">/g, "<div className=\"w-full h-full glass-panel flex flex-col relative z-10 overflow-hidden\">")
fs.writeFileSync('frontend/src/App.tsx', code)

let code2 = fs.readFileSync('frontend/src/components/Editor.tsx', 'utf-8')
code2 = code2.replace(/<div className="h-full flex flex-col items-center justify-center bg-transparent">/g, "<div className=\"h-full flex flex-col items-center justify-center bg-bg-primary\">")
fs.writeFileSync('frontend/src/components/Editor.tsx', code2)
