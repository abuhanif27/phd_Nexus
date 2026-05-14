import requests
import json

BASE_URL = "http://localhost:8000"
LOGIN_URL = f"{BASE_URL}/api/auth/login/"
ANALYZER_URL = f"{BASE_URL}/api/records/prescriptions/parse-image/"

# Demo credentials from README
EMAIL = "patient@example.com"
PASSWORD = "Pass1234!" # README says Pass1234!, SETUP says TestPass123!

def test_analyzer_with_file_id(file_id):
    print(f"Testing Analyzer with file_id={file_id} at {ANALYZER_URL}")
    
    # 1. Login
    payload = {"email": EMAIL, "password": PASSWORD}
    try:
        response = requests.post(LOGIN_URL, json=payload)
        if response.status_code != 200:
            payload["password"] = "TestPass123!"
            response = requests.post(LOGIN_URL, json=payload)
            if response.status_code != 200:
                print("Login failed")
                return
    except Exception as e:
        print(f"Connection error: {e}")
        return

    tokens = response.json()
    access_token = tokens.get("access")
    print("Login successful.")

    # 2. Test with specific file_id
    headers = {"Authorization": f"Bearer {access_token}"}
    data = {"file_id": file_id}
    response = requests.post(ANALYZER_URL, headers=headers, data=data)
    print(f"File ID {file_id} response: {response.status_code}")
    print(f"Body: {response.text}")

if __name__ == "__main__":
    # Test with a "good" path file (ID 3)
    test_analyzer_with_file_id(3)
    # Test with a "bad" path file (ID 1)
    test_analyzer_with_file_id(1)
