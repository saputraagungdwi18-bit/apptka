/* api.js — klien REST ke Google Apps Script.
   Prinsip kecepatan (gas-scale-turbo): dedupe permintaan identik, retry baca, batcher, cache lokal SWR,
   sinkron jam server, dan semua daftar data disimpan di memori sehingga pindah menu = instan. */
(function () {
  const TKA = window.TKA, U = TKA.ui;
  const A = (TKA.api = { token: '', offset: 0, synced: false });
  A.now = () => Date.now() + A.offset;
  const inflight = {};

  A.call = function (action, data, o) {
    o = o || {};
    const body = JSON.stringify(action === 'batch' ? { action: action, calls: data.calls, t: A.token } : { action: action, data: data || {}, t: A.token });
    const key = o.read ? body : null;
    if (key && inflight[key]) return inflight[key];
    const p = (async () => {
      const tries = o.retry != null ? o.retry : (o.read ? 2 : 0);
      for (let a = 0; a <= tries; a++) {
        const ctl = new AbortController(), to = setTimeout(() => ctl.abort(), o.timeout || 30000), t0 = Date.now();
        try {
          const res = await fetch(window.GAS_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: body, signal: ctl.signal, redirect: 'follow' });
          clearTimeout(to);
          const j = await res.json(), t1 = Date.now();
          if (j.now) { const off = j.now - (t0 + (t1 - t0) / 2); A.offset = A.synced ? Math.round(A.offset * 0.6 + off * 0.4) : Math.round(off); A.synced = true; }
          if (!j.success) { const e = new Error(j.message || 'Terjadi kesalahan.'); e.code = j.code; e.server = true; if (j.code === 'AUTH' && A.onAuthFail) A.onAuthFail(); throw e; }
          return j;
        } catch (e) {
          clearTimeout(to);
          if (e.server) throw e;
          if (a < tries) { await U.sleep(500 * (a + 1)); continue; }
          const er = new Error('Tidak dapat terhubung ke server. Periksa koneksi internet Anda.'); er.offline = true; throw er;
        }
      }
    })();
    if (key) { inflight[key] = p; const clean = () => { delete inflight[key]; }; p.then(clean, clean); }
    return p;
  };
  // Beberapa aksi baca dalam satu eksekusi server.
  A.batch = async function (calls) {
    const j = await A.call('batch', { calls: calls }, { read: true });
    return j.results;
  };
  // ---- cache lokal (localStorage, per pengguna) ----
  const C = (TKA.cache = {});
  const uk = k => 'tka:c:' + (TKA.S && TKA.S.user ? TKA.S.user.id : '-') + ':' + k;
  C.get = k => { try { return JSON.parse(localStorage.getItem(uk(k))); } catch (e) { return null; } };
  C.set = (k, v) => { try { localStorage.setItem(uk(k), JSON.stringify({ t: Date.now(), v: v })); } catch (e) { C.prune(); } };
  C.prune = () => { try { Object.keys(localStorage).filter(k => k.indexOf('tka:c:') === 0).forEach(k => localStorage.removeItem(k)); } catch (e) {} };
  C.clearUser = () => { try { Object.keys(localStorage).filter(k => k.indexOf('tka:c:') === 0 || k.indexOf('tka:ex:') === 0).forEach(k => localStorage.removeItem(k)); } catch (e) {} };

  // ---- penyimpanan data daftar di memori + SWR ----
  const D = (TKA.D = { m: {} });
  const SRC = { soal: ['soal.list', 'soal'], paket: ['paket.list', 'paket'], jadwal: ['jadwal.list', 'jadwal'], users: ['user.list', 'users'] };
  D.peek = n => (D.m[n] ? D.m[n].v : (C.get('d_' + n) || {}).v || null);
  D.age = n => (D.m[n] ? Date.now() - D.m[n].t : Infinity);
  D.fetch = async n => {
    const s = SRC[n], j = await A.call(s[0], {}, { read: true });
    D.m[n] = { v: j[s[1]], t: Date.now() }; C.set('d_' + n, j[s[1]]);
    return j[s[1]];
  };
  D.put = (n, v) => { D.m[n] = { v: v, t: Date.now() }; };
  D.invalidate = n => { if (D.m[n]) D.m[n].t = 0; };
  // Panggil cb segera dengan data yang ada (jika ada), lalu segarkan di latar bila lebih tua dari maxAge.
  D.swr = async (n, cb, maxAge) => {
    const cur = D.peek(n);
    if (cur) cb(cur, true);
    if (cur && D.age(n) < (maxAge == null ? 20000 : maxAge)) return cur;
    const before = JSON.stringify(cur);
    const fresh = await D.fetch(n);
    if (JSON.stringify(fresh) !== before) cb(fresh, false);
    return fresh;
  };
  // Prefetch beberapa daftar sekaligus dalam SATU eksekusi server.
  D.prefetch = async names => {
    const need = names.filter(n => D.age(n) > 20000);
    if (!need.length) return;
    try {
      const rs = await A.batch(need.map(n => ({ action: SRC[n][0], data: {} })));
      rs.forEach((r, i) => { if (r && r.success) { const s = SRC[need[i]]; D.m[need[i]] = { v: r[s[1]], t: Date.now() }; C.set('d_' + need[i], r[s[1]]); } });
    } catch (e) { /* prefetch opsional */ }
  };
})();
