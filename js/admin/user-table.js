// user-table.js - renders user rows and handles row actions

function roleBadgeClass(role) {
    const map = {
        'Super Admin': 'badge-gold',
        'Pastor': 'badge-purple',
        'Media Team': 'badge-blue',
        'Prayer Team': 'badge-green',
        'Counselor': 'badge-orange',
        'Secretary': 'badge-secondary',
        'Finance': 'badge-teal'
    };
    return map[role] || 'badge-secondary';
}

function statusBadgeClass(status) {
    if (!status) return 'bg-secondary';
    const s = String(status).toLowerCase();
    if (s === 'active') return 'bg-success';
    if (s === 'pending') return 'bg-warning text-dark';
    if (s === 'inactive' || s === 'disabled') return 'bg-secondary';
    return 'bg-secondary';
}

function getStatusActionLabel(status) {
    const s = String(status || '').toLowerCase();
    if (s === 'active') return 'Deactivate';
    return 'Activate';
}

function avatarFor(user) {
    const initials = (user.full_name || user.email || '').split(' ').map(s=>s[0]).slice(0,2).join('').toUpperCase();
    return `<div class="avatar-placeholder bg-dark text-gold rounded-circle d-inline-flex align-items-center justify-content-center" style="width:40px;height:40px">${initials}</div>`;
}

window.renderUsersTable = function(users, currentRole) {
    const tbody = document.getElementById('usersTableBody');
    if (!tbody) return;
    if (!users || users.length === 0) {
        const t = document.getElementById('usersEmptyTemplate');
        tbody.innerHTML = `<tr><td colspan="8">${t.innerHTML}</td></tr>`;
        document.getElementById('emptyAddUser')?.addEventListener('click', () => document.getElementById('openAddUser')?.click());
        return;
    }

    tbody.innerHTML = users.map(u => {
        const statusAction = getStatusActionLabel(u.status);
        const isSelf = window.__adminUserId && String(window.__adminUserId) === String(u.id);
        return `
        <tr data-id="${u.id}">
            <td>${avatarFor(u)}</td>
            <td><a href="#" class="user-link text-decoration-none text-white">${escapeHtml(u.full_name || '')}</a></td>
            <td class="text-muted small">${escapeHtml(u.email || '')}</td>
            <td>${escapeHtml(u.phone || '')}</td>
            <td><span class="badge ${roleBadgeClass(u.role)}">${escapeHtml(u.role || '')}</span></td>
            <td><span class="${statusBadgeClass(u.status)} badge">${statusEmoji(u.status)} ${titleCase(u.status)}</span></td>
            <td class="small text-muted">${formatDate(u.created_at)}</td>
            <td class="text-end">
                <div class="d-flex justify-content-end gap-2 flex-wrap align-items-center">
                    <button class="btn btn-sm btn-outline-light edit-user">Edit</button>
                    ${isSelf ? '' : `<button class="btn btn-sm btn-outline-light status-toggle">${statusAction}</button>`}
                    ${isSelf ? '' : `<button class="btn btn-sm btn-danger delete-user">Delete</button>`}
                    <div class="dropdown">
                        <button class="btn btn-sm btn-outline-light dropdown-toggle" data-bs-toggle="dropdown">More</button>
                        <ul class="dropdown-menu dropdown-menu-end bg-dark">
                            <li><a class="dropdown-item view-profile text-white" href="#">View Profile</a></li>
                            <li><a class="dropdown-item reset-password text-white" href="#">Reset Password</a></li>
                            ${u.status === 'pending' ? '<li><a class="dropdown-item send-invite text-white" href="#">Send Invite</a></li>' : ''}
                            ${u.status === 'pending' ? '<li><a class="dropdown-item resend-invite text-white" href="#">Resend Invite</a></li>' : ''}
                            <li><a class="dropdown-item copy-invite text-white" href="#" data-token="${inviteToken}">Copy Invite Link</a></li>
                            ${isSelf ? '' : '<li><a class="dropdown-item suspend-account text-white" href="#">Suspend Account</a></li>'}
                            ${isSelf ? '' : '<li><a class="dropdown-item more-delete text-danger" href="#">Delete Account</a></li>'}
                        </ul>
                    </div>
                </div>
            </td>
        </tr>
        `;
    }).join('');

    // Attach listeners
    tbody.querySelectorAll('.view-profile').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const tr = e.target.closest('tr');
            const id = tr.getAttribute('data-id');
            const user = window.__users.find(u => String(u.id) === String(id));
            openUserDrawer(user);
        });
    });

    tbody.querySelectorAll('.edit-user').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const tr = e.target.closest('tr');
            const id = tr.getAttribute('data-id');
            const user = window.__users.find(u => String(u.id) === String(id));
            openEditModal(user);
        });
    });

    tbody.querySelectorAll('.status-toggle').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.preventDefault();
            const tr = e.target.closest('tr');
            const id = tr.getAttribute('data-id');
            const user = window.__users.find(u => String(u.id) === String(id));
            await window.toggleUserStatus(user);
        });
    });

    tbody.querySelectorAll('.reset-password').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.preventDefault();
            if (!confirm('Send password reset email for this user?')) return;
            const tr = e.target.closest('tr');
            const id = tr.getAttribute('data-id');
            const user = window.__users.find(u => String(u.id) === String(id));
            await window.resetPasswordUser(user);
        });
    });

    tbody.querySelectorAll('.delete-user').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const tr = e.target.closest('tr');
            const id = tr.getAttribute('data-id');
            const user = window.__users.find(u => String(u.id) === String(id));
            window.confirmDeleteUser(user);
        });
    });

    

    tbody.querySelectorAll('.resend-invite').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.preventDefault();
            const tr = e.target.closest('tr');
            const id = tr.getAttribute('data-id');
            const user = window.__users.find(u => String(u.id) === String(id));
            await window.sendInvite(user);
        });
    });

    tbody.querySelectorAll('.suspend-account').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.preventDefault();
            if (!confirm('Suspend this account (mark inactive)?')) return;
            const tr = e.target.closest('tr');
            const id = tr.getAttribute('data-id');
            try {
                await supabaseClient.from('users').update({ status: 'inactive' }).eq('id', id);
                showAlert('success', 'Account suspended.');
                await loadUsers();
            } catch (err) {
                console.error(err);
                showAlert('danger', 'Unable to suspend account.');
            }
        });
    });

    tbody.querySelectorAll('.more-delete').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const tr = e.target.closest('tr');
            const id = tr.getAttribute('data-id');
            const user = window.__users.find(u => String(u.id) === String(id));
            window.confirmDeleteUser(user);
        });
    });
}
