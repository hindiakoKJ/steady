const http = require('http')
const fs = require('fs')
const path = require('path')

const PORT = 4200
const DIR = __dirname

const server = http.createServer((req, res) => {
  let filePath = path.join(DIR, req.url === '/' ? 'promo-all.html' : req.url)
  fs.readFile(filePath, (err, data) => {
    if (err) { res.writeHead(404); res.end('Not found'); return }
    const ext = path.extname(filePath)
    const mime = { '.html': 'text/html', '.css': 'text/css', '.js': 'application/javascript', '.png': 'image/png', '.jpg': 'image/jpeg' }
    res.writeHead(200, { 'Content-Type': mime[ext] || 'text/plain' })
    res.end(data)
  })
})

server.listen(PORT, () => console.log(`Promo server running at http://localhost:${PORT}`))
