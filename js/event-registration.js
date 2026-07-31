(function () {
    const VALID_SOURCES = new Set(['website', 'whatsapp', 'facebook', 'email', 'copied_link', 'other']);

    const loader = document.getElementById('registrationLoader');
    const content = document.getElementById('registrationContent');
    const notFound = document.getElementById('registrationNotFound');
    const closed = document.getElementById('registrationClosed');
    const success = document.getElementById('registrationSuccess');
    const shareSection = document.getElementById('shareSection');
    const alertBox = document.getElementById('registrationAlert');
    const form = document.getElementById('registrationForm');
    const registerButton = document.getElementById('registerButton');

    const eventPoster = document.getElementById('eventPoster');
    const eventTitle = document.getElementById('eventTitle');
    const eventShortDescription = document.getElementById('eventShortDescription');
    const eventDate = document.getElementById('eventDate');
    const eventTime = document.getElementById('eventTime');
    const eventLocation = document.getElementById('eventLocation');
    const eventDeadline = document.getElementById('eventDeadline');
    const eventCapacity = document.getElementById('eventCapacity');
    const eventFee = document.getElementById('eventFee');

    const fullNameInput = document.getElementById('fullName');
    const emailInput = document.getElementById('email');
    const phoneInput = document.getElementById('phone');
    const genderInput = document.getElementById('gender');
    const ageGroupInput = document.getElementById('ageGroup');
    const attendeeCountInput = document.getElementById('attendeeCount');
    const churchInput = document.getElementById('churchOrMinistry');
    const notesInput = document.getElementById('notes');

    const copyLinkBtn = document.getElementById('copyLinkBtn');
    const whatsappShareBtn = document.getElementById('whatsappShareBtn');
    const facebookShareBtn = document.getElementById('facebookShareBtn');
    const emailShareBtn = document.getElementById('emailShareBtn');
    const nativeShareBtn = document.getElementById('nativeShareBtn');

    const successName = document.getElementById('successName');
    const successEvent = document.getElementById('successEvent');
    const successDate = document.getElementById('successDate');
    const successAttendees = document.getElementById('successAttendees');

    let currentEvent = null;
    let remainingSpaces = null;
    let registrationEnabled = false;
    let registrationOpen = false;

    function getQueryParam(name) {
        const params = new URLSearchParams(window.location.search);
        return String(params.get(name) || '').trim();
    }

    function safeSetText(element, value) {
        if (!element) return;
        element.textContent = String(value ?? '');
    }

    function safeSetSrc(element, value) {
        if (!element) return;
        element.src = value;
    }

    function safeToggle(element, show) {
        if (!element) return;
        element.hidden = !show;
        element.classList.toggle('d-none', !show);
    }

    function safeListen(element, event, handler) {
        if (!element || typeof element.addEventListener !== 'function') return;
        element.addEventListener(event, handler);
    }

    function logStage(stage, payload) {
        console.log(`[event-register] ${stage}`, payload ?? '');
    }

    function showLoadingState() {
        if (loader) {
            loader.hidden = false;
            loader.classList.remove('d-none');
        }
        safeToggle(content, false);
        safeToggle(notFound, false);
        safeToggle(closed, false);
        safeToggle(success, false);
    }

    function hideLoadingState() {
        if (loader) {
            loader.hidden = true;
            loader.classList.add('d-none');
        }
    }

    function showAlert(message, type = 'warning') {
        if (!alertBox) return;
        alertBox.textContent = message;
        alertBox.className = `alert alert-${type} registration-alert`;
        alertBox.classList.remove('d-none');
        alertBox.hidden = false;
    }

    function hideAlert() {
        if (!alertBox) return;
        alertBox.classList.add('d-none');
        alertBox.hidden = true;
        alertBox.textContent = '';
    }

    function showNotFoundState(title, message) {
        hideLoadingState();
        if (notFound) {
            const heading = notFound.querySelector('h1');
            const paragraph = notFound.querySelector('p');
            safeSetText(heading, title);
            safeSetText(paragraph, message);
            safeToggle(notFound, true);
        }
        safeToggle(content, false);
        safeToggle(closed, false);
        safeToggle(success, false);
    }

    function showClosedState(message) {
        hideLoadingState();
        const alertElement = closed?.querySelector('.alert');
        safeSetText(alertElement, message);
        safeToggle(closed, true);
        safeToggle(content, false);
        safeToggle(notFound, false);
        safeToggle(success, false);
    }

    function showContentState() {
        hideLoadingState();
        safeToggle(content, true);
        safeToggle(notFound, false);
        safeToggle(closed, false);
        safeToggle(success, false);
    }

    function showFatalError(message) {
        console.error('[event-register] fatal error:', message);
        showClosedState(message);
    }

    function showAvailabilityWarning(message) {
        showAlert(message, 'warning');
    }

    function formatDate(value) {
        if (typeof window.kgcFormatEventDate === 'function') {
            return window.kgcFormatEventDate(value);
        }
        return String(value || 'TBA');
    }

    function formatTimeRange(startValue, endValue) {
        if (typeof window.kgcFormatEventTimeRange === 'function') {
            return window.kgcFormatEventTimeRange(startValue, endValue);
        }
        if (!startValue) {
            return 'TBA';
        }
        const startDate = new Date(startValue);
        if (Number.isNaN(startDate.getTime())) {
            return 'TBA';
        }
        const formatter = new Intl.DateTimeFormat('en-BW', { timeZone: 'Africa/Gaborone', hour: 'numeric', minute: '2-digit', hour12: true });
        const startTime = formatter.format(startDate);
        if (!endValue) {
            return startTime;
        }
        const endDate = new Date(endValue);
        if (Number.isNaN(endDate.getTime()) || startDate.getTime() === endDate.getTime()) {
            return startTime;
        }
        return `${startTime} – ${formatter.format(endDate)}`;
    }

    function getPosterUrl(path) {
        if (!path) {
            return '/images/people.jpg';
        }
        const trimmed = String(path).trim();
        return trimmed === '' ? '/images/people.jpg' : trimmed;
    }

    function buildRegistrationUrl(src) {
        if (!currentEvent) return window.location.origin + '/event-register.html';
        const params = new URLSearchParams({ event: currentEvent.id });
        if (src) params.set('source', src);
        return `${window.location.origin}/event-register.html?${params.toString()}`;
    }

    function setupShareButtons() {
        if (!shareSection || !currentEvent) return;
        safeToggle(shareSection, true);
        const plainTitle = currentEvent.title || 'Event registration';
        const plainDate = formatDate(currentEvent.start_at);
        const registrationUrl = buildRegistrationUrl('website');
        const message = `Register for ${plainTitle} at Kingdom Gathering Church.%0A${plainDate}%0A%0ARegister here:%0A${registrationUrl}`;

        safeListen(copyLinkBtn, 'click', async () => {
            try {
                await navigator.clipboard.writeText(registrationUrl);
                showAlert('Registration link copied to clipboard.', 'success');
            } catch (error) {
                console.error('[event-register] copy failed', error);
                showAlert('Unable to copy the link. Please copy it manually.', 'danger');
            }
        });

        safeListen(whatsappShareBtn, 'click', () => {
            window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
        });

        safeListen(facebookShareBtn, 'click', () => {
            const url = `${window.location.origin}/event-register.html?event=${currentEvent.id}&source=facebook`;
            window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank');
        });

        safeListen(emailShareBtn, 'click', () => {
            const url = `${window.location.origin}/event-register.html?event=${currentEvent.id}&source=email`;
            window.location.href = `mailto:?subject=${encodeURIComponent(`Register for ${plainTitle}`)}&body=${encodeURIComponent(`Register for ${plainTitle} at Kingdom Gathering Church.\n${plainDate}\n\nRegister here: ${url}`)}`;
        });

        if (navigator.share && nativeShareBtn) {
            safeToggle(nativeShareBtn, true);
            safeListen(nativeShareBtn, 'click', async () => {
                try {
                    await navigator.share({
                        title: `Register for ${plainTitle}`,
                        text: `Register for ${plainTitle} at Kingdom Gathering Church on ${plainDate}.`,
                        url: buildRegistrationUrl('website')
                    });
                } catch (error) {
                    console.error('[event-register] native share failed', error);
                }
            });
        }
    }

    function renderEvent(event) {
        logStage('3 rendering event');
        currentEvent = event;

        if (eventPoster) {
            eventPoster.onerror = () => {
                eventPoster.onerror = null;
                safeSetSrc(eventPoster, '/images/default-event.jpg');
            };
            safeSetSrc(eventPoster, getPosterUrl(event.poster_path));
            eventPoster.alt = event.title ? `${event.title} poster` : 'Event poster';
        }

        safeSetText(eventTitle, event.title || 'Event registration');
        safeSetText(eventShortDescription, event.short_description || event.description || 'Find registration details below.');
        safeSetText(eventDate, formatDate(event.start_at));
        safeSetText(eventTime, formatTimeRange(event.start_at, event.end_at));
        safeSetText(eventLocation, event.location || 'Location details will be shared soon.');
        safeSetText(eventDeadline, event.registration_deadline ? formatDate(event.registration_deadline) : 'No deadline set');
        safeSetText(eventCapacity, event.capacity != null ? `${event.capacity} total capacity` : 'Unlimited capacity');
        safeSetText(eventFee, event.registration_fee != null && event.registration_fee !== '' ? `BWP ${Number(event.registration_fee).toFixed(2)}` : 'Free');

        setupShareButtons();
        logStage('4 event rendered');
    }

    async function loadAvailability(event) {
        logStage('5 loading availability');
        const confirmedTotal = await getConfirmedAttendeeCount(event.id);
        logStage('6 availability loaded', { confirmedTotal });

        if (confirmedTotal == null) {
            return false;
        }

        if (event.capacity != null) {
            remainingSpaces = event.capacity - confirmedTotal;
            if (remainingSpaces <= 0) {
                showClosedState('Registration is full for this event.');
                return false;
            }
            safeSetText(eventCapacity, `${event.capacity} total capacity · ${remainingSpaces} spaces remaining`);
        }

        registrationEnabled = true;
        registrationOpen = true;
        return true;
    }

    async function getConfirmedAttendeeCount(eventId) {
        try {
            const { data, error } = await window.supabaseClient.rpc('event_confirmed_registration_counts', { event_uuid: eventId });
            if (error) {
                console.error('[event-register] confirmed count error', error);
                return null;
            }
            return data?.confirmed_attendee_count ?? 0;
        } catch (err) {
            console.error('[event-register] confirmed count lookup error', err);
            return null;
        }
    }

    async function loadEvent(eventId) {
        logStage('2 event loaded', { eventId });
        if (!window.supabaseClient) {
            throw new Error('Supabase client is unavailable.');
        }

        const { data, error } = await window.supabaseClient
            .from('events')
            .select('*')
            .eq('id', eventId)
            .maybeSingle();

        console.log('[event-register] event lookup:', { eventId, data, error });

        if (error) {
            throw error;
        }

        return data || null;
    }

    function wireForm() {
        if (!form) return;
        form.addEventListener('submit', submitRegistration);
    }

    async function initializePage() {
        logStage('1 init started');
        showLoadingState();

        try {
            const sourceParam = String(getQueryParam('source') || 'website').trim().toLowerCase();
            const eventId = getQueryParam('event');
            const registrationSource = VALID_SOURCES.has(sourceParam) ? sourceParam : 'website';

            if (!eventId) {
                showNotFoundState('No event selected.', 'Please open this page using a valid registration link.');
                return;
            }

            if (!window.supabaseClient) {
                throw new Error('Supabase client is unavailable.');
            }

            wireForm();
            const event = await loadEvent(eventId);
            if (!event) {
                showNotFoundState('Event not found.', 'Please check your registration link and try again.');
                return;
            }

            renderEvent(event);

            try {
                const availabilityOk = await loadAvailability(event);
                if (!availabilityOk) {
                    showAvailabilityWarning('Availability could not be confirmed. Please try again.');
                }
            } catch (availabilityError) {
                console.error('[event-register] availability failed:', availabilityError);
                showAvailabilityWarning('Availability could not be confirmed. Please try again.');
            }

            showContentState();
            logStage('7 showing content');
        } catch (error) {
            console.error('[event-register] initialization failed:', error);
            showFatalError('We couldn\'t load this event. Please refresh and try again.');
        } finally {
            hideLoadingState();
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializePage, { once: true });
    } else {
        initializePage();
    }
})();              