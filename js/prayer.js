// Prayer form handling for the contact page
function initPrayerForm() {
    const prayerForm = document.getElementById('prayerForm');
    if (!prayerForm) {
        return;
    }
    if (prayerForm.dataset.prayerHandlerAttached === 'true') {
        return;
    }
    prayerForm.dataset.prayerHandlerAttached = 'true';

    prayerForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const submitBtn = document.getElementById('prayerSubmit');
        if (!submitBtn) {
            console.error('Prayer submit button not found');
            return;
        }

        const spinner = submitBtn.querySelector('.btn-spinner');
        submitBtn.disabled = true;
        if (spinner) spinner.classList.remove('d-none');

        try {
            const nameInput = document.getElementById('prayerName');
            const emailInput = document.getElementById('prayerEmail');
            const phoneInput = document.getElementById('prayerPhone');
            const messageInput = document.getElementById('prayerMessage');
            const anonymousCheckbox = document.getElementById('prayerAnonymous');

            const name = nameInput ? nameInput.value.trim() : '';
            const email = emailInput ? emailInput.value.trim() || null : null;
            const phone = phoneInput ? phoneInput.value.trim() || null : null;
            const message = messageInput ? messageInput.value.trim() : '';
            const anonymous = anonymousCheckbox ? anonymousCheckbox.checked : false;

            const payload = {
                name,
                email: anonymous ? null : email,
                phone: anonymous ? null : phone,
                message,
                status: 'new',
                answered: false
            };

            const { error } = await supabaseClient.from('prayer_requests').insert([payload]);
            if (error) throw error;

            alert('Prayer Request Received\n\nThank you for trusting us.\n\nOur intercessory team will stand with you in prayer.\n\nGod bless you.');
            prayerForm.reset();
        } catch (err) {
            console.error(err);
            alert('Something went wrong. Please try again.');
        } finally {
            submitBtn.disabled = false;
            if (spinner) spinner.classList.add('d-none');
        }
    });
}

console.log('prayer.js loaded');