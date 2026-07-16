const fs = require('fs');
const http = require('http');
const path = require('path');

const root = __dirname;
const port = Number(process.env.PORT || 8000);
const types = {
  '.css': 'text/css; charset=utf-8',
  '.dat': 'text/plain; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.png': 'image/png',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
};

http.createServer((request, response) => {
  let urlPath = decodeURIComponent(request.url.split('?')[0]);
  if (urlPath === '/') urlPath = '/index.html';

  const filePath = path.resolve(root, urlPath.replace(/^\/+/, ''));
  if (!filePath.startsWith(root + path.sep) || filePath.includes(`${path.sep}OLD${path.sep}`)) {
    response.writeHead(403);
    response.end('Forbidden');
    return;
  }

  fs.readFile(filePath, (error, data) => {
    if (error) {
      response.writeHead(404);
      response.end('Not found');
      return;
    }

    response.writeHead(200, {
      'Content-Type': types[path.extname(filePath)] || 'application/octet-stream',
    });
    response.end(data);
  });
}).listen(port, '127.0.0.1', () => {
  console.log(`S&P 500 Lab: http://127.0.0.1:${port}`);
});
