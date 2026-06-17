const homepageFeaturedEvents = document.getElementById('homepageFeaturedEvents');
const homepageFeaturedEventsEmpty = document.getElementById('homepageFeaturedEventsEmpty');
const homepageFeaturedEventsError = document.getElementById('homepageFeaturedEventsError');
const homepageFeaturedEventsRetry = document.getElementById('homepageFeaturedEventsRetry');
const homepageBlogCards = document.getElementById('homepageBlogCards');
const homepageBlogEmptyState = document.getElementById('homepageBlogEmptyState');
const homepageGalleryGrid = document.getElementById('homepageGalleryGrid');
const homepageGalleryEmptyState = document.getElementById('homepageGalleryEmptyState');

function formatEventDate(dateString) {
    if (!dateString) return 'Date TBC';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    });
}

function formatEventTime(dateString) {
    if (!dateString) return 'Time TBC';
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
    });
}

function formatPublishedDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    });
}

function getPublicURL(bucket, path) {
    if (!bucket || !path) return '';
    const { data, error } = supabaseClient.storage.from(bucket).getPublicUrl(path);
    if (error) {
        console.warn('[homeDynamic] getPublicURL error:', error);
        return '';
    }
    return data?.publicUrl || '';
}

function getEventUrl(event) {
    return event?.slug ? `events/?slug=${encodeURIComponent(event.slug)}` : 'events/';
}

function renderFeaturedEvents(events) {
    if (!homepageFeaturedEvents) return;

    homepageFeaturedEvents.innerHTML = '';
    homepageFeaturedEventsEmpty?.classList.add('d-none');
    homepageFeaturedEventsError?.classList.add('d-none');

    if (!events || events.length === 0) {
        homepageFeaturedEventsEmpty?.classList.remove('d-none');
        return;
    }

    const [event] = events.slice(0, 1);
    const eventLocation = event.location || event.branches?.name || 'Kingdom Gathering';
    const eventUrl = getEventUrl(event);
    const dateRange = formatEventDate(event.start_at);

    homepageFeaturedEvents.innerHTML = `
        <div class="col-12">
            <div class="featured-event-card bg-black text-white rounded-4 shadow-lg border border-gold p-5">
                <div class="card-body p-0">
                    <span class="badge badge-gold mb-3">Featured</span>
                    <h3 class="text-white mb-3">${event.title || 'Upcoming Event'}</h3>
                    <p class="text-gold mb-2">${dateRange}</p>
                    <p class="text-muted mb-4"><strong>Location:</strong> ${eventLocation}</p>
                    <p class="text-white mb-4 event-card-description">${event.short_description || 'Join us for worship, teaching, and community at Kingdom Gathering.'}</p>
                    <div class="d-flex flex-column flex-sm-row gap-3">
                        <a href="${eventUrl}" class="btn btn-gold">View Event</a>
                        <a href="events/" class="btn btn-outline-gold">View More Events</a>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function renderFeaturedEventsError() {
    homepageFeaturedEvents?.classList.add('d-none');
    homepageFeaturedEventsEmpty?.classList.add('d-none');
    homepageFeaturedEventsError?.classList.remove('d-none');
}

function renderFeaturedEventsLoading() {
    if (!homepageFeaturedEvents) return;

    homepageFeaturedEventsEmpty?.classList.add('d-none');
    homepageFeaturedEventsError?.classList.add('d-none');
    homepageFeaturedEvents.classList.remove('d-none');

    homepageFeaturedEvents.innerHTML = '';
    for (let i = 0; i < 2; i += 1) {
        homepageFeaturedEvents.innerHTML += `
            <div class="col-lg-6">
                <div class="featured-event-card featured-event-skeleton rounded-4 shadow-lg overflow-hidden h-100">
                    <div class="skeleton-image"></div>
                    <div class="card-body p-4">
                        <div class="skeleton-title"></div>
                        <div class="skeleton-line"></div>
                        <div class="skeleton-line short"></div>
                        <div class="skeleton-meta"></div>
                        <div class="skeleton-button"></div>
                    </div>
                </div>
            </div>
        `;
    }
}

function renderHomeBlogs(posts) {
    if (!homepageBlogCards) return;

    homepageBlogCards.innerHTML = '';
    if (!posts || posts.length === 0) {
        homepageBlogEmptyState?.classList.remove('d-none');
        return;
    }

    homepageBlogEmptyState?.classList.add('d-none');
    posts.forEach(post => {
        const imageUrl = post.featured_image_path || 'images/logo.png';
        const excerpt = post.excerpt || post.short_description || 'Read more about this update from Kingdom Gathering.';
        homepageBlogCards.innerHTML += `
            <div class="col-lg-4 col-md-6">
                <div class="card h-100 border-0 shadow-lg bg-black text-white">
                    <img src="${imageUrl}" class="card-img-top" alt="${post.title}" style="height: 260px; object-fit: cover;" onerror="this.src='images/logo.png'">
                    <div class="card-body d-flex flex-column">
                        <small class="text-gold mb-2">${formatPublishedDate(post.published_at)}</small>
                        <h5 class="card-title fw-bold">${post.title || 'Untitled post'}</h5>
                        <p class="card-text text-muted mb-4">${excerpt}</p>
                        <a href="blog/post.html?slug=${encodeURIComponent(post.slug || '')}" class="btn btn-outline-gold mt-auto">Read More</a>
                    </div>
                </div>
            </div>
        `;
    });
}

function renderHomeGallery(items) {
    if (!homepageGalleryGrid) return;

    homepageGalleryGrid.innerHTML = '';
    if (!items || items.length === 0) {
        homepageGalleryEmptyState?.classList.remove('d-none');
        return;
    }

    homepageGalleryEmptyState?.classList.add('d-none');
    items.forEach(item => {
        const imageUrl = getPublicURL(item.bucket_name, item.file_path);
        homepageGalleryGrid.innerHTML += `
            <div class="col-6 col-md-4">
                <div class="gallery-card rounded-4 overflow-hidden shadow-sm bg-black">
                    <img src="${imageUrl}" alt="Gallery image" class="img-fluid w-100" style="height: 220px; object-fit: cover;" onerror="this.src='images/logo.png'">
                </div>
            </div>
        `;
    });
}

function showLoadingStates() {
    if (homepageFeaturedEvents) {
        renderFeaturedEventsLoading();
    }
    if (homepageBlogCards) {
        homepageBlogCards.innerHTML = `
            <div class="col-12 text-center py-5 text-gold">Loading latest blog posts...</div>
        `;
    }
    if (homepageGalleryGrid) {
        homepageGalleryGrid.innerHTML = `
            <div class="col-12 text-center py-5 text-gold">Loading gallery preview...</div>
        `;
    }
}

async function fetchHomepageEvents() {
    const { data, error } = await supabaseClient
        .from('events')
        .select('*')
        .order('start_at', { ascending: true });

    console.log('[homeDynamic] all homepage events:', data);
    console.log('[homeDynamic] homepage fetch error:', error);

    if (error) {
        return [];
    }

    const now = new Date();
    const publishedEvents = (data || []).filter(event => {
        const status = String(event.status || '').toLowerCase().trim();
        return status === 'published';
    });

    const filtered = publishedEvents.filter(event => {
        const status = String(event.status || '').toLowerCase().trim();
        const startDate = new Date(event.start_at);
        console.log('Checking homepage event:', {
            title: event.title,
            status,
            start_at: event.start_at,
            parsedDate: startDate,
            isFuture: startDate >= now
        });
        return status === 'published' && startDate >= now;
    });

    const nearestEvents = filtered.length > 0
        ? filtered.slice(0, 1)
        : publishedEvents.length > 0
            ? publishedEvents.slice(0, 1)
            : [];

    if (nearestEvents.length === 0) {
        console.warn('[homeDynamic] No homepage events available.');
    } else {
        console.log('[homeDynamic] nearest homepage event:', nearestEvents[0]);
    }

    return nearestEvents;
}

async function loadHomepageContent() {
    showLoadingStates();

    try {
        const [homepageEvents, blogResponse, galleryResponse] = await Promise.all([
            fetchHomepageEvents(),
            supabaseClient
                .from('blogs')
                .select('id,title,slug,excerpt,short_description,featured_image_path,published_at,status')
                .eq('status', 'published')
                .order('published_at', { ascending: false })
                .limit(3),
            supabaseClient
                .from('media_assets')
                .select('id,bucket_name,file_path,content_type,file_name')
                .eq('bucket_name', 'gallery')
                .order('created_at', { ascending: false })
                .limit(6)
        ]);

        const { data: blogData, error: blogError } = blogResponse;
        const { data: galleryData, error: galleryError } = galleryResponse;

        console.log('Homepage featured events data:', homepageEvents);
        console.log('Homepage featuredEvents container:', homepageFeaturedEvents);
        console.log('Homepage featuredEvents first object:', homepageEvents[0]);
        console.log('Homepage blog data:', blogData);
        console.log('Homepage blog error:', blogError);
        console.log('Homepage gallery data:', galleryData);
        console.log('Homepage gallery error:', galleryError);

        if (homepageEvents && homepageEvents.length > 0) {
            renderFeaturedEvents(homepageEvents);
        } else {
            renderFeaturedEvents([]);
        }

        renderHomeBlogs(blogData || []);
        renderHomeGallery(galleryData || []);
    } catch (error) {
        console.error('Error loading homepage content:', error);
        renderFeaturedEventsError();
        renderHomeBlogs([]);
        renderHomeGallery([]);
    }
}

if (homepageFeaturedEventsRetry) {
    homepageFeaturedEventsRetry.addEventListener('click', loadHomepageContent);
}

loadHomepageContent();
