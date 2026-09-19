// index.html(5人で共有する版)と mukomoto.html(見るだけ版)を組み立てる: CSS(既存の head 部分) + src/tail.html + data/*.json
// usage: node build.js
const fs = require('fs');
const path = require('path');
const dir = __dirname;

let html = fs.readFileSync(path.join(dir, 'index.html'), 'utf8');
const cut = html.indexOf('/* people & votes */') >= 0 ? html.indexOf('/* people & votes */') : html.indexOf('@media (min-width:900px)');
if (cut < 0) throw new Error('cut marker not found');
const head = html.slice(0, cut);
const tailSrc = fs.readFileSync(path.join(dir, 'src', 'tail.html'), 'utf8');

const load = f => JSON.parse(fs.readFileSync(path.join(dir, 'data', f), 'utf8'));
const data = {
  koshienguchi: load('koshienguchi.json'),
  fukushima: load('fukushima.json'),
  mukomoto: load('mukomoto.json'),
};

// 開業年(data/years.txt: 1行に「id|年|月」)を反映
const yrs = {};
const yearsFile = path.join(dir, 'data', 'years.txt');
if (fs.existsSync(yearsFile)) {
  for (const line of fs.readFileSync(yearsFile, 'utf8').split(/\r?\n/)) {
    const [id, y, m] = line.trim().split('|');
    if (id && y) yrs[id] = { y: +y, m: m ? +m : null };
  }
}
for (const a of Object.values(data)) for (const s of a.shops) if (yrs[s.id]) { s.year = yrs[s.id].y; s.month = yrs[s.id].m; }

// 食べログのメニューページがあるか(data/menu-status.txt: id|HTTPステータス)
const menuOk = {};
const menuFile = path.join(dir, 'data', 'menu-status.txt');
if (fs.existsSync(menuFile)) {
  for (const line of fs.readFileSync(menuFile, 'utf8').split(/\r?\n/)) {
    const [id, code] = line.trim().split('|');
    if (id) menuOk[id] = code === '200';
  }
}
for (const a of Object.values(data)) for (const s of a.shops) {
  if (!/tabelog\.com/.test(s.url || '')) continue;
  const u = s.url.endsWith('/') ? s.url : s.url + '/';
  s.tlMenu = menuOk[s.id] ? u + 'dtlmenu/' : u + 'dtlphotolst/1/smp2/';
  s.tlMenuLabel = menuOk[s.id] ? '食べログのメニュー表' : '食べログの料理写真';
}
const ids = new Set();
for (const a of Object.values(data)) for (const s of a.shops) {
  if (ids.has(s.id)) throw new Error('duplicate id ' + s.id);
  ids.add(s.id);
}

const api = (fs.existsSync(path.join(dir, 'api-url.txt')) ? fs.readFileSync(path.join(dir, 'api-url.txt'), 'utf8').trim() : '');
const buildId = String(Date.now());

// 1ページ分を書き出す。page=PAGE設定、areas=載せるエリア、edit=見出しなどの差し替え
function page(file, cfg, edit) {
  const areas = Object.fromEntries(cfg.areas.map(k => [k, data[k]]));
  let tail = tailSrc;
  const put = (a, b) => { if (!tail.includes(a)) throw new Error('marker not found: ' + a.slice(0, 50)); tail = tail.replace(a, () => b); };
  put('/*DATA_START*/{}/*DATA_END*/', '/*DATA_START*/' + JSON.stringify(areas).replace(/</g, '\\u003c') + '/*DATA_END*/');
  tail = tail.replace(/\/\*PAGE_START\*\/.*?\/\*PAGE_END\*\//, '/*PAGE_START*/' + JSON.stringify(cfg).replace(/</g, '\\u003c') + '/*PAGE_END*/');
  put("const API = '';", `const API = '${api}';`);
  put("'__BUILD_ID__'", "'" + buildId + "'");
  let h = head;
  for (const [a, b] of (edit || [])) {
    const inHead = h.includes(a), inTail = tail.includes(a);
    if (!inHead && !inTail) throw new Error('edit target not found: ' + a);
    if (inHead) h = h.split(a).join(b);
    if (inTail) tail = tail.split(a).join(b);
  }
  fs.writeFileSync(path.join(dir, file), h + tail);
  console.log('built', file + ':', cfg.areas.map(k => k + ' ' + data[k].shops.length).join(' / '));
}

// 5人で共有する版(甲子園口が最初。プルダウンで福島・武庫元町)
page('index.html', { mode: 'team', prefix: '', areas: ['koshienguchi', 'fukushima', 'mukomoto'], def: 'koshienguchi', owner: 'りん' });

// 見るだけ版(武庫元町)。推しはこの端末だけ、共有コードを入れた人どうしだけで共有
page('mukomoto.html', { mode: 'solo', prefix: 'mk-', areas: ['mukomoto'], def: 'mukomoto', owner: 'りん' }, [
  ['<title>9/22 昼飲みマップ</title>', '<title>ともにぃと行く武庫元町呑み</title>'],
  ['href="manifest.webmanifest"', 'href="manifest-mukomoto.webmanifest"'],
  ['content="昼飲み"', 'content="武庫元町呑み"'],
  ['<h1>昼飲みマップ</h1>', '<h1>ともにぃと行く武庫元町呑み</h1>'],
  ['<span class="date"><b>9/22(火・祝)</b> 5人で昼飲み</span>', '<span class="date"><b>日程未定</b> 昼から飲める店・はしご候補</span>'],
]);
console.log('API', api ? 'set' : 'none', '/ years', Object.keys(yrs).length);
