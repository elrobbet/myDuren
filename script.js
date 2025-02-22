// Konfigurasi dan State
const harga = {
    reguler: 35000,
    reseller: 30000,
    paket3Box: 100000,
};

let state = {
    stok: 100,
    transactions: [],
    totals: {
        belumLunas: 0,
        lunas: 0,
        cash: 0,
        transfer: 0,
    },
};

// Inisialisasi Aplikasi
function initApp() {
    loadState();
    setupEventListeners();
    setupTableHandlers();
    updateUI();
}

// Event Listeners
function setupEventListeners() {
    document
        .getElementById('hitungButton')
        .addEventListener('click', handleHitung);
    document
        .getElementById('resetButton')
        .addEventListener('click', handleReset);

    // Mobile touch support
    document
        .getElementById('hitungButton')
        .addEventListener('touchend', function (e) {
            e.preventDefault();
            handleHitung();
        });
}

// Handlers untuk Tabel (Event Delegation)
function setupTableHandlers() {
    const tabel = document.getElementById('tabelPenjualan');

    // Untuk klik mouse
    tabel.addEventListener('click', function (e) {
        handleTableInteraction(e);
    });

    // Untuk touch devices
    tabel.addEventListener('touchend', function (e) {
        e.preventDefault();
        handleTableInteraction(e);
    });
}

function handleTableInteraction(e) {
    const cell = e.target.closest('[data-action]');
    if (!cell) return;

    const index = parseInt(cell.dataset.index);
    const action = cell.dataset.action;

    if (action === 'toggle-status') {
        toggleStatus(index);
    } else if (action === 'toggle-metode') {
        toggleMetode(index);
    }
}

// Logika Toggle
function toggleStatus(index) {
    const trx = state.transactions[index];

    // Update totals
    if (trx.status === 'lunas') {
        state.totals.lunas -= trx.total;
        state.totals[trx.metode] -= trx.total;
    } else {
        state.totals.belumLunas -= trx.total;
    }

    // Toggle status
    trx.status = trx.status === 'lunas' ? 'belum lunas' : 'lunas';

    // Update metode jika status berubah ke lunas
    if (trx.status === 'lunas') {
        trx.metode = trx.originalMetode;
        state.totals.lunas += trx.total;
        state.totals[trx.metode] += trx.total;
    } else {
        trx.metode = 'belum lunas';
        state.totals.belumLunas += trx.total;
    }

    saveState();
    updateUI();
}

function toggleMetode(index) {
    const trx = state.transactions[index];
    if (trx.status !== 'lunas') return;

    // Update totals
    state.totals[trx.metode] -= trx.total;
    trx.metode = trx.metode === 'cash' ? 'transfer' : 'cash';
    state.totals[trx.metode] += trx.total;
    trx.originalMetode = trx.metode;

    saveState();
    updateUI();
}

// Fungsi Utama
function handleHitung() {
    const nama = document.getElementById('namaPembeli').value.trim();
    const jumlah = parseInt(document.getElementById('jumlahTerjual').value);
    const stokAwal = parseInt(document.getElementById('stokAwal').value);
    const jenis = document.getElementById('jenisPembeli').value;
    const status = document.getElementById('statusPembayaran').value;
    const metode = document.getElementById('metodePembayaran').value;

    // Validasi
    if (!nama || isNaN(jumlah) || jumlah < 1) {
        alert('Nama dan jumlah harus diisi!');
        return;
    }

    if (jumlah > stokAwal) {
        alert('Stok tidak mencukupi!');
        return;
    }

    // Hitung total
    let total = 0;
    if (jenis === 'reguler') {
        const promo3Box = Math.floor(jumlah / 3);
        const sisaBox = jumlah % 3;
        total = promo3Box * harga.paket3Box + sisaBox * harga.reguler;
    } else {
        total = jumlah * harga.reseller;
    }

    // Update state
    state.stok = stokAwal - jumlah;
    state.transactions.push({
        nama: nama,
        jumlah: jumlah,
        total: total,
        status: status,
        metode: status === 'belum lunas' ? 'belum lunas' : metode,
        originalMetode: metode,
    });

    // Update totals
    if (status === 'lunas') {
        state.totals.lunas += total;
        state.totals[metode] += total;
    } else {
        state.totals.belumLunas += total;
    }

    saveState();
    updateUI();
    resetForm();
}

// Sistem Penyimpanan
function saveState() {
    localStorage.setItem('myDurenState', JSON.stringify(state));
}

function loadState() {
    const saved = localStorage.getItem('myDurenState');
    if (saved) {
        state = JSON.parse(saved);
    }
}

// Update UI
function updateUI() {
    // Update stok
    document.getElementById('stokAwal').value = state.stok;

    // Update tabel
    const tbody = document.getElementById('tabelPenjualan');
    tbody.innerHTML = state.transactions
        .map(
            (trx, index) => `
        <tr>
            <td class="border px-4 py-2">${trx.nama}</td>
            <td class="border px-4 py-2">${trx.jumlah}</td>
            <td class="border px-4 py-2">Rp ${trx.total.toLocaleString()}</td>
            <td 
                class="border px-4 py-2 cursor-pointer hover:bg-gray-100"
                data-action="toggle-status" 
                data-index="${index}"
            >
                ${trx.status}
            </td>
            <td 
                class="border px-4 py-2 ${
                    trx.status === 'lunas'
                        ? 'cursor-pointer hover:bg-gray-100'
                        : 'cursor-not-allowed'
                }"
                data-action="${trx.status === 'lunas' ? 'toggle-metode' : ''}" 
                data-index="${index}"
            >
                ${trx.metode}
            </td>
        </tr>
    `,
        )
        .join('');

    // Update totals
    document.getElementById('totalBelumLunas').textContent =
        state.totals.belumLunas.toLocaleString();
    document.getElementById('totalLunas').textContent =
        state.totals.lunas.toLocaleString();
    document.getElementById('totalCash').textContent =
        state.totals.cash.toLocaleString();
    document.getElementById('totalTransfer').textContent =
        state.totals.transfer.toLocaleString();
}

// Reset Form
function resetForm() {
    document.getElementById('namaPembeli').value = '';
    document.getElementById('jumlahTerjual').value = '';
}

// Reset Data
function resetData() {
    if (confirm('Yakin reset semua data?')) {
        localStorage.removeItem('myDurenState');
        state = {
            stok: 100,
            transactions: [],
            totals: {
                belumLunas: 0,
                lunas: 0,
                cash: 0,
                transfer: 0,
            },
        };
        updateUI();
    }
}

// Inisialisasi
document.addEventListener('DOMContentLoaded', initApp);
