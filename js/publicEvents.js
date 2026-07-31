// Dynamic Events System for Kingdom Gathering
// Fetches events from Supabase and dynamically populates UI

(function() {
    const eventsContainer = document.getElementById("eventsContainer");
    const featuredEventContainer = document.getElementById("featuredEventContainer");
    const timelineContainer = document.getElementById("timelineContainer");

    // Utility: Format date ranges
    function formatDateRange(startAt, endAt) {
        if (!startAt) return "Date TBC";
        return window.kgcFormatEventTimeRange(startAt, endAt);
    }

    function formatDateForTimeline(dateString) {
        const formatted = window.kgcFormatEventDateShort(dateString);
        return formatted === 'TBA' ? 'TBC' : formatted;
    }

    function getMonthYear(dateString) {
        const monthYear = window.kgcFormatEventMonthYear(dateString);
        if (monthYear === 'TBA') {
            return { month: 0, year: 0, monthName: 'Unknown' };
        }
        const [monthName, yearString] = monthYear.split(' ');
        const year = Number(yearString) || 0;
        const month = new Date(window.kgcLocalDateTimeToISO(`${yearString}-01-01T00:00`)).getMonth();
        return { month, year, monthName };
    }

    function eventRequiresRegistration(event) {
        return event.registration_required === true || String(event.registration_required).toLowerCase() === 'true';
    }

    function getEventCTALabel(event) {
        return eventRequiresRegistration(event) ? "Reserve" : "Learn More";
    }

    function getEventCTAUrl(event, source = 'website') {
        if (!eventRequiresRegistration(event)) return null;
        return `${window.location.origin}/event-register.html?event=${encodeURIComponent(event.id)}&source=${encodeURIComponent(source)}`;
    }

    function showEventDetailsModal(event, branchName) {
        const dateRange = formatDateRange(event.start_at, event.end_at);
        const eventDateEl = document.getElementById("eventDetailModalDate");
        const branchEl = document.getElementById("eventDetailModalBranch");
        const locationEl = document.getElementById("eventDetailModalLocation");
        const descriptionEl = document.getElementById("eventDetailModalDescription");
        const registrationEl = document.getElementById("eventDetailModalRegistration");

        if (eventDateEl) eventDateEl.textContent = dateRange;
        if (branchEl) branchEl.textContent = branchName ? `Branch: ${branchName}` : "Kingdom Gathering";
        if (locationEl) locationEl.textContent = event.location ? `Location: ${event.location}` : "Location information will be shared soon.";
        if (descriptionEl) descriptionEl.textContent = event.description || event.short_description || "Join us for this special gathering.";
        if (registrationEl) {
            registrationEl.textContent = eventRequiresRegistration(event)
                ? "Registration is required for this event. Click below to secure your place."
                : "No registration is required. Visit our contact page if you have any questions.";
        }

        const modalEl = document.getElementById("eventDetailModal");
        if (modalEl) {
            const modalFooter = modalEl.querySelector('.modal-footer');
            if (modalFooter) {
                const registrationUrl = getEventCTAUrl(event);
                modalFooter.innerHTML = `
                    <button type="button" class="btn btn-outline-gold" data-bs-dismiss="modal">Close</button>
                    ${registrationUrl ? `<button type="button" class="btn btn-gold ms-2 event-modal-action">Register Now</button>` : ''}
                `;
                if (registrationUrl) {
                    const actionButton = modalFooter.querySelector('.event-modal-action');
                    if (actionButton) {
                        actionButton.addEventListener('click', () => {
                            window.location.href = registrationUrl;
                        });
                    }
                }
            }

            const modal = new bootstrap.Modal(modalEl, { keyboard: true });
            modal.show();
        }
    }

    // Fetch branch name by ID
    async function getBranchName(branchId) {
        if (!branchId) return "Kingdom Gathering";
        
        const { data, error } = await supabaseClient
            .from("branches")
            .select("name")
            .eq("id", branchId)
            .single();
        
        return data?.name || "Kingdom Gathering";
    }

    async function fetchUpcomingEvents() {
        const { data, error } = await supabaseClient
            .from("events")
            .select("*")
            .order("start_at", { ascending: true });

        console.log("[publicEvents] all events raw:", data);
        console.log("[publicEvents] fetch error:", error);

        if (error) {
            return [];
        }

        const events = (data || []).map(event => {
            const status = String(event.status || "").toLowerCase().trim();
            const startDate = event.start_at ? new Date(event.start_at) : null;
            return {
                ...event,
                _status: status,
                _startDate: startDate,
            };
        });

        const statusCounts = events.reduce((counts, event) => {
            counts[event._status] = (counts[event._status] || 0) + 1;
            return counts;
        }, {});
        console.log("[publicEvents] status counts:", statusCounts);

        const acceptedStatuses = new Set(["published", "active", "upcoming"]);
        const validEvents = events.filter(event => {
            const include = event._status === "" || acceptedStatuses.has(event._status);
            if (!include) {
                console.debug("[publicEvents] excluding by status:", event.title, event._status);
            }
            return include;
        });

        if (validEvents.length === 0) {
            console.warn("[publicEvents] No events matched accepted status values; returning all raw events.");
            return events;
        }

        const now = new Date();
        const upcomingEvents = validEvents.filter(event => event._startDate && event._startDate >= now);
        const pastEvents = validEvents.filter(event => event._startDate && event._startDate < now);

        console.log("[publicEvents] upcoming events:", upcomingEvents);
        console.log("[publicEvents] past events:", pastEvents);

        return [...upcomingEvents, ...pastEvents];
    }

    // Fetch featured event (nearest upcoming)
    async function loadFeaturedEvent() {
        if (!featuredEventContainer) return;

        try {
            const events = await fetchUpcomingEvents();
            if (events.length === 0) {
                featuredEventContainer.innerHTML = `
                    <span class="badge-date">Upcoming</span>
                    <h2>Upcoming Gatherings</h2>
                    <p>Upcoming gatherings will be announced soon. Check back regularly or contact us to stay updated on what God is doing at Kingdom Gathering.</p>
                    <a href="../contact/" class="btn btn-gold btn-lg">Get Notified</a>
                `;
                return;
            }

            const event = events[0];
            const branchName = await getBranchName(event.branch_id);
            const dateRange = formatDateRange(event.start_at, event.end_at);
            const startMonth = window.kgcFormatEventMonthYear(event.start_at);

            featuredEventContainer.innerHTML = `
                <span class="badge-date">${startMonth}</span>
                <h2>${event.title}</h2>
                <p>${event.description || event.short_description || "Experience this gathering with us."}</p>
                <div class="mb-3 text-muted" style="font-size: 0.95rem;">
                    <i class="fas fa-calendar-alt me-2"></i>${dateRange} • 
                    <i class="fas fa-map-marker-alt me-2"></i>${branchName}
                </div>
                <button type="button" class="btn btn-gold btn-lg event-detail-trigger">
                    <i class="fas fa-${event.registration_required ? "clipboard-check" : "arrow-right"} me-2"></i>
                    ${event.registration_required ? "Reserve Your Seat" : "Learn More"}
                </button>
            `;

            const featuredButton = featuredEventContainer.querySelector('.event-detail-trigger');
            if (featuredButton) {
                const registrationUrl = getEventCTAUrl(event);
                featuredButton.addEventListener('click', () => {
                    if (registrationUrl) {
                        window.location.href = registrationUrl;
                    } else {
                        showEventDetailsModal(event, branchName);
                    }
                });
            }
        } catch (err) {
            console.error("[publicEvents] Featured event error:", err);
            featuredEventContainer.innerHTML = `
                <p class="text-danger">Unable to load featured event.</p>
            `;
        }
    }

    // Load upcoming events list
    async function loadUpcomingEventsList() {
        if (!eventsContainer) return;

        try {
            const events = await fetchUpcomingEvents();

            if (!events || events.length === 0) {
                eventsContainer.innerHTML = `
                    <div class="col-12 py-5 text-center">
                        <p class="text-muted fs-5">No upcoming events have been published yet. Please check back soon.</p>
                    </div>
                `;
                return;
            }

            eventsContainer.innerHTML = "";

            for (const event of events) {
                const branchName = await getBranchName(event.branch_id);
                const dateRange = formatDateRange(event.start_at, event.end_at);

                const eventRow = document.createElement("div");
                eventRow.className = "upcoming-row";
                eventRow.innerHTML = `
                    <div class="upcoming-date">${dateRange}</div>
                    <div class="upcoming-details">
                        <h3>${event.title}</h3>
                        <p>${event.short_description || "Gather with us for this special event."}</p>
                        <small class="text-muted"><i class="fas fa-map-marker-alt me-1"></i>${branchName}</small>
                    </div>
                    <div class="upcoming-action">
                        <button type="button" class="btn btn-gold btn-sm event-detail-trigger">
                            ${getEventCTALabel(event)}
                        </button>
                    </div>
                `;
                eventsContainer.appendChild(eventRow);

                const triggerButton = eventRow.querySelector('.event-detail-trigger');
                if (triggerButton) {
                    const registrationUrl = getEventCTAUrl(event);
                    triggerButton.addEventListener('click', () => {
                        if (registrationUrl) {
                            window.location.href = registrationUrl;
                        } else {
                            showEventDetailsModal(event, branchName);
                        }
                    });
                }
            }
        } catch (err) {
            console.error("[publicEvents] Upcoming list error:", err);
            eventsContainer.innerHTML = `
                <div class="col-12 py-5 text-center">
                    <p class="text-danger">Unable to load events. Please refresh the page.</p>
                </div>
            `;
        }
    }

    // Load timeline (grouped by month/year)
    async function loadTimeline() {
        if (!timelineContainer) return;

        try {
            const events = await fetchUpcomingEvents();

            if (events.length === 0) {
                timelineContainer.innerHTML = `
                    <div class="col-12 py-5 text-center">
                        <p class="text-muted">No upcoming events have been published yet.</p>
                    </div>
                `;
                return;
            }

            events.sort((a, b) => new Date(a.start_at) - new Date(b.start_at));

            // Group events by month and year
            const groupedEvents = {};
            for (const event of events) {
                const { month, year, monthName } = getMonthYear(event.start_at);
                const paddedMonth = String(month + 1).padStart(2, '0');
                const key = `${year}-${paddedMonth}`;
                
                if (!groupedEvents[key]) {
                    groupedEvents[key] = {
                        month,
                        year,
                        monthName,
                        events: []
                    };
                }
                groupedEvents[key].events.push(event);
            }

            // Sort by year and month
            const sortedKeys = Object.keys(groupedEvents).sort();
            timelineContainer.innerHTML = "";

            for (const key of sortedKeys) {
                const group = groupedEvents[key];
                let monthLabelShown = false;

                for (const event of group.events) {
                    const branchName = await getBranchName(event.branch_id);
                    const eventDate = formatDateForTimeline(event.start_at);

                    if (!monthLabelShown) {
                        const groupHeader = document.createElement('div');
                        groupHeader.className = 'timeline-month-header';
                        groupHeader.innerHTML = `<span class="timeline-month-label">${group.monthName} ${group.year}</span>`;
                        timelineContainer.appendChild(groupHeader);
                        monthLabelShown = true;
                    }

                    const timelineItem = document.createElement("div");
                    timelineItem.className = "timeline-item";
                    timelineItem.innerHTML = `
                        <div class="timeline-item-date">${eventDate}</div>
                        <div class="timeline-item-card">
                            <h5>${event.title}</h5>
                            <p>${event.short_description || "A gathering at Kingdom Gathering"}</p>
                            <div class="timeline-item-meta"><i class="fas fa-map-marker-alt me-1"></i>${branchName}</div>
                            <button type="button" class="btn btn-outline-gold btn-sm event-detail-trigger mt-3">${getEventCTALabel(event)}</button>
                        </div>
                    `;
                    timelineContainer.appendChild(timelineItem);
                    const detailButton = timelineItem.querySelector('.event-detail-trigger');
                    if (detailButton) {
                        const registrationUrl = getEventCTAUrl(event);
                        detailButton.addEventListener('click', () => {
                            if (registrationUrl) {
                                window.location.href = registrationUrl;
                            } else {
                                showEventDetailsModal(event, branchName);
                            }
                        });
                    }
                }
            }
        } catch (err) {
            console.error("[publicEvents] Timeline error:", err);
            timelineContainer.innerHTML = `
                <div class="col-12 py-5 text-center">
                    <p class="text-danger">Unable to load timeline. Please refresh the page.</p>
                </div>
            `;
        }
    }

    // Initialize all sections
    async function initializeEvents() {
        console.log("[publicEvents] Initializing...");
        await Promise.all([
            loadFeaturedEvent(),
            loadUpcomingEventsList(),
            loadTimeline()
        ]);
        console.log("[publicEvents] Initialization complete");
    }

    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeEvents);
    } else {
        initializeEvents();
    }
})();