const sharedBlogData = {
    posts: null,
    loaded: false,
    error: null,
};

const blogContainer = document.getElementById("blogCards");
const resourceContainer = document.getElementById("resourceCards");
const blogEmptyState = document.getElementById("blogEmptyState");
const resourceEmptyState = document.getElementById("resourceEmptyState");

function formatPublishedDate(dateString) {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
    });
}

function getAuthorDisplayName(post) {
    const authorName = String(post?.author_name || '').trim();
    return authorName || 'Kingdom Gathering Church';
}

function createSkeletonCard() {
    const wrapper = document.createElement("div");
    wrapper.className = "col-lg-4 col-md-6";
    wrapper.innerHTML = `
        <div class="card h-100 border-0 shadow-lg skeleton-card">
            <div class="skeleton-block skeleton-image"></div>
            <div class="card-body">
                <div class="skeleton-block skeleton-line short"></div>
                <div class="skeleton-block skeleton-line medium"></div>
                <div class="skeleton-block skeleton-line full"></div>
                <div class="skeleton-block skeleton-line full"></div>
                <div class="skeleton-block skeleton-line short"></div>
            </div>
        </div>
    `;
    return wrapper;
}

function renderBlogCard(post) {
    const imageUrl = post.featured_image_path || "../images/logo.png";
    const excerpt = post.excerpt || (post.content ? `${post.content.slice(0, 120)}...` : "No description available.");
    const category = post.category || "Church Insight";
    const publishedDate = formatPublishedDate(post.published_at || post.created_at);

    const card = document.createElement("div");
    card.className = "col-lg-4 col-md-6";
    card.innerHTML = `
        <div class="card h-100 border-0 shadow-lg">
            <img src="${imageUrl}" class="card-img-top" alt="${post.title}" style="height: 250px; object-fit: cover;" onerror="this.src='../images/logo.png'">
            <div class="card-body d-flex flex-column">
                <div class="mb-3">
                    <span class="badge bg-gold text-dark">${category}</span>
                    <span class="text-muted ms-2"><i class="fas fa-calendar-alt"></i> ${publishedDate}</span>
                </div>
                <h5 class="card-title fw-bold">${post.title}</h5>
                <p class="card-text text-muted small mb-3">By ${getAuthorDisplayName(post)}</p>
                <p class="card-text text-muted">${excerpt}</p>
                <a href="/blogs/${encodeURIComponent(post.slug)}" class="btn btn-outline-gold mt-auto">Read More</a>
            </div>
        </div>
    `;
    return card;
}

function renderResourceCard(post) {
    const imageUrl = post.featured_image_path || "../images/logo.png";
    const excerpt = post.excerpt || (post.content ? `${post.content.slice(0, 120)}...` : "No description available.");
    const category = post.category || "Resource";
    const publishedDate = formatPublishedDate(post.published_at || post.created_at);

    const card = document.createElement("div");
    card.className = "col-lg-4 col-md-6";
    card.innerHTML = `
        <div class="card h-100 border-0 shadow-lg">
            <img src="${imageUrl}" class="card-img-top" alt="${post.title}" style="height: 250px; object-fit: cover;" onerror="this.src='../images/logo.png'">
            <div class="card-body d-flex flex-column">
                <div class="mb-3">
                    <span class="badge bg-gold text-dark">${category}</span>
                    <span class="text-muted ms-2"><i class="fas fa-calendar-alt"></i> ${publishedDate}</span>
                </div>
                <h5 class="card-title fw-bold">${post.title}</h5>
                <p class="card-text text-muted small mb-3">By ${getAuthorDisplayName(post)}</p>
                <p class="card-text text-muted">${excerpt}</p>
                <a href="/blogs/${encodeURIComponent(post.slug)}" class="btn btn-outline-gold mt-auto">Read More</a>
            </div>
        </div>
    `;
    return card;
}

function showEmptyState(container, emptyState) {
    if (container && emptyState) {
        container.classList.add("d-none");
        emptyState.classList.remove("d-none");
    }
}

function hideEmptyState(container, emptyState) {
    if (container && emptyState) {
        container.classList.remove("d-none");
        emptyState.classList.add("d-none");
    }
}

function clearContainer(container) {
    if (container) {
        container.innerHTML = "";
    }
}

function renderPage(posts) {
    if (blogContainer) {
        clearContainer(blogContainer);
        if (!posts || posts.length === 0) {
            showEmptyState(blogContainer, blogEmptyState);
            return;
        }
        hideEmptyState(blogContainer, blogEmptyState);
        posts.forEach(post => blogContainer.appendChild(renderBlogCard(post)));
    }

    if (resourceContainer) {
        clearContainer(resourceContainer);
        if (!posts || posts.length === 0) {
            showEmptyState(resourceContainer, resourceEmptyState);
            return;
        }
        hideEmptyState(resourceContainer, resourceEmptyState);
        posts.forEach(post => resourceContainer.appendChild(renderResourceCard(post)));
    }
}

function showLoadingSkeletons() {
    if (blogContainer) {
        clearContainer(blogContainer);
        for (let i = 0; i < 6; i += 1) {
            blogContainer.appendChild(createSkeletonCard());
        }
    }

    if (resourceContainer) {
        clearContainer(resourceContainer);
        for (let i = 0; i < 6; i += 1) {
            resourceContainer.appendChild(createSkeletonCard());
        }
    }
}

async function fetchPublishedBlogs() {
    if (sharedBlogData.loaded) return sharedBlogData.posts;
    showLoadingSkeletons();

    try {
        console.log("=== fetchPublishedBlogs START ===");
        console.log("Operation: fetch published blogs for public display");
        console.log("Query: select * from blogs order by published_at desc");

        const { data, error } = await supabaseClient
            .from('blogs')
            .select('id,title,slug,excerpt,content,featured_image_path,published_at,created_at,status,category,author_name')
            .order('published_at', { ascending: false });

        console.log("[blogs] raw blogs:", data);
        console.log("Error (fetchPublishedBlogs):", error);
        console.log("All blogs count:", data ? data.length : 0);

        const publishedBlogs = (data || []).filter(blog => {
            const status = String(blog.status || '').toLowerCase().trim();
            return status === 'published';
        });

        console.log("[blogs] filtered published blogs:", publishedBlogs);
        console.log("Published blogs count:", publishedBlogs.length);
        if (publishedBlogs.length > 0) {
            console.log("Published blog titles:", publishedBlogs.map(b => b.title));
        }

        if (error) {
            sharedBlogData.error = error;
            console.error("Supabase blog fetch error:", error);
            return [];
        }

        publishedBlogs.sort((a, b) => {
            const aDate = new Date(a.published_at || a.created_at || 0).getTime();
            const bDate = new Date(b.published_at || b.created_at || 0).getTime();
            return bDate - aDate;
        });

        sharedBlogData.posts = publishedBlogs;
        sharedBlogData.loaded = true;
        console.log("=== fetchPublishedBlogs SUCCESS ===");
        return sharedBlogData.posts;
    } catch (error) {
        sharedBlogData.error = error;
        console.error("Blog fetch exception:", error);
        return [];
    }
}

async function initializePublicBlogs() {
    if (!blogContainer && !resourceContainer) return;
    const posts = await fetchPublishedBlogs();
    renderPage(posts);
}

initializePublicBlogs();
