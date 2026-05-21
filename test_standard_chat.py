import requests, os
from dotenv import load_dotenv
load_dotenv('backend/.env')
token = os.environ.get("HF_TOKEN")

url = "https://huggingface.co/api/inference-proxy/together/v1/chat/completions" # together provider?
# Actually, router.huggingface.co/hf-inference/v1/chat/completions is standard
url2 = "https://router.huggingface.co/hf-inference/v1/chat/completions"
resp = requests.post(url2, headers={"Authorization": f"Bearer {token}"}, json={
    "model": "meta-llama/Llama-3.2-11B-Vision-Instruct",
    "messages": [{"role": "user", "content": "Extract medicine"}]
})
print("Vision Llama:", resp.status_code, resp.text[:100])

resp2 = requests.post(url2, headers={"Authorization": f"Bearer {token}"}, json={
    "model": "Qwen/Qwen2.5-72B-Instruct",
    "messages": [{"role": "user", "content": "Extract medicine"}]
})
print("Qwen Chat:", resp2.status_code, resp2.text[:100])
resp3 = requests.post(url2, headers={"Authorization": f"Bearer {token}"}, json={
    "model": "meta-llama/Llama-3.1-8B-Instruct", "messages": [{"role": "user", "content": "Extract medicine"}]
})
print("Llama 3.1 8B:", resp3.status_code, resp3.text[:100])
