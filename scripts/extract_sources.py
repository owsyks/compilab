"""Read local study transcripts. Keep private page text outside public assets."""
import json, re, sys
from pathlib import Path
import pymupdf

root = Path(__file__).resolve().parents[1]
dest = root / 'content/sources/pages'
dest.mkdir(parents=True, exist_ok=True)
topics = {
    'lexer': r'lexical|lex[eè]me|automate|identificateur|fiche\s*1',
    'grammar': r'grammaire|d[eé]rivation|arbre|ambigu',
    'transformation': r'r[eé]cursivit[eé]|factoris',
    'll1': r'FIRST|FOLLOW|LL\s*\(?1',
    'lr': r'LR\s*\(?[01]|SLR|LALR|CLOSURE|GOTO',
}
catalog = []
for path in sorted(root.parent.glob('*.pdf')):
    if not path.name.startswith(('hey i want', 'hey read')):
        continue
    doc = pymupdf.open(path)
    pages = []
    for n, page in enumerate(doc):
        text = page.get_text().replace('\x00', '')
        tags = [tag for tag, pattern in topics.items() if re.search(pattern, text, re.I)]
        rules = [line.strip() for line in text.splitlines() if '→' in line or '->' in line][:12]
        pages.append({'page': n + 1, 'text': text, 'topics': tags, 'rules': rules, 'verified': False})
    slug = 'study-transcript' if path.name.startswith('hey i want') else 'prior-exercises'
    (dest / (slug + '.json')).write_text(json.dumps(pages, ensure_ascii=False), encoding='utf-8')
    catalog.append({'id': slug, 'title': path.name, 'pageCount': len(doc), 'kind': 'unverified study conversation',
                    'topics': {tag: [p['page'] for p in pages if tag in p['topics']] for tag in topics},
                    'rulePages': [p['page'] for p in pages if p['rules']]})
    doc[0].get_pixmap(matrix=pymupdf.Matrix(1, 1)).save(str(dest / (slug + '-preview.png')))
    print(slug, len(doc), 'pages;', sum(len(p['text']) for p in pages), 'characters extracted')
(root / 'content/sources/catalog.json').write_text(json.dumps(catalog, ensure_ascii=False, indent=2), encoding='utf-8')
sys.stdout.reconfigure(encoding='utf-8')
for item in catalog:
    print(item['id'], {t: p[:15] for t, p in item['topics'].items()})
