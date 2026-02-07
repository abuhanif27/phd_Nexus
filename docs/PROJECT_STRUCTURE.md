# 📁 Project Structure

```
phd_Nexus/
├── backend/              # Django REST API
│   ├── ai_models/        # Trained ML models
│   ├── apps/             # Django apps (ai, billing, consent, etc.)
│   ├── data/             # Training data
│   ├── manage.py         # Django management
│   └── train_free_distilbert.py  # Model training script
│
├── frontend/             # React + Next.js frontend (main)
│   ├── app/              # Next.js app directory
│   ├── components/       # React components
│   ├── features/         # Feature modules
│   └── package.json      # Dependencies
│
├── docker/               # Docker configurations
│
├── docs/                 # Documentation
│   ├── ai.md             # AI system docs
│   ├── backend.md        # Backend docs
│   ├── frontend.md       # Frontend docs
│   ├── CLEANUP_SUMMARY.md
│   ├── FREE_DISTILBERT_SOLUTION.md
│   └── images/           # Screenshots
│
├── logs/                 # Log files (gitignored)
│
├── README.md             # Project overview
├── SETUP.md              # Setup instructions
├── requirements.txt      # Python dependencies
├── launch.sh             # Quick launch script
├── start-all.sh          # Start all services
└── stop-all.sh           # Stop all services
```

## 🚀 Quick Start

```bash
# Backend
cd backend
python manage.py runserver

# Frontend (React)
cd frontend
npm run dev
```

See `SETUP.md` for detailed instructions.
