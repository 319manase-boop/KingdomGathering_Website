// Admin Giving Records management

const givingSearch = document.getElementById('givingSearch');
const paymentStatusFilter = document.getElementById('paymentStatusFilter');
const givingTypeFilter = document.getElementById('givingTypeFilter');
const givingTableBody = document.getElementById('givingTableBody');
const givingAlertContainer = document.getElementById('givingAlertContainer');
const adminUserEmail = document.getElementById('adminUserEmail');
const logoutButton = document.getElementById('logoutButton');
const sidebarLogout = document.getElementById('sidebarLogout');
const exportCSV = document.getElementById('exportCSV');
const totalGiven = document.getElementById('totalGiven');
const totalPending = document.getElementById('totalPending');
const totalReceived = document.getElementById('totalReceived');
const refreshBtn = document.getElementById('refreshBtn') || document.querySelector('[data-action="refresh"]');

let giving = [];
let selectedRecord = null;
let isLoading = false;

async function protectPage() {
    return await checkPagePermission('giving');
}

function formatDate(value) {
    try { return new Date(value).toLocaleString(); } catch (e) { return ''; }
}

function formatCurrency(amount, currency) {
    const symbols = { USD: '$', GBP: '£', EUR: '€', BWP: 'P' };
    return `${symbols[currency] || currency} ${parseFloat(amount || 0).toFixed(2)}`;
}

function showAlert(type, message, timeout = 4000) {
    const el = document.createElement('div');
    el.className = `alert alert-${type} alert-dismissible fade show`;
    el.role = 'alert';
    el.innerHTML = `${message} <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>`;
    givingAlertContainer.appendChild(el);
    if (timeout) setTimeout(() => { el.classList.remove('show'); el.remove(); }, timeout);
}

async function loadGiving() {
    if (isLoading) {
        console.log("Load already in progress, skipping...");
        return;
    }
    
    isLoading = true;
    console.log("=== LOAD GIVING START ===");
    
    try {
        console.log("Operation: fetch all giving records");
        console.log("Query: select * from giving_records order by created_at desc");
        
        const { data, error } = await supabaseClient
            .from('giving_records')
            .select('*')
            .order('created_at', { ascending: false });

        console.log("Response (giving records):", data);
        console.log("Error (giving records):", error);
        console.log("Total records fetched:", data ? data.length : 0);

        if (error) {
            console.error("❌ Load failed:", error);
            showAlert('danger', 'Unable to load giving records.');
            givingTableBody.innerHTML = '<tr><td colspan="11" class="text-center">Unable to load data.</td></tr>';
            return;
        }

        giving = data || [];
        console.log("✅ LOAD GIVING SUCCESS");
        console.log("Records breakdown:");
        const byStatus = {};
        giving.forEach(g => {
            const status = g.payment_status || 'pending';
            byStatus[status] = (byStatus[status] || 0) + 1;
        });
        console.log(byStatus);
        
        updateStats();
        renderTable(giving);
        showAlert('success', `Loaded ${giving.length} giving records.`, 2000);
    } catch (err) {
        console.error("❌ Exception:", err);
        showAlert('danger', 'Unable to load giving records.');
        givingTableBody.innerHTML = '<tr><td colspan="11" class="text-center">Unable to load data.</td></tr>';
    } finally {
        isLoading = false;
    }
}

function updateStats() {
    const total = giving.reduce((sum, g) => sum + (parseFloat(g.amount) || 0), 0);
    const pending = giving
        .filter(g => g.payment_status === 'Pending')
        .reduce((sum, g) => sum + (parseFloat(g.amount) || 0), 0);
    const received = giving
        .filter(g => g.payment_status === 'Received')
        .reduce((sum, g) => sum + (parseFloat(g.amount) || 0), 0);

    totalGiven.textContent = total.toFixed(2);
    totalPending.textContent = pending.toFixed(2);
    totalReceived.textContent = received.toFixed(2);
}

function escapeHtml(str) {
    return String(str || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function badgeClass(status) {
    if (!status) return 'bg-secondary';
    switch (status.toLowerCase()) {
        case 'received': return 'bg-success';
        case 'rejected': return 'bg-danger';
        default: return 'bg-warning text-dark';
    }
}

function renderTable(list) {
    if (!list.length) {
        givingTableBody.innerHTML = '<tr><td colspan="11" class="text-center py-4">No records found.</td></tr>';
        return;
    }

    givingTableBody.innerHTML = list.map(item => `
        <tr data-id="${item.id}">
            <td>${escapeHtml(item.first_name || '')}</td>
            <td>${escapeHtml(item.last_name || '')}</td>
            <td>${escapeHtml(item.email || '')}</td>
            <td>${escapeHtml(item.phone || '')}</td>
            <td>${formatCurrency(item.amount, item.currency)}</td>
            <td>${escapeHtml(item.currency || '')}</td>
            <td>${escapeHtml(item.giving_type || '')}</td>
            <td><span class="badge ${badgeClass(item.payment_status)}">${escapeHtml(item.payment_status || 'Pending')}</span></td>
            <td>${escapeHtml(item.payment_reference || '')}</td>
            <td>${formatDate(item.created_at)}</td>
            <td class="text-end">
                <button class="btn btn-sm btn-outline-light me-2 view-btn">View</button>
                <button class="btn btn-sm btn-success me-2 mark-received-btn" ${item.payment_status === 'Received' ? 'disabled' : ''}>Received</button>
                <button class="btn btn-sm btn-danger mark-rejected-btn" ${item.payment_status === 'Rejected' ? 'disabled' : ''}>Rejected</button>
            </td>
        </tr>
    `).join('');
}

function applyFilters() {
    const q = (givingSearch.value || '').trim().toLowerCase();
    const status = paymentStatusFilter.value;
    const type = givingTypeFilter.value;

    const filtered = giving.filter(g => {
        const matchesQuery = !q || (
            (g.first_name || '').toLowerCase().includes(q) ||
            (g.last_name || '').toLowerCase().includes(q) ||
            (g.email || '').toLowerCase().includes(q) ||
            (g.phone || '').toLowerCase().includes(q) ||
            (g.payment_reference || '').toLowerCase().includes(q)
        );
        const matchesStatus = !status || (g.payment_status === status);
        const matchesType = !type || (g.giving_type === type);
        return matchesQuery && matchesStatus && matchesType;
    });

    renderTable(filtered);
}

async function updatePaymentStatus(id, newStatus) {
    try {
        const { data, error } = await supabaseClient
            .from('giving_records')
            .update({ payment_status: newStatus })
            .eq('id', id)
            .select();

        if (error) {
            console.error(error);
            showAlert('danger', `Unable to update record (${error.message}).`);
            return false;
        }

        giving = giving.map(g => g.id === id ? { ...g, ...data[0] } : g);
        updateStats();
        applyFilters();
        showAlert('success', `Record updated to "${newStatus}".`);
        return true;
    } catch (err) {
        console.error(err);
        showAlert('danger', 'Unable to update record.');
        return false;
    }
}

givingTableBody?.addEventListener('click', async (e) => {
    const tr = e.target.closest('tr');
    if (!tr) return;
    const id = tr.getAttribute('data-id');
    const item = giving.find(g => String(g.id) === String(id));

    if (e.target.classList.contains('view-btn')) {
        selectedRecord = item;
        openModal(item);
    }

    if (e.target.classList.contains('mark-received-btn')) {
        await updatePaymentStatus(item.id, 'Received');
    }

    if (e.target.classList.contains('mark-rejected-btn')) {
        await updatePaymentStatus(item.id, 'Rejected');
    }
});

function openModal(item) {
    if (typeof bootstrap === "undefined") {
        console.error("Bootstrap is not loaded");
        showAlert("danger", "Bootstrap is not loaded.");
        return;
    }

    const modalElement = document.getElementById("givingModal");
    if (!modalElement) {
        console.error("givingModal not found");
        return;
    }

    const modal = new bootstrap.Modal(modalElement);
    const container = document.getElementById('givingModalBody');
    container.innerHTML = `
        <dl class="row">
            <dt class="col-sm-4">Name</dt><dd class="col-sm-8">${escapeHtml(item.first_name || '')} ${escapeHtml(item.last_name || '')}</dd>
            <dt class="col-sm-4">Email</dt><dd class="col-sm-8">${escapeHtml(item.email || '')}</dd>
            <dt class="col-sm-4">Phone</dt><dd class="col-sm-8">${escapeHtml(item.phone || '')}</dd>
            <dt class="col-sm-4">Amount</dt><dd class="col-sm-8">${formatCurrency(item.amount, item.currency)}</dd>
            <dt class="col-sm-4">Giving Type</dt><dd class="col-sm-8">${escapeHtml(item.giving_type || '')}</dd>
            <dt class="col-sm-4">Payment Status</dt><dd class="col-sm-8">${escapeHtml(item.payment_status || 'Pending')}</dd>
            <dt class="col-sm-4">Payment Reference</dt><dd class="col-sm-8">${escapeHtml(item.payment_reference || '')}</dd>
            <dt class="col-sm-4">Created</dt><dd class="col-sm-8">${formatDate(item.created_at)}</dd>
        </dl>
    `;

    document.getElementById('givingMarkReceived').onclick = async () => {
        if (!item) return;
        const ok = await updatePaymentStatus(item.id, 'Received');
        if (ok) modal.hide();
    };

    document.getElementById('givingMarkRejected').onclick = async () => {
        if (!item) return;
        const ok = await updatePaymentStatus(item.id, 'Rejected');
        if (ok) modal.hide();
    };

    modal.show();
}

function exportToCSV() {
    if (!giving.length) {
        showAlert('warning', 'No records to export.');
        return;
    }

    const headers = ['First Name', 'Last Name', 'Email', 'Phone', 'Amount', 'Currency', 'Giving Type', 'Payment Status', 'Payment Reference', 'Created At'];
    const rows = giving.map(g => [
        g.first_name || '',
        g.last_name || '',
        g.email || '',
        g.phone || '',
        g.amount || '',
        g.currency || '',
        g.giving_type || '',
        g.payment_status || '',
        g.payment_reference || '',
        formatDate(g.created_at)
    ]);

    const csv = [
        headers.map(h => `"${h}"`).join(','),
        ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `giving-records-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    showAlert('success', 'Exported successfully.');
}

givingSearch?.addEventListener('input', () => applyFilters());
paymentStatusFilter?.addEventListener('change', () => applyFilters());
givingTypeFilter?.addEventListener('change', () => applyFilters());
exportCSV?.addEventListener('click', exportToCSV);

const signOutAndRedirect = async () => { await supabaseClient.auth.signOut(); window.location.href = './login.html'; };
logoutButton?.addEventListener('click', signOutAndRedirect);
sidebarLogout?.addEventListener('click', async (event) => { event.preventDefault(); await signOutAndRedirect(); });

// Refresh button to reload giving records (useful after form submissions)
if (refreshBtn) {
    refreshBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        console.log("Manual refresh clicked by admin");
        refreshBtn.disabled = true;
        refreshBtn.innerHTML = refreshBtn.innerHTML.replace(/Refresh|🔄/, '⏳ Loading...');
        
        await loadGiving();
        
        refreshBtn.disabled = false;
        refreshBtn.innerHTML = refreshBtn.innerHTML.replace(/Loading|⏳/, '🔄') || '🔄 Refresh';
    });
}

(async function init() {
    const session = await protectPage();
    if (!session) return;
    adminUserEmail.textContent = session.user.email || 'Admin';
    await loadGiving();
})();
