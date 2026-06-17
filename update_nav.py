import re
from pathlib import Path

base = Path('.')
files = [
    base / 'about' / 'index.html',
    base / 'leadership' / 'index.html',
    base / 'ministries' / 'index.html',
    base / 'resources' / 'index.html',
    base / 'services' / 'index.html',
    base / 'events' / 'index.html',
    base / 'giving' / 'index.html',
    base / 'contact' / 'index.html',
    base / 'blog' / 'index.html',
]

for path in files:
    text = path.read_text(encoding='utf-8')
    prefix = '' if path.parent == base else '../'
    page = path.parent.name if path.parent != base else 'home'
    
    actives = {
        'home': ('Home', ''),
        'about': ('About', 'about'),
        'leadership': ('About', 'leadership'),
        'ministries': ('Ministries', ''),
        'resources': ('More', 'resources'),
        'services': ('Services', ''),
        'events': ('Events', ''),
        'giving': ('Give', ''),
        'contact': ('Contact', ''),
        'blog': ('More', 'blog'),
    }
    main_active, sub_active = actives.get(page, ('', ''))
    home_active = 'active' if page == 'home' else ''
    about_active = 'active' if main_active == 'About' else ''
    more_active = 'active' if main_active == 'More' else ''
    ministries_active = 'active' if page == 'ministries' else ''
    services_active = 'active' if page == 'services' else ''
    events_active = 'active' if page == 'events' else ''
    contact_active = 'active' if page == 'contact' else ''
    blog_active = 'active' if page == 'blog' else ''
    resources_active = 'active' if page == 'resources' else ''
    ourchurch_active = 'active' if page == 'about' else ''
    leadership_active = 'active' if page == 'leadership' else ''

    nav = f'''    <!-- Navigation -->
    <nav class="navbar navbar-expand-lg navbar-dark bg-dark sticky-top border-bottom border-gold">
        <div class="container">
            <a class="navbar-brand fw-bold text-gold d-flex align-items-center" href="{prefix}index.html">
                <img src="{prefix}images/logo.png" alt="Kingdom Gathering Logo" class="me-2 logo-img">
                Kingdom Gathering
            </a>
            <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav">
                <span class="navbar-toggler-icon"></span>
            </button>
            <div class="collapse navbar-collapse" id="navbarNav">
                <ul class="navbar-nav ms-auto align-items-lg-center">
                    <li class="nav-item"><a class="nav-link {home_active}" href="{prefix}index.html">Home</a></li>
                    <li class="nav-item dropdown">
                        <a class="nav-link dropdown-toggle {about_active}" href="javascript:void(0);" id="aboutDropdown" role="button" data-bs-toggle="dropdown" aria-expanded="false">About</a>
                        <ul class="dropdown-menu" aria-labelledby="aboutDropdown">
                            <li><a class="dropdown-item {ourchurch_active}" href="{prefix}about/"><i class="fas fa-church text-gold me-2"></i>Our Church</a></li>
                            <li><a class="dropdown-item {leadership_active}" href="{prefix}leadership/"><i class="fas fa-user-tie text-gold me-2"></i>Leadership</a></li>
                        </ul>
                    </li>
                    <li class="nav-item"><a class="nav-link {ministries_active}" href="{prefix}ministries/">Ministries</a></li>
                    <li class="nav-item"><a class="nav-link {services_active}" href="{prefix}services/">Services</a></li>
                    <li class="nav-item"><a class="nav-link {events_active}" href="{prefix}events/">Events</a></li>
                    <li class="nav-item dropdown">
                        <a class="nav-link dropdown-toggle {more_active}" href="javascript:void(0);" id="moreDropdown" role="button" data-bs-toggle="dropdown" aria-expanded="false">More</a>
                        <ul class="dropdown-menu" aria-labelledby="moreDropdown">
                            <li><a class="dropdown-item {blog_active}" href="{prefix}blog/"><i class="fas fa-newspaper text-gold me-2"></i>Blog</a></li>
                            <li><a class="dropdown-item {resources_active}" href="{prefix}resources/"><i class="fas fa-book-open text-gold me-2"></i>Resources</a></li>
                        </ul>
                    </li>
                    <li class="nav-item"><a class="nav-link {contact_active}" href="{prefix}contact/">Contact</a></li>
                </ul>
                <div class="d-none d-lg-flex align-items-center ms-3">
                    <a href="{prefix}giving/" class="btn btn-gold btn-sm px-4">Give</a>
                </div>
            </div>
        </div>
    </nav>'''

    new_text, count = re.subn(r'    <!-- Navigation -->.*?</nav>', nav, text, flags=re.S)
    if count == 0:
        print('No nav block found in', path)
    else:
        path.write_text(new_text, encoding='utf-8')
        print('Updated', path)
