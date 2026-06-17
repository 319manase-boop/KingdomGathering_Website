// Admin Users Management

const usersSearch = document.getElementById('usersSearch');
const usersRoleFilter = document.getElementById('usersRoleFilter');
const usersStatusFilter = document.getElementById('usersStatusFilter');
const usersTableBody = document.getElementById('usersTableBody');
const usersAlertContainer = document.getElementById('usersAlertContainer');
const userModal = new bootstrap.Modal(document.getElementById('userModal'));
const adminUserEmail = document.getElementById('adminUserEmail');
const logoutButton = document.getElementById('logoutButton');
const sidebarLogout = document.getElementById('sidebarLogout');

let users = [];
let editingUser = null;

async function protectPage() {
    const session = await checkPagePermission('users');
    if (!session) return null;
    return session;
}

function formatDate(value) {
    try { return new Date(value).toLocaleString(); } catch (e) { return ''; }
}

function showAlert(type, message, timeout = 4000) {
    const el = document.createElement('div');
    el.className = `alert alert-${type} alert-dismissible fade show`;
    el.role = 'alert';
    el.innerHTML = `${message} <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>`;
    usersAlertContainer.appendChild(el);
    if (timeout) setTimeout(() => { el.classList.remove('show'); el.remove(); }, timeout);
}

function escapeHtml(str) {
    return String(str || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

async function loadUsers() {
    try {
        const { data, error } = await supabaseClient
            .from('users')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error(error);
            showAlert('danger', 'Unable to load users.');
            usersTableBody.innerHTML = '<tr><td colspan="7" class="text-center">Unable to load data.</td></tr>';
            return;
        }

        users = data || [];
        renderTable(users);
    } catch (err) {
        console.error(err);
        showAlert('danger', 'Unable to load users.');
        usersTableBody.innerHTML = '<tr><td colspan="7" class="text-center">Unable to load data.</td></tr>';
    }
}

function badgeClass(status) {
    return status === 'active' ? 'bg-success' : 'bg-secondary';
}

function renderTable(list) {
    if (!list.length) {
        usersTableBody.innerHTML = '<tr><td colspan="7" class="text-center py-4">No users found.</td></tr>';
        return;
    }

    usersTableBody.innerHTML = list.map(item => `
        <tr data-id="${item.id}">
            <td>${escapeHtml(item.full_name || '')}</td>
            <td>${escapeHtml(item.email || '')}</td>
            <td>${escapeHtml(item.phone || '')}</td>
            <td>${escapeHtml(item.role || 'Administrator')}</td>
            <td><span class="badge ${badgeClass(item.status)}">${escapeHtml(item.status || 'active')}</span></td>
            <td>${formatDate(item.created_at)}</td>
            <td class="text-end">
                <button class="btn btn-sm btn-outline-light edit-btn">Edit</button>
            </td>
        </tr>
    `).join('');
}

function applyFilters() {
    const q = (usersSearch.value || '').trim().toLowerCase();
    const role = usersRoleFilter.value;
    const status = usersStatusFilter.value;

    const filtered = users.filter(u => {
        const matchesQuery = !q || ((u.full_name || '').toLowerCase().includes(q) || (u.email || '').toLowerCase().includes(q));
        const matchesRole = !role || (u.role === role);
        const matchesStatus = !status || (u.status === status);
        return matchesQuery && matchesRole && matchesStatus;
    });

    renderTable(filtered);
}

function openUserModal(user) {
    editingUser = user;
    document.getElementById('userName').value = user.full_name || '';
    document.getElementById('userEmail').value = user.email || '';
    document.getElementById('userPhone').value = user.phone || '';
    document.getElementById('userRole').value = user.role || 'Administrator';
    document.getElementById('userStatus').value = user.status || 'active';
    userModal.show();
}

usersTableBody?.addEventListener('click', async (e) => {
    const tr = e.target.closest('tr');
    if (!tr) return;
    const id = tr.getAttribute('data-id');
    const user = users.find(u => String(u.id) === String(id));

    if (e.target.classList.contains('edit-btn')) {
        openUserModal(user);
    }
});

async function saveUser() {
    if (!editingUser) return;

    const phone = document.getElementById('userPhone').value.trim();
    const role = document.getElementById('userRole').value;
    const status = document.getElementById('userStatus').value;

    try {
        const { data, error } = await supabaseClient
            .from('users')
            .update({ phone, role, status })
            .eq('id', editingUser.id)
            .select();

        if (error) {
            console.error(error);
            showAlert('danger', `Unable to save user (${error.message}).`);
            return;
        }

        await loadUsers();
        userModal.hide();
        showAlert('success', 'User updated.');
    } catch (err) {
        console.error(err);
        showAlert('danger', 'Unable to save user.');
    }
}

usersSearch?.addEventListener('input', () => applyFilters());
usersRoleFilter?.addEventListener('change', () => applyFilters());
usersStatusFilter?.addEventListener('change', () => applyFilters());
document.getElementById('userSave')?.addEventListener('click', saveUser);

const signOutAndRedirect = async () => { await supabaseClient.auth.signOut(); window.location.href = './login.html'; };
logoutButton?.addEventListener('click', signOutAndRedirect);
sidebarLogout?.addEventListener('click', async (event) => { event.preventDefault(); await signOutAndRedirect(); });

(async function init() {
    const session = await protectPage();
    if (!session) return;
    adminUserEmail.textContent = session.user.email || 'Admin';
    await loadUsers();
})();
