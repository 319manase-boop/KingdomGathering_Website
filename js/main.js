/* =====================================================
   KINGDOM GATHERING CHURCH WEBSITE - ENHANCED JAVASCRIPT
   ===================================================== */

document.addEventListener('DOMContentLoaded', function() {
    // Initialize all components
    initNavigation();
    initContactForm();
    initCounselingForm();
    initScrollAnimations();
    initSmoothScroll();
    initParticleEffects();
    initHeroAnimations();
    initInteractiveElements();
    initScrollProgress();
});

/* =====================================================
   ENHANCED NAVIGATION FUNCTIONS
   ===================================================== */

function initNavigation() {
    const navLinks = document.querySelectorAll('.nav-link');
    const navbarCollapse = document.querySelector('.navbar-collapse');
    const navbar = document.querySelector('.navbar');

    navLinks.forEach(link => {
        link.addEventListener('click', function() {
            // Close mobile menu when a link is clicked
            if (navbarCollapse.classList.contains('show')) {
                const closeButton = document.querySelector('.navbar-toggler');
                closeButton.click();
            }

            // Add ripple effect
            createRippleEffect(this);
        });

        // Add hover sound effect (visual feedback)
        link.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-2px) scale(1.02)';
        });

        link.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0) scale(1)';
        });
    });

    // Enhanced scroll effect to navbar
    window.addEventListener('scroll', function() {
        const scrolled = window.pageYOffset;
        const rate = scrolled * -0.5;

        if (window.scrollY > 50) {
            navbar.style.boxShadow = '0 8px 32px rgba(0, 0, 0, 0.6)';
            navbar.style.backdropFilter = 'blur(20px) saturate(180%)';
            navbar.style.background = 'rgba(26, 26, 26, 0.95)';
        } else {
            navbar.style.boxShadow = '0 4px 30px rgba(0, 0, 0, 0.4)';
            navbar.style.background = 'linear-gradient(135deg, var(--primary-dark) 0%, var(--dark-bg) 50%, var(--primary-dark) 100%)';
        }
    });
}

/* =====================================================
   PARTICLE EFFECTS
   ===================================================== */

function initParticleEffects() {
    // Create floating particles in hero section
    const heroSection = document.querySelector('.hero-section');
    if (heroSection) {
        createFloatingParticles(heroSection, 15);
    }

    // Create particles for other sections
    const sections = document.querySelectorAll('section');
    sections.forEach(section => {
        if (!section.classList.contains('hero-section')) {
            createSectionParticles(section, 5);
        }
    });
}

function createFloatingParticles(container, count) {
    for (let i = 0; i < count; i++) {
        const particle = document.createElement('div');
        particle.className = 'floating-particle';
        particle.style.cssText = `
            position: absolute;
            width: ${Math.random() * 6 + 2}px;
            height: ${Math.random() * 6 + 2}px;
            background: rgba(212, 175, 55, ${Math.random() * 0.6 + 0.2});
            border-radius: 50%;
            top: ${Math.random() * 100}%;
            left: ${Math.random() * 100}%;
            animation: float-particle ${Math.random() * 10 + 10}s ease-in-out infinite;
            animation-delay: ${Math.random() * 5}s;
            pointer-events: none;
            z-index: 1;
        `;
        container.appendChild(particle);
    }
}

function createSectionParticles(container, count) {
    for (let i = 0; i < count; i++) {
        const particle = document.createElement('div');
        particle.className = 'section-particle';
        particle.style.cssText = `
            position: absolute;
            width: ${Math.random() * 4 + 1}px;
            height: ${Math.random() * 4 + 1}px;
            background: rgba(212, 175, 55, ${Math.random() * 0.3 + 0.1});
            border-radius: 50%;
            top: ${Math.random() * 100}%;
            left: ${Math.random() * 100}%;
            animation: drift ${Math.random() * 20 + 15}s linear infinite;
            animation-delay: ${Math.random() * 10}s;
            pointer-events: none;
            z-index: 0;
        `;
        container.appendChild(particle);
    }
}

/* =====================================================
   HERO ANIMATIONS
   ===================================================== */

function initHeroAnimations() {
    const heroTitle = document.querySelector('.hero-section h1');
    const heroSubtitle = document.querySelector('.hero-section .lead');
    const heroButton = document.querySelector('.hero-section .btn-gold');

    if (heroTitle) {
        // Add typing effect to hero title
        const text = heroTitle.textContent;
        heroTitle.textContent = '';
        let i = 0;
        const typeWriter = () => {
            if (i < text.length) {
                heroTitle.textContent += text.charAt(i);
                i++;
                setTimeout(typeWriter, 100);
            }
        };
        setTimeout(typeWriter, 500);
    }

    // Add staggered animations
    if (heroSubtitle) {
        heroSubtitle.style.opacity = '0';
        heroSubtitle.style.transform = 'translateY(30px)';
        setTimeout(() => {
            heroSubtitle.style.transition = 'all 0.8s ease';
            heroSubtitle.style.opacity = '1';
            heroSubtitle.style.transform = 'translateY(0)';
        }, 1500);
    }

    if (heroButton) {
        heroButton.style.opacity = '0';
        heroButton.style.transform = 'translateY(30px)';
        setTimeout(() => {
            heroButton.style.transition = 'all 0.8s ease';
            heroButton.style.opacity = '1';
            heroButton.style.transform = 'translateY(0)';
        }, 2000);
    }
}

/* =====================================================
   INTERACTIVE ELEMENTS
   ===================================================== */

function initInteractiveElements() {
    // Add ripple effect to buttons
    const buttons = document.querySelectorAll('.btn, .card, .ministry-card');
    buttons.forEach(button => {
        button.addEventListener('click', function(e) {
            createRippleEffect(this, e);
        });
    });

    // Add magnetic effect to certain elements
    const magneticElements = document.querySelectorAll('.ministry-icon, .value-icon');
    magneticElements.forEach(element => {
        element.addEventListener('mousemove', function(e) {
            const rect = this.getBoundingClientRect();
            const x = e.clientX - rect.left - rect.width / 2;
            const y = e.clientY - rect.top - rect.height / 2;
            this.style.transform = `translate(${x * 0.1}px, ${y * 0.1}px)`;
        });

        element.addEventListener('mouseleave', function() {
            this.style.transform = 'translate(0, 0)';
        });
    });

    // Add parallax effect to hero background
    window.addEventListener('scroll', function() {
        const scrolled = window.pageYOffset;
        const heroSection = document.querySelector('.hero-section');
        if (heroSection) {
            const rate = scrolled * -0.5;
            heroSection.style.backgroundPosition = `center ${rate}px`;
        }
    });
}

/* =====================================================
   SCROLL PROGRESS INDICATOR
   ===================================================== */

function initScrollProgress() {
    const progressBar = document.createElement('div');
    progressBar.id = 'scroll-progress';
    progressBar.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 0%;
        height: 4px;
        background: linear-gradient(90deg, var(--gold-color), var(--gold-dark));
        z-index: 9999;
        transition: width 0.3s ease;
        box-shadow: 0 0 10px rgba(212, 175, 55, 0.5);
    `;
    document.body.appendChild(progressBar);

    window.addEventListener('scroll', function() {
        const scrollTop = window.pageYOffset;
        const docHeight = document.body.offsetHeight - window.innerHeight;
        const scrollPercent = (scrollTop / docHeight) * 100;
        progressBar.style.width = scrollPercent + '%';
    });
}

/* =====================================================
   UTILITY FUNCTIONS
   ===================================================== */

function createRippleEffect(element, event) {
    const ripple = document.createElement('div');
    const rect = element.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const x = event ? event.clientX - rect.left - size / 2 : rect.width / 2 - size / 2;
    const y = event ? event.clientY - rect.top - size / 2 : rect.height / 2 - size / 2;

    ripple.style.cssText = `
        position: absolute;
        width: ${size}px;
        height: ${size}px;
        background: rgba(255, 255, 255, 0.3);
        border-radius: 50%;
        transform: scale(0);
        animation: ripple 0.6s ease-out;
        pointer-events: none;
        top: ${y}px;
        left: ${x}px;
    `;

    element.style.position = element.style.position || 'relative';
    element.appendChild(ripple);

    setTimeout(() => {
        ripple.remove();
    }, 600);
}

/* =====================================================
   NAVIGATION FUNCTIONS
   ===================================================== */

function initNavigation() {
    const navLinks = document.querySelectorAll('.nav-link');
    const navbarCollapse = document.querySelector('.navbar-collapse');

    navLinks.forEach(link => {
        link.addEventListener('click', function() {
            // Close mobile menu when a link is clicked
            if (navbarCollapse.classList.contains('show')) {
                const closeButton = document.querySelector('.navbar-toggler');
                closeButton.click();
            }
        });
    });

    // Add scroll effect to navbar
    window.addEventListener('scroll', function() {
        const navbar = document.querySelector('.navbar');
        if (window.scrollY > 50) {
            navbar.style.boxShadow = '0 5px 20px rgba(0, 0, 0, 0.5)';
        } else {
            navbar.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.3)';
        }
    });
}

/* =====================================================
   CONTACT FORM FUNCTIONS
   ===================================================== */

function initContactForm() {
    const contactForm = document.getElementById('contactForm');

    if (contactForm) {
        contactForm.addEventListener('submit', function(e) {
            e.preventDefault();

            // Get form values
            const name = document.getElementById('name').value.trim();
            const email = document.getElementById('email').value.trim();
            const subject = document.getElementById('subject').value.trim();
            const message = document.getElementById('message').value.trim();

            // Validate form
            if (!validateForm(name, email, subject, message)) {
                return;
            }

            // Simulate sending email
            const originalText = this.querySelector('button[type="submit"]').textContent;
            const submitBtn = this.querySelector('button[type="submit"]');
            
            submitBtn.disabled = true;
            submitBtn.textContent = 'Sending...';
            submitBtn.classList.add('disabled');

            // Simulate API call (in real scenario, this would send to a backend)
            setTimeout(() => {
                // Show success message
                showAlert('success', 'Message Sent!', 'Thank you for contacting us. We will get back to you soon.');
                
                // Reset form
                contactForm.reset();
                
                // Restore button
                submitBtn.disabled = false;
                submitBtn.textContent = originalText;
                submitBtn.classList.remove('disabled');
            }, 2000);
        });
    }
}

/* =====================================================
   COUNSELING FORM FUNCTIONS
   ===================================================== */
function initCounselingForm() {
    const counselingForm = document.getElementById('counselingForm');
    if (counselingForm) {
        counselingForm.addEventListener('submit', function(e) {
            e.preventDefault();
            // Get form values
            const name = document.getElementById('counselingName').value.trim();
            const email = document.getElementById('counselingEmail').value.trim();
            const phone = document.getElementById('counselingPhone').value.trim();
            const date = document.getElementById('counselingDate').value;
            const time = document.getElementById('counselingTime').value;
            const message = document.getElementById('counselingMessage').value.trim();

            // Validate form
            if (!validateCounselingForm(name, email, phone, date, time, message)) {
                return;
            }

            const originalText = this.querySelector('button[type="submit"]').textContent;
            const submitBtn = this.querySelector('button[type="submit"]');
            submitBtn.disabled = true;
            submitBtn.textContent = 'Booking...';
            submitBtn.classList.add('disabled');

            setTimeout(() => {
                showAlert('success', 'Session Booked!', 'Your counseling session request has been received. We will contact you soon.');
                counselingForm.reset();
                submitBtn.disabled = false;
                submitBtn.textContent = originalText;
                submitBtn.classList.remove('disabled');
            }, 2000);
        });
    }
}

function validateCounselingForm(name, email, phone, date, time, message) {
    if (!name || !email || !phone || !date || !time || !message) {
        showAlert('warning', 'Incomplete Form', 'Please fill in all fields for counseling booking.');
        return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        showAlert('error', 'Invalid Email', 'Please enter a valid email address.');
        return false;
    }
    const phoneRegex = /^[0-9\s\-\+]{7,15}$/;
    if (!phoneRegex.test(phone)) {
        showAlert('error', 'Invalid Phone', 'Please enter a valid phone number.');
        return false;
    }
    return true;
}

function validateForm(name, email, subject, message) {
    // Check if fields are empty
    if (!name || !email || !subject || !message) {
        showAlert('warning', 'Incomplete Form', 'Please fill in all fields.');
        return false;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        showAlert('error', 'Invalid Email', 'Please enter a valid email address.');
        return false;
    }

    return true;
}

function showAlert(type, title, message) {
    // Create alert element
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type === 'success' ? 'success' : type === 'warning' ? 'warning' : 'danger'} alert-dismissible fade show`;
    alertDiv.role = 'alert';
    alertDiv.innerHTML = `
        <strong>${title}</strong> ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;

    // Insert alert at the top of the contact section
    const contactSection = document.getElementById('contact');
    contactSection.insertBefore(alertDiv, contactSection.firstChild);

    // Auto-remove alert after 5 seconds
    setTimeout(() => {
        alertDiv.remove();
    }, 5000);
}

/* =====================================================
   SCROLL ANIMATIONS
   ===================================================== */

function initScrollAnimations() {
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -100px 0px'
    };

    const observer = new IntersectionObserver(function(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    // Observe all cards and service elements
    const elements = document.querySelectorAll(
        '.card, .service-card, .ministry-card, .program-badge, .event-card'
    );

    elements.forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(30px)';
        el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        observer.observe(el);
    });
}

/* =====================================================
   SMOOTH SCROLL
   ===================================================== */

function initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            const href = this.getAttribute('href');
            
            // Skip if href is just '#'
            if (href === '#') {
                return;
            }

            e.preventDefault();
            
            const target = document.querySelector(href);
            if (target) {
                const offsetTop = target.offsetTop - 80; // Account for sticky navbar
                window.scrollTo({
                    top: offsetTop,
                    behavior: 'smooth'
                });
            }
        });
    });
}

/* =====================================================
   UTILITY FUNCTIONS
   ===================================================== */

// Format phone number
function formatPhoneNumber(input) {
    const value = input.value.replace(/\D/g, '');
    if (value.length > 0) {
        input.value = value.substring(0, 10);
    }
}

// Toggle mobile menu
function toggleMobileMenu() {
    const navbar = document.querySelector('.navbar-collapse');
    navbar.classList.toggle('show');
}

// Scroll to top
function scrollToTop() {
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
}

// Check if element is in viewport
function isInViewport(element) {
    const rect = element.getBoundingClientRect();
    return (
        rect.top >= 0 &&
        rect.left >= 0 &&
        rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
        rect.right <= (window.innerWidth || document.documentElement.clientWidth)
    );
}

/* =====================================================
   EVENT LISTENERS FOR GLOBAL FUNCTIONS
   ===================================================== */

// Add scroll-to-top button functionality
window.addEventListener('scroll', function() {
    if (window.pageYOffset > 300) {
        // Show scroll to top button if it exists
        const scrollBtn = document.getElementById('scrollToTopBtn');
        if (scrollBtn) {
            scrollBtn.style.display = 'block';
        }
    } else {
        const scrollBtn = document.getElementById('scrollToTopBtn');
        if (scrollBtn) {
            scrollBtn.style.display = 'none';
        }
    }
});

// Handle active nav link on scroll
window.addEventListener('scroll', function() {
    const sections = document.querySelectorAll('section[id]');
    const navLinks = document.querySelectorAll('.navbar-nav .nav-link');

    let current = '';

    sections.forEach(section => {
        const sectionTop = section.offsetTop;
        const sectionHeight = section.clientHeight;

        if (window.pageYOffset >= sectionTop - 200) {
            current = section.getAttribute('id');
        }
    });

    navLinks.forEach(link => {
        link.classList.remove('active');
        const href = link.getAttribute('href');
        if (href === `#${current}`) {
            link.classList.add('active');
        }
    });
});

/* =====================================================
   PERFORMANCE OPTIMIZATIONS
   ===================================================== */

// Lazy load images (if you add images later)
if ('IntersectionObserver' in window) {
    const imageObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                img.src = img.dataset.src;
                img.classList.add('lazy-loaded');
                observer.unobserve(img);
            }
        });
    });

    document.querySelectorAll('img[data-src]').forEach(img => {
        imageObserver.observe(img);
    });
}

function rsvpEvent(button, type) {
    const card = button.closest('.event-card');
    if (!card) return;

    const titleItem = card.querySelector('h3, h4');
    const eventTitle = titleItem ? titleItem.textContent.trim() : 'this event';
    const span = button.querySelector('span');

    if (span) {
        const current = parseInt(span.textContent, 10) || 0;
        span.textContent = current + 1;
    }

    const status = type === 'going' ? 'Going' : 'Interested';
    showAlert('success', 'RSVP Recorded', `Thanks for letting us know you are ${status} for ${eventTitle}.`);
}

console.log('Kingdom Gathering Church Website - Initialized Successfully');
