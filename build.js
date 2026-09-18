// index.html を組み立てる: CSS(既存の head 部分) + src/tail.html + data/*.json
// usage: node build.js
const fs = require('fs');
const path = require('path');
const dir = __dirname;

let html = fs.readFileSync(path.join(dir, 'index.html'), 'utf8');
const cut = html.indexOf('/* people & votes */') >= 0 ? html.indexOf('/* people & votes */') : html.indexOf('@media (min-width:900px)');
if (cut < 0) throw new Error('cut marker not found');
let tail = fs.readFileSync(path.join(dir, 'src', 'tail.html'), 'utf8');

const data = {
  fukushima: JSON.parse(fs.readFileSync(path.join(dir, 'data', 'fukushima.json'), 'utf8')),
  koshienguchi: JSON.parse(fs.readFileSync(path.join(dir, 'data', 'koshienguchi.json'), 'utf8')),
};
const ids = new Set();
for (const a of Object.values(data)) for (const s of a.shops) {
  if (ids.has(s.id)) throw new Error('duplicate id ' + s.id);
  ids.add(s.id);
}
tail = tail.replace('/*DATA_START*/{}/*DATA_END*/', '/*DATA_START*/' + JSON.stringify(data).replace(/</g, '\\u003c') + '/*DATA_END*/');

const api = (fs.existsSync(path.join(dir, 'api-url.txt')) ? fs.readFileSync(path.join(dir, 'api-url.txt'), 'utf8').trim() : '');
tail = tail.replace("const API = '';", `const API = '${api}';`);

fs.writeFileSync(path.join(dir, 'index.html'), html.slice(0, cut) + tail);
console.log('built:', data.fukushima.shops.length, 'fukushima /', data.koshienguchi.shops.length, 'koshienguchi / API', api ? 'set' : 'none');
