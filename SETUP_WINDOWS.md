# 🪟 Windows Setup Guide for PhD NexusCare

This guide provides step-by-step instructions for running PhD NexusCare on Windows 10/11.

## ⚠️ Prerequisites

Before starting, ensure you have installed:

### 1. Python 3.10+
- **Download**: https://www.python.org/downloads/
- **Important**: During installation, CHECK the box "Add Python to PATH"
- **Verify**: Open PowerShell and run:
  ```powershell
  python --version
  ```

### 2. Git
- **Download**: https://git-scm.com/downloads
- **Default settings are fine**
- **Verify**: Open PowerShell and run:
  ```powershell
  git --version
  ```

### 3. Node.js 16+
- **Download**: https://nodejs.org/
- **Recommend**: LTS version
- **Verify**: Open PowerShell and run:
  ```powershell
  node --version
  npm --version
  ```

### 4. Tesseract OCR (for document scanning)
- **Download**: https://github.com/UB-Mannheim/tesseract/wiki
- **Choose**: `tesseract-ocr-w64-setup-v5.x.exe` (64-bit) or v5.x-32bit.exe (32-bit)
- **During Installation**: Note the installation path (default: `C:\Program Files\Tesseract-OCR`)
- **After Installation**: Add Tesseract to Python environment:
  - Open backend\.env file and add: `TESSERACT_CMD=C:\Program Files\Tesseract-OCR\tesseract.exe`

### 5. Git (Already mentioned but crucial)
- Clone the project: `git clone https://github.com/abuhanif27/phd_Nexus.git`

## 🚀 Quick Setup (5 minutes)

### Step 1: Check Prerequisites

```powershell
# PowerShell: Run this to verify all dependencies
.\check-prerequisites.ps1
```

**Or using Command Prompt:**
```cmd
# Command Prompt
python --version
npm --version
git --version
```

### Step 2: Run Setup Script

**Using PowerShell (Recommended):**
```powershell
# Allow scripts to run (one time only)
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

# Run the Windows setup script
.\setup-windows.ps1
```

**Or using Command Prompt:**
```cmd
# Command Prompt
setup-windows.bat
```

This script will:
- ✅ Create Python virtual environment
- ✅ Install all Python packages
- ✅ Download spaCy language models
- ✅ Create database
- ✅ Install Node.js packages

### Step 3: Create Admin Account

```powershell
cd backend
.venv\Scripts\activate
python manage.py createsuperuser
```

Follow the prompts to create your admin account.

### Step 4: Start Services

**Using PowerShell:**

Terminal 1 - Backend:
```powershell
cd backend
.\start-backend-windows.ps1
# Backend will run on http://localhost:8000
```

Terminal 2 - Frontend:
```powershell
cd frontend-react
.\start-frontend-windows.ps1
# Frontend will run on http://localhost:3000
```

**Or using Command Prompt:**

Terminal 1 - Backend:
```cmd
cd backend
start-backend-windows.bat
```

Terminal 2 - Frontend:
```cmd
cd frontend-react
npm run dev
```

### Step 5: Access the Application

- **Frontend**: http://localhost:3000
- **Backend Admin**: http://localhost:8000/admin
- **API Documentation**: http://localhost:8000/api

## 🔧 Troubleshooting

### Issue: "PowerShell script disabled on this system"

**Solution**: Run in PowerShell as Administrator:
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### Issue: "Python not found"

**Solution**: 
1. Reinstall Python from https://www.python.org/downloads/
2. **IMPORTANT**: Check "Add Python to PATH" during installation
3. Restart PowerShell after installation

### Issue: Tesseract OCR not found

**Solution**:
1. Download from: https://github.com/UB-Mannheim/tesseract/wiki
2. Install (default path: C:\Program Files\Tesseract-OCR)
3. Add to backend\.env:
   ```
   TESSERACT_CMD=C:\Program Files\Tesseract-OCR\tesseract.exe
   ```

### Issue: spaCy model download fails

**Solution**:
```powershell
cd backend
.venv\Scripts\activate
python -m spacy download en_core_web_sm --upgrade
```

### Issue: "Cannot find module" errors

**Solution**:
```powershell
# Backend
cd backend
.venv\Scripts\activate
pip install -r requirements.txt --upgrade

# Frontend
cd frontend-react
npm install
npm ci
```

### Issue: Port already in use (8000 or 3000)

**Solution**: Find and stop the process using the port:
```powershell
# Find process using port 8000
netstat -ano | findstr :8000

# Kill process (replace PID with actual process ID)
taskkill /PID <PID> /F
```

## 📚 Manual Setup (if script doesn't work)

### Backend Setup

```powershell
# Navigate to backend
cd backend

# Create virtual environment
python -m venv .venv

# Activate virtual environment
.venv\Scripts\Activate.ps1

# Install dependencies
pip install --upgrade pip setuptools wheel
pip install -r requirements.txt

# Download spaCy model
python -m spacy download en_core_web_sm

# Run migrations
python manage.py migrate

# Create superuser
python manage.py createsuperuser

# Start backend
python manage.py runserver
```

### Frontend Setup

```powershell
# Navigate to frontend
cd frontend-react

# Install dependencies
npm install

# Create .env.local
# Add this content:
# NEXT_PUBLIC_API_URL=http://localhost:8000/api

# Start frontend
npm run dev
```

## 🧠 Train AI Models

The project requires trained AI models. To train them:

```powershell
cd backend
.venv\Scripts\Activate.ps1

# Train all models (takes 15-30 minutes depending on your computer)
python train_all_models.sh

# Or train specific models
python train_free_distilbert.py
```

Models will be saved in `backend/ai_models/`

## 🐳 Using Docker (Alternative)

If you have Docker Desktop installed:

```powershell
# Start services
docker-compose -f docker/docker-compose.dev.yml up

# Or in background
docker-compose -f docker/docker-compose.dev.yml up -d

# View logs
docker-compose -f docker/docker-compose.dev.yml logs -f

# Stop services
docker-compose -f docker/docker-compose.dev.yml down
```

## ✅ Testing Your Setup

### Test Backend API

```powershell
# In PowerShell, test the API
Invoke-WebRequest -Uri "http://localhost:8000/api/health" -Method Get
```

### Test Frontend

Open browser to http://localhost:3000

### Test Database

```powershell
cd backend
.venv\Scripts\Activate.ps1
python manage.py shell
# In shell:
# from apps.users.models import User
# print(User.objects.count())
```

## 🆘 Getting Help

If you encounter issues:

1. Check this guide again
2. Read the error message carefully
3. Search in the GitHub Issues: https://github.com/abuhanif27/phd_Nexus/issues
4. Create a new issue with:
   - Your Windows version
   - Python version output (`python --version`)
   - Full error message
   - Steps to reproduce

## 📝 Environment Variables

### Backend (.env in backend folder)

```dotenv
# Django Settings
DEBUG=1
DJANGO_SECRET=your-secret-key-here

# Database
DATABASE_URL=sqlite:///db.sqlite3

# CORS for Frontend
CORS_ALLOWED_ORIGINS=http://localhost:3000

# Tesseract OCR
TESSERACT_CMD=C:\Program Files\Tesseract-OCR\tesseract.exe

# Optional: Redis for caching
REDIS_URL=redis://localhost:6379/0
```

### Frontend (.env.local in frontend-react folder)

```dotenv
NEXT_PUBLIC_API_URL=http://localhost:8000/api
```

## 🎯 Next Steps After Setup

1. **Create Admin Account**: Log in at http://localhost:8000/admin
2. **Add Patients**: Use the admin panel or frontend
3. **Upload Records**: Add medical records for patients
4. **Train AI Models**: Run the model training script
5. **Test AI Analysis**: Use the AI insights feature

## 🔒 Security Notes

- ⚠️ **NEVER** commit `.env` files to Git
- ⚠️ **Change** `DJANGO_SECRET` before deployment
- ⚠️ **Use** strong superuser password
- ⚠️ **Enable** HTTPS in production (not needed for local development)

---

**Need help?** Read docs: [README.md](README.md) | [SETUP.md](SETUP.md) | [backend/API_DOCS.md](backend/API_DOCS.md)

Happy coding! 🚀
