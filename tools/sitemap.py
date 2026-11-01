#!/usr/bin/env python3
"""Build sitemap.xml from the EN<->FR page pairs in tools/chrome.py.

Run from the repository root:  python3 tools/sitemap.py
Each page lists both language versions (hreflang) plus x-default (English).
lastmod is the date of the last git commit that touched the page.
"""
import pathlib, subprocess, sys
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from chrome import PAIRS, ROOT  # noqa: E402

BASE = 'https://skykraken.fr'

def file_for(url):
    if url == '/':
        return ROOT / 'index.html'
    if url == '/fr':
        return ROOT / 'fr/index.html'
    return ROOT / (url.lstrip('/') + '.html')

def lastmod(path):
    out = subprocess.run(['git', 'log', '-1', '--format=%cs', '--', str(path)], cwd=ROOT, capture_output=True, text=True).stdout.strip()
    if not out:
        import datetime
        out = datetime.date.today().isoformat()
    return out

def loc(url):
    return BASE + url if url != '/' else BASE + '/'

rows = []
for en, fr in PAIRS.items():
    alts = (f'<xhtml:link rel="alternate" hreflang="en" href="{loc(en)}"/>'
            f'<xhtml:link rel="alternate" hreflang="fr" href="{loc(fr)}"/>'
            f'<xhtml:link rel="alternate" hreflang="x-default" href="{loc(en)}"/>')
    for url in (en, fr):
        f = file_for(url)
        assert f.exists(), f
        rows.append(f'  <url><loc>{loc(url)}</loc><lastmod>{lastmod(f)}</lastmod>{alts}</url>')
rows.append(f'  <url><loc>{BASE}/ui-demo</loc><lastmod>{lastmod(ROOT / "ui-demo.html")}</lastmod></url>')
xml = ('<?xml version="1.0" encoding="UTF-8"?>\n'
       '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n'
       + '\n'.join(rows) + '\n</urlset>\n')
(ROOT / 'sitemap.xml').write_text(xml, encoding='utf-8')
print(f'sitemap.xml: {len(rows)} URLs')
