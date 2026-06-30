// Blog Social Sharing Utility

const DOMAIN = typeof window !== 'undefined' ? window.location.origin : 'https://kingdomgatheringchurch.org';

// Helper: Generate social sharing metadata for a blog post
function generateBlogMetadata(blog) {
    const excerpt = blog.excerpt || extractFirstParagraph(blog.content, 160);
    let url = `${DOMAIN}/blogs/${encodeURIComponent(blog.slug || '')}`;
    if (!blog.slug) {
        url = `${DOMAIN}/blog/post.html?slug=${encodeURIComponent(blog.slug || '')}`;
    }

    let image = blog.featured_image_path || '/images/logo.png';
    if (image && !image.startsWith('http')) {
        image = `${DOMAIN}${image.startsWith('/') ? '' : '/'}${image}`;
    }

    return {
        title: blog.title || 'Kingdom Gathering Church Blog',
        description: excerpt,
        url,
        image,
        slug: blog.slug
    };
}

// Helper: Extract first N characters from content (strip HTML)
function extractFirstParagraph(content, maxChars = 160) {
    if (!content) return 'Discover insights from Kingdom Gathering Church.';
    
    const stripped = content
        .replace(/<[^>]*>/g, '')
        .replace(/&nbsp;/g, ' ')
        .trim();
    
    if (stripped.length > maxChars) {
        return stripped.substring(0, maxChars).trim() + '...';
    }
    return stripped;
}

// Create toast notifications for share interactions
function showShareToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `alert alert-${type} alert-dismissible fade show`;
    toast.style.position = 'fixed';
    toast.style.bottom = '20px';
    toast.style.right = '20px';
    toast.style.zIndex = '1055';
    toast.style.minWidth = '260px';
    toast.innerHTML = `${message} <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>`;
    document.body.appendChild(toast);
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Share to Facebook
function shareFacebook(metadata) {
    const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(metadata.url)}&quote=${encodeURIComponent(metadata.title)}`;
    window.open(url, '_blank', 'width=600,height=400');
}

// Share to WhatsApp
function shareWhatsApp(metadata) {
    const text = `${metadata.title} - ${metadata.url}`;
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
}

// Share to X (Twitter)
function shareX(metadata) {
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(metadata.title)}&url=${encodeURIComponent(metadata.url)}&via=KGChurchBW`;
    window.open(url, '_blank', 'width=600,height=400');
}

// Share to LinkedIn
function shareLinkedIn(metadata) {
    const url = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(metadata.url)}`;
    window.open(url, '_blank', 'width=600,height=400');
}

// Share to Telegram
function shareTelegram(metadata) {
    const url = `https://t.me/share/url?url=${encodeURIComponent(metadata.url)}&text=${encodeURIComponent(metadata.title)}`;
    window.open(url, '_blank');
}

// Share via Email
function shareEmail(metadata) {
    const subject = encodeURIComponent(metadata.title);
    const body = encodeURIComponent(`${metadata.title}\n\n${metadata.description}\n\nRead more: ${metadata.url}`);
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
}

// Copy link to clipboard
async function copyBlogLink(url) {
    try {
        await navigator.clipboard.writeText(url);
        showShareToast('Blog link copied successfully.', 'success');
        return { success: true, message: 'Blog link copied successfully.' };
    } catch (err) {
        console.error('Copy failed:', err);
        showShareToast('Unable to copy link. Please try again.', 'danger');
        return { success: false, message: 'Unable to copy link. Please try again.' };
    }
}

// Try to use Web Share API first, fallback to native sharing
async function nativeShare(metadata) {
    if (!navigator.share) {
        return false; // Not supported, caller should fallback to modal
    }

    try {
        await navigator.share({
            title: metadata.title,
            text: metadata.description,
            url: metadata.url
        });
        return true;
    } catch (err) {
        if (err.name !== 'AbortError') {
            console.error('Share failed:', err);
        }
        return false;
    }
}

// Create and show share modal
function createShareModal() {
    const modal = document.createElement('div');
    modal.className = 'modal fade';
    modal.id = 'blogShareModal';
    modal.tabIndex = -1;
    modal.setAttribute('aria-labelledby', 'blogShareModalLabel');
    modal.setAttribute('aria-hidden', 'true');
    
    modal.innerHTML = `
        <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content bg-modal border-0">
                <div class="modal-header border-0 pb-0">
                    <h5 class="modal-title" id="blogShareModalLabel">Share This Article</h5>
                    <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body pt-2">
                    <div class="row g-2">
                        <div class="col-12 col-sm-6">
                            <button class="btn btn-outline-light w-100 text-start" data-platform="facebook" title="Share on Facebook">
                                <i class="fab fa-facebook me-2"></i> Facebook
                            </button>
                        </div>
                        <div class="col-12 col-sm-6">
                            <button class="btn btn-outline-light w-100 text-start" data-platform="whatsapp" title="Share on WhatsApp">
                                <i class="fab fa-whatsapp me-2"></i> WhatsApp
                            </button>
                        </div>
                        <div class="col-12 col-sm-6">
                            <button class="btn btn-outline-light w-100 text-start" data-platform="x" title="Share on X">
                                <i class="fab fa-twitter me-2"></i> X
                            </button>
                        </div>
                        <div class="col-12 col-sm-6">
                            <button class="btn btn-outline-light w-100 text-start" data-platform="linkedin" title="Share on LinkedIn">
                                <i class="fab fa-linkedin me-2"></i> LinkedIn
                            </button>
                        </div>
                        <div class="col-12 col-sm-6">
                            <button class="btn btn-outline-light w-100 text-start" data-platform="telegram" title="Share on Telegram">
                                <i class="fab fa-telegram me-2"></i> Telegram
                            </button>
                        </div>
                        <div class="col-12 col-sm-6">
                            <button class="btn btn-outline-light w-100 text-start" data-platform="email" title="Share via Email">
                                <i class="fas fa-envelope me-2"></i> Email
                            </button>
                        </div>
                    </div>
                    <hr class="my-3">
                    <div class="share-link-section">
                        <label class="form-label small text-muted">Copy Link</label>
                        <div class="input-group input-group-sm">
                            <input type="text" class="form-control bg-dark text-light border-secondary" id="shareLinkInput" readonly>
                            <button class="btn btn-outline-light" type="button" id="shareModalCopyBtn">
                                <i class="fas fa-copy"></i> Copy
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    return new bootstrap.Modal(modal);
}

// Initialize share modal and attach event handlers
function initBlogShareModal(blog) {
    const metadata = generateBlogMetadata(blog);
    
    // Check if modal already exists
    let modalEl = document.getElementById('blogShareModal');
    let modalInstance;
    if (!modalEl) {
        modalInstance = createShareModal();
        modalEl = modalInstance._element;
    } else {
        modalInstance = new bootstrap.Modal(modalEl);
    }
    
    // Populate link input
    const linkInput = document.getElementById('shareLinkInput');
    if (linkInput) {
        linkInput.value = metadata.url;
    }
    
    // Attach click handlers to share buttons
    const shareButtons = document.querySelectorAll('[data-platform]');
    shareButtons.forEach(btn => {
        btn.onclick = async (e) => {
            e.preventDefault();
            const platform = btn.getAttribute('data-platform');
            
            switch (platform) {
                case 'facebook':
                    shareFacebook(metadata);
                    break;
                case 'whatsapp':
                    shareWhatsApp(metadata);
                    break;
                case 'x':
                    shareX(metadata);
                    break;
                case 'linkedin':
                    shareLinkedIn(metadata);
                    break;
                case 'telegram':
                    shareTelegram(metadata);
                    break;
                case 'email':
                    shareEmail(metadata);
                    break;
            }
        };
    });
    
    // Copy link button in modal
    const copyBtn = document.getElementById('shareModalCopyBtn');
    if (copyBtn) {
        copyBtn.onclick = async (e) => {
            e.preventDefault();
            await copyBlogLink(metadata.url);
            
            const originalText = copyBtn.innerHTML;
            copyBtn.innerHTML = '✓ Copied';
            copyBtn.disabled = true;
            
            setTimeout(() => {
                copyBtn.innerHTML = originalText;
                copyBtn.disabled = false;
            }, 2000);
        };
    }
    
    return modalInstance;
}
