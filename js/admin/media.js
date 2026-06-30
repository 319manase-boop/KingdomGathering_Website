// Admin Media Library Management

const uploadBucket = document.getElementById('uploadBucket');
const uploadFile = document.getElementById('uploadFile');
const uploadBtn = document.getElementById('uploadBtn');
const mediaSearch = document.getElementById('mediaSearch');
const mediaBucketFilter = document.getElementById('mediaBucketFilter');
const mediaGrid = document.getElementById('mediaGrid');
const mediaAlertContainer = document.getElementById('mediaAlertContainer');
const adminUserEmail = document.getElementById('adminUserEmail');
const logoutButton = document.getElementById('logoutButton');
const sidebarLogout = document.getElementById('sidebarLogout');

let media = [];
let currentUser = null;

const mediaBuckets = [
    { name: 'blog-images', public: true },
    { name: 'event-posters', public: true },
    { name: 'gallery', public: true },
    { name: 'leadership-images', public: true },
    { name: 'branch-images', public: true },
    { name: 'ministry-images', public: true },
    { name: 'sermon-pdfs', public: true },
    { name: 'videos', public: true },
    { name: 'giving-proofs', public: false }
];

async function protectPage() {
    const session = await checkPagePermission('media');
    if (!session) return null;
    currentUser = session.user;
    return session;
}

// Media Library UI helpers
function getEmptyStateMessage() {
    return 'Your media library is empty. Upload assets to get started.';
}

function showAlert(type, message, timeout = 4000) {
    const el = document.createElement('div');
    el.className = `alert alert-${type} alert-dismissible fade show`;
    el.role = 'alert';
    el.innerHTML = `${message} <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>`;
    mediaAlertContainer.appendChild(el);
    if (timeout) setTimeout(() => { el.classList.remove('show'); el.remove(); }, timeout);
}

function escapeHtml(str) {
    return String(str || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// Check if media asset is an image
function isImage(contentType) {
    return contentType && contentType.startsWith('image/');
}

function isVideo(contentType) {
    return contentType && contentType.startsWith('video/');
}

function isPdf(contentType) {
    return contentType === 'application/pdf';
}

async function ensureBucketsExist() {
    for (const bucket of mediaBuckets) {
        const { data, error } = await supabaseClient.storage.getBucket(bucket.name);
        if (error && error.status === 404) {
            const { error: createError } = await supabaseClient.storage.createBucket(bucket.name, {
                public: bucket.public
            });
            if (createError) {
                console.warn(`Unable to create bucket ${bucket.name}:`, createError.message);
                showAlert('warning', `Bucket ${bucket.name} is not available. Uploads to this bucket may fail.`);
            } else {
                console.info(`Created storage bucket: ${bucket.name}`);
            }
        }
    }
}

async function loadMedia() {
    try {
        const { data, error } = await supabaseClient
            .from('media_assets')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error(error);
            showAlert('danger', 'Unable to load media library.');
            return;
        }

        media = data || [];
        renderMedia(media);
    } catch (err) {
        console.error(err);
        showAlert('danger', 'Unable to load media library.');
    }
}

function renderMedia(items) {
    if (!items.length) {
        mediaGrid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 2rem; color: rgba(255,255,255,0.6);">No media library assets found.</div>';
        return;
    }

    mediaGrid.innerHTML = items.map(item => `
        <div class="media-item">
            <div class="media-preview">
                ${isImage(item.content_type) ? `<img src="${getPublicURL(item.bucket_name, item.file_path)}" alt="${escapeHtml(item.file_name)}" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22100%22 height=%22100%22%3E%3Crect fill=%22%23333%22 width=%22100%22 height=%22100%22/%3E%3C/svg%3E'">` : isVideo(item.content_type) ? `<video controls preload="metadata" style="width:100%;height:100%;object-fit:cover;"><source src="${getPublicURL(item.bucket_name, item.file_path)}" type="${escapeHtml(item.content_type)}">Your browser does not support video playback.</video>` : isPdf(item.content_type) ? `<span class="text-muted">📄 PDF</span>` : '<span class="text-muted">📄 ' + escapeHtml(item.file_name.split('.').pop().toUpperCase()) + '</span>'}
            </div>
            <div class="media-info">
                <div class="media-name" title="${escapeHtml(item.file_name)}">${escapeHtml(item.file_name)}</div>
                <div class="media-bucket">${escapeHtml(item.bucket_name)}</div>
                <small style="color: rgba(255,255,255,0.5);">${(item.size / 1024).toFixed(1)} KB</small>
                <div class="media-actions">
                    ${item.bucket_name !== 'giving-proofs' ? `<button class="btn btn-sm btn-outline-warning copy-btn" data-id="${item.id}">Copy URL</button><button class="btn btn-sm btn-outline-secondary open-btn" data-id="${item.id}">Open</button>` : '<span class="text-muted small">Private</span>'}
                    <button class="btn btn-sm btn-outline-danger delete-btn" data-id="${item.id}">Delete</button>
                </div>
            </div>
        </div>
    `).join('');

    // Attach event listeners
    document.querySelectorAll('.copy-btn').forEach(btn => {
        btn.addEventListener('click', (e) => copyURL(e.target.dataset.id));
    });

    document.querySelectorAll('.open-btn').forEach(btn => {
        btn.addEventListener('click', (e) => openMedia(e.target.dataset.id));
    });

    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', (e) => deleteMedia(e.target.dataset.id));
    });
}

function getPublicURL(bucket, path) {
    const baseURL = `${supabaseClient.storageUrl}/object/public/${bucket}`;
    return `${baseURL}/${path}`;
}

async function copyURL(id) {
    const item = media.find(m => m.id === id);
    if (!item) return;

    if (item.bucket_name === 'giving-proofs') {
        showAlert('warning', 'Cannot copy URL for private bucket.');
        return;
    }

    const url = getPublicURL(item.bucket_name, item.file_path);
    try {
        await navigator.clipboard.writeText(url);
        showAlert('success', 'Media URL copied to clipboard.');
    } catch (err) {
        console.error(err);
        showAlert('danger', 'Unable to copy URL.');
    }
}

function openMedia(id) {
    const item = media.find(m => m.id === id);
    if (!item) return;
    if (item.bucket_name === 'giving-proofs') {
        showAlert('warning', 'Private files cannot be opened directly.');
        return;
    }
    const url = getPublicURL(item.bucket_name, item.file_path);
    window.open(url, '_blank');
}

async function deleteMedia(id) {
    const item = media.find(m => m.id === id);
    if (!item) return;

    if (!confirm(`Delete ${escapeHtml(item.file_name)}?`)) return;

    try {
        // Delete from storage
        const { error: storageError } = await supabaseClient.storage
            .from(item.bucket_name)
            .remove([item.file_path]);

        if (storageError) {
            console.error(storageError);
            showAlert('danger', `Unable to delete file from storage (${storageError.message}).`);
            return;
        }

        // Delete from database
        const { error: dbError } = await supabaseClient
            .from('media_assets')
            .delete()
            .eq('id', id);

        if (dbError) {
            console.error(dbError);
            showAlert('danger', `Unable to delete record (${dbError.message}).`);
            return;
        }

        await loadMedia();
        showAlert('success', 'Media asset deleted from library.');
    } catch (err) {
        console.error(err);
        showAlert('danger', 'Unable to delete media.');
    }
}

async function uploadMedia() {
    const bucket = uploadBucket.value.trim();
    const file = uploadFile.files[0];

    if (!bucket) {
        showAlert('warning', 'Please select a bucket.');
        return;
    }

    if (!file) {
        showAlert('warning', 'Please select a file.');
        return;
    }

    uploadBtn.disabled = true;
    uploadBtn.textContent = 'Uploading...';

    try {
        const fileName = `${Date.now()}_${file.name}`;
        const filePath = fileName;

        // Upload to storage
        const { error: uploadError, data: uploadData } = await supabaseClient.storage
            .from(bucket)
            .upload(filePath, file);

        if (uploadError) {
            console.error(uploadError);
            showAlert('danger', `Upload failed (${uploadError.message}).`);
            uploadBtn.disabled = false;
            uploadBtn.textContent = 'Upload';
            return;
        }

        // Save metadata to database
        const { error: dbError } = await supabaseClient
            .from('media_assets')
            .insert([{
                bucket_name: bucket,
                file_path: filePath,
                file_name: file.name,
                content_type: file.type,
                size: file.size,
                uploaded_by: currentUser.id
            }]);

        if (dbError) {
            console.error(dbError);
            showAlert('danger', `Unable to save metadata (${dbError.message}).`);
            uploadBtn.disabled = false;
            uploadBtn.textContent = 'Upload';
            return;
        }

        document.getElementById('uploadForm').reset();
        await loadMedia();
        showAlert('success', 'Media asset uploaded to library.');
        uploadBtn.disabled = false;
        uploadBtn.textContent = 'Upload';
    } catch (err) {
        console.error(err);
        showAlert('danger', 'Upload failed.');
        uploadBtn.disabled = false;
        uploadBtn.textContent = 'Upload';
    }
}

function applyFilters() {
    const q = (mediaSearch.value || '').trim().toLowerCase();
    const bucket = mediaBucketFilter.value;

    const filtered = media.filter(m => {
        const matchesQuery = !q || (m.file_name || '').toLowerCase().includes(q);
        const matchesBucket = !bucket || (m.bucket_name === bucket);
        return matchesQuery && matchesBucket;
    });

    renderMedia(filtered);
}

// Media Library helpers
function getPublicMediaURL(bucket, path) {
    return getPublicURL(bucket, path);
}

uploadBtn?.addEventListener('click', uploadMedia);
mediaSearch?.addEventListener('input', () => applyFilters());
mediaBucketFilter?.addEventListener('change', () => applyFilters());

const signOutAndRedirect = async () => { await supabaseClient.auth.signOut(); window.location.href = './login.html'; };
logoutButton?.addEventListener('click', signOutAndRedirect);
sidebarLogout?.addEventListener('click', async (event) => { event.preventDefault(); await signOutAndRedirect(); });

(async function init() {
    const session = await protectPage();
    if (!session) return;
    adminUserEmail.textContent = session.user.email || 'Admin';
    await ensureBucketsExist();
    await loadMedia();
})();
