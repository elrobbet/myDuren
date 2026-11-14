const DEFAULT_VARIANTS = [
    {
        id: 'reguler',
        nama: 'Reguler',
        hargaJual: 35000,
        hargaPaket3: 100000,
        modalSatuan: 25000,
    },
    {
        id: 'premium',
        nama: 'Premium',
        hargaJual: 40000,
        hargaPaket3: 110000,
        modalSatuan: 30000,
    },
    {
        id: 'reseller',
        nama: 'Reseller Reguler',
        hargaJual: 30000,
        hargaPaket3: 0,
        modalSatuan: 25000,
    },
    {
        id: 'reseller_premium',
        nama: 'Reseller Premium',
        hargaJual: 34000,
        hargaPaket3: 0,
        modalSatuan: 30000,
    },
];

function cloneDefaultVariants() {
    return DEFAULT_VARIANTS.map((v) => ({ ...v }));
}

function escapeHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function formatRupiah(num) {
    const val = Number.isFinite(num) ? Math.round(num) : 0;
    return val.toLocaleString('id-ID');
}

function hitungHargaVarian(variant, jumlah) {
    if (!variant || !Number.isInteger(jumlah) || jumlah < 1) return 0;
    const hargaSatuan = Math.max(0, Number(variant.hargaJual) || 0);
    const hargaPaket3 = Math.max(0, Number(variant.hargaPaket3) || 0);

    if (hargaPaket3 > 0 && jumlah >= 3) {
        const paket = Math.floor(jumlah / 3);
        const sisa = jumlah % 3;
        return paket * hargaPaket3 + sisa * hargaSatuan;
    }

    return jumlah * hargaSatuan;
}

function hitungModalVarian(variant, jumlah) {
    if (!variant || !Number.isInteger(jumlah) || jumlah < 1) return 0;
    const modalSatuan = Math.max(0, Number(variant.modalSatuan) || 0);
    return jumlah * modalSatuan;
}

function getInfoTarifVarian(variant, jumlah) {
    if (!variant) return 'Pilih varian duren terlebih dahulu';
    const qty = Number.isInteger(jumlah) && jumlah > 0 ? jumlah : 0;
    const hargaSatuan = Math.max(0, Number(variant.hargaJual) || 0);
    const hargaPaket3 = Math.max(0, Number(variant.hargaPaket3) || 0);

    if (hargaPaket3 > 0) {
        if (qty >= 3) {
            const paket = Math.floor(qty / 3);
            const sisa = qty % 3;
            return sisa > 0
                ? `${variant.nama}: ${paket} paket 3-box + ${sisa} satuan`
                : `${variant.nama}: ${paket} paket 3-box (Rp ${formatRupiah(hargaPaket3)}/paket)`;
        }
        return `Harga: Rp ${formatRupiah(hargaSatuan)}/box (3 box Rp ${formatRupiah(hargaPaket3)})`;
    }

    return `Harga ${variant.nama}: Rp ${formatRupiah(hargaSatuan)}/box`;
}

class StateManager {
    constructor() {
        this.state = {
            stok: 100,
            variants: cloneDefaultVariants(),
            transactions: [],
            totals: {
                belumLunas: 0,
                lunas: 0,
                cash: 0,
                transfer: 0,
                omzet: 0,
                modal: 0,
                untung: 0,
                untungLunas: 0,
            },
        };
        this.editingIndex = null;
        this.editingVariantId = null;
        this.confirmCallback = null;
        this.lastFocusedElement = null;
        this.noticeTimer = null;
    }

    init() {
        this.initTheme();
        this.loadState();
        this.setupEventListeners();
        this.setupTableHandlers();
        this.setupModalHandlers();
        this.syncMetodeWithStatus();
        document.getElementById('loadingState').classList.add('hidden');
        this.updateUI();
        this.updatePricePreview();
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

    getVariantById(id) {
        return this.state.variants.find((v) => v.id === id) || null;
    }

    toggleMobileMenu(forceOpen = null) {
        const menu = document.getElementById('headerControlsMenu');
        const btn = document.getElementById('mobileMenuBtn');
        const iconHam = document.getElementById('menuIconHamburger');
        const iconClose = document.getElementById('menuIconClose');

        const isOpen = menu.classList.contains('menu-open');
        const nextState = forceOpen !== null ? forceOpen : !isOpen;

        if (nextState) {
            menu.classList.add('menu-open');
            btn.setAttribute('aria-expanded', 'true');
            iconHam.classList.add('hidden');
            iconClose.classList.remove('hidden');
        } else {
            menu.classList.remove('menu-open');
            btn.setAttribute('aria-expanded', 'false');
            iconHam.classList.remove('hidden');
            iconClose.classList.add('hidden');
        }
    }

    showNotice(msg) {
        const banner = document.getElementById('globalNotice');
        document.getElementById('globalNoticeText').textContent = msg;
        banner.classList.remove('hidden');
        if (this.noticeTimer) clearTimeout(this.noticeTimer);
        this.noticeTimer = setTimeout(() => {
            banner.classList.add('hidden');
        }, 4500);
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

    showVariantError(msg) {
        const banner = document.getElementById('variantError');
        document.getElementById('variantErrorText').textContent = msg;
        banner.classList.remove('hidden');
    }

    hideVariantError() {
        document.getElementById('variantError').classList.add('hidden');
    }

    setupEventListeners() {
        document.getElementById('mobileMenuBtn').addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleMobileMenu();
        });

        document.addEventListener('click', (e) => {
            const menu = document.getElementById('headerControlsMenu');
            const btn = document.getElementById('mobileMenuBtn');
            if (
                menu.classList.contains('menu-open') &&
                !menu.contains(e.target) &&
                !btn.contains(e.target)
            ) {
                this.toggleMobileMenu(false);
            }
        });

        document.getElementById('themeToggleBtn').addEventListener('click', () => {
            const current = document.documentElement.getAttribute('data-theme');
            this.applyTheme(current === 'dark' ? 'light' : 'dark');
            this.toggleMobileMenu(false);
        });

        document.getElementById('openAddVariantBtn').addEventListener('click', (e) => {
            this.openVariantModal(null, e.currentTarget);
        });

        document.getElementById('downloadBackupBtn').addEventListener('click', () => {
            this.toggleMobileMenu(false);
            this.handleDownloadBackup();
        });

        const uploadInput = document.getElementById('uploadBackupInput');
        document.getElementById('uploadBackupBtn').addEventListener('click', () => {
            this.toggleMobileMenu(false);
            uploadInput.value = '';
            uploadInput.click();
        });

        uploadInput.addEventListener('change', (e) => {
            const file = e.target.files && e.target.files[0];
            if (file) {
                this.handleUploadBackup(file);
            }
        });

        document.getElementById('stokAwal').addEventListener('change', (e) => {
            const val = parseInt(e.target.value, 10);
            if (!isNaN(val) && val >= 0) {
                this.state.stok = val;
                this.saveState();
                this.updateUI();
                this.updatePricePreview();
            }
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
        const jenisId = document.getElementById('jenisPembeli').value;
        const variant = this.getVariantById(jenisId);
        const rawJumlah = parseInt(document.getElementById('jumlahTerjual').value, 10);
        const jumlah = Number.isInteger(rawJumlah) && rawJumlah > 0 ? rawJumlah : 0;

        if (!variant) {
            document.getElementById('previewNote').textContent = 'Tambahkan varian duren terlebih dahulu';
            document.getElementById('previewTotal').textContent = 'Rp 0';
            document.getElementById('previewModalNote').textContent = 'Modal: Rp 0';
            document.getElementById('previewProfit').textContent = 'Estimasi Untung: Rp 0';
            return;
        }

        const totalJual = hitungHargaVarian(variant, jumlah);
        const totalModal = hitungModalVarian(variant, jumlah);
        const untung = totalJual - totalModal;

        document.getElementById('previewNote').textContent = getInfoTarifVarian(variant, jumlah);
        document.getElementById('previewTotal').textContent = `Rp ${formatRupiah(totalJual)}`;
        document.getElementById('previewModalNote').textContent =
            jumlah > 0
                ? `Modal (${jumlah} box × Rp ${formatRupiah(variant.modalSatuan)}): Rp ${formatRupiah(totalModal)}`
                : `Modal satuan: Rp ${formatRupiah(variant.modalSatuan)}/box · Sisa Stok Umum: ${this.state.stok} box`;
        document.getElementById('previewProfit').textContent =
            jumlah > 0
                ? `Estimasi Untung: Rp ${formatRupiah(untung)}`
                : `Untung/box: Rp ${formatRupiah(variant.hargaJual - variant.modalSatuan)}`;
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
            const editVariantBtn = e.target.closest('.edit-variant-btn');
            if (editVariantBtn) {
                const id = editVariantBtn.dataset.id;
                this.openVariantModal(id, editVariantBtn);
                return;
            }

            const deleteVariantBtn = e.target.closest('.delete-variant-btn');
            if (deleteVariantBtn) {
                const id = deleteVariantBtn.dataset.id;
                this.handleDeleteVariant(id, deleteVariantBtn);
                return;
            }

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
        const variantModal = document.getElementById('variantModal');
        const editModal = document.getElementById('editModal');
        const confirmModal = document.getElementById('confirmModal');

        document.getElementById('cancelVariantBtn').addEventListener('click', () => this.closeVariantModal());
        document.getElementById('saveVariantBtn').addEventListener('click', () => this.saveVariant());

        variantModal.addEventListener('click', (e) => {
            if (e.target === variantModal) this.closeVariantModal();
        });

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
                if (!variantModal.classList.contains('hidden')) {
                    this.closeVariantModal();
                } else if (!editModal.classList.contains('hidden')) {
                    this.closeEditModal();
                } else if (!confirmModal.classList.contains('hidden')) {
                    this.closeConfirmModal();
                } else {
                    this.toggleMobileMenu(false);
                }
            }
        });
    }

    openVariantModal(variantId = null, triggerEl = null) {
        this.lastFocusedElement = triggerEl || document.activeElement;
        this.editingVariantId = variantId;
        this.hideVariantError();

        const titleEl = document.getElementById('variantModalTitle');
        const namaInput = document.getElementById('variantNamaInput');
        const hargaJualInput = document.getElementById('variantHargaJualInput');
        const hargaPaket3Input = document.getElementById('variantHargaPaket3Input');
        const modalInput = document.getElementById('variantModalInput');

        if (variantId) {
            const v = this.getVariantById(variantId);
            if (!v) return;
            titleEl.textContent = `Edit Varian: ${v.nama}`;
            namaInput.value = v.nama;
            hargaJualInput.value = v.hargaJual;
            hargaPaket3Input.value = v.hargaPaket3 || 0;
            modalInput.value = v.modalSatuan || 0;
        } else {
            titleEl.textContent = 'Tambah Varian Duren';
            namaInput.value = '';
            hargaJualInput.value = '';
            hargaPaket3Input.value = '0';
            modalInput.value = '';
        }

        document.getElementById('variantModal').classList.remove('hidden');
        namaInput.focus();
    }

    closeVariantModal() {
        document.getElementById('variantModal').classList.add('hidden');
        this.editingVariantId = null;
        this.hideVariantError();
        if (this.lastFocusedElement && typeof this.lastFocusedElement.focus === 'function') {
            this.lastFocusedElement.focus();
        }
    }

    saveVariant() {
        const nama = document.getElementById('variantNamaInput').value.trim();
        const hargaJual = parseInt(document.getElementById('variantHargaJualInput').value, 10);
        const rawPaket3 = parseInt(document.getElementById('variantHargaPaket3Input').value, 10);
        const hargaPaket3 = isNaN(rawPaket3) || rawPaket3 < 0 ? 0 : rawPaket3;
        const modalSatuan = parseInt(document.getElementById('variantModalInput').value, 10);

        if (!nama) {
            this.showVariantError('Nama varian duren wajib diisi.');
            document.getElementById('variantNamaInput').focus();
            return;
        }

        if (isNaN(hargaJual) || hargaJual < 0) {
            this.showVariantError('Harga jual per box wajib diisi dengan angka valid.');
            document.getElementById('variantHargaJualInput').focus();
            return;
        }

        if (isNaN(modalSatuan) || modalSatuan < 0) {
            this.showVariantError('Modal satuan per box wajib diisi (minimal 0).');
            document.getElementById('variantModalInput').focus();
            return;
        }

        if (this.editingVariantId) {
            const existing = this.getVariantById(this.editingVariantId);
            if (!existing) return;
            existing.nama = nama;
            existing.hargaJual = hargaJual;
            existing.hargaPaket3 = hargaPaket3;
            existing.modalSatuan = modalSatuan;

            for (const trx of this.state.transactions) {
                if (trx.jenis === existing.id) {
                    trx.namaVarian = nama;
                }
            }
            this.showNotice(`Varian "${nama}" berhasil diperbarui.`);
        } else {
            const slug =
                nama
                    .toLowerCase()
                    .replace(/[^a-z0-9]+/g, '_')
                    .replace(/^_|_$/g, '') || 'varian';
            const uniqueId = `${slug}_${Date.now().toString(36)}`;
            this.state.variants.push({
                id: uniqueId,
                nama,
                hargaJual,
                hargaPaket3,
                modalSatuan,
            });
            this.showNotice(`Varian "${nama}" berhasil ditambahkan.`);
        }

        this.recalculateTotals();
        this.saveState();
        this.updateUI();
        this.updatePricePreview();
        this.closeVariantModal();
    }

    handleDeleteVariant(variantId, triggerEl) {
        const v = this.getVariantById(variantId);
        if (!v) return;

        if (this.state.variants.length <= 1) {
            this.showFormError('Minimal harus ada 1 varian duren di katalog.');
            return;
        }

        this.openConfirmModal(
            'Hapus Varian Duren',
            `Hapus varian "${v.nama}" dari katalog? Catatan transaksi lama tetap tersimpan.`,
            () => {
                this.state.variants = this.state.variants.filter((item) => item.id !== variantId);
                this.saveState();
                this.updateUI();
                this.updatePricePreview();
                this.showNotice(`Varian "${v.nama}" telah dihapus.`);
            },
            triggerEl,
        );
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

        this.renderVariantSelects(trx.jenis);

        document.getElementById('editNama').textContent = trx.nama;
        document.getElementById('editJenisSelect').value = trx.jenis;
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
            omzet: 0,
            modal: 0,
            untung: 0,
            untungLunas: 0,
        };

        for (const trx of this.state.transactions) {
            const totalJual = Number(trx.total) || 0;
            const totalModal = Number(trx.totalModal) || 0;
            const untung = totalJual - totalModal;

            trx.untung = untung;
            totals.omzet += totalJual;
            totals.modal += totalModal;
            totals.untung += untung;

            if (trx.status === 'lunas') {
                totals.lunas += totalJual;
                totals.untungLunas += untung;
                if (trx.metode === 'cash' || trx.metode === 'transfer') {
                    totals[trx.metode] += totalJual;
                }
            } else {
                totals.belumLunas += totalJual;
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

        const newVariant = this.getVariantById(newJenis);
        if (!newVariant) {
            this.showEditError('Varian yang dipilih tidak ditemukan.');
            return;
        }

        const diff = newJumlah - trx.jumlah;
        if (diff > 0 && diff > this.state.stok) {
            this.showEditError(`Stok tidak cukup. Sisa stok saat ini: ${this.state.stok} box.`);
            return;
        }

        this.state.stok -= diff;
        trx.jumlah = newJumlah;
        trx.jenis = newJenis;
        trx.namaVarian = newVariant.nama;
        trx.modalSatuan = newVariant.modalSatuan;
        trx.total = hitungHargaVarian(newVariant, newJumlah);
        trx.totalModal = hitungModalVarian(newVariant, newJumlah);
        trx.untung = trx.total - trx.totalModal;

        this.recalculateTotals();
        this.saveState();
        this.updateUI();
        this.updatePricePreview();
        this.closeEditModal();
    }

    handleDelete(index, triggerEl) {
        const trx = this.state.transactions[index];
        if (!trx) return;

        this.openConfirmModal(
            'Hapus Transaksi',
            `Hapus catatan pembelian "${trx.nama}" (${trx.jumlah} box ${trx.namaVarian || ''})? Stok akan dikembalikan.`,
            () => {
                this.state.stok += trx.jumlah;
                this.state.transactions.splice(index, 1);
                this.recalculateTotals();
                this.saveState();
                this.updateUI();
                this.updatePricePreview();
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
        const jenisId = document.getElementById('jenisPembeli').value;
        const status = document.getElementById('statusPembayaran').value;
        const metode = document.getElementById('metodePembayaran').value;

        this.hideFormError();

        if (!nama) {
            this.showFormError('Nama pembeli wajib diisi.');
            document.getElementById('namaPembeli').focus();
            return;
        }

        const variant = this.getVariantById(jenisId);
        if (!variant) {
            this.showFormError('Silakan pilih atau tambahkan varian duren terlebih dahulu.');
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

        const total = hitungHargaVarian(variant, jumlah);
        const totalModal = hitungModalVarian(variant, jumlah);
        const untung = total - totalModal;

        this.state.stok = stokTersedia - jumlah;
        this.state.transactions.push({
            nama,
            jumlah,
            total,
            modalSatuan: variant.modalSatuan,
            totalModal,
            untung,
            jenis: variant.id,
            namaVarian: variant.nama,
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
            'Reset Daftar Transaksi',
            'Semua daftar transaksi penjualan akan dihapus dan stok dari transaksi tersebut dikembalikan (daftar varian dan harga tidak dihapus).',
            () => {
                const totalReturned = this.state.transactions.reduce((acc, trx) => acc + (trx.jumlah || 0), 0);
                this.state.stok += totalReturned;
                this.state.transactions = [];
                this.recalculateTotals();
                this.saveState();
                this.hideFormError();
                this.updateUI();
                this.updatePricePreview();
                this.showNotice('Semua transaksi berhasil direset dan stok telah dikembalikan.');
            },
            resetBtn,
        );
    }

    handleDownloadBackup() {
        const now = new Date();
        const yyyy = now.getFullYear();
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        const dd = String(now.getDate()).padStart(2, '0');

        const payload = {
            app: 'myDuren',
            version: 3,
            exportedAt: now.toISOString(),
            stok: this.state.stok,
            variants: this.state.variants,
            transactions: this.state.transactions,
            totals: this.state.totals,
        };

        const jsonStr = JSON.stringify(payload, null, 2);
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const link = document.createElement('a');
        link.href = url;
        link.download = `myduren-backup-${yyyy}-${mm}-${dd}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        this.showNotice(`Data berhasil diunduh (${link.download}). Simpan berkas ini sebagai cadangan.`);
    }

    handleUploadBackup(file) {
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const parsed = JSON.parse(event.target.result);
                if (!parsed || (!Array.isArray(parsed.variants) && !Array.isArray(parsed.transactions))) {
                    this.showFormError('Berkas JSON tidak valid atau bukan format cadangan myDuren.');
                    return;
                }

                const countVarian = Array.isArray(parsed.variants) ? parsed.variants.length : DEFAULT_VARIANTS.length;
                const countTrx = Array.isArray(parsed.transactions) ? parsed.transactions.length : 0;

                this.openConfirmModal(
                    'Pulihkan Data dari Berkas',
                    `Muat data dari "${file.name}" (${countVarian} varian, ${countTrx} transaksi)? Data saat ini akan digantikan oleh isi berkas tersebut.`,
                    () => {
                        this.applyImportedData(parsed);
                        this.saveState();
                        this.updateUI();
                        this.updatePricePreview();
                        this.showNotice(`Data dari "${file.name}" berhasil dimuat dan ditampilkan kembali.`);
                    },
                    document.getElementById('uploadBackupBtn'),
                );
            } catch {
                this.showFormError('Gagal membaca berkas JSON. Pastikan berkas tidak rusak.');
            }
        };
        reader.readAsText(file);
    }

    getStatusSelectClass(status) {
        return status === 'lunas' ? 'status-lunas' : 'status-belum';
    }

    getMetodeSelectClass(metode) {
        if (metode === 'cash') return 'metode-cash';
        if (metode === 'transfer') return 'metode-transfer';
        return '';
    }

    getTierBadgeHtml(trx) {
        const variant = this.getVariantById(trx.jenis);
        const label = trx.namaVarian || (variant ? variant.nama : trx.jenis || 'Reguler');
        const lower = String(label).toLowerCase();
        const isPremium = lower.includes('premium') || lower.includes('musang') || lower.includes('super');
        return `<span class="tier-badge ${isPremium ? 'tier-premium' : ''}">${escapeHtml(label)}</span>`;
    }

    renderVariantCatalog() {
        const container = document.getElementById('variantListContainer');
        const emptyState = document.getElementById('emptyVariantState');

        if (!this.state.variants.length) {
            container.innerHTML = '';
            emptyState.classList.remove('hidden');
            return;
        }

        emptyState.classList.add('hidden');
        container.innerHTML = this.state.variants
            .map((v) => {
                const safeNama = escapeHtml(v.nama);
                const safeId = escapeHtml(v.id);
                const marginPerBox = (Number(v.hargaJual) || 0) - (Number(v.modalSatuan) || 0);
                const paketText =
                    v.hargaPaket3 && v.hargaPaket3 > 0
                        ? ` · 3 box Rp ${formatRupiah(v.hargaPaket3)}`
                        : '';

                return `
                <div class="variant-item">
                    <div class="variant-info">
                        <div class="variant-name-row">
                            <p class="variant-name">${safeNama}</p>
                            <span class="variant-profit-pill num">
                                Untung Rp ${formatRupiah(marginPerBox)}/box
                            </span>
                        </div>
                        <div class="variant-metrics num">
                            <span>Jual: <strong>Rp ${formatRupiah(v.hargaJual)}</strong>/box${paketText}</span>
                            <span>Modal: <strong>Rp ${formatRupiah(v.modalSatuan)}</strong>/box</span>
                        </div>
                    </div>
                    <div class="action-group">
                        <button
                            type="button"
                            class="btn-action btn-edit edit-variant-btn"
                            data-id="${safeId}"
                            aria-label="Edit harga dan modal varian ${safeNama}"
                            title="Edit harga & modal"
                        >
                            <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
                        </button>
                        <button
                            type="button"
                            class="btn-action btn-delete delete-variant-btn"
                            data-id="${safeId}"
                            aria-label="Hapus varian ${safeNama}"
                            title="Hapus varian"
                        >
                            <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
                        </button>
                    </div>
                </div>
            `;
            })
            .join('');
    }

    renderVariantSelects(ensureVariantId = null) {
        const mainSelect = document.getElementById('jenisPembeli');
        const editSelect = document.getElementById('editJenisSelect');
        const currentMainVal = mainSelect.value;

        const optionsHtml = this.state.variants
            .map((v) => {
                const safeNama = escapeHtml(v.nama);
                const safeId = escapeHtml(v.id);
                const paketNote =
                    v.hargaPaket3 && v.hargaPaket3 > 0 ? ` · 3 box Rp ${formatRupiah(v.hargaPaket3)}` : '';
                return `<option value="${safeId}">${safeNama} (Rp ${formatRupiah(v.hargaJual)}/box${paketNote})</option>`;
            })
            .join('');

        mainSelect.innerHTML = optionsHtml;
        editSelect.innerHTML = optionsHtml;

        if (currentMainVal && this.getVariantById(currentMainVal)) {
            mainSelect.value = currentMainVal;
        } else if (this.state.variants.length > 0) {
            mainSelect.value = this.state.variants[0].id;
        }

        if (ensureVariantId && !this.getVariantById(ensureVariantId)) {
            editSelect.innerHTML += `<option value="${escapeHtml(ensureVariantId)}">${escapeHtml(ensureVariantId)} (Varian Lama)</option>`;
        }
    }

    updateFooterSummary() {
        const footerEl = document.getElementById('footerPricingSummary');
        if (!this.state.variants.length) {
            footerEl.textContent = 'Belum ada varian terdaftar';
            return;
        }
        footerEl.textContent = this.state.variants
            .map((v) => {
                const paket = v.hargaPaket3 > 0 ? ` (3 box ${formatRupiah(v.hargaPaket3)})` : '';
                return `${v.nama}: Rp ${formatRupiah(v.hargaJual)}${paket}`;
            })
            .join(' · ');
    }

    updateUI() {
        this.renderVariantCatalog();
        this.renderVariantSelects();
        this.updateFooterSummary();

        document.getElementById('stokAwal').value = this.state.stok;
        document.getElementById('headerStokBadge').textContent = formatRupiah(this.state.stok);

        const totalBoxTerjual = this.state.transactions.reduce((acc, item) => acc + (item.jumlah || 0), 0);
        document.getElementById('totalBoxTerjualLabel').textContent = `${formatRupiah(totalBoxTerjual)} box terjual`;

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
                    const totalModal = Number(trx.totalModal) || 0;
                    const untung = Number(trx.untung) || 0;

                    return `
                <tr>
                    <td>
                        <div style="font-weight: 700;">${safeNama}</div>
                        ${this.getTierBadgeHtml(trx)}
                    </td>
                    <td class="col-center num" style="font-weight: 700;">${trx.jumlah}</td>
                    <td class="col-right num">
                        <div style="font-weight: 700;">Rp ${formatRupiah(trx.total)}</div>
                        <div class="trx-profit-line">
                            Modal Rp ${formatRupiah(totalModal)} · <span class="trx-profit-val">Untung Rp ${formatRupiah(untung)}</span>
                        </div>
                    </td>
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
                    const totalModal = Number(trx.totalModal) || 0;
                    const untung = Number(trx.untung) || 0;

                    return `
                <div class="transaction-card">
                    <div class="card-top">
                        <div>
                            <p class="card-buyer-name">${safeNama}</p>
                            <p class="card-meta num">${trx.jumlah} box · Jual Rp ${formatRupiah(trx.total)}</p>
                            <p class="trx-profit-line num">
                                Modal Rp ${formatRupiah(totalModal)} · <span class="trx-profit-val">Untung Rp ${formatRupiah(untung)}</span>
                            </p>
                            ${this.getTierBadgeHtml(trx)}
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

        document.getElementById('totalOmzet').textContent = formatRupiah(this.state.totals.omzet);
        document.getElementById('totalModal').textContent = formatRupiah(this.state.totals.modal);
        document.getElementById('totalUntung').textContent = formatRupiah(this.state.totals.untung);
        document.getElementById('totalUntungLunas').textContent = formatRupiah(this.state.totals.untungLunas);
        document.getElementById('totalBelumLunas').textContent = formatRupiah(this.state.totals.belumLunas);
        document.getElementById('totalLunas').textContent = formatRupiah(this.state.totals.lunas);
        document.getElementById('totalCash').textContent = formatRupiah(this.state.totals.cash);
        document.getElementById('totalTransfer').textContent = formatRupiah(this.state.totals.transfer);
    }

    resetForm() {
        document.getElementById('namaPembeli').value = '';
        document.getElementById('jumlahTerjual').value = '';
        this.updatePricePreview();
    }

    saveState() {
        localStorage.setItem('myDurenState', JSON.stringify(this.state));
    }

    applyImportedData(parsed) {
        if (typeof parsed.stok === 'number' && parsed.stok >= 0) {
            this.state.stok = Math.round(parsed.stok);
        } else if (Array.isArray(parsed.variants)) {
            const sumVariantStok = parsed.variants.reduce((acc, v) => acc + (parseInt(v.stok, 10) || 0), 0);
            this.state.stok = sumVariantStok > 0 ? sumVariantStok : 100;
        } else {
            this.state.stok = 100;
        }

        if (Array.isArray(parsed.variants) && parsed.variants.length > 0) {
            this.state.variants = parsed.variants.map((v, idx) => ({
                id: String(v.id || `varian_${idx}`),
                nama: String(v.nama || `Varian ${idx + 1}`),
                hargaJual: Math.max(0, Number(v.hargaJual) || 0),
                hargaPaket3: Math.max(0, Number(v.hargaPaket3) || 0),
                modalSatuan: Math.max(0, Number(v.modalSatuan) || 0),
            }));
        } else {
            this.state.variants = cloneDefaultVariants();
        }

        if (Array.isArray(parsed.transactions)) {
            this.state.transactions = parsed.transactions.map((trx) => {
                const jenis = trx.jenis || (this.state.variants[0] ? this.state.variants[0].id : 'reguler');
                const variant = this.getVariantById(jenis) || this.state.variants[0];
                const jumlah = Math.max(1, parseInt(trx.jumlah, 10) || 1);
                const total =
                    typeof trx.total === 'number' ? trx.total : hitungHargaVarian(variant, jumlah);
                const modalSatuan =
                    typeof trx.modalSatuan === 'number'
                        ? trx.modalSatuan
                        : variant
                          ? variant.modalSatuan
                          : 0;
                const totalModal =
                    typeof trx.totalModal === 'number' ? trx.totalModal : jumlah * modalSatuan;
                const untung = total - totalModal;

                return {
                    nama: String(trx.nama || 'Pembeli'),
                    jumlah,
                    jenis,
                    namaVarian: trx.namaVarian || (variant ? variant.nama : jenis),
                    total,
                    modalSatuan,
                    totalModal,
                    untung,
                    status: trx.status === 'belum lunas' ? 'belum lunas' : 'lunas',
                    metode:
                        trx.status === 'belum lunas'
                            ? 'belum lunas'
                            : trx.metode === 'transfer'
                              ? 'transfer'
                              : 'cash',
                    originalMetode: trx.originalMetode || (trx.metode === 'transfer' ? 'transfer' : 'cash'),
                };
            });
        } else {
            this.state.transactions = [];
        }

        this.recalculateTotals();
    }

    loadState() {
        const saved = localStorage.getItem('myDurenState');
        if (!saved) return;

        try {
            const parsed = JSON.parse(saved);
            if (parsed && (Array.isArray(parsed.transactions) || Array.isArray(parsed.variants))) {
                this.applyImportedData(parsed);
            }
        } catch {
            this.showFormError('Data tersimpan rusak. Silakan unggah cadangan JSON atau klik Reset Transaksi.');
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const app = new StateManager();
    app.init();
});
