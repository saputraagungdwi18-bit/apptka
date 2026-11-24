/* siswa.js — Beranda, Daftar Paket, Layar Ujian, Hasil & Pembahasan, Riwayat, Bantuan. */
(function () {
  const TKA = window.TKA, U = TKA.ui, A = TKA.api, S = TKA.S, esc = U.esc, I = U.i, $ = U.$, act = TKA.actions;
  const B = () => S.boot || {};

  // ------------------------------------------------------------ status jadwal (dihitung di klien dengan jam server)
  function jstat(j) {
    const now = A.now(), s = j.sesi && j.sesi.status;
    if (s === 'Selesai') return 'selesai';
    if (s === 'Berjalan' || s === 'Terkunci') return now <= j.selesai ? 'lanjut' : 'habis';
    if (now < j.mulai) return 'nanti';
    if (now > j.selesai) return 'lewat';
    return 'buka';
  }
  const JB = { selesai: ['Selesai', 'ok'], lanjut: ['Sedang dikerjakan', 'warn'], habis: ['Waktu habis', 'bad'], nanti: ['Terjadwal', 'info'], lewat: ['Terlewat', 'bad'], buka: ['Berlangsung', 'ok'] };
  function jbtn(j) {
    const st = jstat(j), a = 'data-jid="' + j.id_jadwal + '" data-pid="' + j.id_paket + '"';
    if (st === 'buka') return '<button class="btn" data-a="s_start" ' + a + '>' + I('play_arrow') + 'Mulai</button>';
    if (st === 'lanjut') return '<button class="btn" data-a="s_resume" ' + a + '>' + I('play_arrow') + 'Lanjutkan</button>';
    if (st === 'selesai') return '<button class="btn sec" data-go="hasil/' + j.sesi.id_sesi + '">' + I('fact_check') + 'Lihat hasil</button>';
    if (st === 'nanti') return '<button class="btn sec" disabled>Mulai ' + U.jam(j.mulai) + '</button>';
    return '';
  }
  function jcard(j) {
    const st = jstat(j), b = JB[st], now = A.now();
    const when = st === 'buka' || st === 'lanjut' ? 'Batas: ' + (U.sama(j.selesai, now) ? 'hari ini ' : U.tgl(j.selesai) + ' ') + U.jam(j.selesai) : U.hari(j.mulai) + ', ' + U.tgl(j.mulai) + ' · ' + U.jam(j.mulai) + '–' + U.jam(j.selesai);
    return '<div class="exam-item"><div class="ico">' + I('assignment', 'lg') + '</div><div class="grow"><div class="row g8 wrap"><h4>' + esc(j.nama) + '</h4>' + U.badge(b[0], b[1]) + (j.token_ok || st !== 'buka' ? '' : '') + '</div>' +
      '<div class="sm muted">' + esc(j.mapel) + ' · ' + j.jumlah_soal + ' soal · ' + j.durasi + ' menit</div><div class="sm muted">' + I('schedule', 'sm') + ' ' + when + ' · Pengawas: ' + esc(j.pengawas) + '</div></div>' + jbtn(j) + '</div>';
  }
  function lcard(p) {
    const a = 'data-pid="' + p.id_paket + '"';
    const btn = p.sesi ? '<button class="btn" data-a="s_resume" ' + a + '>' + I('play_arrow') + 'Lanjutkan</button>' : '<button class="btn" data-a="s_start" ' + a + '>' + I('play_arrow') + 'Mulai</button>';
    return '<div class="card hover col g8"><div class="row sp"><span class="ico" style="width:40px;height:40px">' + I('menu_book') + '</span>' + (p.sesi ? U.badge('Sedang dikerjakan', 'warn') : p.skor_terakhir != null ? U.badge('Terakhir ' + p.skor_terakhir, p.skor_terakhir >= p.kkm ? 'ok' : 'neu') : U.badge('Belum dicoba', 'neu')) + '</div>' +
      '<h4>' + esc(p.nama) + '</h4><div class="sm muted">' + esc(p.mapel) + ' · ' + p.jumlah_soal + ' soal · ' + p.durasi + ' menit</div>' + (p.deskripsi ? '<div class="sm muted">' + esc(p.deskripsi) + '</div>' : '') +
      '<div class="row g8 mt8">' + btn + (p.id_sesi_terakhir ? '<button class="btn sec" data-go="hasil/' + p.id_sesi_terakhir + '">Hasil</button>' : '') + '</div></div>';
  }

  // ------------------------------------------------------------ Beranda
  TKA.route('siswa', 'beranda', function (c) {
    c.live();
    const draw = () => {
      const b = B(), p = b.profil || S.user, jd = b.jadwal || [], rs = b.ringkasan || {}, now = A.now();
      const nxt = jd.filter(j => ['nanti', 'buka', 'lanjut'].indexOf(jstat(j)) > -1).sort((x, y) => x.mulai - y.mulai)[0];
      const aktif = jd.filter(j => jstat(j) === 'lanjut')[0], latAktif = (b.latihan || []).filter(l => l.sesi)[0];
      // Kartu utama: ujian yang sedang dikerjakan, lalu latihan belum selesai, lalu ujian berikutnya
      let hero;
      if (aktif) hero = { warn: true, kick: 'Sedang dikerjakan', nama: aktif.nama, meta: aktif.mapel + ' · ' + aktif.jumlah_soal + ' soal · batas ' + U.jam(aktif.selesai), btn: jbtn(aktif) };
      else if (latAktif) hero = { warn: true, kick: 'Latihan belum selesai', nama: latAktif.nama, meta: latAktif.mapel + ' · ' + latAktif.jumlah_soal + ' soal', btn: '<button class="btn" data-a="s_resume" data-pid="' + latAktif.id_paket + '">' + I('play_arrow') + 'Lanjutkan</button>' };
      else if (nxt) hero = { warn: false, kick: jstat(nxt) === 'buka' ? 'Sedang berlangsung' : 'Ujian berikutnya', nama: nxt.nama, meta: nxt.mapel + ' · ' + nxt.jumlah_soal + ' soal · ' + nxt.durasi + ' menit', when: (U.sama(nxt.mulai, now) ? 'Hari ini · ' : U.hari(nxt.mulai) + ', ' + U.tgl(nxt.mulai) + ' · ') + U.jam(nxt.mulai), btn: jbtn(nxt) };
      else hero = { warn: false, kick: 'Belum ada ujian', nama: 'Menunggu jadwal', meta: 'Pengawas akan menjadwalkan simulasi untuk kelas Anda.', btn: '' };

      const heroHtml = '<section class="sh-hero sh-in' + (hero.warn ? ' warn' : '') + '"><div class="sh-kick">' + esc(hero.kick) + '</div>' +
        '<div class="sh-hero-t">' + esc(hero.nama) + '</div><div class="sh-hero-m">' + esc(hero.meta) + '</div>' +
        (hero.when ? '<div class="sh-hero-w">' + I('schedule', 'sm') + ' ' + esc(hero.when) + '</div>' : '') +
        (hero.btn ? '<div class="sh-hero-b">' + hero.btn + '</div>' : '') + '</section>';

      const menu = '<nav class="sh-menu sh-in" style="animation-delay:.08s">' + [
        ['#/paket', 'assignment', 'Daftar Paket', '#e0f7f4', '#0f766e'],
        ['#/riwayat', 'history', 'Riwayat', '#fef3c7', '#b45309'],
        ['#/paket', 'menu_book', 'Latihan', '#dbeafe', '#1d4ed8'],
        ['#/bantuan', 'help', 'Bantuan', '#fce7f3', '#be185d']
      ].map(m => '<a class="sh-tile" href="' + m[0] + '" style="--bg:' + m[3] + ';--fg:' + m[4] + '"><span class="sh-ico">' + I(m[1]) + '</span>' + m[2] + '</a>').join('') + '</nav>';

      const stats = '<div class="sh-stats sh-in" style="animation-delay:.12s">' +
        '<div class="sh-stat"><span>Selesai</span><b>' + (rs.selesai || 0) + '</b></div>' +
        '<div class="sh-stat"><span>Terjadwal</span><b>' + jd.length + '</b></div>' +
        '<div class="sh-stat"><span>Berikutnya</span><b>' + (nxt ? U.jam(nxt.mulai) : '—') + '</b></div></div>';

      const kartuJadwal = j => {
        const st = jstat(j), bd = JB[st];
        const kapan = st === 'buka' || st === 'lanjut' ? 'Batas ' + U.jam(j.selesai) : U.tgl(j.mulai) + ' · ' + U.jam(j.mulai);
        return '<div class="sh-card"><div class="row sp">' + U.badge(bd[0], bd[1]) + '</div><h4 class="sh-ct">' + esc(j.nama) + '</h4>' +
          '<div class="sm muted">' + esc(j.mapel) + ' · ' + j.jumlah_soal + ' soal · ' + j.durasi + ' menit</div>' +
          '<div class="sm muted">' + I('schedule', 'sm') + ' ' + kapan + '</div><div class="sh-cb">' + jbtn(j) + '</div></div>';
      };
      const kartuLatihan = p => {
        const btn = p.sesi ? '<button class="btn" data-a="s_resume" data-pid="' + p.id_paket + '">' + I('play_arrow') + 'Lanjutkan</button>' : '<button class="btn" data-a="s_start" data-pid="' + p.id_paket + '">' + I('play_arrow') + 'Mulai</button>';
        return '<div class="sh-card"><div class="row sp">' + (p.sesi ? U.badge('Sedang dikerjakan', 'warn') : p.skor_terakhir != null ? U.badge('Terakhir ' + Math.round(p.skor_terakhir), 'info') : U.badge('Baru', 'neu')) + '</div>' +
          '<h4 class="sh-ct">' + esc(p.nama) + '</h4><div class="sm muted">' + esc(p.mapel) + ' · ' + p.jumlah_soal + ' soal · ' + p.durasi + ' menit</div><div class="sh-cb">' + btn + '</div></div>';
      };

      const body = '<div class="sh-h sh-in"><h3>Ujian terjadwal</h3><a href="#/paket">Semua</a></div>' +
        (jd.length ? '<div class="sh-scroll">' + jd.slice(0, 6).map(kartuJadwal).join('') + '</div>'
          : '<div class="card">' + U.empty('event_available', 'Belum ada ujian terjadwal', 'Pengawas akan menjadwalkan simulasi untuk kelas Anda.') + '</div>') +
        ((b.latihan || []).length ? '<div class="sh-h"><h3>Latihan mandiri</h3><a href="#/paket">Semua</a></div><div class="sh-scroll">' + b.latihan.slice(0, 6).map(kartuLatihan).join('') + '</div>' : '') +
        '<div class="sh-h"><h3>Diagnostik topik</h3></div>' +
        '<div class="sh-card sh-diag">' + ((b.diag || []).length
          ? b.diag.slice(0, 5).map(d => '<div class="sh-bar"><span>' + esc(d.topik) + '</span>' + U.bar(d.pct) + '<b>' + Math.round(d.pct) + '%</b></div>').join('')
          : U.empty('insights', 'Belum ada data', 'Selesaikan ujian untuk melihat topik yang perlu diperkuat.')) + '</div>';

      c.root.innerHTML = '<div class="sh">' +
        '<header class="sh-top sh-in"><div><div class="sh-hi">Halo, ' + esc(String(p.nama || '').split(' ')[0]) + ' 👋</div>' +
        '<div class="sh-sub">' + esc((p.kelas ? p.kelas + ' · ' : '') + ((S.setting && S.setting.tahun_ajaran) || '')) + '</div></div>' +
        '<span class="sh-pill" title="Rata-rata skor (skala 100)">★ ' + (rs.rata || 0) + '</span></header>' +
        heroHtml + menu + stats + body + '</div>';
    };
    draw();
    const t = setInterval(() => { if (!document.hidden && !document.querySelector('.exam')) draw(); }, 30000);
    return () => clearInterval(t);
  });

  // ------------------------------------------------------------ Daftar paket
  let fMapel = 'Semua';
  TKA.route('siswa', 'paket', function (c) {
    c.live();
    const draw = () => {
      const b = B(), jd = b.jadwal || [], lt = b.latihan || [], mp = ['Semua'].concat(Array.from(new Set(jd.map(j => j.mapel).concat(lt.map(l => l.mapel)))));
      if (mp.indexOf(fMapel) < 0) fMapel = 'Semua';
      const J = jd.filter(j => fMapel === 'Semua' || j.mapel === fMapel), L = lt.filter(l => fMapel === 'Semua' || l.mapel === fMapel);
      c.root.innerHTML = U.pageHead('Daftar paket', 'Ujian terjadwal dan latihan mandiri.') +
        '<div class="chips mb16">' + mp.map(m => '<button class="chip' + (m === fMapel ? ' on' : '') + '" data-a="s_fm" data-m="' + esc(m) + '">' + esc(m) + '</button>').join('') + '</div>' +
        '<h3 class="mb8">Ujian terjadwal</h3><div class="col g12">' + (J.length ? J.map(jcard).join('') : '<div class="card">' + U.empty('event_busy', 'Tidak ada ujian terjadwal', 'Jadwal baru akan muncul di sini.') + '</div>') + '</div>' +
        '<h3 class="mt24 mb8">Latihan mandiri</h3>' + (L.length ? '<div class="grid g3">' + L.map(lcard).join('') + '</div>' : '<div class="card">' + U.empty('menu_book', 'Belum ada paket latihan', 'Guru belum menerbitkan paket latihan untuk mapel ini.') + '</div>');
    };
    draw();
    const t = setInterval(() => { if (!document.hidden) draw(); }, 30000);
    c.redraw = draw; TKA._pk = draw;
    return () => { clearInterval(t); TKA._pk = null; };
  });
  act.s_fm = el => { fMapel = el.dataset.m; if (TKA._pk) TKA._pk(); };

  // ------------------------------------------------------------ Riwayat
  let rq = '', rpage = 1;
  TKA.route('siswa', 'riwayat', function (c) {
    c.live();
    const draw = () => {
      const all = (B().riwayat || []).filter(r => !rq || (r.nama + ' ' + r.mapel).toLowerCase().indexOf(rq.toLowerCase()) > -1), per = 10;
      const pg = all.slice((rpage - 1) * per, rpage * per);
      c.root.innerHTML = U.pageHead('Riwayat ujian', 'Semua hasil yang pernah Anda kerjakan.') +
        '<div class="card pad0"><div class="filters"><div class="grow"><input class="input" id="rq" placeholder="Cari paket atau mapel…" value="' + esc(rq) + '" data-i="s_rq" data-ev="input"></div></div>' +
        (pg.length ? '<div class="tw"><table><thead><tr><th>Tanggal</th><th>Paket</th><th>Mapel</th><th>Skor</th><th>Benar / Salah / Kosong</th><th>Status</th><th></th></tr></thead><tbody>' +
          pg.map(r => '<tr><td class="sm">' + U.tglJam(r.selesai) + '</td><td><b>' + esc(r.nama) + '</b><div class="xs muted">' + (r.resmi ? 'Ujian resmi' : 'Latihan') + '</div></td><td>' + esc(r.mapel) + '</td><td><b style="color:var(--primary-c);font-size:17px">' + (r.skor === null ? '—' : r.skor) + '</b></td><td class="sm">' + r.benar + ' / ' + r.salah + ' / ' + r.kosong + '</td><td>' + (r.skor === null ? U.badge('Menunggu', 'neu') : U.badge(r.lulus ? 'Lulus' : 'Belum lulus', r.lulus ? 'ok' : 'bad')) + '</td><td class="tr"><button class="btn sec sm" data-go="hasil/' + r.id_sesi + '">Detail</button></td></tr>').join('') + '</tbody></table></div>' + U.pager(all.length, rpage, per, 's_rp')
          : U.empty('history', 'Belum ada riwayat ujian', 'Hasil akan muncul setelah Anda mengumpulkan ujian.', '<a class="btn mt16" href="#/paket">Mulai latihan</a>')) + '</div>';
      const e = $('#rq'); if (e && rq) { e.focus(); e.setSelectionRange(rq.length, rq.length); }
    };
    TKA._rh = draw; draw();
    return () => { TKA._rh = null; };
  });
  TKA.inputs.s_rq = U.debounce(el => { rq = el.value; rpage = 1; if (TKA._rh) TKA._rh(); }, 180);
  act.s_rp = el => { rpage = Number(el.dataset.p); if (TKA._rh) TKA._rh(); };

  // ------------------------------------------------------------ Bantuan
  TKA.route('siswa', 'bantuan', function (c) {
    c.root.innerHTML = U.pageHead('Bantuan', 'Persiapan dan panduan ujian.') +
      '<div class="grid g3"><div class="card hover col g8"><span class="ico">' + I('gavel', 'lg') + '</span><h4>Tata tertib</h4><p class="sm muted">Aturan yang berlaku selama simulasi.</p><button class="btn sec" data-a="h_tertib">Baca</button></div>' +
      '<div class="card hover col g8"><span class="ico">' + I('devices', 'lg') + '</span><h4>Uji perangkat</h4><p class="sm muted">Periksa koneksi, penyimpanan, dan jam perangkat.</p><button class="btn sec" data-a="h_uji">Mulai uji</button></div>' +
      '<div class="card hover col g8"><span class="ico">' + I('support_agent', 'lg') + '</span><h4>Butuh bantuan?</h4><p class="sm muted">Masalah masuk, token, atau layar terkunci.</p><button class="btn sec" data-a="h_bantuan">Buka panduan</button></div></div>' +
      '<div class="card mt16"><h4 class="mb8">Tips mengerjakan</h4><ul class="col g8 sm" style="margin:0;padding-left:18px"><li>Tandai soal ragu-ragu lalu kembali setelah soal lain selesai.</li><li>Gunakan <b>A−/A/A+</b> untuk mengatur ukuran huruf.</li><li>Pintasan papan ketik: ← → pindah soal, A–E pilih jawaban, F tandai ragu-ragu.</li><li>Jangan berpindah tab/aplikasi selama ujian.</li></ul></div>';
  });

  // ------------------------------------------------------------ Mulai / lanjutkan
  function safeOn(pid, jid) {
    const it = jid ? (B().jadwal || []).filter(j => j.id_jadwal === jid)[0] : (B().latihan || []).filter(l => l.id_paket === pid)[0];
    return it && it.cfg ? !!it.cfg.safe : S.setting.safe_exam === '1';
  }
  function fsOn() { const e = document.documentElement; try { (e.requestFullscreen || e.webkitRequestFullscreen || function () {}).call(e); } catch (x) {} }
  function fsOff() { try { if (document.fullscreenElement) document.exitFullscreen(); } catch (x) {} }
  function findItem(el) {
    const b = B(), jid = el.dataset.jid, pid = el.dataset.pid;
    return jid ? (b.jadwal || []).filter(j => j.id_jadwal === jid)[0] : (b.latihan || []).filter(l => l.id_paket === pid)[0];
  }
  let starting = false;
  async function beginExam(pid, jid, btn) {
    if (starting) return; starting = true;
    const old = btn && btn.innerHTML; if (btn) { btn.disabled = true; btn.innerHTML = 'Menyiapkan…'; }
    try {
      const j = await A.call('s.mulai', { id_paket: pid, id_jadwal: jid || '' }, { retry: 1, timeout: 40000 });
      TKA.pending = { id: j.id_sesi, data: j, pid: pid, jid: jid || '' };
      try { localStorage.setItem('tka:ex:' + j.id_sesi + ':b', JSON.stringify({ pid: pid, jid: jid || '', data: j })); } catch (e) {}
      U.closeAll();
      TKA.go('ujian/' + j.id_sesi);
    } catch (e) {
      if (btn) { btn.disabled = false; btn.innerHTML = old; }
      fsOff();
      if (e.code === 'TOKEN') { U.closeAll(); startModal(pid, jid, true); } else U.err(e);
    } finally { starting = false; }
  }
  function startModal(pid, jid, needTok) {
    const it = (jid ? (B().jadwal || []).filter(j => j.id_jadwal === jid) : (B().latihan || []).filter(l => l.id_paket === pid))[0]; if (!it) return;
    const cf = it.cfg || {}; const tok = !!jid && (needTok || !!cf.wajib_token);
    const safe = cf.safe !== undefined ? !!cf.safe : S.setting.safe_exam === '1';
    const h = U.modal({ title: 'Konfirmasi mulai ujian', sub: esc(it.nama), body:
      '<div class="col g16"><div class="card flat soft"><div class="row sp sm"><span class="muted">Mata pelajaran</span><b>' + esc(it.mapel) + '</b></div><div class="row sp sm mt8"><span class="muted">Jumlah soal</span><b>' + it.jumlah_soal + '</b></div><div class="row sp sm mt8"><span class="muted">Durasi</span><b>' + it.durasi + ' menit</b></div><div class="row sp sm mt8"><span class="muted">KKM</span><b>' + it.kkm + '</b></div></div>' +
      (tok ? '<div class="field"><label>Token sesi ujian dari pengawas</label><input id="stk" class="input tokinp" maxlength="8" placeholder="• • • • • •" autocapitalize="characters" autocomplete="off"><span class="hint">Wajib diisi setiap kali memulai ujian terjadwal.</span></div>' : '') +
      (safe ? '<div class="alert warn">' + I('shield') + '<div><b>Mode ujian aman aktif.</b> Berpindah tab/aplikasi atau keluar layar penuh dicatat sebagai pelanggaran. Setelah ' + (cf.batas || S.setting.batas_pelanggaran || 3) + ' pelanggaran, sesi dikunci sampai pengawas membukanya.</div></div>' : '') +
      '<label class="row g8 sm"><input type="checkbox" class="chk" id="sok"> Saya siap memulai ujian dan memahami tata tertib.</label></div>',
      footer: '<button class="btn sec" data-a="m_close">Batal</button><button class="btn off" id="sgo" data-a="s_go" data-pid="' + pid + '" data-jid="' + (jid || '') + '" data-tok="' + (tok ? 1 : 0) + '">Mulai sekarang</button>' });
    h.$('#sok').addEventListener('change', e => h.$('#sgo').classList.toggle('off', !e.target.checked));
  }
  act.s_start = el => { if (!findItem(el)) return; startModal(el.dataset.pid, el.dataset.jid || ''); };
  act.s_resume = el => { if (safeOn(el.dataset.pid, el.dataset.jid || '')) fsOn(); return beginExam(el.dataset.pid, el.dataset.jid || '', el); };
  act.s_go = async el => {
    const pid = el.dataset.pid, jid = el.dataset.jid;
    if (safeOn(pid, jid)) fsOn();
    if (el.dataset.tok === '1') {
      const t = ($('#stk') || {}).value || '';
      if (!t.trim()) { fsOff(); return U.toast('Isi token sesi ujian terlebih dulu.', 'warn'); }
      el.disabled = true;
      try { await A.call('s.token', { token: t.trim() }); const it = (B().jadwal || []).filter(j => j.id_jadwal === jid)[0]; if (it) it.token_ok = true; }
      catch (e) { el.disabled = false; fsOff(); return U.err(e); }
    }
    return beginExam(pid, jid, el);
  };

  // ============================================================ LAYAR UJIAN
  const FS = { s: 16, m: 18, l: 21 };
  TKA.route('siswa', 'ujian/:id', async function (c) {
    const id = c.params.id;
    let data = TKA.pending && TKA.pending.id === id ? TKA.pending.data : null;
    if (!data) {
      let st = null; try { st = JSON.parse(localStorage.getItem('tka:ex:' + id + ':b')); } catch (e) {}
      if (!st) { TKA.examActive = null; TKA.go('beranda'); return; }
      c.root.innerHTML = '<div class="card">' + U.skel(2, 60) + '</div>';
      try { data = await A.call('s.mulai', { id_paket: st.pid, id_jadwal: st.jid }, { retry: 2, timeout: 40000 }); }
      catch (e) {
        if (e.offline) data = st.data; // buka dari salinan lokal; sinkron saat online
        else { TKA.examActive = null; localStorage.removeItem('tka:ex:' + id + ':b'); U.err(e); TKA.go('beranda'); return; }
      }
    }
    TKA.pending = null;
    return startExam(c, id, data);
  }, { full: true });

  function startExam(c, id, d) {
    TKA.examActive = id;
    const cfg = d.cfg || { batas: 3, safe: true, autosave: 30 }, soal = d.soal, N = soal.length;
    const X = { id: id, d: d, soal: soal, idx: 0, jw: Object.assign({}, d.jawaban), ragu: new Set(d.ragu || []), berakhir: d.berakhir, locked: d.status === 'Terkunci', pl: d.pelanggaran || 0, dirty: false, saving: false, again: false, submitting: false, lastViol: 0, fs: localStorage.getItem('tka:fs') || 'm', warned5: false, warned1: false, log: d.log || [] };
    try { const loc = JSON.parse(localStorage.getItem('tka:ex:' + id + ':a') || 'null'); if (loc) { Object.assign(X.jw, loc.jw || {}); (loc.ragu || []).forEach(r => X.ragu.add(r)); X.dirty = true; } } catch (e) {}
    const ids = soal.map(s => s.id);
    const el = document.createElement('div'); el.className = 'exam'; el.id = 'exam'; el.style.setProperty('--qs', FS[X.fs] + 'px');
    el.innerHTML = '<div class="ex-head"><span class="logo" style="width:36px;height:36px;border-radius:10px;flex:none">' + I('school', 'f') + '</span><div class="tt grow"><b>' + esc(d.paket.nama) + '</b><small class="muted xs">' + esc(d.paket.mapel) + ' · ' + esc(d.paket.kode || '') + '</small></div>' +
      '<span class="save" id="exsave">' + I('cloud_done', 'f') + '<span class="tx">Tersimpan</span></span><div class="timer" id="extimer">' + I('timer') + '<span id="exclock">--:--</span></div></div>' +
      '<div class="ex-body"><div class="ex-q" id="exq"></div><aside class="ex-nav" id="exnav"></aside></div>' +
      '<div class="ex-foot"><button class="btn sec" data-a="x_prev" id="xprev">' + I('chevron_left') + '<span>Sebelumnya</span></button>' +
      '<button class="btn sec ex-mnav" data-a="x_grid" aria-label="Navigasi soal" title="Navigasi soal">' + I('grid_view') + '</button><button class="btn flag ex-mnav" data-a="x_flag" id="xflagm" aria-label="Tandai ragu-ragu" title="Tandai ragu-ragu">' + I('flag') + '</button>' +
      '<span class="sm muted lbl-d" id="xprog"></span><button class="btn" data-a="x_next" id="xnext"><span>Berikutnya</span>' + I('chevron_right') + '</button></div>';
    document.body.appendChild(el);
    document.documentElement.style.overflow = 'hidden';
    const q = id => el.querySelector(id);

    function persist() { try { localStorage.setItem('tka:ex:' + id + ':a', JSON.stringify({ jw: X.jw, ragu: Array.from(X.ragu), t: Date.now() })); } catch (e) {} }
    function setSave(k) {
      const s = q('#exsave'); if (!s) return; s.className = 'save' + (k === 'ok' ? '' : k === 'wait' ? ' wait' : ' off');
      s.innerHTML = I(k === 'ok' ? 'cloud_done' : k === 'wait' ? 'sync' : 'cloud_off', 'f') + '<span class="tx">' + (k === 'ok' ? 'Tersimpan' : k === 'wait' ? 'Menyimpan…' : 'Tersimpan di perangkat') + '</span>';
    }
    const counts = () => { let a = 0, r = 0; ids.forEach(i => { if (X.jw[i]) a++; if (X.ragu.has(i)) r++; }); return { a: a, r: r, k: N - a }; };

    function renderNav() {
      const ct = counts(), cls = i => 'qt' + (X.jw[ids[i]] ? ' ans' : '') + (X.ragu.has(ids[i]) ? ' flg' : '') + (i === X.idx ? ' cur' : '');
      const grid = '<div class="qgrid">' + ids.map((_, i) => '<button class="' + cls(i) + '" data-a="x_go" data-n="' + i + '" aria-label="Soal ' + (i + 1) + '"' + (!cfg.nav && i < X.idx ? ' disabled' : '') + '>' + (i + 1) + '</button>').join('') + '</div>';
      return '<div class="row sp"><h4>Navigasi soal</h4><span class="sm muted">' + ct.a + '/' + N + '</span></div>' + U.bar(N ? 100 * ct.a / N : 0, 'ok') + grid +
        '<div class="leg"><span><i style="background:var(--success)"></i>Dijawab</span><span><i></i>Belum</span><span><i style="background:var(--secondary)"></i>Ragu-ragu</span></div>' +
        '<div class="row sp sm mt16"><span class="muted">Terjawab</span><b>' + ct.a + '</b></div><div class="row sp sm"><span class="muted">Ragu-ragu</span><b>' + ct.r + '</b></div><div class="row sp sm"><span class="muted">Belum dijawab</span><b>' + ct.k + '</b></div>' +
        '<button class="btn block mt16" data-a="x_finish">' + I('task_alt') + 'Selesai & Kumpulkan</button>';
    }
    function render() {
      const s = soal[X.idx], sel = X.jw[s.id], fl = X.ragu.has(s.id);
      q('#exq').innerHTML = '<div class="ex-card"><div class="q-meta"><b class="bb" style="font-size:18px">Soal ' + s.no + ' <span class="muted b" style="font-size:14px">dari ' + N + '</span></b>' + U.badge(s.topik || 'Umum', 'neu') + U.kes(s.kesulitan) + U.badge((s.poin || 1) + ' poin', 'info') + '<span class="grow"></span>' +
        '<div class="fsz" title="Ukuran huruf"><button data-a="x_fs" data-s="s" class="' + (X.fs === 's' ? 'on' : '') + '" style="font-size:12px">A</button><button data-a="x_fs" data-s="m" class="' + (X.fs === 'm' ? 'on' : '') + '" style="font-size:15px">A</button><button data-a="x_fs" data-s="l" class="' + (X.fs === 'l' ? 'on' : '') + '" style="font-size:19px">A</button></div>' +
        '<button class="btn flag sm' + (fl ? ' on' : '') + '" data-a="x_flag">' + I('flag', fl ? 'f sm' : 'sm') + (fl ? 'Ragu-ragu' : 'Tandai ragu') + '</button></div>' +
        '<div class="q-txt">' + U.teks(s.pertanyaan) + '</div>' + (U.safeImg(s.gambar) ? '<img class="q-img" src="' + esc(U.safeImg(s.gambar)) + '" alt="Gambar soal" loading="lazy">' : '') +
        '<div role="radiogroup" aria-label="Pilihan jawaban">' + s.opsi.map((o, k) => '<button class="opt' + (sel === o.k ? ' sel' : '') + '" role="radio" aria-checked="' + (sel === o.k) + '" data-a="x_pick" data-k="' + o.k + '"><span class="k">' + 'ABCDE'[k] + '</span><span class="grow">' + U.teks(o.t) + '</span></button>').join('') + '</div>' +
        '<div class="row mt16">' + (sel ? '<button class="btn ghost sm" data-a="x_clear">' + I('backspace', 'sm') + 'Hapus jawaban</button>' : '') + '</div></div>';
      q('#exnav').innerHTML = renderNav();
      q('#xprev').disabled = X.idx === 0 || !cfg.nav;
      const last = X.idx === N - 1, nx = q('#xnext');
      nx.setAttribute('data-a', last ? 'x_finish' : 'x_next'); nx.innerHTML = '<span>' + (last ? 'Selesai' : 'Berikutnya') + '</span>' + I(last ? 'task_alt' : 'chevron_right');
      q('#xprog').textContent = counts().a + ' dari ' + N + ' terjawab';
      const fm = q('#xflagm'); if (fm) fm.classList.toggle('on', fl);
      q('#exq').scrollTop = 0;
    }
    function touch() { X.dirty = true; persist(); clearTimeout(X.tSave); X.tSave = setTimeout(() => save(), 5000); }

    // ---- autosave + detak jantung ----
    async function save() {
      if (X.submitting) return;
      if (X.saving) { X.again = true; return; }
      X.saving = true; if (X.dirty) setSave('wait');
      const payload = { id_sesi: id }, sent = X.dirty;
      if (sent) { payload.jawaban = X.jw; payload.ragu = Array.from(X.ragu); }
      try {
        const j = await A.call('s.simpan', payload, { retry: 0, timeout: 20000 });
        if (sent) X.dirty = false;
        if (j.berakhir) X.berakhir = j.berakhir;
        if (j.status === 'Terkunci') showLock(); else if (X.locked && j.status === 'Berjalan') hideLock();
        if (j.status === 'Habis') { finish(true); return; }
        if (j.status === 'Selesai') { done(); return; }
        setSave('ok');
      } catch (e) { if (e.code === 'AUTH') return; setSave('off'); }
      finally { X.saving = false; if (X.again) { X.again = false; save(); } }
    }

    // ---- timer ----
    function tick() {
      if (X.submitting) return;
      const left = X.berakhir - A.now(), t = q('#extimer'); if (!t) return;
      q('#exclock').textContent = X.locked ? 'DIJEDA' : U.hms(left);
      t.classList.toggle('low', !X.locked && left < 300000);
      if (!X.locked) {
        if (left < 300000 && !X.warned5) { X.warned5 = true; U.toast('Sisa waktu 5 menit.', 'warn', 5000); }
        if (left < 60000 && !X.warned1) { X.warned1 = true; U.toast('Sisa waktu 1 menit!', 'warn', 5000); }
        if (left <= 0) finish(true);
      }
    }

    // ---- pelanggaran & kunci ----
    function reportViol(jenis) {
      if (!cfg.safe || X.locked || X.submitting) return;
      const now = Date.now(); if (now - X.lastViol < 2500) return; X.lastViol = now;
      const send = async n => {
        try {
          const j = await A.call('s.pelanggaran', { id_sesi: id, jenis: jenis }, { retry: 0, timeout: 15000 });
          X.pl = j.pelanggaran; X.log = j.log || X.log;
          if (j.status === 'Terkunci') showLock(); else showWarn(j.pelanggaran, j.batas || cfg.batas);
        } catch (e) { if (n < 2 && !e.code) setTimeout(() => send(n + 1), 2000); else showWarn(X.pl + 1, cfg.batas); }
      };
      send(0);
    }
    function showWarn(n, batas) {
      if (document.querySelector('.warnov') || X.locked) return;
      const w = document.createElement('div'); w.className = 'warnov';
      w.innerHTML = '<div class="box"><span class="i xl" style="color:var(--danger);font-size:48px">warning</span><h3 class="mt8">Pelanggaran terdeteksi</h3><p class="muted mt8">Anda meninggalkan layar ujian. Pelanggaran <b>' + n + ' dari ' + batas + '</b> telah dicatat. Pada pelanggaran ke-' + batas + ', sesi dikunci dan perlu dibuka pengawas.</p><button class="btn lg block mt16" id="wback">Kembali ke ujian</button></div>';
      document.body.appendChild(w);
      w.querySelector('#wback').onclick = () => { w.remove(); if (cfg.safe) fsOn(); };
    }
    function showLock() {
      if (X.locked && document.querySelector('.lock')) return;
      X.locked = true; document.querySelectorAll('.warnov').forEach(n => n.remove());
      const lk = document.createElement('div'); lk.className = 'lock';
      const lg = (X.log || []).slice(-3).map(l => '<li class="sm">' + U.jam(l.t) + ' — ' + esc(String(l.j).replace(/_/g, ' ')) + '</li>').join('');
      lk.innerHTML = '<div class="box tc"><span class="logo" style="background:var(--danger)">' + I('lock', 'f') + '</span><h2 class="mt16">Sesi ujian terkunci</h2><p class="muted mt8">Anda melewati batas pelanggaran. Waktu ujian dijeda dan tidak berkurang selama terkunci. Panggil pengawas untuk membuka kunci.</p>' +
        (lg ? '<ul class="tc muted" style="list-style:none;padding:0;margin:12px 0 0">' + lg + '</ul>' : '') +
        '<div class="field mt16" style="text-align:left"><label>Kode dari pengawas</label><input id="lkc" class="input tokinp" maxlength="6" placeholder="• • • • • •" autocomplete="off" autocapitalize="characters"></div>' +
        '<div id="lke" class="alert err mt8 hide" style="text-align:left"></div><button class="btn lg block mt16" id="lkb">' + I('lock_open') + 'Buka kunci</button><p class="xs muted mt16">Pengawas juga dapat membuka kunci langsung dari layar monitoring; halaman ini akan terbuka otomatis.</p></div>';
      document.body.appendChild(lk);
      const go = async () => {
        const v = lk.querySelector('#lkc').value.trim(); if (!v) return;
        const b = lk.querySelector('#lkb'); b.disabled = true;
        try { const j = await A.call('s.otp', { id_sesi: id, kode: v }, { retry: 0 }); X.berakhir = j.berakhir || X.berakhir; hideLock(); }
        catch (e) { const er = lk.querySelector('#lke'); er.textContent = e.message; er.classList.remove('hide'); b.disabled = false; }
      };
      lk.querySelector('#lkb').onclick = go; lk.querySelector('#lkc').addEventListener('keydown', e => { if (e.key === 'Enter') go(); });
      X.lockPoll = setInterval(() => save(), 8000);
    }
    function hideLock() {
      X.locked = false; clearInterval(X.lockPoll); document.querySelectorAll('.lock').forEach(n => n.remove());
      const b = document.createElement('div'); b.className = 'warnov'; b.style.background = 'rgba(2,36,72,.85)';
      b.innerHTML = '<div class="box"><span class="i" style="font-size:48px;color:var(--success)">lock_open</span><h3 class="mt8">Kunci dibuka</h3><p class="muted mt8">Silakan lanjutkan ujian. Pelanggaran direset.</p><button class="btn lg block mt16" id="wok">Lanjutkan ujian</button></div>';
      document.body.appendChild(b); b.querySelector('#wok').onclick = () => { b.remove(); if (cfg.safe) fsOn(); };
      tick(); save();
    }
    const onVis = () => { if (document.hidden) reportViol('pindah_tab'); };
    const onBlur = () => setTimeout(() => { if (!document.hasFocus() && !document.hidden) reportViol('keluar_jendela'); }, 200);
    const onFs = () => { if (!document.fullscreenElement && X.fsWanted) reportViol('keluar_layar_penuh'); };
    const onCtx = e => e.preventDefault();
    const onKey = e => {
      if (X.submitting || X.locked || document.querySelector('.ov,.warnov,.lock') || /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
      const k = e.key;
      if (k === 'ArrowRight') go(X.idx + 1); else if (k === 'ArrowLeft') go(X.idx - 1);
      else if (/^[a-eA-E]$/.test(k)) { const o = soal[X.idx].opsi['abcde'.indexOf(k.toLowerCase())]; if (o) pick(o.k); }
      else if (k === 'f' || k === 'F') flag();
    };
    X.fsWanted = !!(cfg.safe && (document.documentElement.requestFullscreen || document.documentElement.webkitRequestFullscreen) && document.fullscreenElement);
    document.addEventListener('visibilitychange', onVis); window.addEventListener('blur', onBlur); document.addEventListener('fullscreenchange', onFs);
    if (cfg.safe) { document.addEventListener('contextmenu', onCtx); document.addEventListener('copy', onCtx); }
    document.addEventListener('keydown', onKey);
    window.onbeforeunload = () => (X.submitting ? undefined : 'Ujian sedang berlangsung.');

    // ---- aksi ----
    function go(n) { if (n < 0 || n >= N) return; if (!cfg.nav && n < X.idx) return; X.idx = n; render(); }
    function pick(k) { const s = soal[X.idx]; X.jw[s.id] = k; touch(); render(); }
    function flag() { const s = soal[X.idx]; if (X.ragu.has(s.id)) X.ragu.delete(s.id); else X.ragu.add(s.id); touch(); render(); }
    Object.assign(act, {
      x_prev: () => go(X.idx - 1), x_next: () => go(X.idx + 1), x_go: e => { go(Number(e.dataset.n)); const t = U.topModal(); if (t && t.sheet) t.close(); },
      x_pick: e => pick(e.dataset.k), x_flag: flag,
      x_clear: () => { delete X.jw[soal[X.idx].id]; touch(); render(); },
      x_fs: e => { X.fs = e.dataset.s; localStorage.setItem('tka:fs', X.fs); el.style.setProperty('--qs', FS[X.fs] + 'px'); render(); },
      x_grid: () => { const h = U.modal({ sheet: true, title: 'Navigasi soal', body: renderNav() }); h.sheet = true; },
      x_finish: () => {
        const ct = counts();
        const h = U.modal({ title: 'Kumpulkan ujian?', body: '<div class="grid" style="grid-template-columns:repeat(3,1fr);gap:10px"><div class="card flat tc"><div class="bb" style="font-size:24px;color:var(--success)">' + ct.a + '</div><div class="xs muted">Terjawab</div></div><div class="card flat tc"><div class="bb" style="font-size:24px;color:var(--secondary-d)">' + ct.r + '</div><div class="xs muted">Ragu-ragu</div></div><div class="card flat tc"><div class="bb" style="font-size:24px;color:var(--muted)">' + ct.k + '</div><div class="xs muted">Belum dijawab</div></div></div><div class="alert warn mt16">' + I('warning') + '<span>Jawaban tidak dapat diubah setelah dikumpulkan.</span></div>',
          footer: '<button class="btn sec" data-a="m_close">Kembali ke ujian</button><button class="btn" data-a="x_submit">Kumpulkan</button>' });
      },
      x_submit: () => { U.closeAll(); finish(false); }
    });

    // ---- kumpul ----
    async function finish(auto) {
      if (X.submitting) return; X.submitting = true; clearTimeout(X.tSave); clearInterval(X.hb); clearInterval(X.clock);
      U.closeAll(); document.querySelectorAll('.warnov').forEach(n => n.remove());
      const ov = document.createElement('div'); ov.className = 'warnov'; ov.style.background = 'rgba(2,36,72,.9)';
      ov.innerHTML = '<div class="box"><div class="sk" style="width:48px;height:48px;border-radius:50%;margin:0 auto"></div><h3 class="mt16">' + (auto ? 'Waktu habis' : 'Mengumpulkan jawaban') + '</h3><p class="muted mt8" id="sub">Mohon tunggu, jawaban Anda sedang dikirim…</p></div>';
      document.body.appendChild(ov);
      for (let n = 1; ; n++) {
        try {
          await A.call('s.kumpul', { id_sesi: id, jawaban: X.jw, ragu: Array.from(X.ragu) }, { retry: 0, timeout: 40000 });
          break;
        } catch (e) {
          if (e.code === 'LOCK') { X.submitting = false; ov.remove(); showLock(); return; }
          if (!e.offline && e.code) { ov.remove(); X.submitting = false; U.err(e); return; }
          const s = ov.querySelector('#sub'); if (s) s.textContent = 'Koneksi terputus. Jawaban aman di perangkat; mencoba lagi (' + n + ')…';
          await U.sleep(Math.min(8000, 1500 * n));
        }
      }
      ov.remove(); done();
    }
    async function done() {
      cleanupExam();
      try { localStorage.removeItem('tka:ex:' + id + ':a'); localStorage.removeItem('tka:ex:' + id + ':b'); } catch (e) {}
      TKA.refreshBoot().catch(() => {});
      TKA.go('hasil/' + id);
    }
    function cleanupExam() {
      X.submitting = true; clearTimeout(X.tSave); clearInterval(X.hb); clearInterval(X.clock); clearInterval(X.lockPoll);
      document.removeEventListener('visibilitychange', onVis); window.removeEventListener('blur', onBlur); document.removeEventListener('fullscreenchange', onFs);
      document.removeEventListener('contextmenu', onCtx); document.removeEventListener('copy', onCtx); document.removeEventListener('keydown', onKey);
      window.onbeforeunload = null; X.fsWanted = false; fsOff(); TKA.examActive = null;
      document.querySelectorAll('.exam,.lock,.warnov').forEach(n => n.remove()); document.documentElement.style.overflow = '';
    }

    render(); tick(); setSave(X.dirty ? 'wait' : 'ok');
    X.clock = setInterval(tick, 1000);
    X.hb = setInterval(() => save(), Math.max(10, cfg.autosave) * 1000);
    if (X.dirty) save();
    if (X.locked) showLock();
    return cleanupExam;
  }

  // ============================================================ HASIL & PEMBAHASAN
  let hFilter = 'semua';
  TKA.route('siswa', 'hasil/:id', async function (c) {
    const id = c.params.id, key = 'hasil_' + id, cached = TKA.cache.get(key);
    let h = cached ? cached.v : null;
    const draw = () => {
      if (!h) return;
      const lulus = h.lulus, ctop = h.topik || [], rv = h.review || [];
      const sel = hFilter === 'semua' ? rv : rv.filter(r => hFilter === 'benar' ? r.jawaban === r.kunci : hFilter === 'salah' ? r.jawaban && r.jawaban !== r.kunci : hFilter === 'kosong' ? !r.jawaban : r.ragu);
      c.root.innerHTML = '<div class="row mb16"><a class="btn ghost sm" href="#/riwayat">' + I('arrow_back', 'sm') + 'Riwayat</a></div>' +
        '<div class="hero"><div class="row sp wrap"><div><div class="up" style="color:var(--on-primary-c)">' + esc(h.paket.mapel) + ' · ' + esc(h.paket.kode || '') + '</div><h2 style="color:#fff;margin-top:4px">' + esc(h.paket.nama) + '</h2><p class="sm" style="color:var(--on-primary-c)">Dikumpulkan ' + U.tglJam(h.selesai) + '</p></div>' +
        (h.skor === null ? '' : '<span class="badge ' + (lulus ? 'ok' : 'bad') + '" style="font-size:13px;padding:6px 12px">' + (lulus ? 'Lulus KKM' : 'Belum lulus KKM') + '</span>') + '</div><div class="row g24 wrap mt16" style="align-items:flex-end"><div><div class="score">' + (h.skor === null ? '—' : h.skor) + '</div><div class="sm" style="color:var(--on-primary-c)">Skor skala 100 · KKM ' + h.kkm + '</div></div>' +
        (h.resmi && h.skor !== null ? '<div class="sm" style="color:#fff"><div class="bb" style="font-size:22px">#' + h.peringkat + '</div>peringkat dari ' + h.peserta + ' peserta</div>' : '') + '</div></div>' +
        '<div class="grid gs4 keep2 mt16">' + U.stat('check_circle', h.benar, 'Benar', 'ok') + U.stat('cancel', h.salah, 'Salah', 'bad') + U.stat('radio_button_unchecked', h.kosong, 'Tidak dijawab') + U.stat('schedule', h.durasi + ' mnt', 'Waktu pengerjaan · akurasi ' + h.akurasi + '%') + '</div>' +
        '<div class="grid g2 mt16" style="align-items:start"><div class="card"><h4 class="mb8">' + (h.skor === null ? 'Ringkasan' : 'Perbandingan') + '</h4>' + cmp('Skor Anda', h.skor, 'var(--primary-c)') + cmp('Rata-rata peserta', h.rata_paket, '#94a3b8') + cmp('Skor tertinggi', h.tertinggi, 'var(--success)') + cmp('KKM', h.kkm, 'var(--secondary)') + '</div>' +
        '<div class="card"><h4 class="mb8">Diagnostik per topik</h4><div class="bars">' + ctop.map(t => '<div class="br"><span class="sm">' + esc(t.topik) + '</span>' + U.bar(t.pct) + '<b class="sm tr">' + t.pct + '%</b></div>').join('') + '</div>' +
        (ctop.length && ctop[0].pct < 70 ? '<div class="alert info mt16">' + I('lightbulb') + '<span>Fokus berikutnya: <b>' + esc(ctop.filter(t => t.pct < 70).slice(0, 2).map(t => t.topik).join(', ')) + '</b>.</span></div>' : '') + '</div></div>' +
        '<div class="card mt16"><div class="row sp wrap mb16"><h3>Pembahasan soal</h3>' + (h.pembahasan ? '<div class="chips">' + [['semua', 'Semua'], ['salah', 'Salah'], ['kosong', 'Kosong'], ['ragu', 'Ragu-ragu'], ['benar', 'Benar']].map(f => '<button class="chip' + (hFilter === f[0] ? ' on' : '') + '" data-a="s_hf" data-f="' + f[0] + '">' + f[1] + '</button>').join('') + '</div>' : '') + '</div>' +
        (h.pembahasan ? (sel.length ? sel.map(rcard).join('') : U.empty('filter_alt', 'Tidak ada soal pada filter ini')) : '<div class="alert info">' + I('info') + '<span>Pembahasan belum dibuka oleh sekolah.</span></div>') + '</div>';
    };
    const cmp = (l, v, col) => v === null ? '' : '<div class="br" style="display:grid;grid-template-columns:130px 1fr 44px;gap:10px;align-items:center;margin:10px 0;font-size:13px"><span class="sm">' + l + '</span><div class="progress"><i style="width:' + Math.min(100, v) + '%;background:' + col + '"></i></div><b class="sm tr">' + v + '</b></div>';
    const rcard = r => '<div class="review-q"><div class="q-meta"><b>Soal ' + r.no + '</b>' + U.badge(r.topik, 'neu') + U.kes(r.kesulitan) + (r.jawaban === r.kunci ? U.badge('Benar', 'ok') : r.jawaban ? U.badge('Salah', 'bad') : U.badge('Kosong', 'neu')) + (r.ragu ? U.badge('Ragu-ragu', 'warn') : '') + '</div><div class="q-txt" style="--qs:16px">' + U.teks(r.pertanyaan) + '</div>' + (U.safeImg(r.gambar) ? '<img class="q-img" src="' + esc(U.safeImg(r.gambar)) + '" alt="">' : '') +
      r.opsi.map((o, k) => '<div class="opt rv ' + (o.k === r.kunci ? 'right' : o.k === r.jawaban ? 'wrong' : '') + '"><span class="k">' + 'ABCDE'[k] + '</span><span class="grow">' + U.teks(o.t) + '</span>' + (o.k === r.kunci ? I('check_circle', 'f') : o.k === r.jawaban ? I('cancel', 'f') : '') + '</div>').join('') +
      (r.pembahasan ? '<div class="pemb"><b>Pembahasan</b><div class="mt8">' + U.teks(r.pembahasan) + '</div></div>' : '') + '</div>';
    if (h) draw(); else c.root.innerHTML = U.skel(3, 120);
    TKA._hd = draw;
    if (!cached) {
      try { const j = await A.call('s.hasil', { id_sesi: id }, { read: true }); h = j; TKA.cache.set(key, j); draw(); }
      catch (e) { c.root.innerHTML = '<div class="card">' + U.empty('error', 'Hasil belum tersedia', e.message, '<a class="btn mt16" href="#/beranda">Kembali</a>') + '</div>'; }
    }
    return () => { TKA._hd = null; };
  });
  act.s_hf = el => { hFilter = el.dataset.f; if (TKA._hd) TKA._hd(); };
})();
