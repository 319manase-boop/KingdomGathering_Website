from pathlib import Path
import re

root = Path('.')
footer_path = root / 'footer.html'
if not footer_path.exists():
    raise FileNotFoundError('footer.html missing')

footer_text = footer_path.read_text(encoding='utf-8')
footer_text = footer_text.replace('href="{{prefix}}"', 'href="{{prefix}}index.html"')
footer_text = footer_text.replace('href="/ministries/"', 'href="{{prefix}}ministries/"')
footer_text = footer_text.replace('href="/services/"', 'href="{{prefix}}services/"')
footer_text = footer_text.replace('href="/events/"', 'href="{{prefix}}events/"')
footer_text = footer_text.replace('href="/about/"', 'href="{{prefix}}about/"')
footer_text = footer_text.replace('href="/contact/"', 'href="{{prefix}}contact/"')
footer_text = footer_text.replace('href="/giving/"', 'href="{{prefix}}giving/"')
footer_text = footer_text.replace('href="/gaborone/"', 'href="{{prefix}}gaborone/"')
footer_path.write_text(footer_text, encoding='utf-8')

pages = [
    'index.html',
    'about/index.html',
    'services/index.html',
    'resources/index.html',
    'blog/index.html',
    'blog/post.html',
    'ministries/index.html',
    'leadership/index.html',
    'giving/index.html',
    'gaborone/index.html',
    'events/index.html',
    'prayer/index.html',
    'counseling/index.html',
    'contact/index.html',
]

footer_pattern = re.compile(r'<footer class="premium-footer[\s\S]*?</footer>', re.IGNORECASE)

for page in pages:
    path = root / page
    if not path.exists():
        print(f'MISSING {page}')
        continue
    html = path.read_text(encoding='utf-8')
    new_html, n = footer_pattern.subn('<div data-footer-placeholder></div>', html, count=1)
    if n == 0:
        print(f'NO FOOTER {page}')
        continue
    if '<script src="' in new_html and 'footer-loader.js' in new_html:
        print(f'LOADER PRESENT {page}')
        path.write_text(new_html, encoding='utf-8')
        continue
    body_close = new_html.rfind('</body>')
    if body_close == -1:
        print(f'NO BODY {page}')
        continue
    depth = len(Path(page).parent.parts)
    loader_src = ('../' * depth) + 'js/footer-loader.js'
    loader_tag = f'    <script src="{loader_src}"></script>\n'
    new_html = new_html[:body_close] + loader_tag + new_html[body_close:]
    path.write_text(new_html, encoding='utf-8')
    print(f'UPDATED {page}')
