// Admin Roles Management

const rolesTableBody = document.getElementById('rolesTableBody');
const permissionMatrixBody = document.getElementById('permissionMatrixBody');
const rolesAlertContainer = document.getElementById('rolesAlertContainer');
const roleModal = new bootstrap.Modal(document.getElementById('roleModal'));
const adminUserEmail = document.getElementById('adminUserEmail');
const logoutButton = document.getElementById('logoutButton');
const sidebarLogout = document.getElementById('sidebarLogout');

const PERMISSION_MATRIX = {
  'super_admin': [
    'dashboard',
    'prayer',
    'contact',
    'counseling',
    'giving',
    'blogs',
    'events',
    'media',
    'users',
    'roles',
    'settings'
  ],

  'pastor': [
    'dashboard',
    'blogs'
  ],

  'secretary': [
    'dashboard',
    'prayer',
    'contact',
    'counseling'
  ],

  'media_team': [
    'dashboard',
    'media',
    'events',
    'blogs'
  ],

  'treasurer': [
    'dashboard',
    'giving'
  ],

  'member': [
    'dashboard'
  ],

  'guest': []
};

const FEATURES = [
  'dashboard',
  'prayer',
  'contact',
  'counseling',
  'giving',
  'blogs',
  'events',
  'media',
  'users',
  'roles',
  'settings'
];

const ROLES = [
  'Super Admin',
  'Pastor',
  'Secretary',
  'Media Team',
  'Treasurer'
];

let roles = [];
let editingRole = null;

async function protectPage() {
    const session = await checkPagePermission('roles');
    if (!session) return null;
    return session;
}

function showAlert(type, message, timeout = 4000) {
    const el = document.createElement('div');
    el.className = `alert alert-${type} alert-dismissible fade show`;
    el.role = 'alert';
    el.innerHTML = `${message} <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>`;
    rolesAlertContainer.appendChild(el);
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

async function loadRoles() {
    try {
        const { data, error } = await supabaseClient
            .from('roles')
            .select('*')
            .order('name');

        if (error) {
            console.error(error);
            showAlert('danger', 'Unable to load roles.');
            rolesTableBody.innerHTML = '<tr><td colspan="4" class="text-center">Unable to load data.</td></tr>';
            return;
        }

        roles = data || [];
        renderRolesTable();
        renderPermissionMatrix();
    } catch (err) {
        console.error(err);
        showAlert('danger', 'Unable to load roles.');
        rolesTableBody.innerHTML = '<tr><td colspan="4" class="text-center">Unable to load data.</td></tr>';
    }
}

async function countUsersForRole(roleName) {
    try {
        const { count, error } = await supabaseClient
            .from('users')
            .select('*', { count: 'exact', head: true })
            .eq('role', roleName);

        if (error) return 0;
        return count || 0;
    } catch (err) {
        return 0;
    }
}

async function renderRolesTable() {
    if (!roles.length) {
        rolesTableBody.innerHTML = '<tr><td colspan="4" class="text-center py-4">No roles found.</td></tr>';
        return;
    }

    let html = '';
    for (const role of roles) {
        const userCount = await countUsersForRole(role.name);
        html += `
            <tr data-id="${role.id}">
                <td>${escapeHtml(role.name)}</td>
                <td>${escapeHtml(role.description || '—')}</td>
                <td>${userCount}</td>
                <td class="text-end">
                    <button class="btn btn-sm btn-outline-light edit-btn">Edit</button>
                </td>
            </tr>
        `;
    }
    rolesTableBody.innerHTML = html;
}

function renderPermissionMatrix() {
    let html = '';

    for (const feature of FEATURES) {
        html += `<tr><td class="role-row">${escapeHtml(feature.charAt(0).toUpperCase() + feature.slice(1))}</td>`;
        for (const role of ROLES) {
            const hasPermission = PERMISSION_MATRIX[role] && PERMISSION_MATRIX[role].includes(feature);
            html += `<td class="${hasPermission ? 'permission-check' : 'permission-x'}">${hasPermission ? '✓' : '✗'}</td>`;
        }
        html += '</tr>';
    }

    permissionMatrixBody.innerHTML = html;
}

rolesTableBody?.addEventListener('click', async (e) => {
    const tr = e.target.closest('tr');
    if (!tr) return;
    const id = tr.getAttribute('data-id');
    const role = roles.find(r => String(r.id) === String(id));

    if (e.target.classList.contains('edit-btn')) {
        openRoleModal(role);
    }
});

function openRoleModal(role) {
    editingRole = role;
    document.getElementById('roleName').value = role.name || '';
    document.getElementById('roleDescription').value = role.description || '';
    roleModal.show();
}

async function saveRole() {
    if (!editingRole) return;

    const description = document.getElementById('roleDescription').value.trim();

    try {
        const { data, error } = await supabaseClient
            .from('roles')
            .update({ description })
            .eq('id', editingRole.id)
            .select();

        if (error) {
            console.error(error);
            showAlert('danger', `Unable to save role (${error.message}).`);
            return;
        }

        await loadRoles();
        roleModal.hide();
        showAlert('success', 'Role updated.');
    } catch (err) {
        console.error(err);
        showAlert('danger', 'Unable to save role.');
    }
}

document.getElementById('roleSave')?.addEventListener('click', saveRole);

const signOutAndRedirect = async () => { await supabaseClient.auth.signOut(); window.location.href = './login.html'; };
logoutButton?.addEventListener('click', signOutAndRedirect);
sidebarLogout?.addEventListener('click', async (event) => { event.preventDefault(); await signOutAndRedirect(); });

(async function init() {
    const session = await protectPage();
    if (!session) return;
    adminUserEmail.textContent = session.user.email || 'Admin';
    await loadRoles();
})();
