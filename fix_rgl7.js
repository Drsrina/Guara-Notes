const fs = require('fs')
let code = fs.readFileSync('frontend/src/App.tsx', 'utf-8')
code = code.replace(/import \* as ReactGridLayoutModule from 'react-grid-layout'/g, "import * as ReactGridLayoutModule from 'react-grid-layout/index.js'")
fs.writeFileSync('frontend/src/App.tsx', code)
