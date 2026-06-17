// Admin Events management

const eventsSearch = document.getElementById('eventsSearch');
const eventsStatusFilter = document.getElementById('eventsStatusFilter');
const eventsBranchFilter = document.getElementById('eventsBranchFilter');
const eventsTableBody = document.getElementById('eventsTableBody');
const eventsAlertContainer = document.getElementById('eventsAlertContainer');
const createEventBtn = document.getElementById('createEventBtn');
const eventModalEl = document.getElementById('eventModal');
const eventModal = eventModalEl ? new bootstrap.Modal(eventModalEl) : null;
const adminUserEmail = document.getElementById('adminUserEmail');
const logoutButton = document.getElementById('logoutButton');
const sidebarLogout = document.getElementById('sidebarLogout');

const eventForm = document.getElementById('eventForm');
const eventTitleInput = document.getElementById('eventTitle');
const eventSlugInput = document.getElementById('eventSlug');
const eventBranchSelect = document.getElementById('eventBranch');
const eventShortDescInput = document.getElementById('eventShortDesc');
const eventDescInput = document.getElementById('eventDesc');
const eventLocationInput = document.getElementById('eventLocation');
const eventStartAtInput = document.getElementById('eventStartAt');
const eventEndAtInput = document.getElementById('eventEndAt');
const eventCapacityInput = document.getElementById('eventCapacity');
const eventRegistrationSelect = document.getElementById('eventRegistration');
const eventPosterInput = document.getElementById('eventPoster');
const eventTagsInput = document.getElementById('eventTags');
const eventStatusSelect = document.getElementById('eventStatus');
const eventSaveButton = document.getElementById('eventSave');
const eventDeleteButton = document.getElementById('eventDelete');

let events = [];
let branches = [];
let editingEvent = null;

async function protectPage() {
    return await checkPagePermission('events');
}

function formatDate(value) {
    try { return new Date(value).toLocaleString(); } catch (e) { return ''; }
}

function showAlert(type, message, timeout = 4000) {
    const el = document.createElement('div');
    el.className = `alert alert-${type} alert-dismissible fade show`;
    el.role = 'alert';
    el.innerHTML = `${message} <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>`;
    eventsAlertContainer.appendChild(el);
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

function generateSlug(title) {
    return title
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-');
}

async function loadBranches() {
    if (!eventBranchSelect || !eventsBranchFilter) {
        console.warn('[Events] loadBranches missing branch DOM nodes');
        return;
    }

    console.debug('[Events] loadBranches');

    try {
        const { data, error } = await supabaseClient
            .from('branches')
            .select('id, name')
            .order('name', { ascending: true });

        console.debug('[Events] branches query', { data, error });

        if (error) {
            console.error('[Events] loadBranches error', error);
            branches = [];
            populateBranchFilters();
            showAlert('danger', 'Unable to load branches.');
            return;
        }

        branches = data || [];
        populateBranchFilters();
    } catch (err) {
        console.error('[Events] loadBranches exception', err);
        branches = [];
        populateBranchFilters();
        showAlert('danger', 'Unable to load branches.');
    }
}

function populateBranchFilters() {
    if (!eventBranchSelect || !eventsBranchFilter) {
        console.warn('[Events] populateBranchFilters missing DOM nodes');
        return;
    }

    const branchOptions = branches.length
        ? branches.map(b => `<option value="${escapeHtml(b.id)}">${escapeHtml(b.name)}</option>`).join('')
        : '<option value="" disabled selected>No branches available</option>';

    eventBranchSelect.innerHTML = branches.length
        ? `<option value="">Select a branch...</option>${branchOptions}`
        : branchOptions;
    eventBranchSelect.disabled = !branches.length;

    eventsBranchFilter.innerHTML = `<option value="">All Branches</option>${branches.length ? branchOptions : ''}`;
}

async function loadEvents() {
    try {
        const { data, error } = await supabaseClient
            .from('events')
            .select('*, branches(name)')
            .order('start_at', { ascending: false });

        if (error) {
            console.error(error);
            showAlert('danger', 'Unable to load events.');
            eventsTableBody.innerHTML = '<tr><td colspan="8" class="text-center">Unable to load data.</td></tr>';
            return;
        }

        events = data || [];
        renderTable(events);
    } catch (err) {
        console.error(err);
        showAlert('danger', 'Unable to load events.');
        eventsTableBody.innerHTML = '<tr><td colspan="8" class="text-center">Unable to load data.</td></tr>';
    }
}

function getBranchName(branchId) {
    const branch = branches.find(b => b.id === branchId);
    return branch ? branch.name : 'Unknown';
}

function getEventPayload() {
    if (!eventForm) {
        showAlert('danger', 'Event form is unavailable.');
        return null;
    }

    const title = eventTitleInput?.value.trim();
    if (!title) {
        showAlert('warning', 'Title is required.');
        return null;
    }

    const branchId = eventBranchSelect?.value;
    if (!branchId) {
        showAlert('warning', 'Branch is required.');
        return null;
    }

    const startAt = eventStartAtInput?.value;
    if (!startAt) {
        showAlert('warning', 'Start date & time is required.');
        return null;
    }

    const capacity = Number(eventCapacityInput?.value);
    const tags = (eventTagsInput?.value || '')
        .split(',')
        .map(tag => tag.trim())
        .filter(Boolean);
    const status = eventStatusSelect?.value || 'Draft';

    return {
        title,
        slug: eventSlugInput?.value.trim() || generateSlug(title),
        branch_id: branchId,
        short_description: eventShortDescInput?.value.trim() || null,
        description: eventDescInput?.value.trim() || null,
        location: eventLocationInput?.value.trim() || null,
        start_at: startAt,
        end_at: eventEndAtInput?.value || null,
        capacity: Number.isNaN(capacity) ? null : capacity,
        registration_required: eventRegistrationSelect?.value === 'true',
        poster_path: eventPosterInput?.value.trim() || null,
        tags,
        status,
    };
}

function badgeClass(status) {
    if (!status) return 'bg-secondary';
    switch ((status || '').toLowerCase()) {
        case 'published': return 'bg-success';
        case 'canceled': return 'bg-danger';
        default: return 'bg-warning text-dark';
    }
}

function capitalizeStatus(status) {
    if (!status) return 'Draft';
    return `${status.charAt(0).toUpperCase()}${status.slice(1).toLowerCase()}`;
}

function renderTable(list) {
    if (!eventsTableBody) {
        console.warn('[Events] renderTable missing eventsTableBody');
        return;
    }

    if (!list.length) {
        eventsTableBody.innerHTML = '<tr><td colspan="8" class="text-center py-4">No events found.</td></tr>';
        return;
    }

    eventsTableBody.innerHTML = list.map(item => {
        const desc = (item.short_description || '').length > 80
            ? `${item.short_description.slice(0, 80)}...`
            : (item.short_description || '');
        const branchName = item.branches?.name || getBranchName(item.branch_id);
        const capacityValue = item.capacity != null ? item.capacity : '—';
        return `
            <tr data-id="${escapeHtml(item.id)}">
                <td>${escapeHtml(item.title)}</td>
                <td>${escapeHtml(branchName)}</td>
                <td class="truncate-2">${escapeHtml(desc)}</td>
                <td>${escapeHtml(formatDate(item.start_at))}</td>
                <td>${escapeHtml(formatDate(item.end_at))}</td>
                <td><span class="badge ${badgeClass(item.status)}">${escapeHtml(capitalizeStatus(item.status))}</span></td>
                <td>${escapeHtml(capacityValue)}</td>
                <td class="text-end">
                    <button class="btn btn-sm btn-outline-light me-2 edit-btn">Edit</button>
                    <button class="btn btn-sm btn-outline-secondary delete-btn">Delete</button>
                </td>
            </tr>
        `;
    }).join('');
}

function applyFilters() {
    const q = (eventsSearch.value || '').trim().toLowerCase();
    const status = (eventsStatusFilter.value || '').toLowerCase();
    const branchId = eventsBranchFilter.value;

    const filtered = events.filter(e => {
        const branchName = e.branches?.name || '';
        const eventStatus = (e.status || '').toLowerCase();
        const matchesQuery = !q || ((e.title || '').toLowerCase().includes(q) || branchName.toLowerCase().includes(q) || (e.short_description || '').toLowerCase().includes(q));
        const matchesStatus = !status || (eventStatus === status);
        const matchesBranch = !branchId || (String(e.branch_id) === String(branchId));
        return matchesQuery && matchesStatus && matchesBranch;
    });

    renderTable(filtered);
}

function openEventModal(event = null) {
    editingEvent = event;
    document.querySelector('#eventModal .modal-title').textContent = event ? 'Edit Event' : 'New Event';

    if (event) {
        document.getElementById('eventTitle').value = event.title || '';
        document.getElementById('eventSlug').value = event.slug || '';
        document.getElementById('eventBranch').value = event.branch_id || '';
        document.getElementById('eventShortDesc').value = event.short_description || '';
        document.getElementById('eventDesc').value = event.description || '';
        document.getElementById('eventLocation').value = event.location || '';
        document.getElementById('eventStartAt').value = event.start_at ? event.start_at.replace('Z', '') : '';
        document.getElementById('eventEndAt').value = event.end_at ? event.end_at.replace('Z', '') : '';
        document.getElementById('eventCapacity').value = event.capacity || '';
        document.getElementById('eventRegistration').value = event.registration_required ? 'true' : 'false';
        document.getElementById('eventPoster').value = event.poster_path || '';
        document.getElementById('eventTags').value = (Array.isArray(event.tags) ? event.tags.join(', ') : event.tags) || '';
        document.getElementById('eventStatus').value = event.status || 'Draft';
        document.getElementById('eventDelete').classList.remove('d-none');
    } else {
        document.getElementById('eventForm').reset();
        document.getElementById('eventSlug').value = '';
        document.getElementById('eventStatus').value = 'Draft';
        document.getElementById('eventDelete').classList.add('d-none');
    }

    eventModal.show();
}

document.getElementById('eventTitle')?.addEventListener('input', (e) => {
    document.getElementById('eventSlug').value = generateSlug(e.target.value);
});

eventsTableBody?.addEventListener('click', async (e) => {
    const tr = e.target.closest('tr');
    if (!tr) return;
    const id = tr.getAttribute('data-id');
    const event = events.find(ev => String(ev.id) === String(id));

    if (e.target.classList.contains('edit-btn')) {
        openEventModal(event);
    }

    if (e.target.classList.contains('delete-btn')) {
        if (!confirm('Delete this event?')) return;
        await deleteEvent(event.id);
    }
});

async function saveEvent() {
    const payload = getEventPayload();
    if (!payload) return;

    console.debug('[Events] saveEvent payload', payload, { editingEvent });

    try {
        const result = editingEvent
            ? await supabaseClient.from('events').update(payload).eq('id', editingEvent.id).select('*, branches(name)')
            : await supabaseClient.from('events').insert([payload]).select('*, branches(name)');

        console.debug('[Events] saveEvent result', result);

        if (result.error) {
            console.error('[Events] saveEvent failed', result.error);
            showAlert('danger', `Unable to save event. ${result.error.message}`);
            return;
        }

        await loadEvents();
        eventModal?.hide();
        showAlert('success', editingEvent ? 'Event updated.' : 'Event created.');
    } catch (err) {
        console.error('[Events] saveEvent exception', err);
        showAlert('danger', 'Unable to save event.');
    }
}

async function deleteEvent(id) {
    try {
        const { error } = await supabaseClient
            .from('events')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('[Events] deleteEvent failed', error);
            showAlert('danger', `Unable to delete event. ${error.message}`);
            return false;
        }

        await loadEvents();
        showAlert('success', 'Event deleted.');
        return true;
    } catch (err) {
        console.error('[Events] deleteEvent exception', err);
        showAlert('danger', 'Unable to delete event.');
        return false;
    }
}

createEventBtn?.addEventListener('click', () => openEventModal());
eventsSearch?.addEventListener('input', () => applyFilters());
eventsStatusFilter?.addEventListener('change', () => applyFilters());
eventsBranchFilter?.addEventListener('change', () => applyFilters());
eventSaveButton?.addEventListener('click', saveEvent);
eventDeleteButton?.addEventListener('click', async () => {
    if (!editingEvent) return;
    if (!confirm('Delete this event?')) return;
    const deleted = await deleteEvent(editingEvent.id);
    if (deleted) {
        eventModal.hide();
    }
});

const signOutAndRedirect = async () => { await supabaseClient.auth.signOut(); window.location.href = './login.html'; };
logoutButton?.addEventListener('click', signOutAndRedirect);
sidebarLogout?.addEventListener('click', async (event) => { event.preventDefault(); await signOutAndRedirect(); });

(async function init() {
    const session = await protectPage();
    if (!session) return;
    adminUserEmail.textContent = session.user.email || 'Admin';
    await loadBranches();
    await loadEvents();
})();
