// POST /api/explain  — used by the Inflation Explainer. Our page does the maths; the AI only explains.
const { chat, readBody, tooMany } = require('./_openai');

const SYSTEM = `You explain price changes to young people in Nigeria aged 9 to 15.
Use ONLY the numbers in the data you are given; never invent prices, dates or statistics.
Write short, warm, plain sentences. No investment advice. No politics or blame.
Reply with one JSON object only:
{"headline":"one sentence with the item, old price, new price and % change",
 "explain":"2-3 sentences on what this means for a family (deeper=true: 4-5 sentences)",
 "causes":["likely causes, short"], "compare":"one sentence comparing with the national rate given",
 "tips":["practical ways a family can cope"], "answer":"answer to the user's question, or empty string"}
Give 3 causes and 2 tips normally, 4 and 4 when deeper is true.`;

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });
  if (tooMany(req)) return res.status(429).json({ error: 'rate_limited' });
  const d = await readBody(req);
  if (!d || !d.item || typeof d.oldPrice !== 'number' || typeof d.newPrice !== 'number') return res.status(400).json({ error: 'bad_request' });
  try {
    const text = await chat({ system: SYSTEM, prompt: 'DATA:\n' + JSON.stringify(d).slice(0, 6000), json: true, maxTokens: 700 });
    const j = JSON.parse(text.match(/\{[\s\S]*\}/)[0]);
    if (!j.headline) throw new Error('bad reply');
    res.status(200).json(j);
  } catch (e) {
    res.status(e.code === 'no_key' ? 503 : 502).json({ error: e.code || 'server_error' });
  }
};
