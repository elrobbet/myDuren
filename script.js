const HARGA = {
    REGULER: 35000,
    PAKET_3BOX_REGULER: 100000,
    PREMIUM: 40000,
    PAKET_3BOX_PREMIUM: 110000,
    RESELLER: 30000,
    RESELLER_PREMIUM: 34000,
};

const JENIS_LABEL = {
    reguler: 'Reguler',
    premium: 'Premium',
    reseller: 'Reseller Reguler',
    reseller_premium: 'Reseller Premium',
};

function hitungTotalHarga(jenis, jumlah) {
    if (!Number.isInteger(jumlah) || jumlah < 1) return 0;

    if (jenis === 'premium') {
        // Promo paket 3 box berlaku untuk pembeli umum varian Premium.
        const paket = Math.floor(jumlah / 3);
        const sisa = jumlah % 3;
        return paket * HARGA.PAKET_3BOX_PREMIUM + sisa * HARGA.PREMIUM;
    }

    if (jenis === 'reseller') {
        return jumlah * HARGA.RESELLER;
    }

    if (jenis === 'reseller_premium') {
        return jumlah * HARGA.RESELLER_PREMIUM;
    }

    // Default ke Reguler (termasuk promo 3 box Rp 100.000).
    const paket = Math.floor(jumlah / 3);
    const sisa = jumlah % 3;
    return paket * HARGA.PAKET_3BOX_REGULER + sisa * HARGA.REGULER;
}

function getInfoTarif(jenis, jumlah) {
    const qty = Number.isInteger(jumlah) && jumlah > 0 ? jumlah : 0;

    if (jenis === 'premium') {
        if (qty >= 3) {
            const paket = Math.floor(qty / 3);
            const sisa = qty % 3;
            return sisa > 0
                ? `Premium: ${paket} paket 3-box + ${sisa} satuan`
                : `Premium: ${paket} paket 3-box (Rp 110.000/paket)`;
        }
        return 'Harga satuan: Rp 40.000/box (3 box Rp 110.000)';
    }

    if (jenis === 'reseller') {
        return 'Harga Reseller Reguler: Rp 30.000/box';
    }

    if (jenis === 'reseller_premium') {
        return 'Harga Reseller Premium: Rp 34.000/box';
    }

    if (qty >= 3) {
        const paket = Math.floor(qty / 3);
        const sisa = qty % 3;
        return sisa > 0
            ? `Reguler: ${paket} paket 3-box + ${sisa} satuan`
            : `Reguler: ${paket} paket 3-box (Rp 100.000/paket)`;
    }
    return 'Harga satuan: Rp 35.000/box (3 box Rp 100.000)';
}

function escapeHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

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
        this.confirmCallback = null;
        this.lastFocusedElement = null;
    }

    init() {
        this.initTheme();
        this.loadState();
        this.setupEventListeners();
        this.setupTableHandlers();
        this.setupModalHandlers();
        this.syncMetodeWithStatus();
        this.updatePricePreview();
        document.getElementById('loadingState').classList.add('hidden');
        this.updateUI();
    }

    initTheme() {
        const savedTheme = localStorage.getItem('myDurenTheme') || 'light';
        this.applyTheme(savedTheme);
    }

    applyTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('myDurenTheme', theme);

        const sunIcon = document.getElementById('themeIconSun');
        const moonIcon = document.getElementById('themeIconMoon');
        const label = document.getElementById('themeToggleLabel');

        if (theme === 'dark') {
            sunIcon.classList.remove('hidden');
            moonIcon.classList.add('hidden');
            label.textContent = 'Mode Terang';
        } else {
            sunIcon.classList.add('hidden');
            moonIcon.classList.remove('hidden');
            label.textContent = 'Mode Gelap';
        }
    }

    setupEventListeners() {
        document.getElementById('themeToggleBtn').addEventListener('click', () => {
            const current = document.documentElement.getAttribute('data-theme');
            this.applyTheme(current === 'dark' ? 'light' : 'dark');
        });

        document.getElementById('hitungButton').addEventListener('click', () => this.handleHitung());
        document.getElementById('resetButton').addEventListener('click', () => this.handleReset());

        document.getElementById('jenisPembeli').addEventListener('change', () => {
            this.hideFormError();
            this.updatePricePreview();
        });

        document.getElementById('jumlahTerjual').addEventListener('input', () => {
            this.hideFormError();
            this.updatePricePreview();
        });

        document.getElementById('namaPembeli').addEventListener('input', () => {
            this.hideFormError();
        });

        document.getElementById('stokAwal').addEventListener('change', (e) => {
            const val = parseInt(e.target.value, 10);
            if (!isNaN(val) && val >= 0) {
                this.state.stok = val;
                this.saveState();
                this.updateUI();
            }
        });

        document.getElementById('statusPembayaran').addEventListener('change', () => {
            this.syncMetodeWithStatus();
        });
    }

    syncMetodeWithStatus() {
        const status = document.getElementById('statusPembayaran').value;
        const metodeSelect = document.getElementById('metodePembayaran');
        metodeSelect.disabled = status === 'belum lunas';
    }

    updatePricePreview() {
        const jenis = document.getElementById('jenisPembeli').value;
        const jumlah = parseInt(document.getElementById('jumlahTerjual').value, 10);
        const total = hitungTotalHarga(jenis, jumlah);

        document.getElementById('previewNote').textContent = getInfoTarif(jenis, jumlah);
        document.getElementById('previewTotal').textContent = `Rp ${total.toLocaleString('id-ID')}`;
    }

    showFormError(msg) {
        const banner = document.getElementById('formError');
        document.getElementById('formErrorText').textContent = msg;
        banner.classList.remove('hidden');
    }

    hideFormError() {
        document.getElementById('formError').classList.add('hidden');
    }

    showEditError(msg) {
        const banner = document.getElementById('editError');
        document.getElementById('editErrorText').textContent = msg;
        banner.classList.remove('hidden');
    }

    hideEditError() {
        document.getElementById('editError').classList.add('hidden');
    }

    setupTableHandlers() {
        document.addEventListener('change', (e) => {
            if (e.target.classList.contains('status-select')) {
                const index = parseInt(e.target.dataset.index, 10);
                this.changeStatus(index, e.target.value);
            } else if (e.target.classList.contains('metode-select')) {
                const index = parseInt(e.target.dataset.index, 10);
                this.changeMetode(index, e.target.value);
            }
        });

        document.addEventListener('click', (e) => {
            const deleteBtn = e.target.closest('.delete-btn');
            if (deleteBtn) {
                const index = parseInt(deleteBtn.dataset.index, 10);
                this.handleDelete(index, deleteBtn);
                return;
            }

            const editBtn = e.target.closest('.edit-btn');
            if (editBtn) {
                const index = parseInt(editBtn.dataset.index, 10);
                this.openEditModal(index, editBtn);
            }
        });
    }

    setupModalHandlers() {
        const editModal = document.getElementById('editModal');
        const confirmModal = document.getElementById('confirmModal');

        document.getElementById('cancelEditBtn').addEventListener('click', () => this.closeEditModal());
        document.getElementById('saveEditBtn').addEventListener('click', () => this.saveEdit());

        editModal.addEventListener('click', (e) => {
            if (e.target === editModal) this.closeEditModal();
        });

        document.getElementById('editJumlahInput').addEventListener('keydown', (e) => {
            if (e.key === 'Enter') this.saveEdit();
        });

        document.getElementById('cancelConfirmBtn').addEventListener('click', () => this.closeConfirmModal());
        document.getElementById('okConfirmBtn').addEventListener('click', () => {
            if (typeof this.confirmCallback === 'function') {
                this.confirmCallback();
            }
            this.closeConfirmModal();
        });

        confirmModal.addEventListener('click', (e) => {
            if (e.target === confirmModal) this.closeConfirmModal();
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                if (!editModal.classList.contains('hidden')) {
                    this.closeEditModal();
                } else if (!confirmModal.classList.contains('hidden')) {
                    this.closeConfirmModal();
                }
            }
        });
    }

    openConfirmModal(title, message, onConfirm, triggerEl = null) {
        this.lastFocusedElement = triggerEl || document.activeElement;
        this.confirmCallback = onConfirm;
        document.getElementById('confirmModalTitle').textContent = title;
        document.getElementById('confirmModalMessage').textContent = message;
        document.getElementById('confirmModal').classList.remove('hidden');
        document.getElementById('okConfirmBtn').focus();
    }

    closeConfirmModal() {
        document.getElementById('confirmModal').classList.add('hidden');
        this.confirmCallback = null;
        if (this.lastFocusedElement && typeof this.lastFocusedElement.focus === 'function') {
            this.lastFocusedElement.focus();
        }
    }

    openEditModal(index, triggerEl = null) {
        const trx = this.state.transactions[index];
        if (!trx) return;

        this.lastFocusedElement = triggerEl || document.activeElement;
        this.editingIndex = index;
        this.hideEditError();

        document.getElementById('editNama').textContent = trx.nama;
        document.getElementById('editJenisSelect').value = trx.jenis || 'reguler';
        document.getElementById('editJumlahInput').value = trx.jumlah;
        document.getElementById('editModal').classList.remove('hidden');
        document.getElementById('editJumlahInput').focus();
        document.getElementById('editJumlahInput').select();
    }

    closeEditModal() {
        document.getElementById('editModal').classList.add('hidden');
        this.editingIndex = null;
        this.hideEditError();
        if (this.lastFocusedElement && typeof this.lastFocusedElement.focus === 'function') {
            this.lastFocusedElement.focus();
        }
    }

    recalculateTotals() {
        const totals = {
            belumLunas: 0,
            lunas: 0,
            cash: 0,
            transfer: 0,
        };

        for (const trx of this.state.transactions) {
            if (trx.status === 'lunas') {
                totals.lunas += trx.total;
                if (trx.metode === 'cash' || trx.metode === 'transfer') {
                    totals[trx.metode] += trx.total;
                }
            } else {
                totals.belumLunas += trx.total;
            }
        }

        this.state.totals = totals;
    }

    saveEdit() {
        const newJumlah = parseInt(document.getElementById('editJumlahInput').value, 10);
        const newJenis = document.getElementById('editJenisSelect').value;

        if (isNaN(newJumlah) || newJumlah < 1) {
            this.showEditError('Jumlah box minimal 1.');
            return;
        }

        const index = this.editingIndex;
        const trx = this.state.transactions[index];
        if (!trx) return;

        const diff = newJumlah - trx.jumlah;

        if (diff > 0 && diff > this.state.stok) {
            this.showEditError(`Stok tidak cukup. Sisa stok: ${this.state.stok} box.`);
            return;
        }

        trx.jumlah = newJumlah;
        trx.jenis = newJenis;
        trx.total = hitungTotalHarga(newJenis, newJumlah);
        this.state.stok -= diff;

        this.recalculateTotals();
        this.saveState();
        this.updateUI();
        this.closeEditModal();
    }

    handleDelete(index, triggerEl) {
        const trx = this.state.transactions[index];
        if (!trx) return;

        this.openConfirmModal(
            'Hapus Transaksi',
            `Hapus catatan pembelian "${trx.nama}" (${trx.jumlah} box)? Stok akan dikembalikan.`,
            () => {
                this.state.stok += trx.jumlah;
                this.state.transactions.splice(index, 1);
                this.recalculateTotals();
                this.saveState();
                this.updateUI();
            },
            triggerEl,
        );
    }

    changeStatus(index, newStatus) {
        const trx = this.state.transactions[index];
        if (!trx || trx.status === newStatus) return;

        trx.status = newStatus;
        if (newStatus === 'lunas') {
            trx.metode = trx.originalMetode && trx.originalMetode !== 'belum lunas' ? trx.originalMetode : 'cash';
        } else {
            trx.metode = 'belum lunas';
        }

        this.recalculateTotals();
        this.saveState();
        this.updateUI();
    }

    changeMetode(index, newMetode) {
        const trx = this.state.transactions[index];
        if (!trx || trx.status !== 'lunas' || trx.metode === newMetode) return;

        trx.metode = newMetode;
        trx.originalMetode = newMetode;

        this.recalculateTotals();
        this.saveState();
        this.updateUI();
    }

    handleHitung() {
        const nama = document.getElementById('namaPembeli').value.trim();
        const jumlah = parseInt(document.getElementById('jumlahTerjual').value, 10);
        const stokAwalInput = parseInt(document.getElementById('stokAwal').value, 10);
        const jenis = document.getElementById('jenisPembeli').value;
        const status = document.getElementById('statusPembayaran').value;
        const metode = document.getElementById('metodePembayaran').value;

        this.hideFormError();

        if (!nama) {
            this.showFormError('Nama pembeli wajib diisi.');
            document.getElementById('namaPembeli').focus();
            return;
        }

        if (isNaN(jumlah) || jumlah < 1) {
            this.showFormError('Jumlah box terjual minimal 1.');
            document.getElementById('jumlahTerjual').focus();
            return;
        }

        const stokTersedia = isNaN(stokAwalInput) ? this.state.stok : stokAwalInput;

        if (jumlah > stokTersedia) {
            this.showFormError(`Stok tidak mencukupi (tersedia ${stokTersedia} box).`);
            document.getElementById('jumlahTerjual').focus();
            return;
        }

        const total = hitungTotalHarga(jenis, jumlah);

        this.state.stok = stokTersedia - jumlah;
        this.state.transactions.push({
            nama,
            jumlah,
            total,
            jenis,
            status,
            metode: status === 'belum lunas' ? 'belum lunas' : metode,
            originalMetode: metode,
        });

        this.recalculateTotals();
        this.saveState();
        this.updateUI();
        this.resetForm();
    }

    handleReset() {
        const resetBtn = document.getElementById('resetButton');
        this.openConfirmModal(
            'Reset Semua Data',
            'Semua daftar transaksi akan dihapus dan stok dikembalikan ke 100 box.',
            () => {
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
                this.hideFormError();
                this.updateUI();
                this.updatePricePreview();
            },
            resetBtn,
        );
    }

    getStatusSelectClass(status) {
        return status === 'lunas' ? 'status-lunas' : 'status-belum';
    }

    getMetodeSelectClass(metode) {
        if (metode === 'cash') return 'metode-cash';
        if (metode === 'transfer') return 'metode-transfer';
        return '';
    }

    getTierBadgeHtml(jenis) {
        const label = JENIS_LABEL[jenis] || JENIS_LABEL.reguler;
        const isPremium = jenis === 'premium' || jenis === 'reseller_premium';
        return `<span class="tier-badge ${isPremium ? 'tier-premium' : ''}">${escapeHtml(label)}</span>`;
    }

    updateUI() {
        document.getElementById('stokAwal').value = this.state.stok;
        document.getElementById('headerStokBadge').textContent = this.state.stok.toLocaleString('id-ID');

        const totalBoxTerjual = this.state.transactions.reduce((acc, item) => acc + (item.jumlah || 0), 0);
        document.getElementById('totalBoxTerjualLabel').textContent = `${totalBoxTerjual} box terjual`;

        const hasTransactions = this.state.transactions.length > 0;
        const tbody = document.getElementById('tabelPenjualan');
        const tableContainer = document.getElementById('tableContainer');
        const emptyDesktop = document.getElementById('emptyStateDesktop');

        if (hasTransactions) {
            emptyDesktop.classList.add('hidden');
            tableContainer.classList.remove('hidden');
            tbody.innerHTML = this.state.transactions
                .map((trx, index) => {
                    const safeNama = escapeHtml(trx.nama);
                    return `
                <tr>
                    <td>
                        <div style="font-weight: 700;">${safeNama}</div>
                        ${this.getTierBadgeHtml(trx.jenis)}
                    </td>
                    <td class="col-center num" style="font-weight: 700;">${trx.jumlah}</td>
                    <td class="col-right num" style="font-weight: 700;">Rp ${trx.total.toLocaleString('id-ID')}</td>
                    <td class="col-center">
                        <select
                            aria-label="Status pembayaran ${safeNama}"
                            class="inline-select status-select ${this.getStatusSelectClass(trx.status)}"
                            data-index="${index}"
                        >
                            <option value="lunas" ${trx.status === 'lunas' ? 'selected' : ''}>Lunas</option>
                            <option value="belum lunas" ${trx.status === 'belum lunas' ? 'selected' : ''}>Belum Lunas</option>
                        </select>
                    </td>
                    <td class="col-center">
                        <select
                            aria-label="Metode pembayaran ${safeNama}"
                            class="inline-select metode-select ${this.getMetodeSelectClass(trx.metode)}"
                            data-index="${index}"
                            ${trx.status !== 'lunas' ? 'disabled' : ''}
                        >
                            <option value="cash" ${trx.metode === 'cash' ? 'selected' : ''}>Cash</option>
                            <option value="transfer" ${trx.metode === 'transfer' ? 'selected' : ''}>Transfer</option>
                            ${trx.status !== 'lunas' ? `<option value="belum lunas" selected>-</option>` : ''}
                        </select>
                    </td>
                    <td class="col-center">
                        <div class="action-group">
                            <button
                                type="button"
                                class="btn-action btn-edit edit-btn"
                                data-index="${index}"
                                aria-label="Edit transaksi ${safeNama}"
                                title="Edit transaksi"
                            >
                                <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
                            </button>
                            <button
                                type="button"
                                class="btn-action btn-delete delete-btn"
                                data-index="${index}"
                                aria-label="Hapus transaksi ${safeNama}"
                                title="Hapus transaksi"
                            >
                                <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
                })
                .join('');
        } else {
            tbody.innerHTML = '';
            tableContainer.classList.add('hidden');
            emptyDesktop.classList.remove('hidden');
        }

        const cardContainer = document.getElementById('cardPenjualan');
        const emptyMobile = document.getElementById('emptyStateMobile');

        if (hasTransactions) {
            emptyMobile.classList.add('hidden');
            cardContainer.innerHTML = this.state.transactions
                .map((trx, index) => {
                    const safeNama = escapeHtml(trx.nama);
                    return `
                <div class="transaction-card">
                    <div class="card-top">
                        <div>
                            <p class="card-buyer-name">${safeNama}</p>
                            <p class="card-meta num">${trx.jumlah} box · Rp ${trx.total.toLocaleString('id-ID')}</p>
                            ${this.getTierBadgeHtml(trx.jenis)}
                        </div>
                        <div class="action-group">
                            <button
                                type="button"
                                class="btn-action btn-edit edit-btn"
                                data-index="${index}"
                                aria-label="Edit transaksi ${safeNama}"
                            >
                                <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
                            </button>
                            <button
                                type="button"
                                class="btn-action btn-delete delete-btn"
                                data-index="${index}"
                                aria-label="Hapus transaksi ${safeNama}"
                            >
                                <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
                            </button>
                        </div>
                    </div>
                    <div class="card-controls-grid">
                        <div>
                            <label class="card-field-label" for="mobile-status-${index}">Status</label>
                            <select
                                id="mobile-status-${index}"
                                class="inline-select status-select ${this.getStatusSelectClass(trx.status)}"
                                style="width: 100%;"
                                data-index="${index}"
                            >
                                <option value="lunas" ${trx.status === 'lunas' ? 'selected' : ''}>Lunas</option>
                                <option value="belum lunas" ${trx.status === 'belum lunas' ? 'selected' : ''}>Belum Lunas</option>
                            </select>
                        </div>
                        <div>
                            <label class="card-field-label" for="mobile-metode-${index}">Metode</label>
                            <select
                                id="mobile-metode-${index}"
                                class="inline-select metode-select ${this.getMetodeSelectClass(trx.metode)}"
                                style="width: 100%;"
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
            `;
                })
                .join('');
        } else {
            cardContainer.innerHTML = '';
            emptyMobile.classList.remove('hidden');
        }

        document.getElementById('totalBelumLunas').textContent =
            this.state.totals.belumLunas.toLocaleString('id-ID');
        document.getElementById('totalLunas').textContent =
            this.state.totals.lunas.toLocaleString('id-ID');
        document.getElementById('totalCash').textContent =
            this.state.totals.cash.toLocaleString('id-ID');
        document.getElementById('totalTransfer').textContent =
            this.state.totals.transfer.toLocaleString('id-ID');
    }

    resetForm() {
        document.getElementById('namaPembeli').value = '';
        document.getElementById('jumlahTerjual').value = '';
        this.updatePricePreview();
    }

    saveState() {
        localStorage.setItem('myDurenState', JSON.stringify(this.state));
    }

    loadState() {
        const saved = localStorage.getItem('myDurenState');
        if (!saved) return;

        try {
            const parsed = JSON.parse(saved);
            if (parsed && Array.isArray(parsed.transactions)) {
                this.state.stok = typeof parsed.stok === 'number' ? parsed.stok : 100;
                // Pertahankan kompatibilitas data transaksi lama di localStorage.
                this.state.transactions = parsed.transactions.map((trx) => {
                    const jenis = trx.jenis || 'reguler';
                    const jumlah = parseInt(trx.jumlah, 10) || 1;
                    return {
                        ...trx,
                        jumlah,
                        jenis,
                        total: typeof trx.total === 'number' ? trx.total : hitungTotalHarga(jenis, jumlah),
                        originalMetode: trx.originalMetode || trx.metode || 'cash',
                    };
                });
                this.recalculateTotals();
            }
        } catch {
            this.showFormError('Data tersimpan rusak. Silakan klik Reset Semua bila diperlukan.');
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const app = new StateManager();
    app.init();
});
