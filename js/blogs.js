const blogForm = document.getElementById("blogForm");

function createSlug(title) {
    return title
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
}

if (blogForm) {
    blogForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        const titleInput = document.getElementById("title");
        const excerptInput = document.getElementById("excerpt");
        const contentInput = document.getElementById("content");
        const imageInput = document.getElementById("imageUrl");

        const title = titleInput ? titleInput.value : "";
        const excerpt = excerptInput ? excerptInput.value : "";
        const content = contentInput ? contentInput.value : "";
        const imageUrl = imageInput ? imageInput.value : "";

        const { error } = await supabaseClient
            .from("blogs")
            .insert([
                {
                    title: title,
                    slug: createSlug(title),
                    excerpt: excerpt,
                    content: content,
                    featured_image_path: imageUrl,
                    status: "published",
                    published_at: new Date().toISOString()
                }
            ]);

        if (error) {
            console.error(error);
            alert("Failed to publish blog.");
            return;
        }

        alert("Blog published successfully!");
        blogForm.reset();
    });
}