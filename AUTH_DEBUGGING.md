# Authentication Debugging Guide

## Issue Summary

Despite all structural fixes (separate functions, correct IDs, cache busting), doctors are still not loading on the appointments page. User correctly identified this as likely an **authentication issue**.

## Changes Made (v4.0)

### 1. Enhanced `loadDoctorsMainPage()` Function

Location: `frontend/js/appointments.js`

#### Added Pre-Flight Authentication Check

```javascript
// 🔍 AUTHENTICATION DEBUGGING
const token = localStorage.getItem("accessToken");
const userEmail = localStorage.getItem("userEmail");
console.log("🔐 Auth Debug:");
console.log("  - Token exists:", !!token);
console.log("  - User email:", userEmail || "NOT LOGGED IN");
if (token) {
  console.log(
    "  - Token preview:",
    token.substring(0, 20) + "..." + token.substring(token.length - 20)
  );
}
```

**What it shows:**

- Whether token exists in localStorage
- User's email (if logged in)
- First and last 20 characters of token (for verification)

#### Added "Not Logged In" User Message

If no token found:

```
┌──────────────────────────────────────┐
│  ⚠️ Authentication Required          │
│  You need to be logged in to        │
│  view doctors                        │
│  [Login Now] button                  │
└──────────────────────────────────────┘
```

#### Enhanced API Response Logging

```javascript
console.log("📡 Fetching from:", `${API_BASE_URL}/doctors/`);
console.log("📬 API Response:");
console.log("  - Status:", response.status);
console.log("  - Status Text:", response.statusText);
```

#### Added "Session Expired" User Message

If API returns 401:

```
┌──────────────────────────────────────┐
│  🕐 Session Expired                  │
│  Your login session has expired.    │
│  Please login again.                 │
│  [Login Again] button                │
└──────────────────────────────────────┘
```

**Key Change:** Does NOT auto-logout on 401, instead shows clear message to user

#### Enhanced Error Handling

Now distinguishes between:

1. **Authentication errors** (no token, 401, Unauthorized)

   - Shows red bordered card with login button
   - Message: "No authentication token found" or "Your session may have expired"

2. **Network/API errors** (other failures)
   - Shows warning with retry button
   - Displays actual error message

### 2. Detailed Console Logging

Every step now logs:

- ✅ Success with green check: "API Success: Doctors count: 6"
- ❌ Errors with red X: "401 Unauthorized - Token invalid or expired"
- 🔐 Auth status: "Token exists: true"
- 📡 Network calls: "Fetching from: http://localhost:8000/api/doctors/"
- 📬 Responses: "Status: 200"

### 3. Cache Busting

Updated version to **v4.0** in `appointments.html`:

```html
<script src="js/appointments.js?v=4.0"></script>
```

## How to Diagnose

### Step 1: Open Browser Console

1. Navigate to: http://localhost:8080/appointments.html
2. Press F12 to open Developer Tools
3. Go to **Console** tab

### Step 2: Check Console Logs

Look for these logs:

#### ✅ **Good Authentication** (Expected logs):

```
🏥 Loading doctors for main page...
🔐 Auth Debug:
  - Token exists: true
  - User email: patient@test.com
  - Token preview: eyJhbGciOiJIUzI1Ni...9kZjg5MjM0NWFiY2Rl
📡 Fetching from: http://localhost:8000/api/doctors/
📬 API Response:
  - Status: 200
  - Status Text: OK
✅ API Success:
  - Doctors count: 6
  - First doctor: Dr. Sarah Johnson
✅ Loaded 6 doctors for main page
```

#### ❌ **Not Logged In** (Error case):

```
🏥 Loading doctors for main page...
🔐 Auth Debug:
  - Token exists: false
  - User email: NOT LOGGED IN
❌ NO TOKEN FOUND - User not logged in!
```

**Page will show:** "Authentication Required" card with "Login Now" button

#### ❌ **Expired Token** (Error case):

```
🏥 Loading doctors for main page...
🔐 Auth Debug:
  - Token exists: true
  - User email: patient@test.com
  - Token preview: eyJhbGciOiJIUzI1Ni...9kZjg5MjM0NWFiY2Rl
📡 Fetching from: http://localhost:8000/api/doctors/
📬 API Response:
  - Status: 401
  - Status Text: Unauthorized
❌ 401 Unauthorized - Token invalid or expired
```

**Page will show:** "Session Expired" card with "Login Again" button

#### ❌ **Network Error** (Error case):

```
🏥 Loading doctors for main page...
🔐 Auth Debug:
  - Token exists: true
  - User email: patient@test.com
📡 Fetching from: http://localhost:8000/api/doctors/
❌ Error loading doctors: TypeError: Failed to fetch
  - Error type: TypeError
  - Error message: Failed to fetch
```

**Page will show:** "Error loading doctors" with "Retry" button

### Step 3: Manual Token Check

In browser console, run:

```javascript
// Check if token exists
localStorage.getItem("accessToken");

// Check user info
localStorage.getItem("userEmail");
localStorage.getItem("userRole");

// Check all auth data
console.log({
  token: localStorage.getItem("accessToken"),
  email: localStorage.getItem("userEmail"),
  role: localStorage.getItem("userRole"),
  refresh: localStorage.getItem("refreshToken"),
});
```

**Expected output if logged in:**

```javascript
{
  token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  email: "patient@test.com",
  role: "patient",
  refresh: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**If any are `null`, user is not logged in!**

### Step 4: Test API Call Manually

In browser console:

```javascript
// Test with current token
const token = localStorage.getItem("accessToken");
fetch("http://localhost:8000/api/doctors/", {
  headers: {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  },
})
  .then((res) => {
    console.log("Status:", res.status);
    return res.json();
  })
  .then((data) => console.log("Data:", data))
  .catch((err) => console.error("Error:", err));
```

**Expected responses:**

✅ **Success (200):**

```json
{
  "count": 6,
  "results": [
    {
      "id": 1,
      "name": "Dr. Sarah Johnson",
      "specialty": "Cardiology",
      "location": "New York"
    },
    ...
  ]
}
```

❌ **Unauthorized (401):**

```json
{
  "detail": "Given token not valid for any token type",
  "code": "token_not_valid",
  "messages": [...]
}
```

❌ **No Token (401):**

```json
{
  "detail": "Authentication credentials were not provided."
}
```

## Common Issues & Solutions

### Issue 1: "Token exists: false"

**Problem:** User not logged in  
**Solution:**

1. Go to http://localhost:8080/login.html
2. Login with test credentials (check backend README for test users)
3. Refresh appointments page

### Issue 2: "Status: 401 Unauthorized"

**Problem:** Token expired or invalid  
**Solution:**

1. Clear localStorage: `localStorage.clear()`
2. Login again
3. If problem persists, check backend JWT settings

### Issue 3: "Status: 403 Forbidden"

**Problem:** User has token but insufficient permissions  
**Solution:** Check if user's role allows accessing `/api/doctors/` endpoint

### Issue 4: "TypeError: Failed to fetch"

**Problem:** Backend not running or CORS issue  
**Solution:**

1. Check backend: `curl http://localhost:8000/api/doctors/`
2. Verify CORS settings in `backend/nexuscare/settings.py`
3. Ensure backend is running: `cd backend && python manage.py runserver`

### Issue 5: Doctors still not showing with 200 response

**Problem:** Data format mismatch or rendering issue  
**Check console for:**

- "Doctors count: 0" → Database has no doctors, need to seed
- "Doctors count: 6" but no display → JavaScript rendering error
- Check for JavaScript errors after the success log

## Testing Checklist

- [ ] Open appointments page with F12 console open
- [ ] Check "Token exists" log - should be `true`
- [ ] Check "User email" log - should show email
- [ ] Check "API Response Status" - should be `200`
- [ ] Check "Doctors count" - should be > 0
- [ ] Verify doctor cards appear on page
- [ ] Test with cleared localStorage (should show "Login Required")
- [ ] Test with invalid token (edit in localStorage) - should show "Session Expired"

## Next Steps If Issue Persists

If after checking all above:

1. **Token exists and is valid, Status 200, but no doctors:**

   - Check database: `python backend/manage.py shell`
   - Run: `from apps.doctors.models import Doctor; print(Doctor.objects.count())`
   - If 0, run seed script

2. **All logs correct but page blank:**

   - Hard refresh: Ctrl+F5 (Windows/Linux) or Cmd+Shift+R (Mac)
   - Check for JavaScript errors in console
   - Inspect `doctorsList` div in Elements tab

3. **Authentication working on other pages but not appointments:**
   - Check if `checkAuth()` is called in DOMContentLoaded
   - Verify API_BASE_URL is correct
   - Check for middleware blocking the endpoint

## Files Modified

1. `frontend/js/appointments.js` - v4.0

   - Added pre-flight auth check
   - Enhanced console logging
   - Better error messages with user-facing UI
   - Separated auth errors from network errors

2. `frontend/appointments.html` - v4.0
   - Updated script tag: `?v=4.0`

## Rollback Instructions

If v4.0 breaks something:

```bash
cd /home/hn-hanif/Desktop/phd_Nexus/frontend
git checkout appointments.html js/appointments.js
# OR manually change ?v=4.0 back to ?v=3.0
```

---

**Version:** 4.0  
**Date:** 2025-01-XX  
**Focus:** Authentication Debugging & User-Friendly Error Messages
