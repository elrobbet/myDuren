// Konfigurasi
const HARGA = {
    REGULER: 35000,
    RESELLER: 30000,
    PAKET_3BOX: 100000,
};

class StateManager {
    constructor() {
        this.state = {
            stok: 100,
            transactions: [],
            totals: {
                belumLunas: 0,
                lunas: 0,
                cash: 0,
                transfer: 0,
            },
        };
    }

    init() {
        this.loadState();
        this.setupEventListeners();
        this.setupTableHandlers();
        this.updateUI();
    }

    setupEventListeners() {
        document
            .getElementById('hitungButton')
            .addEventListener('click', () => this.handleHitung());
        document
            .getElementById('resetButton')
            .addEventListener('click', () => this.handleReset());

        // Mobile touch support
        document
            .getElementById('hitungButton')
            .addEventListener('touchend', (e) => {
                e.preventDefault();
                this.handleHitung();
            });
    }

    setupTableHandlers() {
        const tabel = document.getElementById('tabelPenjualan');

        const handler = (e) => {
            const cell = e.target.closest('[data-action]');
            if (!cell) return;

            const index = parseInt(cell.dataset.index);
            const action = cell.dataset.action;

            if (action === 'toggle-status') {
                this.toggleStatus(index);
            } else if (action === 'toggle-metode') {
                this.toggleMetode(index);
            }
        };

        tabel.addEventListener('click', handler);
        tabel.addEventListener('touchend', (e) => {
            e.preventDefault();
            handler(e);
        });
    }

    toggleStatus(index) {
        const trx = this.state.transactions[index];

        // Update totals
        if (trx.status === 'lunas') {
            this.state.totals.lunas -= trx.total;
            this.state.totals[trx.metode] -= trx.total;
        } else {
            this.state.totals.belumLunas -= trx.total;
        }

        // Toggle status
        trx.status = trx.status === 'lunas' ? 'belum lunas' : 'lunas';

        // Update metode
        if (trx.status === 'lunas') {
            trx.metode = trx.originalMetode;
            this.state.totals.lunas += trx.total;
            this.state.totals[trx.metode] += trx.total;
        } else {
            trx.metode = 'belum lunas';
            this.state.totals.belumLunas += trx.total;
        }

        this.saveState();
        this.updateUI();
    }

    toggleMetode(index) {
        const trx = this.state.transactions[index];
        if (trx.status !== 'lunas') return;

        // Update totals
        this.state.totals[trx.metode] -= trx.total;
        trx.metode = trx.metode === 'cash' ? 'transfer' : 'cash';
        this.state.totals[trx.metode] += trx.total;
        trx.originalMetode = trx.metode;

        this.saveState();
        this.updateUI();
    }

    handleHitung() {
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
            total = promo3Box * HARGA.PAKET_3BOX + sisaBox * HARGA.REGULER;
        } else {
            total = jumlah * HARGA.RESELLER;
        }

        // Update state
        this.state.stok = stokAwal - jumlah;
        this.state.transactions.push({
            nama,
            jumlah,
            total,
            status,
            metode: status === 'belum lunas' ? 'belum lunas' : metode,
            originalMetode: metode,
        });

        // Update totals
        if (status === 'lunas') {
            this.state.totals.lunas += total;
            this.state.totals[metode] += total;
        } else {
            this.state.totals.belumLunas += total;
        }

        this.saveState();
        this.updateUI();
        this.resetForm();
    }

    handleReset() {
        if (confirm('Yakin reset semua data?')) {
            localStorage.removeItem('myDurenState');
            this.state = {
                stok: 100,
                transactions: [],
                totals: {
                    belumLunas: 0,
                    lunas: 0,
                    cash: 0,
                    transfer: 0,
                },
            };
            this.updateUI();
        }
    }

    updateUI() {
        // Update stok
        document.getElementById('stokAwal').value = this.state.stok;

        // Update tabel
        const tbody = document.getElementById('tabelPenjualan');
        tbody.innerHTML = this.state.transactions
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
                    data-action="${
                        trx.status === 'lunas' ? 'toggle-metode' : ''
                    }" 
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
            this.state.totals.belumLunas.toLocaleString();
        document.getElementById('totalLunas').textContent =
            this.state.totals.lunas.toLocaleString();
        document.getElementById('totalCash').textContent =
            this.state.totals.cash.toLocaleString();
        document.getElementById('totalTransfer').textContent =
            this.state.totals.transfer.toLocaleString();
    }

    resetForm() {
        document.getElementById('namaPembeli').value = '';
        document.getElementById('jumlahTerjual').value = '';
    }

    saveState() {
        localStorage.setItem('myDurenState', JSON.stringify(this.state));
    }

    loadState() {
        const saved = localStorage.getItem('myDurenState');
        if (saved) {
            this.state = JSON.parse(saved);
            // Backward compatibility
            this.state.transactions = this.state.transactions.map((trx) => ({
                ...trx,
                originalMetode: trx.originalMetode || trx.metode,
            }));
        }
    }
}

// Inisialisasi Aplikasi
document.addEventListener('DOMContentLoaded', () => {
    const app = new StateManager();
    app.init();
});
