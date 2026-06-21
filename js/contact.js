// Contact page helpers
document.addEventListener('click', function(e) {
    const target = e.target.closest('[data-focus]');
    if (!target) return;
    e.preventDefault();
    const selector = target.getAttribute('data-focus');
    const el = document.querySelector(selector);
    if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setTimeout(() => { el.focus({ preventScroll: true }); }, 400);
    }
});

// WhatsApp FAB Menu Toggle
(function(){
    const whatsappToggle = document.getElementById('whatsappToggle');
    const whatsappMenu = document.getElementById('whatsappMenu');
    
    if(whatsappToggle && whatsappMenu){
        whatsappToggle.addEventListener('click', (e) => {
                if (whatsappToggle.tagName.toLowerCase() === 'a' && whatsappToggle.href) {
                    return;
                }
        });
        
        // Close menu when clicking outside
        document.addEventListener('click', (e) => {
            if(!e.target.closest('#whatsappFab')){
                whatsappMenu.classList.add('d-none');
            }
        });
        
        // Handle WhatsApp links
        document.querySelectorAll('#whatsappMenu a').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const message = link.getAttribute('data-wa');
                const encodedMsg = encodeURIComponent(message);
                window.open(`https://wa.me/26775919290?text=${encodedMsg}`, '_blank');
                whatsappMenu.classList.add('d-none');
            });
        });
    }
})();

// Modal logic for contact page
(function(){
    const overlay = document.getElementById('modalOverlay');

    function openModal(id){
        const modal = document.getElementById(id);
        if(!modal) return;
        // Clear any previous inline success/error messages when opening
        const resp = modal.querySelector('[id$="Response"]');
        if(resp){ resp.classList.add('d-none'); resp.innerHTML = ''; }
        document.querySelectorAll('.page-modal:not(.d-none)').forEach((openModal) => {
            openModal.classList.add('d-none');
            openModal.setAttribute('aria-hidden', 'true');
        });
        modal.classList.remove('d-none');
        overlay?.classList.remove('d-none');
        modal.setAttribute('aria-hidden', 'false');
        overlay?.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';
    }

    function closeModal(modal){
        if(!modal) return;
        modal.classList.add('d-none');
        modal.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
        const anyOpen = document.querySelectorAll('.page-modal:not(.d-none)').length > 0;
        if(!anyOpen){
            overlay?.classList.add('d-none');
            overlay?.setAttribute('aria-hidden', 'true');
        }
    }

    document.addEventListener('click', (e) => {
        const target = e.target.closest('[data-modal-target]');
        if(target){
            e.preventDefault();
            const modalId = target.getAttribute('data-modal-target');
            openModal(modalId);
            return;
        }

        const closeButton = e.target.closest('[data-modal-close]');
        if(closeButton){
            const modal = closeButton.closest('.page-modal');
            closeModal(modal);
            return;
        }

        if(e.target === overlay){
            document.querySelectorAll('.page-modal:not(.d-none)').forEach(closeModal);
        }
    });

    document.addEventListener('keyup', (e) => {
        if(e.key === 'Escape'){
            document.querySelectorAll('.page-modal:not(.d-none)').forEach(closeModal);
        }
    });
})();

// Contact form logic: Supabase integration, UI states, animations
(function(){
    const form = document.getElementById('contactForm');
    const submitBtn = document.getElementById('contactSubmit');
    const responseContainer = document.getElementById('contactResponse');
    const cardWrapper = document.getElementById('contactFormCard');

    function log(){ console.debug('[Contact]', ...arguments); }

    function setLoading(isLoading){
        if(!submitBtn) return;
        submitBtn.disabled = isLoading;
        submitBtn.textContent = isLoading ? 'Sending...' : 'Send Message';
    }

    function showSuccess(){
        if(!responseContainer) return;
        cardWrapper?.classList.add('d-none');
        responseContainer.classList.remove('d-none');
        responseContainer.innerHTML = `
            <div class="success-card fade-in-section">
                <h3>✅ Message Sent Successfully</h3>
                <p>Thank you for reaching out. Our team has received your message and will respond as soon as possible.</p>
                <div class="d-flex gap-2 mt-3 flex-column flex-sm-row">
                    <button id="sendAnother" class="btn btn-outline-gold">Send Another Message</button>
                    <button type="button" class="btn btn-gold" data-modal-target="modal-prayer">Request Prayer</button>
                </div>
            </div>
        `;
        const sendAnother = document.getElementById('sendAnother');
        sendAnother?.addEventListener('click', () => {
            responseContainer.classList.add('d-none');
            cardWrapper?.classList.remove('d-none');
            form.reset();
        });
    }

    function showError(){
        if(!responseContainer) return;
        cardWrapper?.classList.add('d-none');
        responseContainer.classList.remove('d-none');
        responseContainer.innerHTML = `
            <div class="error-card fade-in-section">
                <h3>⚠️ Unable to Send Message</h3>
                <p>Please try again in a few moments, or contact us directly on WhatsApp.</p>
                <div class="mt-3">
                    <button id="tryAgain" class="btn btn-gold">Try Again</button>
                </div>
            </div>
        `;
        const tryAgain = document.getElementById('tryAgain');
        tryAgain?.addEventListener('click', () => {
            responseContainer.classList.add('d-none');
            cardWrapper?.classList.remove('d-none');
        });
    }

    async function handleSubmit(e){
        e.preventDefault();
        if(!form) return;

        const name = (document.getElementById('contactName')?.value || '').trim();
        const email = (document.getElementById('contactEmail')?.value || '').trim();
        const phone = (document.getElementById('contactPhone')?.value || '').trim();
        const subject = (document.getElementById('contactSubject')?.value || '').trim();
        const message = (document.getElementById('contactMessage')?.value || '').trim();

        if(!name || !email || !subject || !message){
            alert('Please complete required fields: Name, Email, Subject, Message');
            return;
        }

        const payload = {
            name, email, phone: phone || null, subject, message,
            source: 'website', status: 'New'
        };

        await submitForm({
            table: 'contact_messages',
            payload,
            responseContainer: responseContainer,
            resetForm: () => form.reset(),
            successMessage: 'Message sent successfully. Our team will be in touch soon.',
            followUpModal: null
        });
    }

    async function handleModalContactSubmit(e){
        e.preventDefault();
        const modalForm = document.getElementById('modalContactForm');
        const responseEl = document.getElementById('modalContactResponse');
        const submitBtn = document.getElementById('modalContactSubmit');

        const name = (document.getElementById('modalContactName')?.value || '').trim();
        const email = (document.getElementById('modalContactEmail')?.value || '').trim();
        const phone = (document.getElementById('modalContactPhone')?.value || '').trim();
        const subject = (document.getElementById('modalContactSubject')?.value || '').trim();
        const message = (document.getElementById('modalContactMessage')?.value || '').trim();

        if(!name || !email || !subject || !message){
            alert('Please complete required fields: Name, Email, Subject, Message');
            return;
        }

        const payload = {
            name, email, phone: phone || null, subject, message,
            source: 'website', status: 'New'
        };

        await submitForm({
            table: 'contact_messages',
            payload,
            responseContainer: responseEl,
            resetForm: () => modalForm.reset(),
            submitButton: submitBtn,
            successMessage: 'Your message has been delivered. Thank you for reaching out.',
            followUpModal: 'modal-prayer'
        });
    }

    async function handleModalPrayerSubmit(e) {
        e.preventDefault();

        const modalForm = document.getElementById("modalPrayerForm");
        const responseEl = document.getElementById("modalPrayerResponse");
        const submitBtn = document.getElementById("modalPrayerSubmit");

        const name = (document.getElementById("modalPrayerName")?.value || "").trim();
        const email = (document.getElementById("modalPrayerEmail")?.value || "").trim();
        const phone = (document.getElementById("modalPrayerPhone")?.value || "").trim();
        const message = (document.getElementById("modalPrayerMessage")?.value || "").trim();

        if (!name || !email || !message) {
            showInlineAlert(responseEl, false, 'Please complete required fields: Name, Email, Prayer Request');
            return;
        }

        const payload = {
            name,
            email,
            phone: phone || null,
            message,
            status: "New",
            answered: false,
            assigned_to: null,
            notes: null
        };

        await submitForm({
            table: "prayer_requests",
            payload,
            responseContainer: responseEl,
            resetForm: () => modalForm.reset(),
            submitButton: submitBtn,
            successMessageTitle: 'Prayer Request Received ❤️',
            successMessageBody: "Thank you for trusting Kingdom Gathering with your prayer request. Our prayer team has received it and will stand with you in prayer. May the Lord strengthen and encourage you.",
            autoClose: 3000
        });
    }

    async function handleModalCounselingSubmit(e) {
        e.preventDefault();

        const modalForm = document.getElementById("modalCounselingForm");
        const responseEl = document.getElementById("modalCounselingResponse");
        const submitBtn = document.getElementById("modalCounselingSubmit");

        const name = (document.getElementById("modalCounselingName")?.value || "").trim();
        const email = (document.getElementById("modalCounselingEmail")?.value || "").trim();
        const phone = (document.getElementById("modalCounselingPhone")?.value || "").trim();
        const preferredContact = (document.getElementById("modalCounselingPreferredContact")?.value || "").trim();
        const message = (document.getElementById("modalCounselingMessage")?.value || "").trim();

        if (!name || !email || !message) {
            showInlineAlert(responseEl, false, 'Please complete required fields: Name, Email, Message');
            return;
        }

        const payload = {
            name,
            email,
            phone: phone || null,
            preferred_contact: preferredContact || null,
            message,
            status: "New"
        };

        await submitForm({
            table: "counseling_requests",
            payload,
            responseContainer: responseEl,
            resetForm: () => modalForm.reset(),
            submitButton: submitBtn,
            successMessageTitle: 'Counseling Request Submitted ❤️',
            successMessageBody: "Thank you for reaching out. A member of our pastoral care team will contact you soon. You are not alone, and we are here to walk this journey with you.",
            autoClose: 3000
        });
    }
    async function submitForm({
        table,
        payload,
        responseContainer,
        resetForm,
        submitButton,
        successMessageTitle,
        successMessageBody,
        autoClose = 0
    }) {
        let originalButtonHtml = "";
        if (submitButton) {
            originalButtonHtml = submitButton.innerHTML;
            submitButton.disabled = true;
            submitButton.innerHTML = `<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Sending...`;
        }

        try {
            console.log(`[${table}] Payload:`, payload);

            const { data, error } = await supabaseClient
                .from(table)
                .insert([payload])
                .select();

            if (error) {
                console.error(`[${table}] Insert Error:`, error);
                showInlineAlert(responseContainer, false, 'The request could not be submitted. Please try again.');
                return;
            }

            console.log(`[${table}] Success:`, data);

            // show success message inline inside the modal
            showInlineAlert(responseContainer, true, successMessageBody, successMessageTitle);

            // reset form after showing message
            resetForm?.();

            // auto-close modal if requested
            if (autoClose && typeof autoClose === 'number') {
                setTimeout(() => {
                    // find modal parent and close
                    const modal = responseContainer?.closest('.page-modal');
                    if (modal) {
                        modal.classList.add('d-none');
                        modal.setAttribute('aria-hidden', 'true');
                        document.body.style.overflow = '';
                        const anyOpen = document.querySelectorAll('.page-modal:not(.d-none)').length > 0;
                        if(!anyOpen){
                            document.getElementById('modalOverlay')?.classList.add('d-none');
                        }
                    }
                    // clear the inline message when modal closes
                    if (responseContainer) { responseContainer.classList.add('d-none'); responseContainer.innerHTML = ''; }
                }, autoClose);
            }

        } catch (err) {
            console.error(`[${table}] Unexpected Error:`, err);
            showInlineAlert(responseContainer, false, 'The request could not be submitted. Please try again.');

        } finally {
            if (submitButton) {
                submitButton.disabled = false;
                submitButton.innerHTML = originalButtonHtml;
            }
        }
    }

    function showInlineAlert(container, success, message, title){
        if(!container) return;
        container.classList.remove('d-none');
        const cardClass = success ? 'success-card' : 'error-card';
        const header = success ? (title || 'Success') : (title || 'Error');
        const headingEmoji = success ? '✅' : '⚠️';
        container.innerHTML = `\n            <div class="${cardClass} fade-in-section">\n                <h3>${headingEmoji} ${header}</h3>\n                <p>${message}</p>\n            </div>\n        `;
        if(!success){
            const tryAgain = document.createElement('button');
            tryAgain.type = 'button';
            tryAgain.className = 'btn btn-gold mt-3';
            tryAgain.textContent = 'Try Again';
            tryAgain.addEventListener('click', () => {
                container.classList.add('d-none');
                container.innerHTML = '';
            });
            container.querySelector(`.${cardClass}`)?.appendChild(tryAgain);
        }
    }
    function showFormMessage(container, success, message, followUpModal){
        if(!container) return;
        const title = success ? 'Success' : 'Something went wrong';
        const body = success
            ? `<p>${message}</p>`
            : `<p>Please try again in a few moments, or contact us directly on WhatsApp.</p>`;
        const action = success && followUpModal
            ? `<button type="button" class="btn btn-gold mt-3" data-modal-target="${followUpModal}">Request Prayer</button>`
            : '';

        const cardClass = success ? 'success-card' : 'error-card';
        container.classList.remove('d-none');
        container.innerHTML = `
            <div class="${cardClass} fade-in-section">
                <h3>${success ? '✅ ' : '⚠️ '}${title}</h3>
                ${body}
                ${action}
            </div>
        `;

        if(!success){
            const tryAgain = document.createElement('button');
            tryAgain.type = 'button';
            tryAgain.className = 'btn btn-gold mt-3';
            tryAgain.textContent = 'Try Again';
            tryAgain.addEventListener('click', () => {
                container.classList.add('d-none');
            });
            container.querySelector(`.${cardClass}`)?.appendChild(tryAgain);
        }
    }

    if(form){
        form.addEventListener('submit', handleSubmit);
    }
    const modalContactForm = document.getElementById('modalContactForm');
    const modalPrayerForm = document.getElementById('modalPrayerForm');
    const modalCounselingForm = document.getElementById('modalCounselingForm');

    if(modalContactForm){
        modalContactForm.addEventListener('submit', handleModalContactSubmit);
    }
    if(modalPrayerForm){
        modalPrayerForm.addEventListener('submit', handleModalPrayerSubmit);
    }
    if(modalCounselingForm){
        modalCounselingForm.addEventListener('submit', handleModalCounselingSubmit);
    }

    // Also attach click handlers for footer buttons (we moved submits to modal footer)
    const modalPrayerSubmitBtn = document.getElementById('modalPrayerSubmit');
    const modalCounselingSubmitBtn = document.getElementById('modalCounselingSubmit');
    if(modalPrayerSubmitBtn){
        modalPrayerSubmitBtn.addEventListener('click', (e) => handleModalPrayerSubmit(e));
    }
    if(modalCounselingSubmitBtn){
        modalCounselingSubmitBtn.addEventListener('click', (e) => handleModalCounselingSubmit(e));
    }

    // Fade-in on scroll
    const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if(entry.isIntersecting){
                entry.target.classList.add('visible');
            }
        });
    }, {threshold: 0.12});
    document.querySelectorAll('.fade-in-section').forEach(el => observer.observe(el));
})();