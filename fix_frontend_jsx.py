with open('frontend/app/(protected)/prescription-analyzer/page.tsx', 'r') as f:
    text = f.read()

bad_string = """{!analyzeMutation.isPending && !analyzeMutation.isSuccess && !analyzeMutation.isError && (
 && !analyzeMutation.isSuccess && !analyzeMutation.isError && ("""

good_string = """{!analyzeMutation.isPending && !analyzeMutation.isSuccess && !analyzeMutation.isError && ("""

text = text.replace(bad_string, good_string)

with open('frontend/app/(protected)/prescription-analyzer/page.tsx', 'w') as f:
    f.write(text)
