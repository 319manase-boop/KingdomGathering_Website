const eventsContainer = document.getElementById("eventsContainer");
const eventsEmptyState = document.getElementById("eventsEmptyState");

function formatEventDate(dateString) {
    if (!dateString) return "Date TBC";

    return new Date(dateString).toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
    });
}

function formatEventTime(dateString) {
    if (!dateString) return "";

    return new Date(dateString).toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
    });
}

async function loadPublicEvents() {
    if (!eventsContainer) return;

    eventsContainer.innerHTML = "<p class='text-center text-white'>Loading events...</p>";

    const now = new Date().toISOString();

    const { data, error } = await supabaseClient
        .from("events")
        .select(`
            id,
            title,
            slug,
            short_description,
            start_at,
            end_at,
            poster_path,
            registration_required,
            status,
            branches(name)
        `)
        .eq("status", "published")
        .gte("start_at", now)
        .order("start_at", { ascending: true });

    console.log("Fetched events:", data);
    console.log("Events fetch error:", error);

    if (error) {
        eventsContainer.innerHTML = "<p class='text-center text-danger'>Unable to load events.</p>";
        return;
    }

    if (!data || data.length === 0) {
        eventsContainer.innerHTML = "";
        eventsContainer.classList.add("d-none");
        if (eventsEmptyState) eventsEmptyState.classList.remove("d-none");
        return;
    }

    if (eventsEmptyState) eventsEmptyState.classList.add("d-none");
    eventsContainer.classList.remove("d-none");
    eventsContainer.innerHTML = "";

    data.forEach(event => {
        const imagePath = event.poster_path || "../images/logo.png";

        eventsContainer.innerHTML += `
            <div class="col-lg-4 col-md-6 mb-4">
                <div class="card h-100 shadow border-0 overflow-hidden event-card">
                    <img src="${imagePath}"
                         class="card-img-top"
                         alt="${event.title}"
                         style="height:240px;object-fit:cover;"
                         onerror="this.src='../images/logo.png'">

                    <div class="card-body d-flex flex-column">
                        <span class="badge bg-warning text-dark mb-2 align-self-start">
                            ${event.branches?.name || "Kingdom Gathering"}
                        </span>

                        <h5 class="fw-bold">${event.title}</h5>

                        <p class="text-muted">
                            ${event.short_description || "More details coming soon."}
                        </p>

                        <small class="text-muted mb-3">
                            ${formatEventDate(event.start_at)} • ${formatEventTime(event.start_at)}
                        </small>

                        <a href="../contact/" class="btn btn-warning mt-auto">
                            ${event.registration_required ? "Reserve Your Seat" : "Learn More"}
                        </a>
                    </div>
                </div>
            </div>
        `;
    });
}

loadPublicEvents();