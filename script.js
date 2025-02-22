// Konfigurasi dan State
var harga = {
    reguler: 35000,
    reseller: 30000,
    paket3Box: 100000,
};

var state = {
    stok: 100,
    transactions: [],
    totals: {
        belumLunas: 0,
        lunas: 0,
        cash: 0,
        transfer: 0,
    },
};

// Fungsi Utama
function initApp() {
    loadState();
    setupEventListeners();
    updateUI();
}

function setupEventListeners() {
    // Tombol Hitung
    var hitungBtn = document.getElementById('hitungButton');
    hitungBtn.addEventListener('click', hitungPenjualan);
    hitungBtn.addEventListener('touchend', function (e) {
        e.preventDefault();
        hitungPenjualan();
    });

    // Tombol Reset
    var resetBtn = document.getElementById('resetButton');
    resetBtn.addEventListener('click', resetData);
    resetBtn.addEventListener('touchend', function (e) {
        e.preventDefault();
        resetData();
    });
}

// Sistem Penyimpanan
function saveState() {
    try {
        localStorage.setItem('myDurenState', JSON.stringify(state));
    } catch (e) {
        console.log('Gagal menyimpan data');
    }
}

function loadState() {
    try {
        var saved = JSON.parse(localStorage.getItem('myDurenState'));
        if (saved) {
            state.stok = saved.stok || 100;
            state.transactions = saved.transactions || [];
            state.totals = saved.totals || {
                belumLunas: 0,
                lunas: 0,
                cash: 0,
                transfer: 0,
            };
        }
    } catch (e) {
        console.log('Gagal memuat data');
    }
}

// Logika Bisnis
function hitungPenjualan() {
    // Validasi input
    var namaInput = document.getElementById('namaPembeli');
    var jumlahInput = document.getElementById('jumlahTerjual');
    var stokInput = document.getElementById('stokAwal');

    if (!namaInput.value.trim() || !jumlahInput.value) {
        alert('Harap isi nama dan jumlah!');
        return;
    }

    var jumlah = parseInt(jumlahInput.value);
    var stokAwal = parseInt(stokInput.value);

    if (jumlah > stokAwal) {
        alert('Stok tidak mencukupi!');
        return;
    }

    // Hitung total
    var jenis = document.getElementById('jenisPembeli').value;
    var total =
        jenis === 'reguler'
            ? calculateRegulerPrice(jumlah)
            : jumlah * harga.reseller;

    // Update state
    state.stok = stokAwal - jumlah;
    state.transactions.push(
        createTransaction(
            namaInput.value.trim(),
            jumlah,
            total,
            document.getElementById('statusPembayaran').value,
            document.getElementById('metodePembayaran').value,
        ),
    );

    updateTotals();
    saveState();
    updateUI();
    resetForm();
}

function calculateRegulerPrice(jumlah) {
    var promo = Math.floor(jumlah / 3);
    var sisa = jumlah % 3;
    return promo * harga.paket3Box + sisa * harga.reguler;
}

function createTransaction(nama, jumlah, total, status, metode) {
    return {
        nama: nama,
        jumlah: jumlah,
        total: total,
        status: status,
        metode: status === 'belum lunas' ? 'belum lunas' : metode,
        originalMetode: metode,
    };
}

// Update Interface
function updateUI() {
    // Update stok
    document.getElementById('stokAwal').value = state.stok;

    // Update tabel
    var tbody = document.getElementById('tabelPenjualan');
    tbody.innerHTML = state.transactions.map(createTableRow).join('');

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

function createTableRow(trx, index) {
    return `<tr>
        <td class="border px-4 py-2">${trx.nama}</td>
        <td class="border px-4 py-2">${trx.jumlah}</td>
        <td class="border px-4 py-2">Rp ${trx.total.toLocaleString()}</td>
        <td class="border px-4 py-2 cursor-pointer" onclick="toggleStatus(${index})">
            ${trx.status}
        </td>
        <td class="border px-4 py-2 cursor-pointer" 
            ${trx.status === 'lunas' ? `onclick="toggleMetode(${index})"` : ''}>
            ${trx.metode}
        </td>
    </tr>`;
}

// Fungsi Tambahan
function updateTotals() {
    state.totals = state.transactions.reduce(
        (acc, trx) => {
            if (trx.status === 'lunas') {
                acc.lunas += trx.total;
                acc[trx.metode] += trx.total;
            } else {
                acc.belumLunas += trx.total;
            }
            return acc;
        },
        { belumLunas: 0, lunas: 0, cash: 0, transfer: 0 },
    );
}

function resetForm() {
    document.getElementById('namaPembeli').value = '';
    document.getElementById('jumlahTerjual').value = '';
}

function resetData() {
    if (confirm('Yakin ingin menghapus semua data?')) {
        localStorage.removeItem('myDurenState');
        state = {
            stok: 100,
            transactions: [],
            totals: { belumLunas: 0, lunas: 0, cash: 0, transfer: 0 },
        };
        updateUI();
    }
}

// Inisialisasi Aplikasi
document.addEventListener('DOMContentLoaded', initApp);
