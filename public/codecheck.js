// Проверка шагов «пишем код» — одна и та же в браузере (редактор) и на сервере (контрольные).
// Ученик может написать правильный код по-своему: одинарные кавычки, другой порядок атрибутов,
// свойство в отдельном правиле, несколько селекторов через запятую, <br/>, атрибут без кавычек.
// Поэтому шаг проверяется не на одном тексте, а на нескольких равноценных вариантах записи:
// шаг засчитан, если регэксп совпал хоть с одним (шаг «not» — если не совпал ни с одним).

const kindOf = (name = '') => (/\.html?$/i.test(name) ? 'html' : /\.css$/i.test(name) ? 'css' : /\.(m?js|jsx)$/i.test(name) ? 'js' : /\.json$/i.test(name) ? 'json' : 'text');

export function stripComments(name, src) {
  const k = kindOf(name);
  if (k === 'html') return src.replace(/<!--[\s\S]*?-->/g, '');
  if (k === 'css') return src.replace(/\/\*[\s\S]*?\*\//g, '');
  if (k === 'js') return src.replace(/\/\*[\s\S]*?\*\/|(^|[^:\\])\/\/.*$/gm, '$1');
  return src;
}

// ' и ` → " (для строк в HTML-атрибутах, CSS и простых JS-строках без подстановок)
const dq = (s) => s.replace(/'([^'\n"]*)'/g, '"$1"').replace(/`([^`\n"$]*)`/g, '"$1"');

// HTML: атрибуты без кавычек → в кавычках, <br/> → <br>, лишние пробелы внутри тега
function htmlTidy(s) {
  return s.replace(/<([a-zA-Z][\w-]*)((?:\s+[^\s=>/]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s"'>]+))?)*)\s*\/?\s*>/g, (_, tag, attrs) => {
    const list = [...attrs.matchAll(/([^\s=>/]+)(?:\s*=\s*("[^"]*"|'[^']*'|[^\s"'>]+))?/g)].map(([, n, v]) => (v == null ? n : `${n}="${v.replace(/^["']|["']$/g, '')}"`));
    return `<${tag}${list.length ? ' ' + list.join(' ') : ''}>`;
  });
}
// тот же HTML, но атрибуты каждого тега в обратном порядке (ловит href/rel, type/name и т. п.)
function htmlReversed(s) {
  return s.replace(/<([a-zA-Z][\w-]*) ([^<>]+)>/g, (m, tag, attrs) => {
    const list = attrs.match(/[^\s=]+="[^"]*"|[^\s=]+/g);
    return list && list.length > 1 ? `<${tag} ${list.reverse().join(' ')}>` : m;
  });
}
// CSS: «.a, .b { x }» → «.a { x } .b { x }», одинаковые селекторы склеиваются в одно правило
function cssMerged(s) {
  const out = new Map();
  const media = [];
  let rest = s.replace(/@[^{]+\{(?:[^{}]*\{[^{}]*\})*[^{}]*\}/g, (m) => { media.push(m); return ''; });
  rest.replace(/([^{}]+)\{([^{}]*)\}/g, (_, sel, body) => {
    for (const one of sel.split(',').map((x) => x.trim().replace(/\s+/g, ' ')).filter(Boolean)) {
      const b = body.trim().replace(/;?\s*$/, ';');
      out.set(one, (out.get(one) || '') + ' ' + b);
    }
    return '';
  });
  return [...out].map(([sel, body]) => `${sel} {${body} }`).join('\n') + '\n' + media.join('\n');
}

export function variants(name, src) {
  const k = kindOf(name);
  const base = stripComments(name, src || '');
  const set = new Set([base, dq(base)]);
  if (k === 'html') {
    const t = htmlTidy(dq(base));
    set.add(t);
    set.add(htmlReversed(t));
    // <style> внутри HTML тоже нормализуем
    set.add(t.replace(/(<style[^>]*>)([\s\S]*?)(<\/style>)/gi, (_, a, css, b) => a + cssMerged(css) + b));
  }
  if (k === 'css') { set.add(cssMerged(base)); set.add(cssMerged(dq(base))); }
  if (k === 'js') set.add(dq(base).replace(/;\s*\n/g, '\n'));
  return [...set];
}

// Один шаг: { file, re, flags?, not?, out? }. out — регэксп по выводу консоли.
export function stepOk(st, files, consoleText = '') {
  try {
    if (st.out) return new RegExp(st.out, 'm').test(consoleText || '');
    const rx = new RegExp(st.re, st.flags ?? 'i');
    const hit = variants(st.file, files?.[st.file] || '').some((v) => rx.test(v));
    return st.not ? !hit : hit;
  } catch { return false; }
}
