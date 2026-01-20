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
        this.editingIndex = null;
    }

    init() {
        this.loadState();
        this.setupEventListeners();
        this.setupTableHandlers();
        this.setupModalHandlers();
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
        // Event delegation untuk select dan button di tabel dan kartu
        document.addEventListener('change', (e) => {
            if (e.target.classList.contains('status-select')) {
                const index = parseInt(e.target.dataset.index);
                this.changeStatus(index, e.target.value);
            } else if (e.target.classList.contains('metode-select')) {
                const index = parseInt(e.target.dataset.index);
                this.changeMetode(index, e.target.value);
            }
        });

        document.addEventListener('click', (e) => {
            // Handle delete button
            if (e.target.closest('.delete-btn')) {
                const btn = e.target.closest('.delete-btn');
                const index = parseInt(btn.dataset.index);
                this.handleDelete(index);
            }
            // Handle edit button
            if (e.target.closest('.edit-btn')) {
                const btn = e.target.closest('.edit-btn');
                const index = parseInt(btn.dataset.index);
                this.openEditModal(index);
            }
        });
    }

    setupModalHandlers() {
        const modal = document.getElementById('editModal');
        const cancelBtn = document.getElementById('cancelEditBtn');
        const saveBtn = document.getElementById('saveEditBtn');

        cancelBtn.addEventListener('click', () => this.closeEditModal());
        saveBtn.addEventListener('click', () => this.saveEdit());

        // Close modal when clicking outside
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.closeEditModal();
            }
        });

        // Handle Enter key in input
        document.getElementById('editJumlahInput').addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                this.saveEdit();
            }
        });
    }

    openEditModal(index) {
        const trx = this.state.transactions[index];
        this.editingIndex = index;

        document.getElementById('editNama').textContent = trx.nama;
        document.getElementById('editJumlahInput').value = trx.jumlah;
        document.getElementById('editModal').classList.remove('modal-hidden');
        document.getElementById('editJumlahInput').focus();
        document.getElementById('editJumlahInput').select();
    }

    closeEditModal() {
        document.getElementById('editModal').classList.add('modal-hidden');
        this.editingIndex = null;
    }

    saveEdit() {
        const newJumlah = parseInt(document.getElementById('editJumlahInput').value);
        
        if (isNaN(newJumlah) || newJumlah < 1) {
            alert('Jumlah box harus minimal 1!');
            return;
        }

        const index = this.editingIndex;
        const trx = this.state.transactions[index];
        const oldJumlah = trx.jumlah;
        const diff = newJumlah - oldJumlah;

        // Check stok
        if (diff > 0 && diff > this.state.stok) {
            alert('Stok tidak mencukupi!');
            return;
        }

        // Recalculate total based on jenis
        const oldTotal = trx.total;
        let newTotal = 0;

        if (trx.jenis === 'reseller') {
            newTotal = newJumlah * HARGA.RESELLER;
        } else {
            // Reguler dengan promo 3 box
            const promo3Box = Math.floor(newJumlah / 3);
            const sisaBox = newJumlah % 3;
            newTotal = promo3Box * HARGA.PAKET_3BOX + sisaBox * HARGA.REGULER;
        }

        // Update totals
        const totalDiff = newTotal - oldTotal;

        if (trx.status === 'lunas') {
            this.state.totals.lunas += totalDiff;
            this.state.totals[trx.metode] += totalDiff;
        } else {
            this.state.totals.belumLunas += totalDiff;
        }

        // Update transaction
        trx.jumlah = newJumlah;
        trx.total = newTotal;

        // Update stok
        this.state.stok -= diff;

        this.saveState();
        this.updateUI();
        this.closeEditModal();
    }

    handleDelete(index) {
        const trx = this.state.transactions[index];
        
        if (!confirm(`Hapus transaksi "${trx.nama}" (${trx.jumlah} box)?`)) {
            return;
        }

        // Update totals
        if (trx.status === 'lunas') {
            this.state.totals.lunas -= trx.total;
            this.state.totals[trx.metode] -= trx.total;
        } else {
            this.state.totals.belumLunas -= trx.total;
        }

        // Return stock
        this.state.stok += trx.jumlah;

        // Remove transaction
        this.state.transactions.splice(index, 1);

        this.saveState();
        this.updateUI();
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
            jenis,
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
                    <td class="px-4 py-3 text-center">
                        <div class="flex gap-2 justify-center">
                            <button class="btn-action btn-edit edit-btn" data-index="${index}" title="Edit jumlah">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
                            </button>
                            <button class="btn-action btn-delete delete-btn" data-index="${index}" title="Hapus">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
                            </button>
                        </div>
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
                        <div class="text-right flex items-start gap-2">
                            <p class="font-bold text-gray-900 text-lg">Rp ${trx.total.toLocaleString()}</p>
                            <div class="flex gap-1">
                                <button class="btn-action btn-edit edit-btn" data-index="${index}" title="Edit jumlah">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
                                </button>
                                <button class="btn-action btn-delete delete-btn" data-index="${index}" title="Hapus">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
                                </button>
                            </div>
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
                jenis: trx.jenis || 'reguler',
            }));
        }
    }
}

// Inisialisasi Aplikasi
document.addEventListener('DOMContentLoaded', () => {
    const app = new StateManager();
    app.init();
});
