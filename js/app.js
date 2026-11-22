/* app.js — sesi, login, kerangka (shell), router hash, bantuan & uji perangkat. Dimuat TERAKHIR. */
(function () {
  const TKA = window.TKA, U = TKA.ui, A = TKA.api, C = TKA.cache, esc = U.esc, I = U.i, $ = U.$;
  const S = (TKA.S = { user: null, boot: null, setting: {}, role: 'siswa' });
  const AUTH = 'tka:auth', PUB = 'tka:pub';
  let cleanup = null, rid = 0, started = false;

  // ------------------------------------------------------------ sesi
  const tokExp = t => { try { return JSON.parse(atob(String(t).split('.')[0].replace(/-/g, '+').replace(/_/g, '/'))).x || 0; } catch (e) { return 0; } };
  // Sesi selalu disimpan di penyimpanan lokal perangkat, sehingga aplikasi tetap masuk setelah ditutup.
  // Keluar hanya dilakukan lewat tombol Keluar (atau bila sesi kedaluwarsa / dicabut admin).
  function saveAuth() {
    try { localStorage.setItem(AUTH, JSON.stringify({ token: A.token, user: S.user })); } catch (e) {}
    try { sessionStorage.removeItem(AUTH); } catch (e) {}
  }
  function loadAuth() {
    try { return JSON.parse(localStorage.getItem(AUTH) || sessionStorage.getItem(AUTH)); } catch (e) { return null; }
  }
  function pubSetting(s) { if (s) { S.setting = Object.assign(S.setting, s); try { localStorage.setItem(PUB, JSON.stringify(S.setting)); } catch (e) {} } }
  TKA.logout = function (silent) {
    if (A.token && !silent) A.call('auth.logout').catch(() => {});
    C.clearUser();
    localStorage.removeItem(AUTH); sessionStorage.removeItem(AUTH);
    A.token = ''; S.user = null; S.boot = null; TKA.D.m = {};
    if (cleanup) { try { cleanup(); } catch (e) {} cleanup = null; }
    U.closeAll(); document.querySelectorAll('.exam,.lock,.warnov').forEach(n => n.remove());
    location.hash = ''; showLogin(silent ? 'Sesi Anda berakhir. Silakan masuk kembali.' : '');
  };
  A.onAuthFail = () => { if (S.user) TKA.logout(true); };

  // ------------------------------------------------------------ boot
  TKA.refreshBoot = async function () {
    const j = await A.call('boot', {}, { read: true });
    S.boot = j; C.set('boot', j); pubSetting(j.setting);
    return j;
  };

  // ------------------------------------------------------------ login
  function showLogin(msg) {
    started = false;
    try { Object.assign(S.setting, JSON.parse(localStorage.getItem(PUB) || '{}')); } catch (e) {}
    const st = S.setting, nm = st.nama_sekolah || 'Simulasi TKA';
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) && !navigator.standalone;
    document.getElementById('app').innerHTML =
      '<div class="and"><header class="and-top">' + U.logoEl(S.setting.logo_url, '68px') + '' +
      '<h1>SIMULASI TKA</h1><p id="lsub">' + esc(nm) + (st.tahun_ajaran ? ' · ' + esc(st.tahun_ajaran) : '') + '</p></header>' +
      '<main class="and-sheet"><div class="seg" id="lseg"><button data-a="l_role" data-r="siswa" class="on">Siswa</button><button data-a="l_role" data-r="guru">Pengawas</button><button data-a="l_role" data-r="admin">Admin</button></div>' +
      '<div id="lerr" class="alert err hide"></div><div class="col g16" id="lform"></div>' +
      '<div class="and-pwa hide" id="pwa">' + I('install_mobile') + '<div class="grow"><b>Pasang aplikasi</b><div class="xs muted">Buka cepat dari layar utama dan tetap bisa dipakai saat offline.</div></div><button class="btn sm" data-a="l_install">Pasang</button></div>' +
      (ios ? '<p class="xs muted tc">Di iPhone: ketuk Bagikan lalu <b>Tambah ke Layar Utama</b>.</p>' : '') +
      '<div class="links"><button data-a="h_tertib">' + I('gavel', 'sm') + 'Tata tertib</button><button data-a="h_bantuan">' + I('help', 'sm') + 'Bantuan</button><button data-a="h_uji">' + I('devices', 'sm') + 'Uji perangkat</button></div></main></div>';
    if (msg) lerr(msg);
    loginForm('siswa');
    if (TKA.installEvt && !matchMedia('(display-mode: standalone)').matches) showPwa(true);
    // "bangunkan" server Apps Script sejak halaman login terbuka (mengurangi cold start saat menekan Masuk)
    A.call('ping', {}, { read: true, retry: 1 }).then(j => { pubSetting(j.setting); const e = $('#lsub'); if (e) e.textContent = (j.setting.nama_sekolah || '') + (j.setting.tahun_ajaran ? ' · ' + j.setting.tahun_ajaran : ''); }).catch(() => {});
  }
  function showPwa(on) { const b = $('#pwa'); if (b) b.classList.toggle('hide', !on); }
  TKA.actions.l_install = async () => {
    const e = TKA.installEvt; if (!e) return;
    e.prompt();
    const r = await e.userChoice.catch(() => null);
    TKA.installEvt = null; showPwa(false);
    if (r && r.outcome === 'accepted') U.toast('Aplikasi sedang dipasang.', 'ok');
  };
  window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); TKA.installEvt = e; if (!started) showPwa(true); });
  window.addEventListener('appinstalled', () => { TKA.installEvt = null; showPwa(false); U.toast('Aplikasi sudah terpasang di perangkat Anda.', 'ok', 4000); });
  function lerr(m) { const e = $('#lerr'); if (!e) return; e.innerHTML = I('error', 'sm') + '<span>' + esc(m) + '</span>'; e.classList.toggle('hide', !m); }
  function loginForm(role) {
    S.role = role;
    U.$$('#lseg button').forEach(b => b.classList.toggle('on', b.dataset.r === role));
    const sw = role === 'siswa';
    $('#lform').innerHTML =
      '<div class="field"><label for="lu">' + (sw ? 'NISN' : 'Username') + '</label><div class="inpw">' + I(sw ? 'badge' : 'person') +
      '<input id="lu" class="input" ' + (sw ? 'inputmode="numeric" maxlength="10" placeholder="10 digit NISN"' : 'placeholder="Username"') + ' autocomplete="username" autocapitalize="none" spellcheck="false"></div></div>' +
      '<div class="field"><label for="lp">Kata sandi</label><div class="inpw">' + I('lock') + '<input id="lp" class="input" type="password" placeholder="Kata sandi" autocomplete="current-password"><button class="ibtn" type="button" data-a="l_eye" aria-label="Tampilkan sandi">' + I('visibility') + '</button></div></div>' +
      '<button class="btn lg block" id="lgo" data-a="l_go">Masuk ' + I('arrow_forward') + '</button>';
    lerr('');
    ['lu', 'lp'].forEach(id => { const e = $('#' + id); if (e) e.addEventListener('keydown', ev => { if (ev.key === 'Enter') doLogin(); }); });
    setTimeout(() => { const u = $('#lu'); if (u) u.focus(); }, 30);
  }
  async function doLogin() {
    const u = $('#lu').value.trim(), p = $('#lp').value, btn = $('#lgo');
    if (!u || !p) return lerr('Isi ' + (S.role === 'siswa' ? 'NISN' : 'username') + ' dan kata sandi.');
    if (S.role === 'siswa' && !/^\d{10}$/.test(u)) return lerr('NISN terdiri dari 10 digit angka.');
    btn.disabled = true; btn.innerHTML = '<span class="sk" style="width:18px;height:18px;border-radius:50%"></span> Memeriksa...'; lerr('');
    try {
      const j = await A.call('auth.login', { peran: S.role, username: u, password: p });
      A.token = j.token; S.user = j.user; pubSetting(j.setting);
      S.boot = j.boot || null;
      saveAuth();
      if (S.boot) C.set('boot', S.boot);
      enterApp();
      if (!S.boot) TKA.refreshBoot().then(() => route()).catch(U.err);
    } catch (e) {
      btn.disabled = false; btn.innerHTML = 'Masuk ' + I('arrow_forward');
      lerr(e.message); const pw = $('#lp'); if (pw) { pw.value = ''; pw.focus(); }
    }
  }

  // ------------------------------------------------------------ kerangka
  const NAV = {
    siswa: [['beranda', 'home', 'Beranda'], ['paket', 'assignment', 'Daftar Paket'], ['riwayat', 'history', 'Riwayat'], ['bantuan', 'help', 'Bantuan']],
    guru: [['dashboard', 'dashboard', 'Dashboard'], ['soal', 'quiz', 'Bank Soal'], ['paket-ujian', 'inventory_2', 'Paket Ujian'], ['jadwal', 'event', 'Jadwal Ujian'], ['monitoring', 'monitor_heart', 'Monitoring Live'], ['laporan', 'analytics', 'Laporan & Analisis']],
    admin: [['dashboard', 'dashboard', 'Dashboard'], ['pengguna', 'group', 'Manajemen Pengguna'], ['cetak', 'id_card', 'Cetak Kartu & Download Data Pengguna'], ['kelas-mapel', 'school', 'Kelas & Mapel'], ['soal', 'quiz', 'Bank Soal'], ['paket-ujian', 'inventory_2', 'Paket Ujian'], ['jadwal', 'event', 'Jadwal Ujian'], ['monitoring', 'monitor_heart', 'Monitoring Live'], ['laporan', 'analytics', 'Laporan & Analisis'], ['pengaturan', 'settings', 'Pengaturan Sistem']]
  };
  function ensureShell() {
    const role = S.user.peran, app = document.getElementById('app');
    if (app.dataset.shell === role && $('#view')) return;
    app.dataset.shell = role;
    const nm = S.setting.nama_sekolah || 'Simulasi TKA', links = NAV[role];
    if (role === 'siswa') {
      app.innerHTML = '<header class="top"><div class="brand">' + U.logoEl(S.setting.logo_url, '36px') + '<span class="t">' + esc(nm) + '</span></div>' +
        '<nav>' + links.map(l => '<a href="#/' + l[0] + '" data-nav="' + l[0] + '">' + I(l[1], 'sm') + l[2] + '</a>').join('') + '</nav>' +
        '<div class="me"><span class="nm">' + esc(S.user.nama) + '</span><span class="avatar fotobtn" data-a="foto_me" role="button" aria-label="Foto profil" style="cursor:pointer">' + U.fotoEl(S.user, 36) + '</span><button class="ibtn" data-a="logout" aria-label="Keluar" title="Keluar">' + I('logout') + '</button></div></header>' +
        '<main id="view" class="page"></main>' +
        '<nav class="bnav">' + links.map(l => '<a href="#/' + l[0] + '" data-nav="' + l[0] + '">' + I(l[1]) + '<span>' + l[2].replace('Daftar ', '') + '</span></a>').join('') + '</nav>';
    } else {
      const sub = role === 'admin' ? 'Panel Administrator' : 'Portal Guru & Pengawas';
      app.innerHTML = '<aside class="side" id="side"><div class="brand">' + U.logoEl(S.setting.logo_url, '38px') + '<div>SIMULASI TKA<small>' + sub + '</small></div></div>' +
        '<nav>' + links.map(l => '<a href="#/' + l[0] + '" data-nav="' + l[0] + '">' + I(l[1]) + '<span>' + l[2] + '</span></a>').join('') + '</nav>' +
        '<div class="foot"><button data-a="logout">' + I('logout') + 'Keluar</button></div></aside><div class="scrim" id="scrim" data-a="menu"></div>' +
        '<div class="stf"><div class="sbar"><button class="ibtn menu" data-a="menu" aria-label="Menu">' + I('menu') + '</button><div class="grow"><b>' + esc(nm) + '</b><span class="sm muted hm2"> · ' + esc(S.setting.tahun_ajaran || '') + '</span></div>' +
        '<span class="sm muted nm" style="display:none"></span><div class="row g8"><div class="who" style="text-align:right;line-height:18px"><div class="sm b">' + esc(S.user.nama) + '</div><div class="xs muted">' + (role === 'admin' ? 'Administrator' : 'Guru / Pengawas') + '</div></div><span class="avatar fotobtn" data-a="foto_me" role="button" aria-label="Foto profil" style="cursor:pointer">' + U.fotoEl(S.user, 36) + '</span></div></div>' +
        '<main id="view" class="page"></main></div>';
    }
  }
  TKA.actions.menu = () => { const s = $('#side'), c = $('#scrim'); if (s) { s.classList.toggle('open'); c.classList.toggle('open'); } };
  TKA.actions.logout = async () => { if (await U.confirm('Keluar dari aplikasi?', { ok: 'Keluar' })) TKA.logout(); };

  function enterApp() {
    started = true;
    document.getElementById('app').dataset.shell = '';
    if (!location.hash || location.hash === '#') location.hash = '#/' + (S.user.peran === 'siswa' ? 'beranda' : 'dashboard');
    ensureShell();
    route();
    if (S.user.peran !== 'siswa') setTimeout(() => TKA.D.prefetch(S.user.peran === 'admin' ? ['soal', 'paket', 'jadwal', 'users'] : ['soal', 'paket', 'jadwal']), 400);
    if (S.boot && A.token) TKA.refreshBoot().then(() => { if (!document.querySelector('.exam')) { const v = $('#view'); if (v && v.dataset.live === '1') route(); } }).catch(() => {});
  }

  // ------------------------------------------------------------ router
  TKA.route = (roles, pat, fn, opt) => { [].concat(roles).forEach(r => { TKA.routes[r][pat] = Object.assign({ fn: fn }, opt || {}); }); };
  function match(role, path) {
    const segs = path.split('/').filter(Boolean), defs = TKA.routes[role];
    for (const pat in defs) {
      const ps = pat.split('/'); if (ps.length !== segs.length) continue;
      const params = {}; let ok = true;
      ps.forEach((p, k) => { if (p[0] === ':') params[p.slice(1)] = decodeURIComponent(segs[k]); else if (p !== segs[k]) ok = false; });
      if (ok) return { def: defs[pat], params: params };
    }
    return null;
  }
  TKA.go = p => { const h = '#/' + p; if (location.hash === h) route(); else location.hash = h; };
  async function route() {
    if (!S.user || !started) return;
    const my = ++rid;
    if (cleanup) { try { cleanup(); } catch (e) {} cleanup = null; }
    const raw = (location.hash || '').replace(/^#\/?/, ''), path = raw.split('?')[0], q = new URLSearchParams(raw.split('?')[1] || '');
    if (TKA.examActive && path.indexOf('ujian/') !== 0) { location.replace('#/ujian/' + TKA.examActive); return; }
    const m = match(S.user.peran, path) || match(S.user.peran, S.user.peran === 'siswa' ? 'beranda' : 'dashboard');
    ensureShell();
    const sec = (path.split('/')[0]) || (S.user.peran === 'siswa' ? 'beranda' : 'dashboard');
    U.$$('[data-nav]').forEach(a => a.classList.toggle('on', a.dataset.nav === sec || (sec === 'hasil' && a.dataset.nav === 'riwayat')));
    const side = $('#side'); if (side) { side.classList.remove('open'); $('#scrim').classList.remove('open'); }
    const root = $('#view'); root.dataset.live = '';
    if (!m.def.full) window.scrollTo(0, 0);
    try {
      const c = await m.def.fn({ root: root, params: m.params, path: path, q: q, go: TKA.go, live: () => { root.dataset.live = '1'; } });
      if (my !== rid) { if (typeof c === 'function') c(); return; }
      cleanup = typeof c === 'function' ? c : null;
    } catch (e) { if (my === rid) { root.innerHTML = '<div class="card">' + U.empty('error', 'Gagal memuat halaman', e.message, '<button class="btn mt16" data-a="reload">Coba lagi</button>') + '</div>'; } }
  }
  TKA.actions.reload = () => route();
  window.addEventListener('hashchange', route);

  // ------------------------------------------------------------ bantuan & uji perangkat
  TKA.actions.h_tertib = () => U.modal({ title: 'Tata tertib ujian', body:
    '<ol class="col g8" style="padding-left:18px;margin:0"><li>Gunakan akun sendiri. Jangan membagikan NISN, kata sandi, atau token sesi.</li><li>Kerjakan secara mandiri; dilarang bekerja sama atau membuka sumber lain.</li><li>Selama ujian, jangan berpindah tab/aplikasi atau keluar dari layar penuh. Pelanggaran dicatat, dan setelah batas tertentu sesi <b>dikunci</b> sampai pengawas membukanya.</li><li>Jawaban tersimpan otomatis. Bila koneksi terputus, tetap kerjakan; jawaban dikirim ulang saat tersambung.</li><li>Ujian berakhir otomatis saat waktu habis. Tekan <b>Selesai & Kumpulkan</b> bila sudah yakin.</li></ol>', footer: '<button class="btn" data-a="m_close">Mengerti</button>' });
  TKA.actions.h_bantuan = () => {
    const wa = String(S.setting.wa_proktor || '').replace(/\D/g, '');
    U.modal({ title: 'Bantuan', body: '<div class="col g16"><div><h4>Tidak bisa masuk?</h4><p class="sm muted">Pastikan NISN 10 digit dan kata sandi sesuai kartu peserta. Setelah 5 kali salah, akun terkunci sementara; minta pengawas/admin mereset.</p></div>' +
      '<div><h4>Token sesi ujian</h4><p class="sm muted">Token diberikan pengawas di ruang ujian. Isi token saat Anda menekan Mulai pada ujian terjadwal.</p></div>' +
      '<div><h4>Layar terkunci saat ujian?</h4><p class="sm muted">Panggil pengawas. Pengawas akan memberi kode 6 karakter atau membuka kunci langsung. Waktu selama terkunci tidak mengurangi jatah Anda.</p></div>' +
      (wa ? '<a class="btn ok" target="_blank" rel="noopener" href="https://wa.me/' + wa + '">' + I('chat') + 'Hubungi pengawas via WhatsApp</a>' : '') + '</div>', footer: '<button class="btn" data-a="m_close">Tutup</button>' });
  };
  TKA.actions.h_uji = async () => {
    const h = U.modal({ title: 'Uji perangkat', sub: 'Pastikan perangkat siap sebelum ujian.', body: '<div id="ujb" class="col g8">' + U.skel(3, 36) + '</div>', footer: '<button class="btn" data-a="m_close">Tutup</button>' });
    const rows = []; const add = (ok, t, d) => rows.push('<div class="row g8">' + I(ok === null ? 'info' : ok ? 'check_circle' : 'cancel', 'f') + '<div class="grow"><div class="b sm">' + t + '</div><div class="xs muted">' + d + '</div></div></div>');
    let ms = 0, serverOk = false;
    try { const t0 = Date.now(); await A.call('ping', {}, { retry: 0, timeout: 15000 }); ms = Date.now() - t0; serverOk = true; } catch (e) {}
    add(navigator.onLine, 'Koneksi internet', navigator.onLine ? 'Terhubung.' : 'Tidak terhubung.');
    add(serverOk && ms < 4000, 'Server ujian', serverOk ? 'Respons ' + ms + ' ms' + (ms > 2500 ? ' (lambat)' : '') : 'Tidak dapat dijangkau.');
    let ls = false; try { localStorage.setItem('tka:t', '1'); localStorage.removeItem('tka:t'); ls = true; } catch (e) {}
    add(ls, 'Penyimpanan lokal', ls ? 'Aktif (cadangan jawaban saat offline).' : 'Dinonaktifkan. Jangan gunakan mode privat.');
    add(!!(document.documentElement.requestFullscreen || document.documentElement.webkitRequestFullscreen), 'Layar penuh', (document.documentElement.requestFullscreen || document.documentElement.webkitRequestFullscreen) ? 'Didukung.' : 'Tidak didukung peramban ini; deteksi pindah tab tetap aktif.');
    add(Math.abs(A.offset) < 60000, 'Jam perangkat', Math.abs(A.offset) < 60000 ? 'Sinkron dengan server (selisih ' + Math.round(A.offset / 1000) + ' dtk).' : 'Selisih ' + Math.round(A.offset / 60000) + ' menit dengan server. Timer tetap memakai jam server.');
    add(null, 'Layar', window.innerWidth + '×' + window.innerHeight + ' px');
    const b = h.$('#ujb'); if (b) b.innerHTML = rows.join('');
  };
  TKA.refreshShell = () => { const app = document.getElementById('app'); app.dataset.shell = ''; ensureShell(); route(); };
  // Dialog foto profil: pengguna mengubah fotonya sendiri; admin juga dapat mengubah foto siapa pun.
  TKA.fotoModal = function (u, self, onDone) {
    const h = U.modal({ title: 'Foto profil', sub: esc(u.nama), body:
      '<div class="col g16" style="align-items:center"><div id="fpv">' + U.fotoEl(u, 120) + '</div>' +
      '<div class="row g8 wrap" style="justify-content:center"><label class="btn sec" style="cursor:pointer">' + I('upload') + 'Unggah foto<input type="file" id="ffile" accept="image/*" hidden></label>' + (u.foto ? '<button class="btn dsec" id="fdel">' + I('delete') + 'Hapus foto</button>' : '') + '</div>' +
      '<p class="xs muted tc">Tanpa foto, aplikasi menampilkan avatar default. Foto dikecilkan dan dipotong persegi secara otomatis.</p></div>',
      footer: '<button class="btn" data-a="m_close">Selesai</button>' });
    const done = foto => {
      u.foto = foto;
      if (self) { S.user.foto = foto; if (S.boot && S.boot.profil) S.boot.profil.foto = foto; saveAuth(); }
      U.toast(foto ? 'Foto profil diperbarui.' : 'Foto dihapus. Avatar default digunakan.', 'ok');
      h.close(); if (onDone) onDone(); if (self) TKA.refreshShell();
    };
    h.$('#ffile').onchange = async ev => {
      const f = ev.target.files[0]; if (!f) return;
      try {
        const data = (await U.kecilkanGambar(f, 320, true)).split(',')[1];
        const body = { mime: 'image/jpeg', nama: 'foto', data: data }; if (!self) body.id = u.id;
        const j = await A.call('pengguna.foto', body, { timeout: 60000, retry: 0 });
        done(j.foto);
      } catch (e) { U.err(e); }
    };
    const del = h.$('#fdel');
    if (del) del.onclick = async () => { try { const body = { hapus: true }; if (!self) body.id = u.id; await A.call('pengguna.foto', body); done(''); } catch (e) { U.err(e); } };
  };
  TKA.actions.foto_me = () => TKA.fotoModal(S.user, true);
  TKA.actions.l_role = el => loginForm(el.dataset.r);
  TKA.actions.l_eye = el => { const p = $('#lp'); p.type = p.type === 'password' ? 'text' : 'password'; el.querySelector('.i').textContent = p.type === 'password' ? 'visibility' : 'visibility_off'; };
  TKA.actions.l_go = doLogin;

  // ------------------------------------------------------------ delegasi event global
  document.addEventListener('click', e => {
    const g = e.target.closest('[data-go]'); if (g) { TKA.go(g.dataset.go); return; }
    const el = e.target.closest('[data-a]'); if (!el) return;
    const f = TKA.actions[el.dataset.a]; if (f) { e.preventDefault && el.tagName === 'A' && e.preventDefault(); const r = f(el, e); if (r && r.catch) r.catch(U.err); }
  });
  ['input', 'change'].forEach(ev => document.addEventListener(ev, e => {
    const el = e.target.closest('[data-i]'); if (!el) return;
    if (ev === 'input' && el.tagName === 'SELECT') return;
    if (ev === 'change' && el.dataset.ev === 'input') return;
    const f = TKA.inputs[el.dataset.i]; if (f) f(el, e);
  }));
  window.addEventListener('unhandledrejection', e => { if (e.reason && e.reason.message && !e.reason.offline) console.warn(e.reason); });
  window.addEventListener('offline', () => U.toast('Anda sedang offline.', 'warn'));
  window.addEventListener('online', () => U.toast('Kembali online.', 'ok', 2000));

  // ------------------------------------------------------------ mulai
  TKA.start = function () {
    try { Object.assign(S.setting, JSON.parse(localStorage.getItem(PUB) || '{}')); } catch (e) {}
    const au = loadAuth();
    if (au && au.token && tokExp(au.token) > Date.now() + 60000) {
      A.token = au.token; S.user = au.user;
      const cb = C.get('boot'); if (cb) S.boot = cb.v;
      enterApp();
      if (!S.boot) TKA.refreshBoot().then(() => route()).catch(e => { if (!e.code) U.err(e); });
    } else { localStorage.removeItem(AUTH); sessionStorage.removeItem(AUTH); showLogin(); }
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(() => {});
  };
  document.addEventListener('DOMContentLoaded', TKA.start);
})();
