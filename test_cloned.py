import requests
import json

BASE_URL = "http://localhost:8000"
LOGIN_URL = f"{BASE_URL}/api/auth/login/"
ANALYZER_URL = f"{BASE_URL}/api/records/prescriptions/parse-image/"

EMAIL = "patient@example.com"
PASSWORD = "Pass1234!" 

def test_cloned():
    print(f"Testing Analyzer with cloned file_id=14 for {EMAIL}")
    
    # 1. Login
    payload = {"email": EMAIL, "password": PASSWORD}
    response = requests.post(LOGIN_URL, json=payload)
    if response.status_code != 200:
        payload["password"] = "TestPass123!"
        response = requests.post(LOGIN_URL, json=payload)
        if response.status_code != 200:
            print("Login failed")
            return

    tokens = response.json()
    access_token = tokens.get("access")
    print("Login successful.")

    # 2. Test with cloned file_id 14
    headers = {"Authorization": f"Bearer {access_token}"}
    data = {"file_id": 14}
    print("Calling analyzer with file_id=14...")
    response = requests.post(ANALYZER_URL, headers=headers, data=data)
    print(f"Response Status: {response.status_code}")
    print(f"Body: {response.text}")

if __name__ == "__main__":
    test_cloned()
