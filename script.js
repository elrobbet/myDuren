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
    }

    setupTableHandlers() {
        // Event delegation untuk select di tabel dan kartu
        document.addEventListener('change', (e) => {
            if (e.target.classList.contains('status-select')) {
                const index = parseInt(e.target.dataset.index);
                this.changeStatus(index, e.target.value);
            } else if (e.target.classList.contains('metode-select')) {
                const index = parseInt(e.target.dataset.index);
                this.changeMetode(index, e.target.value);
            }
        });
    }

    changeStatus(index, newStatus) {
        const trx = this.state.transactions[index];
        const oldStatus = trx.status;

        if (oldStatus === newStatus) return;

        // Update total - kurangi dari status lama
        if (oldStatus === 'lunas') {
            this.state.totals.lunas -= trx.total;
            this.state.totals[trx.metode] -= trx.total;
        } else {
            this.state.totals.belumLunas -= trx.total;
        }

        // Update status
        trx.status = newStatus;

        // Update metode dan total - tambahkan ke status baru
        if (newStatus === 'lunas') {
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

    changeMetode(index, newMetode) {
        const trx = this.state.transactions[index];
        if (trx.status !== 'lunas') return;

        const oldMetode = trx.metode;
        if (oldMetode === newMetode) return;

        // Update totals
        this.state.totals[oldMetode] -= trx.total;
        trx.metode = newMetode;
        this.state.totals[newMetode] += trx.total;
        trx.originalMetode = newMetode;

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

    getStatusSelectClass(status) {
        return status === 'lunas' ? 'status-lunas' : 'status-belum';
    }

    getMetodeSelectClass(metode) {
        if (metode === 'cash') return 'metode-cash';
        if (metode === 'transfer') return 'metode-transfer';
        return '';
    }

    updateUI() {
        // Update stok
        document.getElementById('stokAwal').value = this.state.stok;

        const hasTransactions = this.state.transactions.length > 0;

        // Update tabel desktop
        const tbody = document.getElementById('tabelPenjualan');
        const emptyDesktop = document.getElementById('emptyStateDesktop');
        
        if (hasTransactions) {
            emptyDesktop.classList.add('hidden');
            tbody.innerHTML = this.state.transactions
                .map(
                    (trx, index) => `
                <tr class="hover:bg-gray-50">
                    <td class="px-4 py-3 text-left font-medium text-gray-900">${trx.nama}</td>
                    <td class="px-4 py-3 text-center text-gray-700">${trx.jumlah}</td>
                    <td class="px-4 py-3 text-right text-gray-700 font-medium">Rp ${trx.total.toLocaleString()}</td>
                    <td class="px-4 py-3 text-center">
                        <select 
                            class="inline-select status-select ${this.getStatusSelectClass(trx.status)}"
                            data-index="${index}"
                        >
                            <option value="lunas" ${trx.status === 'lunas' ? 'selected' : ''}>Lunas</option>
                            <option value="belum lunas" ${trx.status === 'belum lunas' ? 'selected' : ''}>Belum Lunas</option>
                        </select>
                    </td>
                    <td class="px-4 py-3 text-center">
                        <select 
                            class="inline-select metode-select ${this.getMetodeSelectClass(trx.metode)}"
                            data-index="${index}"
                            ${trx.status !== 'lunas' ? 'disabled' : ''}
                        >
                            <option value="cash" ${trx.metode === 'cash' ? 'selected' : ''}>Cash</option>
                            <option value="transfer" ${trx.metode === 'transfer' ? 'selected' : ''}>Transfer</option>
                            ${trx.status !== 'lunas' ? `<option value="belum lunas" selected>-</option>` : ''}
                        </select>
                    </td>
                </tr>
            `,
                )
                .join('');
        } else {
            tbody.innerHTML = '';
            emptyDesktop.classList.remove('hidden');
        }

        // Update kartu mobile
        const cardContainer = document.getElementById('cardPenjualan');
        const emptyMobile = document.getElementById('emptyStateMobile');

        if (hasTransactions) {
            emptyMobile.classList.add('hidden');
            cardContainer.innerHTML = this.state.transactions
                .map(
                    (trx, index) => `
                <div class="transaction-card">
                    <div class="flex justify-between items-start mb-3">
                        <div>
                            <p class="font-bold text-gray-900 text-lg">${trx.nama}</p>
                            <p class="text-gray-500 text-sm">${trx.jumlah} box</p>
                        </div>
                        <div class="text-right">
                            <p class="font-bold text-gray-900 text-lg">Rp ${trx.total.toLocaleString()}</p>
                        </div>
                    </div>
                    <div class="flex gap-3 mt-4">
                        <div class="flex-1">
                            <p class="label mb-1">Status</p>
                            <select 
                                class="inline-select status-select w-full ${this.getStatusSelectClass(trx.status)}"
                                data-index="${index}"
                            >
                                <option value="lunas" ${trx.status === 'lunas' ? 'selected' : ''}>Lunas</option>
                                <option value="belum lunas" ${trx.status === 'belum lunas' ? 'selected' : ''}>Belum Lunas</option>
                            </select>
                        </div>
                        <div class="flex-1">
                            <p class="label mb-1">Metode</p>
                            <select 
                                class="inline-select metode-select w-full ${this.getMetodeSelectClass(trx.metode)}"
                                data-index="${index}"
                                ${trx.status !== 'lunas' ? 'disabled' : ''}
                            >
                                <option value="cash" ${trx.metode === 'cash' ? 'selected' : ''}>Cash</option>
                                <option value="transfer" ${trx.metode === 'transfer' ? 'selected' : ''}>Transfer</option>
                                ${trx.status !== 'lunas' ? `<option value="belum lunas" selected>-</option>` : ''}
                            </select>
                        </div>
                    </div>
                </div>
            `,
                )
                .join('');
        } else {
            cardContainer.innerHTML = '';
            emptyMobile.classList.remove('hidden');
        }

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
