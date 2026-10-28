// Хранилище: всё состояние приложения — один JSON-документ.
// На Render — в Postgres (DATABASE_URL), локально — в файле data/state.json.
// Для курса на сотни учеников этого с запасом хватает и сильно упрощает код.
import fs from 'node:fs';
import path from 'node:path';
import pg from 'pg';

export function emptyState() {
  return {
    users: {},      // id -> { id, firstName, lastName, username, photoUrl, joinedAt, streak, lastDay }
    groups: {},     // id -> { id, name, emoji, chatId, chatTitle, memberIds, createdAt }
    lessons: {},    // id -> { id, title, emoji, description, topics, questions, createdAt }
    pubs: {},       // id -> { id, lessonId, groupId, publishedAt }   — тест, отправленный группе
    attempts: {},   // id -> { id, pubId, lessonId, userId, preview, startedAt, finishedAt, answers, combo, maxCombo, xp }
    reminders: {},  // id -> { id, groupId, pubId, text, intervalMin, nextAt, active, sent, maxCount }
    seq: 1,
  };
}

export async function createStore() {
  const url = process.env.DATABASE_URL;
  const backend = url ? await pgBackend(url) : fileBackend();
  const state = Object.assign(emptyState(), (await backend.load()) || {});

  let timer = null;
  let saving = Promise.resolve();
  const flush = () => {
    timer = null;
    const snapshot = JSON.stringify(state);
    saving = saving.then(() => backend.save(snapshot)).catch((e) => console.error('[store] save failed', e));
    return saving;
  };

  return {
    state,
    nextId(prefix) {
      return `${prefix}${(state.seq++).toString(36)}${Math.random().toString(36).slice(2, 5)}`;
    },
    save() {
      if (!timer) timer = setTimeout(flush, 300);
    },
    async flushNow() {
      if (timer) clearTimeout(timer);
      await flush();
    },
    backend: backend.name,
  };
}

function fileBackend() {
  const file = path.resolve(process.env.DATA_FILE || 'data/state.json');
  return {
    name: `file:${file}`,
    async load() {
      try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return null; }
    },
    async save(json) {
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(file + '.tmp', json);
      fs.renameSync(file + '.tmp', file);
    },
  };
}

async function pgBackend(url) {
  const needsSsl = /sslmode=require|render\.com|neon\.tech/.test(url) || process.env.PGSSL === '1';
  const pool = new pg.Pool({ connectionString: url, ssl: needsSsl ? { rejectUnauthorized: false } : undefined, max: 3 });
  await pool.query('CREATE TABLE IF NOT EXISTS app_state (id int PRIMARY KEY, data jsonb NOT NULL, updated_at timestamptz DEFAULT now())');
  return {
    name: 'postgres',
    async load() {
      const r = await pool.query('SELECT data FROM app_state WHERE id = 1');
      return r.rows[0]?.data || null;
    },
    async save(json) {
      await pool.query(
        'INSERT INTO app_state (id, data, updated_at) VALUES (1, $1, now()) ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = now()',
        [json],
      );
    },
  };
}
