// Admin authentication logic for Kingdom Gathering

const adminLoginForm = document.getElementById('adminLoginForm');
const signInButton = document.getElementById('signInButton');
const signInText = document.getElementById('signInText');
const signInSpinner = document.getElementById('signInSpinner');
const alertContainer = document.getElementById('alertContainer');

function showAlert(message, type = 'danger') {
    alertContainer.innerHTML = `
        <div class="alert alert-${type} alert-dismissible fade show login-alert" role="alert">
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        </div>
    `;
}

function setLoading(isLoading) {
    signInButton.disabled = isLoading;
    signInSpinner.classList.toggle('d-none', !isLoading);
    signInText.textContent = isLoading ? 'Signing In' : 'Sign In';
}

async function redirectIfSignedIn() {
    try {
        const isLocalhost =
            location.hostname === '127.0.0.1' ||
            location.hostname === 'localhost';

        const { data } = await supabaseClient.auth.getSession();

        if (data?.session && !isLocalhost) {
            window.location.href = './dashboard.html';
        }
    } catch (error) {
        console.warn('Login session check failed:', error);
    }
}

redirectIfSignedIn();

function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

adminLoginForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    alertContainer.innerHTML = '';

    const email = document.getElementById('adminEmail').value.trim();
    const password = document.getElementById('adminPassword').value;

    if (!email || !password) {
        showAlert('Please enter both email and password.', 'warning');
        return;
    }

    if (!isValidEmail(email)) {
        showAlert('Please enter a valid email address.', 'warning');
        return;
    }

    setLoading(true);

    try {
        const { data, error } = await supabaseClient.auth.signInWithPassword({
            email,
            password
        });

        if (error) {
            showAlert('Invalid email or password.', 'danger');
            return;
        }

        if (!data.session) {
            showAlert('Unable to sign in. Please try again.', 'danger');
            return;
        }

        showAlert('Signed in successfully. Redirecting to dashboard...', 'success');

        console.log('Redirecting to dashboard because successful login session exists.');
        setTimeout(() => {
            window.location.href = './dashboard.html';
        }, 900);
    } catch (error) {
        console.error(error);
        showAlert('Network error. Please check your connection and try again.', 'danger');
    } finally {
        setLoading(false);
    }
});