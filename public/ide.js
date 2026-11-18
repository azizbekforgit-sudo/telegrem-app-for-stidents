// Мини-«VS Code» для обучалки: вкладки файлов, подсветка, подсказки при наборе (как IntelliSense),
// живое превью / консоль, поиск ошибок и проверка шагов задания.
import { tr } from './i18n.js';

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
export const fileLang = (name) => {
  const ext = name.split('.').pop().toLowerCase();
  return { html: 'html', css: 'css', js: 'js', jsx: 'js', json: 'json', sh: 'sh', gitignore: 'sh', md: 'sh' }[ext] || (name === '.gitignore' ? 'sh' : 'text');
};
// «язык урока» для файла: по нему решаем, разрешён ли файл на этом уроке
const fileKind = (name) => ({ html: 'html', css: 'css', js: 'js', jsx: 'jsx', json: 'json', sh: 'sh' }[name.split('.').pop().toLowerCase()] || (name === '.gitignore' ? 'git' : 'text'));

// ───────── подсветка ─────────
const SPAN = (c, t) => `<span class="t-${c}">${esc(t)}</span>`;
function hlHtml(src) {
  let out = '';
  const re = /(<!--[\s\S]*?(?:-->|$))|(<\/?)([a-zA-Z][\w-]*)|(\s)([a-zA-Z-:@]+)(=)?("[^"]*"?|'[^']*'?)?|(\/?>)|(<!DOCTYPE[^>]*>?)/gi;
  let last = 0, m, inTag = false;
  while ((m = re.exec(src))) {
    if (m[1]) { out += esc(src.slice(last, m.index)) + SPAN('c', m[1]); }
    else if (m[2]) { out += esc(src.slice(last, m.index)) + SPAN('p', m[2]) + SPAN('tag', m[3]); inTag = true; }
    else if (m[5] && inTag) { out += esc(src.slice(last, m.index)) + esc(m[4]) + SPAN('attr', m[5]) + (m[6] ? SPAN('p', m[6]) : '') + (m[7] ? SPAN('s', m[7]) : ''); }
    else if (m[8]) { out += esc(src.slice(last, m.index)) + SPAN('p', m[8]); inTag = false; }
    else if (m[9]) { out += esc(src.slice(last, m.index)) + SPAN('k', m[9]); }
    else { out += esc(src.slice(last, m.index + m[0].length)); }
    last = m.index + m[0].length;
  }
  return out + esc(src.slice(last));
}
function hlCss(src) {
  let out = '', last = 0, m, depth = 0;
  const re = /(\/\*[\s\S]*?(?:\*\/|$))|("[^"\n]*"?|'[^'\n]*'?)|([{}])|(@[\w-]+)|([\w-]+)(\s*:)(?=[^{}]*[;}\n])|(#[0-9a-fA-F]{3,8}\b)|(-?\d*\.?\d+)(px|%|em|rem|vh|vw|fr|s|ms|deg)?|(!important)|([.#]?[\w-]+)/g;
  while ((m = re.exec(src))) {
    out += esc(src.slice(last, m.index));
    if (m[1]) out += SPAN('c', m[1]);
    else if (m[2]) out += SPAN('s', m[2]);
    else if (m[3]) { out += SPAN('p', m[3]); depth += m[3] === '{' ? 1 : -1; }
    else if (m[4]) out += SPAN('k', m[4]);
    else if (m[5] && depth > 0) out += SPAN('prop', m[5]) + esc(m[6]);
    else if (m[5]) out += SPAN('sel', m[5]) + esc(m[6]);
    else if (m[7]) out += SPAN('n', m[7]);
    else if (m[8]) out += SPAN('n', m[8]) + (m[9] ? SPAN('u', m[9]) : '');
    else if (m[10]) out += SPAN('k', m[10]);
    else if (m[11]) out += depth > 0 ? SPAN('v', m[11]) : SPAN('sel', m[11]);
    last = m.index + m[0].length;
  }
  return out + esc(src.slice(last));
}
const JS_KW = 'let|const|var|if|else|return|function|for|while|of|in|new|typeof|switch|case|break|continue|class|extends|import|export|from|default|async|await|try|catch|throw|this';
function hlJs(src) {
  let out = '', last = 0, m;
  const re = new RegExp(`(\\/\\/.*$|\\/\\*[\\s\\S]*?(?:\\*\\/|$))|(\`(?:[^\`\\\\]|\\\\.)*\`?|"(?:[^"\\\\\\n]|\\\\.)*"?|'(?:[^'\\\\\\n]|\\\\.)*'?)|\\b(${JS_KW})\\b|\\b(true|false|null|undefined)\\b|\\b(\\d+(?:\\.\\d+)?)\\b|([A-Za-z_$][\\w$]*)(?=\\s*\\()|(<\\/?[A-Za-z][\\w.]*|\\/?>)`, 'gm');
  while ((m = re.exec(src))) {
    out += esc(src.slice(last, m.index));
    const c = m[1] ? 'c' : m[2] ? 's' : m[3] ? 'k' : m[4] ? 'b' : m[5] ? 'n' : m[6] ? 'fn' : 'tag';
    out += SPAN(c, m[0]);
    last = m.index + m[0].length;
  }
  return out + esc(src.slice(last));
}
function hlSh(src) {
  return src.split('\n').map((l) => (/^\s*#/.test(l) ? SPAN('c', l) : esc(l).replace(/^(\s*)(git|npm|npx|cd|mkdir|node|ls)\b/, '$1<span class="t-k">$2</span>').replace(/(\s)(-{1,2}[\w-]+)/g, '$1<span class="t-attr">$2</span>').replace(/(&quot;[^&]*&quot;)/g, '<span class="t-s">$1</span>'))).join('\n');
}
export function highlightFile(name, src) {
  const l = fileLang(name);
  return l === 'html' ? hlHtml(src) : l === 'css' ? hlCss(src) : l === 'js' ? hlJs(src) : l === 'json' ? hlJs(src) : l === 'sh' ? hlSh(src) : esc(src);
}

// ───────── словари подсказок ─────────
const HTML_TAGS = 'html head body title meta link style script h1 h2 h3 h4 p a img div span ul ol li button input label form section header footer nav main article aside strong em br hr table tr td th select option textarea video audio iframe'.split(' ');
const HTML_ATTRS = 'class id href src alt style type value placeholder name rel charset lang content width height for action method target disabled required maxlength'.split(' ');
const CSS_PROPS = 'color background background-color font-size font-weight font-family text-align text-decoration line-height letter-spacing width height max-width min-width max-height min-height margin margin-top margin-bottom margin-left margin-right padding padding-top padding-bottom padding-left padding-right border border-radius border-color border-width border-style box-sizing display flex-direction justify-content align-items align-content align-self flex-wrap flex flex-grow flex-shrink flex-basis gap row-gap column-gap grid-template-columns grid-template-rows grid-template-areas grid-column grid-row grid-area position top right bottom left z-index overflow opacity cursor transition transform box-shadow object-fit list-style content visibility'.split(' ');
const CSS_VALUES = {
  display: 'block inline inline-block flex grid none',
  'flex-direction': 'row column row-reverse column-reverse',
  'justify-content': 'flex-start flex-end center space-between space-around space-evenly',
  'align-items': 'stretch flex-start flex-end center baseline',
  'flex-wrap': 'nowrap wrap',
  position: 'static relative absolute fixed sticky',
  'text-align': 'left center right justify',
  'box-sizing': 'border-box content-box',
  'font-weight': 'normal bold 400 700',
  overflow: 'visible hidden auto scroll',
  cursor: 'pointer default',
  'border-style': 'solid dashed dotted none',
  border: '1px 2px solid dashed black',
};
const CSS_COMMON = 'red blue green black white gray orange purple pink yellow transparent auto none center 0 1fr repeat( px % em rem vh vw solid inherit'.split(' ');
const JS_WORDS = 'let const var function return if else for while console.log document querySelector querySelectorAll getElementById addEventListener textContent innerHTML classList add remove toggle contains style value length push pop forEach map filter find includes indexOf toUpperCase toLowerCase alert prompt Number String parseInt Math.random Math.floor true false null undefined createElement append appendChild preventDefault target fetch then json async await JSON.stringify JSON.parse setTimeout setInterval localStorage useState export default import from'.split(' ');
const SH_WORDS = 'git init git add . git commit -m git status git log git push git pull git clone git branch git checkout npm init npm install npm run dev npm create vite@latest cd node_modules'.split(' ');
const JS_EVENTS = 'click input submit mouseover mouseout keydown change load DOMContentLoaded'.split(' ');

// текущее «слово» перед курсором и что подсказывать
function context(name, text, pos) {
  const l = fileLang(name);
  const before = text.slice(0, pos);
  if (l === 'html') {
    let m = before.match(/<\/?([a-zA-Z][\w-]*)?$/);
    if (m) return { word: m[1] || '', list: HTML_TAGS, kind: before.endsWith('</' + (m[1] || '')) ? 'close' : 'tag' };
    m = before.match(/<[a-zA-Z][^>]*\s([a-zA-Z-]*)$/);
    if (m) return { word: m[1], list: HTML_ATTRS, kind: 'attr' };
    // внутри style="…" — свойства CSS
    m = before.match(/style="[^"]*?([\w-]*)$/);
    if (m) return { word: m[1], list: CSS_PROPS, kind: 'prop' };
    return null;
  }
  if (l === 'css') {
    const open = before.lastIndexOf('{') > before.lastIndexOf('}');
    if (!open) return null;
    let m = before.match(/([\w-]+)\s*:\s*([^;{}]*\s)?([\w#(-]*)$/);
    if (m) return { word: m[3], list: [...(CSS_VALUES[m[1]] || '').split(' ').filter(Boolean), ...CSS_COMMON], kind: 'value' };
    m = before.match(/(?:^|[;{\s])([\w-]*)$/);
    if (m) return { word: m[1], list: CSS_PROPS, kind: 'prop' };
    return null;
  }
  if (l === 'js') {
    let m = before.match(/addEventListener\(\s*["']([\w]*)$/);
    if (m) return { word: m[1], list: JS_EVENTS, kind: 'event' };
    m = before.match(/([\w$.]*)$/);
    if (m) { const w = m[1]; const dot = w.lastIndexOf('.'); return { word: dot >= 0 ? w.slice(dot + 1) : w, list: JS_WORDS.flatMap((x) => (dot >= 0 ? [x.split('.').pop()] : [x])), kind: 'js' }; }
  }
  if (l === 'sh') {
    const m = before.match(/([\w@.-]*)$/);
    if (m) return { word: m[1], list: SH_WORDS, kind: 'sh' };
  }
  return null;
}
function suggestions(name, text, pos) {
  const c = context(name, text, pos);
  if (!c || !c.word) return null;
  const w = c.word.toLowerCase();
  // слова, которые уже есть в файле (имена классов, переменных) — тоже в подсказки
  const own = fileLang(name) === 'js' || c.kind === 'value' ? [...new Set(text.match(/[A-Za-z_$][\w$-]{2,}/g) || [])] : [];
  const seen = new Set();
  const list = [...c.list, ...own].filter((x) => x && x.toLowerCase().startsWith(w) && x.toLowerCase() !== w && !seen.has(x) && seen.add(x)).slice(0, 7);
  return list.length ? { ...c, list } : null;
}

// ───────── поиск ошибок ─────────
const CSS_KNOWN = new Set([...CSS_PROPS, 'background-image', 'font-style', 'text-transform', 'outline', 'border-top', 'border-bottom', 'border-left', 'border-right', 'grid-template', 'place-items', 'justify-items', 'order', 'flex-flow', 'white-space', 'word-break', 'aspect-ratio', 'inset', 'filter', 'animation', 'background-size', 'background-position', 'background-repeat', 'fill', 'stroke', 'user-select', 'pointer-events', 'resize', 'outline-offset', 'text-shadow', 'vertical-align', 'list-style-type', 'border-collapse', 'scroll-behavior', 'accent-color']);
const MISSPELL = { colour: 'color', backround: 'background', bakground: 'background', heigth: 'height', widht: 'width', 'font-wieght': 'font-weight', 'justify-contents': 'justify-content', 'align-item': 'align-items', 'text-allign': 'text-align', boder: 'border', paddng: 'padding', margn: 'margin', 'flex-derection': 'flex-direction', dispaly: 'display' };
const VOID = new Set('br hr img input meta link source area col embed wbr'.split(' '));
const lineOf = (text, idx) => text.slice(0, idx).split('\n').length;

function lintCss(name, src) {
  const out = [];
  const s = src.replace(/\/\*[\s\S]*?\*\//g, (x) => x.replace(/[^\n]/g, ' '));
  let depth = 0;
  for (let i = 0; i < s.length; i++) { if (s[i] === '{') depth++; if (s[i] === '}') { depth--; if (depth < 0) { out.push({ file: name, line: lineOf(s, i), msg: 'Лишняя скобка }', sev: 2 }); depth = 0; } } }
  if (depth > 0) out.push({ file: name, line: lineOf(s, s.lastIndexOf('{')), msg: 'Не закрыта скобка { — допиши }', sev: 2 });
  // внутри правила: «prop: value» без «;», за которым идёт ещё одно свойство (две пары в одном куске)
  for (const m of s.matchAll(/\{([^{}]*)\}/g)) {
    let off = m.index + 1;
    for (const chunk of m[1].split(';')) {
      const decl = chunk.match(/([\w-]+)\s*:\s*([^:\n]*?)\s*\n\s*([\w-]+)\s*:/);
      if (decl && !/^(hover|focus|active|before|after)$/.test(decl[3])) out.push({ file: name, line: lineOf(s, off + chunk.indexOf(decl[0])), msg: `Нет «;» после ${decl[1]}: ${decl[2]}`, sev: 2 });
      off += chunk.length + 1;
    }
  }
  // свойство без «;», а за ним ещё одно свойство
  const lines = s.split('\n');
  let d = 0;
  lines.forEach((ln, k) => {
    const t = ln.trim();
    const inside = d > 0 || t.includes('{');
    for (const ch of ln) { if (ch === '{') d++; if (ch === '}') d = Math.max(0, d - 1); }
    if (!inside) return;
    const m = t.match(/^([\w-]+)\s*:\s*([^;{}]+)$/);
    const next = (lines.slice(k + 1).find((x) => x.trim()) || '').trim();
    if (m && /^[\w-]+\s*:/.test(next)) out.push({ file: name, line: k + 1, msg: `Нет «;» после ${m[1]}: ${m[2].trim()}`, sev: 2 });
    const body = t.includes('{') ? t.slice(t.indexOf('{') + 1) : t;
    for (const pm of body.matchAll(/(?:^\s*|[;{]\s*)([a-z-]+)\s*:(?!:)/g)) {
      const p = pm[1];
      if (MISSPELL[p]) out.push({ file: name, line: k + 1, msg: `Опечатка: ${p} — правильно ${MISSPELL[p]}`, sev: 2 });
      else if (!CSS_KNOWN.has(p) && !p.startsWith('-') && p.length > 2 && !/^(hover|focus|active|root|before|after|nth-child|first-child|last-child)$/.test(p)) out.push({ file: name, line: k + 1, msg: `Неизвестное свойство ${p}`, sev: 1 });
    }
    if (/^(width|height|margin|padding|font-size|top|left|right|bottom|gap|border-radius)\s*:\s*\d+\s*(;|$)/.test(t) && !/:\s*0\s*(;|$)/.test(t)) out.push({ file: name, line: k + 1, msg: 'Число без единиц — допиши px', sev: 1 });
  });
  return out;
}
function lintHtml(name, src) {
  const out = [];
  const s = src.replace(/<!--[\s\S]*?-->/g, (x) => x.replace(/[^\n]/g, ' ')).replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, (x) => x.replace(/[^\n]/g, ' '));
  const stack = [];
  for (const m of s.matchAll(/<(\/?)([a-zA-Z][\w-]*)[^>]*?(\/?)>/g)) {
    const tag = m[2].toLowerCase();
    if (VOID.has(tag) || m[3]) continue;
    if (!m[1]) stack.push({ tag, i: m.index });
    else {
      const k = stack.map((x) => x.tag).lastIndexOf(tag);
      if (k === -1) out.push({ file: name, line: lineOf(s, m.index), msg: `Лишний закрывающий тег </${tag}>`, sev: 2 });
      else { for (const x of stack.splice(k)) if (x.tag !== tag) out.push({ file: name, line: lineOf(s, x.i), msg: `Тег <${x.tag}> не закрыт`, sev: 2 }); }
    }
  }
  for (const x of stack) out.push({ file: name, line: lineOf(s, x.i), msg: `Тег <${x.tag}> не закрыт — нужен </${x.tag}>`, sev: 2 });
  for (const m of s.matchAll(/<(h[1-6]|p|li)>[^<\n]*<\1>/g)) out.push({ file: name, line: lineOf(s, m.index), msg: `Во втором <${m[1]}> забыта косая черта: </${m[1]}>`, sev: 2 });
  for (const m of s.matchAll(/<link(?![^>]*rel=)[^>]*>/g)) out.push({ file: name, line: lineOf(s, m.index), msg: 'В <link> нет rel="stylesheet"', sev: 2 });
  for (const m of s.matchAll(/class\s*=\s*"\.[\w-]/g)) out.push({ file: name, line: lineOf(s, m.index), msg: 'В HTML класс пишут без точки: class="box"', sev: 2 });
  return out;
}
function lintJs(name, src) {
  const out = [];
  // import/export работают только в модулях — для проверки синтаксиса убираем сами слова
  const plain = src.replace(/^\s*import\b[^\n]*$/gm, '').replace(/^(\s*)export\s+default\s+(?=function|class|async)/gm, '$1').replace(/^(\s*)export\s+default\s+/gm, '$1void ').replace(/^(\s*)export\s+/gm, '$1');
  // script.js — обычный скрипт (await только внутри async), остальные .js — модули (await можно сверху)
  try { if (name === 'script.js') new Function(plain); else new Function(`return async () => {\n${plain}\n}`); } // eslint-disable-line no-new-func
  catch (e) {
    const msg = String(e.message || e);
    const ru = /await is only valid/.test(msg) ? 'await можно писать только внутри async-функции' : /Unexpected end/.test(msg) ? 'Код оборвался — не закрыта скобка } или )' : /missing \) after/.test(msg) ? 'Не хватает скобки )' : /Unexpected token/.test(msg) ? `Лишний или неверный символ: ${msg.replace(/^.*Unexpected token\s*/, '')}` : /Invalid or unexpected token/.test(msg) ? 'Незакрытая кавычка или странный символ' : `Ошибка: ${msg}`;
    out.push({ file: name, line: 0, msg: ru, sev: 2 });
  }
  for (const m of src.matchAll(/addEventListener\(\s*["'](Click|onclick|onClick|Input|Submit)["']/g)) out.push({ file: name, line: lineOf(src, m.index), msg: `Событие пишут маленькими буквами и без on: "${m[1].replace(/^on/i, '').toLowerCase()}"`, sev: 2 });
  for (const m of src.matchAll(/addEventListener\(\s*["']\w+["']\s*,\s*([A-Za-z_$][\w$]*)\(\)\s*\)/g)) out.push({ file: name, line: lineOf(src, m.index), msg: `Функцию передают без скобок: ${m[1]}, а не ${m[1]}()`, sev: 2 });
  for (const m of src.matchAll(/console\.Log|Console\.log|document\.QuerySelector|queryselector/g)) out.push({ file: name, line: lineOf(src, m.index), msg: `Регистр букв важен: ${m[0]}`, sev: 2 });
  return out;
}
export function lint(files) {
  const out = [];
  for (const [name, src] of Object.entries(files)) {
    const l = fileLang(name);
    if (!src.trim()) continue;
    if (l === 'css') out.push(...lintCss(name, src));
    else if (l === 'html') out.push(...lintHtml(name, src));
    else if (l === 'js' && !name.endsWith('.jsx')) out.push(...lintJs(name, src));
  }
  const seen = new Set();
  return out.filter((p) => { const k = `${p.file}:${p.line}:${p.msg}`; return !seen.has(k) && seen.add(k); });
}

// «Это другой урок»: на уроке разрешены только свои языки
export function wrongTopic(files, allow) {
  if (!allow?.length) return null;
  const has = (k) => allow.includes(k);
  for (const [name, src] of Object.entries(files)) {
    const k = fileKind(name);
    if (!has(k) && !(k === 'jsx' && has('js'))) return { file: name, what: k };
    const plain = src.replace(/<!--[\s\S]*?-->|\/\*[\s\S]*?\*\//g, '');
    if (k === 'html' && !has('js') && /<script\b/i.test(plain)) return { file: name, what: 'js' };
    if (k === 'html' && !has('css') && /<style\b|<link\b[^>]*stylesheet/i.test(plain)) return { file: name, what: 'css' };
    if (k === 'css' && /\b(function|const|let|var|document|console)\b|=>/.test(plain)) return { file: name, what: 'js' };
  }
  return null;
}

// ───────── проверка шагов задания ─────────
const stripComments = (name, src) => (fileLang(name) === 'html' ? src.replace(/<!--[\s\S]*?-->/g, '') : fileLang(name) === 'css' ? src.replace(/\/\*[\s\S]*?\*\//g, '') : fileLang(name) === 'js' ? src.replace(/\/\*[\s\S]*?\*\/|(^|[^:])\/\/.*$/gm, '$1') : src);
export function checkSteps(task, files, console_ = '') {
  return (task.steps || []).map((st) => {
    try {
      if (st.out) return new RegExp(st.out, 'm').test(console_);
      const src = stripComments(st.file, files[st.file] || '');
      const ok = new RegExp(st.re, st.flags ?? 'i').test(src);
      return st.not ? !ok : ok;
    } catch { return false; }
  });
}

// ───────── превью: страница или консоль ─────────
export function buildPage(files) {
  let html = files['index.html'] ?? '';
  const css = Object.entries(files).filter(([n]) => n.endsWith('.css')).map(([, s]) => s).join('\n');
  const js = files['script.js'] ?? '';
  if (!html.trim() && js) html = '<!DOCTYPE html><html><body></body></html>';
  html = html.replace(/<link[^>]*href=["'][^"']*\.css["'][^>]*>/gi, '').replace(/<script[^>]*src=["'][^"']*\.js["'][^>]*>\s*<\/script>/gi, '');
  const head = `<meta name="viewport" content="width=device-width,initial-scale=1"><style>body{font-family:system-ui,sans-serif}</style><style>${css.replace(/<\/style/gi, '')}</style>`;
  const spy = `<script>(function(){var send=function(t,a){try{parent.postMessage({ide:1,t:t,a:[].map.call(a,function(x){try{return typeof x==='object'?JSON.stringify(x):String(x)}catch(e){return String(x)}}).join(' ')},'*')}catch(e){}};['log','info','warn','error'].forEach(function(k){var o=console[k];console[k]=function(){send(k,arguments);o.apply(console,arguments)}});window.onerror=function(m,s,l){send('error',[m+(l?' (строка '+l+')':'')])};window.alert=function(m){send('log',['alert: '+m])};window.prompt=function(m){send('log',['prompt: '+m]);return ''};})();<\/script>`;
  // защита от бесконечного цикла: каждый виток считается, после 100 000 — стоп с понятной ошибкой
  const guarded = js.replace(/\b(for|while)\s*\(((?:[^()]|\([^()]*\))*)\)\s*\{/g, '$1 ($2) { if (++__lg > 100000) throw new Error("Бесконечный цикл! Он не останавливается — проверь условие");');
  const body = js ? `<script>${spy.slice(8, -9)}\n;var __lg=0;try{\n${guarded.replace(/<\/script/gi, '<\\/script')}\n}catch(e){console.error(e.message)}<\/script>` : spy;
  if (/<head[^>]*>/i.test(html)) html = html.replace(/<head[^>]*>/i, (h) => h + head);
  else html = head + html;
  if (/<\/body>/i.test(html)) html = html.replace(/<\/body>/i, body + '</body>');
  else html += body;
  return html;
}

// ───────── сам редактор ─────────
// files: { name: text }, allow: ['html','css','js'], onChange(files, name), onBlocked(kind), canRun: показывать ли превью
export function createIde(host, { files, open, allow = [], onChange, onBlocked, onConsole, title = 'VS Code', extraFiles = [] }) {
  const F = { ...files };
  let cur = open && F[open] != null ? open : Object.keys(F)[0];
  let sug = null, sel = 0;
  const hasPage = () => Boolean(F['index.html'] != null || F['script.js'] != null);
  const runnable = () => !Object.keys(F).some((n) => /\.(jsx|json|sh)$|^\.gitignore$/.test(n)) && hasPage();
  host.innerHTML = `
    <div class="ide">
      <div class="ide-bar"><i></i><i></i><i></i><span>${esc(title)}</span></div>
      <div class="ide-tabs" data-tabs></div>
      <div class="ide-main">
        <div class="ide-gutter" data-gutter></div>
        <div class="ide-code">
          <pre class="ide-hl" data-hl aria-hidden="true"></pre>
          <textarea class="ide-ta" data-ta spellcheck="false" autocapitalize="off" autocomplete="off" autocorrect="off" data-noemoji></textarea>
          <div class="ide-sug" data-sug hidden></div>
        </div>
      </div>
      <div class="ide-keys" data-keys>${['Tab', '<', '>', '/', '{', '}', '(', ')', ';', ':', '"', '=', '.', '#'].map((k) => `<button type="button" data-k="${esc(k)}">${k === 'Tab' ? '⇥' : esc(k)}</button>`).join('')}</div>
      <div class="ide-panel">
        <div class="ide-ptabs"><button data-pt="problems" class="on">${tr('Проблемы')} <b data-pcount>0</b></button><button data-pt="run">${tr('Результат')}</button></div>
        <div class="ide-problems" data-problems></div>
        <div class="ide-run" data-run hidden><iframe data-frame sandbox="allow-scripts allow-modals" title="preview"></iframe><pre class="ide-console" data-cons></pre></div>
      </div>
    </div>`;
  const $ = (s) => host.querySelector(s);
  const ta = $('[data-ta]'), hl = $('[data-hl]'), gut = $('[data-gutter]'), box = $('[data-sug]');
  let consoleText = '';
  let frameTimer = null;
  const frame = $('[data-frame]');
  const onMsg = (e) => { if (e.source !== frame.contentWindow || !e.data?.ide) return; consoleText += `${e.data.t === 'error' ? '✖ ' : ''}${e.data.a}\n`; $('[data-cons]').textContent = consoleText; onConsole?.(consoleText); };
  window.addEventListener('message', onMsg);

  function tabs() {
    const names = Object.keys(F);
    $('[data-tabs]').innerHTML = names.map((n) => `<button class="ide-tab ${n === cur ? 'on' : ''} f-${fileLang(n)}" data-f="${esc(n)}"><i></i>${esc(n)}</button>`).join('') +
      (extraFiles.filter((n) => F[n] == null).length ? `<button class="ide-tab add" data-add title="${esc(tr('Новый файл'))}">＋</button>` : '');
    host.querySelectorAll('[data-f]').forEach((b) => (b.onclick = () => { cur = b.dataset.f; load(); }));
    const add = $('[data-add]');
    if (add) add.onclick = () => {
      const free = extraFiles.filter((n) => F[n] == null);
      const pick = document.createElement('div');
      pick.className = 'ide-pick';
      pick.innerHTML = free.map((n) => `<button data-nf="${esc(n)}" class="f-${fileLang(n)}"><i></i>${esc(n)}</button>`).join('');
      add.after(pick);
      pick.querySelectorAll('[data-nf]').forEach((b) => (b.onclick = () => {
        const n = b.dataset.nf;
        pick.remove();
        const kind = fileKind(n);
        if (allow.length && !allow.includes(kind)) return onBlocked?.(kind, n);
        F[n] = ''; cur = n; load(); changed();
      }));
      setTimeout(() => document.addEventListener('click', function off(e) { if (!pick.contains(e.target)) { pick.remove(); document.removeEventListener('click', off); } }), 0);
    };
  }
  function paint() {
    const text = ta.value;
    hl.innerHTML = highlightFile(cur, text) + '\n';
    const n = text.split('\n').length;
    gut.innerHTML = Array.from({ length: n }, (_, i) => `<span>${i + 1}</span>`).join('');
  }
  function load() { ta.value = F[cur] ?? ''; tabs(); paint(); hideSug(); }
  function changed() {
    F[cur] = ta.value;
    paint();
    onChange?.({ ...F }, cur);
    clearTimeout(frameTimer);
    frameTimer = setTimeout(run, 700);
  }
  function run() {
    if (!runnable()) { $('[data-pt="run"]').hidden = true; return; }
    $('[data-pt="run"]').hidden = false;
    consoleText = '';
    $('[data-cons]').textContent = '';
    frame.srcdoc = buildPage(F);
    const onlyJs = F['index.html'] == null;
    frame.hidden = onlyJs;
    $('[data-cons]').hidden = !(F['script.js'] != null);
  }
  // ── подсказки ──
  function caretXY() {
    const pos = ta.selectionStart;
    const before = ta.value.slice(0, pos).split('\n');
    const line = before.length - 1, col = before[before.length - 1].length;
    const cs = getComputedStyle(ta);
    const lh = parseFloat(cs.lineHeight) || 20, cw = (parseFloat(cs.fontSize) || 14) * 0.6;
    return { x: parseFloat(cs.paddingLeft) + col * cw - ta.scrollLeft, y: parseFloat(cs.paddingTop) + (line + 1) * lh - ta.scrollTop };
  }
  function showSug() {
    sug = suggestions(cur, ta.value, ta.selectionStart);
    if (!sug) return hideSug();
    sel = 0;
    const { x, y } = caretXY();
    box.style.left = `${Math.max(0, Math.min(x, ta.clientWidth - 190))}px`;
    box.style.top = `${y + 2}px`;
    box.innerHTML = sug.list.map((w, i) => `<button type="button" class="${i === sel ? 'on' : ''}" data-s="${i}"><i>${sug.kind === 'tag' || sug.kind === 'close' ? '&lt;&gt;' : sug.kind === 'prop' ? '⧉' : sug.kind === 'value' || sug.kind === 'event' ? '◆' : 'ƒ'}</i>${esc(w)}</button>`).join('');
    box.hidden = false;
    box.querySelectorAll('[data-s]').forEach((b) => b.addEventListener('pointerdown', (e) => { e.preventDefault(); accept(Number(b.dataset.s)); }));
  }
  function hideSug() { box.hidden = true; sug = null; }
  function insert(text, caretBack = 0) {
    const s = ta.selectionStart, e = ta.selectionEnd;
    ta.setRangeText(text, s, e, 'end');
    if (caretBack) ta.selectionStart = ta.selectionEnd = ta.selectionEnd - caretBack;
    changed();
  }
  function accept(i) {
    if (!sug) return;
    const w = sug.list[i];
    const pos = ta.selectionStart;
    ta.selectionStart = pos - sug.word.length;
    let text = w, back = 0;
    if (sug.kind === 'tag' && !VOID.has(w)) { const after = ta.value.slice(pos); if (!after.startsWith('>')) { text = `${w}></${w}>`; back = w.length + 3; } }
    else if (sug.kind === 'tag') text = `${w}>`;
    else if (sug.kind === 'close') text = `${w}>`;
    else if (sug.kind === 'attr') { text = `${w}=""`; back = 1; }
    else if (sug.kind === 'prop' && fileLang(cur) === 'css') text = `${w}: `;
    else if (sug.kind === 'prop') text = `${w}: `;
    else if (sug.kind === 'js' && /^(querySelector|querySelectorAll|getElementById|addEventListener|log|createElement|append|appendChild|forEach|map|filter|push|toggle|add|remove|contains|includes|fetch|setTimeout|alert|prompt|preventDefault|toUpperCase|toLowerCase|useState)$/.test(w.split('.').pop())) { text = `${w}()`; back = 1; }
    insert(text, back);
    hideSug();
  }
  const PAIRS = { '(': ')', '[': ']', '{': '}', '"': '"', "'": "'", '`': '`' };
  ta.addEventListener('keydown', (e) => {
    if (sug && !box.hidden) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); sel = (sel + (e.key === 'ArrowDown' ? 1 : -1) + sug.list.length) % sug.list.length; box.querySelectorAll('button').forEach((b, k) => b.classList.toggle('on', k === sel)); return; }
      if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); return accept(sel); }
      if (e.key === 'Escape') return hideSug();
    }
    if (e.key === 'Tab') { e.preventDefault(); return insert('  '); }
    if (e.key === 'Enter') {
      e.preventDefault();
      const before = ta.value.slice(0, ta.selectionStart);
      const indent = (before.split('\n').pop().match(/^\s*/) || [''])[0];
      const prev = before.trimEnd().slice(-1);
      const next = ta.value.slice(ta.selectionStart, ta.selectionStart + 1);
      if ((prev === '{' || prev === '>') && (next === '}' || ta.value.slice(ta.selectionStart).startsWith('</'))) { insert(`\n${indent}  \n${indent}`, indent.length + 1); return; }
      return insert(`\n${indent}${prev === '{' ? '  ' : ''}`);
    }
    const nxt = ta.value[ta.selectionStart];
    if (Object.values(PAIRS).includes(e.key) && nxt === e.key && ta.selectionStart === ta.selectionEnd) { e.preventDefault(); ta.selectionStart = ta.selectionEnd = ta.selectionStart + 1; return; }
    if (PAIRS[e.key] && ta.selectionStart === ta.selectionEnd && (!nxt || /[\s)\]};>]/.test(nxt))) { e.preventDefault(); insert(e.key + PAIRS[e.key], 1); return; }
    if (e.key === 'Backspace' && ta.selectionStart === ta.selectionEnd) {
      const p = ta.value[ta.selectionStart - 1];
      if (PAIRS[p] && nxt === PAIRS[p]) { e.preventDefault(); ta.setRangeText('', ta.selectionStart - 1, ta.selectionStart + 1, 'end'); changed(); }
    }
  });
  ta.addEventListener('input', () => { changed(); showSug(); });
  ta.addEventListener('click', hideSug);
  ta.addEventListener('blur', () => setTimeout(hideSug, 150));
  ta.addEventListener('scroll', () => { hl.scrollTop = ta.scrollTop; hl.scrollLeft = ta.scrollLeft; gut.scrollTop = ta.scrollTop; hideSug(); });
  host.querySelectorAll('[data-k]').forEach((b) => b.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    ta.focus();
    const k = b.dataset.k;
    if (k === 'Tab') { if (sug && !box.hidden) accept(sel); else insert('  '); return; }
    if (PAIRS[k]) insert(k + PAIRS[k], 1); else insert(k);
    showSug();
  }));
  host.querySelectorAll('[data-pt]').forEach((b) => (b.onclick = () => {
    host.querySelectorAll('[data-pt]').forEach((x) => x.classList.toggle('on', x === b));
    $('[data-problems]').hidden = b.dataset.pt !== 'problems';
    $('[data-run]').hidden = b.dataset.pt !== 'run';
    if (b.dataset.pt === 'run') run();
  }));
  load();
  run();
  return {
    files: () => ({ ...F }),
    open(name) { if (F[name] != null) { cur = name; load(); } },
    current: () => cur,
    setProblems(list) {
      const tabTo = (k) => host.querySelector(`[data-pt="${k}"]`)?.click();
      if (list.some((p) => p.sev >= 2)) { if ($('[data-problems]').hidden) tabTo('problems'); }
      else if (runnable() && !$('[data-problems]').hidden && !list.length) tabTo('run');
      $('[data-pcount]').textContent = list.length;
      $('[data-pcount]').className = list.some((p) => p.sev >= 2) ? 'bad' : list.length ? 'warn' : '';
      $('[data-problems]').innerHTML = list.length ? list.map((p) => `<div class="p${p.sev}"><i>${p.sev >= 2 ? '✖' : '⚠'}</i><span>${esc(tr(p.msg))}</span><em>${esc(p.file)}${p.line ? `:${p.line}` : ''}</em></div>`).join('') : `<div class="ok">✓ ${esc(tr('Ошибок нет'))}</div>`;
    },
    console: () => consoleText,
    focus: () => ta.focus(),
    destroy() { window.removeEventListener('message', onMsg); clearTimeout(frameTimer); },
  };
}
