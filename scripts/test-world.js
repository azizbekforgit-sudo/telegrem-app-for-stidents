// Имитатор Roblox-сервера: проверяет весь путь pair -> link -> push -> pull -> win,
// а также отказы на мусор, чужой токен, повторный код и слишком частые запросы.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const port = 3456;
const base = `http://127.0.0.1:${port}/api`;
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'zubrik-world-test-'));

const srv = spawn(process.execPath, ['src/server.js'], {
  env: {
    ...process.env,
    PORT: String(port),
    ALLOW_DEV_AUTH: '1',
    NO_BOT: '1',
    NUDGES: '0',
    DATA_DIR: tmpDir,
    DATABASE_URL: '',
  },
  stdio: ['ignore', 'pipe', 'pipe'],
});

let logs = '';
srv.stdout.on('data', (d) => (logs += d.toString()));
srv.stderr.on('data', (d) => (logs += d.toString()));

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitReady() {
  for (let i = 0; i < 40; i++) {
    try {
      const r = await fetch(`http://127.0.0.1:${port}/healthz`);
      if (r.ok) return;
    } catch { /* wait */ }
    await sleep(150);
  }
  throw new Error('Сервер не запустился:\n' + logs);
}

async function req(p, { method = 'GET', body, headers = {} } = {}) {
  const res = await fetch(base + p, {
    method,
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...headers,
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

const devHeaders = { 'X-Dev-User': '111', 'X-Dev-Name': 'Nargiza' };

try {
  await waitReady();
  console.log('✓ Сервер запущен на :' + port);

  // 1. Статус до сопряжения
  const st0 = await req('/world/status', { headers: devHeaders });
  assert.equal(st0.status, 200);
  assert.equal(st0.data.linked, false);
  assert.equal(st0.data.levels[0].id, '8-1');
  console.log('✓ /world/status до сопряжения');

  // 2. Генерация 6-значного кода и сопряжение
  const pair = await req('/world/pair', { method: 'POST', body: {}, headers: devHeaders });
  assert.equal(pair.status, 200);
  assert.match(pair.data.code, /^\d{6}$/);

  const link = await req('/world/link', {
    method: 'POST',
    body: { code: pair.data.code, robloxUserId: '9001', robloxName: 'NargizaRbx' },
  });
  assert.equal(link.status, 200);
  assert.ok(link.data.token && link.data.token.length >= 32);

  // Повторное использование одноразового кода -> 400
  const link2 = await req('/world/link', {
    method: 'POST',
    body: { code: pair.data.code, robloxUserId: '9002', robloxName: 'Hacker' },
  });
  assert.equal(link2.status, 400);
  console.log('✓ pair -> link (и отказ на повторный код)');

  const rbxHeaders = { 'X-World-Token': link.data.token };

  // 3. Плохая раскладка (1 колонка x 6 рядов) -> 0 звёзд
  const badBoxes = Array.from({ length: 6 }, (_, i) => ({ x: 0, y: i * 60, w: 300, h: 60, color: 'rgb(160, 82, 45)' }));
  const pushBad = await req('/world/push', {
    method: 'POST',
    headers: devHeaders,
    body: { levelId: '8-1', files: { 'style.css': '.bridge { width: 300px; }' }, boxes: badBoxes, container: { x: 0, y: 0, w: 300, h: 360 } },
  });
  assert.equal(pushBad.status, 200);
  assert.equal(pushBad.data.verdict.stars, 0);
  assert.equal(pushBad.data.verdict.gridOk, false);
  console.log('✓ push плохой раскладки -> 0★');

  // 4. Слишком частый push (< 2 с) -> 429
  const pushFast = await req('/world/push', {
    method: 'POST',
    headers: devHeaders,
    body: { levelId: '8-1', files: {}, boxes: badBoxes, container: { x: 0, y: 0, w: 300, h: 360 } },
  });
  assert.equal(pushFast.status, 429);
  console.log('✓ rate limit на push -> 429');

  await sleep(2100);

  // 5. Мусор в push (>24 блоков и невалидные размеры) -> 400
  const tooMany = Array.from({ length: 25 }, () => ({ x: 0, y: 0, w: 50, h: 50 }));
  const pushJunk1 = await req('/world/push', {
    method: 'POST',
    headers: devHeaders,
    body: { levelId: '8-1', files: {}, boxes: tooMany, container: { x: 0, y: 0, w: 300, h: 130 } },
  });
  assert.equal(pushJunk1.status, 400);

  await sleep(2100);

  // 6. Хорошая раскладка (3x2, gap 10px, repeat(3, 1fr)) -> 3★
  const colW = (300 - 20) / 3;
  const goodBoxes = Array.from({ length: 6 }, (_, i) => ({
    x: (i % 3) * (colW + 10),
    y: Math.floor(i / 3) * 70,
    w: colW,
    h: 60,
    color: 'rgb(160, 82, 45)',
  }));
  const pushGood = await req('/world/push', {
    method: 'POST',
    headers: devHeaders,
    body: {
      levelId: '8-1',
      files: { 'style.css': '.bridge { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; width: 300px; }' },
      boxes: goodBoxes,
      container: { x: 0, y: 0, w: 300, h: 130 },
    },
  });
  assert.equal(pushGood.status, 200);
  assert.equal(pushGood.data.verdict.stars, 3);
  console.log('✓ push хорошей раскладки -> 3★');

  // 7. pull от Roblox + отказ на чужой токен + rate limit
  const badPull = await req('/world/pull', { headers: { 'X-World-Token': 'wrong-token-123' } });
  assert.equal(badPull.status, 401);

  const pullOk = await req('/world/pull', { headers: rbxHeaders });
  assert.equal(pullOk.status, 200);
  assert.equal(pullOk.data.state.boxes.length, 6);
  assert.equal(pullOk.data.state.verdict.stars, 3);
  assert.ok(pullOk.data.state.cssLines.length <= 12);

  const pullFast = await req('/world/pull', { headers: rbxHeaders });
  assert.equal(pullFast.status, 429);
  console.log('✓ pull, чужой токен (401) и rate limit (429)');

  // 8. event + win (XP + вещь в комнату, второй win не даёт XP повторно)
  const ev = await req('/world/event', { method: 'POST', headers: rbxHeaders, body: { kind: 'fall', levelId: '8-1' } });
  assert.equal(ev.status, 200);

  const win1 = await req('/world/win', { method: 'POST', headers: rbxHeaders, body: { levelId: '8-1', stars: 3 } });
  assert.equal(win1.status, 200);
  assert.equal(win1.data.xpAwarded, 240);
  assert.equal(win1.data.decorId, 'bridge');
  assert.equal(win1.data.newDecor, true);

  const win2 = await req('/world/win', { method: 'POST', headers: rbxHeaders, body: { levelId: '8-1', stars: 3 } });
  assert.equal(win2.status, 200);
  assert.equal(win2.data.xpAwarded, 0);

  const room = await req('/room', { headers: devHeaders });
  assert.equal(room.status, 200);
  assert.equal(room.data.decor.find((d) => d.id === 'bridge')?.owned, true);
  console.log('✓ win -> +240 XP (один раз) и «Деревянный мостик» в Доме питомца');

  // Проверка, что секреты не попали в логи
  assert.ok(!logs.includes(pair.data.code), 'Код сопряжения попал в логи!');
  assert.ok(!logs.includes(link.data.token), 'Токен попал в логи!');
  console.log('✓ Секреты не попали в логи\nВсе тесты Мира Roblox пройдены!');
} finally {
  srv.kill('SIGTERM');
  fs.rmSync(tmpDir, { recursive: true, force: true });
}
