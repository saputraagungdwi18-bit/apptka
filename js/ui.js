/* ui.js — utilitas tampilan: escape, ikon, format, toast, modal, CSV. */
(function () {
  const TKA = (window.TKA = window.TKA || { actions: {}, inputs: {}, routes: { siswa: {}, guru: {}, admin: {} } });
  const U = (TKA.ui = {});

  U.esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const esc = U.esc;
  U.i = (n, c) => '<span class="i ' + (c || '') + '" aria-hidden="true">' + n + '</span>';
  U.$ = (s, r) => (r || document).querySelector(s);
  U.$$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  U.sleep = ms => new Promise(r => setTimeout(r, ms));
  U.debounce = (fn, ms) => { let t; return function () { const a = arguments, c = this; clearTimeout(t); t = setTimeout(() => fn.apply(c, a), ms); }; };
  U.initials = n => String(n || '?').trim().split(/\s+/).slice(0, 2).map(x => x[0]).join('').toUpperCase();
  U.num = v => { const n = Number(v); return isNaN(n) ? 0 : n; };

  // ---- format tanggal/angka (Indonesia, zona waktu perangkat) ----
  const BLN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  const HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const p2 = n => (n < 10 ? '0' : '') + n;
  U.jam = ms => { const d = new Date(ms); return p2(d.getHours()) + ':' + p2(d.getMinutes()); };
  U.tgl = ms => { const d = new Date(ms); return d.getDate() + ' ' + BLN[d.getMonth()] + ' ' + d.getFullYear(); };
  U.tglJam = ms => (ms ? U.tgl(ms) + ', ' + U.jam(ms) : '-');
  U.hari = ms => HARI[new Date(ms).getDay()];
  U.sama = (a, b) => new Date(a).toDateString() === new Date(b).toDateString();
  U.rel = (ms, now) => {
    const s = Math.round(((now || Date.now()) - ms) / 1000);
    if (s < 5) return 'baru saja'; if (s < 60) return s + ' dtk lalu'; if (s < 3600) return Math.floor(s / 60) + ' mnt lalu';
    if (s < 86400) return Math.floor(s / 3600) + ' jam lalu'; return U.tgl(ms);
  };
  U.hms = ms => { ms = Math.max(0, ms); const s = Math.floor(ms / 1000), h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60); return (h ? p2(h) + ':' : '') + p2(m) + ':' + p2(s % 60); };
  U.mnt = ms => Math.max(0, Math.ceil(ms / 60000)) + ' mnt';
  U.toInput = ms => { const d = new Date(ms); return d.getFullYear() + '-' + p2(d.getMonth() + 1) + '-' + p2(d.getDate()) + 'T' + p2(d.getHours()) + ':' + p2(d.getMinutes()); };
  U.fromInput = v => (v ? new Date(v).getTime() : 0);
  U.rb = n => Number(n || 0).toLocaleString('id-ID');

  // ---- komponen kecil ----
  U.badge = (t, k) => '<span class="badge ' + (k || 'neu') + '">' + esc(t) + '</span>';
  U.kes = k => U.badge(k, k === 'Mudah' ? 'ok' : k === 'Sukar' ? 'bad' : 'warn');
  U.stat = (ic, n, l, k) => '<div class="card stat ' + (k || '') + '"><div class="ic">' + U.i(ic, 'lg') + '</div><div><div class="n">' + n + '</div><div class="sm muted">' + esc(l) + '</div></div></div>';
  U.skel = (n, h) => { let s = '<div class="col g16">'; for (let i = 0; i < (n || 3); i++) s += '<div class="sk" style="height:' + (h || 84) + 'px"></div>'; return s + '</div>'; };
  U.empty = (ic, t, m, btn) => '<div class="empty">' + U.i(ic) + '<h4>' + esc(t) + '</h4><p class="sm">' + esc(m || '') + '</p>' + (btn || '') + '</div>';
  U.bar = (pct, k) => '<div class="progress ' + (k || (pct >= 70 ? 'ok' : pct >= 50 ? 'warn' : 'bad')) + '"><i style="width:' + Math.max(0, Math.min(100, pct)) + '%"></i></div>';
  U.pageHead = (t, sub, right) => '<div class="pghead"><div><h2>' + esc(t) + '</h2>' + (sub ? '<p class="sm">' + esc(sub) + '</p>' : '') + '</div><div class="row wrap g8">' + (right || '') + '</div></div>';
  U.opt = (arr, sel, ph) => (ph ? '<option value="">' + esc(ph) + '</option>' : '') + arr.map(o => '<option value="' + esc(o[0]) + '"' + (String(o[0]) === String(sel) ? ' selected' : '') + '>' + esc(o[1]) + '</option>').join('');

  // Teks soal: escape dulu (anti-XSS), baru tambahkan format aman. Baris diawali "$$ " = blok rumus.
  U.teks = s => {
    const lines = String(s == null ? '' : s).split('\n');
    return lines.map(l => /^\s*\$\$\s?/.test(l) ? '<span class="fm">' + esc(l.replace(/^\s*\$\$\s?/, '')) + '</span>' : esc(l).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')).join('<br>').replace(/<\/span><br>/g, '</span>');
  };
  U.safeImg = u => (/^https:\/\//i.test(u || '') ? u : '');

  // ---- avatar & logo ----
  // Avatar default sistem: siluet netral. Dipakai bila foto kosong atau gagal dimuat.
  U.defAv = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'><rect width='64' height='64' fill='%23d6e2f2'/><circle cx='32' cy='25' r='11' fill='%231e3a5f'/><path d='M12 56c2-11 11-17 20-17s18 6 20 17' fill='%231e3a5f'/></svg>";
  U.fotoEl = (u, px) => {
    const src = U.safeImg(u && u.foto), s = px || 36;
    return '<span class="avatar ph" style="width:' + s + 'px;height:' + s + 'px"><img alt="" src="' + esc(src || U.defAv) + '"' + (src ? ' onerror="this.onerror=null;this.src=TKA.ui.defAv"' : '') + '></span>';
  };
  U.logoEl = (url, size) => {
    const src = U.safeImg(url), s = size || '36px';
    return '<span class="logo' + (src ? ' has-img' : '') + '" style="width:' + s + ';height:' + s + ';border-radius:' + (parseInt(s, 10) > 48 ? '18px' : '10px') + '">' + (src ? '<img alt="Logo sekolah" src="' + esc(src) + '" onerror="this.parentElement.classList.remove(\'has-img\');this.remove()">' : '') + U.i('school', 'f') + '</span>';
  };
  // Kecilkan gambar di peramban. kotak = true → potong persegi di tengah (foto profil).
  U.kecilkanGambar = (file, max, kotak) => new Promise((res, rej) => {
    const url = URL.createObjectURL(file), im = new Image();
    im.onload = () => {
      URL.revokeObjectURL(url);
      const w = im.naturalWidth, h = im.naturalHeight, c = document.createElement('canvas'), x = c.getContext('2d');
      if (kotak) {
        const side = Math.min(w, h); c.width = c.height = Math.min(max, side);
        x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height);
        x.drawImage(im, (w - side) / 2, (h - side) / 2, side, side, 0, 0, c.width, c.height);
      } else {
        const sc = Math.min(1, max / Math.max(w, h)); c.width = Math.max(1, Math.round(w * sc)); c.height = Math.max(1, Math.round(h * sc));
        x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); x.drawImage(im, 0, 0, c.width, c.height);
      }
      res(c.toDataURL('image/jpeg', 0.88));
    };
    im.onerror = () => { URL.revokeObjectURL(url); rej(new Error('Berkas tidak dapat dibaca sebagai gambar.')); };
    im.src = url;
  });

  // ---- toast ----
  U.toast = (msg, kind, ms) => {
    let box = document.getElementById('toasts');
    if (!box) { box = document.createElement('div'); box.id = 'toasts'; box.setAttribute('role', 'status'); box.setAttribute('aria-live', 'polite'); document.body.appendChild(box); }
    const t = document.createElement('div');
    t.className = 'toast ' + (kind || '');
    t.innerHTML = U.i(kind === 'ok' ? 'check_circle' : kind === 'err' ? 'error' : kind === 'warn' ? 'warning' : 'info', kind === 'ok' ? 'f' : '') + '<span>' + esc(msg) + '</span>';
    box.appendChild(t);
    setTimeout(() => { t.style.opacity = 0; t.style.transition = 'opacity .25s'; setTimeout(() => t.remove(), 260); }, ms || 3600);
  };
  U.err = e => U.toast((e && e.message) || String(e), 'err', 5000);

  // ---- modal (bertumpuk) ----
  const stack = [];
  U.modal = o => {
    const ov = document.createElement('div');
    ov.className = 'ov' + (o.sheet ? ' sheet' : '');
    ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-modal', 'true');
    ov.innerHTML = '<div class="mdl ' + (o.cls || '') + '"><div class="mdl-h"><div class="grow"><h3>' + (o.title || '') + '</h3>' + (o.sub ? '<p class="sm muted">' + o.sub + '</p>' : '') + '</div>' +
      (o.noclose ? '' : '<button class="ibtn" data-a="m_close" aria-label="Tutup">' + U.i('close') + '</button>') + '</div><div class="mdl-b">' + (o.body || '') + '</div>' + (o.footer ? '<div class="mdl-f">' + o.footer + '</div>' : '') + '</div>';
    document.body.appendChild(ov);
    const h = { el: ov, onClose: o.onClose, close: () => { const i = stack.indexOf(h); if (i > -1) stack.splice(i, 1); ov.remove(); if (h.onClose) h.onClose(); }, $: s => ov.querySelector(s) };
    ov.addEventListener('mousedown', e => { if (e.target === ov && !o.noclose && !o.static) h.close(); });
    stack.push(h);
    const f = ov.querySelector('input:not([type=hidden]),select,textarea'); if (f && !o.nofocus) setTimeout(() => f.focus(), 30);
    return h;
  };
  U.topModal = () => stack[stack.length - 1];
  U.closeModal = () => { const h = stack[stack.length - 1]; if (h) h.close(); };
  U.closeAll = () => { while (stack.length) stack[stack.length - 1].close(); };
  U.confirm = (msg, o) => new Promise(res => {
    o = o || {};
    const h = U.modal({ title: o.title || 'Konfirmasi', body: '<p>' + msg + '</p>', noclose: true, nofocus: true,
      footer: '<button class="btn sec" data-a="m_no">' + (o.no || 'Batal') + '</button><button class="btn ' + (o.danger ? 'danger' : '') + '" data-a="m_yes">' + (o.ok || 'Ya, lanjutkan') + '</button>' });
    h.onClose = () => res(false);
    h.el.addEventListener('click', e => {
      const b = e.target.closest('[data-a]'); if (!b) return;
      if (b.dataset.a === 'm_yes') { h.onClose = null; h.close(); res(true); }
      if (b.dataset.a === 'm_no') { h.onClose = null; h.close(); res(false); }
    });
  });
  TKA.actions.m_close = () => U.closeModal();

  // ---- CSV (RFC 4180 sederhana) & unduh ----
  U.csvParse = text => {
    text = String(text).replace(/^\uFEFF/, '');
    const delim = (text.split('\n')[0].match(/;/g) || []).length > (text.split('\n')[0].match(/,/g) || []).length ? ';' : ',';
    const rows = []; let row = [], cur = '', q = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (q) { if (c === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += c; }
      else if (c === '"') q = true;
      else if (c === delim) { row.push(cur); cur = ''; }
      else if (c === '\n') { row.push(cur); rows.push(row); row = []; cur = ''; }
      else if (c !== '\r') cur += c;
    }
    if (cur !== '' || row.length) { row.push(cur); rows.push(row); }
    const h = (rows.shift() || []).map(x => x.trim().toLowerCase().replace(/\s+/g, '_'));
    return rows.filter(r => r.some(x => String(x).trim() !== '')).map(r => { const o = {}; h.forEach((k, i) => { if (k) o[k] = (r[i] == null ? '' : String(r[i])).trim(); }); return o; });
  };
  U.csvBuild = (head, rows) => '\uFEFF' + [head].concat(rows).map(r => r.map(v => { v = String(v == null ? '' : v); return /[",;\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }).join(',')).join('\r\n');
  U.download = (name, text, mime) => {
    const a = document.createElement('a'), url = URL.createObjectURL(new Blob([text], { type: mime || 'text/csv;charset=utf-8' }));
    a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 2000);
  };
  // Baca berkas tabel: CSV langsung; XLSX memakai SheetJS (dimuat hanya saat dibutuhkan).
  U.bacaTabel = file => new Promise((res, rej) => {
    const fr = new FileReader();
    if (/\.xlsx?$/i.test(file.name)) {
      fr.onload = async () => {
        try {
          if (!window.XLSX) await new Promise((ok, no) => { const s = document.createElement('script'); s.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js'; s.onload = ok; s.onerror = () => no(new Error('Tidak dapat memuat pembaca Excel (perlu internet). Simpan sebagai CSV lalu coba lagi.')); document.head.appendChild(s); });
          const wb = XLSX.read(fr.result, { type: 'array' });
          res(U.csvParse(XLSX.utils.sheet_to_csv(wb.Sheets[wb.SheetNames[0]])));
        } catch (e) { rej(e); }
      };
      fr.readAsArrayBuffer(file);
    } else { fr.onload = () => res(U.csvParse(fr.result)); fr.readAsText(file, 'utf-8'); }
    fr.onerror = () => rej(new Error('Gagal membaca berkas.'));
  });

  // ---- pager sederhana untuk tabel (data di memori → instan) ----
  U.pager = (total, page, per, act) => {
    const n = Math.max(1, Math.ceil(total / per)); page = Math.min(page, n);
    const from = total ? (page - 1) * per + 1 : 0, to = Math.min(total, page * per);
    let btn = ''; const mk = (p, l, d, on) => '<button data-a="' + act + '" data-p="' + p + '"' + (d ? ' disabled' : '') + (on ? ' class="on"' : '') + '>' + l + '</button>';
    btn += mk(page - 1, '‹', page <= 1);
    const set = new Set([1, n, page - 1, page, page + 1]);
    let last = 0; Array.from(set).filter(x => x >= 1 && x <= n).sort((a, b) => a - b).forEach(p => { if (p - last > 1) btn += '<button disabled>…</button>'; btn += mk(p, p, false, p === page); last = p; });
    btn += mk(page + 1, '›', page >= n);
    return '<div class="pager"><span class="sm muted">Menampilkan ' + from + '–' + to + ' dari ' + U.rb(total) + '</span><div class="pg">' + btn + '</div></div>';
  };
  U.copy = async t => { try { await navigator.clipboard.writeText(t); U.toast('Disalin ke papan klip', 'ok', 1800); } catch (e) { U.toast('Tidak bisa menyalin otomatis', 'warn'); } };
  TKA.actions.copy = el => U.copy(el.dataset.v);
})();
