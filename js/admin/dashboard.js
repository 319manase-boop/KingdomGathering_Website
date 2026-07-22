// Admin dashboard protection and data loading

const logoutButton = document.getElementById('logoutButton');
const sidebarLogout = document.getElementById('sidebarLogout');
const adminUserEmail = document.getElementById('adminUserEmail');
const totalPrayers = document.getElementById('totalPrayers');
const totalContacts = document.getElementById('totalContacts');
const totalCounseling = document.getElementById('totalCounseling');
const totalGiving = document.getElementById('totalGiving');
const totalBlogs = document.getElementById('totalBlogs');
const totalEvents = document.getElementById('totalEvents');
const totalCampaigns = document.getElementById('totalCampaigns');
const dashboardError = document.getElementById('dashboardError');
const recentActivityList = document.getElementById('recentActivityList');
const recentPrayerList = document.getElementById('recentPrayerList');
const recentContactList = document.getElementById('recentContactList');
const recentCounselingList = document.getElementById('recentCounselingList');
const recentCampaignList = document.getElementById('recentCampaignList');

async function protectDashboard() {
    return await checkPagePermission('dashboard');
}

function createListItem(title, subtitle, status, date) {
    return `
        <li class="list-group-item">
            <div class="d-flex flex-column gap-2">
                <div class="d-flex justify-content-between flex-wrap gap-2">
                    <div class="fw-semibold text-white">${title}</div>
                    <span class="badge bg-warning text-dark text-uppercase small">${status}</span>
                </div>
                <div class="text-muted small">${subtitle}</div>
                <div class="text-muted small">${date}</div>
            </div>
        </li>
    `;
}

async function loadStatistics() {
    const stats = await Promise.all([
        countTable('prayer_requests'),
        countTable('contact_messages'),
        countTable('counseling_requests'),
        countTable('giving_records'),
        countTable('blogs'),
        countTable('events'),
        countTable('newsletter_campaigns')
    ]);

    const [prayers, contacts, counseling, giving, blogs, events, campaigns] = stats;

    animateCount(totalPrayers, prayers);
    animateCount(totalContacts, contacts);
    animateCount(totalCounseling, counseling);
    animateCount(totalGiving, giving);
    animateCount(totalBlogs, blogs);
    animateCount(totalEvents, events);
    animateCount(totalCampaigns, campaigns);
}

function animateCount(element, targetValue) {
    const duration = 900;
    const interval = 30;
    const steps = Math.ceil(duration / interval);
    let currentStep = 0;
    const startValue = 0;
    const increment = targetValue / steps;

    element.textContent = '0';

    const timer = setInterval(() => {
        currentStep += 1;
        const value = Math.min(Math.round(startValue + increment * currentStep), targetValue);
        element.textContent = value.toLocaleString();

        if (value >= targetValue || currentStep >= steps) {
            clearInterval(timer);
            element.textContent = targetValue.toLocaleString();
        }
    }, interval);
}

async function countTable(tableName) {
    try {
        const { count, error } = await supabaseClient
            .from(tableName)
            .select('*', { count: 'exact', head: true });

        if (error) {
            console.error(`Count error for ${tableName}:`, error.message);
            return 0;
        }
        return count || 0;
    } catch (error) {
        console.error(`Unable to count ${tableName}:`, error);
        return 0;
    }
}

async function loadRecentEntries() {
    const [prayers, contacts, counseling, campaigns] = await Promise.all([
        fetchRecent('prayer_requests', 'created_at', 5),
        fetchRecent('contact_messages', 'created_at', 5),
        fetchRecent('counseling_requests', 'created_at', 5),
        fetchRecent('newsletter_campaigns', 'created_at', 5)
    ]);

    recentPrayerList.innerHTML = prayers.length
        ? prayers.map((item) => createListItem(
            item.name || 'No name',
            `${item.message?.slice(0, 100) || 'No message'}${item.message?.length > 100 ? '...' : ''}`,
            item.status || 'New',
            formatDate(item.created_at)
        )).join('')
        : '<li class="list-group-item">No recent prayer requests.</li>';

    recentContactList.innerHTML = contacts.length
        ? contacts.map((item) => createListItem(
            item.name || 'No name',
            item.subject || item.message || 'No subject',
            item.status || 'New',
            formatDate(item.created_at)
        )).join('')
        : '<li class="list-group-item">No recent contact messages.</li>';

    recentCounselingList.innerHTML = counseling.length
        ? counseling.map((item) => createListItem(
            item.name || 'No name',
            item.preferred_contact || 'No contact info',
            item.status || 'New',
            formatDate(item.created_at)
        )).join('')
        : '<li class="list-group-item">No recent counseling requests.</li>';

    recentCampaignList.innerHTML = campaigns.length
        ? campaigns.map((item) => createListItem(
            item.title || 'Campaign',
            item.subject || item.campaign_type || 'No subject',
            item.status || 'Draft',
            formatDate(item.created_at)
        )).join('')
        : '<li class="list-group-item">No recent newsletter campaigns.</li>';

    const recentRequests = [
        ...prayers.slice(0, 2).map((item) => ({
            title: item.name || 'Prayer',
            subtitle: item.message || 'No message',
            status: item.status || 'New',
            date: formatDate(item.created_at)
        })),
        ...contacts.slice(0, 2).map((item) => ({
            title: item.name || 'Contact',
            subtitle: item.subject || item.message || 'No subject',
            status: item.status || 'New',
            date: formatDate(item.created_at)
        })),
        ...counseling.slice(0, 1).map((item) => ({
            title: item.name || 'Counseling',
            subtitle: item.preferred_contact || 'No contact',
            status: item.status || 'New',
            date: formatDate(item.created_at)
        })),
        ...campaigns.slice(0, 1).map((item) => ({
            title: item.title || 'Campaign',
            subtitle: item.subject || item.campaign_type || 'No subject',
            status: item.status || 'Draft',
            date: formatDate(item.created_at)
        }))
    ];

    recentActivityList.innerHTML = recentRequests.length
        ? recentRequests.map((item) => createListItem(item.title, item.subtitle, item.status, item.date)).join('')
        : '<li class="list-group-item">No recent activity.</li>';
}

function formatDate(value) {
    try {
        return new Date(value).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    } catch (error) {
        return 'Unknown date';
    }
}

async function fetchRecent(tableName, orderColumn, limit = 5) {
    try {
        const { data, error } = await supabaseClient
            .from(tableName)
            .select('*')
            .order(orderColumn, { ascending: false })
            .limit(limit);

        if (error) {
            console.error(`Unable to fetch recent ${tableName}:`, error);
            return [];
        }

        return data || [];
    } catch (error) {
        console.error(error);
        return [];
    }
}

async function initializeDashboard() {
    const session = await protectDashboard();
    if (!session) return;

    adminUserEmail.textContent = session.user.email || 'Admin';

    try {
        await loadStatistics();
        await loadRecentEntries();
    } catch (error) {
        console.error('Dashboard load failed:', error);
        dashboardError.classList.remove('d-none');
    }
}

const signOutAndRedirect = async () => {
    await supabaseClient.auth.signOut();
    window.location.href = './login.html';
};

logoutButton?.addEventListener('click', signOutAndRedirect);
sidebarLogout?.addEventListener('click', async (event) => {
    event.preventDefault();
    await signOutAndRedirect();
});

initializeDashboard();