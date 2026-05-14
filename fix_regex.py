import re
with open('backend/apps/ai/services.py', 'r') as f:
    text = f.read()

text = text.replace(r"date_pattern = r(\d{1,2}[/-]\d{1,2}[/-]\d{2,4}'", r"date_pattern = r'\b(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})\b'")
text = text.replace(r"text_date_pattern = r(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2},?\s+\d{4}'", r"text_date_pattern = r'\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2},?\s+\d{4}\b'")

with open('backend/apps/ai/services.py', 'w') as f:
    f.write(text)
