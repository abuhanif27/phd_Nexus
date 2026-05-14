import requests
import json

BASE_URL = "http://localhost:8000"
LOGIN_URL = f"{BASE_URL}/api/auth/login/"
ANALYZER_URL = f"{BASE_URL}/api/records/prescriptions/parse-image/"

# User who owns file ID 3
EMAIL = "patient.1@gmail.com"
PASSWORD = "TestPass123!"

def test_analyzer_valid():
    print(f"Testing Analyzer with VALID owner of file 3 ({EMAIL})")
    
    # 1. Login
    payload = {"email": EMAIL, "password": PASSWORD}
    response = requests.post(LOGIN_URL, json=payload)
    if response.status_code != 200:
        print(f"Login failed: {response.status_code}")
        return

    tokens = response.json()
    access_token = tokens.get("access")
    print("Login successful.")

    # 2. Test with existing file_id 3
    headers = {"Authorization": f"Bearer {access_token}"}
    data = {"file_id": 3}
    print("Calling analyzer with file_id=3...")
    response = requests.post(ANALYZER_URL, headers=headers, data=data)
    print(f"Response Status: {response.status_code}")
    print(f"Body: {response.text}")

if __name__ == "__main__":
    test_analyzer_valid()
