// Admin Users Management - orchestrator

const usersSearch = document.getElementById('usersSearch');
const usersAlertContainer = document.getElementById('usersAlertContainer');
const usersTableBody = document.getElementById('usersTableBody');

window.__users = [];
window.__roles = [];
let deleteUserModalInstance = null;
let pendingDeleteUserId = null;

function formatDate(value) {
    try { return new Date(value).toLocaleString(); } catch (e) { return ''; }
}

function normalizeStatus(status) {
    const s = String(status || '').toLowerCase();
    if (s === 'disabled') return 'inactive';
    if (['active', 'pending', 'inactive'].includes(s)) return s;
    return 'pending';
}

function titleCase(value) {
    if (!value) return '';
    return String(value).replace(/\w\S*/g, txt => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
}

function getFriendlyRoleName(raw) {
    if (!raw) return '';
    const key = String(raw).toLowerCase();
    const map = {
        'admin': 'Super Admin',
        'super admin': 'Super Admin',
        'pastor': 'Pastor',
        'media': 'Media Team',
        'member': 'Member',
        'guest': 'Guest'
    };
    return map[key] || titleCase(raw);
}

function statusEmoji(status) {
    const s = String(status || '').toLowerCase();
    if (s === 'active') return '🟢';
    if (s === 'pending') return '🟡';
    return '⚫';
}

async function callInviteFunction(body) {
    const { data: sessionData } = await supabaseClient.auth.getSession();
    const accessToken = sessionData?.session?.access_token;

    const headers = {
        'Content-Type': 'application/json'
    };
    if (accessToken) {
        headers.Authorization = `Bearer ${accessToken}`;
    }

    const { error, data } = await supabaseClient.functions.invoke('admin-user-invite', {
        body: JSON.stringify(body),
        headers
    });
    if (error) throw error;
    return data;
}

window.sendInvite = async function(user) {
    if (!user?.email) return;
    try {
        await callInviteFunction({
            action: 'invite',
            email: user.email,
            full_name: user.full_name,
            role_id: user.role_id,
            user_id: user.id
        });
        showAlert('success', 'Invite sent. User can set their password via email.');
        await loadUsers();
    } catch (err) {
        console.error(err);
        showAlert('danger', 'Unable to send invite.');
    }
};

window.resetPasswordUser = async function(user) {
    if (!user?.email) return;
    try {
        await callInviteFunction({
            action: 'reset_password',
            email: user.email
        });
        showAlert('success', 'Password reset email sent.');
    } catch (err) {
        console.error(err);
        showAlert('danger', 'Unable to send password reset.');
    }
};

function showAlert(type, message, timeout = 4000) {
    const el = document.createElement('div');
    el.className = `alert alert-${type} alert-dismissible fade show`;
    el.role = 'alert';
    el.innerHTML = `${message} <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>`;
    usersAlertContainer.appendChild(el);
    if (timeout) setTimeout(() => { el.classList.remove('show'); el.remove(); }, timeout);
}

async function loadUsers() {
    try {
        const [{ data: users, error: usersError }, { data: roles, error: rolesError }] = await Promise.all([
            supabaseClient.from('users').select('*').order('created_at', { ascending: false }),
            supabaseClient.from('roles').select('id, name').order('name', { ascending: true })
        ]);

        console.log('USERS FROM DB:', users);
console.log('ROLES FROM DB:', roles);

        if (usersError || rolesError) {
            console.error({ usersError, rolesError });
            showAlert('danger', 'Unable to load users.');
            usersTableBody.innerHTML = '<tr><td colspan="8" class="text-center">Unable to load data.</td></tr>';
            return;
        }

        window.__roles = roles || [];
        const roleMap = window.__roles.reduce((acc, role) => {
            acc[role.id] = role.name;
            return acc;
        }, {});

        window.__users = (users || []).map(u => ({
            ...u,
            rawRole: roleMap[u.role_id] || u.role || '',
            role: getFriendlyRoleName(roleMap[u.role_id] || u.role || ''),
            status: normalizeStatus(u.status),
        }));

        renderDashboardStats(window.__users, window.__roles);
        renderRoleChips(window.__roles);
        renderUsersTable(window.__users, window.__adminUserRole);
    } catch (err) {
        console.error(err);
        showAlert('danger', 'Unable to load users.');
        usersTableBody.innerHTML = '<tr><td colspan="8" class="text-center">Unable to load data.</td></tr>';
    }
}

function renderDashboardStats(list, roles) {
    document.getElementById('statTotalUsers').textContent = list.length;
    document.getElementById('statActiveUsers').textContent = list.filter(u => String(u.status || '').toLowerCase() === 'active').length;
    document.getElementById('statRoles').textContent = (roles || []).length;
    document.getElementById('statInvites').textContent = list.filter(u => String(u.status || '').toLowerCase() === 'pending').length;
}

function attachFilterHandlers() {
    usersSearch?.addEventListener('input', () => {
        const q = (usersSearch.value||'').trim().toLowerCase();
        const filtered = window.__users.filter(u => {
            return !q || (
                String(u.full_name||'').toLowerCase().includes(q) ||
                String(u.email||'').toLowerCase().includes(q) ||
                String(u.phone||'').toLowerCase().includes(q) ||
                String(u.role||'').toLowerCase().includes(q)
            );
        });
        renderUsersTable(filtered, window.__adminUserRole);
    });

    // Role chips are generated dynamically in renderRoleChips
}

function renderRoleChips(roles) {
    const container = document.getElementById('roleChips');
    if (!container) return;
    container.innerHTML = '';
    const makeBtn = (name, active=false) => {
        const b = document.createElement('button');
        b.className = `btn btn-outline-light chip${active? ' active':''}`;
        b.setAttribute('data-role', name || '');
        b.textContent = name || 'All';
        return b;
    };

    const allBtn = makeBtn('All', true);
    allBtn.setAttribute('data-role', '');
    container.appendChild(allBtn);
    allBtn.addEventListener('click', () => {
        container.querySelectorAll('.chip').forEach(c=>c.classList.remove('active'));
        allBtn.classList.add('active');
        const q = (usersSearch.value||'').trim().toLowerCase();
        renderUsersTable(window.__users.filter(u => !q || (
            String(u.full_name||'').toLowerCase().includes(q) ||
            String(u.email||'').toLowerCase().includes(q) ||
            String(u.phone||'').toLowerCase().includes(q) ||
            String(u.role||'').toLowerCase().includes(q)
        )), window.__adminUserRole);
    });

    (roles || []).forEach(r => {
        const name = getFriendlyRoleName(r.name || r.id || '');
        const btn = makeBtn(name, false);
        btn.addEventListener('click', () => {
            container.querySelectorAll('.chip').forEach(c=>c.classList.remove('active'));
            btn.classList.add('active');
            const q = (usersSearch.value||'').trim().toLowerCase();
            renderUsersTable(window.__users.filter(u => (!q || (
                String(u.full_name||'').toLowerCase().includes(q) ||
                String(u.email||'').toLowerCase().includes(q) ||
                String(u.phone||'').toLowerCase().includes(q) ||
                String(u.role||'').toLowerCase().includes(q)
            )) && (!name || u.role === name)), window.__adminUserRole);
        });
        container.appendChild(btn);
    });
}

document.getElementById('refreshUsersBtn')?.addEventListener('click', () => loadUsers());

// Drawer
function openUserDrawer(user) {
    const drawer = document.getElementById('userDrawer');
    const content = document.getElementById('drawerContent');
    if (!drawer || !content) return;
    const initials = (user.full_name||'').split(' ').map(s=>s[0]).slice(0,2).join('');
    const friendlyRole = getFriendlyRoleName(user.rawRole || user.role || '');
    const isSelf = window.__adminUserId && String(window.__adminUserId) === String(user.id);
    content.innerHTML = `
        <div class="text-center mb-3">
            <div class="display-4">${escapeHtml(initials)}</div>
        </div>
        <h4>${escapeHtml(user.full_name||'')}</h4>
        <p class="text-muted">${escapeHtml(user.email||'')}</p>
        <p>Phone: ${escapeHtml(user.phone||'')}</p>
        <p>Role: <strong>${escapeHtml(friendlyRole||'')}</strong></p>
        <p>Status: <span class="badge ${statusBadgeClass(user.status)}">${statusEmoji(user.status)} ${titleCase(user.status)}</span></p>
        <p>Created: ${formatDate(user.created_at)}</p>
        <p>Last updated: ${formatDate(user.updated_at)}</p>
        <div class="d-flex gap-2 mt-3">
            <button class="btn btn-sm btn-gold" id="drawerEditBtn">Edit</button>
            ${isSelf ? '' : `<button class="btn btn-sm btn-outline-light" id="drawerSuspendBtn">${user.status==='active' ? 'Deactivate' : 'Activate'}</button>`}
            <button class="btn btn-sm btn-outline-light" id="drawerResetBtn">Reset Password</button>
        </div>
    `;
    // Attach drawer buttons
    document.getElementById('drawerEditBtn')?.addEventListener('click', () => openEditModal(user));
    if (!isSelf) {
        document.getElementById('drawerSuspendBtn')?.addEventListener('click', async () => { await toggleUserStatus(user); });
    }
    document.getElementById('drawerResetBtn')?.addEventListener('click', async () => {
        await window.resetPasswordUser(user);
    });
    drawer.classList.add('open');
}
document.getElementById('closeUserDrawer')?.addEventListener('click', () => document.getElementById('userDrawer')?.classList.remove('open'));

function escapeHtml(str) {
    return String(str || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// Initialize
(async function init() {
    const session = await setupAdminPage('users');
    if (!session) return;
   const role = await getUserRole(session.user.id);

if (!role) {
  console.error('Unable to determine user role');
  window.location.href = '/login.html';
  return;
}

window.__adminUserRole = role;
    window.__adminUserId = session.user.id;
    initUserModal(loadUsers);
    initDeleteUserModal();
    attachFilterHandlers();
    await loadUsers();
})();

function initDeleteUserModal() {
    const modalEl = document.getElementById('deleteUserModal');
    if (!modalEl || !window.bootstrap) return;
    deleteUserModalInstance = bootstrap.Modal.getOrCreateInstance(modalEl);
}

window.confirmDeleteUser = function (user) {
    if (!user || !deleteUserModalInstance) {
        return deleteUser(user?.id);
    }

    pendingDeleteUserId = user.id;
    document.getElementById('deleteUserName').textContent = escapeHtml(user.full_name || user.email || 'this user');
    deleteUserModalInstance.show();
};

async function deleteUser(userId) {
    if (!userId) return;

    const { error } = await supabaseClient
        .from("users")
        .delete()
        .eq("id", userId);

    if (error) {
        console.error(error);
        showAlert("danger", "Unable to delete user.");
        return;
    }

    showAlert("success", "User deleted.");
    await loadUsers();
}

window.deleteUser = deleteUser;

window.executeDeleteUser = async function () {
    if (!pendingDeleteUserId) return;
    const userId = pendingDeleteUserId;
    pendingDeleteUserId = null;
    deleteUserModalInstance?.hide();
    await deleteUser(userId);
};

window.toggleUserStatus = async function (user) {
    if (!user || !user.id) return;
    const current = String(user.status || '').toLowerCase();
    let nextStatus = 'active';

    if (current === 'active') nextStatus = 'inactive';
    if (current === 'inactive' || current === 'pending') nextStatus = 'active';

    try {
        const { error } = await supabaseClient
            .from('users')
            .update({ status: nextStatus })
            .eq('id', user.id);

        if (error) throw error;
        showAlert('success', `User status updated to ${nextStatus}.`);
        await loadUsers();
    } catch (err) {
        console.error(err);
        showAlert('danger', 'Unable to update status.');
    }
};
