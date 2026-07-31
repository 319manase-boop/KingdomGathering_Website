(function () {
    const VALID_SOURCES = new Set(['website', 'whatsapp', 'facebook', 'email', 'copied_link', 'other']);
    const queryParams = new URLSearchParams(window.location.search);
    const eventId = String(queryParams.get('event') || '').trim();
    const sourceParam = String(queryParams.get('source') || 'website').trim().toLowerCase();
    const registrationSource = VALID_SOURCES.has(sourceParam) ? sourceParam : 'website';

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

    function formatDate(value) {
        return window.kgcFormatEventDate(value);
    }

    function formatTimeRange(startValue, endValue) {
        return window.kgcFormatEventTimeRange(startValue, endValue);
    }

    function getPosterUrl(path) {
        if (!path) {
            return '/images/people.jpg';
        }
        const trimmed = String(path).trim();
        if (trimmed === '') {
            return '/images/people.jpg';
        }
        return trimmed;
    }

    function setLoading(loading) {
        if (loading) {
            loader.classList.remove('d-none');
            content.classList.add('d-none');
            notFound.classList.add('d-none');
            closed.classList.add('d-none');
            success.classList.add('d-none');
        } else {
            loader.classList.add('d-none');
        }
    }

    function showAlert(message, type = 'warning') {
        if (!alertBox) return;
        alertBox.textContent = message;
        alertBox.className = `alert alert-${type} registration-alert`;
        alertBox.classList.remove('d-none');
    }

    function hideAlert() {
        if (!alertBox) return;
        alertBox.classList.add('d-none');
        alertBox.textContent = '';
    }

    function showNotFound() {
        setLoading(false);
        notFound.classList.remove('d-none');
        content.classList.add('d-none');
        closed.classList.add('d-none');
        success.classList.add('d-none');
    }

    function showClosed(message) {
        setLoading(false);
        closed.querySelector('.alert').textContent = message;
        closed.classList.remove('d-none');
        content.classList.add('d-none');
        notFound.classList.add('d-none');
        success.classList.add('d-none');
    }

    function showContent() {
        setLoading(false);
        content.classList.remove('d-none');
        notFound.classList.add('d-none');
        closed.classList.add('d-none');
        success.classList.add('d-none');
    }

    function showSuccess(registration) {
        setLoading(false);
        success.classList.remove('d-none');
        content.classList.add('d-none');
        notFound.classList.add('d-none');
        closed.classList.add('d-none');
        successName.textContent = registration.full_name;
        successEvent.textContent = currentEvent.title || 'Event';
        successDate.textContent = formatDate(currentEvent.start_at);
        successAttendees.textContent = registration.attendee_count;
    }

    function buildRegistrationUrl(src) {
        const params = new URLSearchParams({ event: currentEvent.id });
        if (src) params.set('source', src);
        return `${window.location.origin}/event-register.html?${params.toString()}`;
    }

    function setupShareButtons() {
        if (!shareSection || !currentEvent) return;
        shareSection.classList.remove('d-none');
        const plainTitle = currentEvent.title || 'Event registration';
        const plainDate = formatDate(currentEvent.start_at);
        const registrationUrl = buildRegistrationUrl('website');
        const message = `Register for ${plainTitle} at Kingdom Gathering Church.%0A${plainDate}%0A%0ARegister here:%0A${registrationUrl}`;

        copyLinkBtn.addEventListener('click', async () => {
            try {
                await navigator.clipboard.writeText(registrationUrl);
                showAlert('Registration link copied to clipboard.', 'success');
            } catch (error) {
                console.error('Copy failed', error);
                showAlert('Unable to copy the link. Please copy it manually.', 'danger');
            }
        });

        whatsappShareBtn.addEventListener('click', () => {
            window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
        });

        facebookShareBtn.addEventListener('click', () => {
            const url = `${window.location.origin}/event-register.html?event=${currentEvent.id}&source=facebook`;
            const fbUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
            window.open(fbUrl, '_blank');
        });

        emailShareBtn.addEventListener('click', () => {
            const url = `${window.location.origin}/event-register.html?event=${currentEvent.id}&source=email`;
            window.location.href = `mailto:?subject=${encodeURIComponent(`Register for ${plainTitle}`)}&body=${encodeURIComponent(`Register for ${plainTitle} at Kingdom Gathering Church.\n${plainDate}\n\nRegister here: ${url}`)}`;
        });

        if (navigator.share) {
            nativeShareBtn.classList.remove('d-none');
            nativeShareBtn.addEventListener('click', async () => {
                try {
                    await navigator.share({
                        title: `Register for ${plainTitle}`,
                        text: `Register for ${plainTitle} at Kingdom Gathering Church on ${plainDate}.`,
                        url: buildRegistrationUrl('website')
                    });
                } catch (error) {
                    console.error('Native share failed', error);
                }
            });
        }
    }

    function displayEventDetails(event) {
        currentEvent = event;
        eventPoster.onerror = () => {
            eventPoster.onerror = null;
            eventPoster.src = '/images/default-event.jpg';
        };
        eventPoster.src = getPosterUrl(event.poster_path);
        eventPoster.alt = event.title ? `${event.title} poster` : 'Event poster';
        eventTitle.textContent = event.title || 'Event registration';
        eventShortDescription.textContent = event.short_description || event.description || 'Find registration details below.';
        eventDate.textContent = formatDate(event.start_at);
        eventTime.textContent = formatTimeRange(event.start_at, event.end_at);
        eventLocation.textContent = event.location || 'Location details will be shared soon.';
        eventDeadline.textContent = event.registration_deadline ? formatDate(event.registration_deadline) : 'No deadline set';
        eventCapacity.textContent = event.capacity != null ? `${event.capacity} total capacity` : 'Unlimited capacity';
        eventFee.textContent = event.registration_fee != null && event.registration_fee !== '' ? `BWP ${Number(event.registration_fee).toFixed(2)}` : 'Free';
        setupShareButtons();
    }

    async function getConfirmedAttendeeCount(eventId) {
        try {
            const { data, error } = await window.supabaseClient
                .rpc('event_confirmed_registration_counts', { event_uuid: eventId });

            if (error) {
                console.error('Failed to fetch confirmed registration counts', error);
                return null;
            }

            return data?.confirmed_attendee_count ?? 0;
        } catch (err) {
            console.error('Confirmed count lookup error', err);
            return null;
        }
    }

    function evaluateAvailability(event, confirmedTotal) {
        const requiresRegistration = event.registration_required === true || String(event.registration_required).toLowerCase() === 'true';
        if (!requiresRegistration) {
            showClosed('This event does not accept public registrations.');
            return false;
        }

        if (event.registration_status != null && String(event.registration_status).toLowerCase() !== 'open') {
            showClosed('Registration for this event is closed.');
            return false;
        }

        const now = new Date();
        if (event.registration_deadline && new Date(event.registration_deadline) < now) {
            showClosed('The registration deadline has passed.');
            return false;
        }

        if (event.end_at && new Date(event.end_at) < now) {
            showClosed('Registration for this event is closed.');
            return false;
        }

        if (event.capacity != null && confirmedTotal != null) {
            remainingSpaces = event.capacity - confirmedTotal;
            if (remainingSpaces <= 0) {
                showClosed('Registration is full for this event.');
                return false;
            }
            eventCapacity.textContent = `${event.capacity} total capacity · ${remainingSpaces} spaces remaining`;
        }

        registrationEnabled = true;
        registrationOpen = true;
        return true;
    }

    function trimValue(value) {
        return String(value || '').trim();
    }

    function parseOptional(value) {
        const trimmed = trimValue(value);
        return trimmed === '' ? null : trimmed;
    }

    function buildRegistrationPayload() {
        const fullName = trimValue(fullNameInput.value);
        const email = trimValue(emailInput.value).toLowerCase();
        const phone = trimValue(phoneInput.value);
        const gender = parseOptional(genderInput.value);
        const ageGroup = parseOptional(ageGroupInput.value);
        const churchOrMinistry = parseOptional(churchInput.value);
        const notes = parseOptional(notesInput.value);
        const attendeeCount = Number(attendeeCountInput.value || 1);

        if (!fullName || !email || !phone || attendeeCount < 1) {
            showAlert('Please fill in all required fields and ensure attendee count is at least 1.', 'danger');
            return null;
        }

        if (currentEvent.capacity != null && remainingSpaces != null && attendeeCount > remainingSpaces) {
            showAlert(`Only ${remainingSpaces} spaces are still available.`, 'danger');
            return null;
        }

        return {
            event_id: currentEvent.id,
            full_name: fullName,
            email,
            phone,
            gender,
            age_group: ageGroup,
            attendee_count: attendeeCount,
            church_or_ministry: churchOrMinistry,
            notes,
            source: registrationSource,
            status: 'confirmed'
        };
    }

    async function validateCapacityBeforeSubmit() {
        if (!currentEvent || currentEvent.capacity == null) {
            return true;
        }
        const confirmedTotal = await getConfirmedAttendeeCount(currentEvent.id);
        if (confirmedTotal == null) {
            return false;
        }
        remainingSpaces = currentEvent.capacity - confirmedTotal;
        if (remainingSpaces <= 0) {
            showAlert('Registration is full for this event.', 'danger');
            return false;
        }
        if (Number(attendeeCountInput.value || 1) > remainingSpaces) {
            showAlert(`Only ${remainingSpaces} spaces are still available.`, 'danger');
            return false;
        }
        return true;
    }

    async function submitRegistration(event) {
        event.preventDefault();
        hideAlert();
        registerButton.disabled = true;
        registerButton.textContent = 'Submitting…';

        if (!registrationEnabled || !registrationOpen) {
            showAlert('Registration is currently unavailable.', 'danger');
            registerButton.disabled = false;
            registerButton.textContent = 'Submit registration';
            return;
        }

        if (!(await validateCapacityBeforeSubmit())) {
            registerButton.disabled = false;
            registerButton.textContent = 'Submit registration';
            return;
        }

        const payload = buildRegistrationPayload();
        if (!payload) {
            registerButton.disabled = false;
            registerButton.textContent = 'Submit registration';
            return;
        }

        try {
            const { data, error } = await window.supabaseClient
                .from('event_registrations')
                .insert([payload])
                .select()
                .single();

            if (error) {
                if (error?.details?.includes('event_registrations_event_id_email_key') || error?.code === '23505') {
                    showAlert('This email is already registered for this event.', 'danger');
                } else {
                    console.error('Registration insert failed', error);
                    showAlert('Unable to complete registration. Please try again later.', 'danger');
                }
                return;
            }

            showSuccess(data);
        } catch (err) {
            console.error('Registration submission error', err);
            showAlert('Unable to complete registration. Please try again later.', 'danger');
        } finally {
            registerButton.disabled = false;
            registerButton.textContent = 'Submit registration';
        }
    }

    async function loadEvent() {
        if (!eventId) {
            showNotFound();
            return;
        }

        try {
            const { data, error } = await window.supabaseClient
                .from('events')
                .select('*')
                .eq('id', eventId)
                .maybeSingle();

            if (error || !data) {
                if (error) console.error('Failed to load event', error);
                showNotFound();
                return;
            }

            displayEventDetails(data);
            console.log({
                storedStart: data.start_at,
                storedEnd: data.end_at,
                parsedStart: new Date(data.start_at),
                parsedEnd: data.end_at ? new Date(data.end_at) : null,
                displayedStart: window.kgcFormatEventTime(data.start_at),
                displayedEnd: data.end_at ? window.kgcFormatEventTime(data.end_at) : null
            });
            const confirmedTotal = await getConfirmedAttendeeCount(data.id);
            if (confirmedTotal == null) {
                showAlert('Unable to load availability. Please refresh the page.', 'warning');
            }
            if (evaluateAvailability(data, confirmedTotal)) {
                showContent();
            }
        } catch (err) {
            console.error('Event load error', err);
            showNotFound();
        }
    }

    function wireForm() {
        if (!form) return;
        form.addEventListener('submit', submitRegistration);
    }

    function initializePage() {
        if (!window.supabaseClient) {
            console.error('Supabase client is unavailable.');
            showAlert('Unable to connect to the registration system.', 'danger');
            return;
        }

        if (!eventId) {
            showNotFound();
            return;
        }

        wireForm();
        loadEvent();
    }

    document.addEventListener('DOMContentLoaded', initializePage);
})();              