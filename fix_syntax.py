with open('backend/apps/ai/services.py', 'r') as f:
    lines = f.readlines()

new_lines = []
skip_next = False
for i, line in enumerate(lines):
    if skip_next:
        skip_next = False
        continue
    
    if "advice_match = re.search(r'(?:advise|advice|instruction(?:s)?|note|rx|c/o)" in line:
        new_lines.append("        advice_match = re.search(r'(?:advise|advice|instruction(?:s)?|note|rx|c/o)\\\\s*[:\\\\-]*\\\\s*(.+?)(?=(?:\\\\n\\\\n|\\\\d+\\\\.|\\\\Z))', raw_ocr, re.IGNORECASE | re.DOTALL)\n")
        # skip the next two lines that are the corrupted newlines
        if lines[i+1].strip() == "":
            skip_next = True
            if lines[i+2].startswith("|\d+\.|\Z))', raw_ocr"):
                # we need to skip one more
                lines.pop(i+2) 
    elif "|\d+\.|\Z))', raw_ocr" in line:
        continue # skip the leftover fragment
    else:
        new_lines.append(line)

with open('backend/apps/ai/services.py', 'w') as f:
    f.writelines(new_lines)
