import os, sys, django
sys.path.append('backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'nexuscare.settings')
django.setup()
from apps.ai.services import ai_service

text1 = """```json\n[{"a": 1}]\n```"""
text2 = """Here is your result:\n[{"a": 1}]\nHope it helps!"""
text3 = """```\n[{"a": 1}]\n```"""

print("1:", ai_service._extract_json(text1))
print("2:", ai_service._extract_json(text2))
print("3:", ai_service._extract_json(text3))