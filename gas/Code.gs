// 昼飲みマップ 9/22 — 「行きたい!」と「イチオシ」を保存するWebアプリ
// script.google.com の独立したプロジェクトに貼り付けて、ウェブアプリとしてデプロイする(SHEET_ID のシートに保存)

const NAMES = ['いのぴー', 'まなてぃ', 'たっちゃん', 'まっちょ', 'りん'];
const OWNER = 'りん';
const SHEET_ID = '18V_4waXDc9MOneN6Ez8uS0EkdAW_AUuYwj7BbYLhnFw';  // 昼飲みマップ 9/22 投票

function doGet(e) {
  const p = (e && e.parameter) || {};
  const writing = p.action === 'vote' || p.action === 'pick';
  const lock = LockService.getScriptLock();
  if (writing) lock.waitLock(10000);
  try {
    const ss = SpreadsheetApp.openById(SHEET_ID);
    const votes = sheet_(ss, 'votes', ['shop', 'who', 'updated']);
    const picks = sheet_(ss, 'picks', ['shop', 'comment', 'updated']);

    if (writing) {
      if (NAMES.indexOf(p.who) < 0) return out_({ error: 'unknown member' });
      if (!/^[a-z0-9-]{1,40}$/.test(p.shop || '')) return out_({ error: 'bad shop id' });
    }
    if (p.action === 'vote') {
      const row = find_(votes, r => r[0] === p.shop && r[1] === p.who);
      if (p.on === '1' && row < 0) votes.appendRow([p.shop, p.who, new Date()]);
      if (p.on !== '1' && row > 0) votes.deleteRow(row);
    }
    if (p.action === 'pick') {
      if (p.who !== OWNER) return out_({ error: 'only owner can pick' });
      const row = find_(picks, r => r[0] === p.shop);
      const comment = String(p.comment || '').slice(0, 200);
      if (p.on === '1') {
        if (row > 0) picks.getRange(row, 2, 1, 2).setValues([[comment, new Date()]]);
        else picks.appendRow([p.shop, comment, new Date()]);
      } else if (row > 0) {
        picks.deleteRow(row);
      }
    }
    return out_(state_(votes, picks));
  } finally {
    if (writing) lock.releaseLock();
  }
}

function state_(votes, picks) {
  const wants = {}, pk = {};
  values_(votes).forEach(r => { if (!r[0]) return; (wants[r[0]] = wants[r[0]] || []).push(String(r[1])); });
  values_(picks).forEach(r => { if (r[0]) pk[r[0]] = String(r[1] || ''); });
  return { wants: wants, picks: pk, at: new Date().toISOString() };
}

function sheet_(ss, name, header) {
  let sh = ss.getSheetByName(name);
  if (!sh) { sh = ss.insertSheet(name); sh.appendRow(header); sh.setFrozenRows(1); }
  return sh;
}
function values_(sh) {
  const n = sh.getLastRow();
  return n < 2 ? [] : sh.getRange(2, 1, n - 1, sh.getLastColumn()).getValues();
}
function find_(sh, fn) {
  const v = values_(sh);
  for (let i = 0; i < v.length; i++) if (fn(v[i])) return i + 2;
  return -1;
}
function out_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}
