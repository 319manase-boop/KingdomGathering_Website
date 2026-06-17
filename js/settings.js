async function loadSettings() {
    if (typeof supabaseClient === 'undefined') {
        return;
    }

    const elements = document.querySelectorAll('[data-setting], [data-setting-href], [data-setting-text]');
    if (!elements.length) {
        return;
    }

    try {
        const { data, error } = await supabaseClient
            .from('settings')
            .select('*')
            .single();

        if (error) {
            console.error('Settings load error:', error);
            return;
        }

        if (!data) {
            return;
        }

        elements.forEach((element) => {
            const settingKey = element.dataset.setting ?? element.dataset.settingHref ?? element.dataset.settingText;
            if (!settingKey) {
                return;
            }

            const value = data[settingKey];
            const isEmpty = value === undefined || value === null || String(value).trim() === '';

            if (isEmpty) {
                if (element.tagName.toLowerCase() === 'a') {
                    element.style.display = 'none';
                } else if (element.tagName.toLowerCase() === 'input' || element.tagName.toLowerCase() === 'textarea') {
                    element.value = '';
                } else {
                    element.textContent = '';
                }
                return;
            }

            if (element.dataset.setting !== undefined) {
                if (element.tagName.toLowerCase() === 'a') {
                    element.href = resolveSettingHref(element.href, value);
                    element.style.display = '';
                    if (!element.children.length) {
                        element.textContent = value;
                    }
                } else if (element.tagName.toLowerCase() === 'input' || element.tagName.toLowerCase() === 'textarea') {
                    element.value = value;
                } else {
                    element.textContent = value;
                }
            }

            if (element.dataset.settingHref !== undefined && element.tagName.toLowerCase() === 'a') {
                element.href = resolveSettingHref(element.href, value);
            }

            if (element.dataset.settingText !== undefined) {
                if (element.tagName.toLowerCase() === 'input' || element.tagName.toLowerCase() === 'textarea') {
                    element.value = value;
                } else {
                    element.textContent = value;
                }
            }
        });
    } catch (error) {
        console.error('Settings load exception:', error);
    }
}

function resolveSettingHref(currentHref, value) {
    const href = String(currentHref ?? '').trim();
    const [base, ...rest] = href.split('?');
    const scheme = base.includes(':') ? `${base.split(':')[0]}:` : '';
    const suffix = rest.length ? `?${rest.join('?')}` : '';

    if ((scheme === 'mailto:' || scheme === 'tel:') && !value.startsWith('mailto:') && !value.startsWith('tel:')) {
        return `${scheme}${value}${suffix}`;
    }

    return value;
}

document.addEventListener('DOMContentLoaded', loadSettings);
