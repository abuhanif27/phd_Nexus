import re

with open('/home/hn/Desktop/CODE/phd_Nexus/frontend/app/(protected)/prescription-analyzer/page.tsx', 'r') as f:
    content = f.read()

# Fix multi-line p tag that ends with </div>
content = re.sub(r'(<p className="text-sm font-medium animate-pulse text-blue-600 text-center">\s*Running EasyOCR \(GPU\)\.\.\.<br/>\s*Applying ClinicalBERT Tokenizer\.\.\.\s*)</div>', r'\1</p>', content)

# Fix single line p tags that end with </div>
content = re.sub(r'(<p [^>]*>.*?)</div>', r'\1</p>', content)

with open('/home/hn/Desktop/CODE/phd_Nexus/frontend/app/(protected)/prescription-analyzer/page.tsx', 'w') as f:
    f.write(content)
