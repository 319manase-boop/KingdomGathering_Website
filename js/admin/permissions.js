// Admin RBAC and shared page protection

const PERMISSION_MATRIX = {
    admin: ['dashboard', 'prayer', 'contact', 'counseling', 'giving', 'blogs', 'events', 'media', 'users', 'roles', 'settings'],
    pastor: ['dashboard', 'prayer', 'contact', 'counseling', 'events'],
    media: ['dashboard', 'blogs', 'events', 'media'],
    finance: ['dashboard', 'giving'],
    member: [],
    guest: []
};

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
        window.location.href = './login.html';
        return null;
    }
    return session;
}

async function getUserRole(userId) {
    console.log("=== getUserRole START ===");
    console.log("Operation: Query users table for role_id and status");
    console.log("Payload: userId =", userId);
    
    const { data: userData, error: userError } = await supabaseClient
        .from("users")
        .select("role_id, status")
        .eq("id", userId)
        .single();

    console.log("Response (users query):", userData);
    console.log("Error (users query):", userError);

    if (userError || !userData || userData.status !== "active") {
        console.log("getUserRole failed at users query");
        return null;
    }

    console.log("Operation: Query roles table for role name");
    console.log("Payload: roleId =", userData.role_id);
    
    const { data: roleData, error: roleError } = await supabaseClient
        .from("roles")
        .select("name")
        .eq("id", userData.role_id)
        .single();

    console.log("Response (roles query):", roleData);
    console.log("Error (roles query):", roleError);

    if (roleError || !roleData) {
        console.log("getUserRole failed at roles query - THIS IS THE 403 ERROR");
        console.log("Missing RLS policy on 'roles' table for authenticated users");
        return null;
    }

    console.log("=== getUserRole SUCCESS ===");
    return roleData.name;
}

async function getCurrentUserRole() {
    if (window.__adminUserRole) {
        return window.__adminUserRole;
    }

    const session = await getAdminSession();
    if (!session) {
        return null;
    }

    const role = await getUserRole(session.user.id);
    window.__adminUserRole = role;
    return role;
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

async function checkPagePermission(pageKey) {
    const session = await checkAdminAuth();
    if (!session) return false;

    const role = await getCurrentUserRole();
    if (!role) {
        window.location.href = './access-denied.html';
        return false;
    }

    const allowedPages = PERMISSION_MATRIX[role] || [];
    if (!allowedPages.includes(pageKey)) {
        window.location.href = './access-denied.html';
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

    const logoutButton = document.getElementById('logoutButton');
    const sidebarLogout = document.getElementById('sidebarLogout');

    logoutButton?.addEventListener('click', signOutAndRedirect);
    sidebarLogout?.addEventListener('click', async (event) => {
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
