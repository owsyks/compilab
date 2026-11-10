import json,sys
import pymupdf
sys.stdout.reconfigure(encoding='utf-8')
doc=pymupdf.open(sys.argv[1])
if doc.is_encrypted or len(doc)>500:
    raise ValueError('Encrypted PDF or more than 500 pages')
pages=[]
total=0
for index,page in enumerate(doc):
    text=page.get_text().replace('\x00','')
    total+=len(text)
    if total>3000000: raise ValueError('Extracted text exceeds 3 million characters')
    pages.append({'page':index+1,'text':text})
print(json.dumps({'pageCount':len(doc),'pages':pages},ensure_ascii=False))
