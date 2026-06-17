// Admin Prayer Requests Management - Premium UI

const prayerSearch = document.getElementById('prayerSearch');
const statusFilter = document.getElementById('statusFilter');
const prayerTableBody = document.getElementById('prayerTableBody');
const prayerAlertContainer = document.getElementById('prayerAlertContainer');
const adminUserEmail = document.getElementById('adminUserEmail');
const logoutButton = document.getElementById('logoutButton');
const sidebarLogout = document.getElementById('sidebarLogout');
const refreshBtn = document.getElementById('refreshBtn');

const totalPrayersEl = document.getElementById('totalPrayers');
const newPrayersEl = document.getElementById('newPrayers');
const prayedPrayersEl = document.getElementById('prayedPrayers');
const archivedPrayersEl = document.getElementById('archivedPrayers');
const paginationContainer = document.getElementById('paginationContainer');

let prayers = [];
let selectedPrayer = null;
let currentPage = 1;
const itemsPerPage = 10;

async function protectPage() {
    return await checkPagePermission('prayer');
}

function formatDate(value) {
    try {
        return new Date(value).toLocaleString();
    } catch (e) {
        return '';
    }
}

function showAlert(type, message, timeout = 4000) {
    if (!prayerAlertContainer) {
        console.error("showAlert: prayerAlertContainer element not found");
        return;
    }
    const el = document.createElement('div');
    el.className = `alert alert-${type} alert-dismissible fade show`;
    el.role = 'alert';
    el.innerHTML = `${message} <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>`;
    prayerAlertContainer.appendChild(el);
    if (timeout) setTimeout(() => { el.classList.remove('show'); el.classList.add('hide'); el.remove(); }, timeout);
}

async function loadPrayers() {
    if (!prayerTableBody) {
        console.error("loadPrayers: prayerTableBody element not found in DOM");
        return;
    }
    const tableBodyContainer = prayerTableBody;

    showLoadingSpinner(tableBodyContainer);
    try {
        console.log("=== LOAD PRAYERS START ===");
        const { data, error } = await supabaseClient
            .from('prayer_requests')
            .select('*')
            .order('created_at', { ascending: false });

        console.log("Prayer data:", data);
        console.log("Prayer error:", error);

        if (error) {
            console.error("❌ Prayer load failed:", error);
            showAlert('danger', 'Unable to load prayer requests.');
            prayerTableBody.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center py-5">Unable to load prayer requests</td>
                </tr>
            `;
            return;
        }

        prayers = (data || []).map(item => ({
            id: item.id,
            name: item.name || '',
            email: item.email || '',
            phone: item.phone || '',
            message: item.message || '',
            status: item.status || 'New',
            created_at: item.created_at
        }));

        console.log("✅ LOAD PRAYERS SUCCESS - Loaded", prayers.length, "prayers");
        updateStatistics();
        renderPaginatedTable();
    } catch (error) {
        console.error("❌ Exception:", error);
        showAlert('danger', 'Unable to load prayer requests.');
        prayerTableBody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center py-5">An unexpected error occurred</td>
            </tr>
        `;
    }
}

function updateStatistics() {
    const total = prayers.length;
    const newCount = prayers.filter(p => p.status === 'New').length;
    const prayedCount = prayers.filter(p => p.status === 'Prayed').length;
    const archivedCount = prayers.filter(p => p.status === 'Archived').length;
    
    if (totalPrayersEl) animateCount(totalPrayersEl, total);
    if (newPrayersEl) animateCount(newPrayersEl, newCount);
    if (prayedPrayersEl) animateCount(prayedPrayersEl, prayedCount);
    if (archivedPrayersEl) animateCount(archivedPrayersEl, archivedCount);
}

function animateCount(element, targetValue) {
    const duration = 600;
    const interval = 30;
    const steps = Math.ceil(duration / interval);
    let currentStep = 0;
    const increment = targetValue / steps;

    element.textContent = '0';
    const timer = setInterval(() => {
        currentStep += 1;
        const value = Math.min(Math.round(increment * currentStep), targetValue);
        element.textContent = value.toLocaleString();

        if (value >= targetValue) {
            clearInterval(timer);
            element.textContent = targetValue.toLocaleString();
        }
    }, interval);
}

function renderPaginatedTable() {
    if (!prayerTableBody) {
        console.error("renderPaginatedTable: prayerTableBody is null");
        return;
    }

    if (!prayerTableBody.parentElement) {
        console.warn("renderPaginatedTable: prayerTableBody.parentElement is null");
        prayerTableBody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center py-5">No prayer requests found</td>
            </tr>
        `;
        return;
    }

    const table = prayerTableBody.closest('table');
    const container = prayerTableBody.closest('.table-responsive');
    if (!table || !container) {
        console.warn("Table container not found");
        prayerTableBody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center py-5">No prayer requests found</td>
            </tr>
        `;
        return;
    }

    const filtered = getFilteredPrayers();
    const paginated = paginateArray(filtered, currentPage, itemsPerPage);

    if (filtered.length === 0) {
        prayerTableBody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center py-5">No prayer requests found</td>
            </tr>
        `;
        if (paginationContainer) {
            paginationContainer.innerHTML = '';
        }
        return;
    }

    renderTable(paginated.data);
    if (paginationContainer) {
        renderPaginationControls(paginationContainer, paginated.currentPage, paginated.totalPages, changePage);
    }
}

function getFilteredPrayers() {
    const q = (prayerSearch?.value || '').trim().toLowerCase();
    const status = statusFilter?.value || '';

    return prayers.filter(p => {
        const matchesQuery = !q || ((p.name || '').toLowerCase().includes(q) || (p.email || '').toLowerCase().includes(q));
        const matchesStatus = !status || (p.status === status);
        return matchesQuery && matchesStatus;
    });
}

function changePage(pageNum) {
    currentPage = pageNum;
    renderPaginatedTable();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function renderTable(list) {
    if (!prayerTableBody) {
        console.error("renderTable: prayerTableBody is null");
        return;
    }
    if (!list.length) {
        prayerTableBody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center py-5">No prayer requests found</td>
            </tr>
        `;
        return;
    }

    prayerTableBody.innerHTML = list.map(item => `
        <tr data-id="${item.id}">
            <td>
                <strong>${escapeHtml(item.name || '')}</strong>
            </td>
            <td>
                <div style="font-size: 0.9rem;">${escapeHtml(item.email || '')}</div>
                <div style="font-size: 0.85rem; color: var(--admin-text-muted);">${escapeHtml(item.phone || '')}</div>
            </td>
            <td title="${escapeHtml(item.message || '')}">${escapeHtml(truncateText(item.message, 60))}</td>
            <td>${renderStatusBadge(item.status || 'New')}</td>
            <td style="font-size: 0.9rem;">${formatDate(item.created_at)}</td>
            <td class="text-end">
                <div class="table-actions">
                    <button class="btn btn-sm btn-outline-light view-btn" title="View" data-id="${item.id}">👁</button>
                    <button class="btn btn-sm btn-outline-light mark-prayed-btn" title="Mark Prayed" data-id="${item.id}" ${item.status === 'Prayed' ? 'disabled' : ''}>✓</button>
                    <button class="btn btn-sm btn-outline-danger delete-btn" title="Delete" data-id="${item.id}">🗑️</button>
                </div>
            </td>
        </tr>
    `).join('');

    attachTableEventListeners();
}

function attachTableEventListeners() {
    document.querySelectorAll('.view-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = e.target.getAttribute('data-id');
            const row = prayers.find(p => String(p.id) === String(id));
            if (row) openModal(row);
        });
    });

    document.querySelectorAll('.mark-prayed-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const id = e.target.getAttribute('data-id');
            const row = prayers.find(p => String(p.id) === String(id));
            if (row) await updateStatus(row.id, 'Prayed');
        });
    });

    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const id = e.target.getAttribute('data-id');
            const row = prayers.find(p => String(p.id) === String(id));
            if (row && await confirmAction(`Delete prayer request from ${escapeHtml(row.name)}?`)) {
                await deletePrayer(row.id);
            }
        });
    });
}

async function deletePrayer(id) {
    try {
        const { error } = await supabaseClient
            .from('prayer_requests')
            .delete()
            .eq('id', id);

        if (error) {
            console.error(error);
            showAlert('danger', 'Unable to delete prayer request.');
            return;
        }

        prayers = prayers.filter(p => p.id !== id);
        updateStatistics();
        renderPaginatedTable();
        showAlert('success', 'Prayer request deleted.');
    } catch (err) {
        console.error(err);
        showAlert('danger', 'Unable to delete prayer request.');
    }
}

async function updateStatus(id, newStatus) {
    try {
        const { data, error } = await supabaseClient
            .from('prayer_requests')
            .update({ status: newStatus })
            .eq('id', id)
            .select();

        if (error) {
            console.error(error);
            showAlert('danger', `Unable to update request (${error.message}).`);
            return false;
        }

        prayers = prayers.map(p => p.id === id ? { ...p, ...data[0] } : p);
        updateStatistics();
        renderPaginatedTable();
        showAlert('success', `Request marked as ${newStatus}.`);
        return true;
    } catch (err) {
        console.error(err);
        showAlert('danger', 'Unable to update request.');
        return false;
    }
}

function openModal(item) {
    const modalEl = document.getElementById('prayerModal');
    if (!modalEl) {
        console.error("openModal: prayerModal element not found");
        return;
    }

    const modal = new bootstrap.Modal(modalEl);
    const container = document.getElementById('modalBodyContent');
    if (!container) {
        console.error("openModal: modalBodyContent element not found");
        return;
    }

    container.innerHTML = `
        <dl class="row" style="margin-bottom: 0;">
            <dt class="col-sm-3 fw-600">Name</dt><dd class="col-sm-9">${escapeHtml(item.name || '')}</dd>
            <dt class="col-sm-3 fw-600">Email</dt><dd class="col-sm-9">${escapeHtml(item.email || '')}</dd>
            <dt class="col-sm-3 fw-600">Phone</dt><dd class="col-sm-9">${escapeHtml(item.phone || '')}</dd>
            <dt class="col-sm-3 fw-600">Status</dt><dd class="col-sm-9">${renderStatusBadge(item.status || 'New')}</dd>
            <dt class="col-sm-3 fw-600">Date</dt><dd class="col-sm-9">${formatDate(item.created_at)}</dd>
            <dt class="col-sm-3 fw-600">Request</dt><dd class="col-sm-9"><p style="white-space: pre-wrap;">${escapeHtml(item.message || '')}</p></dd>
        </dl>
    `;

    const markPrayedBtn = document.getElementById('modalMarkPrayed');
    const archiveBtn = document.getElementById('modalArchive');
    const deleteBtn = document.getElementById('modalDelete');

    if (markPrayedBtn) {
        markPrayedBtn.onclick = async () => {
            const ok = await updateStatus(item.id, 'Prayed');
            if (ok) modal.hide();
        };
    } else {
        console.error("openModal: modalMarkPrayed button not found");
    }

    if (archiveBtn) {
        archiveBtn.onclick = async () => {
            const ok = await updateStatus(item.id, 'Archived');
            if (ok) modal.hide();
        };
    } else {
        console.error("openModal: modalArchive button not found");
    }

    if (deleteBtn) {
        deleteBtn.onclick = async () => {
            if (await confirmAction(`Delete prayer request from ${escapeHtml(item.name)}?`)) {
                await deletePrayer(item.id);
                modal.hide();
            }
        };
    } else {
        console.error("openModal: modalDelete button not found");
    }

    modal.show();
}

prayerSearch?.addEventListener('input', () => { currentPage = 1; renderPaginatedTable(); });
statusFilter?.addEventListener('change', () => { currentPage = 1; renderPaginatedTable(); });
refreshBtn?.addEventListener('click', () => loadPrayers());

const signOutAndRedirect = async () => {
    await supabaseClient.auth.signOut();
    window.location.href = './login.html';
};

logoutButton?.addEventListener('click', signOutAndRedirect);
sidebarLogout?.addEventListener('click', async (event) => { event.preventDefault(); await signOutAndRedirect(); });

// initialization
(async function init() {
    const session = await protectPage();
    if (!session) return;
    adminUserEmail.textContent = session.user.email || 'Admin';
    await loadPrayers();
})();
