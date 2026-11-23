/* admin.js — Dashboard admin, Manajemen Pengguna, Kelas & Mapel, Pengaturan Sistem (+ audit). */
(function () {
  const TKA = window.TKA, U = TKA.ui, A = TKA.api, D = TKA.D, S = TKA.S, esc = U.esc, I = U.i, $ = U.$, act = TKA.actions, inp = TKA.inputs;
  const M = () => ({ mapel: (S.boot && S.boot.mapel) || [], kelas: (S.boot && S.boot.kelas) || [], ruang: (S.boot && S.boot.ruang) || [], guru: (S.boot && S.boot.guru) || [] });
  const kelasOpt = () => M().kelas.map(k => [k.id_kelas, k.nama_kelas]);
  const mapelNm = id => { const m = M().mapel.filter(x => x.id_mapel === id)[0]; return m ? m.nama_mapel : id; };
  const PRN = { siswa: ['Siswa', 'info'], guru: ['Guru', 'warn'], admin: ['Admin', 'neu'] };
  const USB = { Aktif: 'ok', Nonaktif: 'neu', Terkunci: 'bad' };
  function setMaster(j) { if (j && j.kelas && S.boot) { S.boot.kelas = j.kelas; S.boot.mapel = j.mapel; S.boot.ruang = j.ruang || []; S.boot.guru = j.guru || []; } D.invalidate('users'); }

  // ============================================================ DASHBOARD ADMIN
  TKA.route('admin', 'dashboard', function (c) {
    c.live();
    let logs = [];
    const draw = () => {
      const b = S.boot || {}, h = b.hitung || {}, u = b.ujian || {}, sy = b.sistem || {};
      c.root.innerHTML = U.pageHead('Dashboard administrator', 'Ringkasan sekolah, ujian berlangsung, dan kesehatan sistem.', '<button class="btn sec" data-a="a_nu" data-p="siswa">' + I('person_add') + 'Siswa</button><button class="btn sec" data-a="a_nu" data-p="guru">' + I('person_add') + 'Guru</button><a class="btn" href="#/jadwal?baru=1">' + I('event') + 'Sesi ujian baru</a>') +
        '<div class="grid gs4 mb16 statrow">' + U.stat('groups', U.rb(h.siswa || 0), 'Total siswa') + U.stat('badge', h.guru || 0, 'Guru / pengawas') + U.stat('school', h.kelas || 0, 'Kelas · ' + (h.mapel || 0) + ' mapel') + U.stat('lock', h.terkunci_akun || 0, 'Akun terkunci', h.terkunci_akun ? 'bad' : '') + '</div>' +
        '<div class="grid g3 mb16" style="align-items:start"><div class="card"><div class="row sp mb8"><h4>Ujian berlangsung</h4>' + (u.berlangsung ? '<span class="badge ok"><span class="dot pulse"></span> LIVE</span>' : U.badge('Tidak ada', 'neu')) + '</div><div class="grid" style="grid-template-columns:repeat(3,minmax(0,1fr));gap:8px"><div><div class="stat"><div class="n">' + (u.bekerja || 0) + '</div></div><div class="xs muted">Aktif mengerjakan</div></div><div><div class="n" style="font-size:26px;font-weight:700;color:' + (u.terkunci ? 'var(--danger)' : 'inherit') + '">' + (u.terkunci || 0) + '</div><a class="xs b" href="#/monitoring">Sesi terkunci →</a></div><div><div class="n" style="font-size:26px;font-weight:700">' + (u.terjadwal || 0) + '</div><div class="xs muted">Terjadwal</div></div></div><a class="btn sec sm mt16" href="#/monitoring">' + I('monitor_heart', 'sm') + 'Buka monitoring</a></div>' +
        '<div class="card"><h4 class="mb8">Konten</h4><div class="row sp sm"><span class="muted">Soal</span><b>' + U.rb(h.soal || 0) + '</b></div><div class="row sp sm mt8"><span class="muted">Paket ujian</span><b>' + (h.paket || 0) + '</b></div><div class="row sp sm mt8"><span class="muted">Akun nonaktif</span><b>' + (h.nonaktif || 0) + '</b></div></div>' +
        '<div class="card"><h4 class="mb8">Sistem</h4><div class="row sp sm"><span class="muted">Versi</span><b>' + esc(sy.versi || '') + '</b></div><div class="row sp sm mt8"><span class="muted">Eksekusi hari ini (perkiraan)</span><b>' + U.rb(sy.eksekusi_hari_ini || 0) + '</b></div><div class="row sp sm mt8"><span class="muted">Cache</span><span class="badge ok">Aktif</span></div></div></div>' +
        '<div class="card pad0"><div class="card-h"><h4>Aktivitas terbaru</h4><a class="sm b" href="#/pengaturan?t=audit">Log audit →</a></div><ul class="feed" style="padding:0 20px">' + (logs.length ? logs.map(l => '<li><b>' + esc(l.user) + '</b> <span class="muted">· ' + esc(l.aksi) + '</span><span class="xs muted" style="float:right">' + U.rel(l.ts) + '</span></li>').join('') : '<li class="muted">Belum ada aktivitas.</li>') + '</ul></div>';
    };
    draw();
    const load = () => A.call('audit.list', { limit: 8 }, { read: true }).then(j => { logs = j.log; draw(); }).catch(() => {});
    load();
    const t = setInterval(() => { if (!document.hidden) { TKA.refreshBoot().then(draw).catch(() => {}); load(); } }, 20000);
    return () => clearInterval(t);
  });
  act.a_nu = el => userForm(null, el.dataset.p);

  // ============================================================ PENGGUNA
  const UF = { tab: '', q: '', kelas: '', st: '', page: 1, sel: new Set() };
  TKA.route('admin', 'pengguna', function (c) {
    c.live();
    let list = [];
    const filt = () => list.filter(u => (!UF.tab || u.peran === UF.tab) && (!UF.q || (u.nama + ' ' + u.username).toLowerCase().indexOf(UF.q.toLowerCase()) > -1) && (!UF.kelas || u.id_kelas === UF.kelas) && (!UF.st || u.status === UF.st));
    const draw = () => {
      const f = filt(), per = 20, pg = f.slice((UF.page - 1) * per, UF.page * per), cn = p => list.filter(u => !p || u.peran === p).length;
      $('#utabs').innerHTML = [['', 'Semua'], ['siswa', 'Siswa'], ['guru', 'Guru'], ['admin', 'Administrator']].map(t => '<button class="tab' + (UF.tab === t[0] ? ' on' : '') + '" data-a="a_utab" data-t="' + t[0] + '">' + t[1] + ' <span class="muted">' + cn(t[0]) + '</span></button>').join('');
      $('#ubody').innerHTML = pg.length ? '<div class="tw"><table><thead><tr><th style="width:36px"><input type="checkbox" class="chk" data-a="a_uall"></th><th>Nama</th><th>Peran</th><th class="hm">Kelas / mapel</th><th class="hm">Ruang</th><th>Status</th><th></th></tr></thead><tbody>' + pg.map(u => '<tr><td><input type="checkbox" class="chk" data-a="a_usel" data-id="' + u.id + '"' + (UF.sel.has(u.id) ? ' checked' : '') + '></td><td><div class="row g8"><span class="avatar fotobtn" data-a="a_ufoto" data-id="' + u.id + '" role="button" aria-label="Ubah foto" style="cursor:pointer">' + U.fotoEl(u, 32) + '</span><div><b>' + esc(u.nama) + '</b><div class="xs muted mono">' + esc(u.username) + '</div></div></div></td><td>' + U.badge(PRN[u.peran][0], PRN[u.peran][1]) + '</td><td class="sm hm">' + (u.peran === 'siswa' ? esc(u.kelas || '-') : u.peran === 'guru' ? esc(String(u.id_mapel || '').split(',').filter(Boolean).map(mapelNm).join(', ') || 'Semua mapel') : '—') + '</td><td class="sm hm">' + (u.peran === 'siswa' ? esc(u.ruang || '—') : '—') + '</td><td>' + U.badge(u.status, USB[u.status]) + '</td><td class="tr"><span class="acts"><button class="ibtn" data-a="a_ured" data-id="' + u.id + '" title="Reset kata sandi">' + I('key') + '</button><button class="ibtn" data-a="a_uedit" data-id="' + u.id + '" title="Ubah">' + I('edit') + '</button><button class="ibtn dng" data-a="a_udel" data-id="' + u.id + '" title="Hapus">' + I('delete') + '</button></span></td></tr>').join('') + '</tbody></table></div>' + U.pager(f.length, UF.page, per, 'a_up') : U.empty('group_off', 'Tidak ada pengguna', 'Ubah filter atau tambah pengguna baru.');
      const bar = $('#ubulk'); bar.classList.toggle('hide', !UF.sel.size); bar.querySelector('b').textContent = UF.sel.size;
    };
    c.root.innerHTML = U.pageHead('Manajemen pengguna', 'Akun siswa, guru, dan administrator.', '<button class="btn sec" data-a="a_uimp">' + I('upload_file') + 'Import</button><button class="btn sec" data-a="a_laporan">' + I('table_chart') + 'Laporan</button><button class="btn" data-a="a_nu" data-p="siswa">' + I('person_add') + 'Tambah pengguna</button>') +
      '<div class="tabs mb16" id="utabs"></div><div class="card pad0"><div class="filters"><div class="grow"><input class="input" placeholder="Cari nama atau NISN/username…" data-i="a_uf" data-k="q" data-ev="input" value="' + esc(UF.q) + '"></div><select class="select" data-i="a_uf" data-k="kelas">' + U.opt(kelasOpt(), UF.kelas, 'Semua kelas') + '</select><select class="select" data-i="a_uf" data-k="st">' + U.opt([['Aktif', 'Aktif'], ['Nonaktif', 'Nonaktif'], ['Terkunci', 'Terkunci']], UF.st, 'Semua status') + '</select></div>' +
      '<div id="ubulk" class="row sp wrap sm hide" style="padding:10px 16px;background:var(--soft)"><span><b>0</b> dipilih</span><div class="row g8"><button class="btn sec sm" data-a="a_ub" data-o="reset">' + I('key', 'sm') + 'Reset sandi + kartu</button><button class="btn sec sm" data-a="a_ub" data-o="aktif">Aktifkan</button><button class="btn sec sm" data-a="a_ub" data-o="nonaktif">Nonaktifkan</button><button class="btn dsec sm" data-a="a_ub" data-o="hapus">Hapus</button></div></div><div id="ubody">' + U.skel(6, 44) + '</div></div>';
    TKA._ud = draw; TKA._ul = () => list;
    D.swr('users', v => { list = v; draw(); }).catch(e => { $('#ubody').innerHTML = U.empty('error', 'Gagal memuat', e.message); });
    draw();
    return () => { TKA._ud = null; };
  });
  const redraw = () => { if (TKA._ud) TKA._ud(); };
  inp.a_uf = el => { UF[el.dataset.k] = el.value; UF.page = 1; redraw(); };
  act.a_utab = el => { UF.tab = el.dataset.t; UF.page = 1; redraw(); };
  act.a_up = el => { UF.page = Number(el.dataset.p); redraw(); };
  act.a_usel = el => { el.checked ? UF.sel.add(el.dataset.id) : UF.sel.delete(el.dataset.id); redraw(); };
  act.a_uall = el => { U.$$('[data-a=a_usel]').forEach(b => { el.checked ? UF.sel.add(b.dataset.id) : UF.sel.delete(b.dataset.id); }); redraw(); };
  const uget = id => (TKA._ul ? TKA._ul() : D.peek('users') || []).filter(u => u.id === id)[0];
  act.a_uedit = el => userForm(uget(el.dataset.id));
  async function refreshUsers() { D.invalidate('users'); await D.fetch('users'); if (TKA._ud) { TKA.go('pengguna'); } }

  function userForm(u, peran) {
    const edit = !!u; peran = u ? u.peran : peran || 'siswa';
    const mp = M().mapel, cur = u ? String(u.id_mapel || '').split(',') : [];
    const h = U.modal({ title: edit ? 'Ubah pengguna' : 'Tambah pengguna', body:
      '<div class="col g16"><div class="field"><label>Peran</label><select class="select" id="fpr"' + (edit ? ' disabled' : '') + '>' + U.opt([['siswa', 'Siswa'], ['guru', 'Guru / Pengawas'], ['admin', 'Administrator']], peran) + '</select></div>' +
      '<div class="field"><label>Nama lengkap</label><input class="input" id="fnm" value="' + esc(u ? u.nama : '') + '"></div>' +
      '<div class="field"><label id="flu">' + (peran === 'siswa' ? 'NISN (10 digit)' : peran === 'guru' ? 'NIP (8–18 digit)' : 'Username') + '</label><input class="input mono" id="fus" value="' + esc(u ? u.username : '') + '"' + (edit ? ' disabled' : '') + ' maxlength="30"></div>' +
      '<div class="field" id="fkl"><label>Kelas</label><select class="select" id="fkls">' + U.opt(kelasOpt(), u ? u.id_kelas : '', 'Pilih kelas') + '</select></div>' +
      '<div class="field" id="fru"><label>Ruang <span class="muted">(opsional)</span></label><select class="select" id="frua">' + U.opt(M().ruang.map(r => [r.id_ruang, r.nama_ruang]), u ? u.id_ruang || '' : '', 'Tanpa ruang') + '</select><span class="hint">Ruang hanya untuk siswa.</span></div>' +
      '<div class="field" id="fmp"><label>Mata pelajaran yang diampu</label><div class="sel-list" style="max-height:140px">' + mp.map(m => '<label><input type="checkbox" class="chk" value="' + m.id_mapel + '"' + (cur.indexOf(m.id_mapel) > -1 ? ' checked' : '') + '>' + esc(m.nama_mapel) + '</label>').join('') + '</div><span class="hint">Kosong = semua mapel.</span></div>' +
      '<div class="field"><label>' + (edit ? 'Kata sandi baru (opsional)' : 'Kata sandi (opsional)') + '</label><input class="input" id="fpw" placeholder="Siswa & guru: angka saja. Kosongkan = sama dengan NISN/NIP" autocomplete="new-password"></div>' +
      (edit ? '<div class="field"><label>Status</label><select class="select" id="fst">' + U.opt([['Aktif', 'Aktif'], ['Nonaktif', 'Nonaktif'], ['Terkunci', 'Terkunci']], u.status) + '</select></div>' : '') + '</div>',
      footer: '<button class="btn sec" data-a="m_close">Batal</button><button class="btn" data-a="a_usave">' + I('save') + 'Simpan</button>' });
    const sync = () => { const p = h.$('#fpr').value; h.$('#fkl').classList.toggle('hide', p !== 'siswa'); h.$('#fru').classList.toggle('hide', p !== 'siswa'); h.$('#fmp').classList.toggle('hide', p !== 'guru'); h.$('#flu').textContent = p === 'siswa' ? 'NISN (10 digit)' : p === 'guru' ? 'NIP (8–18 digit)' : 'Username'; };
    h.$('#fpr').addEventListener('change', sync); sync();
    const kaWrap = document.createElement('div'); kaWrap.className = 'field'; kaWrap.id = 'fka';
    const kaSel = new Set(u && u.kelas_ajar ? String(u.kelas_ajar).split(',').filter(Boolean) : []);
    const kaOpsi = M().kelas;
    const kaRingkas = () => { const n = kaWrap.querySelectorAll('#fkaa input:checked').length; kaWrap.querySelector('#fkacnt').textContent = n ? n + ' kelas dipilih' : 'Belum ada kelas dipilih'; };
    kaWrap.innerHTML = '<div class="row sp"><label>Kelas yang diajar</label><span class="sm muted" id="fkacnt"></span></div>' +
      '<div class="sel-list" id="fkaa" style="max-height:160px">' + (kaOpsi.length ? kaOpsi.map(k => '<label><input type="checkbox" class="chk" value="' + esc(k.id_kelas) + '"' + (kaSel.has(k.id_kelas) ? ' checked' : '') + '>' + esc(k.nama_kelas) + '</label>').join('') : '<p class="sm muted" style="padding:10px 12px">Belum ada kelas. Tambahkan dulu di menu Kelas Mapel &amp; Ruang.</p>') + '</div>' +
      '<span class="hint">Guru hanya dapat membuat jadwal ujian untuk kelas yang dicentang. Jika tidak ada yang dicentang, guru dapat memilih semua kelas.</span>';
    kaWrap.querySelector('#fkaa').addEventListener('change', kaRingkas);
    kaRingkas();
    h.$('#fru').insertAdjacentElement('afterend', kaWrap);
    const syncKa = () => kaWrap.classList.toggle('hide', h.$('#fpr').value !== 'guru');
    h.$('#fpr').addEventListener('change', syncKa); syncKa(); h.uid = u ? u.id : null; TKA._uh = h;
  }
  act.a_usave = async el => {
    const h = TKA._uh, b = { peran: h.$('#fpr').value, nama: h.$('#fnm').value, username: h.$('#fus').value.trim(), id_kelas: h.$('#fkls').value, id_ruang: h.$('#frua').value, kelas_ajar: U.$$('#fkaa input:checked', h.el).map(i => i.value), id_mapel: U.$$('#fmp input:checked', h.el).map(i => i.value).join(','), password: h.$('#fpw').value };
    if (h.uid) { b.id = h.uid; b.status = h.$('#fst').value; }
    el.disabled = true;
    try { const j = await A.call('user.save', b); h.close(); await refreshUsers(); if (!h.uid) showKartu([{ nama: b.nama, username: j.username, password: j.password, kelas: (M().kelas.filter(k => k.id_kelas === b.id_kelas)[0] || {}).nama_kelas || '', peran: b.peran }], 'Akun dibuat'); else U.toast('Perubahan disimpan.', 'ok'); }
    catch (e) { el.disabled = false; U.err(e); }
  };
  act.a_ured = async el => { const u = uget(el.dataset.id); if (!(await U.confirm('Reset kata sandi <b>' + esc(u.nama) + '</b>? Sandi lama tidak berlaku lagi dan perangkatnya akan keluar.', { ok: 'Reset' }))) return; const j = await A.call('user.bulk', { ids: [u.id], op: 'reset' }); await refreshUsers(); showKartu(j.kartu, 'Kata sandi baru'); };
  act.a_udel = async el => { const u = uget(el.dataset.id); if (!(await U.confirm('Hapus akun <b>' + esc(u.nama) + '</b>?', { danger: true, ok: 'Hapus' }))) return; const j = await A.call('user.delete', { ids: [u.id] }); await refreshUsers(); U.toast(j.dihapus ? 'Akun dihapus.' : j.dilewati[0], j.dihapus ? 'ok' : 'warn', 5000); };
  act.a_ub = async el => {
    const ids = Array.from(UF.sel), o = el.dataset.o; if (!ids.length) return;
    if (o === 'hapus') { if (!(await U.confirm('Hapus <b>' + ids.length + '</b> akun?', { danger: true, ok: 'Hapus' }))) return; const j = await A.call('user.delete', { ids: ids }); UF.sel.clear(); await refreshUsers(); return U.toast(j.dihapus + ' dihapus' + (j.dilewati.length ? ', ' + j.dilewati.length + ' dilewati' : ''), j.dilewati.length ? 'warn' : 'ok', 5000); }
    if (o === 'reset' && !(await U.confirm('Reset kata sandi <b>' + ids.length + '</b> akun? Kartu peserta baru akan dibuat.', { ok: 'Reset' }))) return;
    let kartu = []; for (let i = 0; i < ids.length; i += 100) { const j = await A.call('user.bulk', { ids: ids.slice(i, i + 100), op: o }); kartu = kartu.concat(j.kartu || []); }
    UF.sel.clear(); await refreshUsers(); if (o === 'reset') showKartu(kartu, 'Kartu peserta'); else U.toast('Selesai untuk ' + ids.length + ' akun.', 'ok');
  };

  // ---- kartu peserta (sandi hanya tampil sekali) ----
  function showKartu(list, title) {
    if (!list || !list.length) return;
    window.__kartu = list;
    U.modal({ title: title, sub: 'Catat kata sandi ini sekarang. Kata sandi tidak dapat dilihat lagi setelah jendela ini ditutup. Untuk mencetak kartu, gunakan menu Cetak Kartu & Download Data Pengguna.', cls: 'wide', body: '<div class="tw"><table><thead><tr><th>Nama</th><th>' + 'NISN / username</th><th>Kata sandi</th><th>Kelas</th></tr></thead><tbody>' + list.slice(0, 200).map(k => '<tr><td>' + esc(k.nama) + '</td><td class="mono">' + esc(k.username) + '</td><td class="mono b">' + esc(k.password) + '</td><td>' + esc(k.kelas || k.peran) + '</td></tr>').join('') + '</tbody></table></div>', footer: '<button class="btn" data-a="m_close">Selesai</button>' });
  }
  act.a_kcsv = () => U.download('kartu-peserta.csv', U.csvBuild(['Nama', 'NISN/Username', 'Kata sandi', 'Kelas'], window.__kartu.map(k => [k.nama, k.username, k.password, k.kelas || k.peran])));
  act.a_kprint = () => {
    const f = document.createElement('iframe'); f.style.cssText = 'position:fixed;width:0;height:0;border:0'; document.body.appendChild(f);
    const nm = S.setting.nama_sekolah || '';
    f.contentDocument.write('<html><head><title>Kartu peserta</title><style>body{font-family:Arial,sans-serif;margin:12mm}.g{display:grid;grid-template-columns:1fr 1fr;gap:8mm}.k{border:1px solid #333;border-radius:6px;padding:8px 10px;font-size:12px;break-inside:avoid}.k h4{margin:0 0 6px;font-size:13px}.k div{margin:2px 0}.m{font-family:monospace;font-size:14px;font-weight:bold}</style></head><body><div class="g">' + window.__kartu.map(k => '<div class="k"><h4>' + esc(nm) + ' — Simulasi TKA</h4><div><b>' + esc(k.nama) + '</b>' + (k.kelas ? ' · ' + esc(k.kelas) : '') + '</div><div>NISN/Username: <span class="m">' + esc(k.username) + '</span></div><div>Kata sandi: <span class="m">' + esc(k.password) + '</span></div></div>').join('') + '</div></body></html>');
    f.contentDocument.close(); setTimeout(() => { f.contentWindow.focus(); f.contentWindow.print(); setTimeout(() => f.remove(), 2000); }, 300);
  };

  // ---- import pengguna ----

  // ---- Unduh PDF daftar pengguna: mengikuti filter tabel (peran, kelas, pencarian, status) ----
  function ufFilter(all) {
    return all.filter(u => (!UF.tab || u.peran === UF.tab) && (!UF.q || (u.nama + ' ' + u.username).toLowerCase().indexOf(UF.q.toLowerCase()) > -1) && (!UF.kelas || u.id_kelas === UF.kelas) && (!UF.st || u.status === UF.st));
  }
  act.a_updf = async () => {
    const list = ufFilter(D.peek('users') || []);
    if (!list.length) return U.toast('Tidak ada pengguna yang cocok dengan filter.', 'warn');
    const bagian = [];
    bagian.push(UF.tab ? PRN[UF.tab][0] + ' (' + UF.tab + ')' : 'Semua pengguna');
    if (UF.kelas) { const k = M().kelas.filter(x => x.id_kelas === UF.kelas)[0]; bagian.push('Kelas ' + (k ? k.nama_kelas : '')); }
    const j = await A.call('pengguna.pdf', { ids: list.map(u => u.id), judul: 'Daftar Pengguna — ' + bagian.join(' · ') }, { timeout: 120000, retry: 0 });
    U.downloadB64('daftar-pengguna' + (UF.kelas ? '-kelas' : '') + '.pdf', j.base64, 'application/pdf');
    U.toast(j.jumlah + ' pengguna diunduh.', 'ok');
  };
  // ---- Laporan daftar pengguna: tabel gaya laporan (dapat dicetak / disimpan sebagai PDF) ----
  const REP_CSS = '.rep{font-family:Georgia,"Times New Roman",serif;color:#1f2937}.rep-t{font-size:24px;font-weight:700;color:#003366;margin:0}.rep-s{color:#4b5563;font-size:13px;line-height:20px;margin-top:6px}.rep table{width:100%;border-collapse:collapse;font-size:12px;margin-top:16px}.rep th{background:#003366;color:#fff;font-weight:700;text-align:center;padding:8px 10px;border:1px solid #c9ced6}.rep td{padding:6px 10px;text-align:center;color:#333;border:1px solid #c9ced6}.rep tbody tr:nth-child(odd){background:#f2f2f2}.rep tbody tr:nth-child(even){background:#fff}';
  function laporanTabel(list) {
    return '<table><thead><tr><th>No</th><th>Nama</th><th>Peran</th><th>Kelas</th><th>Mapel</th><th>Ruang</th><th>Password</th><th>Status</th></tr></thead><tbody>' +
      list.map((u, i) => '<tr><td>' + (i + 1) + '</td><td>' + esc(u.nama) + '</td><td>' + esc(PRN[u.peran] ? PRN[u.peran][0] : u.peran) + '</td><td>' + esc(u.peran === 'siswa' ? (u.kelas || '-') : '—') + '</td><td>' + esc(u.peran === 'guru' ? (String(u.id_mapel || '').split(',').filter(Boolean).map(mapelNm).join(', ') || 'Semua mapel') : '—') + '</td><td>' + esc(u.peran === 'siswa' ? (u.ruang || '—') : '—') + '</td><td>______________</td><td>' + esc(u.status) + '</td></tr>').join('') +
      '</tbody></table>';
  }
  function laporanRingkas(list) {
    const kelas = UF.kelas ? ((M().kelas.filter(k => k.id_kelas === UF.kelas)[0] || {}).nama_kelas || '') : 'Semua kelas';
    const peran = UF.tab ? PRN[UF.tab][0] : 'Semua peran';
    const aktif = list.filter(u => u.status === 'Aktif').length;
    return 'Tanggal: ' + U.tgl(Date.now()) + ' • Peran: ' + peran + ' • Kelas: ' + (kelas || '—') + '<br>Jumlah: ' + U.rb(list.length) + ' pengguna • Aktif: ' + U.rb(aktif) + ' • Nonaktif/terkunci: ' + U.rb(list.length - aktif);
  }
  act.a_laporan = () => {
    const list = ufFilter(D.peek('users') || []);
    if (!list.length) return U.toast('Tidak ada pengguna yang cocok dengan filter.', 'warn');
    const h = U.modal({ title: 'Laporan daftar pengguna', cls: 'xwide', body:
      '<div class="rep"><style>' + REP_CSS + '</style><div class="rep-t">Daftar Pengguna — ' + esc(S.setting.nama_sekolah || '') + '</div><div class="rep-s">' + laporanRingkas(list) + '</div>' + laporanTabel(list) + '</div>',
      footer: '<button class="btn sec" data-a="m_close">Tutup</button><button class="btn" id="lapcetak">' + I('print') + 'Cetak / simpan PDF</button>' });
    h.$('#lapcetak').onclick = () => {
      const html = '<html><head><meta charset="utf-8"><title>Laporan daftar pengguna</title><style>@page{size:A4 landscape;margin:12mm}body{font-family:Georgia,serif}' + REP_CSS + '</style></head><body><div class="rep"><div class="rep-t">Daftar Pengguna — ' + esc(S.setting.nama_sekolah || '') + '</div><div class="rep-s">' + laporanRingkas(list) + '</div>' + laporanTabel(list) + '</div></body></html>';
      cetakWindow(html);
    };
  };

  act.a_uimp = () => {
    const h = U.modal({ title: 'Import pengguna', sub: 'CSV atau Excel. Kolom: nama, username (NISN untuk siswa, NIP untuk guru), peran, kelas, mapel, ruang, password.', cls: 'wide', body: '<div class="col g16"><div class="alert info">' + I('info') + '<div><b>peran</b> default <i>siswa</i>. <b>kelas</b> memakai nama kelas yang sudah ada. <b>password</b> boleh kosong (dibuat otomatis). <button class="btn sec sm" data-a="a_utpl" style="margin-left:8px">' + I('download', 'sm') + 'Templat</button></div></div><label class="dz" id="udz"><input type="file" id="ufile" accept=".csv,.xlsx,.xls" hidden>' + I('upload_file', 'xl') + '<div class="b mt8">Pilih berkas CSV / Excel</div></label><div id="uprev"></div></div>', footer: '<button class="btn sec" data-a="m_close">Tutup</button><button class="btn off" id="ugo" data-a="a_uigo">Import</button>' });
    h.$('#ufile').onchange = async ev => { const f = ev.target.files[0]; if (!f) return; try { const rows = await U.bacaTabel(f); h.rows = rows; h.$('#uprev').innerHTML = '<p class="sm"><b>' + rows.length + '</b> baris terbaca.</p>'; h.$('#ugo').classList.toggle('off', !rows.length); } catch (e) { U.err(e); } };
    TKA._uih = h;
  };
  act.a_utpl = () => U.download('templat-pengguna.csv', U.csvBuild(['nama', 'username', 'peran', 'kelas', 'mapel', 'ruang', 'password'], [['Ahmad Rizky', '2100000123', 'siswa', 'XII IPA 1', '', 'Ruang 12A', ''], ['Budi Santoso, S.Pd', '198506152010011001', 'guru', '', 'Matematika', '', '']]));
  act.a_uigo = async el => {
    const h = TKA._uih; if (!h || !h.rows) return; el.disabled = true; let ok = 0, kartu = []; const gagal = [];
    for (let i = 0; i < h.rows.length; i += 40) {
      el.textContent = 'Mengimpor ' + Math.min(i + 40, h.rows.length) + '/' + h.rows.length + '…';
      try { const j = await A.call('user.import', { rows: h.rows.slice(i, i + 40).map(r => ({ nama: r.nama, username: r.username || r.nisn, peran: (r.peran || 'siswa').toLowerCase(), kelas: r.kelas, mapel: r.mapel, ruang: r.ruang, password: r.password })), offset: i }, { timeout: 60000 }); ok += j.berhasil; kartu = kartu.concat(j.kartu); j.gagal.forEach(g => gagal.push(g)); } catch (e) { gagal.push({ baris: i + 1, pesan: e.message }); break; }
    }
    h.close(); await refreshUsers();
    if (gagal.length) U.modal({ title: ok + ' berhasil, ' + gagal.length + ' gagal', body: '<ul class="sm" style="max-height:260px;overflow:auto">' + gagal.slice(0, 60).map(g => '<li>Baris ' + g.baris + ': ' + esc(g.pesan) + '</li>').join('') + '</ul>', footer: '<button class="btn" data-a="m_close">Tutup</button>' });
    if (kartu.length) setTimeout(() => showKartu(kartu, ok + ' akun dibuat'), gagal.length ? 300 : 0);
  };

  // ============================================================ KELAS & MAPEL
  TKA.route('admin', 'kelas-mapel', function (c) {
    c.live();
    const draw = () => {
      const m = M(), us = D.peek('users') || [], cnt = id => us.filter(u => u.id_kelas === id).length;
      const kartu = (judul, aksi, items, kosong, ikon) => '<div class="card pad0"><div class="card-h"><h3>' + judul + '</h3><button class="btn sm" data-a="' + aksi + '">' + I('add', 'sm') + 'Tambah</button></div>' +
        (items.length ? '<ul class="feed" style="padding:0 20px">' + items.join('') + '</ul>' : U.empty(ikon, kosong)) + '</div>';
      const kelasItems = m.kelas.map(k => '<li class="row sp"><div><b>' + esc(k.nama_kelas) + '</b><div class="xs muted">' + esc([k.tingkat, k.peminatan, k.wali_nama ? 'Wali: ' + k.wali_nama : ''].filter(Boolean).join(' · ')) + ' · ' + cnt(k.id_kelas) + ' siswa</div></div><span class="acts"><button class="ibtn" data-a="a_kform" data-id="' + k.id_kelas + '">' + I('edit') + '</button><button class="ibtn dng" data-a="a_kdel" data-id="' + k.id_kelas + '">' + I('delete') + '</button></span></li>');
      const mapelItems = m.mapel.map(k => '<li class="row sp"><div><b>' + esc(k.nama_mapel) + '</b><div class="xs muted">' + esc(k.kelompok) + '</div></div><span class="acts"><button class="ibtn" data-a="a_mform" data-id="' + k.id_mapel + '">' + I('edit') + '</button><button class="ibtn dng" data-a="a_mdel" data-id="' + k.id_mapel + '">' + I('delete') + '</button></span></li>');
      const ruangItems = m.ruang.map(r => '<li class="row sp"><div><b>' + esc(r.nama_ruang) + '</b><div class="xs muted">' + esc(r.keterangan || 'Tanpa keterangan') + '</div></div><span class="acts"><button class="ibtn" data-a="a_rform" data-id="' + r.id_ruang + '">' + I('edit') + '</button><button class="ibtn dng" data-a="a_rdel" data-id="' + r.id_ruang + '">' + I('delete') + '</button></span></li>');
      c.root.innerHTML = U.pageHead('Kelas Mapel & Ruang', 'Data master kelas, mata pelajaran, dan ruang yang dipakai di seluruh aplikasi.') +
        '<div class="grid g3" style="align-items:start">' +
        kartu('Kelas', 'a_kform', kelasItems, 'Belum ada kelas', 'school') +
        kartu('Mata pelajaran', 'a_mform', mapelItems, 'Belum ada mapel', 'menu_book') +
        kartu('Ruang', 'a_rform', ruangItems, 'Belum ada ruang', 'meeting_room') +
        '</div>';
    };
    draw(); TKA._kd = draw;
    D.swr('users', draw).catch(() => {});
    return () => { TKA._kd = null; };
  });
  const kmRedraw = j => { setMaster(j); if (TKA._kd) TKA._kd(); };
  act.a_kform = el => {
    const k = el.dataset.id ? M().kelas.filter(x => x.id_kelas === el.dataset.id)[0] : null;
    const h = U.modal({ title: k ? 'Ubah kelas' : 'Tambah kelas', body: '<div class="col g16"><div class="field"><label>Nama kelas</label><input class="input" id="kn" value="' + esc(k ? k.nama_kelas : '') + '" placeholder="mis. X TKL 1"></div><div class="grid g2"><div class="field"><label>Tingkat</label><input class="input" id="kt" value="' + esc(k ? k.tingkat : '') + '" placeholder="X"></div><div class="field"><label>Peminatan</label><input class="input" id="kp" value="' + esc(k ? k.peminatan : '') + '" placeholder="TKL"></div></div><div class=\"field\"><label>Wali kelas</label><select class=\"select\" id=\"kw\"><option value=\"\">— Belum ditentukan —</option>' + M().guru.map(g => '<option value=\"' + esc(g.id) + '\"' + (k && k.wali === g.id ? ' selected' : '') + '>' + esc(g.nama) + '</option>').join('') + '</select><span class=\"hint\">' + (M().guru.length ? 'Hanya akun guru yang dapat dipilih.' : 'Belum ada akun guru. Tambahkan di Manajemen Pengguna.') + '</span></div></div>', footer: '<button class="btn sec" data-a="m_close">Batal</button><button class="btn" id="ksv">Simpan</button>' });
    h.$('#ksv').onclick = async () => { try { const j = await A.call('kelas.save', { id_kelas: k ? k.id_kelas : '', nama_kelas: h.$('#kn').value, tingkat: h.$('#kt').value, peminatan: h.$('#kp').value, wali: h.$('#kw').value }); h.close(); kmRedraw(j); U.toast('Kelas tersimpan.', 'ok'); } catch (e) { U.err(e); } };
  };
  act.a_kdel = async el => { if (!(await U.confirm('Hapus kelas ini?', { danger: true, ok: 'Hapus' }))) return; kmRedraw(await A.call('kelas.delete', { id_kelas: el.dataset.id })); U.toast('Kelas dihapus.', 'ok'); };
  act.a_mform = el => {
    const k = el.dataset.id ? M().mapel.filter(x => x.id_mapel === el.dataset.id)[0] : null;
    const h = U.modal({ title: k ? 'Ubah mata pelajaran' : 'Tambah mata pelajaran', body: '<div class="col g16"><div class="field"><label>Nama</label><input class="input" id="mn" value="' + esc(k ? k.nama_mapel : '') + '"></div><div class="field"><label>Kelompok</label><select class="select" id="mk">' + U.opt([['Inti', 'Inti'], ['Pilihan', 'Pilihan'], ['Khusus', 'Khusus']], k ? k.kelompok : 'Inti') + '</select></div></div>', footer: '<button class="btn sec" data-a="m_close">Batal</button><button class="btn" id="msv">Simpan</button>' });
    h.$('#msv').onclick = async () => { try { const j = await A.call('mapel.save', { id_mapel: k ? k.id_mapel : '', nama_mapel: h.$('#mn').value, kelompok: h.$('#mk').value }); h.close(); kmRedraw(j); U.toast('Mapel tersimpan.', 'ok'); } catch (e) { U.err(e); } };
  };
  act.a_rform = el => {
    const r = el.dataset.id ? M().ruang.filter(x => x.id_ruang === el.dataset.id)[0] : null;
    const guruRuang = r && r.guru ? String(r.guru).split(',').filter(Boolean) : [];
    const guruField = '<div class="field"><label>Guru ruang <span class="muted">(maks. 2)</span></label><div class="sel-list" id="rgu" style="max-height:160px">' + ((D.peek('users') || []).filter(u => u.peran === 'guru').map(u => '<label><input type="checkbox" class="chk" value="' + esc(u.id) + '"' + (guruRuang.indexOf(u.id) > -1 ? ' checked' : '') + '>' + esc(u.nama) + '</label>').join('') || '<p class="sm muted" style="padding:10px 12px">Belum ada akun guru.</p>') + '</div></div>';
    const h = U.modal({ title: r ? 'Ubah ruang' : 'Tambah ruang', body: '<div class="col g16"><div class="field"><label>Nama ruang</label><input class="input" id="rn" value="' + esc(r ? r.nama_ruang : '') + '" placeholder="mis. Ruang 12A / Lab Biologi"></div><div class="field"><label>Keterangan (opsional)</label><input class="input" id="rk" value="' + esc(r ? r.keterangan || '' : '') + '" placeholder="mis. Kapasitas 36 kursi"></div>' + guruField + '</div>', footer: '<button class="btn sec" data-a="m_close">Batal</button><button class="btn" id="rsv">Simpan</button>' });
    h.$('#rsv').onclick = async () => { try { const j = await A.call('ruang.save', { id_ruang: r ? r.id_ruang : '', nama_ruang: h.$('#rn').value, keterangan: h.$('#rk').value, guru: U.$$('#rgu input:checked', h.el).map(i => i.value) }); h.close(); kmRedraw(j); U.toast('Ruang tersimpan.', 'ok'); } catch (e) { U.err(e); } };
  };
  act.a_rdel = async el => { if (!(await U.confirm('Hapus ruang ini?', { danger: true, ok: 'Hapus' }))) return; kmRedraw(await A.call('ruang.delete', { id_ruang: el.dataset.id })); U.toast('Ruang dihapus.', 'ok'); };
  act.a_mdel = async el => { if (!(await U.confirm('Hapus mata pelajaran ini?', { danger: true, ok: 'Hapus' }))) return; kmRedraw(await A.call('mapel.delete', { id_mapel: el.dataset.id })); U.toast('Mapel dihapus.', 'ok'); };

  // ============================================================ PENGATURAN
  // ---- logo sekolah: unggah langsung (tanpa URL) ----
  function logoUi(v) {
    const u = v.logo_url;
    return '<div class="field"><label>Logo sekolah</label><div class="row g16 wrap">' +
      (u ? '<img src="' + esc(U.safeImg(u)) + '" alt="Logo" style="width:96px;height:96px;object-fit:contain;border:1px solid var(--line);border-radius:12px;padding:6px;background:#fff">' : U.logoEl('', '96px')) +
      '<div class="col g8"><label class="btn sec sm" style="cursor:pointer">' + I('upload', 'sm') + 'Unggah logo<input type="file" id="lgf" accept="image/*" hidden></label>' +
      (u ? '<button class="btn dsec sm" data-a="a_logodel">' + I('delete', 'sm') + 'Hapus logo</button>' : '') +
      '<span class="hint">JPG, PNG, WEBP, atau GIF. Otomatis dikecilkan. Tampil di halaman masuk dan bilah aplikasi.</span></div></div></div>';
  }
  function bindLogo() {
    const f = document.getElementById('lgf'); if (!f) return;
    f.onchange = async () => {
      const file = f.files[0]; if (!file) return;
      try {
        const data = (await U.kecilkanGambar(file, 512, false)).split(',')[1];
        const j = await A.call('pengaturan.logo', { mime: 'image/jpeg', nama: 'logo', data: data }, { timeout: 60000, retry: 0 });
        await A.call('set.save', { setting: { logo_url: j.url } });
        S.setting.logo_url = j.url; U.toast('Logo disimpan.', 'ok'); TKA.go('pengaturan');
      } catch (e) { U.err(e); }
    };
  }
  act.a_logodel = async () => {
    if (!(await U.confirm('Hapus logo sekolah? Aplikasi akan memakai ikon bawaan.', { danger: true, ok: 'Hapus' }))) return;
    await A.call('set.save', { setting: { logo_url: '' } }); S.setting.logo_url = ''; U.toast('Logo dihapus.', 'ok'); TKA.go('pengaturan');
  };

  // ---- avatar pengguna: klik foto di tabel untuk mengubahnya ----
  act.a_ufoto = el => {
    const u = uget(el.dataset.id); if (!u) return;
    TKA.fotoModal(u, u.id === S.user.id, () => { D.invalidate('users'); refreshUsers().catch(() => {}); });
  };

  const TABS = [['umum', 'Identitas', 'badge'], ['ujian', 'Kebijakan ujian', 'rule'], ['aman', 'Keamanan', 'shield'], ['sistem', 'Sistem & kuota', 'dns'], ['audit', 'Log audit', 'history']];
  TKA.route('admin', 'pengaturan', function (c) {
    let tab = c.q.get('t') || 'umum', val = null, info = null, logs = null;
    const T = (k, l, tip) => '<div class="field"><label>' + l + '</label><input class="input" data-i="a_sv" data-ev="input" data-k="' + k + '" value="' + esc(val[k]) + '">' + (tip ? '<span class="hint">' + tip + '</span>' : '') + '</div>';
    const N = (k, l, tip, mn, mx) => '<div class="field"><label>' + l + '</label><input class="input" type="number" min="' + mn + '" max="' + mx + '" step="any" data-i="a_sv" data-ev="input" data-k="' + k + '" value="' + esc(val[k]) + '">' + (tip ? '<span class="hint">' + tip + '</span>' : '') + '</div>';
    const SW = (k, l, tip) => '<label class="row g12" style="align-items:flex-start"><span class="sw" style="margin-top:2px"><input type="checkbox" data-i="a_sv" data-k="' + k + '"' + (val[k] === '1' ? ' checked' : '') + '><i></i></span><span><b class="sm">' + l + '</b><br><span class="xs muted">' + tip + '</span></span></label>';
    const pane = () => {
      if (tab === 'umum') return '<div class="col g16">' + T('nama_sekolah', 'Nama sekolah') + T('tahun_ajaran', 'Tahun ajaran', 'mis. 2024/2025') + logoUi(val) + T('wa_proktor', 'Nomor WhatsApp pengawas (opsional)', 'Format 62812xxxxxxx. Tampil di menu Bantuan siswa.') + '</div>';
      if (tab === 'ujian') return '<div class="col g16"><div class="grid g2">' + N('kkm_default', 'KKM bawaan (0–100)', 'Dipakai sebagai nilai awal saat membuat paket. Skor siswa juga 0–100.', 0, 100) + N('durasi_default', 'Durasi bawaan (menit)', '', 5, 300) + '</div><div class="alert info">' + I('info') + '<span>Skor tiap soal memakai poin. Atur poin di Bank Soal dan Penyusun Paket. Pembahasan, mode aman, token, dan batas pelanggaran kini diatur per paket di Paket Ujian.</span></div>' + SW('acak_soal', 'Acak urutan soal (bawaan paket baru)', 'Setiap siswa mendapat urutan berbeda.') + SW('acak_opsi', 'Acak pilihan jawaban (bawaan paket baru)', '') + SW('tampil_pembahasan', 'Tampilkan pembahasan setelah ujian', 'Jika dimatikan, siswa hanya melihat skor dan diagnostik.') + SW('wajib_token', 'Wajib token sesi untuk ujian terjadwal', 'Token dibagikan pengawas di ruang ujian.') + '</div>';
      if (tab === 'aman') return '<div class="col g16">' + SW('safe_exam', 'Mode ujian aman (anti-curang)', 'Mendeteksi pindah tab/keluar layar penuh. Sesi dikunci setelah batas pelanggaran dan dibuka pengawas.') + '<div class="grid g3">' + N('batas_pelanggaran', 'Batas pelanggaran', 'Sesi terkunci setelah N pelanggaran.', 1, 10) + N('autosave_detik', 'Interval autosave (detik)', 'Makin kecil makin aman, tetapi makin berat bagi kuota.', 10, 120) + N('polling_monitoring', 'Segarkan monitoring (detik)', '', 5, 60) + '</div><div class="alert warn">' + I('warning') + '<span>Rekomendasi untuk ≥500 siswa serentak: autosave 30–45 detik.</span></div></div>';
      if (tab === 'sistem') return info ? '<div class="col g16"><div class="row sp sm"><span class="muted">Versi aplikasi</span><b>' + esc(info.versi) + '</b></div><div class="row sp sm"><span class="muted">Spreadsheet database</span><span><span class="mono">' + esc(info.spreadsheet_id) + '</span> ' + (info.spreadsheet_url ? '<a class="b" target="_blank" rel="noopener" href="' + esc(info.spreadsheet_url) + '">Buka ↗</a>' : '') + '</span></div><div class="row sp sm"><span class="muted">Akses darurat</span>' + U.badge(info.darurat ? 'Terkonfigurasi' : 'Belum', info.darurat ? 'ok' : 'warn') + '</div><div class="row sp sm"><span class="muted">Eksekusi hari ini (perkiraan)</span><b>' + U.rb((S.boot.sistem || {}).eksekusi_hari_ini || 0) + '</b></div><hr style="border:0;border-top:1px solid var(--line);width:100%"><div class="row g8 wrap"><button class="btn sec" data-a="a_cache" data-o="warmup">' + I('local_fire_department') + 'Panaskan cache</button><button class="btn dsec" data-a="a_cache" data-o="flush">' + I('delete_sweep') + 'Kosongkan cache</button></div><p class="xs muted">Cache dikosongkan bila Anda mengubah data langsung di Google Sheets. Rahasia (kunci sesi, sandi darurat) hanya ada di Script Properties dan tidak pernah tampil di sini.</p></div>' : U.skel(3, 36);
      if (tab === 'audit') return logs ? (logs.length ? '<div class="tw"><table><thead><tr><th>Waktu</th><th>Pengguna</th><th>Aksi</th><th>Detail</th></tr></thead><tbody>' + logs.map(l => '<tr><td class="sm" style="white-space:nowrap">' + U.tglJam(l.ts) + '</td><td class="sm"><b>' + esc(l.user) + '</b> <span class="muted">' + esc(l.peran) + '</span></td><td><span class="badge neu">' + esc(l.aksi) + '</span></td><td class="xs muted mono" style="max-width:360px;overflow-wrap:anywhere">' + esc(l.detail) + '</td></tr>').join('') + '</tbody></table></div>' : U.empty('history', 'Belum ada catatan')) : U.skel(4, 36);
      return '';
    };
    const draw = () => {
      c.root.innerHTML = U.pageHead('Pengaturan sistem', 'Kebijakan ujian, keamanan, dan perawatan aplikasi.', (tab !== 'sistem' && tab !== 'audit') ? '<button class="btn" data-a="a_ssave">' + I('save') + 'Simpan perubahan</button>' : '') +
        '<div class="grid" style="grid-template-columns:220px minmax(0,1fr);align-items:start" id="stg"><div class="card setnav" style="padding:8px"><div class="col g4">' + TABS.map(t => '<a class="row g8" style="padding:10px 12px;border-radius:8px;font-weight:600;font-size:14px;' + (tab === t[0] ? 'background:var(--soft);color:var(--primary-c)' : 'color:var(--muted)') + '" href="#/pengaturan?t=' + t[0] + '">' + I(t[2], 'sm') + t[1] + '</a>').join('') + '</div></div><div class="card" id="stp">' + (val ? pane() : U.skel(4, 44)) + '</div></div>';
      if (window.innerWidth < 800) $('#stg').style.gridTemplateColumns = '1fr';
      bindLogo();
    };
    draw();
    A.call('set.get', {}, { read: true }).then(j => { val = Object.assign({}, j.setting); info = j.info; TKA._sv = val; draw(); }).catch(U.err);
    if (tab === 'audit') A.call('audit.list', { limit: 150 }, { read: true }).then(j => { logs = j.log; draw(); });
    return () => { TKA._sv = null; };
  });
  inp.a_sv = el => { if (TKA._sv) TKA._sv[el.dataset.k] = el.type === 'checkbox' ? (el.checked ? '1' : '0') : el.value; };
  act.a_ssave = async el => {
    if (!TKA._sv) return; el.disabled = true;
    try { const j = await A.call('set.save', { setting: TKA._sv }); Object.assign(S.setting, j.setting); TKA.refreshBoot().catch(() => {}); U.toast('Pengaturan disimpan.', 'ok'); } catch (e) { U.err(e); }
    el.disabled = false;
  };
  act.a_cache = async el => {
    if (el.dataset.o === 'flush' && !(await U.confirm('Kosongkan seluruh cache? Permintaan berikutnya akan sedikit lebih lambat.', { ok: 'Kosongkan' }))) return;
    const j = await A.call('sys.cache', { op: el.dataset.o }); D.m = {}; U.toast(j.pesan, 'ok', 4000);
  };

  // ============================================================ CETAK KARTU & DOWNLOAD DATA PENGGUNA
  // Kata sandi disimpan sebagai hash dan tidak bisa dibaca kembali. Kartu berisi sandi hanya jika akun direset di sini.
  const CF = { peran: '', kelas: '', guru: '', q: '', page: 1, sel: new Set() };
  const mapelNama = u => String(u.id_mapel || '').split(',').filter(Boolean).map(mapelNm).join(', ');
  function cetakFilter(list) {
    return list.filter(u => (!CF.peran || u.peran === CF.peran)
      && (!CF.kelas || (u.peran === 'siswa' && u.id_kelas === CF.kelas))
      && (!CF.guru || u.id === CF.guru)
      && (!CF.q || (u.nama + ' ' + u.username).toLowerCase().indexOf(CF.q.toLowerCase()) > -1));
  }
  // Kartu login: logo, judul, QR code di kanan atas; foto, nama, username, password, dan ruang.
  // QR berisi alamat login dan username saja (sandi tidak pernah masuk QR).
  const QR_SRC = 'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js';
  // Pustaka QR dari CDN dibatasi 4 detik. Jika gagal atau lambat, kartu tetap bisa dicetak (QR diganti kotak kosong).
  function loadQr() {
    if (window.QRCode) return Promise.resolve(true);
    const muat = new Promise(res => { const s = document.createElement('script'); s.src = QR_SRC; s.onload = () => res(true); s.onerror = () => res(false); document.head.appendChild(s); });
    const batas = new Promise(res => setTimeout(() => res(false), 4000));
    return Promise.race([muat, batas]);
  }
  function qrUrl(teks) {
    if (!window.QRCode) return '';
    const d = document.createElement('div');
    try { new QRCode(d, { text: teks, width: 180, height: 180, correctLevel: QRCode.CorrectLevel.M }); } catch (e) { return ''; }
    const cv = d.querySelector('canvas'); return cv ? cv.toDataURL('image/png') : '';
  }
  function cetakKartuHtml(list, withPass) {
    const nm = S.setting.nama_sekolah || '', th = S.setting.tahun_ajaran || '', logo = U.safeImg(S.setting.logo_url);
    const base = location.origin + location.pathname;
    const kartu = list.map(k => {
      const qr = qrUrl('Login: ' + base + ' | Username: ' + k.username + ' | ' + nm);
      return '<div class="kt"><div class="kt-h">' +
        (logo ? '<img class="kt-logo" src="' + esc(logo) + '" alt="">' : '<span class="kt-logo"></span>') +
        '<div class="kt-t"><b>KARTU LOGIN</b><br>' + esc(nm) + '<br>TES KEMAMPUAN AKADEMIK ' + esc(th) + '</div>' +
        (qr ? '<img class="kt-qr" src="' + qr + '" alt="QR">' : '<span class="kt-qr"></span>') + '</div>' +
        '<div class="kt-b"><div class="kt-foto"><img src="' + esc(U.safeImg(k.foto) || U.defAv) + '" alt=""></div><table class="kt-f">' +
        '<tr><td>Nama Peserta</td><td>:</td><td><b>' + esc(k.nama) + '</b></td></tr>' +
        '<tr><td>' + (k.peran === 'siswa' ? 'NISN / Username' : k.peran === 'guru' ? 'NIP' : 'Username') + '</td><td>:</td><td class="m">' + esc(k.username) + '</td></tr>' +
        '<tr><td>Password</td><td>:</td><td class="m">' + (withPass ? esc(k.password) : '<span class="line">&nbsp;</span>') + '</td></tr>' +
        '<tr><td>Ruang</td><td>:</td><td>' + esc(k.ruang || (k.peran === 'siswa' ? '—' : '—')) + '</td></tr>' +
        '</table></div></div>';
    }).join('');
    return '<html><head><meta charset="utf-8"><title>Kartu login</title><style>@page{size:A4;margin:10mm}body{font-family:Arial,Helvetica,sans-serif;margin:0}.g{display:grid;grid-template-columns:1fr 1fr;gap:6mm}.kt{border:1.5px solid #333;border-radius:6px;padding:8px 10px;break-inside:avoid;font-size:11px;color:#111}.kt-h{display:flex;align-items:center;gap:8px;border-bottom:1px solid #999;padding-bottom:6px}.kt-logo{width:44px;height:44px;object-fit:contain;flex:none}.kt-t{flex:1;text-align:center;font-size:10.5px;line-height:14px}.kt-t b{font-size:12px}.kt-qr{width:72px;height:72px;flex:none}.kt-b{display:flex;gap:10px;margin-top:8px}.kt-foto{width:70px;height:88px;border:1px solid #555;flex:none;overflow:hidden}.kt-foto img{width:100%;height:100%;object-fit:cover}.kt-f{border-collapse:collapse;font-size:11px}.kt-f td{padding:2px 4px;vertical-align:top}.kt-f td:first-child{white-space:nowrap;width:98px}.m{font-family:monospace;font-size:12px;font-weight:bold}.line{display:inline-block;min-width:110px;border-bottom:1px solid #333}</style></head><body><div class="g">' + kartu + '</div></body></html>';
  }
  function cetakWindow(html) {
    const f = document.createElement('iframe'); f.style.cssText = 'position:fixed;width:0;height:0;border:0'; document.body.appendChild(f);
    f.contentDocument.write(html); f.contentDocument.close();
    setTimeout(() => { f.contentWindow.focus(); f.contentWindow.print(); setTimeout(() => f.remove(), 2000); }, 300);
  }
  TKA.route('admin', 'cetak', function (c) {
    c.live();
    let list = [];
    const targets = () => { const f = cetakFilter(list); return CF.sel.size ? f.filter(u => CF.sel.has(u.id)) : f; };
    const draw = () => {
      const f = cetakFilter(list), per = 25, pg = f.slice((CF.page - 1) * per, CF.page * per), t = targets();
      $('#cfn').textContent = U.rb(f.length) + ' pengguna cocok' + (CF.sel.size ? ' · ' + CF.sel.size + ' dipilih' : ' · semua hasil filter akan diproses');
      $('#cft').innerHTML = pg.length ? '<div class="tw"><table><thead><tr><th style="width:36px"><input type="checkbox" class="chk" data-a="c_all"' + (pg.length && pg.every(u => CF.sel.has(u.id)) ? ' checked' : '') + '></th><th>Nama</th><th>NISN / username</th><th>Peran</th><th>Kelas / mapel</th><th>Status</th></tr></thead><tbody>' +
        pg.map(u => '<tr><td><input type="checkbox" class="chk" data-a="c_sel" data-id="' + u.id + '"' + (CF.sel.has(u.id) ? ' checked' : '') + '></td><td><b>' + esc(u.nama) + '</b></td><td class="mono sm">' + esc(u.username) + '</td><td>' + U.badge(PRN[u.peran][0], PRN[u.peran][1]) + '</td><td class="sm">' + esc(u.peran === 'siswa' ? (u.kelas || '-') : u.peran === 'guru' ? (mapelNama(u) || 'Semua mapel') : '—') + '</td><td>' + U.badge(u.status, USB[u.status]) + '</td></tr>').join('') +
        '</tbody></table></div>' + U.pager(f.length, CF.page, per, 'c_p') : U.empty('search_off', 'Tidak ada pengguna yang cocok', 'Ubah filter di atas.');
      const b = $('#cfbtn'); if (b) b.dataset.n = t.length;
    };
    const guruOpt = () => list.filter(u => u.peran === 'guru').map(u => [u.id, u.nama]);
    c.root.innerHTML = U.pageHead('Cetak Kartu & Data Pengguna', 'Filter pengguna lalu unduh data, cetak kartu, atau reset sandi dan cetak kartu baru.',
        '<button class="btn sec" data-a="c_csv">' + I('download') + 'Unduh data (CSV)</button><button class="btn sec" data-a="c_print">' + I('print') + 'Cetak kartu</button><button class="btn" data-a="c_reset">' + I('key') + 'Reset sandi & cetak kartu</button>') +
      '<div class="card pad0"><div class="filters">' +
      '<select class="select" data-i="c_f" data-k="peran">' + U.opt([['siswa', 'Siswa'], ['guru', 'Guru / Pengawas'], ['admin', 'Administrator']], CF.peran, 'Semua peran') + '</select>' +
      '<select class="select" data-i="c_f" data-k="kelas">' + U.opt(kelasOpt(), CF.kelas, 'Semua kelas') + '</select>' +
      '<select class="select" data-i="c_f" data-k="guru" id="cfguru">' + U.opt([], '', 'Semua guru') + '</select>' +
      '<div class="grow"><input class="input" placeholder="Cari nama atau NISN…" data-i="c_f" data-k="q" data-ev="input" value="' + esc(CF.q) + '"></div></div>' +
      '<div class="row sp wrap sm" style="padding:10px 16px;background:var(--soft)"><span id="cfn" class="muted"></span><button class="btn ghost sm" data-a="c_clear">' + I('deselect', 'sm') + 'Kosongkan pilihan</button></div>' +
      '<div id="cft">' + U.skel(5, 44) + '</div></div>';
    TKA._cf = { draw: draw, guruOpt: guruOpt };
    D.swr('users', v => { list = v; const gs = $('#cfguru'); if (gs) gs.innerHTML = U.opt(guruOpt(), CF.guru, 'Semua guru'); draw(); }).catch(U.err);
    draw();
    return () => { TKA._cf = null; };
  });
  inp.c_f = el => { CF[el.dataset.k] = el.value; CF.page = 1; if (el.dataset.k === 'peran' && el.value) { /* peran tidak menghapus pilihan */ } if (TKA._cf) TKA._cf.draw(); };
  act.c_p = el => { CF.page = Number(el.dataset.p); if (TKA._cf) TKA._cf.draw(); };
  act.c_sel = el => { el.checked ? CF.sel.add(el.dataset.id) : CF.sel.delete(el.dataset.id); if (TKA._cf) TKA._cf.draw(); };
  act.c_all = el => { U.$$('[data-a=c_sel]').forEach(b => { el.checked ? CF.sel.add(b.dataset.id) : CF.sel.delete(b.dataset.id); }); if (TKA._cf) TKA._cf.draw(); };
  act.c_clear = () => { CF.sel.clear(); if (TKA._cf) TKA._cf.draw(); };
  const cfTargets = () => { const all = (D.peek('users') || []); const f = cetakFilter(all); return CF.sel.size ? f.filter(u => CF.sel.has(u.id)) : f; };
  act.c_csv = () => {
    const t = cfTargets(); if (!t.length) return U.toast('Tidak ada pengguna yang cocok.', 'warn');
    U.download('data-pengguna.csv', U.csvBuild(['Nama', 'NISN/Username', 'Peran', 'Kelas', 'Mapel', 'Status'], t.map(u => [u.nama, u.username, u.peran, u.kelas || '', mapelNama(u), u.status])));
  };
  act.c_print = async () => {
    const t = cfTargets(); if (!t.length) return U.toast('Tidak ada pengguna yang cocok.', 'warn');
    await loadQr(); cetakWindow(cetakKartuHtml(t.map(u => ({ nama: u.nama, username: u.username, peran: u.peran, kelas: u.kelas, foto: u.foto, ruang: u.ruang, password: '' })), false));
  };
  act.c_reset = async () => {
    const t = cfTargets().filter(u => u.id !== S.user.id);
    if (!t.length) return U.toast('Tidak ada pengguna yang cocok (akun Anda sendiri tidak ikut direset).', 'warn');
    if (!(await U.confirm('Reset kata sandi <b>' + t.length + '</b> akun? Sandi lama tidak berlaku lagi, perangkat mereka akan keluar, dan kartu dengan sandi baru akan dicetak.', { danger: true, ok: 'Reset & cetak' }))) return;
    let kartu = [];
    for (let i = 0; i < t.length; i += 100) {
      const j = await A.call('user.bulk', { ids: t.slice(i, i + 100).map(u => u.id), op: 'reset' }, { timeout: 60000 });
      kartu = kartu.concat(j.kartu || []);
    }
    await refreshUsers();
    CF.sel.clear(); if (TKA._cf) TKA._cf.draw();
    if (!kartu.length) return U.toast('Tidak ada kartu yang dibuat.', 'warn');
    await loadQr(); cetakWindow(cetakKartuHtml(kartu.map(k => Object.assign({}, (D.peek('users') || []).filter(u => u.username === k.username)[0] || {}, k)), true));
    U.toast(kartu.length + ' kata sandi direset. Kartu siap dicetak.', 'ok', 4500);
  };

  // ============================================================ PENGATURAN GURU & PENGAWAS
  // Daftar guru di kiri; mapel yang diampu dan kelas yang diajar dipilih lewat multi-checkbox (dua kelompok berdampingan).
  // Disimpan lewat user.save (untuk guru: id_mapel dan kelas_ajar).
  const PG = { q: '', sel: '', mapel: new Set(), kelas: new Set(), baru: false };
  let pgDrawL = null, pgDrawR = null;
  const pgGuru = () => (D.peek('users') || []).filter(u => u.peran === 'guru');
  const pgAkun = () => pgGuru().filter(u => u.id === PG.sel)[0] || null;
  function pgPick(u) {
    PG.sel = u.id; PG.mapel = new Set(String(u.id_mapel || '').split(',').filter(Boolean));
    PG.kelas = new Set(u.kelas_ajar || []); PG.baru = false;
  }
  function pgDrawKiri() {
    if (!pgDrawL) return;
    const l = pgGuru().filter(u => !PG.q || (u.nama + ' ' + u.username).toLowerCase().indexOf(PG.q.toLowerCase()) > -1);
    pgDrawL.innerHTML = l.length ? l.map(u => '<button type="button" class="pgitem' + (u.id === PG.sel ? ' on' : '') + '" data-a="pg_pick" data-id="' + u.id + '">' +
      '<div class="row g8">' + U.fotoEl(u, 34) + '<div class="grow"><b>' + esc(u.nama) + '</b><div class="xs muted mono">' + esc(u.username) + '</div></div></div>' +
      '<div class="xs muted" style="margin-top:6px">' + String(u.id_mapel || '').split(',').filter(Boolean).length + ' mapel • ' + (u.kelas_ajar || []).length + ' kelas</div></button>').join('')
      : U.empty('person_search', 'Belum ada guru', 'Tambahkan guru di menu Manajemen Pengguna.');
  }
  function pgDrawKanan() {
    if (!pgDrawR) return;
    const a = pgAkun();
    if (!a) { pgDrawR.innerHTML = U.empty('touch_app', 'Pilih guru', 'Pilih guru di sebelah kiri untuk mengatur mapel dan kelasnya.'); return; }
    const kotak = (daftar, set, aksi) => daftar.map(x => '<label class="pgchk-row"><input type="checkbox" class="pgchk" data-a="' + aksi + '" data-id="' + x[0] + '"' + (set.has(x[0]) ? ' checked' : '') + '><span>' + esc(x[1]) + '</span></label>').join('');
    const mapelOpt = M().mapel.map(m => [m.id_mapel, m.nama_mapel]), kelasOpt2 = M().kelas.map(k => [k.id_kelas, k.nama_kelas]);
    pgDrawR.innerHTML =
      '<div class="row sp wrap"><div class="row g12">' + U.fotoEl(a, 44) + '<div><h3>' + esc(a.nama) + '</h3><div class="sm muted mono">' + esc(a.username) + '</div></div></div>' +
      (PG.baru ? U.badge('Belum disimpan', 'warn') : U.badge('Tersimpan', 'ok')) + '</div>' +
      '<div class="pgdua mt16">' +
        '<div class="card flat"><div class="row sp"><h4>Mata pelajaran yang diampu</h4><span class="sm muted">' + PG.mapel.size + ' dipilih</span></div>' +
          '<div class="pgbox">' + (mapelOpt.length ? kotak(mapelOpt, PG.mapel, 'pg_m') : '<p class="sm muted">Belum ada mata pelajaran.</p>') + '</div>' +
          '<div class="row g8 mt8"><button class="btn ghost sm" data-a="pg_all" data-g="m">Pilih semua</button><button class="btn ghost sm" data-a="pg_none" data-g="m">Kosongkan</button></div></div>' +
        '<div class="card flat"><div class="row sp"><h4>Kelas yang diajar</h4><span class="sm muted">' + PG.kelas.size + ' dipilih</span></div>' +
          '<div class="pgbox">' + (kelasOpt2.length ? kotak(kelasOpt2, PG.kelas, 'pg_k') : '<p class="sm muted">Belum ada kelas.</p>') + '</div>' +
          '<div class="row g8 mt8"><button class="btn ghost sm" data-a="pg_all" data-g="k">Pilih semua</button><button class="btn ghost sm" data-a="pg_none" data-g="k">Kosongkan</button></div></div>' +
      '</div>' +
      '<div class="row sp wrap mt16"><span class="sm muted">Mapel memengaruhi pilihan mapel di Tambah Soal. Kelas memengaruhi kelas yang bisa dijadwalkan.</span>' +
        '<div class="row g8"><button class="btn sec' + (PG.baru ? '' : ' off') + '" data-a="pg_reset">Batalkan</button><button class="btn' + (PG.baru ? '' : ' off') + '" data-a="pg_save">' + I('save') + 'Simpan</button></div></div>';
  }
  TKA.route('admin', 'pengaturan-guru', function (c) {
    c.live();
    c.root.innerHTML = U.pageHead('Pengaturan Guru & Pengawas', 'Atur mata pelajaran dan kelas yang diampu setiap guru. Dipakai untuk membatasi Bank Soal dan jadwal ujian.') +
      '<div class="pgwrap"><div class="card"><div class="col g12"><input class="input" placeholder="Cari guru…" data-i="pg_q" data-ev="input" value="' + esc(PG.q) + '"><div id="pgl"></div></div></div>' +
      '<div class="card" id="pgr">' + U.skel(3, 60) + '</div></div>';
    pgDrawL = $('#pgl'); pgDrawR = $('#pgr');
    const selesai = () => { if (!PG.sel && pgGuru().length) pgPick(pgGuru()[0]); pgDrawKiri(); pgDrawKanan(); };
    selesai();
    D.swr('users', () => { selesai(); }).catch(U.err);
    return () => { pgDrawL = null; pgDrawR = null; };
  });
  inp.pg_q = U.debounce(el => { PG.q = el.value; pgDrawKiri(); }, 150);
  act.pg_pick = async el => {
    if (PG.baru && !(await U.confirm('Perubahan belum disimpan akan hilang. Lanjutkan?', { danger: true, ok: 'Lanjutkan' }))) return;
    const u = pgGuru().filter(x => x.id === el.dataset.id)[0]; if (!u) return;
    pgPick(u); pgDrawKiri(); pgDrawKanan();
  };
  act.pg_m = el => { el.checked ? PG.mapel.add(el.dataset.id) : PG.mapel.delete(el.dataset.id); PG.baru = true; pgDrawKanan(); };
  act.pg_k = el => { el.checked ? PG.kelas.add(el.dataset.id) : PG.kelas.delete(el.dataset.id); PG.baru = true; pgDrawKanan(); };
  act.pg_all = el => {
    const g = el.dataset.g === 'm' ? M().mapel.map(m => m.id_mapel) : M().kelas.map(k => k.id_kelas);
    const set = el.dataset.g === 'm' ? PG.mapel : PG.kelas; g.forEach(id => set.add(id));
    PG.baru = true; pgDrawKanan();
  };
  act.pg_none = el => { (el.dataset.g === 'm' ? PG.mapel : PG.kelas).clear(); PG.baru = true; pgDrawKanan(); };
  act.pg_reset = () => { const a = pgAkun(); if (a) pgPick(a); pgDrawKiri(); pgDrawKanan(); };
  act.pg_save = async el => {
    const a = pgAkun(); if (!a || !PG.baru) return;
    el.disabled = true;
    try {
      await A.call('user.save', { id: a.id, nama: a.nama, status: a.status, id_mapel: Array.from(PG.mapel).join(','), kelas_ajar: Array.from(PG.kelas) });
      D.invalidate('users'); await D.fetch('users');
      PG.baru = false; U.toast('Pengaturan guru disimpan.', 'ok');
      pgDrawKiri(); pgDrawKanan();
    } catch (e) { U.err(e); }
    finally { el.disabled = false; }
  };
})();
