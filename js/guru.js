/* guru.js — Dashboard guru, Bank Soal, Paket Ujian, Jadwal, Monitoring Live, Laporan. (Admin memakai halaman yang sama.) */
(function () {
  const TKA = window.TKA, U = TKA.ui, A = TKA.api, D = TKA.D, S = TKA.S, esc = U.esc, I = U.i, $ = U.$, act = TKA.actions, inp = TKA.inputs;
  const ST = ['guru', 'admin'];
  const M = () => ({ mapel: (S.boot && S.boot.mapel) || [], kelas: (S.boot && S.boot.kelas) || [] });
  const mapelNm = id => { const m = M().mapel.filter(x => x.id_mapel === id)[0]; return m ? m.nama_mapel : id === 'CAMPUR' ? 'Campuran' : '-'; };
  const mapelOpt = () => M().mapel.map(m => [m.id_mapel, m.nama_mapel]);
  const isAdmin = () => S.user && S.user.peran === 'admin';

  // ---- hapus paket/jadwal yang sudah berisi data (hanya admin; permanen) ----
  async function ringkasanHasil(kind, id) {
    const r = await A.call('lap.get', kind === 'paket' ? { id_paket: id } : { id_paket: id.paket, id_jadwal: id.jadwal }, { read: true });
    return { head: ['Peringkat', 'Nama', 'NISN', 'Kelas', 'Skor', 'Benar', 'Salah', 'Kosong', 'Durasi (mnt)', 'Status KKM'],
      rows: r.rows.map((x, i) => [i + 1, x.nama, x.username, x.kelas, x.skor, x.benar, x.salah, x.kosong, x.durasi, x.lulus ? 'Lulus' : 'Belum']) };
  }
  function konfirmHapusData(o) {
    const li = o.rincian.map(x => '<li>' + x + '</li>').join('');
    const h = U.modal({ title: o.judul, sub: esc(o.nama), body:
      '<div class="col g16"><div class="alert err">' + I('warning') + '<div><b>Tindakan ini tidak dapat dibatalkan.</b> Data berikut ikut terhapus permanen:<ul class="sm" style="margin:6px 0 0 18px">' + li + '</ul></div></div>' +
      (o.peringatan ? '<div class="alert warn">' + I('warning') + '<span>' + o.peringatan + '</span></div>' : '') +
      '<button class="btn sec" id="hcad">' + I('download') + 'Unduh ringkasan hasil dulu (CSV)</button>' +
      '<div class="field"><label>Ketik <span class="mono b">' + esc(o.kode) + '</span> untuk konfirmasi</label><input class="input mono" id="hkf" autocomplete="off" autocapitalize="characters"></div></div>',
      footer: '<button class="btn sec" data-a="m_close">Batal</button><button class="btn danger off" id="hgo">' + I('delete_forever') + 'Hapus permanen</button>' });
    const cek = () => h.$('#hgo').classList.toggle('off', h.$('#hkf').value.trim().toUpperCase() !== String(o.kode).toUpperCase());
    h.$('#hkf').addEventListener('input', cek);
    h.$('#hcad').onclick = async () => { try { const t = await ringkasanHasil(o.kind, o.idRingkas); U.download(o.berkas, U.csvBuild(t.head, t.rows)); } catch (e) { U.err(e); } };
    h.$('#hgo').onclick = async () => {
      const b = h.$('#hgo'); b.disabled = true;
      try { await o.jalankan(); h.close(); U.toast(o.sukses, 'ok', 5000); }
      catch (e) { b.disabled = false; U.err(e); }
    };
    setTimeout(() => h.$('#hkf').focus(), 40);
  }

  // ============================================================ DASHBOARD GURU
  TKA.route('guru', 'dashboard', function (c) {
    c.live();
    const draw = () => {
      const b = S.boot || {}, st = b.stats || {}, jd = b.jadwal || [], now = A.now();
      c.root.innerHTML = U.pageHead('Halo, ' + esc(String(S.user.nama).split(',')[0]), 'Ringkasan bank soal, jadwal, dan hasil ujian.',
        '<a class="btn sec" href="#/soal/baru">' + I('add') + 'Soal</a><a class="btn sec" href="#/paket-ujian/baru">' + I('add') + 'Paket</a><a class="btn" href="#/jadwal?baru=1">' + I('event') + 'Jadwalkan ujian</a>') +
        '<div class="grid gs4 mb16 statrow">' + U.stat('quiz', U.rb(st.soal || 0), 'Total soal' + (st.draft ? ' · ' + st.draft + ' draf' : '')) + U.stat('inventory_2', st.paket || 0, 'Paket terpublikasi') + U.stat('monitor_heart', st.berlangsung || 0, 'Ujian berlangsung', st.berlangsung ? 'ok' : '') + U.stat('analytics', st.rata || 0, 'Rata-rata skor (' + (st.selesai || 0) + ' hasil)', 'warn') + '</div>' +
        '<div class="card pad0"><div class="card-h"><h3>Ujian terdekat</h3><a class="sm b" href="#/jadwal">Semua jadwal →</a></div>' +
        (jd.length ? '<div class="tw"><table><thead><tr><th>Kode</th><th>Paket</th><th class="hm">Kelas</th><th>Waktu</th><th>Token</th><th>Status</th><th></th></tr></thead><tbody>' + jd.map(j => {
          const live = j.mulai <= now && now <= j.selesai;
          return '<tr><td class="mono sm">' + esc(j.kode) + '</td><td><b>' + esc(j.paket) + '</b><div class="xs muted">' + esc(j.mapel) + '</div></td><td class="sm hm">' + esc(j.kelas_nama.join(', ')) + '</td><td class="sm">' + U.tglJam(j.mulai) + '<div class="xs muted">s.d. ' + U.jam(j.selesai) + '</div></td><td><span class="mono b">' + esc(j.token) + '</span></td><td>' + (live ? U.badge('Berlangsung', 'ok') : U.badge('Terjadwal', 'info')) + '</td><td class="tr">' + (live ? '<a class="btn sm" href="#/monitoring?j=' + j.id_jadwal + '">Pantau</a>' : '') + '</td></tr>';
        }).join('') + '</tbody></table></div>' : U.empty('event_available', 'Belum ada jadwal mendatang', 'Buat jadwal agar siswa dapat mengerjakan simulasi.', '<a class="btn mt16" href="#/jadwal?baru=1">Buat jadwal</a>')) + '</div>';
    };
    draw();
    const t = setInterval(() => { if (!document.hidden) draw(); }, 30000);
    return () => clearInterval(t);
  });

  // ============================================================ BANK SOAL
  const SF = { q: '', mapel: '', kes: '', status: '', page: 1, sel: new Set() };
  function tabs(on) { return '<div class="tabs mb16"><a class="tab' + (on === 'soal' ? ' on' : '') + '" href="#/soal">Bank soal</a><a class="tab' + (on === 'paket' ? ' on' : '') + '" href="#/paket-ujian">Paket ujian</a></div>'; }
  TKA.route(ST, 'soal', function (c) {
    c.live();
    let list = [];
    const filt = () => list.filter(s => (!SF.q || (s.ringkas + ' ' + s.topik).toLowerCase().indexOf(SF.q.toLowerCase()) > -1) && (!SF.mapel || s.id_mapel === SF.mapel) && (!SF.kes || s.kesulitan === SF.kes) && (!SF.status || s.status === SF.status));
    const draw = () => {
      const f = filt(), per = 15, pg = f.slice((SF.page - 1) * per, SF.page * per);
      const body = pg.length ? '<div class="tw"><table><thead><tr><th style="width:36px"><input type="checkbox" class="chk" data-a="g_sall"></th><th>Pertanyaan</th><th class="hm">Mapel / topik</th><th class="hm">Kesulitan</th><th>Status</th><th></th></tr></thead><tbody>' +
        pg.map(s => '<tr><td><input type="checkbox" class="chk" data-a="g_ssel" data-id="' + s.id_soal + '"' + (SF.sel.has(s.id_soal) ? ' checked' : '') + '></td><td style="max-width:420px"><a href="#/soal/' + s.id_soal + '" class="b" style="color:var(--ink)">' + esc(s.ringkas) + '</a></td><td class="sm hm">' + esc(mapelNm(s.id_mapel)) + '<div class="xs muted">' + esc(s.topik) + '</div></td><td class="hm">' + U.kes(s.kesulitan) + '</td><td>' + U.badge(s.status, s.status === 'Aktif' ? 'ok' : 'neu') + '</td><td class="tr"><span class="acts"><a class="ibtn" href="#/soal/' + s.id_soal + '" title="Ubah">' + I('edit') + '</a><button class="ibtn dng" data-a="g_sdel" data-id="' + s.id_soal + '" title="Hapus">' + I('delete') + '</button></span></td></tr>').join('') + '</tbody></table></div>' + U.pager(f.length, SF.page, per, 'g_sp')
        : U.empty('quiz', list.length ? 'Tidak ada soal yang cocok' : 'Bank soal masih kosong', list.length ? 'Ubah filter pencarian.' : 'Mulai dengan menambah soal atau mengimpor dari CSV/Excel.', '<a class="btn mt16" href="#/soal/baru">Tambah soal</a>');
      const grid = $('#sbody'); if (grid) grid.innerHTML = body;
      const bar = $('#sbulk'); if (bar) { bar.classList.toggle('hide', !SF.sel.size); bar.querySelector('b').textContent = SF.sel.size; }
    };
    c.root.innerHTML = U.pageHead('Bank soal', 'Kelola soal pilihan ganda per mata pelajaran.', '<button class="btn sec" data-a="g_simp">' + I('upload_file') + 'Import</button><a class="btn" href="#/soal/baru">' + I('add') + 'Tambah soal</a>') + tabs('soal') +
      '<div class="card pad0"><div class="filters"><div class="grow"><input class="input" placeholder="Cari pertanyaan atau topik…" data-i="g_sf" data-k="q" data-ev="input" value="' + esc(SF.q) + '"></div>' +
      '<select class="select" data-i="g_sf" data-k="mapel">' + U.opt(mapelBolehOpt(), SF.mapel, 'Semua mapel') + '</select><select class="select" data-i="g_sf" data-k="kes">' + U.opt([['Mudah', 'Mudah'], ['Sedang', 'Sedang'], ['Sukar', 'Sukar']], SF.kes, 'Semua tingkat') + '</select><select class="select" data-i="g_sf" data-k="status">' + U.opt([['Aktif', 'Aktif'], ['Draft', 'Draft']], SF.status, 'Semua status') + '</select></div>' +
      '<div id="sbulk" class="row sp sm hide" style="padding:10px 16px;background:var(--soft)"><span><b>0</b> soal dipilih</span><button class="btn dsec sm" data-a="g_sbulkdel">' + I('delete', 'sm') + 'Hapus terpilih</button></div><div id="sbody">' + U.skel(5, 48) + '</div></div>';
    TKA._sd = () => { draw(); };
    TKA._sl = () => list;
    D.swr('soal', v => { list = v; draw(); }).catch(e => { if (!list.length) $('#sbody').innerHTML = U.empty('error', 'Gagal memuat', e.message); });
    return () => { TKA._sd = null; };
  });
  inp.g_sf = el => { SF[el.dataset.k] = el.value; SF.page = 1; if (TKA._sd) TKA._sd(); };
  act.g_sp = el => { SF.page = Number(el.dataset.p); if (TKA._sd) TKA._sd(); };
  act.g_ssel = el => { el.checked ? SF.sel.add(el.dataset.id) : SF.sel.delete(el.dataset.id); if (TKA._sd) TKA._sd(); };
  act.g_sall = el => { U.$$('[data-a=g_ssel]').forEach(b => { b.checked = el.checked; el.checked ? SF.sel.add(b.dataset.id) : SF.sel.delete(b.dataset.id); }); if (TKA._sd) TKA._sd(); };
  async function delSoal(ids) {
    if (!(await U.confirm('Hapus <b>' + ids.length + '</b> soal? Tindakan ini tidak dapat dibatalkan.', { danger: true, ok: 'Hapus' }))) return;
    const j = await A.call('soal.delete', { ids: ids });
    SF.sel.clear(); D.invalidate('soal'); await D.fetch('soal'); if (TKA._sd) { TKA._sd.call(); } TKA.go('soal');
    U.toast(j.dihapus + ' soal dihapus' + (j.dilewati.length ? '; ' + j.dilewati.length + ' dilewati (' + j.dilewati[0] + ')' : ''), j.dilewati.length ? 'warn' : 'ok', 5000);
  }
  act.g_sdel = el => delSoal([el.dataset.id]);
  act.g_sbulkdel = () => delSoal(Array.from(SF.sel));

  // ---- form soal ----
  const BLANK = { id_mapel: '', topik: '', kesulitan: 'Sedang', status: 'Draft', poin: 1, pertanyaan: '', gambar: '', opsi_a: '', opsi_b: '', opsi_c: '', opsi_d: '', opsi_e: '', kunci: 'A', pembahasan: '' };
  TKA.route(ST, 'soal/baru', c => soalForm(c, null));
  TKA.route(ST, 'soal/:id', c => soalForm(c, c.params.id));
  async function soalForm(c, id) {
    let f = Object.assign({}, BLANK, { id_mapel: (mapelBolehOpt()[0] || [''])[0] || '' });
    c.root.innerHTML = '<div class="card">' + U.skel(3, 80) + '</div>';
    if (!id && TKA._carry) { f = Object.assign(f, TKA._carry); TKA._carry = null; }
    if (id) { try { f = Object.assign(f, (await A.call('soal.get', { id_soal: id }, { read: true })).soal); } catch (e) { c.root.innerHTML = '<div class="card">' + U.empty('error', 'Soal tidak ditemukan', e.message, '<a class="btn mt16" href="#/soal">Kembali</a>') + '</div>'; return; } }
    const topiks = Array.from(new Set((D.peek('soal') || []).map(s => s.topik))).sort();
    const opts = ['a', 'b', 'c', 'd', 'e'].map(k => '<div class="row g8" style="align-items:flex-start"><label class="row g8" style="margin-top:8px;cursor:pointer" title="Jadikan kunci jawaban"><input type="radio" name="kunci" value="' + k.toUpperCase() + '" class="chk" data-i="g_fk"' + (f.kunci === k.toUpperCase() ? ' checked' : '') + '><b style="width:18px">' + k.toUpperCase() + '</b></label><textarea class="textarea grow" rows="1" style="min-height:40px" data-i="g_ff" data-ev="input" data-k="opsi_' + k + '" placeholder="Pilihan ' + k.toUpperCase() + (k === 'e' ? ' (opsional)' : '') + '">' + esc(f['opsi_' + k]) + '</textarea></div>').join('');
    c.root.innerHTML = '<div class="row mb16"><a class="btn ghost sm" href="#/soal">' + I('arrow_back', 'sm') + 'Bank soal</a></div>' + U.pageHead(id ? 'Ubah soal' : 'Tambah soal', 'Pilih kunci jawaban dengan tombol radio di samping pilihan.') +
      '<div class="grid" style="grid-template-columns:minmax(0,3fr) minmax(0,2fr);align-items:start" id="sfg"><div class="col g16">' +
      '<div class="card col g16"><h4>Isi soal</h4><div class="grid gs4 keep2"><div class="field"><label>Mata pelajaran</label><select class="select" data-i="g_ff" data-k="id_mapel">' + U.opt(mapelBolehOpt(), f.id_mapel) + '</select></div><div class="field"><label>Topik</label><input class="input" list="tpk" data-i="g_ff" data-ev="input" data-k="topik" value="' + esc(f.topik) + '" placeholder="mis. Aljabar"><datalist id="tpk">' + topiks.map(t => '<option value="' + esc(t) + '">').join('') + '</datalist></div><div class="field"><label>Tingkat kesulitan</label><select class="select" data-i="g_ff" data-k="kesulitan">' + U.opt([['Mudah', 'Mudah'], ['Sedang', 'Sedang'], ['Sukar', 'Sukar']], f.kesulitan) + '</select></div><div class="field"><label>Poin</label><input type="number" class="input" min="1" max="100" step="1" data-i="g_ff" data-ev="input" data-k="poin" value="' + Math.round(Number(f.poin) || 1) + '"><span class="hint">Bilangan bulat 1–100.</span></div></div>' +
      '<div class="field"><label>Pertanyaan</label><textarea class="textarea" rows="5" data-i="g_ff" data-ev="input" data-k="pertanyaan" placeholder="Tulis pertanyaan…">' + esc(f.pertanyaan) + '</textarea><span class="hint">Awali baris dengan <code>$$ </code> untuk blok rumus, mis. <code>$$ f(x) = 2x³ − 5x + 1</code>. Gunakan **teks** untuk tebal. Simbol seperti √ ² ³ π ≤ dapat diketik langsung.</span></div>' +
      '<div class="field"><label>Gambar soal (opsional)</label><div id="gwrap">' + gambarBlok(f) + '</div></div></div>' +
      '<div class="card col g8"><h4>Pilihan jawaban</h4>' + opts + '</div><div class="card col g8"><h4>Pembahasan</h4><textarea class="textarea" rows="4" data-i="g_ff" data-ev="input" data-k="pembahasan" placeholder="Langkah penyelesaian…">' + esc(f.pembahasan) + '</textarea></div>' +
      '<div class="ss-bar"><a class="btn ghost" href="#/soal">Batal</a><div class="row g8"><button class="btn sec" data-a="g_ssave" data-st="Draft">' + I('save') + 'Simpan draf</button><button class="btn sec" data-a="g_ssave" data-st="Aktif" data-lanjut="1">' + I('skip_next') + 'Simpan & lanjut</button><button class="btn" data-a="g_ssave" data-st="Aktif">' + I('publish') + 'Simpan & aktifkan</button></div></div></div>' +
      '<div class="card" style="position:sticky;top:76px"><div class="up mb8">Pratinjau tampilan siswa</div><div id="spv"></div></div></div>';
    if (window.innerWidth < 960) $('#sfg').style.gridTemplateColumns = '1fr';
    const pv = () => { $('#spv').innerHTML = '<div class="q-meta">' + U.badge(f.topik || 'Topik', 'neu') + U.kes(f.kesulitan) + U.badge(String(f.poin || 1) + ' poin', 'info') + '</div><div class="q-txt" style="--qs:15px;line-height:24px">' + (U.teks(f.pertanyaan) || '<span class="muted">Pertanyaan…</span>') + '</div>' + (U.safeImg(f.gambar) ? '<img class="q-img" src="' + esc(U.safeImg(f.gambar)) + '" alt="">' : '') +
      ['a', 'b', 'c', 'd', 'e'].filter(k => String(f['opsi_' + k]).trim()).map((k, i) => '<div class="opt rv ' + (f.kunci === k.toUpperCase() ? 'right' : '') + '" style="--qs:14px;min-height:40px;padding:8px 12px"><span class="k">' + k.toUpperCase() + '</span><span class="grow">' + U.teks(f['opsi_' + k]) + '</span></div>').join('') + '<p class="xs muted mt8">Hijau = kunci jawaban (tidak tampil ke siswa).</p>'; };
    TKA._sf = { f: f, id: id, pv: pv }; pv(); bindGambar();
    return () => { TKA._sf = null; };
  }
  // ---- impor dari dokumen (PDF/DOC/DOCX) atau Google Docs: admin & guru (mapel yang diampu) ----
  // Kelas yang boleh dijadwalkan: guru hanya kelas yang diajarnya (jika sudah diatur); admin semua kelas.
  function kelasUntukUser() {
    const all = M().kelas, ka = String((S.boot && S.boot.profil && S.boot.profil.kelas_ajar) || '').split(',').filter(Boolean);
    return S.user.peran === 'admin' || !ka.length ? all : all.filter(k => ka.indexOf(k.id_kelas) > -1);
  }
  function mapelBolehOpt() {
    const ms = String((S.boot && S.boot.profil && S.boot.profil.mapel) || '').split(',').filter(Boolean);
    return M().mapel.filter(m => S.user.peran === 'admin' || !ms.length || ms.indexOf(m.id_mapel) > -1).map(m => [m.id_mapel, m.nama_mapel]);
  }
  function dokumenBlok() {
    return '<div class="card flat soft col g8 mt16"><h4>Impor dari dokumen</h4>' +
      '<p class="xs muted">Untuk PDF, DOC, DOCX, atau Google Docs. Format soal: nomor, pilihan A sampai E, lalu baris <code>Kunci: B</code>.</p>' +
      '<div class="field"><label>Mata pelajaran untuk semua soal dokumen</label><select class="select" id="dmp">' + U.opt(mapelBolehOpt(), '', 'Pilih mata pelajaran') + '</select></div>' +
      '<div class="field"><label>Atau tempel tautan Google Docs</label><div class="row g8"><input class="input grow" id="gdurl" placeholder="https://docs.google.com/document/d/…" autocomplete="off"><button class="btn sec" data-a="g_gdocs" type="button">' + I('cloud_download') + 'Baca</button></div><span class="hint">Dokumen harus dibagikan ke akun admin ini (minimal Pembaca). Dokumen asli tidak diubah.</span></div>' +
      '<div class="row sp wrap"><span class="xs muted">Belum punya contoh format? Unduh templat, isi soal Anda, lalu tempel isinya ke Google Docs.</span><button class="btn sec sm" data-a="g_tpl_doc" type="button">' + I('download', 'sm') + 'Unduh templat soal (.doc)</button></div>' +
      '<div id="gdprev"></div></div>';
  }
  function hasilImpor(h, j) {
    h.$('.mdl-b').innerHTML = '<div class="alert ' + (j.gagal.length ? 'warn' : 'ok') + '">' + I(j.gagal.length ? 'warning' : 'check_circle') + '<div><b>' + j.berhasil + ' soal berhasil diimpor</b> dari ' + j.terbaca + ' yang terbaca' + (j.gagal.length ? ', ' + j.gagal.length + ' perlu diperiksa.' : '. Soal masuk sebagai Draft.') + '</div></div>' +
      (j.gagal.length ? '<ul class="sm mt8" style="max-height:200px;overflow:auto">' + j.gagal.slice(0, 50).map(x => '<li>' + esc(x.baris) + ': ' + esc(x.pesan) + '</li>').join('') + '</ul>' : '');
    D.invalidate('soal'); D.fetch('soal').then(() => { if (TKA._sd) TKA.go('soal'); }).catch(() => {});
  }
  // Google Docs: baca dulu (pratinjau), lalu impor setelah diperiksa.
  act.g_gdocs = async el => {
    const h = TKA._imp; if (!h) return;
    const idm = (h.$('#dmp') || {}).value, url = ((h.$('#gdurl') || {}).value || '').trim();
    if (!idm) return U.toast('Pilih mata pelajaran terlebih dahulu.', 'warn');
    if (!url) return U.toast('Tempel tautan Google Docs terlebih dahulu.', 'warn');
    el.disabled = true; el.textContent = 'Membaca…';
    try {
      const j = await A.call('soal.pratinjau_gdocs', { id_mapel: idm, url: url }, { timeout: 120000, retry: 0 });
      gdocsPratinjau(h, j, idm, url);
    } catch (e) { U.err(e); }
    finally { el.disabled = false; el.textContent = 'Baca'; }
  };
  function gdocsPratinjau(h, j, idm, url) {
    const box = h.$('#gdprev'); if (!box) return;
    const siap = j.siapImpor, perbaiki = j.terbaca - siap;
    const kind = !j.terbaca ? 'err' : perbaiki ? 'warn' : 'ok';
    box.innerHTML = '<div class="card flat col g16 mt16"><div class="alert ' + kind + '">' + I(kind === 'ok' ? 'check_circle' : kind === 'warn' ? 'warning' : 'error') + '<div><b>' + j.terbaca + ' soal terbaca</b> · ' + siap + ' siap diimpor · ' + perbaiki + ' perlu diperbaiki</div></div>' +
      (j.soal.length
        ? '<div class="tw" style="max-height:280px;overflow:auto"><table><thead><tr><th>No</th><th>Pertanyaan</th><th>Pilihan</th><th>Kunci</th><th>Topik</th><th>Status</th></tr></thead><tbody>' +
          j.soal.map(x => '<tr><td>' + x.no + '</td><td class="sm" style="max-width:280px">' + esc(x.pertanyaan) + '</td><td class="sm">' + esc(x.pilihan || '—') + '</td><td><b>' + esc(x.kunci || '—') + '</b></td><td class="sm">' + esc(x.topik) + '</td><td>' + (x.galat ? U.badge('Perlu diperbaiki', 'bad') : U.badge('Siap', 'ok')) + (x.galat ? '<div class="xs muted" style="max-width:220px">' + esc(x.galat) + '</div>' : '') + '</td></tr>').join('') +
          '</tbody></table></div>'
        : U.empty('description', 'Tidak ada soal yang dikenali', 'Pastikan setiap soal diawali nomor (1. / 2.) dan memiliki pilihan A–E serta baris Kunci.')) +
      '<div class="row sp wrap"><span class="xs muted">Soal berstatus merah tidak ikut diimpor. Perbaiki di dokumen, lalu baca ulang.</span>' +
      (siap ? '<button class="btn" id="gdgo" type="button">' + I('publish') + 'Impor ' + siap + ' soal (Draft)</button>' : '') + '</div></div>';
    const go = h.$('#gdgo');
    if (go) go.onclick = async () => {
      go.disabled = true; go.textContent = 'Mengimpor…';
      try { const r = await A.call('soal.impor_gdocs', { id_mapel: idm, url: url }, { timeout: 120000, retry: 0 }); hasilImpor(h, r); }
      catch (e) { go.disabled = false; U.err(e); }
    };
  }
  // Templat contoh: dokumen Word (.doc) berisi format impor dan contoh soal.
  function templatSoalHtml() {
    const p = t => '<p style="margin:0 0 4pt 0">' + t + '</p>';
    const contoh = [
      ['1. Berapa hasil dari 2 + 3?', 'A. 4', 'B. 5', 'C. 6', 'D. 7', 'E. 8', 'Kunci: B', 'Pembahasan: 2 + 3 = 5.', 'Topik: Aritmetika', 'Kesulitan: Mudah'],
      ['2. Jika x + 2 = 7, maka nilai x adalah ...', 'A. 3', 'B. 4', 'C. 5', 'D. 6', 'E. 7', 'Kunci: C', 'Pembahasan: x = 7 − 2 = 5.', 'Topik: Aljabar', 'Kesulitan: Sedang'],
      ['3. Luas persegi dengan sisi 6 cm adalah ...', 'A. 12 cm²', 'B. 24 cm²', 'C. 36 cm²', 'D. 42 cm²', 'Kunci: C', 'Topik: Geometri', 'Kesulitan: Mudah']
    ];
    return '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8"><title>Templat soal</title><style>body{font-family:Calibri,Arial,sans-serif;font-size:11pt}</style></head><body>' +
      p('<b>TEMPLAT IMPOR SOAL — SIMULASI TKA</b>') +
      p('Cara pakai: ganti contoh di bawah dengan soal Anda. Setiap soal diawali nomor urut (1, 2, 3, …). Pilihan jawaban A sampai E. Baris <b>Kunci</b> wajib ada. Baris Pembahasan, Topik, dan Kesulitan boleh dihapus.') +
      p('Kesulitan diisi Mudah, Sedang, atau Sukar. Jika Kesulitan dikosongkan, dianggap Sedang.') + p('&nbsp;') +
      contoh.map(baris => baris.map(p).join('') + p('&nbsp;')).join('') +
      '</body></html>';
  }
  act.g_tpl_doc = () => U.download('templat-soal.doc', templatSoalHtml(), 'application/msword');

  // ---- gambar soal: unggah (dikecilkan di peramban, lalu dikirim ke Google Drive) ----
  function gambarBlok(f) {
    return f.gambar
      ? '<div class="row g16 wrap"><img src="' + esc(U.safeImg(f.gambar)) + '" alt="Gambar soal" style="max-width:200px;max-height:150px;border-radius:8px;border:1px solid var(--line)"><div class="col g8"><span class="sm muted">Gambar sudah terlampir</span><div class="row g8 wrap"><label class="btn sec sm" style="cursor:pointer">' + I('swap_horiz', 'sm') + 'Ganti<input type="file" id="gfile" accept="image/*" hidden></label><button class="btn dsec sm" id="gdel" type="button">' + I('delete', 'sm') + 'Hapus</button></div></div></div>'
      : '<label class="dz" id="gdz" style="display:block"><input type="file" id="gfile" accept="image/*" hidden>' + I('add_photo_alternate', 'lg') + '<div class="b mt8">Unggah gambar soal</div><div class="sm muted">JPG, PNG, WEBP, atau GIF · otomatis dikecilkan</div></label>';
  }
  function kecilkanGambar(file) {
    return new Promise((res, rej) => {
      const url = URL.createObjectURL(file), im = new Image();
      im.onload = () => {
        URL.revokeObjectURL(url);
        const sc = Math.min(1, 1200 / Math.max(im.naturalWidth, im.naturalHeight)), c = document.createElement('canvas');
        c.width = Math.max(1, Math.round(im.naturalWidth * sc)); c.height = Math.max(1, Math.round(im.naturalHeight * sc));
        const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); x.drawImage(im, 0, 0, c.width, c.height);
        res(c.toDataURL('image/jpeg', 0.85));
      };
      im.onerror = () => { URL.revokeObjectURL(url); rej(new Error('Berkas tidak dapat dibaca sebagai gambar.')); };
      im.src = url;
    });
  }
  async function unggahGambar(file) {
    if (!/^image\//.test(file.type)) throw new Error('Pilih berkas gambar (JPG, PNG, WEBP, atau GIF).');
    if (file.size > 12 * 1024 * 1024) throw new Error('Ukuran berkas terlalu besar. Maksimal 12 MB sebelum dikecilkan.');
    const data = (await kecilkanGambar(file)).split(',')[1];
    const j = await A.call('soal.upload', { mime: 'image/jpeg', nama: file.name.replace(/\.[^.]+$/, ''), data: data }, { timeout: 60000, retry: 0 });
    return j.url;
  }
  function bindGambar() {
    const wrap = $('#gwrap'); if (!wrap || !TKA._sf) return;
    const F = TKA._sf;
    const set = () => { wrap.innerHTML = gambarBlok(F.f); bindGambar(); F.pv(); };
    const upload = async file => {
      wrap.innerHTML = '<div class="row g8 sm">' + I('sync') + '<span>Mengunggah gambar…</span></div>';
      try { F.f.gambar = await unggahGambar(file); set(); U.toast('Gambar berhasil diunggah.', 'ok'); }
      catch (e) { set(); U.err(e); }
    };
    const fi = $('#gfile'); if (fi) fi.onchange = () => { if (fi.files[0]) upload(fi.files[0]); };
    const dz = $('#gdz');
    if (dz) {
      ['dragover', 'dragenter'].forEach(ev => dz.addEventListener(ev, e => { e.preventDefault(); dz.classList.add('on'); }));
      ['dragleave', 'drop'].forEach(ev => dz.addEventListener(ev, e => { e.preventDefault(); dz.classList.remove('on'); }));
      dz.addEventListener('drop', e => { const f0 = e.dataTransfer.files[0]; if (f0) upload(f0); });
    }
    const del = $('#gdel'); if (del) del.onclick = () => { F.f.gambar = ''; set(); };
  }
  inp.g_ff = el => { if (!TKA._sf) return; TKA._sf.f[el.dataset.k] = el.value; TKA._sf.pv(); };
  inp.g_fk = el => { if (!TKA._sf) return; TKA._sf.f.kunci = el.value; TKA._sf.pv(); };
  act.g_ssave = async el => {
    const F = TKA._sf; if (!F) return;
    const f = Object.assign({}, F.f, { status: el.dataset.st }); if (F.id) f.id_soal = F.id;
    el.disabled = true;
    try { await A.call('soal.save', f); D.invalidate('soal'); await D.fetch('soal'); U.toast('Soal tersimpan' + (el.dataset.st === 'Aktif' ? ' dan diaktifkan.' : ' sebagai draf.'), 'ok'); if (el.dataset.lanjut === '1' && !F.id) { TKA._carry = { id_mapel: F.f.id_mapel, topik: F.f.topik, kesulitan: F.f.kesulitan, poin: F.f.poin }; TKA.go('soal/baru'); } else TKA.go('soal'); }
    catch (e) { el.disabled = false; U.err(e); }
  };

  // ---- import soal ----
  const TPL = ['mapel', 'topik', 'kesulitan', 'pertanyaan', 'opsi_a', 'opsi_b', 'opsi_c', 'opsi_d', 'opsi_e', 'kunci', 'pembahasan', 'status'];
  act.g_simp = () => {
    const h = U.modal({ title: 'Import soal', sub: 'Tabel: CSV atau Excel (baris pertama = judul kolom). Dokumen: PDF, DOC, DOCX, atau Google Docs.', cls: 'wide', body:
      '<div class="col g16"><div class="alert info">' + I('info') + '<div>Kolom: <code>' + TPL.join(', ') + '</code>. Nama <b>mapel</b> harus sama dengan data master. <button class="btn sec sm" data-a="g_tpl" style="margin-left:8px">' + I('download', 'sm') + 'Unduh templat</button></div></div>' +
      '<label class="dz" id="dz"><input type="file" id="ifile" accept=".csv,.xlsx,.xls,.pdf,.doc,.docx,text/csv" hidden>' + I('upload_file', 'xl') + '<div class="b mt8">Pilih berkas atau seret ke sini</div><div class="sm">CSV UTF-8 / Excel</div></label><div id="iprev"></div>' + dokumenBlok() + '</div>', footer: '<button class="btn sec" data-a="m_close">Tutup</button><button class="btn off" id="igo" data-a="g_igo">Import</button>' });
    const fi = h.$('#ifile'), dz = h.$('#dz');
    const load = async f => {
      if (/\.(pdf|docx?)$/i.test(f.name)) {
        const data = await new Promise((res, rej) => { const fr = new FileReader(); fr.onload = () => res(String(fr.result).split(',')[1]); fr.onerror = () => rej(new Error('Gagal membaca berkas.')); fr.readAsDataURL(f); });
        const mime = /\.pdf$/i.test(f.name) ? 'application/pdf' : /\.docx$/i.test(f.name) ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' : 'application/msword';
        h.doc = { data: data, mime: mime, nama: f.name }; h.rows = null;
        h.$('#iprev').innerHTML = '<div class="alert info">' + I('description') + '<div><b>' + esc(f.name) + '</b> siap diimpor. Soal dikenali dari format: nomor soal, pilihan A sampai E, lalu baris <code>Kunci: B</code>. Semua soal masuk sebagai Draft.</div></div>';
        h.$('#igo').classList.remove('off');
        return;
      }
      try { const rows = await U.bacaTabel(f); h.rows = rows; h.doc = null; h.$('#iprev').innerHTML = rows.length ? '<p class="sm"><b>' + rows.length + '</b> baris terbaca. Pratinjau 3 baris pertama:</p><div class="tw"><table><thead><tr><th>Mapel</th><th>Topik</th><th>Pertanyaan</th><th>Kunci</th></tr></thead><tbody>' + rows.slice(0, 3).map(r => '<tr><td>' + esc(r.mapel) + '</td><td>' + esc(r.topik) + '</td><td>' + esc((r.pertanyaan || '').slice(0, 60)) + '</td><td>' + esc(r.kunci) + '</td></tr>').join('') + '</tbody></table></div>' : '<div class="alert err">Tidak ada baris terbaca.</div>'; h.$('#igo').classList.toggle('off', !rows.length); }
      catch (e) { U.err(e); }
    };
    fi.onchange = () => fi.files[0] && load(fi.files[0]);
    ['dragover', 'dragenter'].forEach(ev => dz.addEventListener(ev, e => { e.preventDefault(); dz.classList.add('on'); }));
    ['dragleave', 'drop'].forEach(ev => dz.addEventListener(ev, e => { e.preventDefault(); dz.classList.remove('on'); }));
    dz.addEventListener('drop', e => { if (e.dataTransfer.files[0]) load(e.dataTransfer.files[0]); });
    TKA._imp = h;
  };
  act.g_tpl = () => U.download('templat-soal.csv', U.csvBuild(TPL, [['Matematika', 'Aljabar', 'Sedang', 'Nilai x dari 2x + 3 = 9 adalah ...', '2', '3', '4', '5', '6', 'B', '2x = 6 sehingga x = 3.', 'Draft']]));
  // Impor soal dari PDF/DOC/DOCX: dibaca di server (Google Docs sementara), lalu dipecah menjadi soal Draft.
  async function impDokumen(h, el) {
    const idm = (h.$('#dmp') || {}).value;
    if (!idm) { el.disabled = false; return U.toast('Pilih mata pelajaran terlebih dahulu.', 'warn'); }
    el.textContent = 'Membaca dokumen…';
    try {
      const j = await A.call('soal.impor_dokumen', { id_mapel: idm, mime: h.doc.mime, nama: h.doc.nama, data: h.doc.data }, { timeout: 120000, retry: 0 });
      D.invalidate('soal'); D.fetch('soal').then(() => { if (TKA._sd) TKA.go('soal'); }).catch(() => {});
      hasilImpor(h, j);
      el.remove();
    } catch (e) { el.disabled = false; el.textContent = 'Impor'; U.err(e); }
  }
  act.g_igo = async el => {
    const h = TKA._imp; if (!h || (!h.rows && !h.doc)) return; el.disabled = true;
    if (h.doc) return impDokumen(h, el);
    let ok = 0; const gagal = [];
    for (let i = 0; i < h.rows.length; i += 50) {
      el.textContent = 'Mengimpor ' + Math.min(i + 50, h.rows.length) + '/' + h.rows.length + '…';
      try { const j = await A.call('soal.import', { rows: h.rows.slice(i, i + 50), offset: i }); ok += j.berhasil; j.gagal.forEach(g => gagal.push(g)); } catch (e) { gagal.push({ baris: i + 1, pesan: e.message }); break; }
    }
    D.invalidate('soal'); D.fetch('soal').then(() => { if (TKA._sd) TKA.go('soal'); });
    h.$('.mdl-b').innerHTML = '<div class="alert ' + (gagal.length ? 'warn' : 'ok') + '">' + I(gagal.length ? 'warning' : 'check_circle') + '<div><b>' + ok + ' soal berhasil diimpor</b>' + (gagal.length ? ', ' + gagal.length + ' baris gagal.' : '. Soal masuk sebagai Draft kecuali kolom status berisi Aktif.') + '</div></div>' + (gagal.length ? '<ul class="sm mt8" style="max-height:200px;overflow:auto">' + gagal.slice(0, 50).map(g => '<li>Baris ' + g.baris + ': ' + esc(g.pesan) + '</li>').join('') + '</ul>' : '');
    el.remove();
  };

  // ============================================================ PAKET UJIAN
  // ---- pengaturan ujian per paket (dibaca & ditulis dari formulir paket) ----
  function pengHtml(p) {
    p = p || {};
    const cb = (id, on, lbl, tip) => '<label class="row g12" style="align-items:flex-start;cursor:pointer"><span class="sw" style="margin-top:2px"><input type="checkbox" id="' + id + '"' + (on ? ' checked' : '') + '><i></i></span><span><b class="sm">' + lbl + '</b><br><span class="xs muted">' + tip + '</span></span></label>';
    return '<div class="card col g16 mb16"><h4>Pengaturan ujian</h4><p class="xs muted" style="margin-top:-8px">Berlaku untuk paket ini. Admin atau pemilik paket yang dapat mengubahnya.</p>' +
      '<div class="grid g2" style="gap:14px 24px">' +
      cb('pnb', p.navigasi_bebas !== false, 'Navigasi bebas', 'Siswa boleh kembali ke soal sebelumnya. Jika dimatikan, hanya maju.') +
      cb('pts', p.tampil_skor !== false, 'Tampilkan skor ke siswa', 'Jika dimatikan, siswa hanya melihat pesan bahwa nilai akan diumumkan.') +
      cb('ptp', !!p.tampil_pembahasan, 'Tampilkan pembahasan', 'Siswa dapat membaca kunci dan pembahasan setelah mengumpulkan.') +
      cb('psf', !!p.safe_exam, 'Mode ujian aman', 'Pindah tab atau keluar layar penuh dicatat sebagai pelanggaran.') +
      cb('pwt', !!p.wajib_token, 'Wajib token sesi', 'Siswa harus mengisi token dari pengawas setiap kali memulai ujian terjadwal.') +
      '<label class="col g4 sm"><b>Batas pelanggaran</b><input class="input" type="number" min="1" max="10" id="pbt" value="' + esc(p.batas_pelanggaran || 3) + '" style="width:120px"><span class="xs muted">Sesi dikunci setelah jumlah ini (1–10).</span></label>' +
      '</div></div>';
  }
  function pengBaca() {
    return { navigasi_bebas: $('#pnb').checked, tampil_skor: $('#pts').checked, tampil_pembahasan: $('#ptp').checked, safe_exam: $('#psf').checked, wajib_token: $('#pwt').checked, batas_pelanggaran: Number($('#pbt').value) };
  }

  TKA.route(ST, 'paket-ujian', function (c) {
    c.live();
    const draw = list => {
      c.root.innerHTML = U.pageHead('Paket ujian', 'Kumpulan soal dengan durasi dan KKM.', '<a class="btn" href="#/paket-ujian/baru">' + I('add') + 'Buat paket</a>') + tabs('paket') +
        (list.length ? '<div class="grid g3">' + list.map(p => '<div class="card hover col g8"><div class="row sp">' + U.badge(p.jenis, p.jenis === 'Resmi' ? 'info' : 'neu') + U.badge(p.status, p.status === 'Terpublikasi' ? 'ok' : 'neu') + '</div><h4>' + esc(p.nama) + '</h4><div class="sm muted">' + esc(p.mapel) + ' · ' + p.jumlah_soal + ' soal · ' + p.durasi + ' mnt · KKM ' + p.kkm + '</div><div class="xs muted">' + esc(p.kode) + ' · oleh ' + esc(p.penulis) + '</div><div class="row g8 mt8"><a class="btn sec sm grow" href="#/paket-ujian/' + p.id_paket + '">' + I('edit', 'sm') + 'Ubah</a><a class="btn sec sm" href="#/paket-ujian/baru?dup=' + p.id_paket + '" title="Duplikat">' + I('content_copy', 'sm') + '</a><button class="btn dsec sm" data-a="g_pdel" data-id="' + p.id_paket + '" title="Hapus">' + I('delete', 'sm') + '</button></div></div>').join('') + '</div>'
          : '<div class="card">' + U.empty('inventory_2', 'Belum ada paket', 'Buat paket dari soal aktif di bank soal.', '<a class="btn mt16" href="#/paket-ujian/baru">Buat paket</a>') + '</div>');
    };
    c.root.innerHTML = U.skel(3, 120);
    D.swr('paket', draw).catch(e => U.err(e));
  });
  act.g_pdel = async el => {
    const id = el.dataset.id;
    const pv = await A.call('paket.delete', { id_paket: id, pratinjau: true });
    const isi = pv.jadwal + pv.sesi + pv.hasil;
    if (!isi) {
      if (!(await U.confirm('Hapus paket ini?', { danger: true, ok: 'Hapus' }))) return;
      await A.call('paket.delete', { id_paket: id });
      D.invalidate('paket'); D.invalidate('jadwal'); await D.fetch('paket'); D.fetch('jadwal').catch(() => {}); U.toast('Paket dihapus.', 'ok'); TKA.go('paket-ujian');
      return;
    }
    if (!isAdmin()) return U.toast('Paket sudah dipakai (' + pv.jadwal + ' jadwal, ' + pv.hasil + ' hasil). Hubungi admin untuk menghapusnya.', 'warn', 6000);
    konfirmHapusData({
      judul: 'Hapus paket permanen', nama: pv.nama, kode: pv.kode, kind: 'paket', idRingkas: id, berkas: 'hasil-' + pv.kode + '.csv',
      rincian: [pv.jadwal + ' jadwal ujian', pv.sesi + ' sesi pengerjaan (termasuk latihan)', pv.hasil + ' hasil & nilai siswa'],
      peringatan: pv.jadwal ? 'Paket ini masih terjadwal. Jadwal dan peserta yang sedang mengerjakan akan dihentikan.' : '',
      sukses: 'Paket dan seluruh hasilnya telah dihapus.',
      jalankan: async () => { await A.call('paket.delete', { id_paket: id, paksa: true }); D.invalidate('paket'); D.invalidate('jadwal'); D.invalidate('soal'); await D.fetch('paket'); D.fetch('jadwal').catch(() => {}); TKA.refreshBoot().catch(() => {}); TKA.go('paket-ujian'); }
    });
  };
  TKA.route(ST, 'paket-ujian/baru', c => paketForm(c, null, c.q.get('dup')));
  TKA.route(ST, 'paket-ujian/:id', c => paketForm(c, c.params.id));
  async function paketForm(c, id, dup) {
    c.root.innerHTML = '<div class="card">' + U.skel(3, 80) + '</div>';
    const P = { nama: '', id_mapel: 'CAMPUR', durasi: 90, kkm: Number(S.setting.kkm_default || 76), jenis: 'Latihan', status: 'Draft', acak_soal: true, acak_opsi: false, deskripsi: '', daftar_soal: [] };
    try {
      if (id || dup) { const j = await A.call('paket.get', { id_paket: id || dup }, { read: true }); Object.assign(P, j.paket); if (dup) { P.nama = P.nama + ' (salinan)'; P.status = 'Draft'; delete P.id_paket; } }
      await D.swr('soal', () => {}, 60000);
    } catch (e) { c.root.innerHTML = '<div class="card">' + U.empty('error', 'Gagal memuat', e.message, '<a class="btn mt16" href="#/paket-ujian">Kembali</a>') + '</div>'; return; }
    const all = (D.peek('soal') || []), by = {}; all.forEach(s => { by[s.id_soal] = s; });
    const sel = P.daftar_soal.filter(i => by[i]), PF = { q: '', mapel: '', kes: '', lim: 60 };
    const topN = () => Array.from(new Set(all.map(s => s.topik)));
    c.root.innerHTML = '<div class="row mb16"><a class="btn ghost sm" href="#/paket-ujian">' + I('arrow_back', 'sm') + 'Paket ujian</a></div>' + U.pageHead(id ? 'Ubah paket' : 'Buat paket', 'Pilih soal aktif dan atur urutannya.') +
      '<div class="card col g16 mb16"><div class="grid g3"><div class="field" style="grid-column:span 2"><label>Nama paket</label><input class="input" id="pnm" value="' + esc(P.nama) + '" placeholder="mis. Simulasi TKA Matematika 01"></div><div class="field"><label>Mata pelajaran</label><select class="select" id="pmp">' + U.opt([['CAMPUR', 'Campuran']].concat(mapelOpt()), P.id_mapel) + '</select></div></div>' +
      '<div class="grid gs4"><div class="field"><label>Jenis</label><select class="select" id="pjn">' + U.opt([['Latihan', 'Latihan mandiri'], ['Resmi', 'Ujian resmi (dijadwalkan)']], P.jenis) + '</select></div><div class="field"><label>Durasi (menit)</label><input class="input" type="number" id="pdr" min="5" max="300" value="' + P.durasi + '"></div><div class="field"><label>KKM (0–100)</label><input class="input" type="number" id="pkk" min="0" max="100" value="' + P.kkm + '"></div><div class="field"><label>Status</label><select class="select" id="pst">' + U.opt([['Draft', 'Draft'], ['Terpublikasi', 'Terpublikasi']], P.status) + '</select></div></div>' +
      '<div class="field"><label>Deskripsi singkat (opsional)</label><input class="input" id="pds" value="' + esc(P.deskripsi) + '" maxlength="300"></div><div class="row g24 wrap sm"><label class="row g8"><span class="sw"><input type="checkbox" id="pas"' + (P.acak_soal ? ' checked' : '') + '><i></i></span>Acak urutan soal</label><label class="row g8"><span class="sw"><input type="checkbox" id="pao"' + (P.acak_opsi ? ' checked' : '') + '><i></i></span>Acak urutan pilihan</label></div></div>' +
      pengHtml(P.pengaturan) + '<div class="grid g2" style="align-items:start" id="pbg"><div class="card pad0"><div class="card-h"><h4>Pilih soal</h4><span class="sm muted" id="pcnt"></span></div><div class="filters"><div class="grow"><input class="input" placeholder="Cari…" data-i="g_pf" data-k="q" data-ev="input"></div><select class="select" data-i="g_pf" data-k="mapel">' + U.opt(mapelOpt(), '', 'Semua mapel') + '</select><select class="select" data-i="g_pf" data-k="kes">' + U.opt([['Mudah', 'Mudah'], ['Sedang', 'Sedang'], ['Sukar', 'Sukar']], '', 'Semua tingkat') + '</select></div><div class="sel-list" id="ppick" style="border:0;border-radius:0"></div></div>' +
      '<div class="card pad0"><div class="card-h"><h4>Soal terpilih</h4><span class="badge info" id="psel"></span><span class="sm muted" id="ptot"></span></div><div style="padding:12px;max-height:520px;overflow-y:auto"><ol class="ord" id="pord"></ol></div></div></div>' +
      '<div class="row sp wrap mt16"><a class="btn ghost" href="#/paket-ujian">Batal</a><button class="btn" data-a="g_psave">' + I('save') + 'Simpan paket</button></div>';
    if (window.innerWidth < 900) $('#pbg').style.gridTemplateColumns = '1fr';
    const drawPick = () => {
      const f = all.filter(s => (!PF.q || (s.ringkas + ' ' + s.topik).toLowerCase().indexOf(PF.q.toLowerCase()) > -1) && (!PF.mapel || s.id_mapel === PF.mapel) && (!PF.kes || s.kesulitan === PF.kes));
      $('#ppick').innerHTML = f.slice(0, PF.lim).map(s => '<label><input type="checkbox" class="chk" data-a="g_ppick" data-id="' + s.id_soal + '"' + (sel.indexOf(s.id_soal) > -1 ? ' checked' : '') + (s.status !== 'Aktif' && sel.indexOf(s.id_soal) < 0 ? ' disabled' : '') + '><div class="grow"><div class="sm">' + esc(s.ringkas) + '</div><div class="xs muted">' + esc(mapelNm(s.id_mapel)) + ' · ' + esc(s.topik) + ' ' + U.kes(s.kesulitan) + (s.status !== 'Aktif' ? ' ' + U.badge('Draft', 'neu') : '') + '</div></div></label>').join('') + (f.length > PF.lim ? '<div class="tc" style="padding:10px"><button class="btn sec sm" data-a="g_pmore">Tampilkan lebih banyak (' + (f.length - PF.lim) + ')</button></div>' : '') || '<div class="empty sm">Tidak ada soal.</div>';
      $('#pcnt').textContent = f.length + ' soal';
    };
    const poinM = Object.assign({}, P.poin || {});
    const poinOf = i => (poinM[i] !== undefined && poinM[i] !== '' ? Number(poinM[i]) : (by[i] ? Number(by[i].poin || 1) : 1));
    const totPoin = () => Math.round(sel.reduce((a, i) => a + poinOf(i), 0) * 100) / 100;
    const drawSel = () => {
      $('#psel').textContent = sel.length + ' soal';
      $('#ptot').textContent = 'Total poin: ' + totPoin();
      $('#pord').innerHTML = sel.map((i, n) => '<li><span class="n">' + (n + 1) + '</span><div class="grow sm">' + esc((by[i] || { ringkas: '(soal hilang)' }).ringkas) + (by[i] ? '<div class="xs muted">' + esc(by[i].topik) + '</div>' : '') + '</div>' +
        '<input type="number" class="input" style="width:76px;height:34px" min="1" max="100" step="1" value="' + Math.round(poinOf(i)) + '" data-i="g_pp" data-id="' + i + '" aria-label="Poin soal ' + (n + 1) + '">' +
        '<button class="ibtn" data-a="g_pup" data-n="' + n + '"' + (n === 0 ? ' disabled' : '') + '>' + I('arrow_upward', 'sm') + '</button><button class="ibtn" data-a="g_pdn" data-n="' + n + '"' + (n === sel.length - 1 ? ' disabled' : '') + '>' + I('arrow_downward', 'sm') + '</button><button class="ibtn dng" data-a="g_prm" data-id="' + i + '">' + I('close', 'sm') + '</button></li>').join('') || '<li class="muted sm" style="border:0;justify-content:center">Belum ada soal dipilih</li>';
    };
    TKA._pf = { sel: sel, PF: PF, drawPick: drawPick, drawSel: drawSel, id: id, poin: poinM, poinOf: poinOf, totPoin: totPoin };
    drawPick(); drawSel();
    return () => { TKA._pf = null; };
  }
  inp.g_pf = U.debounce(el => { if (!TKA._pf) return; TKA._pf.PF[el.dataset.k] = el.value; TKA._pf.PF.lim = 60; TKA._pf.drawPick(); }, 150);
  act.g_pmore = () => { TKA._pf.PF.lim += 60; TKA._pf.drawPick(); };
  act.g_ppick = el => {
    const F = TKA._pf, i = el.dataset.id, k = F.sel.indexOf(i);
    if (el.checked && k < 0) { F.sel.push(i); if (F.poin[i] === undefined) { const so = (D.peek('soal') || []).filter(x => x.id_soal === i)[0]; F.poin[i] = so ? so.poin : 1; } }
    else if (!el.checked && k > -1) F.sel.splice(k, 1);
    F.drawSel();
  };
  inp.g_pp = el => { if (!TKA._pf) return; TKA._pf.poin[el.dataset.id] = el.value; const t = $('#ptot'); if (t) t.textContent = 'Total poin: ' + TKA._pf.totPoin(); };
  act.g_prm = el => { const F = TKA._pf, k = F.sel.indexOf(el.dataset.id); if (k > -1) F.sel.splice(k, 1); F.drawSel(); F.drawPick(); };
  const mv = (n, d) => { const F = TKA._pf, a = F.sel; const t = a[n]; a[n] = a[n + d]; a[n + d] = t; F.drawSel(); };
  act.g_pup = el => mv(Number(el.dataset.n), -1); act.g_pdn = el => mv(Number(el.dataset.n), 1);
  act.g_psave = async el => {
    const F = TKA._pf; if (!F) return;
    const body = { nama: $('#pnm').value, id_mapel: $('#pmp').value, jenis: $('#pjn').value, durasi: Number($('#pdr').value), kkm: Number($('#pkk').value), status: $('#pst').value, deskripsi: $('#pds').value, acak_soal: $('#pas').checked, acak_opsi: $('#pao').checked, daftar_soal: F.sel };
    body.poin = F.poin; body.pengaturan = pengBaca();
    if (F.id) body.id_paket = F.id;
    el.disabled = true;
    try { await A.call('paket.save', body); D.invalidate('paket'); await D.fetch('paket'); U.toast('Paket tersimpan.', 'ok'); TKA.go('paket-ujian'); } catch (e) { el.disabled = false; U.err(e); }
  };

  // ============================================================ JADWAL UJIAN
  let jView = 'daftar', jMonth = new Date();
  TKA.route(ST, 'jadwal', function (c) {
    c.live();
    let list = [];
    const stt = j => { const n = A.now(); return n < j.mulai ? ['Terjadwal', 'info'] : n <= j.selesai ? ['Berlangsung', 'ok'] : ['Selesai', 'neu']; };
    const draw = () => {
      let body;
      if (jView === 'kalender') {
        const y = jMonth.getFullYear(), m = jMonth.getMonth(), first = new Date(y, m, 1).getDay(), days = new Date(y, m + 1, 0).getDate(); let cells = '';
        ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'].forEach(h => { cells += '<div class="h">' + h + '</div>'; });
        for (let i = 0; i < first; i++) cells += '<div></div>';
        for (let d = 1; d <= days; d++) { const ev = list.filter(j => U.sama(j.mulai, new Date(y, m, d))); cells += '<div><b class="xs">' + d + '</b>' + ev.map(j => '<span class="ev" data-a="g_jedit" data-id="' + j.id_jadwal + '" title="' + esc(j.paket) + '">' + U.jam(j.mulai) + ' ' + esc(j.paket) + '</span>').join('') + '</div>'; }
        body = '<div class="card"><div class="row sp mb16"><button class="ibtn" data-a="g_jm" data-d="-1">' + I('chevron_left') + '</button><h4>' + ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'][m] + ' ' + y + '</h4><button class="ibtn" data-a="g_jm" data-d="1">' + I('chevron_right') + '</button></div><div class="calwrap">' + cells + '</div></div>';
      } else body = '<div class="card pad0">' + (list.length ? '<div class="tw"><table><thead><tr><th>Kode</th><th>Paket</th><th class="hm">Kelas</th><th>Waktu</th><th>Token</th><th>Status</th><th></th></tr></thead><tbody>' + list.map(j => { const s = stt(j); return '<tr><td class="mono sm">' + esc(j.kode) + '</td><td><b>' + esc(j.paket) + '</b><div class="xs muted">' + esc(j.mapel) + ' · ' + j.jumlah_soal + ' soal · ' + j.durasi + ' mnt · pengawas ' + esc(j.pengawas_nama) + '</div></td><td class="sm hm">' + esc(j.kelas_nama.join(', ')) + '<div class="xs muted">' + j.peserta + ' siswa</div></td><td class="sm">' + U.tglJam(j.mulai) + '<div class="xs muted">s.d. ' + U.tglJam(j.selesai) + '</div></td><td><span class="mono b" style="letter-spacing:.12em">' + esc(j.token) + '</span> <button class="ibtn" data-a="copy" data-v="' + esc(j.token) + '" title="Salin token">' + I('content_copy', 'sm') + '</button></td><td>' + U.badge(s[0], s[1]) + '</td><td class="tr"><span class="acts">' + (s[0] === 'Berlangsung' ? '<a class="ibtn" href="#/monitoring?j=' + j.id_jadwal + '" title="Pantau">' + I('monitor_heart') + '</a>' : '') + '<button class="ibtn" data-a="g_jedit" data-id="' + j.id_jadwal + '" title="Ubah">' + I('edit') + '</button><button class="ibtn dng" data-a="g_jdel" data-id="' + j.id_jadwal + '" title="Hapus">' + I('delete') + '</button></span></td></tr>'; }).join('') + '</tbody></table></div>' : U.empty('event', 'Belum ada jadwal', 'Jadwalkan paket resmi untuk kelas tertentu.', '<button class="btn mt16" data-a="g_jnew">Buat jadwal</button>')) + '</div>';
      c.root.innerHTML = U.pageHead('Jadwal ujian', 'Atur kapan dan untuk kelas mana ujian dibuka.', '<div class="seg" style="width:200px"><button class="' + (jView === 'daftar' ? 'on' : '') + '" data-a="g_jv" data-v="daftar">Daftar</button><button class="' + (jView === 'kalender' ? 'on' : '') + '" data-a="g_jv" data-v="kalender">Kalender</button></div><button class="btn" data-a="g_jnew">' + I('add') + 'Buat jadwal</button>') + body;
    };
    c.root.innerHTML = U.skel(3, 70);
    TKA._jd = draw; TKA._jl = () => list;
    Promise.all([D.swr('jadwal', v => { list = v; draw(); }), D.swr('paket', () => {})]).then(() => { if (c.q.get('baru')) { history.replaceState(null, '', '#/jadwal'); jForm(null); } }).catch(U.err);
    const t = setInterval(() => { if (!document.hidden && TKA._jd) draw(); }, 30000);
    return () => { clearInterval(t); TKA._jd = null; };
  });
  act.g_jv = el => { jView = el.dataset.v; if (TKA._jd) TKA._jd(); };
  act.g_jm = el => { jMonth = new Date(jMonth.getFullYear(), jMonth.getMonth() + Number(el.dataset.d), 1); if (TKA._jd) TKA._jd(); };
  act.g_jnew = () => jForm(null);
  act.g_jedit = el => jForm((TKA._jl() || []).filter(j => j.id_jadwal === el.dataset.id)[0]);
  act.g_jdel = async el => {
    const id = el.dataset.id;
    const pv = await A.call('jadwal.delete', { id_jadwal: id, pratinjau: true });
    if (!pv.peserta) {
      if (!(await U.confirm('Hapus jadwal ini?', { danger: true, ok: 'Hapus' }))) return;
      await A.call('jadwal.delete', { id_jadwal: id });
      D.invalidate('jadwal'); await D.fetch('jadwal'); U.toast('Jadwal dihapus.', 'ok'); if (TKA._jd) TKA.go('jadwal');
      return;
    }
    if (!isAdmin()) return U.toast('Jadwal sudah punya ' + pv.peserta + ' peserta. Hubungi admin untuk menghapusnya.', 'warn', 6000);
    konfirmHapusData({
      judul: 'Hapus jadwal permanen', nama: 'Jadwal ' + pv.kode, kode: pv.kode, kind: 'jadwal', idRingkas: { paket: pv.id_paket, jadwal: id }, berkas: 'hasil-' + pv.kode + '.csv',
      rincian: [pv.peserta + ' peserta (sesi pengerjaan)', pv.hasil + ' hasil & nilai siswa'],
      peringatan: pv.mengerjakan ? pv.mengerjakan + ' siswa sedang mengerjakan sekarang. Pekerjaan mereka akan terputus dan tidak dinilai.' : '',
      sukses: 'Jadwal dan seluruh hasilnya telah dihapus.',
      jalankan: async () => { await A.call('jadwal.delete', { id_jadwal: id, paksa: true }); D.invalidate('jadwal'); await D.fetch('jadwal'); TKA.refreshBoot().catch(() => {}); if (TKA._jd) TKA.go('jadwal'); }
    });
  };
  function tokenBaru() { const a = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; let s = ''; for (let i = 0; i < 6; i++) s += a[Math.floor(Math.random() * a.length)]; return s; }
  function jForm(j) {
    const paket = (D.peek('paket') || []).filter(p => p.status === 'Terpublikasi' && p.jenis === 'Resmi'), kl = kelasUntukUser(), now = Date.now();
    if (!paket.length && !j) return U.modal({ title: 'Belum ada paket resmi', body: '<p>Buat paket berjenis <b>Ujian resmi</b> dan publikasikan terlebih dahulu.</p>', footer: '<a class="btn" href="#/paket-ujian/baru" data-a="m_close">Buat paket</a>' });
    const start = j ? j.mulai : Math.ceil((now + 1800e3) / 900e3) * 900e3;
    const h = U.modal({ title: j ? 'Ubah jadwal' : 'Buat jadwal ujian', cls: 'wide', body: '<div class="col g16"><div class="field"><label>Paket ujian</label><select class="select" id="jpk">' + U.opt(paket.map(p => [p.id_paket, p.nama + ' (' + p.jumlah_soal + ' soal, ' + p.durasi + ' mnt)']), j ? j.id_paket : '', 'Pilih paket') + '</select></div>' +
      '<div class="field"><label>Kelas peserta</label><div class="chips" style="flex-wrap:wrap" id="jkl">' + kl.map(k => '<label class="chip' + (j && j.kelas.indexOf(k.id_kelas) > -1 ? ' on' : '') + '"><input type="checkbox" hidden value="' + k.id_kelas + '"' + (j && j.kelas.indexOf(k.id_kelas) > -1 ? ' checked' : '') + '>' + esc(k.nama_kelas) + '</label>').join('') + '</div></div>' +
      '<div class="grid g2"><div class="field"><label>Mulai dibuka</label><input type="datetime-local" class="input" id="jmu" value="' + U.toInput(start) + '"></div><div class="field"><label>Ditutup</label><input type="datetime-local" class="input" id="jse" value="' + U.toInput(j ? j.selesai : start + 3 * 3600e3) + '"></div></div>' +
      '<div class="grid g2"><div class="field"><label>Token sesi (4–8 karakter)</label><div class="row g8"><input class="input mono b" id="jtk" maxlength="8" value="' + esc(j ? j.token : tokenBaru()) + '" style="text-transform:uppercase"><button class="btn sec" data-a="g_jtk" type="button">' + I('refresh') + '</button></div><span class="hint">Bagikan ke siswa di ruang ujian.</span></div>' + (isAdmin() ? '<div class="field"><label>Pengawas</label><select class="select" id="jpg">' + U.opt((D.peek('users') || []).filter(u => u.peran !== 'siswa').map(u => [u.id, u.nama]), j ? j.pengawas : S.user.id) + '</select></div>' : '') + '</div>' +
      '<div class="alert info">' + I('info') + '<span>Siswa mengerjakan selama durasi paket, tetapi tidak melewati waktu ditutup.</span></div></div>', footer: '<button class="btn sec" data-a="m_close">Batal</button><button class="btn" data-a="g_jsave">' + I('save') + 'Simpan</button>' });
    h.el.querySelectorAll('#jkl input').forEach(i => i.addEventListener('change', () => i.parentElement.classList.toggle('on', i.checked)));
    h.jid = j ? j.id_jadwal : null; TKA._jh = h;
    if (isAdmin() && !(D.peek('users') || []).length) D.fetch('users').then(() => { const s = h.$('#jpg'); if (s) s.innerHTML = U.opt((D.peek('users') || []).filter(u => u.peran !== 'siswa').map(u => [u.id, u.nama]), j ? j.pengawas : S.user.id); });
  }
  act.g_jtk = () => { $('#jtk').value = tokenBaru(); };
  act.g_jsave = async el => {
    const h = TKA._jh; if (!h) return;
    const body = { id_paket: $('#jpk').value, kelas: U.$$('#jkl input:checked').map(i => i.value), mulai: U.fromInput($('#jmu').value), selesai: U.fromInput($('#jse').value), token: $('#jtk').value };
    if ($('#jpg')) body.pengawas = $('#jpg').value; if (h.jid) body.id_jadwal = h.jid;
    el.disabled = true;
    try { const r = await A.call('jadwal.save', body); h.close(); D.invalidate('jadwal'); await D.fetch('jadwal'); U.toast('Jadwal tersimpan. Token: ' + (r.token || body.token), 'ok', 5000); if (TKA._jd) TKA._jd(); } catch (e) { el.disabled = false; U.err(e); }
  };

  // ============================================================ MONITORING LIVE
  const MF = { q: '', st: '', kelas: '' };
  TKA.route(ST, 'monitoring', function (c) {
    c.live();
    let sel = c.q.get('j') || '', data = null, timer = null, stop = false, err = 0;
    const statusOf = s => { if (s.status === 'Berjalan') return A.now() - s.aktif > 90000 ? 'Tidak aktif' : 'Mengerjakan'; return s.status; };
    const BD = { 'Mengerjakan': 'ok', 'Tidak aktif': 'warn', 'Terkunci': 'bad', 'Selesai': 'info', 'Belum mulai': 'neu' };
    function drawBody() {
      if (!data || !data.jadwal) return;
      const now = A.now(), all = data.siswa.map(s => Object.assign({}, s, { st: statusOf(s) }));
      const cnt = k => all.filter(s => s.st === k).length, rows = all.filter(s => (!MF.q || (s.nama + s.username).toLowerCase().indexOf(MF.q.toLowerCase()) > -1) && (!MF.st || s.st === MF.st) && (!MF.kelas || s.kelas === MF.kelas));
      const kls = {}; all.forEach(s => { kls[s.kelas] = kls[s.kelas] || { n: 0, sel: 0 }; kls[s.kelas].n++; if (s.st === 'Selesai') kls[s.kelas].sel++; });
      $('#mtiles').innerHTML = U.stat('edit_note', cnt('Mengerjakan') + cnt('Tidak aktif'), 'Sedang mengerjakan', 'ok') + U.stat('task_alt', cnt('Selesai'), 'Sudah mengumpulkan') + U.stat('hourglass_empty', cnt('Belum mulai'), 'Belum mulai') + U.stat('lock', cnt('Terkunci'), 'Sesi terkunci', cnt('Terkunci') ? 'bad' : '');
      $('#mkls').innerHTML = Object.keys(kls).map(k => '<div class="br bars-row" style="display:grid;grid-template-columns:110px 1fr 44px;gap:10px;align-items:center;margin:6px 0;font-size:13px"><span class="sm">' + esc(k) + '</span>' + U.bar(kls[k].n ? 100 * kls[k].sel / kls[k].n : 0, 'ok') + '<b class="sm tr">' + kls[k].sel + '/' + kls[k].n + '</b></div>').join('');
      $('#mrows').innerHTML = rows.length ? rows.sort((a, b) => ({ 'Terkunci': 0, 'Tidak aktif': 1, 'Mengerjakan': 2, 'Belum mulai': 3, 'Selesai': 4 }[a.st] - { 'Terkunci': 0, 'Tidak aktif': 1, 'Mengerjakan': 2, 'Belum mulai': 3, 'Selesai': 4 }[b.st]) || a.nama.localeCompare(b.nama)).map(s => '<tr><td style="white-space:nowrap"><b>' + esc(s.nama) + '</b><div class="xs muted mono">' + esc(s.username) + '</div></td><td class="sm hm" style="white-space:nowrap">' + esc(s.kelas) + '</td><td style="white-space:nowrap">' + U.badge(s.st, BD[s.st]) + (s.pl ? ' <span class="badge bad" title="Pelanggaran">' + s.pl + ' ⚠</span>' : '') + '</td><td style="min-width:130px"><div class="xs muted">' + s.terjawab + '/' + s.total + '</div>' + U.bar(s.total ? 100 * s.terjawab / s.total : 0, 'amber') + '</td><td class="sm mono hm" style="white-space:nowrap">' + (s.st === 'Mengerjakan' || s.st === 'Tidak aktif' ? U.hms(s.berakhir - now) : s.st === 'Selesai' && s.skor != null ? 'Skor ' + s.skor : '—') + '</td><td class="sm muted hm" style="white-space:nowrap">' + (s.aktif ? U.rel(s.aktif, now) : '—') + '</td><td class="tr" style="white-space:nowrap">' +
        (s.st === 'Terkunci' ? '<button class="btn sm" data-a="g_mun" data-id="' + s.id_sesi + '">' + I('lock_open', 'sm') + 'Buka kunci</button> <button class="btn sec sm" data-a="g_mot" data-id="' + s.id_sesi + '" title="Buat kode untuk siswa">' + I('pin', 'sm') + 'Kode</button>' : '') + (s.st === 'Mengerjakan' || s.st === 'Tidak aktif' || s.st === 'Terkunci' ? ' <button class="ibtn dng" data-a="g_mpk" data-id="' + s.id_sesi + '" data-n="' + esc(s.nama) + '" title="Kumpulkan paksa">' + I('stop_circle') + '</button>' : '') + '</td></tr>').join('') : '<tr><td colspan="7">' + U.empty('search_off', 'Tidak ada siswa yang cocok') + '</td></tr>';
      TKA._mdata = all;
    }
    function drawShell() {
      const j = data.jadwal;
      c.root.innerHTML = U.pageHead('Monitoring ujian live', j ? j.paket + ' · ' + j.kelas_nama.join(', ') : '', j ? (isAdmin() ? U.badge('Akses admin', 'info') : '') + '<span class="badge ok"><span class="dot pulse"></span> Diperbarui ' + data.poll + ' dtk</span><button class="btn sec" data-a="g_mexp">' + I('download') + 'Unduh kehadiran</button>' : '') +
        (data.daftar.length ? '<div class="chips mb16">' + data.daftar.map(d => '<button class="chip' + (j && d.id_jadwal === j.id_jadwal ? ' on' : '') + '" data-a="g_msel" data-id="' + d.id_jadwal + '">' + esc(d.kode) + ' · ' + esc(d.paket) + '</button>').join('') + '</div>' : '') +
        (j ? '<div class="card flat soft row sp wrap mb16"><div class="row g16 wrap"><div><div class="up">Token sesi</div><div class="mono bb" style="font-size:22px;letter-spacing:.15em">' + esc(j.token) + '</div></div><div><div class="up">Waktu</div><div class="sm b">' + U.tglJam(j.mulai) + ' – ' + U.jam(j.selesai) + '</div></div></div><button class="btn sec sm" data-a="copy" data-v="' + esc(j.token) + '">' + I('content_copy', 'sm') + 'Salin token</button></div>' +
          '<div class="grid gs4 keep2 mb16 statrow" id="mtiles"></div><div class="card mb16"><h4 class="mb8">Penyelesaian per kelas</h4><div class="grid" style="grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:4px 32px" id="mkls"></div></div><div class="card pad0"><div class="filters"><div class="grow"><input class="input" placeholder="Cari nama atau NISN…" data-i="g_mf" data-k="q" data-ev="input" value="' + esc(MF.q) + '"></div><select class="select" data-i="g_mf" data-k="st">' + U.opt(['Mengerjakan', 'Tidak aktif', 'Terkunci', 'Selesai', 'Belum mulai'].map(x => [x, x]), MF.st, 'Semua status') + '</select><select class="select" data-i="g_mf" data-k="kelas">' + U.opt(j.kelas_nama.map(x => [x, x]), MF.kelas, 'Semua kelas') + '</select></div><div class="tw"><table><thead><tr><th>Siswa</th><th class="hm">Kelas</th><th>Status</th><th>Progres</th><th class="hm">Sisa waktu</th><th class="hm">Aktif</th><th></th></tr></thead><tbody id="mrows"></tbody></table></div></div>' +
          '' : '<div class="card">' + U.empty('event_busy', 'Tidak ada ujian aktif', 'Jadwal yang sedang berlangsung atau baru selesai akan muncul di sini.') + '</div>');
    }
    async function poll(first) {
      if (stop) return;
      try {
        const j = await A.call('mon.live', { id_jadwal: sel }, { retry: 0, timeout: 20000 }); err = 0;
        const rebuild = first || !data || !data.jadwal || (j.jadwal && data.jadwal.id_jadwal !== j.jadwal.id_jadwal) || data.daftar.length !== j.daftar.length;
        data = j; sel = j.jadwal ? j.jadwal.id_jadwal : '';
        if (rebuild) drawShell(); drawBody();
      } catch (e) { err++; if (first) c.root.innerHTML = '<div class="card">' + U.empty('error', 'Gagal memuat monitoring', e.message, '<button class="btn mt16" data-a="reload">Coba lagi</button>') + '</div>'; }
      if (!stop) timer = setTimeout(() => poll(false), (document.hidden ? 30 : Math.min(60, (data && data.poll) || 10) * (1 + err)) * 1000);
    }
    c.root.innerHTML = U.skel(4, 90);
    TKA._mon = { reload: id => { sel = id; MF.kelas = ''; data = null; c.root.innerHTML = U.skel(4, 90); clearTimeout(timer); poll(true); }, body: drawBody, now: () => poll(false) };
    poll(true);
    return () => { stop = true; clearTimeout(timer); TKA._mon = null; };
  });
  inp.g_mf = el => { MF[el.dataset.k] = el.value; if (TKA._mon) TKA._mon.body(); };
  act.g_msel = el => { if (TKA._mon) TKA._mon.reload(el.dataset.id); };
  act.g_mun = async el => { if (!(await U.confirm('Buka kunci sesi siswa ini? Waktu selama terkunci dikembalikan.', { ok: 'Buka kunci' }))) return; await A.call('mon.unlock', { id_sesi: el.dataset.id }); U.toast('Kunci dibuka.', 'ok'); if (TKA._mon) TKA._mon.now(); };
  act.g_mot = async el => {
    const j = await A.call('mon.otp', { id_sesi: el.dataset.id });
    U.modal({ title: 'Kode buka kunci', body: '<div class="tc"><p class="muted">Beritahukan kode ini kepada siswa. Berlaku <b>2 menit</b> dan sekali pakai.</p><div class="bigcode mt16">' + esc(j.kode) + '</div></div>', footer: '<button class="btn" data-a="m_close">Selesai</button>' });
  };
  act.g_mpk = async el => { if (!(await U.confirm('Kumpulkan paksa jawaban <b>' + esc(el.dataset.n) + '</b>? Jawaban tersimpan terakhir akan dinilai.', { danger: true, ok: 'Kumpulkan paksa' }))) return; await A.call('mon.paksa', { id_sesi: el.dataset.id }); U.toast('Sesi dikumpulkan.', 'ok'); if (TKA._mon) TKA._mon.now(); };
  act.g_mexp = () => { const d = TKA._mdata || []; U.download('kehadiran-ujian.csv', U.csvBuild(['Nama', 'NISN', 'Kelas', 'Status', 'Terjawab', 'Total', 'Pelanggaran', 'Skor'], d.map(s => [s.nama, s.username, s.kelas, s.st, s.terjawab, s.total, s.pl, s.skor == null ? '' : s.skor]))); };

  // ============================================================ LAPORAN & ANALISIS
  let LS = { paket: '', kelas: '', q: '', sort: 'skor' };
  TKA.route(ST, 'laporan', function (c) {
    let rep = null;
    const draw = () => {
      const pk = D.peek('paket') || [];
      let body = '';
      if (rep) {
        const r = rep, mx = Math.max.apply(null, r.dist.concat([1]));
        const rows = r.rows.filter(x => !LS.q || (x.nama + x.username).toLowerCase().indexOf(LS.q.toLowerCase()) > -1).sort((a, b) => LS.sort === 'nama' ? a.nama.localeCompare(b.nama) : b.skor - a.skor);
        body = '<div class="grid gs4 keep2 mb16">' + U.stat('groups', r.n, 'Peserta') + U.stat('analytics', r.rata, 'Rata-rata · median ' + r.median, 'warn') + U.stat('emoji_events', r.max, 'Tertinggi · terendah ' + r.min, 'ok') + U.stat('verified', r.lulus_pct + '%', 'Lulus KKM ' + r.paket.kkm, r.lulus_pct >= 70 ? 'ok' : 'bad') + '</div>' +
          '<div class="grid g2 mb16" style="align-items:start"><div class="card"><h4>Distribusi skor</h4><div class="vbars">' + r.dist.map((v, i) => '<div><span>' + (v || '') + '</span><i class="' + (i * 10 >= r.paket.kkm ? 'hi' : '') + '" style="height:' + Math.round(100 * v / mx) + '%"></i><span>' + i * 10 + '</span></div>').join('') + '</div><p class="xs muted mt8">Batang amber = rentang di atas KKM.</p></div>' +
          '<div class="card"><h4 class="mb8">Penguasaan per topik</h4><div class="bars">' + (r.per_topik.map(t => '<div class="br"><span class="sm">' + esc(t.topik) + '</span>' + U.bar(t.pct) + '<b class="sm tr">' + t.pct + '%</b></div>').join('') || '<p class="sm muted">Belum ada data.</p>') + '</div></div></div>' +
          (r.per_kelas.length > 1 ? '<div class="card pad0 mb16"><div class="card-h"><h4>Perbandingan kelas</h4></div><div class="tw"><table><thead><tr><th>Kelas</th><th>Peserta</th><th>Rata-rata</th><th>Lulus KKM</th></tr></thead><tbody>' + r.per_kelas.map(k => '<tr><td><b>' + esc(k.kelas) + '</b></td><td>' + k.n + '</td><td>' + k.rata + '</td><td>' + U.bar(k.lulus_pct) + '<span class="xs muted">' + k.lulus_pct + '%</span></td></tr>').join('') + '</tbody></table></div></div>' : '') +
          '<div class="card pad0 mb16"><div class="card-h"><div><h4>Analisis butir soal</h4><p class="xs muted">% benar rendah dan daya beda ≤ 0,2 = soal perlu ditinjau.</p></div></div><div class="tw"><table><thead><tr><th>No</th><th>Soal</th><th>Topik</th><th>% benar</th><th>Daya beda</th><th>Pengecoh dominan</th></tr></thead><tbody>' + r.soal.slice().sort((a, b) => a.pct - b.pct).map(s => '<tr><td>' + s.no + '</td><td class="sm" style="max-width:340px">' + esc(s.ringkas) + '</td><td class="sm">' + esc(s.topik) + '</td><td style="min-width:120px">' + U.bar(s.pct) + '<span class="xs muted">' + s.pct + '%</span></td><td>' + (s.daya_beda <= 0.2 ? '<span class="badge warn">' + s.daya_beda + '</span>' : '<span class="sm">' + s.daya_beda + '</span>') + '</td><td class="sm">' + (s.modus_salah ? s.modus_salah + ' <span class="muted">(kunci ' + s.kunci + ')</span>' : '—') + '</td></tr>').join('') + '</tbody></table></div></div>' +
          '<div class="card pad0"><div class="card-h"><h4>Hasil siswa</h4><div class="row g8 noprint"><input class="input" style="width:200px" placeholder="Cari…" data-i="g_lq" data-ev="input" value="' + esc(LS.q) + '"><select class="select" style="width:140px" data-i="g_lsort"><option value="skor"' + (LS.sort === 'skor' ? ' selected' : '') + '>Skor tertinggi</option><option value="nama"' + (LS.sort === 'nama' ? ' selected' : '') + '>Nama A–Z</option></select></div></div><div class="tw"><table><thead><tr><th>#</th><th>Nama</th><th>Kelas</th><th>Skor</th><th>B / S / K</th><th>Durasi</th><th>Status</th></tr></thead><tbody>' + (rows.map((x, i) => '<tr><td class="muted">' + (i + 1) + '</td><td><b>' + esc(x.nama) + '</b><div class="xs muted mono">' + esc(x.username) + '</div></td><td class="sm">' + esc(x.kelas) + '</td><td><b style="color:var(--primary-c)">' + x.skor + '</b></td><td class="sm">' + x.benar + ' / ' + x.salah + ' / ' + x.kosong + '</td><td class="sm">' + x.durasi + ' mnt</td><td>' + U.badge(x.lulus ? 'Lulus' : 'Belum', x.lulus ? 'ok' : 'bad') + '</td></tr>').join('') || '<tr><td colspan="7">' + U.empty('inbox', 'Belum ada hasil') + '</td></tr>') + '</tbody></table></div></div>';
      }
      c.root.innerHTML = U.pageHead('Laporan & analisis', 'Statistik hasil, analisis butir, dan perbandingan kelas.', rep ? '<button class="btn sec noprint" data-a="g_lcsv">' + I('download') + 'Unduh Excel (CSV)</button><button class="btn sec noprint" onclick="window.print()">' + I('print') + 'Cetak / PDF</button>' : '') +
        '<div class="card flat mb16 noprint"><div class="row g16 wrap"><div class="field grow" style="min-width:240px"><label>Paket ujian</label><select class="select" data-i="g_lp">' + U.opt(pk.map(p => [p.id_paket, p.nama + ' (' + p.mapel + ')']), LS.paket, 'Pilih paket…') + '</select></div><div class="field" style="min-width:180px"><label>Kelas</label><select class="select" data-i="g_lk">' + U.opt(M().kelas.map(k => [k.id_kelas, k.nama_kelas]), LS.kelas, 'Semua kelas') + '</select></div></div></div>' +
        (rep ? body : '<div class="card">' + U.empty('analytics', 'Pilih paket ujian', 'Statistik akan tampil setelah paket dipilih.') + '</div>');
    };
    TKA._ld = draw;
    TKA._lload = async () => { if (!LS.paket) { rep = null; draw(); return; } c.root.style.opacity = .6; try { const j = await A.call('lap.get', { id_paket: LS.paket, id_kelas: LS.kelas }, { read: true }); rep = j; TKA._lrep = j; } catch (e) { U.err(e); } c.root.style.opacity = 1; draw(); };
    D.swr('paket', draw).then(() => { if (LS.paket) TKA._lload(); }).catch(U.err); draw();
    return () => { TKA._ld = null; };
  });
  inp.g_lp = el => { LS.paket = el.value; TKA._lload(); };
  inp.g_lk = el => { LS.kelas = el.value; TKA._lload(); };
  inp.g_lq = U.debounce(el => { LS.q = el.value; if (TKA._ld) { TKA._ld(); const e = $('[data-i=g_lq]'); if (e) { e.focus(); e.setSelectionRange(LS.q.length, LS.q.length); } } }, 200);
  inp.g_lsort = el => { LS.sort = el.value; if (TKA._ld) TKA._ld(); };
  act.g_lcsv = () => { const r = TKA._lrep; if (!r) return; U.download('laporan-' + r.paket.nama.replace(/\W+/g, '-') + '.csv', U.csvBuild(['Peringkat', 'Nama', 'NISN', 'Kelas', 'Skor', 'Benar', 'Salah', 'Kosong', 'Durasi (mnt)', 'Status KKM'], r.rows.map((x, i) => [i + 1, x.nama, x.username, x.kelas, x.skor, x.benar, x.salah, x.kosong, x.durasi, x.lulus ? 'Lulus' : 'Belum']))); };
})();
