import re
with open('backend/apps/ai/services.py', 'r') as f:
    text = f.read()

# find PrescriptionParser
x = re.search(r'class PrescriptionParser.*?((?=class )|\Z)', text, re.DOTALL)
if x:
    print(x.group(0))
else:
    print("Not found")
