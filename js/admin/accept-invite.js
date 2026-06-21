const alertContainer = document.getElementById('alertContainer');
const manualLink = document.getElementById('manualLink');

function showAlert(message, type = 'danger') {
    alertContainer.innerHTML = `
        <div class="alert alert-${type} alert-dismissible fade show login-alert" role="alert">
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        </div>
    `;
}

function clearUrlTokens() {
    if (window.history && window.history.replaceState) {
        const cleanUrl = `${window.location.origin}${window.location.pathname}`;
        window.history.replaceState({}, document.title, cleanUrl);
    }
}

async function handleInviteRedirect() {
    const searchParams = new URLSearchParams(window.location.search);
    const type = searchParams.get('type');
    const accessToken = searchParams.get('access_token');
    const refreshToken = searchParams.get('refresh_token');

    if (!type && !accessToken && !refreshToken) {
        showAlert('No invite or recovery token found. Please use the link from your email.', 'warning');
        manualLink.classList.remove('d-none');
        return;
    }

    if (typeof supabaseClient.auth.getSessionFromUrl !== 'function') {
        showAlert('Your browser does not support the required auth flow. Please update your browser and try again.', 'danger');
        manualLink.classList.remove('d-none');
        return;
    }

    try {
        const { data, error } = await supabaseClient.auth.getSessionFromUrl();
        if (error) {
            console.error('Failed to get session from URL:', error);
            showAlert('This invite link is invalid or expired. Request a new password reset or contact your administrator.', 'danger');
            manualLink.classList.remove('d-none');
            return;
        }

        clearUrlTokens();

        if (!data?.session) {
            showAlert('Unable to establish a session from the invite link. Please retry from your email.', 'danger');
            manualLink.classList.remove('d-none');
            return;
        }

        window.location.href = './update-password.html';
    } catch (error) {
        console.error(error);
        showAlert('Unexpected error during invite acceptance. Please try again in a moment.', 'danger');
        manualLink.classList.remove('d-none');
    }
}

handleInviteRedirect();
