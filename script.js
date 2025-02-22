// Inisialisasi State
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

// Event Listener untuk Mobile & Desktop
document.addEventListener('DOMContentLoaded', function () {
    document
        .getElementById('hitungButton')
        .addEventListener('click', hitungPenjualan);
    document
        .getElementById('hitungButton')
        .addEventListener('touchend', function (e) {
            e.preventDefault();
            hitungPenjualan();
        });

    document.getElementById('resetButton').addEventListener('click', resetData);
    loadState();
    updateUI();
});

// Fungsi Utama
function hitungPenjualan() {
    var nama = document.getElementById('namaPembeli').value.trim();
    var jumlah = parseInt(document.getElementById('jumlahTerjual').value);
    var stokAwal = parseInt(document.getElementById('stokAwal').value);
    var jenis = document.getElementById('jenisPembeli').value;

    // Validasi
    if (!nama || isNaN(jumlah)) {
        alert('Input tidak valid!');
        return;
    }

    // Hitung Total
    var total = 0;
    if (jenis === 'reguler') {
        var promo3Box = Math.floor(jumlah / 3);
        var sisaBox = jumlah % 3;
        total = promo3Box * 100000 + sisaBox * 35000;
    } else {
        total = jumlah * 30000;
    }

    // Update State
    state.stok = stokAwal - jumlah;
    state.transactions.push({
        nama: nama,
        jumlah: jumlah,
        total: total,
        status: document.getElementById('statusPembayaran').value,
        metode: document.getElementById('metodePembayaran').value,
    });

    updateUI();
    resetForm();
}

// Fungsi Lainnya
function updateUI() {
    document.getElementById('stokAwal').value = state.stok;
    var tbody = document.getElementById('tabelPenjualan');
    tbody.innerHTML = '';

    state.transactions.forEach(function (trx) {
        var row =
            '<tr>' +
            '<td>' +
            trx.nama +
            '</td>' +
            '<td>' +
            trx.jumlah +
            '</td>' +
            '<td>Rp' +
            trx.total.toLocaleString() +
            '</td>' +
            '<td>' +
            trx.status +
            '</td>' +
            '<td>' +
            trx.metode +
            '</td>' +
            '</tr>';
        tbody.innerHTML += row;
    });
}

function resetForm() {
    document.getElementById('namaPembeli').value = '';
    document.getElementById('jumlahTerjual').value = '';
}

function resetData() {
    if (confirm('Reset semua data?')) {
        state = {
            stok: 100,
            transactions: [],
            totals: { belumLunas: 0, lunas: 0, cash: 0, transfer: 0 },
        };
        updateUI();
    }
}
