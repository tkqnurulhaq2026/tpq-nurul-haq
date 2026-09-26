import { requireAuth } from './auth-gate.js';
import { db } from './firebase-config.js';
import { collection, query, orderBy, onSnapshot } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

requireAuth().then(({ user, role }) => {

document.querySelector('main').classList.add('ready');

const daftarBulan = document.getElementById('daftar-bulan');
const isiLaporan = document.getElementById('isi-laporan');

let currentKey = null;
let currentData = [];

const q = query(collection(db, 'transaksi'), orderBy('createdAt', 'desc'));
onSnapshot(q, (snapshot) => {
    const transaksi = snapshot.docs.map(d => d.data());

    // Group by month
    const bulanMap = {};
    transaksi.forEach(t => {
        const [dd, mm, yyyy] = t.tanggal.split('-');
        const key = `${mm}-${yyyy}`;
        if (!bulanMap[key]) bulanMap[key] = [];
        bulanMap[key].push(t);
    });

    const bulanKeys = Object.keys(bulanMap).sort((a, b) => b.localeCompare(a));

    if (bulanKeys.length === 0) {
        daftarBulan.innerHTML = '<p class="kosong">Belum ada data.</p>';
        isiLaporan.innerHTML = '<p>Belum ada data untuk ditampilkan.</p>';
        currentKey = null;
        return;
    }

    // Default to current month if it has data, otherwise newest available
    if (!currentKey || !bulanMap[currentKey]) {
        const now = new Date();
        const currentMonthKey = `${String(now.getMonth() + 1).padStart(2, '0')}-${now.getFullYear()}`;
        currentKey = bulanMap[currentMonthKey] ? currentMonthKey : bulanKeys[0];
    }

        daftarBulan.innerHTML = `
        <select id="pilih-bulan">
            ${bulanKeys.map(key => {
                const [mm, yyyy] = key.split('-');
                const namaBulan = new Date(yyyy, mm - 1).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
                const selected = key === currentKey ? ' selected' : '';
                return `<option value="${key}"${selected}>${namaBulan}</option>`;
            }).join('')}
        </select>
    `;

    document.getElementById('pilih-bulan').addEventListener('change', function() {
        currentKey = this.value;
        renderBulan(bulanMap[currentKey], currentKey);
    });

    renderBulan(bulanMap[currentKey], currentKey);

function renderBulan(data, key) {
    currentData = data;
    const [mm, yyyy] = key.split('-');
    const bulanNama = new Date(yyyy, mm - 1).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });

    const totalMasuk = data.filter(t => t.jenis === 'pemasukan').reduce((s, t) => s + t.jumlah, 0);
    const totalKeluar = data.filter(t => t.jenis === 'pengeluaran').reduce((s, t) => s + t.jumlah, 0);
    const saldo = totalMasuk - totalKeluar;

    // Per-kategori
    const katMap = {};
    data.forEach(t => {
        const key = t.jenis + '|' + (t.kategori || '-');
        if (!katMap[key]) katMap[key] = { jenis: t.jenis, kategori: t.kategori || '-', total: 0 };
        katMap[key].total += t.jumlah;
    });

    const items = Object.values(katMap);
    const masukRows = items.filter(k => k.jenis === 'pemasukan').map(k =>
        `<tr><td>${k.kategori}</td><td class="pemasukan">${k.total.toLocaleString('id-ID')}</td></tr>`
    ).join('') || '<tr><td colspan="2">-</td></tr>';

    const keluarRows = items.filter(k => k.jenis === 'pengeluaran').map(k =>
        `<tr><td>${k.kategori}</td><td class="pengeluaran">${k.total.toLocaleString('id-ID')}</td></tr>`
    ).join('') || '<tr><td colspan="2">-</td></tr>';

    // Detail rows
    const detailRows = data.map(t => `
        <tr>
            <td class="tanggal">${t.tanggal}</td>
            <td>${t.jenis === 'pemasukan' ? 'Pemasukan' : 'Pengeluaran'}</td>
            <td>${t.kategori || '-'}</td>
            <td>${t.keterangan || '-'}</td>
            <td class="${t.jenis}">${t.jumlah.toLocaleString('id-ID')}</td>
        </tr>
    `).join('');

    isiLaporan.innerHTML = `
        <p class="laporan-bulan">Bulan ${bulanNama}</p>

        <div class="ringkasan-grid">
            <div class="label">Pemasukan</div>
            <div class="label">Pengeluaran</div>
            <div class="label">Saldo</div>
            <div class="value pemasukan">Rp ${totalMasuk.toLocaleString('id-ID')}</div>
            <div class="value pengeluaran">Rp ${totalKeluar.toLocaleString('id-ID')}</div>
            <div class="value ${saldo >= 0 ? 'pemasukan' : 'pengeluaran'}">Rp ${saldo.toLocaleString('id-ID')}</div>
        </div>

        <h3>Rincian per Kategori</h3>
        <div class="laporan-kat-dua">
            <div>
                <h4 class="pemasukan">Pemasukan</h4>
                <table class="laporan-kat">
                    <thead><tr><th>Kategori</th><th>Jumlah (Rp)</th></tr></thead>
                    <tbody>${masukRows}</tbody>
                </table>
            </div>
            <div>
                <h4 class="pengeluaran">Pengeluaran</h4>
                <table class="laporan-kat">
                    <thead><tr><th>Kategori</th><th>Jumlah (Rp)</th></tr></thead>
                    <tbody>${keluarRows}</tbody>
                </table>
            </div>
        </div>

        <h3>Detail Transaksi</h3>
        <table class="laporan-detail">
            <thead>
                <tr><th>Tanggal</th><th>Jenis</th><th>Kategori</th><th>Keterangan</th><th>Jumlah (Rp)</th></tr>
            </thead>
            <tbody>${detailRows || '<tr><td colspan="5">Belum ada data</td></tr>'}</tbody>
        </table>
    `;
}

document.getElementById('btn-print').addEventListener('click', () => window.print());

document.getElementById('btn-export').addEventListener('click', function() {
    const header = 'Tanggal,Kategori,Jenis,Keterangan,Jumlah\n';
    const rows = currentData.map(t =>
        `"${t.tanggal}","${t.kategori || ''}","${t.jenis}","${t.keterangan || ''}",${t.jenis === 'pengeluaran' ? '-' : ''}${t.jumlah}`
    ).join('\n');

    const csv = '\uFEFF' + header + rows;
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `pembukuan-${currentKey || 'export'}.csv`;
    link.click();
});
