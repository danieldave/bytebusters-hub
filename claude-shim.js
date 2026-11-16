/* Replaces the Claude-only features these pages used, so they work on Vercel:
   sample    -> /api/ai (OpenAI, key kept in Vercel)
   db        -> /api/store (Upstash Redis), refreshed every few seconds
   user      -> trainer mode: open the page with ?trainer and enter the TRAINER_PIN
   downloads -> a normal file download                                              */
(function () {
  var APP = location.pathname.indexOf('code-coach') !== -1 ? 'coach' : location.pathname.indexOf('brain') !== -1 ? 'brain' : '';

  function blobToDataUrl(b) {
    return new Promise(function (ok, bad) { var r = new FileReader(); r.onload = function () { ok(r.result); }; r.onerror = bad; r.readAsDataURL(b); });
  }
  function parseJSON(t) { var m = String(t).match(/\{[\s\S]*\}|\[[\s\S]*\]/); if (!m) throw { code: 'invalid_json' }; return JSON.parse(m[0]); }

  async function ask(prompt, opts, json) {
    opts = opts || {};
    var imgs = [];
    for (var i = 0; i < (opts.images || []).length; i++) {
      var x = opts.images[i];
      imgs.push(typeof x === 'string' ? x : await blobToDataUrl(x));
    }
    var r = await fetch('/api/ai', { method: 'POST', headers: { 'content-type': 'application/json' }, signal: opts.signal,
      body: JSON.stringify({ prompt: prompt, images: imgs, json: json }) });
    var j = await r.json().catch(function () { return {}; });
    if (!r.ok) throw { code: j.error || 'server_error', message: j.message };
    return json ? parseJSON(j.text) : j.text;
  }

  var sampleCap = {
    json: function (p, o) { return ask(p, o, true); },
    text: function (p, o) { return ask(p, o, false); },
    limits: async function () { return { images: true }; }
  };

  /* ---------- db ---------- */
  var listeners = [];
  async function fetchCol(col) {
    var r = await fetch('/api/store?app=' + APP + '&col=' + encodeURIComponent(col), { cache: 'no-store' });
    if (!r.ok) throw new Error('store ' + r.status);
    return (await r.json()).docs || [];
  }
  function snap(docs) {
    return { docs: docs.map(function (d) { return { id: d.id, exists: true, data: function () { return d.data; } }; }), size: docs.length, empty: !docs.length };
  }
  function refreshAll() { listeners.forEach(function (l) { l.run(); }); }
  setInterval(function () { if (!document.hidden) refreshAll(); }, 5000);

  async function write(op, col, id, data) {
    var r = await fetch('/api/store', { method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ op: op, app: APP, col: col, id: id, data: data }) });
    var j = await r.json().catch(function () { return {}; });
    if (!r.ok) throw new Error(j.error || 'write failed');
    setTimeout(refreshAll, 150);
    return j;
  }
  function query(col) {
    var q = { field: null, dir: 'asc', lim: 0 };
    var api = {
      orderBy: function (f, d) { q.field = f; q.dir = d || 'asc'; return api; },
      limit: function (n) { q.lim = n; return api; },
      add: function (data) { return write('add', col, null, data).then(function (j) { return { id: j.id }; }); },
      get: async function () { return snap(shape(await fetchCol(col))); },
      onSnapshot: function (cb, err) {
        var l = { run: function () { fetchCol(col).then(function (d) { cb(snap(shape(d))); }, function (e) { if (err) err(e); }); } };
        listeners.push(l); l.run();
        return function () { listeners = listeners.filter(function (x) { return x !== l; }); };
      }
    };
    function shape(docs) {
      if (q.field) docs.sort(function (a, b) { var x = a.data[q.field], y = b.data[q.field]; return (x > y ? 1 : x < y ? -1 : 0) * (q.dir === 'desc' ? -1 : 1); });
      return q.lim ? docs.slice(0, q.lim) : docs;
    }
    return api;
  }
  function doc(path) {
    var p = String(path).split('/'), col = p[0], id = p[1];
    return {
      id: id,
      set: function (d) { return write('set', col, id, d); },
      update: function (d) { return write('update', col, id, d); },
      get: async function () { var all = await fetchCol(col); var f = all.find(function (x) { return x.id === id; });
        return { id: id, exists: !!f, data: function () { return f ? f.data : undefined; } }; }
    };
  }
  var dbCap = { collection: query, doc: doc };

  /* ---------- user (trainer mode) ---------- */
  async function trainer() {
    try { if (sessionStorage.getItem('bbTrainer') === '1') return true; } catch (e) {}
    if (!/[?&]trainer\b/.test(location.search)) return false;
    var pin = window.prompt('Trainer PIN');
    if (!pin) return false;
    var r = await fetch('/api/store', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ op: 'auth', pin: pin }) });
    var j = await r.json().catch(function () { return {}; });
    if (j.trainer) { try { sessionStorage.setItem('bbTrainer', '1'); } catch (e) {} return true; }
    return false;
  }
  var trainerP = null;
  var userCap = {
    isOwner: function () { return trainerP || (trainerP = trainer()); },
    canEdit: function () { return trainerP || (trainerP = trainer()); },
    profile: async function () { return { name: '' }; }
  };

  /* ---------- downloads ---------- */
  var downloadsCap = {
    save: async function (o) {
      var blob = o.data instanceof Blob ? o.data : new Blob([o.data], { type: o.mimeType || 'text/html' });
      var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = o.filename || 'download';
      document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 2000);
      return { status: 'saved' };
    }
  };

  var pingP = null;
  function aiReady() {
    return pingP || (pingP = fetch('/api/ai', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{"ping":true}' })
      .then(function (r) { return r.ok ? r.json() : {}; }).then(function (j) { return !!j.ok; }, function () { return false; }));
  }

  window.claude = {
    use: async function (name) {
      if (name === 'sample') { if (await aiReady()) return sampleCap; throw new Error('AI not configured'); }
      if (name === 'db') { if (!APP) throw new Error('no db here'); await fetchCol(APP === 'coach' ? 'seats' : 'projects'); return dbCap; }
      if (name === 'user') return userCap;
      if (name === 'downloads') return downloadsCap;
      throw new Error('unavailable');
    }
  };
})();
