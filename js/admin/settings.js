// Admin Settings: load key/value pairs from `settings` table and autosave on change
(function(){
    const alertEl = document.getElementById('settingsAlert');
    const form = document.getElementById('settingsForm');
    const inputs = Array.from(form.querySelectorAll('[data-key]'));
    let saveTimers = {};

    function showAlert(message, type='success'){
        alertEl.className = `alert alert-${type}`;
        alertEl.textContent = message;
        alertEl.classList.remove('d-none');
        setTimeout(()=> alertEl.classList.add('d-none'), 3500);
    }

    async function checkPermission(){
        const ok = await checkPagePermission('settings');
        if(!ok) location.href = 'access-denied.html';
    }

    async function loadSettings(){
        try{
            const { data, error } = await supabaseClient.from('settings').select('*');
            if(error) throw error;
            const map = {};
            (data||[]).forEach(r => { map[r.key] = r.value; });
            inputs.forEach(inp => {
                const k = inp.dataset.key;
                if(map[k] !== undefined) inp.value = map[k];
            });
        }catch(err){
            showAlert('Failed to load settings: ' + err.message, 'danger');
        }
    }

    function scheduleSave(key, value){
        if(saveTimers[key]) clearTimeout(saveTimers[key]);
        saveTimers[key] = setTimeout(()=> saveSetting(key, value), 800);
    }

    async function saveSetting(key, value){
        try{
            const session = await supabaseClient.auth.getSession();
            const userId = session?.data?.session?.user?.id || null;
            const payload = { key, value, updated_by: userId };
            const { error } = await supabaseClient.from('settings').upsert(payload, { onConflict: 'key' });
            if(error) throw error;
            showAlert('Saved ' + key);
        }catch(err){
            showAlert('Save failed: ' + err.message, 'danger');
        }
    }

    function attachEvents(){
        inputs.forEach(inp => {
            const key = inp.dataset.key;
            inp.addEventListener('input', (e)=> scheduleSave(key, e.target.value));
            inp.addEventListener('change', (e)=> scheduleSave(key, e.target.value));
        });
    }

    async function init(){
        await checkPermission();
        attachEvents();
        await loadSettings();
    }

    document.addEventListener('DOMContentLoaded', init);
})();
