import { requireAuth } from './auth-gate.js';
import { showConfirm } from './ui.js';
import { db } from './firebase-config.js';
import {
    collection, doc, addDoc, updateDoc, deleteDoc, onSnapshot,
    arrayUnion, query, orderBy
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

requireAuth({ requireRole: 'admin' }).then(({ user, role }) => {
    document.querySelector('main').classList.add('ready');

const jenisSelect = document.getElementById('jenis');
const kategoriSelect = document.getElementById('kategori');

let kategoriList = { pemasukan: [], pengeluaran: [] };
let transaksi = [];

// ===== Kategori: live sync from Firestore =====
onSnapshot(doc(db, 'kategori', 'pemasukan'), (snap) => {
    kategoriList.pemasukan = snap.exists() ? snap.data().list : [];
    updateKategori();
});
onSnapshot(doc(db, 'kategori', 'pengeluaran'), (snap) => {
    kategoriList.pengeluaran = snap.exists() ? snap.data().list : [];
    updateKategori();
});

function updateKategori() {
    const jenis = jenisSelect.value;
    const list = kategoriList[jenis] || [];
    kategoriSelect.innerHTML = list.map(k => `<option value="${k}">${k}</option>`).join('') +
        '<option value="__tambah__">+ Tambah Kategori</option>';
}

jenisSelect.addEventListener('change', updateKategori);

kategoriSelect.addEventListener('change', async function() {
    if (this.value === '__tambah__') {
        const jenis = jenisSelect.value;
        const nama = prompt('Nama kategori baru:');
        if (nama && nama.trim()) {
            const namaTrim = nama.trim();
            if (kategoriList[jenis].includes(namaTrim)) {
                alert('Kategori sudah ada.');
            } else {
                await updateDoc(doc(db, 'kategori', jenis), {
                    list: arrayUnion(namaTrim)
                });
            }
        }
        updateKategori();
    }
});

// ===== Jumlah input formatting =====
document.getElementById('jumlah').addEventListener('input', function() {
    const raw = this.value.replace(/\D/g, '');
    this.value = raw ? parseInt(raw).toLocaleString('id-ID') : '';
});

// ===== Form submit =====
document.getElementById('form-transaksi').addEventListener('submit', async function(e) {
    e.preventDefault();

    const jenis = jenisSelect.value;
    const kategori = kategoriSelect.value;
    const keterangan = document.getElementById('keterangan').value.trim();
    const jumlah = parseFloat(document.getElementById('jumlah').value.replace(/\./g, ''));

    if (kategori === '__tambah__') {
        alert('Pilih kategori terlebih dahulu.');
        return;
    }
    if (isNaN(jumlah) || jumlah <= 0) {
        alert('Isi jumlah yang valid.');
        return;
    }

    const tanggalInput = document.getElementById('tanggal').value;
    const [yyyy, mm, dd] = tanggalInput.split('-');

    await addDoc(collection(db, 'transaksi'), {
        jenis, kategori, keterangan, jumlah,
        tanggal: `${dd}-${mm}-${yyyy}`,
        createdBy: user.uid,
        createdAt: Date.now()
    });

    document.getElementById('keterangan').value = '';
    document.getElementById('jumlah').value = '';
});

// ===== Live transaksi list =====
const q = query(collection(db, 'transaksi'), orderBy('createdAt', 'desc'));
onSnapshot(q, (snapshot) => {
    transaksi = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    render();
});

// ===== Render summary + list =====
function render() {
    const totalMasuk = transaksi.filter(t => t.jenis === 'pemasukan').reduce((sum, t) => sum + t.jumlah, 0);
    const totalKeluar = transaksi.filter(t => t.jenis === 'pengeluaran').reduce((sum, t) => sum + t.jumlah, 0);
    const saldo = totalMasuk - totalKeluar;

    document.getElementById('ringkasan').innerHTML = `
        <div class="label">Pemasukan</div>
        <div class="label">Pengeluaran</div>
        <div class="label">Saldo</div>
        <div class="value pemasukan">Rp ${totalMasuk.toLocaleString('id-ID')}</div>
        <div class="value pengeluaran">Rp ${totalKeluar.toLocaleString('id-ID')}</div>
        <div class="value ${saldo >= 0 ? 'pemasukan' : 'pengeluaran'}">Rp ${saldo.toLocaleString('id-ID')}</div>
    `;

    const body = document.getElementById('body-transaksi');
    body.innerHTML = transaksi.map((t) => `
        <tr>
            <td class="tanggal">${t.tanggal}</td>
            <td class="kategori">${t.kategori || '-'}</td>
            <td class="ket">${t.keterangan || '-'}</td>
            <td class="${t.jenis} jumlah">${t.jumlah.toLocaleString('id-ID')}</td>
            <td><button class="btn-hapus-row" data-id="${t.id}">✕</button></td>
        </tr>
    `).join('');

    // Per-kategori breakdown
    const detail = document.getElementById('ringkasan-kategori');
    const katMap = {};
    transaksi.forEach(t => {
        const key = t.jenis + '|' + (t.kategori || '-');
        if (!katMap[key]) katMap[key] = { jenis: t.jenis, kategori: t.kategori || '-', total: 0 };
        katMap[key].total += t.jumlah;
    });

    const items = Object.values(katMap);
    const masukRows = items.filter(k => k.jenis === 'pemasukan').map(k =>
        `<div class="kat-row"><span>${k.kategori}</span><span class="pemasukan">Rp ${k.total.toLocaleString('id-ID')}</span></div>`
    ).join('') || '<div class="kat-row"><span class="kosong">Belum ada</span></div>';

    const keluarRows = items.filter(k => k.jenis === 'pengeluaran').map(k =>
        `<div class="kat-row"><span>${k.kategori}</span><span class="pengeluaran">Rp ${k.total.toLocaleString('id-ID')}</span></div>`
    ).join('') || '<div class="kat-row"><span class="kosong">Belum ada</span></div>';

    detail.innerHTML = `
        <div class="kat-dua">
            <div class="kat-kolom">
                <div class="kat-judul pemasukan">Pemasukan</div>
                ${masukRows}
            </div>
            <div class="kat-kolom">
                <div class="kat-judul pengeluaran">Pengeluaran</div>
                ${keluarRows}
            </div>
        </div>
    `;

    // Delete row handler
    body.querySelectorAll('.btn-hapus-row').forEach(btn => {
        btn.addEventListener('click', async function() {
            const id = this.getAttribute('data-id');
            const item = transaksi.find(t => t.id === id);
            const label = item.keterangan ? `"${item.keterangan}"` : `transaksi ini`;
            const ok = await showConfirm(`Hapus ${label}?`);
            if (ok) {
                await deleteDoc(doc(db, 'transaksi', id));
            }
        });
    });
}

// ===== Toggle detail =====
document.getElementById('btn-detail').addEventListener('click', function() {
    const detail = document.getElementById('ringkasan-kategori');
    if (detail.style.display === 'none') {
        detail.style.display = 'block';
        this.textContent = 'Sembunyikan';
    } else {
        detail.style.display = 'none';
        this.textContent = 'Tampilkan lebih banyak';
    }
});

// ===== Hapus semua data =====
document.getElementById('btn-hapus').addEventListener('click', async function() {
    const ok = await showConfirm('Yakin hapus semua data? Tindakan ini tidak bisa dibatalkan.');
    if (ok) {
        for (const t of transaksi) {
            await deleteDoc(doc(db, 'transaksi', t.id));
        }
    }
});

// ===== Init =====
const bulan = new Date().toLocaleDateString('id-ID', { month: 'long' });
document.querySelector('h1').textContent = `Pembukuan Bulan ${bulan}`;

const d = new Date();
document.getElementById('tanggal').value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

}); // closes requireAuth().then(...)
