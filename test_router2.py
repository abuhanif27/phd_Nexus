import requests
url = "https://router.huggingface.co/hf-inference/models/naver-clova-ix/donut-base-finetuned-docvqa"
resp = requests.post(url, json={"inputs": "hello"})
print(resp.status_code)
