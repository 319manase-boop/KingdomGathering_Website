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
    console.log("FULL URL:", window.location.href);
    console.log("HASH:", window.location.hash);
    console.log("SEARCH:", window.location.search);

    try {
        const { data: urlData, error: urlError } = await supabaseClient.auth.getSessionFromUrl({ storeSession: true });
        if (urlError) {
            console.error(urlError);
            showAlert('Invalid or expired invite link.');
            manualLink.classList.remove('d-none');
            return;
        }

        const { data, error } = await supabaseClient.auth.getSession();
        if (error) {
            console.error(error);
            showAlert('Invalid or expired invite link.');
            manualLink.classList.remove('d-none');
            return;
        }

        if (urlData?.session || data?.session) {
            window.location.href = './update-password.html';
            return;
        }

        showAlert('No authenticated invite session found. Please use the link from your email.');
        manualLink.classList.remove('d-none');
    } catch (err) {
        console.error(err);
        showAlert('Unable to process invite.');
        manualLink.classList.remove('d-none');
    }
}

handleInviteRedirect();