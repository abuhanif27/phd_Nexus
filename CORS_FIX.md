# 🔧 Quick Troubleshooting Guide

## Problem: "Network error. Please ensure backend server is running"

### ✅ Solution:

The issue is **CORS (Cross-Origin Resource Sharing)** configuration. The backend CORS was set for port 3000, but frontend runs on port 8080.

**✅ FIXED!** The CORS settings have been updated to include port 8080.

---

## 🚀 How to Start Everything Correctly

### Method 1: Automatic (Recommended)

Open **2 terminals**:

**Terminal 1 - Backend:**

```bash
cd /home/hn-hanif/Desktop/phd_Nexus/backend
./start-backend.sh
```

**Terminal 2 - Frontend:**

```bash
cd /home/hn-hanif/Desktop/phd_Nexus/frontend
./serve.sh
```

### Method 2: One Command

```bash
cd /home/hn-hanif/Desktop/phd_Nexus
./launch.sh
```

---

## 🔍 Verify Connection

Run this test:

```bash
cd /home/hn-hanif/Desktop/phd_Nexus
./test-connection.sh
```

Should show:

- ✓ Backend is responding
- ✓ API endpoint accessible
- ✓ CORS is configured
- ✓ Login endpoint works

---

## 📝 Step-by-Step Fix

### Step 1: Stop Everything

```bash
pkill -f "manage.py runserver"
pkill -f "http.server"
```

### Step 2: Start Backend (must be first)

```bash
cd /home/hn-hanif/Desktop/phd_Nexus/backend
source .venv/bin/activate
python manage.py runserver
```

Wait until you see:

```
Starting development server at http://127.0.0.1:8000/
```

### Step 3: Start Frontend (in new terminal)

```bash
cd /home/hn-hanif/Desktop/phd_Nexus/frontend
python3 -m http.server 8080
```

### Step 4: Test Registration

1. Open browser: http://localhost:8080
2. Click "Get Started" or "Sign Up"
3. Fill the form:
   - Role: Patient
   - Email: test@example.com
   - Password: TestPass1234!
4. Click "Create Account"

Should now work! ✅

---

## 🐛 Common Errors & Fixes

### Error: "Failed to fetch" or "Network error"

**Cause:** Backend not running or CORS not configured

**Fix:**

1. Check backend is running:
   ```bash
   curl http://localhost:8000/api/auth/login/ -X OPTIONS
   ```
2. If it fails, restart backend:
   ```bash
   cd backend
   source .venv/bin/activate
   python manage.py runserver
   ```

### Error: "CORS policy" in browser console

**Cause:** CORS not allowing port 8080

**Fix:** Already fixed! The `settings.py` now includes:

```python
CORS_ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:8080",
    "http://127.0.0.1:8080",
]
```

**If still broken:**

```bash
cd backend
./start-backend.sh
# Press 'y' when asked to fix CORS
```

### Error: Port already in use

**Backend (8000):**

```bash
lsof -ti:8000 | xargs kill -9
```

**Frontend (8080):**

```bash
lsof -ti:8080 | xargs kill -9
```

### Error: "Module not found" (Python)

**Fix:** Install dependencies:

```bash
cd backend
source .venv/bin/activate
pip install -r requirements.txt
```

---

## ✅ Checklist Before Registration

- [ ] Backend running (Terminal 1 shows Django logs)
- [ ] Frontend running (Terminal 2 shows HTTP server)
- [ ] Browser at http://localhost:8080
- [ ] Browser console has no red errors (F12 → Console)
- [ ] Test connection script passes all checks

---

## 🧪 Test API Directly

### Test Login:

```bash
curl -X POST http://localhost:8000/api/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"email":"patient@example.com","password":"Pass1234!"}'
```

Should return JSON with `"access"` token.

### Test Register:

```bash
curl -X POST http://localhost:8000/api/auth/register/ \
  -H "Content-Type: application/json" \
  -d '{
    "email":"newuser@example.com",
    "password":"NewPass1234!",
    "role":"patient"
  }'
```

Should return JSON with `"access"` token.

---

## 🔍 Debug Mode

### Check Backend Logs:

```bash
# Backend terminal will show all requests
# Look for:
# - "GET /api/auth/login/ HTTP/1.1" 200
# - "POST /api/auth/register/ HTTP/1.1" 201
```

### Check Browser Console:

1. Open browser (Chrome/Firefox)
2. Press F12
3. Go to "Console" tab
4. Try to register
5. Look for errors

**Common console errors:**

- `CORS policy` → Backend CORS issue (fixed now)
- `Failed to fetch` → Backend not running
- `404 Not Found` → Wrong URL
- `500 Internal Server Error` → Backend error (check backend terminal)

---

## 🎯 Quick Test Workflow

```bash
# Test 1: Backend alive?
curl http://localhost:8000

# Test 2: API responding?
curl http://localhost:8000/api/auth/login/ -X OPTIONS

# Test 3: Can login with demo account?
curl -X POST http://localhost:8000/api/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"email":"patient@example.com","password":"Pass1234!"}'

# Test 4: CORS working?
curl -I -X OPTIONS http://localhost:8000/api/auth/login/ \
  -H "Origin: http://localhost:8080" \
  -H "Access-Control-Request-Method: POST"
```

All should succeed!

---

## 📞 Still Not Working?

### Check These Files:

1. **Backend CORS:** `backend/nexuscare/settings.py`

   ```python
   # Should contain:
   CORS_ALLOWED_ORIGINS = [
       "http://localhost:8080",
       "http://127.0.0.1:8080",
   ]
   ```

2. **Frontend API URL:** `frontend/js/auth.js`

   ```javascript
   // Should be:
   const API_BASE_URL = "http://localhost:8000/api";
   ```

3. **Both servers running:**
   ```bash
   ps aux | grep "manage.py runserver"
   ps aux | grep "http.server"
   ```

---

## 🎉 Success Indicators

When everything works:

1. **Backend terminal shows:**

   ```
   System check identified no issues (0 silenced).
   Django version 5.0.1, using settings 'nexuscare.settings'
   Starting development server at http://127.0.0.1:8000/
   ```

2. **Frontend terminal shows:**

   ```
   Serving HTTP on 0.0.0.0 port 8080 (http://0.0.0.0:8080/) ...
   ```

3. **Browser:**

   - No console errors (F12)
   - Registration form submits without error
   - Success message appears
   - Redirects to dashboard

4. **Backend terminal logs the request:**
   ```
   [29/Oct/2025 13:30:45] "POST /api/auth/register/ HTTP/1.1" 201 245
   ```

---

## 🚀 Quick Reference

| What                | Command                                                                 |
| ------------------- | ----------------------------------------------------------------------- |
| **Start Backend**   | `cd backend && source .venv/bin/activate && python manage.py runserver` |
| **Start Frontend**  | `cd frontend && python3 -m http.server 8080`                            |
| **Test Connection** | `./test-connection.sh`                                                  |
| **Stop All**        | `pkill -f "manage.py runserver" && pkill -f "http.server"`              |
| **Check Processes** | `ps aux \| grep -E "manage.py\|http.server"`                            |
| **View Logs**       | Check terminal windows                                                  |

---

**✅ The CORS issue has been fixed. Just restart the backend and try again!**
