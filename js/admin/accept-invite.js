const alertContainer = document.getElementById('alertContainer');
const manualLink = document.getElementById('manualLink');

function showAlert(message, type = 'danger') {
    alertContainer.innerHTML = `
        <div class="alert alert-${type}">
            ${message}
        </div>
    `;
}

async function handleInviteRedirect() {
    try {
        const { data, error } = await supabaseClient.auth.getSession();

        if (error) {
            console.error(error);
            showAlert('Invalid or expired invite link.');
            manualLink.classList.remove('d-none');
            return;
        }

        if (!data?.session) {
            showAlert('No authenticated invite session found.');
            manualLink.classList.remove('d-none');
            return;
        }

        window.location.href = './update-password.html';

    } catch (err) {
        console.error(err);
        showAlert('Unable to process invite.');
        manualLink.classList.remove('d-none');
    }
}

handleInviteRedirect();