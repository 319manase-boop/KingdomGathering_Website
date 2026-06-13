function getQueryParam(name) {
    const params = new URLSearchParams(window.location.search);
    return params.get(name);
}

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

    if (titleEl) titleEl.textContent = post.title || "Untitled Article";
    if (imageEl) {
        imageEl.src = post.featured_image_path || "../images/logo.png";
        imageEl.alt = post.title || "Blog post image";
    }
    if (dateEl) {
        const publishedDate = new Date(post.published_at).toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
        });
        dateEl.textContent = ` ${publishedDate}`;
    }
    if (categoryEl) categoryEl.textContent = post.category || "Kingdom Insight";
    if (bodyEl) bodyEl.textContent = post.content || "This post has no content yet.";
}

async function loadBlogPost() {
    const slug = getQueryParam("slug");
    if (!slug) {
        showPostError("Missing blog reference. Please open this post from the Blog or Resources page.");
        return;
    }

    try {
        const { data, error } = await supabaseClient
            .from("blogs")
            .select("title,slug,content,featured_image_path,category,published_at,status")
            .eq("slug", slug)
            .eq("status", "published")
            .limit(1)
            .single();

        if (error || !data) {
            showPostError("This blog post could not be loaded. It may no longer be published.");
            console.error(error);
            return;
        }

        renderPost(data);
    } catch (exception) {
        console.error(exception);
        showPostError("An unexpected error occurred while loading this post.");
    }
}

loadBlogPost();
