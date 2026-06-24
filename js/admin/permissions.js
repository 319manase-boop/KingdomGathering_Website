// Admin RBAC and shared page protection

const PERMISSION_MATRIX = {
    super_admin: ['dashboard', 'prayer', 'contact', 'counseling', 'giving', 'blogs', 'events', 'media', 'users', 'roles', 'settings'],
    pastor: ['dashboard', 'blogs'],
    secretary: ['dashboard', 'prayer', 'contact', 'counseling'],
    media_team: ['dashboard', 'blogs', 'events', 'media'],
    treasurer: ['dashboard', 'giving'],
    member: ['dashboard'],
    guest: []
};


function normalizeRole(role) {
    return String(role || '')
        .trim()
        .toLowerCase();
}

async function getAdminSession() {
    const { data, error } = await supabaseClient.auth.getSession();
    if (error) {
        console.error('Failed to get session:', error);
        return null;
    }
    return data?.session || null;
}

async function checkAdminAuth() {
    const session = await getAdminSession();
    if (!session) {
        console.log('Redirecting to login because no valid admin session was found.');
        window.location.href = './login.html';
        return null;
    }
    return session;
}

async function getUserRole(userId) {
    const { data: userData, error: userError } = await supabaseClient
        .from("users")
        .select("role_id, status")
        .eq("id", userId)
        .single();

    console.log("SESSION USER ID:", userId);
    console.log("USER DATA FROM USERS TABLE:", userData);
    console.log("USER ERROR:", userError);

    if (userError || !userData) {
        return null;
    }

    if (normalizeRole(userData.status) !== "active") {
        console.warn("User is not active:", userData.status);
        return null;
    }

    if (!userData.role_id) {
        console.warn("User has no role_id");
        return null;
    }

    const { data: roleData, error: roleError } = await supabaseClient
        .from("roles")
        .select("name")
        .eq("id", userData.role_id)
        .single();

    console.log("ROLE DATA FROM ROLES TABLE:", roleData);
    console.log("ROLE ERROR:", roleError);

    if (roleError || !roleData) {
        return null;
    }

    const finalRole = normalizeRole(roleData.name);
    console.log("FINAL RESOLVED ROLE:", finalRole);

    return finalRole;
}

function getPageKeyFromHref(href) {
    try {
        const url = new URL(href, window.location.href);
        const page = url.pathname.split('/').pop() || '';
        return page.replace('.html', '');
    } catch (err) {
        return null;
    }
}

async function applySidebarPermissions() {
    const role = await getCurrentUserRole();
    if (!role) return;

    const allowedPages = PERMISSION_MATRIX[role] || [];

    document.querySelectorAll('.admin-sidebar a.nav-link').forEach(link => {
        const href = link.getAttribute('href');
        if (!href || href.startsWith('#')) return;

        const pageKey = getPageKeyFromHref(href);
        if (!pageKey) return;

        if (!allowedPages.includes(pageKey)) {
            link.style.display = 'none';
        }
    });
}

async function getCurrentUserRole() {
    if (window.__adminUserRole) {
        return normalizeRole(window.__adminUserRole);
    }

    const session = await getAdminSession();

    if (!session) {
        return null;
    }

    const role = await getUserRole(session.user.id);
    const normalizedRole = normalizeRole(role);

   if (!normalizedRole) {
    console.error('Role could not be resolved');
    return null;
}

window.__adminUserRole = normalizedRole;
    console.log("CURRENT USER ROLE RESOLVED:", normalizedRole);

    return normalizedRole;
}

window.getCurrentUserRole = getCurrentUserRole;

async function checkPagePermission(pageKey) {
    console.log('checkPagePermission called with pageKey:', pageKey);
    const session = await checkAdminAuth();
    if (!session) return false;

    const role = await getCurrentUserRole();

    if (!role) {
    console.error('No valid role found');

    await supabaseClient.auth.signOut();

    window.location.href = './login.html';

    return false;
}

    const normalizedPageKey = String(pageKey || '').trim().toLowerCase();
    const allowedPages = PERMISSION_MATRIX[role] || [];

    console.log('PAGE KEY:', normalizedPageKey);
    console.log('Current role:', role);
    console.log('ALLOWED PAGES:', allowedPages);

    if (!allowedPages.includes(normalizedPageKey)) {
    console.warn(
        `Access denied: ${role} cannot access ${normalizedPageKey}`
    );

    alert('Access denied');

    window.location.href = './dashboard.html';

    return false;
}

    await applySidebarPermissions();
    return session;
}

function attachAdminUserEmail(session) {
    const adminUserEmail = document.getElementById('adminUserEmail');
    if (adminUserEmail) {
        adminUserEmail.textContent = session.user.email || 'Admin';
    }
}

function setupLogoutButtons() {
    const signOutAndRedirect = async () => {
        await supabaseClient.auth.signOut();
        window.location.href = './login.html';
    };

    document.getElementById('logoutButton')?.addEventListener('click', signOutAndRedirect);

    document.getElementById('sidebarLogout')?.addEventListener('click', async (event) => {
        event.preventDefault();
        await signOutAndRedirect();
    });
}

async function setupAdminPage(pageKey) {
    const session = await checkPagePermission(pageKey);
    if (!session) return null;

    attachAdminUserEmail(session);
    setupLogoutButtons();

    return session;
}

window.getAdminSession = getAdminSession;
window.checkAdminAuth = checkAdminAuth;
window.getUserRole = getUserRole;
window.getCurrentUserRole = getCurrentUserRole;
window.checkPagePermission = checkPagePermission;
window.setupAdminPage = setupAdminPage;