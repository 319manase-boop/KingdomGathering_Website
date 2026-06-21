const passwordForm = document.getElementById('passwordForm');
const alertContainer = document.getElementById('alertContainer');
const submitButton = document.getElementById('submitButton');
const submitText = document.getElementById('submitText');
const submitSpinner = document.getElementById('submitSpinner');

function showAlert(message, type = 'danger') {
    alertContainer.innerHTML = `
        <div class="alert alert-${type} alert-dismissible fade show login-alert" role="alert">
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        </div>
    `;
}

function setLoading(isLoading) {
    submitButton.disabled = isLoading;
    submitSpinner.classList.toggle('d-none', !isLoading);
    submitText.textContent = isLoading ? 'Saving Password' : 'Save Password';
}

function clearUrlTokens() {
    if (window.history && window.history.replaceState) {
        const cleanUrl = `${window.location.origin}${window.location.pathname}`;
        window.history.replaceState({}, document.title, cleanUrl);
    }
}

function validatePasswords(password, confirmPassword) {
    if (!password || !confirmPassword) {
        return 'Please enter and confirm your new password.';
    }
    if (password.length < 8) {
        return 'Your password must be at least 8 characters long.';
    }
    if (password !== confirmPassword) {
        return 'Passwords do not match. Please confirm the same password twice.';
    }
    return null;
}

async function initializePasswordFlow() {
    try {
        const searchParams = new URLSearchParams(window.location.search);
        const type = searchParams.get('type');
        const accessToken = searchParams.get('access_token');
        const refreshToken = searchParams.get('refresh_token');

        if ((type === 'recovery' || accessToken || refreshToken) && typeof supabaseClient.auth.getSessionFromUrl === 'function') {
            const { data, error } = await supabaseClient.auth.getSessionFromUrl();
            if (error) {
                showAlert('Unable to validate the password setup link. Request a new reset link or contact your administrator.', 'danger');
                submitButton.disabled = true;
                return;
            }
            clearUrlTokens();
            if (!data?.session) {
                showAlert('Unable to establish a session from the email link. Request a new password reset link.', 'danger');
                submitButton.disabled = true;
                return;
            }
        }

        const { data: sessionData } = await supabaseClient.auth.getSession();
        if (!sessionData?.session) {
            showAlert('This page must be opened from the password setup link in your email. If you do not have one, request a password reset from the login page.', 'warning');
            submitButton.disabled = true;
        }
    } catch (error) {
        console.error(error);
        showAlert('Unexpected error loading the password setup page. Please try again or contact support.', 'danger');
        submitButton.disabled = true;
    }
}

passwordForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    alertContainer.innerHTML = '';

    const newPassword = document.getElementById('newPassword').value.trim();
    const confirmPassword = document.getElementById('confirmPassword').value.trim();
    const validationError = validatePasswords(newPassword, confirmPassword);

    if (validationError) {
        showAlert(validationError, 'warning');
        return;
    }

    setLoading(true);

    try {
        const { data, error } = await supabaseClient.auth.updateUser({ password: newPassword });
        if (error) {
            console.error('Password update failed:', error);
            showAlert(error.message || 'Unable to update password. Please try again.', 'danger');
            return;
        }

        await supabaseClient.auth.signOut();
        showAlert('Password saved successfully. Redirecting to login...', 'success');
        setTimeout(() => {
            window.location.href = './login.html';
        }, 1200);
    } catch (error) {
        console.error(error);
        showAlert('Network error. Please try again in a moment.', 'danger');
    } finally {
        setLoading(false);
    }
});

initializePasswordFlow();
