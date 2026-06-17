// Admin UI Helper Functions

// Toast Notifications
function showToast(message, type = 'success', duration = 4000) {
    const toast = document.createElement('div');
    toast.className = `alert alert-${type} alert-dismissible fade show`;
    toast.style.position = 'fixed';
    toast.style.bottom = '20px';
    toast.style.right = '20px';
    toast.style.zIndex = '9999';
    toast.style.minWidth = '300px';
    toast.innerHTML = `${message} <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>`;
    document.body.appendChild(toast);
    
    if (duration) {
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, duration);
    }
    
    return toast;
}

// Confirmation Dialog
function confirmAction(message) {
    return new Promise((resolve) => {
        if (confirm(message)) {
            resolve(true);
        } else {
            resolve(false);
        }
    });
}

// Loading Spinner
function showLoadingSpinner(container) {
    if (!container) {
        console.error("showLoadingSpinner: container is null or undefined");
        return;
    }
    const spinner = document.createElement('div');
    spinner.className = 'text-center py-5';
    spinner.innerHTML = '<div class="loading-spinner mx-auto"></div><p class="text-muted mt-3">Loading...</p>';
    container.innerHTML = '';
    container.appendChild(spinner);
}

// Format Date
function formatDate(dateString) {
    try {
        return new Date(dateString).toLocaleString();
    } catch (e) {
        return '';
    }
}

// Format Time Ago
function timeAgo(dateString) {
    try {
        const date = new Date(dateString);
        const now = new Date();
        const seconds = Math.floor((now - date) / 1000);
        
        if (seconds < 60) return 'Just now';
        if (seconds < 3600) return Math.floor(seconds / 60) + 'm ago';
        if (seconds < 86400) return Math.floor(seconds / 3600) + 'h ago';
        if (seconds < 604800) return Math.floor(seconds / 86400) + 'd ago';
        return date.toLocaleDateString();
    } catch (e) {
        return '';
    }
}

// Escape HTML
function escapeHtml(str) {
    return String(str || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// Truncate Text
function truncateText(text, length = 100) {
    if (!text) return '';
    return text.length > length ? text.substring(0, length) + '...' : text;
}

// Get Badge Class
function getBadgeClass(status) {
    const statusMap = {
        'active': 'bg-success',
        'inactive': 'bg-secondary',
        'pending': 'bg-warning text-dark',
        'completed': 'bg-success',
        'archived': 'bg-secondary',
        'prayed': 'bg-success',
        'new': 'bg-info',
        'in progress': 'bg-info',
        'assigned': 'bg-info',
        'resolved': 'bg-success',
        'unread': 'bg-warning text-dark',
        'read': 'bg-secondary'
    };
    return statusMap[status?.toLowerCase()] || 'bg-secondary';
}

// Apply Filters Helper
function applyFilterToArray(array, searchQuery, filterKey, filterValue) {
    return array.filter(item => {
        const matchesQuery = !searchQuery || 
            Object.values(item).some(val => 
                String(val).toLowerCase().includes(searchQuery.toLowerCase())
            );
        const matchesFilter = !filterKey || !filterValue || 
            String(item[filterKey]).toLowerCase() === String(filterValue).toLowerCase();
        return matchesQuery && matchesFilter;
    });
}

// Pagination Helper
function paginateArray(array, pageNumber = 1, itemsPerPage = 10) {
    const totalPages = Math.ceil(array.length / itemsPerPage);
    const startIndex = (pageNumber - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    
    return {
        data: array.slice(startIndex, endIndex),
        totalPages,
        currentPage: pageNumber,
        totalItems: array.length
    };
}

// Render Pagination Controls
function renderPaginationControls(container, currentPage, totalPages, onPageChange) {
    if (!container) {
        console.error("renderPaginationControls: container is null or undefined");
        return;
    }
    if (totalPages <= 1) {
        container.innerHTML = '';
        return;
    }
    
    let html = '<nav aria-label="Page navigation"><ul class="pagination justify-content-center">';
    
    // Previous button
    html += `<li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
        <button class="page-link" ${currentPage === 1 ? 'disabled' : ''} onclick="onPageChange(${currentPage - 1})">Previous</button>
    </li>`;
    
    // Page numbers
    for (let i = 1; i <= totalPages; i++) {
        if (i === 1 || i === totalPages || (i >= currentPage - 1 && i <= currentPage + 1)) {
            html += `<li class="page-item ${i === currentPage ? 'active' : ''}">
                <button class="page-link" onclick="onPageChange(${i})">${i}</button>
            </li>`;
        } else if (i === currentPage - 2 || i === currentPage + 2) {
            html += '<li class="page-item disabled"><span class="page-link">...</span></li>';
        }
    }
    
    // Next button
    html += `<li class="page-item ${currentPage === totalPages ? 'disabled' : ''}">
        <button class="page-link" ${currentPage === totalPages ? 'disabled' : ''} onclick="onPageChange(${currentPage + 1})">Next</button>
    </li></ul></nav>`;
    
    container.innerHTML = html;
    window.onPageChange = onPageChange;
}

// Render Empty State
function renderEmptyState(container, title = 'No data found', message = 'No records match your search or filters.') {
    if (!container) {
        console.error("renderEmptyState: container is null or undefined");
        return;
    }
    container.innerHTML = `
        <div class="empty-state">
            <div class="empty-state-icon">📋</div>
            <h3 class="empty-state-title">${escapeHtml(title)}</h3>
            <p class="empty-state-text">${escapeHtml(message)}</p>
        </div>
    `;
}

// Status Badge
function renderStatusBadge(status) {
    return `<span class="badge ${getBadgeClass(status)}">${escapeHtml(status || 'Unknown')}</span>`;
}

// Action Buttons
function renderActionButtons(id, actions = {}) {
    const {
        canView = true,
        canEdit = true,
        canDelete = true,
        onView,
        onEdit,
        onDelete
    } = actions;
    
    let html = '<div class="table-actions">';
    
    if (canView && onView) {
        html += `<button class="btn btn-sm btn-outline-light" title="View" onclick="onView('${id}')">👁</button>`;
    }
    
    if (canEdit && onEdit) {
        html += `<button class="btn btn-sm btn-outline-light" title="Edit" onclick="onEdit('${id}')">✏️</button>`;
    }
    
    if (canDelete && onDelete) {
        html += `<button class="btn btn-sm btn-outline-danger" title="Delete" onclick="onDelete('${id}')">🗑️</button>`;
    }
    
    html += '</div>';
    return html;
}
