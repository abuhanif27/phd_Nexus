# 🚀 Setup Guide for Beginners

## ⚠️ IMPORTANT: AI Models Not Included

**Why are AI model files missing?**

- GitHub has a 100 MB file size limit per file
- Our trained PyTorch model is 253 MB (too large!)
- The scikit-learn model files (.joblib) are also excluded
- **Solution:** You need to train the models on your own computer (it's easy!)

## 📋 Prerequisites

Before starting, make sure you have:

1. **Python 3.10 or newer**

   - Download: https://www.python.org/downloads/
   - ✅ During installation, check "Add Python to PATH"

2. **Tesseract OCR** (for reading text from medical documents)

   - **Linux**: `sudo apt-get install tesseract-ocr`

3. **Git** (to download the project)
   - Download: https://git-scm.com/downloads

## 🎯 Complete Setup (Step-by-Step)

### Step 1: Download the Project

```bash
# Clone the repository
git clone https://github.com/abuhanif27/phd_Nexus.git

# Go into the project folder
cd phd_Nexus
```

### Step 2: Set Up Backend

```bash
# Go to backend folder
cd backend

# Create virtual environment
python3 -m venv .venv

# Activate virtual environment
source .venv/bin/activate

# Install Python packages (takes 2-3 minutes)
pip install -r requirements.txt

# Download spaCy language model
python -m spacy download en_core_web_sm

# Set up database
python manage.py migrate

# Create admin account (follow the prompts)
python manage.py createsuperuser

# (Optional) Load demo data
python manage.py seed_demo
```

### Step 3: 🤖 Train AI Models (REQUIRED!)

**This is the most important step for first-time setup!**

Without training the models, the AI features won't work. Don't worry, it's automatic!

```bash
# Still in backend folder with virtual environment activated

# Option 1: Quick Training (Recommended for beginners)
# Takes 30-60 seconds, 85-90% accuracy
python manage.py train_sklearn

# Option 2: Best Accuracy (For advanced users)
# Takes 5-15 minutes, 95-96% accuracy
python manage.py train_pytorch --epochs 10

# Option 3: Train Both (Best of both worlds)
chmod +x train_all_models.sh
./train_all_models.sh
```

**What to expect:**

```
Training specialist classifier...
Loading data from: /path/to/backend/data/symptoms_train.csv
Found 1200 training samples
Training model...
Training complete!
Accuracy: 89.45%
Model saved to: /path/to/backend/ai_models/specialist_clf_sklearn.joblib
✓ Done!
```

**After successful training, you'll see:**

- Files created in `backend/ai_models/` directory
- `specialist_clf_sklearn.joblib` (scikit-learn model)
- OR `specialist_clf_pytorch.pt` (PyTorch model)
- Labels file: `specialist_clf_labels.json`

### Step 4: Start the Backend Server

```bash
# In backend folder with virtual environment activated
python manage.py runserver
```

**You should see:**

```
✓ Loaded specialist classifier
System check identified no issues (0 silenced).
Starting development server at http://127.0.0.1:8000/
```

✅ **If you see "✓ Loaded specialist classifier"** - Great! AI models are working!
❌ **If you see "⚠ No trained classifier found"** - Go back to Step 3 and train the models

**Keep this terminal open!**

### Step 5: Start the Frontend

Open a new terminal:

```bash
# Go to frontend folder
cd frontend

# Install dependencies (first time only)
npm install

# Start the React/Next.js dev server
npm run dev
```

### Step 6: Access the Application

Open your browser and visit:

- **🌐 Main Website:** http://localhost:3000
- **👨‍⚕️ Admin Panel:** http://localhost:8000/admin
- **🔌 API Docs:** http://localhost:8000/api

**Demo Accounts (if you loaded demo data):**

- Patient: `patient@example.com` / `Pass1234!`
- Doctor: `doctor@example.com` / `Pass1234!`

## 🎯 Quick Start Scripts (Easiest Method)

Instead of running each command separately, use our quick-start scripts:

**All-in-One Launch:**

```bash
# From project root directory
./start-all.sh
```

This will:

- ✅ Start backend server
- ✅ Start frontend server
- ✅ Open browser automatically

**Stop All Services:**

```bash
./stop-all.sh
```

## ❓ Troubleshooting Common Issues

### Issue 1: "FileNotFoundError: Trained model not found"

**Problem:** You haven't trained the AI models yet.

**Solution:**

```bash
cd backend
source .venv/bin/activate
python manage.py train_sklearn
```

### Issue 2: "ModuleNotFoundError: No module named 'django'"

**Problem:** Virtual environment not activated.

**Solution:**

```bash
cd backend
source .venv/bin/activate
```

### Issue 3: "python: command not found"

**Problem:** Need to use `python3` instead of `python`.

**Solution:** Replace `python` with `python3` in all commands.

### Issue 4: Port already in use (8000 or 3000)

**Problem:** Another application is using the port.

**Solution:**

```bash
# Find and kill the process using the port
lsof -ti:8000 | xargs kill -9
lsof -ti:3000 | xargs kill -9
```

### Issue 5: AI analysis returns "No trained classifier"

**Problem:** Model files are missing or not loaded.

**Solution:**

1. Check if files exist in `backend/ai_models/`
2. If missing, train the models (Step 3)
3. Restart the backend server

## 📝 What Gets Created During Setup?

After setup, your project structure will look like:

```
phd_Nexus/
├── backend/
│   ├── .venv/                          # Virtual environment
│   ├── db.sqlite3                      # Database (created after migrate)
│   ├── ai_models/
│   │   ├── specialist_clf_sklearn.joblib    # ✅ YOU CREATE THIS
│   │   ├── specialist_clf_pytorch.pt        # ✅ YOU CREATE THIS (optional)
│   │   └── specialist_clf_labels.json       # ✅ YOU CREATE THIS
│   └── media/                          # Uploaded files
└── frontend/
    └── (no changes)
```

## 🎓 Understanding the Training Data

The AI models are trained on:

- **File:** `backend/data/symptoms_train.csv`
- **Size:** ~1200 medical symptom records
- **Specialists:** 11 categories (Cardiologist, Dermatologist, etc.)
- **Format:** Symptom text → Recommended specialist

**Example:**

```
symptom,specialist
"chest pain shortness of breath","Cardiologist"
"skin rash itching","Dermatologist"
"fever cough headache","General Physician"
```

## ✅ Verification Checklist

After setup, verify everything works:

- [ ] Backend server running at http://localhost:8000
- [ ] Frontend accessible at http://localhost:3000
- [ ] Can login to admin panel
- [ ] AI models loaded successfully (check server logs)
- [ ] Can create a patient account
- [ ] Can analyze symptoms (AI features work)
- [ ] Can upload medical records

## 🎉 Success!

If all the above checks pass, congratulations! Your PhD NexusCare installation is complete and ready to use.

### Next Steps:

1. **Read the User Guide** - Learn how to use all features
2. **Explore the Admin Panel** - Manage users and data
3. **Try AI Features** - Test symptom analysis
4. **Upload Records** - Add your medical documents
5. **Book Appointments** - Schedule with doctors

## 📚 Additional Resources

- **[backend.md](backend.md)** - Backend API documentation
- **[frontend.md](frontend.md)** - Frontend features guide
- **[ai.md](ai.md)** - AI models detailed explanation
- **[API_DOCS.md](backend/API_DOCS.md)** - Complete API reference

## 🆘 Still Having Issues?

1. Check the terminal output for error messages
2. Make sure all prerequisites are installed
3. Verify Python version: `python --version` (should be 3.10+)
4. Ensure virtual environment is activated (you should see `(.venv)` in terminal)
5. Check if all required ports (8000, 3000) are free

---

**Built for PhD NexusCare - Healthcare Platform** 🏥
