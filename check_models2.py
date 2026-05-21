import requests, os, sys
from dotenv import load_dotenv
load_dotenv('backend/.env')

token = os.environ.get("HF_TOKEN")
print(f"Loaded Token: {token}")

def check_model(model_name):
    url = f"https://router.huggingface.co/hf-inference/models/{model_name}"
    resp = requests.post(url, headers={"Authorization": f"Bearer {token}"}, json={"inputs": "hello"})
    print(f"{model_name}: {resp.status_code} {resp.text[:50]}")

check_model("naver-clova-ix/donut-base-finetuned-docvqa")
check_model("stepfun-ai/GOT-OCR2_0")
check_model("mistralai/Mistral-7B-Instruct-v0.3")
check_model("meta-llama/Llama-3.2-3B-Instruct")
check_model("Qwen/Qwen2.5-72B-Instruct")
check_model("d4data/biomedical-ner-all")
check_model("facebook/nougat-base")
check_model("Salesforce/donut-base")
check_model("ydshieh/donut-base-finetuned-docvqa")
