// Рендерит картинки маскотов для сообщений бота: public/m/tg/<маскот>-<поза>.jpg.
// Запуск (нужны запущенный сервер и Playwright):  node scripts/render-mascots.js http://localhost:3000
// Перезапускай, когда меняется рисунок маскота или добавляется новый.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const base = process.argv[2] || 'http://localhost:3000';
const out = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'public', 'm', 'tg');
const POSES = ['happy', 'talk', 'think', 'sad', 'peace', 'love', 'teach', 'cheer'];

fs.mkdirSync(out, { recursive: true });
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 480, height: 480 }, deviceScaleFactor: 1 });
await p.goto(base + '/');
const ids = await p.evaluate(async () => Object.keys((await import('/mascots.js')).MASCOTS));
for (const id of ids) {
  for (const pose of POSES) {
    await p.evaluate(async ([id, pose]) => {
      const m = await import('/mascots.js');
      const c = m.MASCOTS[id].color;
      document.body.innerHTML = `<style>*{animation:none!important;transition:none!important}body{margin:0;overflow:hidden}
        #card{width:480px;height:480px;display:grid;place-items:center;background:radial-gradient(circle at 50% 38%, #fff 0%, color-mix(in srgb, ${c} 26%, #fff) 70%, color-mix(in srgb, ${c} 44%, #fff) 100%)}
        .m-talk .mouth-a,.m-teach .mouth-a{opacity:0!important}.m-talk .mouth-b,.m-teach .mouth-b{opacity:1!important}
        .mascot.raster .r-rest{opacity:0!important}.mascot.raster .r-main{opacity:1!important}</style>
        <div id="card">${m.mascot(id, pose, 400)}</div>`;
      await Promise.all([...document.images, ...document.querySelectorAll('image')].map((im) => (im.decode ? im.decode().catch(() => {}) : null)));
    }, [id, pose]);
    await p.waitForTimeout(250);
    await (await p.$('#card')).screenshot({ path: path.join(out, `${id}-${pose}.jpg`), type: 'jpeg', quality: 86 });
  }
  console.log('rendered', id);
}
await b.close();
