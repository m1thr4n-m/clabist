import { BANK, CIDS, NAMES, FORMS, VIDS, PROPS, KEEP } from './data.js';

const PC   = 'https://pubchem.ncbi.nlm.nih.gov/rest/pug';
const PCAC = 'https://pubchem.ncbi.nlm.nih.gov/rest/autocomplete/compound';
const WIKI = 'https://en.wikipedia.org/api/rest_v1/page/summary';
const OE   = 'https://www.youtube.com/oembed';
const enc = new TextEncoder();
const PASS_MARK = 60, TOKEN_DAYS = 30;

const json = (o, s = 200, cache = 'no-store') =>
  new Response(JSON.stringify(o), { status: s, headers: { 'content-type': 'application/json', 'cache-control': cache } });

const up = (path, ttl = 86400) =>
  fetch(PC + path, {
    headers: { 'user-agent': 'clabist-student-project' },
    cf: { cacheEverything: true, cacheTtlByStatus: { '200-299': ttl, '404': 300, '500-599': 0 } }
  });

async function hmac(secret, msg) {
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(msg));
  return [...new Uint8Array(sig)].map(b => b.toString(16).padStart(2, '0')).join('');
}

async function seal(secret, data) {
  const hash = await crypto.subtle.digest('SHA-256', enc.encode(secret));
  const key = await crypto.subtle.importKey('raw', hash, { name: 'AES-GCM' }, false, ['encrypt']);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(JSON.stringify(data)));
  const buf = new Uint8Array(iv.length + ct.byteLength);
  buf.set(iv); buf.set(new Uint8Array(ct), iv.length);
  return btoa(String.fromCharCode(...buf)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function unseal(secret, sealed) {
  const b64 = sealed.replace(/-/g, '+').replace(/_/g, '/');
  const raw = Uint8Array.from(atob(b64 + '='.repeat((4 - b64.length % 4) % 4)), c => c.charCodeAt(0));
  const iv = raw.slice(0, 12), ct = raw.slice(12);
  const hash = await crypto.subtle.digest('SHA-256', enc.encode(secret));
  const key = await crypto.subtle.importKey('raw', hash, { name: 'AES-GCM' }, false, ['decrypt']);
  const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ct);
  return JSON.parse(new TextDecoder().decode(pt));
}

const pick = (a, n) => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a.slice(0, n); };
const num = v => { const n = parseFloat(v); return isNaN(n) ? null : n; };
const viol = c => { let v = 0; if (num(c.MolecularWeight) > 500) v++; if (num(c.XLogP) > 5) v++; if (num(c.HBondDonorCount) > 5) v++; if (num(c.HBondAcceptorCount) > 10) v++; return v; };

function mk(q, a, w, why, src) {
  const wr = [...new Set(w)].filter(x => x !== a).slice(0, 3);
  const o = pick([a, ...wr], 4);
  return { q, o, a: o.indexOf(a), why, src };
}

async function getPT() {
  const r = await fetch(PC + '/periodictable/JSON', { headers: { 'user-agent': 'clabist-student-project' }, cf: { cacheEverything: true, cacheTtlByStatus: { '200-299': 604800 } } });
  if (!r.ok) throw new Error('upstream');
  const t = (await r.json()).Table, out = {};
  for (const row of t.Row) { const o = {}; t.Columns.Column.forEach((c, i) => { if (KEEP.includes(c)) o[c] = row.Cell[i]; }); out[o.AtomicNumber] = o; }
  return out;
}

async function getCompoundProps(cids) {
  const r = await up(`/compound/cid/${cids.join(',')}/property/${PROPS}/JSON`, 3600);
  if (!r.ok) throw new Error('upstream');
  return (await r.json()).PropertyTable.Properties;
}

function conceptQs(n, seen) {
  let pool = BANK.map((_, i) => i).filter(i => !seen.includes(i));
  if (pool.length < n) pool = BANK.map((_, i) => i);
  const ch = pick(pool, n);
  return { qs: ch.map(i => { const b = BANK[i]; return mk(b[0], b[1], b[2], b[3], 'Course'); }), seen: [...seen, ...ch].slice(-18) };
}

function extremeQ(rows, k, hi, H, L, noun, unit) {
  const c = pick(rows.filter(r => num(r[k]) !== null && r.Name), 4);
  if (c.length < 4 || new Set(c.map(r => num(r[k]))).size < 4) return null;
  const best = c.reduce((a, b) => (hi ? num(b[k]) > num(a[k]) : num(b[k]) < num(a[k])) ? b : a);
  return mk(`Which of these elements has the ${hi ? H : L} ${noun}?`, best.Name, c.filter(r => r !== best).map(r => r.Name), `${best.Name} has the ${hi ? H : L} value. ` + c.map(r => `${r.Name} ${num(r[k])}${unit}`).join(', ') + '.', 'Live data');
}

async function elementQs(n) {
  const pt = await getPT(); const rows = Object.values(pt);
  if (rows.length < 50) throw new Error('few');
  const G = [
    () => extremeQ(rows, 'Electronegativity', Math.random() < .6, 'highest', 'lowest', 'electronegativity', ''),
    () => extremeQ(rows, 'IonizationEnergy', Math.random() < .5, 'highest', 'lowest', 'first ionization energy', ' eV'),
    () => extremeQ(rows, 'AtomicRadius', Math.random() < .5, 'largest', 'smallest', 'atomic radius', ' pm'),
    () => { const r = pick(rows.filter(r => r.GroupBlock), 1)[0]; const w = [...new Set(rows.map(x => x.GroupBlock).filter(x => x && x !== r.GroupBlock))]; return w.length < 3 ? null : mk(`${r.Name} belongs to which family of elements?`, r.GroupBlock, pick(w, 3), `${r.Name} is classed as ${r.GroupBlock.toLowerCase()}.`, 'Live data'); },
    () => { const r = pick(rows.filter(r => r.ElectronConfiguration), 1)[0]; const w = [...new Set(rows.map(x => x.ElectronConfiguration).filter(x => x && x !== r.ElectronConfiguration))]; return mk(`Which electron configuration belongs to ${r.Name}?`, r.ElectronConfiguration, pick(w, 3), `${r.Name} has atomic number ${r.AtomicNumber}: ${r.ElectronConfiguration}.`, 'Live data'); },
    () => { const r = pick(rows, 1)[0]; return mk(`What is the chemical symbol for ${r.Name}?`, r.Symbol, pick(rows.filter(x => x !== r).map(x => x.Symbol), 3), `${r.Name} is element ${r.AtomicNumber}.`, 'Live data'); }
  ];
  const out = [];
  for (const g of pick(G, G.length)) { const q = g(); if (q) out.push(q); if (out.length >= n) break; }
  return out;
}

async function compoundQs(n) {
  const rows = (await getCompoundProps(pick(CIDS, 8))).filter(r => r.Title && r.MolecularFormula && num(r.MolecularWeight) !== null);
  if (rows.length < 4) throw new Error('few');
  const sm = r => r.SMILES || r.ConnectivitySMILES || r.CanonicalSMILES || '';
  const best = (k, hi, txt, unit) => { const c = pick(rows.filter(r => num(r[k]) !== null), 4); if (c.length < 4 || new Set(c.map(r => num(r[k]))).size < 4) return null; const b = c.reduce((a, x) => (hi ? num(x[k]) > num(a[k]) : num(x[k]) < num(a[k])) ? x : a); return mk(txt, b.Title, c.filter(r => r !== b).map(r => r.Title), c.map(r => `${r.Title} ${num(r[k])}${unit}`).join(', ') + '.', 'Live data'); };
  const G = [
    () => { const r = pick(rows, 1)[0]; const w = [...new Set(rows.map(x => x.MolecularFormula).filter(x => x !== r.MolecularFormula))]; return w.length < 2 ? null : mk(`What is the molecular formula of ${r.Title}?`, r.MolecularFormula, pick(w, 3), `${r.Title} is ${r.MolecularFormula}, molar mass ${num(r.MolecularWeight)} g/mol.`, 'Live data'); },
    () => best('MolecularWeight', true, 'Which compound has the highest molecular weight?', ' g/mol'),
    () => best('XLogP', true, 'Which compound is the most lipophilic (highest XLogP)?', ''),
    () => { const r = pick(rows.filter(r => num(r.XLogP) !== null && num(r.HBondDonorCount) !== null && num(r.HBondAcceptorCount) !== null), 1)[0]; if (!r) return null; const v = viol(r); return mk(`How many rule of five violations does ${r.Title} have?`, String(v), ['0', '1', '2', '3'].filter(x => x !== String(v)), `${r.Title}: mass ${num(r.MolecularWeight)}, XLogP ${r.XLogP}, donors ${r.HBondDonorCount}, acceptors ${r.HBondAcceptorCount}.`, 'Live data'); },
    () => { const r = pick(rows.filter(r => num(r.HBondDonorCount) !== null), 1)[0]; if (!r) return null; const c = num(r.HBondDonorCount); return mk(`How many hydrogen bond donors does ${r.Title} have?`, String(c), [c + 1, c + 2, c > 0 ? c - 1 : c + 3].map(String), `${r.Title} has ${c} hydrogen bond donor${c === 1 ? '' : 's'}.`, 'Live data'); },
    () => { const r = pick(rows.filter(r => sm(r) && sm(r).length <= 34), 1)[0]; if (!r) return null; const w = [...new Set(rows.map(sm).filter(x => x && x !== sm(r) && x.length <= 34))]; return w.length < 2 ? null : mk(`Which SMILES string belongs to ${r.Title}?`, sm(r), pick(w, 3), `${r.Title} is written ${sm(r)}.`, 'Live data'); }
  ];
  const out = [];
  for (const g of pick(G, G.length)) { const q = g(); if (q) out.push(q); if (out.length >= n) break; }
  return out;
}

async function makeQuiz(seen) {
  const [E, C] = await Promise.allSettled([elementQs(4), compoundQs(3)]);
  let live = [];
  if (E.status === 'fulfilled') live.push(...E.value);
  if (C.status === 'fulfilled') live.push(...C.value);
  live = live.slice(0, 7);
  const { qs, seen: next } = conceptQs(10 - live.length, seen);
  return { questions: pick([...live, ...qs], 10), seen: next };
}

async function elements() {
  try { const o = await getPT(); return json(o, 200, 'public, max-age=604800'); }
  catch (e) { return json({ error: 'unavailable' }, 502); }
}

async function find(u) {
  const type = u.searchParams.get('type'), q = (u.searchParams.get('q') || '').slice(0, 200);
  if (!['name', 'smiles', 'formula'].includes(type) || !q) return json({ error: 'bad request' }, 400);
  const path = type === 'formula' ? `/compound/fastformula/${encodeURIComponent(q)}/cids/JSON` : `/compound/${type}/${encodeURIComponent(q)}/cids/JSON`;
  const r = await up(path);
  const id = r.ok ? (await r.json())?.IdentifierList?.CID?.[0] : null;
  return id ? json({ id }, 200, 'public, max-age=86400') : json({ error: 'not found' }, 404);
}

const cidOf = u => { const v = u.searchParams.get('id') || ''; return /^\d{1,10}$/.test(v) ? v : null; };

async function props(u) {
  const id = cidOf(u); if (!id) return json({ error: 'bad request' }, 400);
  const r = await up(`/compound/cid/${id}/property/${PROPS}/JSON`);
  const p = r.ok ? (await r.json())?.PropertyTable?.Properties?.[0] : null;
  return p ? json(p, 200, 'public, max-age=86400') : json({ error: 'not found' }, 404);
}

async function model(u) {
  const id = cidOf(u); if (!id) return json({ error: 'bad request' }, 400);
  let r = await up(`/compound/cid/${id}/record/SDF?record_type=3d`);
  if (!r.ok) r = await up(`/compound/cid/${id}/record/SDF`);
  if (!r.ok) return json({ error: 'not found' }, 404);
  return new Response(await r.text(), { headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'public, max-age=86400' } });
}

async function img(u) {
  const id = cidOf(u); if (!id) return json({ error: 'bad request' }, 400);
  const size = (u.searchParams.get('size') || '400x400').replace(/[^0-9x]/gi, '') || '400x400';
  const r = await up(`/compound/cid/${id}/PNG?image_size=${size}`);
  if (!r.ok) return json({ error: 'not found' }, 404);
  return new Response(r.body, { headers: { 'content-type': 'image/png', 'cache-control': 'public, max-age=86400' } });
}

async function desc(u) {
  const id = cidOf(u); if (!id) return json({ error: 'bad request' }, 400);
  const r = await up(`/compound/cid/${id}/description/JSON`, 604800);
  if (!r.ok) return json({ error: 'not found' }, 404);
  return new Response(await r.text(), { headers: { 'content-type': 'application/json', 'cache-control': 'public, max-age=604800' } });
}

async function syn(u) {
  const id = cidOf(u); if (!id) return json({ error: 'bad request' }, 400);
  const r = await up(`/compound/cid/${id}/synonyms/JSON`, 604800);
  if (!r.ok) return json({ error: 'not found' }, 404);
  return new Response(await r.text(), { headers: { 'content-type': 'application/json', 'cache-control': 'public, max-age=604800' } });
}

async function ac(u) {
  const q = (u.searchParams.get('q') || '').slice(0, 120);
  if (!q || q.length < 2) return json({ dictionary_terms: { compound: [] } }, 200, 'public, max-age=3600');
  const r = await fetch(`${PCAC}/${encodeURIComponent(q)}/json?limit=8`, { headers: { 'user-agent': 'clabist-student-project' }, cf: { cacheEverything: true, cacheTtlByStatus: { '200-299': 3600 } } });
  if (!r.ok) return json({ dictionary_terms: { compound: [] } });
  return new Response(await r.text(), { headers: { 'content-type': 'application/json', 'cache-control': 'public, max-age=3600' } });
}

async function wiki(u) {
  const t = (u.searchParams.get('t') || '').slice(0, 120);
  if (!t) return json({ error: 'bad request' }, 400);
  const r = await fetch(`${WIKI}/${encodeURIComponent(t.replace(/ /g, '_'))}`, { headers: { 'user-agent': 'clabist-student-project' }, cf: { cacheEverything: true, cacheTtlByStatus: { '200-299': 604800 } } });
  if (!r.ok) return json({ error: 'not found' }, 404);
  return new Response(await r.text(), { headers: { 'content-type': 'application/json', 'cache-control': 'public, max-age=604800' } });
}

async function oe(u) {
  const id = u.searchParams.get('id') || '';
  if (!/^[\w-]{8,20}$/.test(id)) return json({ error: 'bad id' }, 400);
  const r = await fetch(`${OE}?format=json&url=${encodeURIComponent('https://www.youtube.com/watch?v=' + id)}`, { headers: { 'user-agent': 'clabist-student-project' }, cf: { cacheEverything: true, cacheTtlByStatus: { '200-299': 86400, '404': 300 } } });
  if (!r.ok) return json({ error: 'unavailable' }, r.status);
  return new Response(await r.text(), { headers: { 'content-type': 'application/json', 'cache-control': 'public, max-age=86400' } });
}

async function picks() {
  const ids = pick(CIDS, 8);
  try {
    const rows = await getCompoundProps(ids);
    return json({ properties: rows.map(r => ({ CID: r.CID, Title: r.Title, MolecularFormula: r.MolecularFormula })) }, 200, 'no-store');
  } catch (e) { return json({ properties: [] }); }
}

async function quizStart(req, env) {
  const secret = env.CERT_SECRET;
  if (!secret) return json({ error: 'server config' }, 500);
  const seen = await env.CLAB_QUIZ.get('seen', 'json').catch(() => []) || [];
  const { questions, seen: next } = await makeQuiz(seen);
  const answers = questions.map(q => q.a);
  const session = crypto.randomUUID();
  await env.CLAB_QUIZ.put(`q:${session}`, JSON.stringify({ answers, seen: next, issuedAt: Date.now() }), { expirationTtl: 3600 });
  return json({ session, questions: questions.map(q => ({ q: q.q, o: q.o, src: q.src })) });
}

async function quizSubmit(req, env) {
  const secret = env.CERT_SECRET;
  if (!secret) return json({ error: 'server config' }, 500);
  const body = await req.json().catch(() => ({}));
  const session = String(body.session || '');
  const answers = body.answers;
  if (!session || !Array.isArray(answers)) return json({ error: 'bad request' }, 400);
  const stored = await env.CLAB_QUIZ.get(`q:${session}`, 'json').catch(() => null);
  if (!stored) return json({ error: 'Session expired or already used' }, 400);
  await env.CLAB_QUIZ.delete(`q:${session}`).catch(() => {});
  await env.CLAB_QUIZ.put('seen', JSON.stringify(stored.seen), { expirationTtl: 86400 }).catch(() => {});
  const right = stored.answers.map((k, i) => answers[i] === k);
  const ok = right.filter(Boolean).length;
  const score = Math.round(ok / stored.answers.length * 100);
  const passed = score >= PASS_MARK;
  // Reconstruct question text so the client can show feedback
  const { questions } = await makeQuiz([]);
  // Instead of regenerating, we stored answers only. Send back minimal info + correctness.
  return json({ ok, score, passed, right, total: stored.answers.length, certToken: passed ? await seal(secret, { score, exp: Date.now() + TOKEN_DAYS * 864e5 }) : '' });
}

async function cert(req, env) {
  const secret = env.CERT_SECRET;
  if (!secret) return json({ error: 'server config' }, 500);
  const b = await req.json().catch(() => ({}));
  let token = b.token;
  if (!token) return json({ error: 'Pass the quiz first.' }, 403);
  let payload;
  try { payload = await unseal(secret, token); } catch (e) { return json({ error: 'Invalid pass token.' }, 403); }
  if (!payload.exp || Date.now() > payload.exp) return json({ error: 'Pass token expired. Retake the quiz.' }, 403);
  const [name, roll, reg] = [b.name, b.roll, b.reg].map(v => String(v || '').trim().slice(0, 80));
  if (!name || !roll || !reg) return json({ error: 'Fill in name, roll number and registration number.' }, 400);
  const date = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata' });
  const id = 'SRM-VCL-' + (await hmac(secret, [name, roll, reg, payload.score].map(s => String(s).toLowerCase().trim()).join('|'))).slice(0, 10).toUpperCase();
  return json({ score: payload.score, date, id });
}

async function verify(u, env) {
  const secret = env.CERT_SECRET;
  if (!secret) return json({ error: 'server config' }, 500);
  const g = k => u.searchParams.get(k) || '';
  const id = 'SRM-VCL-' + (await hmac(secret, [g('name'), g('roll'), g('reg'), +g('score')].map(s => String(s).toLowerCase().trim()).join('|'))).slice(0, 10).toUpperCase();
  return json({ valid: id === g('id').toUpperCase() });
}

async function videos() {
  const out = [];
  for (const v of VIDS) {
    let ok = false, title = v.t, author = 'YouTube', id = v.id;
    for (const cand of [v.id, ...v.alt]) {
      try {
        const r = await fetch(`${OE}?format=json&url=${encodeURIComponent('https://www.youtube.com/watch?v=' + cand)}`, { headers: { 'user-agent': 'clabist-student-project' }, cf: { cacheEverything: true, cacheTtlByStatus: { '200-299': 86400 } } });
        if (r.ok) { const j = await r.json(); title = j.title; author = j.author_name; id = cand; ok = true; break; }
        if (r.status === 401 || r.status === 403 || r.status === 404) continue;
      } catch (e) {}
    }
    out.push({ t: v.t, w: v.w, id, title, author, ok });
  }
  return json({ videos: out }, 200, 'public, max-age=3600');
}

export default {
  async fetch(req, env) {
    const u = new URL(req.url);
    if (!u.pathname.startsWith('/api/')) return env.ASSETS.fetch(req);

    const origin = req.headers.get('origin');
    if (origin && origin !== u.origin) return json({ error: 'forbidden' }, 403);

    try {
      switch (u.pathname) {
        case '/api/elements': return await elements();
        case '/api/find': return await find(u);
        case '/api/props': return await props(u);
        case '/api/model': return await model(u);
        case '/api/img': return await img(u);
        case '/api/desc': return await desc(u);
        case '/api/syn': return await syn(u);
        case '/api/ac': return await ac(u);
        case '/api/wiki': return await wiki(u);
        case '/api/oe': return await oe(u);
        case '/api/picks': return await picks();
        case '/api/videos': return await videos();
        case '/api/quiz/start': return req.method === 'POST' ? await quizStart(req, env) : json({ error: 'method' }, 405);
        case '/api/quiz/submit': return req.method === 'POST' ? await quizSubmit(req, env) : json({ error: 'method' }, 405);
        case '/api/cert': return req.method === 'POST' ? await cert(req, env) : json({ error: 'method' }, 405);
        case '/api/verify': return await verify(u, env);
      }
      return json({ error: 'not found' }, 404);
    } catch (e) {
      console.error(e);
      return json({ error: 'server error' }, 502);
    }
  }
};
