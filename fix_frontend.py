import re
with open('frontend/app/(protected)/prescription-analyzer/page.tsx', 'r') as f:
    text = f.read()

# First replace all "font-medium flex items-center gap-2" wrapping paragraphs
text = re.sub(
    r'<p className="font-medium flex items-center gap-2">(.*?)</p>', 
    r'<div className="font-medium flex items-center gap-2">\1</div>', 
    text, 
    flags=re.DOTALL
)

with open('frontend/app/(protected)/prescription-analyzer/page.tsx', 'w') as f:
    f.write(text)
print("Fixed HTML tags!")
