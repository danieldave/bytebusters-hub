// Shared helper: calls OpenAI with the key stored in Vercel (never in the pages).
const MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';

async function readBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') { try { return JSON.parse(req.body); } catch (e) { return {}; } }
  const chunks = []; for await (const c of req) chunks.push(c);
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}'); } catch (e) { return {}; }
}

// Very small in-memory limiter per IP (resets when the function cold-starts).
const hits = new Map();
function tooMany(req, limit = 30) {
  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'anon';
  const now = Date.now(), win = 60000;
  const arr = (hits.get(ip) || []).filter(t => now - t < win);
  arr.push(now); hits.set(ip, arr);
  return arr.length > limit;
}

async function chat({ system, prompt, images = [], json = false, maxTokens = 900 }) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) { const e = new Error('No OPENAI_API_KEY set in Vercel'); e.code = 'no_key'; throw e; }
  const content = [{ type: 'text', text: String(prompt || '').slice(0, 12000) }];
  for (const url of (images || []).slice(0, 2)) {
    if (typeof url === 'string' && url.startsWith('data:image/') && url.length < 6_000_000) content.push({ type: 'image_url', image_url: { url } });
  }
  const messages = [];
  if (system) messages.push({ role: 'system', content: String(system).slice(0, 8000) });
  messages.push({ role: 'user', content });
  const body = { model: MODEL, messages, max_tokens: maxTokens, temperature: 0.6 };
  if (json) body.response_format = { type: 'json_object' };
  const r = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` }, body: JSON.stringify(body)
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) { const e = new Error((j.error && j.error.message) || 'AI request failed'); e.code = r.status === 429 ? 'rate_limited' : 'ai_error'; throw e; }
  return (j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content) || '';
}

module.exports = { chat, readBody, tooMany };
