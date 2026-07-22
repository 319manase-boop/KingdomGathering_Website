(function () {
    const TABLE_NAME = 'newsletter_campaigns';
    const VALID_CAMPAIGN_TYPES = ['blog', 'event', 'announcement'];
    const VALID_STATUSES = ['draft', 'ready', 'scheduled', 'sending', 'sent', 'failed'];
    const MANAGE_ROLES = ['super_admin', 'pastor', 'secretary'];
    const READ_ONLY_ROLES = ['media_team'];
    let cachedCampaigns = [];
    let currentRole = null;
    let roleResolved = false;

    function getSupabaseClient() {
        return window.supabaseClient || null;
    }

    function getCurrentUserId() {
        return window.__adminUserId || null;
    }

    function showAlert(type, message) {
        const alertEl = document.getElementById('newsletterAlert');
        if (!alertEl) return;
        alertEl.className = `alert alert-${type} mt-3`;
        alertEl.textContent = message;
        alertEl.classList.remove('d-none');
    }

    function hideAlert() {
        const alertEl = document.getElementById('newsletterAlert');
        if (!alertEl) return;
        alertEl.className = 'alert alert-info mt-3 d-none';
        alertEl.textContent = '';
    }

    function escapeHtml(value) {
        return String(value || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    function formatDate(value) {
        if (!value) return '—';
        try {
            return new Date(value).toLocaleString();
        } catch (error) {
            return value;
        }
    }

    function getEditorContent() {
        const editor = document.getElementById('campaignEditor');
        const hidden = document.getElementById('campaignContent');
        if (editor) {
            hidden.value = editor.innerHTML.trim();
        }
        return hidden.value;
    }

    function setEditorContent(value) {
        const editor = document.getElementById('campaignEditor');
        const hidden = document.getElementById('campaignContent');
        if (editor) {
            editor.innerHTML = value || '';
        }
        if (hidden) {
            hidden.value = value || '';
        }
    }

    function setFormMode(isReadOnly) {
        const form = document.getElementById('campaignForm');
        const permissionBadge = document.getElementById('campaignPermissionBadge');
        const controls = form?.querySelectorAll('input, select, button, textarea');
        if (permissionBadge) {
            permissionBadge.textContent = isReadOnly ? 'Read Only' : 'Manage';
            permissionBadge.className = `newsletter-pill ${isReadOnly ? 'bg-secondary' : ''}`;
        }
        controls?.forEach((control) => {
            if (control.id === 'campaignId' || control.id === 'campaignContent') return;
            control.disabled = isReadOnly;
        });
    }

    function setPermissionLoadingState() {
        const permissionBadge = document.getElementById('campaignPermissionBadge');
        if (permissionBadge) {
            permissionBadge.textContent = 'Loading...';
            permissionBadge.className = 'newsletter-pill';
        }
        setFormMode(true);
    }

    function canManageCampaigns() {
        if (!roleResolved) {
            return false;
        }
        return MANAGE_ROLES.includes(String(currentRole || '').toLowerCase());
    }

    function canReadOnlyCampaigns() {
        if (!roleResolved) {
            return false;
        }
        return READ_ONLY_ROLES.includes(String(currentRole || '').toLowerCase());
    }

    async function resolveCampaignPermissions() {
        setPermissionLoadingState();
        if (typeof window.getCurrentUserRole !== 'function') {
            currentRole = window.__adminUserRole || null;
        } else {
            currentRole = await window.getCurrentUserRole();
        }
        roleResolved = true;

        const rawRole = window.__adminUserRole || 'unknown';
        const normalizedRole = currentRole || 'unknown';
        const canManage = canManageCampaigns();
        const canReadOnly = canReadOnlyCampaigns();

        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            console.log('newsletter-campaigns permission state:', {
                rawRole,
                normalizedRole,
                canManageCampaigns: canManage,
                canReadOnlyCampaigns: canReadOnly
            });
        }

        const permissionBadge = document.getElementById('campaignPermissionBadge');
        if (permissionBadge) {
            if (canManage) {
                permissionBadge.textContent = 'Manage';
                permissionBadge.className = 'newsletter-pill';
            } else {
                permissionBadge.textContent = 'Read Only';
                permissionBadge.className = 'newsletter-pill bg-secondary';
            }
        }

        setFormMode(!canManage);
    }

    function validateEmailAddress(value) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim());
    }

    function setTestEmailStatus(type, message) {
        const statusEl = document.getElementById('testEmailStatus');
        if (!statusEl) return;
        statusEl.className = `newsletter-message ${type === 'success' ? 'is-success' : type === 'error' ? 'is-error' : ''}`;
        statusEl.textContent = message || '';
    }

    function showTestEmailModal(open = true) {
        const overlay = document.getElementById('testEmailModalOverlay');
        if (!overlay) return;
        overlay.classList.toggle('d-none', !open);
    }

    function populateTestEmailCampaignSelect() {
        const select = document.getElementById('testEmailCampaignSelect');
        if (!select) return;
        const campaigns = cachedCampaigns || [];
        select.innerHTML = campaigns.map((campaign) => `
            <option value="${campaign.id}">${escapeHtml(campaign.subject || campaign.title || 'Untitled')} (${escapeHtml(campaign.status || 'draft')})</option>
        `).join('');
    }

    function openTestEmailModal() {
        if (!canManageCampaigns()) {
            showAlert('danger', 'You do not have permission to send test emails.');
            return;
        }
        populateTestEmailCampaignSelect();
        document.getElementById('testEmailAddress').value = '';
        setTestEmailStatus('', '');
        showTestEmailModal(true);
    }

    function closeTestEmailModal() {
        setTestEmailStatus('', '');
        showTestEmailModal(false);
    }

    async function sendTestEmail() {
        const button = document.getElementById('sendTestEmailConfirmBtn');
        const emailInput = document.getElementById('testEmailAddress');
        const campaignSelect = document.getElementById('testEmailCampaignSelect');

        if (!button || !emailInput || !campaignSelect) return;

        const testEmail = String(emailInput.value || '').trim();
        const campaignId = String(campaignSelect.value || '').trim();

        if (!validateEmailAddress(testEmail)) {
            setTestEmailStatus('error', 'Please enter a valid email address.');
            return;
        }

        if (!campaignId) {
            setTestEmailStatus('error', 'Please select a campaign to test.');
            return;
        }

        button.disabled = true;
        const originalText = button.textContent;
        button.textContent = 'Sending...';
        setTestEmailStatus('', 'Sending test email…');

        try {
            const url = `${window.location.origin.replace(/\/+$/, '')}/functions/v1/send-newsletter`;
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    campaign_id: campaignId,
                    test_mode: true,
                    test_email: testEmail
                })
            });

            const responseBody = await response.json();
            if (!response.ok) {
                throw new Error(responseBody?.error || 'Unable to send test email.');
            }

            const emailId = responseBody?.email_id || responseBody?.results?.[0]?.id || null;
            setTestEmailStatus('success', emailId ? `Test email sent successfully. Resend email ID: ${emailId}` : 'Test email sent successfully.');
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            setTestEmailStatus('error', message || 'Failed to send test email.');
        } finally {
            button.disabled = false;
            button.textContent = originalText;
        }
    }

    function normalizeCampaignType(value) {
        return String(value || '').trim().toLowerCase();
    }

    function normalizeCampaignStatus(value) {
        return String(value || 'draft').trim().toLowerCase();
    }

    function getValidIsoDate(value) {
        const trimmed = String(value || '').trim();
        if (!trimmed) return null;
        const date = new Date(trimmed);
        return Number.isFinite(date.getTime()) ? date.toISOString() : null;
    }

    function getCampaignPayload(status) {
        const typeInput = document.getElementById('campaignType');
        const featuredImageUrl = String(document.getElementById('campaignImage').value || '').trim();
        const scheduledFor = document.getElementById('campaignScheduledFor').value;
        const campaignType = normalizeCampaignType(typeInput?.value);
        const normalizedStatus = normalizeCampaignStatus(status);

        const payload = {
            title: document.getElementById('campaignTitle').value.trim(),
            subject: document.getElementById('campaignSubject').value.trim(),
            campaign_type: campaignType,
            content: getEditorContent(),
            status: normalizedStatus,
            created_by: getCurrentUserId() || null
        };

        if (featuredImageUrl) {
            payload.featured_image = featuredImageUrl;
        }

        if (normalizedStatus === 'scheduled') {
            const scheduledIso = getValidIsoDate(scheduledFor);
            if (scheduledIso) {
                payload.scheduled_for = scheduledIso;
            }
        }

        if (normalizedStatus === 'sent') {
            payload.sent_at = new Date().toISOString();
        }

        return payload;
    }

    async function loadCampaigns() {
        const client = getSupabaseClient();
        if (!client) {
            showAlert('danger', 'Supabase client is unavailable.');
            return;
        }

        hideAlert();
        try {
            const { data, error } = await client
                .from(TABLE_NAME)
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;

            cachedCampaigns = data || [];
            renderCampaigns(cachedCampaigns);
        } catch (error) {
            console.error('[newsletter-campaigns] load failed:', error);
            showAlert('danger', 'Unable to load campaigns right now.');
        }
    }

    function renderCampaigns(campaigns) {
        const tableBody = document.getElementById('campaignTableBody');
        const search = (document.getElementById('campaignSearch').value || '').trim().toLowerCase();
        const statusFilter = (document.getElementById('campaignStatusFilter').value || 'all').toLowerCase();
        const typeFilter = (document.getElementById('campaignTypeFilter').value || 'all');

        let items = [...campaigns];
        if (search) {
            items = items.filter((campaign) => `${campaign.title} ${campaign.subject} ${campaign.campaign_type}`.toLowerCase().includes(search));
        }
        if (statusFilter !== 'all') {
            items = items.filter((campaign) => String(campaign.status || '').toLowerCase() === statusFilter);
        }
        if (typeFilter !== 'all') {
            items = items.filter((campaign) => String(campaign.campaign_type || '') === typeFilter);
        }

        if (!tableBody) return;
        if (!items.length) {
            tableBody.innerHTML = '<tr><td colspan="8" class="newsletter-empty">No campaigns found.</td></tr>';
            return;
        }

        tableBody.innerHTML = items.map((campaign) => `
            <tr>
                <td>${escapeHtml(campaign.title || 'Untitled')}</td>
                <td>${escapeHtml(campaign.subject || '—')}</td>
                <td>${escapeHtml(campaign.campaign_type || '—')}</td>
                <td><span class="newsletter-badge active">${escapeHtml(campaign.status || 'draft')}</span></td>
                <td>${escapeHtml(campaign.created_by || '—')}</td>
                <td>${formatDate(campaign.created_at)}</td>
                <td>${formatDate(campaign.scheduled_for)}</td>
                <td>
                    <div class="d-flex flex-wrap gap-2">
                        <button class="btn btn-sm btn-outline-light" type="button" onclick="window.editCampaign('${campaign.id}')" ${canManageCampaigns() ? '' : 'disabled'}>Edit</button>
                        <button class="btn btn-sm btn-outline-warning" type="button" onclick="window.duplicateCampaign('${campaign.id}')" ${canManageCampaigns() ? '' : 'disabled'}>Duplicate</button>
                        <button class="btn btn-sm btn-outline-danger" type="button" onclick="window.deleteCampaign('${campaign.id}')" ${canManageCampaigns() ? '' : 'disabled'}>Delete</button>
                    </div>
                </td>
            </tr>
        `).join('');
    }

    function resetForm() {
        document.getElementById('campaignForm').reset();
        document.getElementById('campaignId').value = '';
        setEditorContent('');
        document.getElementById('campaignType').value = 'blog';
    }

    function populateForm(campaign) {
        document.getElementById('campaignId').value = campaign.id || '';
        document.getElementById('campaignTitle').value = campaign.title || '';
        document.getElementById('campaignSubject').value = campaign.subject || '';
        document.getElementById('campaignType').value = campaign.campaign_type || 'blog';
        setEditorContent(campaign.content || '');
        document.getElementById('campaignImage').value = campaign.featured_image || '';
        document.getElementById('campaignScheduledFor').value = campaign.scheduled_for ? new Date(campaign.scheduled_for).toISOString().slice(0, 16) : '';
    }

    async function createCampaign(status = 'draft') {
        const client = getSupabaseClient();
        if (!client) {
            showAlert('danger', 'Supabase client is unavailable.');
            return;
        }

        if (!canManageCampaigns()) {
            showAlert('danger', 'You do not have permission to manage campaigns.');
            return;
        }

        const payload = getCampaignPayload(status);
        const isValidType = VALID_CAMPAIGN_TYPES.includes(payload.campaign_type);
        const isValidStatus = VALID_STATUSES.includes(payload.status);

        if (!payload.title || !payload.subject) {
            showAlert('danger', 'Please add a title and a subject.');
            return;
        }

        if (!isValidType) {
            showAlert('danger', 'Please select a valid campaign type.');
            return;
        }

        if (!isValidStatus) {
            showAlert('danger', 'Please use a valid campaign status.');
            return;
        }

        try {
            const { data, error } = await client
                .from(TABLE_NAME)
                .insert(payload)
                .select()
                .single();

            if (error) {
                console.error('[newsletter-campaigns] create failed:', {
                    message: error.message,
                    details: error.details,
                    hint: error.hint,
                    code: error.code,
                    payload
                });
                throw error;
            }

            showAlert('success', 'Campaign created successfully.');
            resetForm();
            await loadCampaigns();
            await refreshAutomationStats();
            return data;
        } catch (error) {
            const message = error?.message || 'Unable to create campaign right now.';
            console.error('[newsletter-campaigns] create failed:', message);
            showAlert('danger', 'Unable to create campaign right now.');
        }
    }

    async function updateCampaign(id, status = 'draft') {
        const client = getSupabaseClient();
        if (!client) {
            showAlert('danger', 'Supabase client is unavailable.');
            return;
        }

        if (!canManageCampaigns()) {
            showAlert('danger', 'You do not have permission to edit campaigns.');
            return;
        }

        const payload = getCampaignPayload(status);
        const isValidType = VALID_CAMPAIGN_TYPES.includes(payload.campaign_type);
        const isValidStatus = VALID_STATUSES.includes(payload.status);

        if (!isValidType || !isValidStatus) {
            showAlert('danger', 'Campaign values are invalid. Please review the form.');
            return;
        }

        try {
            const { data, error } = await client
                .from(TABLE_NAME)
                .update(payload)
                .eq('id', id)
                .select()
                .single();

            if (error) {
                console.error('[newsletter-campaigns] update failed:', {
                    message: error.message,
                    details: error.details,
                    hint: error.hint,
                    code: error.code,
                    payload
                });
                throw error;
            }

            showAlert('success', status === 'scheduled' ? 'Campaign updated and scheduled.' : 'Campaign updated.');
            await loadCampaigns();
            await refreshAutomationStats();
            return data;
        } catch (error) {
            const message = error?.message || 'Unable to update campaign.';
            console.error('[newsletter-campaigns] update failed:', message);
            showAlert('danger', 'Unable to update campaign.');
        }
    }

    async function deleteCampaign(id) {
        if (!id || !window.confirm('Delete this campaign?')) return;
        const client = getSupabaseClient();
        if (!client) {
            showAlert('danger', 'Supabase client is unavailable.');
            return;
        }

        if (!canManageCampaigns()) {
            showAlert('danger', 'You do not have permission to delete campaigns.');
            return;
        }

        try {
            const { error } = await client.from(TABLE_NAME).delete().eq('id', id);
            if (error) throw error;
            showAlert('success', 'Campaign deleted successfully.');
            await loadCampaigns();
        } catch (error) {
            console.error('[newsletter-campaigns] delete failed:', error);
            showAlert('danger', 'Unable to delete campaign.');
        }
    }

    function previewCampaign() {
        const preview = document.getElementById('campaignPreview');
        if (!preview) return;
        const title = document.getElementById('campaignTitle').value.trim() || 'Untitled Campaign';
        const subject = document.getElementById('campaignSubject').value.trim() || 'Subject';
        const content = getEditorContent() || '<p>Your campaign content will appear here.</p>';
        preview.innerHTML = `
            <div class="newsletter-card p-3">
                <h4>${escapeHtml(title)}</h4>
                <p class="text-muted mb-2"><strong>Subject:</strong> ${escapeHtml(subject)}</p>
                <div>${content}</div>
            </div>
        `;
    }

    async function duplicateCampaign(id) {
        const client = getSupabaseClient();
        if (!client) {
            showAlert('danger', 'Supabase client is unavailable.');
            return;
        }

        if (!canManageCampaigns()) {
            showAlert('danger', 'You do not have permission to duplicate campaigns.');
            return;
        }

        try {
            const { data, error } = await client.from(TABLE_NAME).select('*').eq('id', id).single();
            if (error) throw error;
            const { error: insertError } = await client.from(TABLE_NAME).insert({
                ...data,
                id: undefined,
                title: `${data.title || 'Copy'} (Copy)`,
                status: 'draft',
                sent_at: null,
                scheduled_for: null,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            });
            if (insertError) throw insertError;
            showAlert('success', 'Campaign duplicated successfully.');
            await loadCampaigns();
        } catch (error) {
            console.error('[newsletter-campaigns] duplicate failed:', error);
            showAlert('danger', 'Unable to duplicate campaign.');
        }
    }

    async function refreshAutomationStats() {
        if (!window.newsletterAutomation?.getCampaignQueueStats) return;
        try {
            const stats = await window.newsletterAutomation.getCampaignQueueStats();
            document.getElementById('automationReadyCount').textContent = `Ready to Send: ${stats.ready || 0}`;
            document.getElementById('automationScheduledCount').textContent = `Scheduled: ${stats.scheduled || 0}`;
            document.getElementById('automationSentCount').textContent = `Sent: ${stats.sent || 0}`;
            document.getElementById('automationFailedCount').textContent = `Failed: ${stats.failed || 0}`;
            document.getElementById('automationSubscribersCount').textContent = `Total Subscribers: ${stats.totalSubscribers || 0}`;
        } catch (error) {
            console.error('[newsletter-campaigns] automation stats failed:', error);
        }
    }

    async function runAutomationWorkflow() {
        if (!window.newsletterAutomation?.watchPublishedBlogs || !window.newsletterAutomation?.watchUpcomingEvents) {
            showAlert('danger', 'Automation module is unavailable.');
            return;
        }

        try {
            showAlert('info', 'Generating campaign drafts from published blogs and upcoming events...');
            const [blogsCampaigns, eventsCampaigns] = await Promise.all([
                window.newsletterAutomation.watchPublishedBlogs(),
                window.newsletterAutomation.watchUpcomingEvents()
            ]);
            const generatedCount = (blogsCampaigns?.length || 0) + (eventsCampaigns?.length || 0);
            await loadCampaigns();
            await refreshAutomationStats();
            showAlert('success', generatedCount > 0 ? `Automation created ${generatedCount} campaign draft(s).` : 'Automation completed with no new campaigns.');
        } catch (error) {
            console.error('[newsletter-campaigns] automation workflow failed:', error);
            showAlert('danger', 'Unable to generate automation campaigns right now.');
        }
    }

    function bindEvents() {
        document.getElementById('saveDraftBtn')?.addEventListener('click', () => {
            const id = document.getElementById('campaignId').value;
            if (id) {
                updateCampaign(id, 'draft');
            } else {
                createCampaign('draft');
            }
        });

        document.getElementById('scheduleCampaignBtn')?.addEventListener('click', () => {
            const id = document.getElementById('campaignId').value;
            if (id) {
                updateCampaign(id, 'scheduled');
            } else {
                createCampaign('scheduled');
            }
        });

        document.getElementById('sendNowBtn')?.addEventListener('click', () => {
            const id = document.getElementById('campaignId').value;
            if (id) {
                updateCampaign(id, 'sent');
            } else {
                createCampaign('sent');
            }
            showAlert('info', 'Send Now is prepared for future email-service integration. No emails are sent yet.');
        });

        document.getElementById('sendTestEmailBtn')?.addEventListener('click', openTestEmailModal);
        document.getElementById('closeTestEmailModal')?.addEventListener('click', closeTestEmailModal);
        document.getElementById('cancelTestEmailBtn')?.addEventListener('click', closeTestEmailModal);
        document.getElementById('sendTestEmailConfirmBtn')?.addEventListener('click', sendTestEmail);

        document.getElementById('previewCampaignBtn')?.addEventListener('click', previewCampaign);
        document.getElementById('runAutomationBtn')?.addEventListener('click', runAutomationWorkflow);

        document.getElementById('campaignSearch')?.addEventListener('input', () => loadCampaigns());
        document.getElementById('campaignStatusFilter')?.addEventListener('change', () => loadCampaigns());
        document.getElementById('campaignTypeFilter')?.addEventListener('change', () => loadCampaigns());

        document.querySelectorAll('[data-editor-command]').forEach((button) => {
            button.addEventListener('click', () => {
                const command = button.getAttribute('data-editor-command');
                document.execCommand(command, false, null);
                document.getElementById('campaignEditor').focus();
            });
        });

        document.getElementById('campaignEditor')?.addEventListener('input', () => {
            getEditorContent();
        });
    }

    async function initialize() {
        bindEvents();
        await resolveCampaignPermissions();
        await loadCampaigns();
        await refreshAutomationStats();
    }

    window.loadCampaigns = loadCampaigns;
    window.createCampaign = createCampaign;
    window.updateCampaign = updateCampaign;
    window.deleteCampaign = deleteCampaign;
    window.previewCampaign = previewCampaign;
    window.duplicateCampaign = duplicateCampaign;
    window.editCampaign = function (id) {
        const client = getSupabaseClient();
        if (!client) return;
        client.from(TABLE_NAME).select('*').eq('id', id).single().then(({ data, error }) => {
            if (error) {
                showAlert('danger', 'Unable to load campaign for editing.');
                return;
            }
            populateForm(data);
            previewCampaign();
        });
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        initialize();
    }
})();
