// Helper: Get query parameter
function getQueryParam(name) {
    const params = new URLSearchParams(window.location.search);
    return params.get(name);
}

// Helper: Show post error message
function showPostError(message) {
    const errorElement = document.getElementById("postError");
    const articleElement = document.getElementById("postArticle");
    const loader = document.getElementById("postLoader");

    if (loader) loader.classList.add("d-none");
    if (articleElement) articleElement.classList.add("d-none");
    if (errorElement) {
        errorElement.textContent = message;
        errorElement.classList.remove("d-none");
    }
}

// Helper: Update page meta tags for social sharing (SEO)
function updatePageMetadata(post) {
    const metadata = generateBlogMetadata(post);
    
    // Page Title & Meta Description
    document.title = `${post.title} | Kingdom Gathering Church`;
    
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) metaDescription.setAttribute('content', metadata.description);
    
    // Canonical URL
    const canonical = document.querySelector('link[rel="canonical"]');
    if (canonical) canonical.setAttribute('href', metadata.url);
    
    // Open Graph Tags
    document.querySelector('meta[property="og:title"]').setAttribute('content', metadata.title);
    document.querySelector('meta[property="og:description"]').setAttribute('content', metadata.description);
    document.querySelector('meta[property="og:image"]').setAttribute('content', metadata.image);
    document.querySelector('meta[property="og:url"]').setAttribute('content', metadata.url);
    
    // Twitter/X Tags
    document.querySelector('meta[name="twitter:title"]').setAttribute('content', metadata.title);
    document.querySelector('meta[name="twitter:description"]').setAttribute('content', metadata.description);
    document.querySelector('meta[name="twitter:image"]').setAttribute('content', metadata.image);
}

// Render blog post content
function renderPost(post) {
    const titleEl = document.getElementById("postTitle");
    const imageEl = document.getElementById("postImage");
    const dateEl = document.getElementById("postDate");
    const categoryEl = document.getElementById("postCategory");
    const bodyEl = document.getElementById("postBody");
    const loader = document.getElementById("postLoader");
    const articleElement = document.getElementById("postArticle");

    if (loader) loader.classList.add("d-none");
    if (articleElement) articleElement.classList.remove("d-none");

    // Populate content
    if (titleEl) titleEl.textContent = post.title || "Untitled Article";
    if (imageEl) {
        imageEl.src = post.featured_image_path || "../images/logo.png";
        imageEl.alt = post.title || "Blog post image";
    }
    if (dateEl) {
        const publishedDate = new Date(post.published_at || post.created_at).toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
        });
        dateEl.textContent = ` ${publishedDate}`;
    }
    if (categoryEl) categoryEl.textContent = post.category || "Kingdom Insight";
    if (bodyEl) bodyEl.textContent = post.content || "This post has no content yet.";
    
    // Update page metadata for social sharing
    updatePageMetadata(post);
    
    // Initialize share modal
    const shareModal = initBlogShareModal(post);
    
    // Attach share button event listeners
    const shareBlogBtn = document.getElementById('shareBlogBtn');
    if (shareBlogBtn) {
        shareBlogBtn.addEventListener('click', async () => {
            // Try Web Share API first
            const metadata = generateBlogMetadata(post);
            const shared = await nativeShare(metadata);
            if (!shared) {
                // Fallback to modal
                shareModal.show();
            }
        });
    }
    
    // Attach copy link button
    const copyLinkBtn = document.getElementById('copyLinkBtn');
    if (copyLinkBtn) {
        copyLinkBtn.addEventListener('click', async () => {
            const metadata = generateBlogMetadata(post);
            const result = await copyBlogLink(metadata.url);
            
            // Show toast-like feedback
            const originalHtml = copyLinkBtn.innerHTML;
            copyLinkBtn.innerHTML = '<i class="fas fa-check"></i> Copied';
            copyLinkBtn.disabled = true;
            
            setTimeout(() => {
                copyLinkBtn.innerHTML = originalHtml;
                copyLinkBtn.disabled = false;
            }, 2000);
        });
    }
}

function getBlogSlugFromLocation() {
    const path = window.location.pathname.replace(/\/+$/, '');
    const segments = path.split('/').filter(Boolean);
    if (segments.length >= 2 && segments[0].toLowerCase() === 'blogs') {
        return decodeURIComponent(segments.slice(1).join('/'));
    }
    return getQueryParam('slug');
}

// Load and display blog post by slug or friendly blog path
async function loadBlogPost() {
    console.log("pathname:", window.location.pathname);
console.log("href:", window.location.href);
console.log("slug:", getBlogSlugFromLocation());
    const slug = getBlogSlugFromLocation();
    if (!slug) {
        showPostError("Missing blog reference. Please open this post from the Blog or Resources page.");
        return;
    }

    try {
        console.log("=== loadBlogPost START ===");
        console.log("Operation: load published blog post by slug");
        console.log("Slug:", slug);
        console.log("Query: select * from blogs where slug = ? limit 1");

        const { data, error } = await supabaseClient
            .from("blogs")
            .select("*")
            .eq("slug", slug)
            .order("published_at", { ascending: false })
            .limit(1)
            .single();

        console.log("Response (loadBlogPost):", data);
        console.log("Error (loadBlogPost):", error);

        if (error || !data) {
            showPostError("This blog post could not be loaded. It may no longer be published.");
            console.error("Blog post load failed:", error);
            console.log("=== loadBlogPost FAILED ===");
            return;
        }

        const status = String(data.status || '').toLowerCase().trim();
        if (status !== 'published') {
            showPostError("This blog post could not be loaded. It may no longer be published.");
            console.error("Blog post not published:", data.status);
            console.log("=== loadBlogPost FAILED ===");
            return;
        }

        console.log("=== loadBlogPost SUCCESS ===");
        console.log("Loaded post:", data.title);
        renderPost(data);
    } catch (exception) {
        console.error(exception);
        showPostError("An unexpected error occurred while loading this post.");
    }
}

// Initialize when DOM is ready
loadBlogPost();
