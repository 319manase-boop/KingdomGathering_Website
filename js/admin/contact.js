// Admin Contact Messages Management - Premium UI

const contactSearch = document.getElementById('contactSearch');
const contactStatusFilter = document.getElementById('contactStatusFilter');
const contactTableBody = document.getElementById('contactTableBody');
const contactAlertContainer = document.getElementById('contactAlertContainer');
const adminUserEmail = document.getElementById('adminUserEmail');
const logoutButton = document.getElementById('logoutButton');
const sidebarLogout = document.getElementById('sidebarLogout');
const refreshBtn = document.getElementById('refreshBtn');

const totalMessagesEl = document.getElementById('totalMessages');
const unreadMessagesEl = document.getElementById('unreadMessages');
const readMessagesEl = document.getElementById('readMessages');
const archivedMessagesEl = document.getElementById('archivedMessages');
const paginationContainer = document.getElementById('paginationContainer');

let contacts = [];
let selectedContact = null;
let currentPage = 1;
const itemsPerPage = 10;

async function protectPage() {
    return await checkPagePermission('contact');
}

function formatDate(value) {
    try { return new Date(value).toLocaleString(); } catch (e) { return ''; }
}

function showAlert(type, message, timeout = 4000) {
    const el = document.createElement('div');
    el.className = `alert alert-${type} alert-dismissible fade show`;
    el.role = 'alert';
    el.innerHTML = `${message} <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>`;
    contactAlertContainer.appendChild(el);
    if (timeout) setTimeout(() => { el.classList.remove('show'); el.classList.add('hide'); el.remove(); }, timeout);
}

async function loadContacts() {
    if (!contactTableBody) {
        console.error("contactTableBody not found");
        return;
    }

    contactTableBody.innerHTML = `
        <tr>
            <td colspan="6" class="text-center py-5">Loading...</td>
        </tr>
    `;

    try {
        const { data, error } = await supabaseClient
            .from("contact_messages")
            .select("*")
            .order("created_at", { ascending: false });

        console.log("Contact data:", data);
        console.log("Contact error:", error);
        console.log("Contact count:", data ? data.length : 0);

        if (error) {
            showAlert("danger", "Unable to load contact messages.");
            contactTableBody.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center py-5">Unable to load contact messages</td>
                </tr>
            `;
            return;
        }

        contacts = data || [];
        updateStatistics();
        renderPaginatedTable();

    } catch (err) {
        console.error("Contact load exception:", err);
        showAlert("danger", "Unable to load contact messages.");
        contactTableBody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center py-5">An unexpected error occurred</td>
            </tr>
        `;
    }
}

function updateStatistics() {
    const total = contacts.length;
    const unread = contacts.filter(c => c.status === 'New').length;
    const read = contacts.filter(c => c.status === 'Read').length;
    const archived = contacts.filter(c => c.status === 'Archived').length;
    
    animateCount(totalMessagesEl, total);
    animateCount(unreadMessagesEl, unread);
    animateCount(readMessagesEl, read);
    animateCount(archivedMessagesEl, archived);
}

function animateCount(element, targetValue) {
    const duration = 600;
    const interval = 30;
    const steps = Math.ceil(duration / interval);
    let currentStep = 0;
    const increment = targetValue / steps;

    element.textContent = '0';
    const timer = setInterval(() => {
        currentStep += 1;
        const value = Math.min(Math.round(increment * currentStep), targetValue);
        element.textContent = value.toLocaleString();

        if (value >= targetValue) {
            clearInterval(timer);
            element.textContent = targetValue.toLocaleString();
        }
    }, interval);
}

function renderPaginatedTable() {
    const filtered = getFilteredContacts();
    const paginated = paginateArray(filtered, currentPage, itemsPerPage);
    
    if (filtered.length === 0) {
        renderEmptyState(contactTableBody.parentElement, 'No messages found', 'Try adjusting your search filters');
        paginationContainer.innerHTML = '';
        return;
    }
    
    renderTable(paginated.data);
    renderPaginationControls(paginationContainer, paginated.currentPage, paginated.totalPages, changePage);
}

function getFilteredContacts() {
    const q = (contactSearch.value || '').trim().toLowerCase();
    const status = contactStatusFilter.value;

    return contacts.filter(c => {
        const matchesQuery = !q || ((c.name || '').toLowerCase().includes(q) || (c.email || '').toLowerCase().includes(q) || (c.subject || '').toLowerCase().includes(q));
        const matchesStatus = !status || (c.status === status);
        return matchesQuery && matchesStatus;
    });
}

function changePage(pageNum) {
    currentPage = pageNum;
    renderPaginatedTable();
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
        case 'read': return 'bg-success';
        case 'archived': return 'bg-secondary';
        default: return 'bg-warning text-dark';
    }
}

function renderStatusBadge(status) {
    const cls = badgeClass(status);

    return `
        <span class="badge ${cls}">
            ${status || "New"}
        </span>
    `;
}

function renderTable(list) {
    if (!list.length) {
        renderEmptyState(contactTableBody.parentElement, 'No messages', 'No messages match your criteria');
        return;
    }

    contactTableBody.innerHTML = list.map(item => `
        <tr data-id="${item.id}">
            <td>
                <strong>${escapeHtml(item.name || '')}</strong>
            </td>
            <td>
                <div style="font-size: 0.9rem;">${escapeHtml(item.email || '')}</div>
                <div style="font-size: 0.85rem; color: var(--admin-text-muted);">${escapeHtml(item.phone || '')}</div>
            </td>
            <td>${escapeHtml(item.subject || '')}</td>
            <td>${renderStatusBadge(item.status || 'New')}</td>
            <td style="font-size: 0.9rem;">${formatDate(item.created_at)}</td>
            <td class="text-end">
                <div class="table-actions">
                    <button class="btn btn-sm btn-outline-light view-btn" title="View" data-id="${item.id}">👁</button>
                    <button class="btn btn-sm btn-outline-light mark-read-btn" title="Mark Read" data-id="${item.id}" ${item.status === 'Read' ? 'disabled' : ''}>✓</button>
                    <button class="btn btn-sm btn-outline-danger delete-btn" title="Delete" data-id="${item.id}">🗑️</button>
                </div>
            </td>
        </tr>
    `).join('');

    attachTableEventListeners();
}

function attachTableEventListeners() {
    document.querySelectorAll('.view-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = e.target.getAttribute('data-id');
            const item = contacts.find(c => String(c.id) === String(id));
            if (item) openModal(item);
        });
    });

    document.querySelectorAll('.mark-read-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const id = e.target.getAttribute('data-id');
            const item = contacts.find(c => String(c.id) === String(id));
            if (item) await updateStatus(item.id, 'Read');
        });
    });

    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const id = e.target.getAttribute('data-id');
            const item = contacts.find(c => String(c.id) === String(id));
            if (item && await confirmAction(`Delete message from ${escapeHtml(item.name)}?`)) {
                await deleteMessage(item.id);
            }
        });
    });
}

async function deleteMessage(id) {
    try {
        const { error } = await supabaseClient
            .from('contact_messages')
            .delete()
            .eq('id', id);

        if (error) {
            console.error(error);
            showAlert('danger', 'Unable to delete message.');
            return;
        }

        contacts = contacts.filter(c => c.id !== id);
        updateStatistics();
        renderPaginatedTable();
        showAlert('success', 'Message deleted.');
    } catch (err) {
        console.error(err);
        showAlert('danger', 'Unable to delete message.');
    }
}

async function updateStatus(id, newStatus) {
    try {
        const { data, error } = await supabaseClient
            .from('contact_messages')
            .update({ status: newStatus })
            .eq('id', id)
            .select();

        if (error) {
            console.error(error);
            showAlert('danger', `Unable to update message (${error.message}).`);
            return false;
        }

        contacts = contacts.map(c => c.id === id ? { ...c, ...data[0] } : c);
        updateStatistics();
        renderPaginatedTable();
        showAlert('success', `Message marked as ${newStatus}.`);
        return true;
    } catch (err) {
        console.error(err);
        showAlert('danger', 'Unable to update message.');
        return false;
    }
}

function openModal(item) {
    const modal = new bootstrap.Modal(document.getElementById('contactModal'));
    const container = document.getElementById('contactModalBody');
    container.innerHTML = `
        <dl class="row" style="margin-bottom: 0;">
            <dt class="col-sm-3 fw-600">Name</dt><dd class="col-sm-9">${escapeHtml(item.name || '')}</dd>
            <dt class="col-sm-3 fw-600">Email</dt><dd class="col-sm-9">${escapeHtml(item.email || '')}</dd>
            <dt class="col-sm-3 fw-600">Phone</dt><dd class="col-sm-9">${escapeHtml(item.phone || '')}</dd>
            <dt class="col-sm-3 fw-600">Subject</dt><dd class="col-sm-9">${escapeHtml(item.subject || '')}</dd>
            <dt class="col-sm-3 fw-600">Status</dt><dd class="col-sm-9">${renderStatusBadge(item.status || 'New')}</dd>
            <dt class="col-sm-3 fw-600">Date</dt><dd class="col-sm-9">${formatDate(item.created_at)}</dd>
            <dt class="col-sm-3 fw-600">Message</dt><dd class="col-sm-9"><p style="white-space: pre-wrap;">${escapeHtml(item.message || '')}</p></dd>
        </dl>
    `;

    document.getElementById('contactMarkRead').onclick = async () => {
        const ok = await updateStatus(item.id, 'Read');
        if (ok) modal.hide();
    };

    document.getElementById('contactArchive').onclick = async () => {
        const ok = await updateStatus(item.id, 'Archived');
        if (ok) modal.hide();
    };

    document.getElementById('contactDelete').onclick = async () => {
        if (await confirmAction(`Delete message from ${escapeHtml(item.name)}?`)) {
            await deleteMessage(item.id);
            modal.hide();
        }
    };

    modal.show();
}

contactSearch?.addEventListener('input', () => { currentPage = 1; renderPaginatedTable(); });
contactStatusFilter?.addEventListener('change', () => { currentPage = 1; renderPaginatedTable(); });
refreshBtn?.addEventListener('click', () => loadContacts());

const signOutAndRedirect = async () => { await supabaseClient.auth.signOut(); window.location.href = './login.html'; };
logoutButton?.addEventListener('click', signOutAndRedirect);
sidebarLogout?.addEventListener('click', async (event) => { event.preventDefault(); await signOutAndRedirect(); });

(async function init() {
    const session = await protectPage();
    if (!session) return;
    adminUserEmail.textContent = session.user.email || 'Admin';
    await loadContacts();
})();

const contactForm = document.getElementById("contactForm");
let isSubmittingContact = false;

if (contactForm) {
    contactForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        if (isSubmittingContact) return;
        isSubmittingContact = true;

        const submitBtn = contactForm.querySelector('button[type="submit"]');
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = "Sending...";
        }

        try {
            const payload = {
                name: document.getElementById("name").value.trim(),
                email: document.getElementById("email").value.trim(),
                phone: document.getElementById("phone").value.trim() || null,
                subject: document.getElementById("subject").value.trim(),
                message: document.getElementById("message").value.trim(),
                source: "website",
                status: "New"
            };

            const { data, error } = await supabaseClient
                .from("contact_messages")
                .insert([payload])
                .select();

            console.log("Contact response:", data);
            console.log("Contact error:", error);

            if (error) throw error;

            contactForm.reset();
            alert("Message sent successfully.");

        } catch (error) {
            console.error("Contact submit failed:", error);
            alert("Unable to send message. Please try again.");
        } finally {
            isSubmittingContact = false;

            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = "Send Message";
            }
        }
    });
}