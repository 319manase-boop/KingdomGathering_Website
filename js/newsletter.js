(function () {
    // Newsletter subscription module for website forms and admin management.
    // It currently stores subscribers in Supabase and leaves room for future campaign automation.
    const TABLE_NAME = 'newsletter_subscribers';
    const PAGE_SIZE = 8;
    const DEFAULT_CAMPAIGN_PREFERENCES = {
        blog_posts: true,
        events: true,
        announcements: true
    };

    function getSupabaseClient() {
        return window.supabaseClient || null;
    }

    function validateEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || '').trim());
    }

    function setMessage(form, messageEl, type, text) {
        if (!messageEl) return;
        const baseClass = 'newsletter-message';
        const typeClass = type === 'success' ? 'is-success' : type === 'error' ? 'is-error' : '';
        messageEl.className = typeClass ? `${baseClass} ${typeClass}` : baseClass;
        messageEl.textContent = text || '';
    }

    function setSubmitState(form, isSubmitting) {
        const button = form?.querySelector('button[type="submit"]');
        if (!button) return;
        button.disabled = isSubmitting;
        button.dataset.originalText = button.dataset.originalText || button.textContent;
        button.innerHTML = isSubmitting
            ? '<span class="me-2"><i class="fas fa-spinner fa-spin"></i></span>Subscribing...'
            : button.dataset.originalText;
    }

    async function subscribeToNewsletter(form) {
        const client = getSupabaseClient();
        if (!client) {
            throw new Error('Supabase client is unavailable.');
        }

        const input = form?.querySelector('input[type="email"]');
        const messageEl = form?.querySelector('[data-newsletter-message]');
        const source = form?.dataset.newsletterSource || 'unknown';
        const email = String(input?.value || '').trim().toLowerCase();

        if (!validateEmail(email)) {
            setMessage(form, messageEl, 'error', 'Please enter a valid email address.');
            input?.focus();
            return;
        }

        setSubmitState(form, true);
        setMessage(form, messageEl, '', '');

        try {
            const payload = {
                email,
                source: 'homepage',
                status: 'active',
                campaign_preferences: DEFAULT_CAMPAIGN_PREFERENCES
            };

            const { error: insertError } = await client
                .from(TABLE_NAME)
                .insert(payload);

            if (insertError) {
                if (insertError.code === '23505') {
                    setMessage(form, messageEl, 'error', "You're already subscribed to our newsletter.");
                    return;
                }

                throw insertError;
            }

            form.reset();
            setMessage(form, messageEl, 'success', 'Thank you for subscribing. We will keep you updated with church news and events.');
        } catch (error) {
            if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
                console.error('[newsletter] Subscription failed:', error);
            }
            setMessage(form, messageEl, 'error', "We couldn't complete your subscription. Please try again.");
        } finally {
            setSubmitState(form, false);
        }
    }

    // Initialize the public subscription form used on the homepage and footer.
    function initializeNewsletterForm(form) {
        if (!form || form.dataset.newsletterInitialized === 'true') {
            return;
        }

        form.addEventListener('submit', async (event) => {
            event.preventDefault();
            await subscribeToNewsletter(form);
        });

        form.dataset.newsletterInitialized = 'true';
    }

    function scanForNewsletterForms() {
        document.querySelectorAll('[data-newsletter-form]').forEach((form) => {
            initializeNewsletterForm(form);
        });
    }

    function formatDate(value) {
        if (!value) return '—';
        try {
            return new Date(value).toLocaleString();
        } catch (error) {
            return value;
        }
    }

    function normalizeSubscriber(item) {
        return {
            id: item.id,
            email: item.email || '',
            source: item.source || 'Unknown',
            status: String(item.status || 'active').toLowerCase() === 'unsubscribed' ? 'Unsubscribed' : 'Active',
            created_at: item.created_at || item.subscribed_at || ''
        };
    }

    function showAdminAlert(type, message) {
        const alertEl = document.getElementById('newsletterAlert');
        if (!alertEl) return;
        alertEl.className = `alert alert-${type} mt-3`;
        alertEl.textContent = message;
        alertEl.classList.remove('d-none');
    }

    function hideAdminAlert() {
        const alertEl = document.getElementById('newsletterAlert');
        if (!alertEl) return;
        alertEl.className = 'alert alert-info mt-3 d-none';
        alertEl.textContent = '';
    }

    // Initialize the admin subscriber management experience with search, sort, export, and delete actions.
    function initNewsletterAdmin() {
        const adminRoot = document.getElementById('newsletterAdminApp');
        if (!adminRoot || adminRoot.dataset.initialized === 'true') {
            return;
        }

        adminRoot.dataset.initialized = 'true';
        const tableBody = document.getElementById('newsletterTableBody');
        const searchInput = document.getElementById('newsletterSearch');
        const sortSelect = document.getElementById('newsletterSort');
        const statusFilter = document.getElementById('newsletterStatusFilter');
        const paginationEl = document.getElementById('newsletterPagination');
        const summaryCountEl = document.getElementById('newsletterSummaryCount');
        const summaryPageEl = document.getElementById('newsletterSummaryPage');
        const totalStatsEl = document.getElementById('newsletterStatsTotal');
        const activeStatsEl = document.getElementById('newsletterStatsActive');
        const unsubscribedStatsEl = document.getElementById('newsletterStatsUnsubscribed');
        const monthStatsEl = document.getElementById('newsletterStatsMonth');
        const refreshButton = document.getElementById('newsletterRefreshBtn');
        const exportButton = document.getElementById('newsletterExportBtn');

        let subscribers = [];
        let filteredSubscribers = [];
        let currentPage = 1;

        function render() {
            const query = (searchInput?.value || '').trim().toLowerCase();
            const sortKey = sortSelect?.value || 'newest';
            const statusValue = statusFilter?.value || 'all';

            let items = [...subscribers];

            if (query) {
                items = items.filter((subscriber) => {
                    const haystack = `${subscriber.email} ${subscriber.source}`.toLowerCase();
                    return haystack.includes(query);
                });
            }

            if (statusValue !== 'all') {
                items = items.filter((subscriber) => subscriber.status.toLowerCase() === statusValue);
            }

            items.sort((left, right) => {
                if (sortKey === 'oldest') {
                    return new Date(left.created_at || 0) - new Date(right.created_at || 0);
                }
                if (sortKey === 'email') {
                    return left.email.localeCompare(right.email);
                }
                return new Date(right.created_at || 0) - new Date(left.created_at || 0);
            });

            filteredSubscribers = items;
            const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
            currentPage = Math.min(currentPage, totalPages);

            renderTable();
            renderPagination(totalPages);
            updateSummary();
        }

        function renderTable() {
            if (!tableBody) return;
            const start = (currentPage - 1) * PAGE_SIZE;
            const pageItems = filteredSubscribers.slice(start, start + PAGE_SIZE);

            if (!pageItems.length) {
                tableBody.innerHTML = '<tr><td colspan="5" class="newsletter-empty">No subscribers match your search yet.</td></tr>';
                return;
            }

            tableBody.innerHTML = pageItems.map((subscriber) => `
                <tr>
                    <td>${subscriber.email}</td>
                    <td>${subscriber.source}</td>
                    <td><span class="newsletter-badge ${subscriber.status.toLowerCase() === 'active' ? 'active' : 'unsubscribed'}">${subscriber.status}</span></td>
                    <td>${formatDate(subscriber.created_at)}</td>
                    <td>
                        <div class="d-flex flex-wrap gap-2">
                            <button class="btn btn-sm btn-outline-light" type="button" onclick="window.viewNewsletterSubscriber('${subscriber.email}')">View</button>
                            <button class="btn btn-sm btn-outline-warning" type="button" onclick="window.toggleNewsletterSubscriberStatus('${subscriber.id}', '${subscriber.status}')">${subscriber.status === 'Active' ? 'Unsubscribe' : 'Reactivate'}</button>
                            <button class="btn btn-sm btn-outline-danger" type="button" onclick="window.deleteNewsletterSubscriber('${subscriber.id}')">Delete</button>
                        </div>
                    </td>
                </tr>
            `).join('');
        }

        function renderPagination(totalPages) {
            if (!paginationEl) return;
            if (totalPages <= 1) {
                paginationEl.innerHTML = '';
                return;
            }

            const items = [];
            for (let index = 1; index <= totalPages; index += 1) {
                items.push(`
                    <li class="page-item ${index === currentPage ? 'active' : ''}">
                        <button class="page-link" type="button" data-page="${index}">${index}</button>
                    </li>
                `);
            }

            paginationEl.innerHTML = items.join('');
            paginationEl.querySelectorAll('[data-page]').forEach((button) => {
                button.addEventListener('click', () => {
                    currentPage = Number(button.getAttribute('data-page'));
                    renderTable();
                    renderPagination(totalPages);
                    updateSummary();
                });
            });
        }

        function updateSummary() {
            if (summaryCountEl) {
                summaryCountEl.textContent = `${filteredSubscribers.length} subscriber${filteredSubscribers.length === 1 ? '' : 's'}`;
            }
            if (summaryPageEl) {
                const totalPages = Math.max(1, Math.ceil(filteredSubscribers.length / PAGE_SIZE));
                summaryPageEl.textContent = `Page ${currentPage} of ${totalPages}`;
            }
            if (totalStatsEl) {
                totalStatsEl.textContent = `Total subscribers: ${subscribers.length}`;
            }
            if (activeStatsEl) {
                activeStatsEl.textContent = `Active: ${subscribers.filter((item) => item.status === 'Active').length}`;
            }
            if (unsubscribedStatsEl) {
                unsubscribedStatsEl.textContent = `Unsubscribed: ${subscribers.filter((item) => item.status === 'Unsubscribed').length}`;
            }
            if (monthStatsEl) {
                const thisMonth = subscribers.filter((item) => {
                    if (!item.created_at) return false;
                    const created = new Date(item.created_at);
                    const now = new Date();
                    return created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear();
                });
                monthStatsEl.textContent = `New this month: ${thisMonth.length}`;
            }
        }

        async function loadSubscribers() {
            const client = getSupabaseClient();
            if (!client) {
                showAdminAlert('danger', 'Supabase client is unavailable.');
                return;
            }

            hideAdminAlert();
            try {
                const { data, error } = await client
                    .from(TABLE_NAME)
                    .select('*')
                    .order('created_at', { ascending: false });

                if (error) {
                    throw error;
                }

                subscribers = (data || []).map(normalizeSubscriber);
                render();
            } catch (error) {
                console.error('[newsletter] Admin load failed:', error);
                showAdminAlert('danger', 'Unable to load subscribers right now.');
            }
        }

        searchInput?.addEventListener('input', () => {
            currentPage = 1;
            render();
        });

        sortSelect?.addEventListener('change', () => {
            currentPage = 1;
            render();
        });

        statusFilter?.addEventListener('change', () => {
            currentPage = 1;
            render();
        });

        refreshButton?.addEventListener('click', () => {
            loadSubscribers();
        });

        exportButton?.addEventListener('click', () => {
            if (!filteredSubscribers.length) {
                showAdminAlert('info', 'There are no subscribers to export.');
                return;
            }

            const rows = filteredSubscribers.map((subscriber) => [
                subscriber.email,
                subscriber.status,
                subscriber.source,
                subscriber.created_at
            ]);
            const csvContent = [
                ['Email', 'Status', 'Source', 'Date Subscribed'],
                ...rows
            ].map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(',')).join('\n');

            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = 'newsletter-subscribers.csv';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        });

        window.viewNewsletterSubscriber = function (email) {
            showAdminAlert('info', `Selected subscriber: ${email}`);
        };

        window.toggleNewsletterSubscriberStatus = async function (id, currentStatus) {
            const client = getSupabaseClient();
            if (!client) {
                showAdminAlert('danger', 'Supabase client is unavailable.');
                return;
            }

            const nextStatus = currentStatus === 'Active' ? 'unsubscribed' : 'active';
            try {
                const { error } = await client.from(TABLE_NAME).update({ status: nextStatus }).eq('id', id);
                if (error) {
                    throw error;
                }
                showAdminAlert('success', `Subscriber ${nextStatus === 'active' ? 'reactivated' : 'unsubscribed'} successfully.`);
                await loadSubscribers();
            } catch (error) {
                console.error('[newsletter] Status update failed:', error);
                showAdminAlert('danger', 'Unable to update subscriber status.');
            }
        };

        window.deleteNewsletterSubscriber = async function (id) {
            if (!id || !window.confirm('Delete this subscriber?')) {
                return;
            }

            const client = getSupabaseClient();
            if (!client) {
                showAdminAlert('danger', 'Supabase client is unavailable.');
                return;
            }

            try {
                const { error } = await client.from(TABLE_NAME).delete().eq('id', id);
                if (error) {
                    throw error;
                }
                showAdminAlert('success', 'Subscriber deleted successfully.');
                await loadSubscribers();
            } catch (error) {
                console.error('[newsletter] Delete failed:', error);
                showAdminAlert('danger', 'Unable to delete this subscriber.');
            }
        };

        loadSubscribers();
    }

    function initialize() {
        scanForNewsletterForms();
        initNewsletterAdmin();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        initialize();
    }

    const observer = new MutationObserver(() => {
        scanForNewsletterForms();
    });

    if (document.body) {
        observer.observe(document.body, { childList: true, subtree: true });
    }
})();
