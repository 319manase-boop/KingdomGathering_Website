// Admin Counseling Requests management

const counselingSearch = document.getElementById('counselingSearch');
const counselingStatusFilter = document.getElementById('counselingStatusFilter');
const counselingTableBody = document.getElementById('counselingTableBody');
const counselingAlertContainer = document.getElementById('counselingAlertContainer');
const adminUserEmail = document.getElementById('adminUserEmail');
const logoutButton = document.getElementById('logoutButton');
const sidebarLogout = document.getElementById('sidebarLogout');

let counseling = [];
let selectedRequest = null;

async function protectPage() {
    return await checkPagePermission('counseling');
}

function formatDate(value) {
    try { return new Date(value).toLocaleString(); } catch (e) { return ''; }
}

function showAlert(type, message, timeout = 4000) {
    const el = document.createElement('div');
    el.className = `alert alert-${type} alert-dismissible fade show`;
    el.role = 'alert';
    el.innerHTML = `${message} <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>`;
    counselingAlertContainer.appendChild(el);
    if (timeout) setTimeout(() => { el.classList.remove('show'); el.classList.add('hide'); el.remove(); }, timeout);
}

async function loadCounseling() {
    try {
        const { data, error } = await supabaseClient
            .from('counseling_requests')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error(error);
            showAlert('danger', 'Unable to load counseling requests.');
            counselingTableBody.innerHTML = '<tr><td colspan="8" class="text-center">Unable to load data.</td></tr>';
            return;
        }

        counseling = data || [];
        renderTable(counseling);
    } catch (err) {
        console.error(err);
        showAlert('danger', 'Unable to load counseling requests.');
        counselingTableBody.innerHTML = '<tr><td colspan="8" class="text-center">Unable to load data.</td></tr>';
    }
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
        case 'contacted': return 'bg-info';
        case 'completed': return 'bg-success';
        case 'archived': return 'bg-secondary';
        default: return 'bg-warning text-dark';
    }
}

function renderTable(list) {
    if (!list.length) {
        counselingTableBody.innerHTML = '<tr><td colspan="8" class="text-center py-4">No requests found.</td></tr>';
        return;
    }

    counselingTableBody.innerHTML = list.map(item => {
        const preview = (item.message || '').length > 100 ? (item.message || '').slice(0, 100) + '...' : (item.message || '');
        return `
            <tr data-id="${item.id}">
                <td>${escapeHtml(item.name)}</td>
                <td>${escapeHtml(item.email)}</td>
                <td>${escapeHtml(item.phone || '')}</td>
                <td>${escapeHtml(item.preferred_contact || '')}</td>
                <td class="truncate-2" title="${escapeHtml(item.message || '')}">${escapeHtml(preview)}</td>
                <td><span class="badge ${badgeClass(item.status)}">${escapeHtml(item.status || 'New')}</span></td>
                <td>${formatDate(item.created_at)}</td>
                <td class="text-end">
                    <button class="btn btn-sm btn-outline-light me-2 view-btn">View</button>
                    <button class="btn btn-sm btn-info text-dark me-2 mark-contacted-btn" ${item.status === 'Contacted' || item.status === 'Completed' ? 'disabled' : ''}>Contacted</button>
                    <button class="btn btn-sm btn-success me-2 mark-completed-btn" ${item.status === 'Completed' ? 'disabled' : ''}>Completed</button>
                    <button class="btn btn-sm btn-outline-secondary archive-btn">Archive</button>
                </td>
            </tr>
        `;
    }).join('');
}

function applyFilters() {
    const q = (counselingSearch.value || '').trim().toLowerCase();
    const status = counselingStatusFilter.value;

    const filtered = counseling.filter(c => {
        const matchesQuery = !q || ((c.name || '').toLowerCase().includes(q) || (c.email || '').toLowerCase().includes(q) || (c.phone || '').toLowerCase().includes(q));
        const matchesStatus = !status || (c.status === status);
        return matchesQuery && matchesStatus;
    });

    renderTable(filtered);
}

async function updateStatus(id, newStatus) {
    try {
        const { data, error } = await supabaseClient
            .from('counseling_requests')
            .update({ status: newStatus })
            .eq('id', id)
            .select();

        if (error) {
            console.error(error);
            showAlert('danger', `Unable to update request (${error.message}).`);
            return false;
        }

        counseling = counseling.map(c => c.id === id ? { ...c, ...data[0] } : c);
        applyFilters();
        showAlert('success', `Request updated to "${newStatus}".`);
        return true;
    } catch (err) {
        console.error(err);
        showAlert('danger', 'Unable to update request.');
        return false;
    }
}

counselingTableBody?.addEventListener('click', async (e) => {
    const tr = e.target.closest('tr');
    if (!tr) return;
    const id = tr.getAttribute('data-id');
    const item = counseling.find(c => String(c.id) === String(id));

    if (e.target.classList.contains('view-btn')) {
        selectedRequest = item;
        openModal(item);
    }

    if (e.target.classList.contains('mark-contacted-btn')) {
        await updateStatus(item.id, 'Contacted');
    }

    if (e.target.classList.contains('mark-completed-btn')) {
        await updateStatus(item.id, 'Completed');
    }

    if (e.target.classList.contains('archive-btn')) {
        await updateStatus(item.id, 'Archived');
    }
});

function openModal(item) {
    const modal = new bootstrap.Modal(document.getElementById('counselingModal'));
    const container = document.getElementById('counselingModalBody');
    container.innerHTML = `
        <dl class="row">
            <dt class="col-sm-3">Name</dt><dd class="col-sm-9">${escapeHtml(item.name || '')}</dd>
            <dt class="col-sm-3">Email</dt><dd class="col-sm-9">${escapeHtml(item.email || '')}</dd>
            <dt class="col-sm-3">Phone</dt><dd class="col-sm-9">${escapeHtml(item.phone || '')}</dd>
            <dt class="col-sm-3">Preferred Contact</dt><dd class="col-sm-9">${escapeHtml(item.preferred_contact || '')}</dd>
            <dt class="col-sm-3">Status</dt><dd class="col-sm-9">${escapeHtml(item.status || 'New')}</dd>
            <dt class="col-sm-3">Created</dt><dd class="col-sm-9">${formatDate(item.created_at)}</dd>
            <dt class="col-sm-3">Message</dt><dd class="col-sm-9">${escapeHtml(item.message || '')}</dd>
        </dl>
    `;

    document.getElementById('counselingMarkContacted').onclick = async () => {
        if (!item) return;
        const ok = await updateStatus(item.id, 'Contacted');
        if (ok) modal.hide();
    };

    document.getElementById('counselingMarkCompleted').onclick = async () => {
        if (!item) return;
        const ok = await updateStatus(item.id, 'Completed');
        if (ok) modal.hide();
    };

    document.getElementById('counselingArchive').onclick = async () => {
        if (!item) return;
        const ok = await updateStatus(item.id, 'Archived');
        if (ok) modal.hide();
    };

    modal.show();
}

counselingSearch?.addEventListener('input', () => applyFilters());
counselingStatusFilter?.addEventListener('change', () => applyFilters());

const signOutAndRedirect = async () => { await supabaseClient.auth.signOut(); window.location.href = './login.html'; };
logoutButton?.addEventListener('click', signOutAndRedirect);
sidebarLogout?.addEventListener('click', async (event) => { event.preventDefault(); await signOutAndRedirect(); });

(async function init() {
    const session = await protectPage();
    if (!session) return;
    adminUserEmail.textContent = session.user.email || 'Admin';
    await loadCounseling();
})();
