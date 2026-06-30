// Admin Permission and Authorization Utility

const PERMISSION_MATRIX = {
    'Super Admin': ['dashboard', 'prayer', 'contact', 'counseling', 'giving', 'blogs', 'events', 'media', 'users', 'roles', 'settings'],
    'Apostle': ['dashboard', 'prayer', 'contact', 'counseling', 'giving', 'blogs', 'events', 'media', 'users', 'settings'],
    'Pastor': ['dashboard', 'blogs', 'media'],
    'Media Team': ['dashboard', 'blogs', 'events', 'media'],
    'Pastoral Care': ['dashboard', 'prayer', 'contact', 'counseling'],
    'Finance': ['dashboard', 'giving'],
    'Administrator': ['dashboard', 'prayer', 'contact', 'counseling', 'blogs', 'events', 'settings']
};

async function checkAdminAuth() {
    const { data, error } = await supabaseClient.auth.getSession();
    if (error || !data?.session) {
        window.location.href = './login.html';
        return null;
    }
    return data.session;
}

async function getUserRole(userId) {
    try {
        const { data, error } = await supabaseClient
            .from('users')
            .select('role')
            .eq('id', userId)
            .single();

        if (error || !data) {
            console.error('Unable to fetch user role:', error);
            return null;
        }
        return data.role || 'Administrator';
    } catch (err) {
        console.error(err);
        return null;
    }
}

async function checkPagePermission(pageKey) {
    const session = await checkAdminAuth();
    if (!session) return false;

    const role = await getUserRole(session.user.id);
    if (!role) {
        window.location.href = './access-denied.html';
        return false;
    }

    const allowedPages = PERMISSION_MATRIX[role] || [];
    if (!allowedPages.includes(pageKey)) {
        window.location.href = './access-denied.html';
        return false;
    }

    return session;
}

function showAccessDenied() {
    document.body.innerHTML = `
        <div style="background: #060606; color: #f9f7ef; min-height: 100vh; display: flex; align-items: center; justify-content: center;">
            <div style="text-align: center; padding: 2rem;">
                <h1 style="font-size: 4rem; font-weight: 800; color: #ffd95d; margin-bottom: 1rem;">403</h1>
                <h2 style="margin-bottom: 1rem;">Access Denied</h2>
                <p style="margin-bottom: 2rem; color: rgba(255,255,255,0.7);">You do not have permission to access this page.</p>
                <a href="dashboard.html" style="color: #ffd95d; text-decoration: none; padding: 0.75rem 1.5rem; border: 1px solid #ffd95d; border-radius: 8px; display: inline-block;">Back to Dashboard</a>
            </div>
        </div>
    `;
}
