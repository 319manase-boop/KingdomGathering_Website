const resetForm = document.getElementById('resetForm');
const alertContainer = document.getElementById('alertContainer');
const resetButton = document.getElementById('resetButton');
const resetText = document.getElementById('resetText');
const resetSpinner = document.getElementById('resetSpinner');

function showAlert(message, type = 'danger') {
    alertContainer.innerHTML = `
        <div class="alert alert-${type} alert-dismissible fade show login-alert" role="alert">
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        </div>
    `;
}

function setLoading(isLoading) {
    resetButton.disabled = isLoading;
    resetSpinner.classList.toggle('d-none', !isLoading);
    resetText.textContent = isLoading ? 'Sending Link' : 'Send Reset Link';
}

function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

async function invokeResetPassword(email) {
    const payload = {
        action: 'reset_password',
        email: email.trim().toLowerCase()
    };

    if (supabaseClient.functions && typeof supabaseClient.functions.invoke === 'function') {
        const { data, error } = await supabaseClient.functions.invoke('admin-user-invite', {
            body: JSON.stringify(payload),
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (error) {
            throw error;
        }

        return data;
    }

    const anonKey = window.SUPABASE_ANON_KEY;
    const baseUrl = supabaseClient.supabaseUrl || window.SUPABASE_URL;
    if (!anonKey || !baseUrl) {
        throw new Error('Unable to invoke reset password flow from this page.');
    }

    const url = `${baseUrl.replace(/\/+$/, '')}/functions/v1/admin-user-invite`;
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            apikey: anonKey,
            Authorization: `Bearer ${anonKey}`
        },
        body: JSON.stringify(payload)
    });

    const result = await response.json().catch(() => null);
    if (!response.ok) {
        throw new Error(result?.error || result?.message || 'Unable to send password reset email.');
    }

    return result;
}

resetForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    alertContainer.innerHTML = '';

    const email = document.getElementById('resetEmail').value.trim();
    if (!email) {
        showAlert('Please enter the email address associated with your admin account.', 'warning');
        return;
    }
    if (!isValidEmail(email)) {
        showAlert('Please enter a valid email address.', 'warning');
        return;
    }

    setLoading(true);

    try {
        const data = await invokeResetPassword(email);
        showAlert(data?.message || 'A password reset link was sent to your email.', 'success');
    } catch (error) {
        console.error('Reset password request failed:', error);
        showAlert(error.message || 'Unable to send password reset email. Please try again later.', 'danger');
    } finally {
        setLoading(false);
    }
});
