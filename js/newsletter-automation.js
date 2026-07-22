(function () {
    const CAMPAIGN_TABLE = 'newsletter_campaigns';
    const SUBSCRIBERS_TABLE = 'newsletter_subscribers';
    const BLOGS_TABLE = 'blogs';
    const EVENTS_TABLE = 'events';
    const REMINDER_WINDOWS = [
        { key: '7_days_before', label: '7 Days Before', offsetDays: 7 },
        { key: '3_days_before', label: '3 Days Before', offsetDays: 3 },
        { key: '1_day_before', label: '1 Day Before', offsetDays: 1 },
        { key: 'morning_of', label: 'Morning Of', offsetDays: 0 }
    ];

    function getSupabaseClient() {
        return window.supabaseClient || null;
    }

    function normalizeStatus(status) {
        return String(status || '').trim().toLowerCase();
    }

    function safeText(value) {
        return String(value || '').trim();
    }

    function buildCampaignContent(body) {
        return `<div>${body || '<p>Content coming soon.</p>'}</div>`;
    }

    async function getCampaignByKey(client, campaignKey) {
        if (!campaignKey) return null;
        const { data, error } = await client
            .from(CAMPAIGN_TABLE)
            .select('id, status, campaign_key')
            .eq('campaign_key', campaignKey)
            .maybeSingle();

        if (error) {
            throw error;
        }
        return data;
    }

    async function queueCampaign(campaignPayload, nextStatus = 'ready') {
        const client = getSupabaseClient();
        if (!client) return null;

        const payload = {
            title: safeText(campaignPayload.title),
            subject: safeText(campaignPayload.subject),
            campaign_type: safeText(campaignPayload.campaign_type || 'Announcement'),
            content: campaignPayload.content || '',
            featured_image: safeText(campaignPayload.featured_image || ''),
            status: nextStatus,
            scheduled_for: campaignPayload.scheduled_for || null,
            created_by: campaignPayload.created_by || null,
            campaign_key: campaignPayload.campaign_key || null,
            source_type: campaignPayload.source_type || null,
            source_id: campaignPayload.source_id || null,
            sent_at: nextStatus === 'sent' ? new Date().toISOString() : null,
            created_at: campaignPayload.created_at || new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        if (!payload.title || !payload.subject) {
            return null;
        }

        const existing = payload.campaign_key ? await getCampaignByKey(client, payload.campaign_key) : null;
        if (existing) {
            return existing;
        }

        const { data, error } = await client.from(CAMPAIGN_TABLE).insert(payload).select().single();
        if (error) {
            throw error;
        }
        return data;
    }

    async function createBlogCampaign(blog) {
        if (!blog) return null;
        const title = safeText(blog.title);
        const excerpt = safeText(blog.excerpt || blog.summary || blog.content || '');
        const featuredImage = safeText(blog.featured_image_path || blog.featured_image || '');
        const blogUrl = safeText(blog.slug ? `/blog/post.html?slug=${blog.slug}` : '');

        const content = buildCampaignContent(`
            <p>${excerpt || 'A new church blog has just been published.'}</p>
            <p><a href="${blogUrl || '/blog/'}" target="_blank" rel="noopener noreferrer">Read the full blog post</a></p>
        `);

        return queueCampaign({
            title,
            subject: `New Blog: ${title}`,
            campaign_type: 'Blog',
            content,
            featured_image: featuredImage,
            source_type: 'blog',
            source_id: blog.id,
            campaign_key: `blog:${blog.id}`,
            created_by: blog.created_by || null
        }, 'ready');
    }

    async function createEventCampaign(event, reminderKey, reminderDate) {
        if (!event) return null;
        const eventTitle = safeText(event.title || event.name || 'Upcoming Event');
        const eventDate = safeText(event.event_date || event.start_date || event.date || '');
        const eventTime = safeText(event.start_time || event.time || event.event_time || '');
        const eventVenue = safeText(event.venue || event.location || event.place || '');
        const eventDescription = safeText(event.description || event.summary || '');
        const eventLink = safeText(event.registration_link || event.link || event.url || '');
        const eventDateLabel = eventDate ? `${eventDate}${eventTime ? ` at ${eventTime}` : ''}` : 'TBA';
        const reminderLabel = reminderKey.replace(/_/g, ' ');

        const content = buildCampaignContent(`
            <p><strong>${eventTitle}</strong></p>
            <p><strong>Date:</strong> ${eventDateLabel}</p>
            <p><strong>Venue:</strong> ${eventVenue || 'To be confirmed'}</p>
            <p><strong>Reminder:</strong> ${reminderLabel}</p>
            <p>${eventDescription || 'Please join us for this upcoming church gathering.'}</p>
            ${eventLink ? `<p><a href="${eventLink}" target="_blank" rel="noopener noreferrer">Register or learn more</a></p>` : ''}
        `);

        return queueCampaign({
            title: `${eventTitle} — ${reminderLabel}`,
            subject: `Reminder: ${eventTitle}`,
            campaign_type: 'Event',
            content,
            featured_image: safeText(event.featured_image || event.featured_image_path || ''),
            source_type: 'event',
            source_id: event.id,
            campaign_key: `event:${event.id}:${reminderKey}`,
            scheduled_for: reminderDate ? new Date(reminderDate).toISOString() : null,
            created_by: event.created_by || null
        }, 'ready');
    }

    async function watchPublishedBlogs() {
        const client = getSupabaseClient();
        if (!client) return [];

        const { data, error } = await client
            .from(BLOGS_TABLE)
            .select('id,title,excerpt,content,featured_image_path,slug,status,created_by,published_at')
            .eq('status', 'published')
            .order('published_at', { ascending: false });

        if (error) {
            throw error;
        }

        const campaigns = [];
        for (const blog of data || []) {
            const created = await createBlogCampaign(blog);
            if (created) campaigns.push(created);
        }
        return campaigns;
    }

    async function watchUpcomingEvents() {
        const client = getSupabaseClient();
        if (!client) return [];

        const { data, error } = await client
            .from(EVENTS_TABLE)
            .select('id,title,name,event_date,start_date,date,start_time,time,event_time,venue,location,place,description,summary,registration_link,link,url,featured_image,featured_image_path,status,created_by')
            .order('start_date', { ascending: true });

        if (error) {
            throw error;
        }

        const campaigns = [];
        const now = new Date();

        for (const event of data || []) {
            const status = normalizeStatus(event.status);
            if (!['published', 'active', 'upcoming'].includes(status)) {
                continue;
            }

            const eventDateValue = event.event_date || event.start_date || event.date || '';
            const eventTimeValue = event.start_time || event.time || event.event_time || '09:00';
            const eventDateTime = new Date(`${eventDateValue}T${eventTimeValue}`);
            if (Number.isNaN(eventDateTime.getTime()) || eventDateTime < now) {
                continue;
            }

            for (const reminder of REMINDER_WINDOWS) {
                const reminderDate = new Date(eventDateTime);
                if (reminder.offsetDays > 0) {
                    reminderDate.setDate(reminderDate.getDate() - reminder.offsetDays);
                }
                if (reminder.key === 'morning_of') {
                    reminderDate.setHours(8, 0, 0, 0);
                }

                if (reminderDate >= now) {
                    const created = await createEventCampaign(event, reminder.key, reminderDate);
                    if (created) campaigns.push(created);
                }
            }
        }
        return campaigns;
    }

    async function markCampaignSent(campaignId) {
        const client = getSupabaseClient();
        if (!client) return null;

        const { data, error } = await client
            .from(CAMPAIGN_TABLE)
            .update({ status: 'sent', sent_at: new Date().toISOString(), updated_at: new Date().toISOString() })
            .eq('id', campaignId)
            .select()
            .single();

        if (error) {
            throw error;
        }
        return data;
    }

    async function getCampaignQueueStats() {
        const client = getSupabaseClient();
        if (!client) return { ready: 0, scheduled: 0, sent: 0, failed: 0, totalSubscribers: 0 };

        const [{ data: campaigns, error: campaignsError }, { data: subscribers, error: subscribersError }] = await Promise.all([
            client.from(CAMPAIGN_TABLE).select('status'),
            client.from(SUBSCRIBERS_TABLE).select('id', { count: 'exact', head: true })
        ]);

        if (campaignsError || subscribersError) {
            throw campaignsError || subscribersError;
        }

        const normalized = (campaigns || []).map((campaign) => normalizeStatus(campaign.status));
        return {
            ready: normalized.filter((status) => status === 'ready').length,
            scheduled: normalized.filter((status) => status === 'scheduled').length,
            sent: normalized.filter((status) => status === 'sent').length,
            failed: normalized.filter((status) => status === 'failed').length,
            totalSubscribers: subscribers?.length || 0
        };
    }

    window.newsletterAutomation = {
        queueCampaign,
        createBlogCampaign,
        createEventCampaign,
        watchPublishedBlogs,
        watchUpcomingEvents,
        markCampaignSent,
        getCampaignQueueStats
    };
})();
