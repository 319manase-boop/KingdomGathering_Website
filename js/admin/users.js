// Admin Users Management - orchestrator

const usersSearch = document.getElementById('usersSearch');
const usersAlertContainer = document.getElementById('usersAlertContainer');
const usersTableBody = document.getElementById('usersTableBody');

window.__users = [];

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

async function invokeAdminUserInvite(action, user) {
    if (!user || !user.email) {
        throw new Error('User email is required.');
    }

    const payload = {
        action,
        email: user.email,
        full_name: user.full_name || '',
        role_id: user.role_id || '',
        user_id: user.id || ''
    };

    console.log("INVITE PAYLOAD", payload); 

    if (supabaseClient.functions && typeof supabaseClient.functions.invoke === 'function') {
        const { data: sessionData } = await supabaseClient.auth.getSession();
const accessToken = sessionData?.session?.access_token;

console.log("Admin invite token exists:", !!accessToken);

console.log("Calling Edge Function...");

const { data, error } = await supabaseClient.functions.invoke('admin-user-invite', {
    body: payload,
    headers: {
        Authorization: `Bearer ${accessToken}`
    }
});

console.log("Edge Function data:", data);
console.log("Edge Function error:", error);

if (error) {
    throw error;
}

return data;
    }

    const anonKey = window.SUPABASE_ANON_KEY;
    const baseUrl = supabaseClient.supabaseUrl || window.SUPABASE_URL;
    if (!anonKey || !baseUrl) {
        throw new Error('Supabase function invocation is not available.');
    }

    const url = `${baseUrl.replace(/\/+$/, '')}/functions/v1/admin-user-invite`;
    console.debug('Admin invite function: falling back to direct fetch', url);
    const requestBody = JSON.stringify(payload);
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            apikey: anonKey,
            Authorization: `Bearer ${anonKey}`
        },
        body: requestBody
    });

    const result = await response.json().catch(() => null);
    if (!response.ok) {
        console.error('Admin invite fallback failed:', {
            url,
            status: response.status,
            statusText: response.statusText,
            requestBody,
            body: result
        });
        const message = result?.error || result?.message || 'Unable to invoke invite function.';
        throw new Error(message);
    }

    return result;
}

window.sendInvite = async function (user) {
    try {
        const data = await invokeAdminUserInvite('invite', user);
        showAlert('success', data?.message || 'Invite email sent.');
        await loadUsers();
    } catch (err) {
        console.error('Send invite failed:', err);
        showAlert('danger', err.message || 'Unable to send invite.');
    }
};

window.resetPasswordUser = async function (user) {
    try {
        const data = await invokeAdminUserInvite('reset_password', user);
        showAlert('success', data?.message || 'Password reset email sent.');
    } catch (err) {
        console.error('Password reset failed:', err);
        showAlert('danger', err.message || 'Unable to send password reset email.');
    }
};

window.toggleUserStatus = async function (user) {
    if (!user) return;
    const newStatus = String(user.status || '').toLowerCase() === 'active' ? 'inactive' : 'active';

    try {
        const { error } = await supabaseClient.from('users').update({ status: newStatus }).eq('id', user.id);
        if (error) throw error;
        showAlert('success', `User ${newStatus === 'active' ? 'activated' : 'deactivated'}.`);
        await loadUsers();
    } catch (err) {
        console.error('Toggle user status failed:', err);
        showAlert('danger', err.message || 'Unable to update user status.');
    }
};

window.confirmDeleteUser = async function (user) {
    if (!user) return;
    if (!confirm(`Delete ${user.full_name || user.email}? This cannot be undone.`)) return;

    try {
        const { error } = await supabaseClient.from('users').delete().eq('id', user.id);
        if (error) throw error;
        showAlert('success', 'User deleted.');
        await loadUsers();
    } catch (err) {
        console.error('Delete user failed:', err);
        showAlert('danger', err.message || 'Unable to delete user.');
    }
};

async function loadUsers() {
    try {
        const [{ data: users, error: usersError }, { data: roles, error: rolesError }] = await Promise.all([
            supabaseClient.from('users').select('*').order('created_at', { ascending: false }),
            supabaseClient.from('roles').select('id, name').order('name', { ascending: true })
        ]);

        if (usersError || rolesError) {
            console.error({ usersError, rolesError });
            showAlert('danger', 'Unable to load users.');
            usersTableBody.innerHTML = '<tr><td colspan="8" class="text-center">Unable to load data.</td></tr>';
            return;
        }

        const roleMap = (roles || []).reduce((acc, role) => {
            acc[role.id] = role.name;
            return acc;
        }, {});

        window.__users = (users || []).map(u => ({
            ...u,
            role: roleMap[u.role_id] || u.role || ''
        }));

        renderDashboardStats(window.__users);
        renderUsersTable(window.__users, window.__adminUserRole);
    } catch (err) {
        console.error(err);
        showAlert('danger', 'Unable to load users.');
        usersTableBody.innerHTML = '<tr><td colspan="8" class="text-center">Unable to load data.</td></tr>';
    }
}

function renderDashboardStats(list) {
    document.getElementById('statTotalUsers').textContent = list.length;
    document.getElementById('statActiveUsers').textContent = list.filter(u=>String(u.status||'').toLowerCase()==='active').length;
    document.getElementById('statRoles').textContent = new Set((list||[]).map(u=>u.role)).size;
    document.getElementById('statInvites').textContent = list.filter(u=>String(u.status||'').toLowerCase()==='pending').length;
}

function attachFilterHandlers() {
    usersSearch?.addEventListener('input', () => {
        const q = (usersSearch.value||'').trim().toLowerCase();
        const filtered = window.__users.filter(u => {
            return !q || (String(u.full_name||'').toLowerCase().includes(q) || String(u.email||'').toLowerCase().includes(q));
        });
        renderUsersTable(filtered, window.__adminUserRole);
    });

    document.querySelectorAll('#roleChips .chip').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('#roleChips .chip').forEach(c=>c.classList.remove('active'));
            e.target.classList.add('active');
            const role = e.target.getAttribute('data-role');
            const q = (usersSearch.value||'').trim().toLowerCase();
            const filtered = window.__users.filter(u => {
                const matchRole = !role || u.role === role;
                const matchQ = !q || (String(u.full_name||'').toLowerCase().includes(q) || String(u.email||'').toLowerCase().includes(q));
                return matchRole && matchQ;
            });
            renderUsersTable(filtered, window.__adminUserRole);
        });
    });
}

document.getElementById('refreshUsersBtn')?.addEventListener('click', () => loadUsers());

// Drawer
function openUserDrawer(user) {
    const drawer = document.getElementById('userDrawer');
    const content = document.getElementById('drawerContent');
    if (!drawer || !content) return;
    content.innerHTML = `
        <div class="text-center mb-3">
            <div class="display-4">${(user.full_name||'').split(' ').map(s=>s[0]).slice(0,2).join('')}</div>
        </div>
        <h4>${escapeHtml(user.full_name||'')}</h4>
        <p class="text-muted">${escapeHtml(user.email||'')}</p>
        <p>Phone: ${escapeHtml(user.phone||'')}</p>
        <p>Role: <strong>${escapeHtml(user.role||'')}</strong></p>
        <p>Status: <strong>${escapeHtml(user.status||'')}</strong></p>
        <p>Created: ${formatDate(user.created_at)}</p>
    `;
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
    window.__adminUserId = session.user.id;
    window.__adminUserRole = await getUserRole(session.user.id) || 'admin';
    initUserModal(loadUsers);
    attachFilterHandlers();
    await loadUsers();
})();
