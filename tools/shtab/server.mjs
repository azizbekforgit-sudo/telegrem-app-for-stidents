#!/usr/bin/env node
// «Штаб»: чат Азиза, Claude и Antigravity на компьютере Азиза.
// Запуск: npm run shtab  →  открыть http://localhost:4545
// Работает только на этом компьютере (127.0.0.1). Каждые 15 секунд забирает новое из git
// и отправляет сообщения Азиза; агенты пишут через tools/shtab/say.mjs.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { state, post, markSeen, pull, push, AGENTS } from './lib.mjs';

const PORT = Number(process.env.SHTAB_PORT || 4545);
const HTML = path.join(path.dirname(fileURLToPath(import.meta.url)), 'index.html');
const sync = { at: null, ok: true, err: '' };
let busy = false;

function doSync(withPush = false) {
  if (busy) return;
  busy = true;
  try {
    if (withPush) push('team: штаб — Азиз');
    pull();
    sync.ok = true; sync.err = '';
  } catch (e) { sync.ok = false; sync.err = String(e.message || e).slice(0, 300); }
  sync.at = new Date().toISOString();
  busy = false;
}
setInterval(() => doSync(true), 15000);
doSync(true);

const body = (req) => new Promise((ok) => { let b = ''; req.on('data', (c) => { b += c; if (b.length > 20000) req.destroy(); }); req.on('end', () => { try { ok(JSON.parse(b || '{}')); } catch { ok({}); } }); });
const send = (res, code, data, type = 'application/json; charset=utf-8') => { res.writeHead(code, { 'content-type': type, 'cache-control': 'no-store' }); res.end(type.startsWith('application/json') ? JSON.stringify(data) : data); };

http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://x');
    if (req.method === 'GET' && url.pathname === '/') return send(res, 200, fs.readFileSync(HTML, 'utf8'), 'text/html; charset=utf-8');
    if (req.method === 'GET' && url.pathname === '/api/state') return send(res, 200, { ...state(), sync });
    if (req.method === 'POST' && url.pathname === '/api/msg') {
      const b = await body(req);
      const m = post({ from: 'aziz', text: b.text, to: ['all', ...AGENTS].includes(b.to) ? b.to : 'all', kind: b.kind === 'task' ? 'task' : 'msg' });
      setTimeout(() => doSync(true), 50);
      return send(res, 200, { ok: true, m });
    }
    if (req.method === 'POST' && url.pathname === '/api/seen') {
      const b = await body(req);
      if (AGENTS.includes(b.agent)) markSeen(b.agent);
      setTimeout(() => doSync(true), 50);
      return send(res, 200, { ok: true });
    }
    if (req.method === 'POST' && url.pathname === '/api/sync') { doSync(true); return send(res, 200, { ok: sync.ok, sync }); }
    send(res, 404, { error: 'нет такого' });
  } catch (e) { send(res, 400, { error: String(e.message || e) }); }
}).listen(PORT, '127.0.0.1', () => console.log(`Штаб работает: http://localhost:${PORT}`));
