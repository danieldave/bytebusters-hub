// POST /api/ai  { prompt, system?, images?: [dataUrl], json?: bool }  ->  { text }
// POST /api/ai  { ping: true }  ->  { ok: true } when an OpenAI key is configured
const { chat, readBody, tooMany } = require('./_openai');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });
  const b = await readBody(req);
  if (b.ping) return res.status(200).json({ ok: !!process.env.OPENAI_API_KEY });
  if (tooMany(req)) return res.status(429).json({ error: 'rate_limited', message: 'Too many questions in one minute. Wait a moment.' });
  if (!b.prompt || String(b.prompt).length < 2) return res.status(400).json({ error: 'bad_request' });
  try {
    const system = b.system || (b.json ? 'You are a helpful, accurate assistant for Nigerian students and teachers. Reply with one valid JSON object only, exactly in the shape the user asks for.' : 'You are a helpful, accurate assistant for Nigerian students and teachers.');
    const text = await chat({ system, prompt: b.prompt, images: b.images, json: !!b.json });
    res.status(200).json({ text });
  } catch (e) {
    res.status(e.code === 'no_key' ? 503 : 502).json({ error: e.code || 'server_error', message: e.message });
  }
};
