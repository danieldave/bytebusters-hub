// Shared storage for Brain and Code Coach, kept in Upstash Redis (connected through Vercel).
// GET  /api/store?app=coach&col=progress            -> { docs: [{id, data}] }
// POST /api/store {op:'set'|'update'|'add', app, col, id?, data}
// POST /api/store {op:'auth', pin}                   -> { trainer: true|false }
const { readBody, tooMany } = require('./_openai');

const URL_ = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
const ALLOWED = { brain: ['trail', 'projects'], coach: ['progress', 'seats'] };
const MAX_DOC = 20000;

async function redis(cmd) {
  const r = await fetch(URL_, { method: 'POST', headers: { authorization: `Bearer ${TOKEN}`, 'content-type': 'application/json' }, body: JSON.stringify(cmd) });
  const j = await r.json();
  if (j.error) throw new Error(j.error);
  return j.result;
}
const keyOf = (app, col) => `bb:${app}:${col}`;
const okName = (s) => typeof s === 'string' && /^[A-Za-z0-9_.-]{1,80}$/.test(s);

function merge(a, b) {
  if (!b || typeof b !== 'object' || Array.isArray(b)) return b;
  const o = (a && typeof a === 'object' && !Array.isArray(a)) ? { ...a } : {};
  for (const k of Object.keys(b)) o[k] = merge(o[k], b[k]);
  return o;
}

module.exports = async (req, res) => {
  res.setHeader('cache-control', 'no-store');
  if (!URL_ || !TOKEN) return res.status(503).json({ error: 'no_storage', message: 'Connect Upstash Redis to this project in Vercel.' });
  try {
    if (req.method === 'GET') {
      const { app, col } = req.query;
      if (!ALLOWED[app] || !ALLOWED[app].includes(col)) return res.status(400).json({ error: 'bad_collection' });
      const flat = await redis(['HGETALL', keyOf(app, col)]) || [];
      const docs = [];
      for (let i = 0; i < flat.length; i += 2) { try { docs.push({ id: flat[i], data: JSON.parse(flat[i + 1]) }); } catch (e) {} }
      return res.status(200).json({ docs });
    }
    if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });
    if (tooMany(req, 120)) return res.status(429).json({ error: 'rate_limited' });
    const b = await readBody(req);
    if (b.op === 'auth') {
      const pin = process.env.TRAINER_PIN;
      return res.status(200).json({ trainer: !!pin && String(b.pin || '') === pin });
    }
    const { app, col } = b;
    if (!ALLOWED[app] || !ALLOWED[app].includes(col)) return res.status(400).json({ error: 'bad_collection' });
    const s = JSON.stringify(b.data || {});
    if (s.length > MAX_DOC) return res.status(413).json({ error: 'too_big' });
    const key = keyOf(app, col);
    let id = b.id;
    if (b.op === 'add') id = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
    if (!okName(id)) return res.status(400).json({ error: 'bad_id' });
    if (b.op === 'set' || b.op === 'add') await redis(['HSET', key, id, s]);
    else if (b.op === 'update') {
      const cur = await redis(['HGET', key, id]);
      const next = merge(cur ? JSON.parse(cur) : {}, b.data || {});
      await redis(['HSET', key, id, JSON.stringify(next)]);
    } else return res.status(400).json({ error: 'bad_op' });
    return res.status(200).json({ ok: true, id });
  } catch (e) {
    return res.status(500).json({ error: 'server_error', message: e.message });
  }
};
