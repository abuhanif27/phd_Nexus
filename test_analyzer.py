import requests
import json

BASE_URL = "http://localhost:8000"
LOGIN_URL = f"{BASE_URL}/api/auth/login/"
ANALYZER_URL = f"{BASE_URL}/api/records/prescriptions/parse-image/"

# Demo credentials from README
EMAIL = "patient@example.com"
PASSWORD = "Pass1234!" # README says Pass1234!, SETUP says TestPass123!

def test_analyzer():
    print(f"Testing Analyzer at {ANALYZER_URL}")
    
    # 1. Login
    payload = {"email": EMAIL, "password": PASSWORD}
    try:
        response = requests.post(LOGIN_URL, json=payload)
        if response.status_code != 200:
            print(f"Login failed: {response.status_code} {response.text}")
            # Try alternate password
            payload["password"] = "TestPass123!"
            response = requests.post(LOGIN_URL, json=payload)
            if response.status_code != 200:
                return
    except Exception as e:
        print(f"Connection error: {e}")
        return

    tokens = response.json()
    access_token = tokens.get("access")
    print("Login successful.")

    # 2. Test with no data (should get 400, not 404)
    headers = {"Authorization": f"Bearer {access_token}"}
    response = requests.post(ANALYZER_URL, headers=headers)
    print(f"Empty POST response: {response.status_code}")
    if response.status_code == 404:
        print("ERROR: Endpoint returned 404!")
    elif response.status_code == 400:
        print("SUCCESS: Endpoint found (returned 400 as expected for missing data)")
    else:
        print(f"Unexpected status: {response.status_code} {response.text}")

    # 3. Test with a dummy file
    files = {'file': ('test.jpg', b'fake image data', 'image/jpeg')}
    response = requests.post(ANALYZER_URL, headers=headers, files=files)
    print(f"File upload POST response: {response.status_code}")
    if response.status_code == 200:
        print("SUCCESS: Analyzer returned 200 OK")
    else:
        print(f"Response: {response.text}")

if __name__ == "__main__":
    test_analyzer()
