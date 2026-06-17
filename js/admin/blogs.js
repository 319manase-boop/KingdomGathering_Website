// Admin Blogs Management - Premium UI

const blogsSearch = document.getElementById('blogsSearch');
const blogsStatusFilter = document.getElementById('blogsStatusFilter');
const blogsTableBody = document.getElementById('blogsTableBody');
const blogsAlertContainer = document.getElementById('blogsAlertContainer');
const createBlogBtn = document.getElementById('createBlogBtn');
const refreshBtn = document.getElementById('refreshBtn');
const adminUserEmail = document.getElementById('adminUserEmail');
const logoutButton = document.getElementById('logoutButton');
const sidebarLogout = document.getElementById('sidebarLogout');
const paginationContainer = document.getElementById('paginationContainer');

const totalPostsEl = document.getElementById('totalPosts');
const publishedPostsEl = document.getElementById('publishedPosts');
const draftPostsEl = document.getElementById('draftPosts');
const archivedPostsEl = document.getElementById('archivedPosts');

let blogs = [];
let editingBlog = null;
let currentPage = 1;
const itemsPerPage = 10;
let loading = false;

async function protectPage() {
    return await checkPagePermission('blogs');
}

function showAlert(type, message, timeout = 4000) {
    const el = document.createElement('div');
    el.className = `alert alert-${type} alert-dismissible fade show`;
    el.role = 'alert';
    el.innerHTML = `${message} <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>`;
    blogsAlertContainer.appendChild(el);
    if (timeout) setTimeout(() => { el.classList.remove('show'); el.remove(); }, timeout);
}

function generateSlug(title) {
    return title
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-');
}

async function ensureUniqueSlug(slug, currentId = null) {
    const baseSlug = slug;
    let uniqueSlug = baseSlug;
    let counter = 1;

    while (true) {
        const { data, error } = await supabaseClient
            .from('blogs')
            .select('id')
            .eq('slug', uniqueSlug);

        if (error) {
            console.error('Slug uniqueness check failed:', error);
            return uniqueSlug;
        }

        const exists = (data || []).some(item => String(item.id) !== String(currentId));
        if (!exists) {
            return uniqueSlug;
        }

        uniqueSlug = `${baseSlug}-${counter}`;
        counter += 1;
    }
}

async function loadBlogs() {
    loading = true;
    blogsTableBody.innerHTML = '<tr><td colspan="5" class="text-center py-4">Loading...</td></tr>';
    try {
        console.log("=== loadBlogs START ===");
        console.log("Operation: fetch ALL blogs for admin management");
        console.log("Payload: select * from blogs order by published_at desc (NO status filter - fetch all for statistics)");

        const { data, error } = await supabaseClient
            .from('blogs')
            .select('*')
            .order('published_at', { ascending: false });

        console.log('Response (blogs query - all posts):', data);
        console.log('Error (blogs query):', error);
        console.log('Total blogs fetched:', data ? data.length : 0);
        console.log('Blog statuses breakdown:');
        if (data) {
            const byStatus = {};
            data.forEach(b => {
                const status = (b.status || 'draft').toLowerCase();
                byStatus[status] = (byStatus[status] || 0) + 1;
            });
            console.log(byStatus);
        }

        if (error) {
            console.error('Blog load failed:', error);
            showAlert('danger', 'Unable to load blogs.');
            blogsTableBody.innerHTML = '<tr><td colspan="5" class="text-center py-4 text-danger">Unable to load blog posts.</td></tr>';
            paginationContainer.innerHTML = '';
            return;
        }

        blogs = data || [];
        console.log("=== loadBlogs SUCCESS ===");
        console.log("Loaded", blogs.length, "blog posts total");
        updateStatistics();
        renderPaginatedTable();
    } catch (err) {
        console.error('Blog load failed:', err);
        showAlert('danger', 'Unable to load blogs.');
        blogsTableBody.innerHTML = '<tr><td colspan="5" class="text-center py-4 text-danger">An unexpected error occurred.</td></tr>';
        paginationContainer.innerHTML = '';
    } finally {
        loading = false;
    }
}

function updateStatistics() {
    const total = blogs.length;
    const published = blogs.filter(b => (b.status || '').toLowerCase() === 'published').length;
    const draft = blogs.filter(b => (b.status || '').toLowerCase() === 'draft').length;
    const archived = blogs.filter(b => (b.status || '').toLowerCase() === 'archived').length;
    
    console.log("=== Statistics Update ===");
    console.log("Total:", total);
    console.log("Published:", published);
    console.log("Draft:", draft);
    console.log("Archived:", archived);
    console.log("Breakdown from", blogs.length, "posts loaded");
    blogs.forEach(b => console.log(`  - "${b.title}": status="${b.status}"`));
    
    animateCount(totalPostsEl, total);
    animateCount(publishedPostsEl, published);
    animateCount(draftPostsEl, draft);
    animateCount(archivedPostsEl, archived);
}

function animateCount(element, targetValue) {
    const duration = 600;
    const interval = 30;
    const steps = Math.ceil(duration / interval);
    let currentStep = 0;
    const increment = targetValue / steps;

    element.textContent = '0';
    const timer = setInterval(() => {
        currentStep += 1;
        const value = Math.min(Math.round(increment * currentStep), targetValue);
        element.textContent = value.toLocaleString();

        if (value >= targetValue) {
            clearInterval(timer);
            element.textContent = targetValue.toLocaleString();
        }
    }, interval);
}

function renderPaginatedTable() {
    const filtered = getFilteredBlogs();
    const paginated = paginateArray(filtered, currentPage, itemsPerPage);
    
    if (filtered.length === 0) {
        renderEmptyState(blogsTableBody.parentElement, 'No blog posts found', 'Try adjusting your search filters');
        paginationContainer.innerHTML = '';
        return;
    }
    
    renderTable(paginated.data);
    renderPaginationControls(paginationContainer, paginated.currentPage, paginated.totalPages, changePage);
}

function getFilteredBlogs() {
    const q = (blogsSearch.value || '').trim().toLowerCase();
    const status = (blogsStatusFilter.value || '').toLowerCase();

    return blogs.filter(b => {
        const matchesQuery = !q || ((b.title || '').toLowerCase().includes(q) || (b.slug || '').toLowerCase().includes(q) || (b.excerpt || '').toLowerCase().includes(q));
        const matchesStatus = !status || ((b.status || '').toLowerCase() === status);
        return matchesQuery && matchesStatus;
    });
}

function changePage(pageNum) {
    currentPage = pageNum;
    renderPaginatedTable();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function renderTable(list) {
    if (!list.length) {
        blogsTableBody.innerHTML = '<tr><td colspan="5" class="text-center py-4">No blog posts found.</td></tr>';
        return;
    }

    blogsTableBody.innerHTML = list.map(item => `
        <tr data-id="${item.id}">
            <td>
                <strong>${escapeHtml(item.title || '')}</strong>
            </td>
            <td>${renderStatusBadge(item.status || 'Draft')}</td>
            <td style="font-size: 0.9rem;">${formatDate(item.published_at) || '—'}</td>
            <td style="font-size: 0.9rem;">${formatDate(item.created_at)}</td>
            <td class="text-end">
                <div class="table-actions">
                    <button class="btn btn-sm btn-outline-light edit-btn" title="Edit" data-id="${item.id}">✏️</button>
                    <button class="btn btn-sm btn-outline-danger delete-btn" title="Delete" data-id="${item.id}">🗑️</button>
                </div>
            </td>
        </tr>
    `).join('');

    attachTableEventListeners();
}

function attachTableEventListeners() {
    document.querySelectorAll('.edit-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = e.target.getAttribute('data-id');
            const blog = blogs.find(b => String(b.id) === String(id));
            if (blog) openBlogModal(blog);
        });
    });

    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const id = e.target.getAttribute('data-id');
            const blog = blogs.find(b => String(b.id) === String(id));
            if (blog && await confirmAction(`Delete blog post "${escapeHtml(blog.title)}"?`)) {
                await deleteBlog(blog.id);
            }
        });
    });
}

function openBlogModal(blog = null) {
    editingBlog = blog;
    
    if (blog) {
        document.getElementById('blogTitle').value = blog.title || '';
        document.getElementById('blogSlug').value = blog.slug || '';
        document.getElementById('blogExcerpt').value = blog.excerpt || '';
        document.getElementById('blogContent').value = blog.content || '';
        document.getElementById('blogImage').value = blog.featured_image_path || '';
        document.getElementById('blogTags').value = (Array.isArray(blog.tags) ? blog.tags.join(', ') : blog.tags) || '';
        document.getElementById('blogStatus').value = (blog.status || 'draft').toLowerCase();
        document.getElementById('blogDelete').classList.remove('d-none');
    } else {
        document.getElementById('blogForm').reset();
        document.getElementById('blogSlug').value = '';
        document.getElementById('blogStatus').value = 'Draft';
        document.getElementById('blogDelete').classList.add('d-none');
    }

    const modal = new bootstrap.Modal(document.getElementById('blogModal'));
    modal.show();
}

async function saveBlog() {
    const title = document.getElementById('blogTitle').value.trim();
    if (!title) {
        showAlert('warning', 'Title is required.');
        return;
    }

    const rawSlug = document.getElementById('blogSlug').value.trim();
    const excerpt = document.getElementById('blogExcerpt').value.trim();
    const content = document.getElementById('blogContent').value.trim();
    const image = document.getElementById('blogImage').value.trim();
    const tags = document.getElementById('blogTags').value.trim() ? document.getElementById('blogTags').value.split(',').map(t => t.trim()) : [];
    const status = document.getElementById('blogStatus').value.toLowerCase();
    const publishedAt = status === 'published' ? new Date().toISOString() : null;

    const computedSlug = rawSlug || generateSlug(title);
    const slug = await ensureUniqueSlug(computedSlug, editingBlog?.id);
    if (slug !== computedSlug) {
        console.log('Slug adjusted to avoid duplicate:', slug);
    }

    const payload = {
        title,
        slug,
        excerpt,
        content,
        featured_image_path: image,
        tags,
        status,
        published_at: publishedAt
    };

    try {
        console.log('Operation: save blog post');
        console.log('Payload:', payload);
        let result;
        if (editingBlog) {
            const { data, error } = await supabaseClient
                .from('blogs')
                .update(payload)
                .eq('id', editingBlog.id)
                .select();
            result = { data, error };
            console.log('Response (updateBlog):', data);
            console.log('Error (updateBlog):', error);
        } else {
            const { data, error } = await supabaseClient
                .from('blogs')
                .insert([payload])
                .select();
            result = { data, error };
            console.log('Response (insertBlog):', data);
            console.log('Error (insertBlog):', error);
        }

        if (result.error) {
            console.error(result.error);
            showAlert('danger', `Unable to save blog (${result.error.message}).`);
            return;
        }

        await loadBlogs();
        const modal = bootstrap.Modal.getInstance(document.getElementById('blogModal'));
        modal.hide();
        showAlert('success', editingBlog ? 'Blog updated.' : 'Blog created.');
    } catch (err) {
        console.error(err);
        showAlert('danger', 'Unable to save blog.');
    }
}

async function deleteBlog(id) {
    try {
        console.log('Operation: delete blog post');
        console.log('Payload: id =', id);
        const { data, error } = await supabaseClient
            .from('blogs')
            .delete()
            .eq('id', id)
            .select();

        console.log('Response (deleteBlog):', data);
        console.log('Error (deleteBlog):', error);

        if (error) {
            console.error(error);
            showAlert('danger', `Unable to delete blog (${error.message}).`);
            return;
        }

        blogs = blogs.filter(b => b.id !== id);
        updateStatistics();
        renderPaginatedTable();
        showAlert('success', 'Blog deleted.');
    } catch (err) {
        console.error(err);
        showAlert('danger', 'Unable to delete blog.');
    }
}

// Event Listeners
document.getElementById('blogTitle')?.addEventListener('input', (e) => {
    document.getElementById('blogSlug').value = generateSlug(e.target.value);
});

document.getElementById('blogSave')?.addEventListener('click', saveBlog);
document.getElementById('blogDelete')?.addEventListener('click', async () => {
    if (editingBlog && await confirmAction('Delete this blog post permanently?')) {
        await deleteBlog(editingBlog.id);
        const modal = bootstrap.Modal.getInstance(document.getElementById('blogModal'));
        modal.hide();
    }
});

createBlogBtn?.addEventListener('click', () => openBlogModal());
blogsSearch?.addEventListener('input', () => { currentPage = 1; renderPaginatedTable(); });
blogsStatusFilter?.addEventListener('change', () => { currentPage = 1; renderPaginatedTable(); });
refreshBtn?.addEventListener('click', () => loadBlogs());

const signOutAndRedirect = async () => { await supabaseClient.auth.signOut(); window.location.href = './login.html'; };
logoutButton?.addEventListener('click', signOutAndRedirect);
sidebarLogout?.addEventListener('click', async (event) => { event.preventDefault(); await signOutAndRedirect(); });

(async function init() {
    const session = await protectPage();
    if (!session) return;
    adminUserEmail.textContent = session.user.email || 'Admin';
    await loadBlogs();
})();
