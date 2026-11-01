#!/usr/bin/env python3
"""Inject the shared header and footer into every page of the site.

Run from the repository root:  python3 tools/chrome.py
Pages carry <!-- sk:header --> ... <!-- /sk:header --> and
<!-- sk:footer --> ... <!-- /sk:footer --> markers; legacy <header class="site">
and <footer class="site"> blocks are converted to markers on first run.
"""
import hashlib, pathlib, re

ROOT = pathlib.Path(__file__).resolve().parent.parent

# English path <-> French path (clean URLs)
PAIRS = {
    '/': '/fr/',
    '/mobile': '/fr/mobile',
    '/horizon': '/fr/horizon',
    '/sk-1': '/fr/sk-1',
    '/eyes': '/fr/eyes',
    '/evidence': '/fr/preuve',
    '/use-cases': '/fr/cas-usage',
    '/resources': '/fr/ressources',
    '/contact': '/fr/contact',
    '/legal': '/fr/mentions-legales',
    '/articles/how-skykraken-works': '/fr/articles/comment-fonctionne-skykraken',
    '/articles/why-locating-the-pilot-changes-everything': '/fr/articles/localiser-le-pilote-change-tout',
    '/articles/remote-id-explained': '/fr/articles/remote-id-explique',
    '/articles/building-admissible-drone-evidence': '/fr/articles/preuve-incursion-drone-recevable',
    '/articles/drones-over-prisons': '/fr/articles/drones-en-milieu-carceral',
}
FR_TO_EN = {v: k for k, v in PAIRS.items()}

ARROW = '<svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M2 8h11M9 4l4 4-4 4"/></svg>'

T = {
    'en': dict(home='/', nav=[('/mobile', 'Mobile'), ('/horizon', 'Horizon'), ('/sk-1', 'SK-1'), ('/eyes', 'Eyes')],
               nav2=[('/evidence', 'Evidence'), ('/resources', 'Resources'), ('/contact', 'Contact')],
               cta=('/contact', 'Request a demo'), main='Main', products='Products', company='Company', reach='Contact',
               foot_products=[('/mobile', 'Mobile · portable case'), ('/horizon', 'Horizon · fixed station'), ('/sk-1', 'SK-1 · FPV detector'), ('/eyes', 'Eyes · camera software')],
               foot_company=[('/use-cases', 'Use cases'), ('/evidence', 'Evidence'), ('/resources', 'Resources'), ('/ui-demo', 'Tactical demo')],
               foot_reach=[('mailto:contact@skykraken.fr', 'contact@skykraken.fr'), ('/contact', 'Request a demonstration'), ('/legal', 'Legal notice')],
               about='Passive radio-frequency drone detection. See the drone, identify the pilot, prove the incursion. Every enquiry is handled with discretion.',
               follow='Follow SkyKraken on LinkedIn', incub='Incubated at <a href="https://airtable.com/appcPSdu4GAF8BpvY/shrq5GukTd1IblpW7?detail=eyJwYWdlSWQiOiJwYWcyY1lmbk5Wc2tZdUlIeCIsInJvd0lkIjoicmVjdEY1SVlkT2tHWUJFSDYiLCJzaG93Q29tbWVudHMiOmZhbHNlLCJxdWVyeU9yaWdpbkhpbnQiOnsidHlwZSI6InBhZ2VFbGVtZW50IiwiZWxlbWVudElkIjoicGVsQUFTTVAzRlFXV3RqNmQiLCJxdWVyeUNvbnRhaW5lcklkIjoicGVsanpWem5SYWFZY2lYSGYifX0" target="_blank" rel="noopener">Bordeaux Technowest</a> · <a href="https://www.uavshow.com/news/hosni-ben-hassen-skykraken" target="_blank" rel="noopener">UAV Show</a> exhibitor, stand C0306', rights='© 2026 SkyKraken. All rights reserved.', made='Designed in Mérignac, France.', lang_label='Language'),
    'fr': dict(home='/fr/', nav=[('/fr/mobile', 'Mobile'), ('/fr/horizon', 'Horizon'), ('/fr/sk-1', 'SK-1'), ('/fr/eyes', 'Eyes')],
               nav2=[('/fr/preuve', 'Preuve'), ('/fr/ressources', 'Ressources'), ('/fr/contact', 'Contact')],
               cta=('/fr/contact', 'Demander une démo'), main='Principale', products='Produits', company='SkyKraken', reach='Contact',
               foot_products=[('/fr/mobile', 'Mobile · valise portable'), ('/fr/horizon', 'Horizon · station fixe'), ('/fr/sk-1', 'SK-1 · détecteur FPV'), ('/fr/eyes', 'Eyes · logiciel caméras')],
               foot_company=[('/fr/cas-usage', 'Cas d’usage'), ('/fr/preuve', 'Preuve'), ('/fr/ressources', 'Ressources'), ('/ui-demo', 'Démo tactique')],
               foot_reach=[('mailto:contact@skykraken.fr', 'contact@skykraken.fr'), ('/fr/contact', 'Demander une démonstration'), ('/fr/mentions-legales', 'Mentions légales')],
               about='Détection passive de drones par radiofréquence. Voir le drone, identifier le pilote, prouver l’incursion. Chaque demande est traitée avec discrétion.',
               follow='Suivre SkyKraken sur LinkedIn', incub='Incubé à <a href="https://airtable.com/appcPSdu4GAF8BpvY/shrq5GukTd1IblpW7?detail=eyJwYWdlSWQiOiJwYWcyY1lmbk5Wc2tZdUlIeCIsInJvd0lkIjoicmVjdEY1SVlkT2tHWUJFSDYiLCJzaG93Q29tbWVudHMiOmZhbHNlLCJxdWVyeU9yaWdpbkhpbnQiOnsidHlwZSI6InBhZ2VFbGVtZW50IiwiZWxlbWVudElkIjoicGVsQUFTTVAzRlFXV3RqNmQiLCJxdWVyeUNvbnRhaW5lcklkIjoicGVsanpWem5SYWFZY2lYSGYifX0" target="_blank" rel="noopener">Bordeaux Technowest</a> · Exposant <a href="https://www.uavshow.com/news/hosni-ben-hassen-skykraken" target="_blank" rel="noopener">UAV Show</a>, stand C0306', rights='© 2026 SkyKraken. Tous droits réservés.', made='Conçu à Mérignac, France.', lang_label='Langue'),
}


def page_url(path: pathlib.Path) -> str:
    rel = path.relative_to(ROOT).as_posix()
    if rel == 'index.html':
        return '/'
    if rel == 'fr/index.html':
        return '/fr/'
    return '/' + rel[:-5]


def lang_links(url: str, lang: str):
    if lang == 'en':
        en, fr = url, PAIRS.get(url, '/fr/')
    else:
        fr, en = url, FR_TO_EN.get(url, '/')
    return en, fr


def header(url: str, lang: str) -> str:
    t = T[lang]
    en, fr = lang_links(url, lang)
    links = '\n    '.join(f'<a href="{h}">{n}</a>' for h, n in t['nav'])
    links2 = '\n    '.join(f'<a href="{h}">{n}</a>' for h, n in t['nav2'])
    return f'''<!-- sk:header -->
<header class="site">
  <a href="{t['home']}" class="brand" aria-label="SkyKraken"><img src="/assets/skykraken-logo.png" alt="" class="brand-mark" width="40" height="40"><span class="brand-name">SkyKraken</span></a>
  <nav class="main" aria-label="{t['main']}">
    {links}
    <span class="nav-sep" aria-hidden="true"></span>
    {links2}
    <span class="lang" role="group" aria-label="{t['lang_label']}"><a href="{en}" hreflang="en" lang="en"{' class="active" aria-current="true"' if lang == 'en' else ''}>EN</a><a href="{fr}" hreflang="fr" lang="fr"{' class="active" aria-current="true"' if lang == 'fr' else ''}>FR</a></span>
    <a href="{t['cta'][0]}" class="cta-nav">{t['cta'][1]}</a>
  </nav>
  <button class="burger" type="button" aria-label="Menu"><span></span><span></span><span></span></button>
</header>
<!-- /sk:header -->'''


def footer(url: str, lang: str) -> str:
    t = T[lang]
    en, fr = lang_links(url, lang)
    col = lambda items: '\n        '.join(f'<a href="{h}">{n}</a>' for h, n in items)
    return f'''<!-- sk:footer -->
<footer class="site">
  <div class="wrap">
    <div class="foot-top">
      <div class="foot-col foot-brand">
        <a href="{t['home']}" class="brand"><img src="/assets/skykraken-logo.png" alt="" class="brand-mark" width="40" height="40"><span class="brand-name">SkyKraken</span></a>
        <p class="discretion">{t['about']}</p>
        <address class="foot-addr">Cockpit Bordeaux Technowest<br>58 avenue Marcel Dassault, 33700 Mérignac</address>
        <p class="foot-incub">{t['incub']}</p>
        <a class="foot-social" href="https://www.linkedin.com/company/skykraken" target="_blank" rel="noopener"><svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true"><path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13zM7.12 20.45H3.56V9h3.56v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0z"/></svg><span>{t['follow']}</span></a>
      </div>
      <div class="foot-col"><h5>{t['products']}</h5>
        {col(t['foot_products'])}
      </div>
      <div class="foot-col"><h5>{t['company']}</h5>
        {col(t['foot_company'])}
      </div>
      <div class="foot-col"><h5>{t['reach']}</h5>
        {col(t['foot_reach'])}
      </div>
    </div>
    <div class="foot-mark" aria-hidden="true"><canvas></canvas><span>SkyKraken</span></div>
    <div class="foot-bottom">
      <span>{t['rights']} {t['made']}</span>
      <span class="lang" role="group" aria-label="{t['lang_label']}"><a href="{en}" hreflang="en" lang="en"{' class="active"' if lang == 'en' else ''}>EN</a><a href="{fr}" hreflang="fr" lang="fr"{' class="active"' if lang == 'fr' else ''}>FR</a></span>
    </div>
  </div>
</footer>
<!-- /sk:footer -->'''


ASSETS = ['assets/style.css', 'assets/app.js', 'assets/terrain.js', 'assets/vendor/gsap.min.js', 'assets/vendor/ScrollTrigger.min.js', 'assets/vendor/SplitText.min.js', 'assets/vendor/lenis.min.js', 'assets/spectrum.js']
VERSIONS = {a: hashlib.md5((ROOT / a).read_bytes()).hexdigest()[:8] for a in ASSETS}


def version_assets(s: str) -> str:
    """Append ?v=<content hash> so browsers never keep a stale copy after a deploy."""
    for a, v in VERSIONS.items():
        s = re.sub(r'(["\'])/' + re.escape(a) + r'(\?v=[0-9a-f]+)?\1', lambda m: f'{m.group(1)}/{a}?v={v}{m.group(1)}', s)
    return s


def process(path: pathlib.Path):
    s = path.read_text(encoding='utf-8')
    if '<html' not in s:
        return False
    url = page_url(path)
    lang = 'fr' if url.startswith('/fr/') else 'en'
    # legacy blocks -> markers
    if '<!-- sk:header -->' not in s:
        s, n = re.subn(r'<header class="site">.*?</header>', '<!-- sk:header --><!-- /sk:header -->', s, count=1, flags=re.S)
        if not n:
            return False
    if '<!-- sk:footer -->' not in s:
        s = re.sub(r'<footer class="site">.*?</footer>', '<!-- sk:footer --><!-- /sk:footer -->', s, count=1, flags=re.S)
    s = re.sub(r'<!-- sk:header -->.*?<!-- /sk:header -->', lambda m: header(url, lang), s, count=1, flags=re.S)
    s = re.sub(r'<!-- sk:footer -->.*?<!-- /sk:footer -->', lambda m: footer(url, lang), s, count=1, flags=re.S)
    # head: motion class before first paint; drop the old hosted-font import pages may carry
    if "classList.add('js-motion')" not in s:
        s = s.replace('</head>', "<script>document.documentElement.classList.add('js-motion')</script>\n</head>", 1)
    s = re.sub(r'<link[^>]+fonts\.googleapis\.com[^>]*>\s*', '', s)
    # absolute asset paths so nested pages resolve the same files
    s = re.sub(r'(href|src|poster)="(\.\./)*assets/', r'\1="/assets/', s)
    s = version_assets(s)
    path.write_text(s, encoding='utf-8')
    return True


if __name__ == '__main__':
    skip = {'ui-demo.html', 'google1a31d98b4d5bd9b6.html', '_test.html'}
    files = [p for p in ROOT.glob('*.html')] + list(ROOT.glob('fr/*.html')) + list(ROOT.glob('articles/*.html')) + list(ROOT.glob('fr/articles/*.html'))
    for p in sorted(files):
        if p.name in skip or p.name in ('system.html', 'systeme.html'):
            continue
        print(('ok   ' if process(p) else 'skip ') + p.relative_to(ROOT).as_posix())
