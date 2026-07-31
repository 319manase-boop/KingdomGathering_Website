// Admin Events management

const eventsSearch = document.getElementById('eventsSearch');
const eventsStatusFilter = document.getElementById('eventsStatusFilter');
const eventsBranchFilter = document.getElementById('eventsBranchFilter');
const eventsTableBody = document.getElementById('eventsTableBody');
const eventsAlertContainer = document.getElementById('eventsAlertContainer');
const createEventBtn = document.getElementById('createEventBtn');
const eventModalEl = document.getElementById('eventModal');
const eventModal = eventModalEl ? new bootstrap.Modal(eventModalEl) : null;
const registrationsModalEl = document.getElementById('registrationsModal');
const registrationsModal = registrationsModalEl ? new bootstrap.Modal(registrationsModalEl) : null;
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
const eventRegistrationStatusSelect = document.getElementById('eventRegistrationStatus');
const eventRegistrationDeadlineInput = document.getElementById('eventRegistrationDeadline');
const eventRegistrationFeeInput = document.getElementById('eventRegistrationFee');
const eventPosterInput = document.getElementById('eventPoster');
const eventTagsInput = document.getElementById('eventTags');
const eventStatusSelect = document.getElementById('eventStatus');
const eventSaveButton = document.getElementById('eventSave');
const eventDeleteButton = document.getElementById('eventDelete');

const registrationsEventTitle = document.getElementById('registrationsEventTitle');
const registrationsEventMeta = document.getElementById('registrationsEventMeta');
const registrationsAlertContainer = document.getElementById('registrationsAlertContainer');
const registrationsTotalCount = document.getElementById('registrationsTotalCount');
const registrationsConfirmedAttendees = document.getElementById('registrationsConfirmedAttendees');
const registrationsRemainingSpaces = document.getElementById('registrationsRemainingSpaces');
const registrationsCapacity = document.getElementById('registrationsCapacity');
const registrationsDeadline = document.getElementById('registrationsDeadline');
const registrationsState = document.getElementById('registrationsState');
const registrationsSearch = document.getElementById('registrationsSearch');
const registrationsStatusFilter = document.getElementById('registrationsStatusFilter');
const registrationsExportBtn = document.getElementById('registrationsExportBtn');
const copyRegistrationLinkBtn = document.getElementById('copyRegistrationLinkBtn');
const whatsappShareRegistrationBtn = document.getElementById('whatsappShareRegistrationBtn');
const facebookShareRegistrationBtn = document.getElementById('facebookShareRegistrationBtn');
const emailShareRegistrationBtn = document.getElementById('emailShareRegistrationBtn');
const nativeShareRegistrationBtn = document.getElementById('nativeShareRegistrationBtn');
const registrationsTableBody = document.getElementById('registrationsTableBody');

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
    const fee = Number(eventRegistrationFeeInput?.value);
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
        registration_status: eventRegistrationStatusSelect?.value || 'open',
        registration_deadline: eventRegistrationDeadlineInput?.value || null,
        registration_fee: Number.isNaN(fee) ? null : fee,
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
        eventsTableBody.innerHTML = '<tr><td colspan="9" class="text-center py-4">No events found.</td></tr>';
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
                <td>
                    <button class="btn btn-sm btn-outline-info registrations-btn me-2">Registrations</button>
                </td>
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

let currentRegistrations = [];
let currentRegistrationEvent = null;
let registrationHandlersAttached = false;

function showRegistrationsAlert(type, message, timeout = 4000) {
    if (!registrationsAlertContainer) return;
    const el = document.createElement('div');
    el.className = `alert alert-${type} alert-dismissible fade show`;
    el.role = 'alert';
    el.innerHTML = `${message} <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>`;
    registrationsAlertContainer.appendChild(el);
    setTimeout(() => { el.classList.remove('show'); el.remove(); }, timeout);
}

function formatRegistrationDate(value) {
    if (!value) return 'N/A';
    try { return new Date(value).toLocaleString(); } catch (err) { return 'N/A'; }
}

function renderRegistrationsTable(list) {
    if (!registrationsTableBody) {
        console.warn('[Events] renderRegistrationsTable missing registrationsTableBody');
        return;
    }

    if (!list.length) {
        registrationsTableBody.innerHTML = '<tr><td colspan="9" class="text-center py-4">No registrations found.</td></tr>';
        return;
    }

    registrationsTableBody.innerHTML = list.map(item => {
        return `
            <tr data-id="${escapeHtml(item.id)}">
                <td>${escapeHtml(item.full_name)}</td>
                <td>${escapeHtml(item.email)}</td>
                <td>${escapeHtml(item.phone)}</td>
                <td>${escapeHtml(item.attendee_count)}</td>
                <td>${escapeHtml(item.church_or_ministry)}</td>
                <td>${escapeHtml(item.source)}</td>
                <td>${escapeHtml(item.status)}</td>
                <td>${escapeHtml(formatRegistrationDate(item.created_at))}</td>
                <td>
                    <button class="btn btn-sm btn-outline-light view-registration-btn">View</button>
                </td>
            </tr>
        `;
    }).join('');
}

function updateRegistrationSummary(eventItem, registrations) {
    if (!registrationsTotalCount || !registrationsConfirmedAttendees || !registrationsRemainingSpaces || !registrationsCapacity || !registrationsDeadline || !registrationsState) {
        return;
    }

    const total = registrations.length;
    const confirmedAttendees = registrations.reduce((sum, row) => sum + Number(row.attendee_count || 0), 0);
    const capacityValue = eventItem.capacity != null ? eventItem.capacity : 'Unlimited';
    const remaining = eventItem.capacity != null ? Math.max(0, eventItem.capacity - confirmedAttendees) : '—';

    registrationsTotalCount.textContent = total;
    registrationsConfirmedAttendees.textContent = confirmedAttendees;
    registrationsRemainingSpaces.textContent = eventItem.capacity != null ? remaining : '—';
    registrationsCapacity.textContent = eventItem.capacity != null ? eventItem.capacity : 'Unlimited';
    registrationsDeadline.textContent = eventItem.registration_deadline ? new Date(eventItem.registration_deadline).toLocaleString() : 'None';
    registrationsState.textContent = eventItem.registration_status ? eventItem.registration_status : 'open';
}

function applyRegistrationFilters() {
    if (!currentRegistrations) return;

    const q = (registrationsSearch?.value || '').trim().toLowerCase();
    const status = (registrationsStatusFilter?.value || '').toLowerCase();

    const filtered = currentRegistrations.filter(reg => {
        const matchesQuery = !q || [reg.full_name, reg.email, reg.phone, reg.source, reg.church_or_ministry]
            .filter(Boolean)
            .some(value => String(value).toLowerCase().includes(q));
        const matchesStatus = !status || (String(reg.status || '').toLowerCase() === status);
        return matchesQuery && matchesStatus;
    });

    renderRegistrationsTable(filtered);
}

async function loadRegistrations(eventItem) {
    if (!eventItem) return;
    if (!registrationsTableBody) return;

    registrationsTableBody.innerHTML = '<tr><td colspan="9" class="text-center py-4">Loading registrations...</td></tr>';

    try {
        const { data, error } = await supabaseClient
            .from('event_registrations')
            .select('*')
            .eq('event_id', eventItem.id)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('[Events] loadRegistrations error', error);
            showRegistrationsAlert('danger', 'Unable to load registrations.');
            currentRegistrations = [];
            renderRegistrationsTable([]);
            return;
        }

        currentRegistrations = data || [];
        renderRegistrationsTable(currentRegistrations);
        updateRegistrationSummary(eventItem, currentRegistrations);
    } catch (err) {
        console.error('[Events] loadRegistrations exception', err);
        showRegistrationsAlert('danger', 'Unable to load registrations.');
        currentRegistrations = [];
        renderRegistrationsTable([]);
    }
}

function openRegistrationDetails(registration) {
    const modalBody = document.getElementById('viewRegistrationBody');
    if (!modalBody) return;

    modalBody.innerHTML = `
        <div class="row g-3">
            <div class="col-md-6"><strong>Full Name</strong><div>${escapeHtml(registration.full_name)}</div></div>
            <div class="col-md-6"><strong>Email</strong><div>${escapeHtml(registration.email)}</div></div>
            <div class="col-md-6"><strong>Phone</strong><div>${escapeHtml(registration.phone)}</div></div>
            <div class="col-md-6"><strong>Attendee Count</strong><div>${escapeHtml(registration.attendee_count)}</div></div>
            <div class="col-md-6"><strong>Church / Ministry</strong><div>${escapeHtml(registration.church_or_ministry)}</div></div>
            <div class="col-md-6"><strong>Source</strong><div>${escapeHtml(registration.source)}</div></div>
            <div class="col-md-6"><strong>Status</strong><div>${escapeHtml(registration.status)}</div></div>
            <div class="col-12"><strong>Notes</strong><div>${escapeHtml(registration.notes || '—')}</div></div>
            <div class="col-12"><strong>Registered At</strong><div>${escapeHtml(formatRegistrationDate(registration.created_at))}</div></div>
        </div>
    `;

    const viewModalEl = document.getElementById('viewRegistrationModal');
    const viewRegistrationModal = viewModalEl ? new bootstrap.Modal(viewModalEl) : null;
    viewRegistrationModal?.show();
}

function generateRegistrationCsv(rows) {
    const header = ['Full Name', 'Email', 'Phone', 'Attendees', 'Church / Ministry', 'Source', 'Status', 'Registered At'];
    const csvRows = [header.join(',')];
    rows.forEach(row => {
        const values = [
            row.full_name,
            row.email,
            row.phone,
            row.attendee_count,
            row.church_or_ministry,
            row.source,
            row.status,
            formatRegistrationDate(row.created_at)
        ].map(value => `"${String(value || '').replace(/"/g, '""')}"`);
        csvRows.push(values.join(','));
    });
    return csvRows.join('\r\n');
}

function setupRegistrationShareButtons() {
    if (!currentRegistrationEvent) return;
    const shareUrl = `${window.location.origin}/event-register.html?event=${currentRegistrationEvent.id}`;
    copyRegistrationLinkBtn?.addEventListener('click', async () => {
        try {
            await navigator.clipboard.writeText(shareUrl);
            showRegistrationsAlert('success', 'Registration link copied to clipboard.');
        } catch (err) {
            console.error('[Events] copyRegistrationLinkBtn', err);
            showRegistrationsAlert('danger', 'Unable to copy link. Please copy manually.');
        }
    });
    whatsappShareRegistrationBtn?.addEventListener('click', () => {
        window.open(`https://wa.me/?text=${encodeURIComponent(`Register for ${currentRegistrationEvent.title} at Kingdom Gathering Church. ${shareUrl}`)}`, '_blank');
    });
    facebookShareRegistrationBtn?.addEventListener('click', () => {
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`, '_blank');
    });
    emailShareRegistrationBtn?.addEventListener('click', () => {
        window.location.href = `mailto:?subject=${encodeURIComponent(`Register for ${currentRegistrationEvent.title}`)}&body=${encodeURIComponent(`Register for ${currentRegistrationEvent.title} at Kingdom Gathering Church.\n\nRegister here: ${shareUrl}`)}`;
    });
    if (navigator.share) {
        nativeShareRegistrationBtn?.classList.remove('d-none');
        nativeShareRegistrationBtn?.addEventListener('click', async () => {
            try {
                await navigator.share({
                    title: `Register for ${currentRegistrationEvent.title}`,
                    text: `Register for ${currentRegistrationEvent.title} at Kingdom Gathering Church.`,
                    url: shareUrl
                });
            } catch (err) {
                console.error('[Events] native registration share failed', err);
            }
        });
    }
}

function attachRegistrationModalHandlers() {
    if (registrationHandlersAttached) return;
    registrationsSearch?.addEventListener('input', applyRegistrationFilters);
    registrationsStatusFilter?.addEventListener('change', applyRegistrationFilters);
    registrationsExportBtn?.addEventListener('click', () => {
        downloadCsv('event-registrations.csv', generateRegistrationCsv(currentRegistrations));
    });
    setupRegistrationShareButtons();
    registrationHandlersAttached = true;
}

function downloadCsv(filename, content) {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

function openRegistrationsModal(eventItem) {
    if (!eventItem) return;
    currentRegistrationEvent = eventItem;
    registrationsEventTitle.textContent = eventItem.title || 'Event';
    registrationsEventMeta.textContent = `Starts ${formatDate(eventItem.start_at)} · ${eventItem.location || 'Location TBD'}`;
    currentRegistrations = [];
    renderRegistrationsTable([]);
    updateRegistrationSummary(eventItem, []);
    setupRegistrationShareButtons();
    attachRegistrationModalHandlers();
    registrationsModal?.show();
    loadRegistrations(eventItem);
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
        document.getElementById('eventRegistrationStatus').value = event.registration_status || 'open';
        document.getElementById('eventRegistrationDeadline').value = event.registration_deadline ? event.registration_deadline.replace('Z', '') : '';
        document.getElementById('eventRegistrationFee').value = event.registration_fee != null ? event.registration_fee : '';
        document.getElementById('eventPoster').value = event.poster_path || '';
        document.getElementById('eventTags').value = (Array.isArray(event.tags) ? event.tags.join(', ') : event.tags) || '';
        document.getElementById('eventStatus').value = event.status || 'Draft';
        document.getElementById('eventDelete').classList.remove('d-none');
    } else {
        document.getElementById('eventForm').reset();
        document.getElementById('eventSlug').value = '';
        document.getElementById('eventRegistrationStatus').value = 'open';
        document.getElementById('eventRegistrationDeadline').value = '';
        document.getElementById('eventRegistrationFee').value = '';
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

    if (e.target.classList.contains('registrations-btn')) {
        openRegistrationsModal(event);
        return;
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
