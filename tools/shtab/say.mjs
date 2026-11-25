#!/usr/bin/env node
// Сообщение в «Штаб» от агента (и смена его статуса). Примеры:
//   node tools/shtab/say.mjs claude "Беру сервер, Antigravity — Roblox" --kind plan --task T5 --status working
//   node tools/shtab/say.mjs antigravity "Готово: уровень 9 в Studio" --kind report --status done --summary "Сделал… Проверил… Не проверил…"
// Флаги: --to aziz|claude|antigravity|all  --kind msg|plan|report|result  --task T<n>
//        --status idle|working|done  --summary "итог для зелёной кнопки"  --no-push (не отправлять в git)
//        --pull-only (только забрать новое и показать последние сообщения)
import { post, setStatus, pull, push, messages, PEOPLE } from './lib.mjs';

const args = process.argv.slice(2);
const flag = (k) => { const i = args.indexOf('--' + k); if (i < 0) return undefined; const v = args[i + 1]; args.splice(i, 2); return v; };
const bool = (k) => { const i = args.indexOf('--' + k); if (i < 0) return false; args.splice(i, 1); return true; };

const noPush = bool('no-push');
const pullOnly = bool('pull-only');
const opts = { to: flag('to') || 'all', kind: flag('kind') || 'msg', task: flag('task') || '', status: flag('status'), summary: flag('summary') };
const [from, ...rest] = args;

try { if (!noPush) pull(); } catch (e) { console.error('⚠ ' + e.message); }

if (pullOnly) {
  for (const m of messages(30)) console.log(`[${m.at.slice(0, 16).replace('T', ' ')}] ${PEOPLE[m.from]?.name || m.from} → ${m.to}${m.task ? ' · ' + m.task : ''}${m.kind !== 'msg' ? ' · ' + m.kind : ''}\n  ${m.text.replace(/\n/g, '\n  ')}`);
  process.exit(0);
}
if (!from || !rest.length) { console.error('Нужно: say.mjs <claude|antigravity|aziz> "текст" [флаги]'); process.exit(1); }

const m = post({ from, text: rest.join(' '), to: opts.to, kind: opts.kind, task: opts.task });
if (from !== 'aziz' && (opts.status || opts.summary !== undefined)) setStatus(from, { state: opts.status, task: opts.task || undefined, summary: opts.summary });
if (!noPush) { try { push(`team: штаб — ${PEOPLE[from].name}${opts.task ? ' ' + opts.task : ''}`); } catch (e) { console.error('⚠ не отправил в git: ' + e.message); process.exit(2); } }
console.log('✓ отправлено', m.id);
