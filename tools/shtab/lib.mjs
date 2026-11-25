// «Штаб» — общий чат Азиза, Claude и Antigravity. Всё хранится в git (папка .agents/),
// поэтому его видят и агент на компьютере (Antigravity), и агент в облаке (Claude).
//   .agents/chat.jsonl            — сообщения, по одному JSON в строке (merge=union в .gitattributes)
//   .agents/status/<агент>.json   — статус агента: idle | working | done, задача, итог (пишет только сам агент)
//   .agents/status/seen.json      — когда Азиз последний раз открыл итог каждого агента (пишет только Штаб)
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
export const AG = path.join(ROOT, '.agents');
export const CHAT = path.join(AG, 'chat.jsonl');
export const ST = path.join(AG, 'status');
export const PEOPLE = {
  aziz: { name: 'Азиз', emoji: '👨‍🏫' },
  claude: { name: 'Claude', emoji: '🟠' },
  antigravity: { name: 'Antigravity', emoji: '🟣' },
};
export const AGENTS = ['claude', 'antigravity'];

const git = (...args) => execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
export const branch = () => git('rev-parse', '--abbrev-ref', 'HEAD');

export function readJson(f, def) { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return def; } }
export function writeJson(f, v) { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, JSON.stringify(v, null, 2) + '\n'); }

export function messages(limit = 400) {
  if (!fs.existsSync(CHAT)) return [];
  const out = [];
  for (const line of fs.readFileSync(CHAT, 'utf8').split('\n')) {
    if (!line.trim()) continue;
    try { out.push(JSON.parse(line)); } catch { /* битая строка после слияния — пропускаем */ }
  }
  out.sort((a, b) => String(a.at).localeCompare(String(b.at)));
  return out.slice(-limit);
}

export function post({ from, text, to = 'all', kind = 'msg', task = '' }) {
  if (!PEOPLE[from]) throw new Error('from: aziz | claude | antigravity');
  text = String(text || '').trim();
  if (!text) throw new Error('пустое сообщение');
  const m = { id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), at: new Date().toISOString(), from, to, kind, task: String(task || ''), text: text.slice(0, 8000) };
  fs.mkdirSync(AG, { recursive: true });
  fs.appendFileSync(CHAT, JSON.stringify(m) + '\n');
  return m;
}

export function setStatus(agent, { state, task, summary }) {
  if (!AGENTS.includes(agent)) throw new Error('agent: claude | antigravity');
  const f = path.join(ST, agent + '.json');
  const cur = readJson(f, {});
  const next = { ...cur, at: new Date().toISOString() };
  if (state) next.state = state;
  if (task !== undefined) next.task = task;
  if (summary !== undefined) next.summary = summary;
  writeJson(f, next);
  return next;
}

export function state() {
  const seen = readJson(path.join(ST, 'seen.json'), {});
  const status = Object.fromEntries(AGENTS.map((a) => [a, readJson(path.join(ST, a + '.json'), { state: 'idle' })]));
  for (const a of AGENTS) status[a].unseen = status[a].state === 'done' && (!seen[a] || seen[a] < (status[a].at || ''));
  return { people: PEOPLE, status, messages: messages() };
}

export function markSeen(agent) {
  const f = path.join(ST, 'seen.json');
  const seen = readJson(f, {});
  seen[agent] = new Date().toISOString();
  writeJson(f, seen);
}

// git: забрать новое (merge, без rebase) и отправить своё. Коммитим только файлы Штаба.
const FILES = ['.agents/chat.jsonl', '.agents/status'];
export function pull() {
  const b = branch();
  git('fetch', 'origin', b);
  try { git('merge', '--no-edit', 'FETCH_HEAD'); }
  catch (e) { try { git('merge', '--abort'); } catch { /* */ } throw new Error('не смог слить изменения (конфликт) — разреши вручную: ' + (e.stderr || e.message).slice(0, 300)); }
}
export function push(message = 'team: штаб') {
  git('add', '--', ...FILES.filter((f) => fs.existsSync(path.join(ROOT, f))));
  const staged = git('diff', '--cached', '--name-only', '--', ...FILES);
  if (!staged) return false;
  git('commit', '-m', message, '--', ...FILES.filter((f) => fs.existsSync(path.join(ROOT, f))));
  const b = branch();
  try { git('push', 'origin', 'HEAD:' + b); }
  catch { pull(); git('push', 'origin', 'HEAD:' + b); }
  return true;
}
