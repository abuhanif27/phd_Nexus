# Heroku Deployment Guide (Student Plan - $13/month)

## Cost Breakdown

| Service | Cost |
|---------|------|
| Heroku Eco Dyno (backend) | ~$5/month |
| Heroku Postgres Mini | $5/month |
| Heroku Redis Mini | $3/month |
| **Total** | **$13/month** ✅ |
| Vercel (frontend) | FREE |

## Architecture

```
User → Vercel (frontend, free)
         ↓ API calls
       Heroku (backend, $13/month)
         ├── PostgreSQL
         ├── Redis (WebSocket + Celery)
         └── HF Inference API (AI, free tier)
```

---

## Step 1: Install Heroku CLI

```bash
# Linux
curl https://cli-assets.heroku.com/install.sh | sh

# Login
heroku login
```

## Step 2: Deploy Backend to Heroku

```bash
cd /home/hn/Desktop/CODE/phd_Nexus

# Create Heroku app
heroku create nexuscare-api

# Add buildpacks (order matters)
heroku buildpacks:add --index 1 heroku-community/apt
heroku buildpacks:add --index 2 heroku/python

# Add add-ons
heroku addons:create heroku-postgresql:mini
heroku addons:create heroku-redis:mini

# Set the backend subdirectory as the deploy target
# We need to push only the backend folder
# Option A: Use git subtree
git subtree push --prefix backend heroku main

# Option B: If subtree doesn't work, set project root config
heroku config:set PROJECT_PATH=backend
```

**Wait — Heroku deploys from git root.** Since your backend is in a subdirectory, use this approach:

```bash
# Tell Heroku to use requirements-heroku.txt
cd backend

# Create a separate git repo for Heroku deployment
# OR use the monorepo buildpack:

# RECOMMENDED: Use heroku-buildpack-monorepo
heroku buildpacks:clear
heroku buildpacks:add https://github.com/lstoll/heroku-buildpack-monorepo
heroku buildpacks:add heroku-community/apt
heroku buildpacks:add heroku/python

heroku config:set APP_BASE=backend
```

## Step 3: Set Environment Variables

```bash
# Generate secret key
SECRET=$(python3 -c "import secrets; print(secrets.token_urlsafe(64))")

heroku config:set \
  DJANGO_SECRET="$SECRET" \
  DEBUG=0 \
  ALLOWED_HOSTS="nexuscare-api-XXXXX.herokuapp.com" \
  SECURE_SSL_REDIRECT=False \
  USE_HF_INFERENCE_API=True \
  USE_LOCAL_AI_MODELS=False \
  USE_HF_MODELS=False \
  HF_TOKEN="your_hf_token_here" \
  HF_LLM_MODEL="openai/gpt-oss-20b" \
  HF_EMBEDDING_MODEL="sentence-transformers/all-MiniLM-L6-v2" \
  HF_NER_MODEL="d4data/biomedical-ner-all" \
  HF_OCR_MODEL="microsoft/trocr-base-printed" \
  FRONTEND_URL="https://nexuscare.vercel.app" \
  CORS_ALLOWED_ORIGINS="https://nexuscare.vercel.app" \
  EMAIL_HOST_USER="your_email@gmail.com" \
  EMAIL_APP_PASSWORD="your_app_password" \
  JWT_ACCESS_MIN=15 \
  JWT_REFRESH_DAYS=7 \
  AI_LOCAL_FALLBACK_MODE=disabled
```

> Note: `DATABASE_URL` and `REDIS_URL` are automatically set by Heroku add-ons.

## Step 4: Deploy

```bash
# From project root
git add .
git commit -m "feat: heroku deployment config"

# Push backend to Heroku
git subtree push --prefix backend heroku main
```

If subtree gives issues:

```bash
# Alternative: push entire repo with monorepo buildpack
git push heroku main
```

## Step 5: Post-Deploy

```bash
# Run migrations (also runs via release phase, but just in case)
heroku run python manage.py migrate

# Create superuser
heroku run python manage.py createsuperuser

# Check logs
heroku logs --tail
```

## Step 6: Deploy Frontend to Vercel (FREE)

```bash
# Install Vercel CLI
npm i -g vercel

cd frontend

# Deploy
vercel

# When prompted:
# - Link to existing project? No
# - Project name: nexuscare
# - Framework: Next.js
# - Root directory: ./

# Set environment variables in Vercel dashboard or CLI:
vercel env add NEXT_PUBLIC_API_BASE_URL
# Enter: https://nexuscare-api-XXXXX.herokuapp.com

vercel env add NEXT_PUBLIC_APP_NAME
# Enter: NexusCare

vercel env add NEXT_PUBLIC_ENV
# Enter: production

# Redeploy with env vars
vercel --prod
```

---

## Troubleshooting

### "Slug size too large"
You're including heavy ML packages. Make sure Heroku uses `requirements-heroku.txt`:
```bash
# Rename for Heroku
cp backend/requirements-heroku.txt backend/requirements.txt
# (before pushing to Heroku)
```

### WebSocket not connecting
Heroku Eco dynos support WebSocket. Make sure frontend connects to `wss://nexuscare-api-XXXXX.herokuapp.com/ws/...`

### App sleeping (Eco dyno)
Eco dynos sleep after 30 min of inactivity. First request after sleep takes ~5-10 seconds. This is normal for $5/month.

### Database connection errors
```bash
heroku pg:info  # Check DB status
heroku pg:psql  # Connect directly
```

---

## What Works on This Setup

| Feature | Status |
|---------|--------|
| Auth/Login/Register | ✅ |
| Patient/Doctor CRUD | ✅ |
| Appointments/Scheduling | ✅ |
| AI Symptom Analysis (HF API) | ✅ |
| Prescription OCR (Tesseract) | ✅ |
| Real-time Chat (WebSocket) | ✅ |
| File uploads | ✅ (stored on Heroku ephemeral disk — use S3 for permanent) |
| Email notifications | ✅ |

---

## Optional: Permanent File Storage (Patient Records)

Heroku's filesystem is **ephemeral** — uploaded files vanish on dyno restart. Use one of these free options:

### Option A: Cloudflare R2 (BEST — 10GB free, no egress fees)

1. Go to https://dash.cloudflare.com → R2 → Create bucket → Name: `nexuscare-records`
2. Go to R2 → Manage R2 API Tokens → Create API Token
3. Get: Account ID, Access Key ID, Secret Access Key

```bash
heroku config:set \
  USE_CLOUD_STORAGE=1 \
  AWS_ACCESS_KEY_ID="your_r2_access_key" \
  AWS_SECRET_ACCESS_KEY="your_r2_secret_key" \
  AWS_STORAGE_BUCKET_NAME="nexuscare-records" \
  AWS_S3_ENDPOINT_URL="https://YOUR_ACCOUNT_ID.r2.cloudflarestorage.com" \
  AWS_S3_REGION_NAME="auto"
```

### Option B: Supabase Storage (1GB free, easiest)

1. Go to https://supabase.com → New Project
2. Go to Settings → API → Get project URL and service_role key
3. Go to Storage → Create bucket `patient-records`

```bash
heroku config:set \
  USE_CLOUD_STORAGE=1 \
  AWS_ACCESS_KEY_ID="your_supabase_project_id" \
  AWS_SECRET_ACCESS_KEY="your_service_role_key" \
  AWS_STORAGE_BUCKET_NAME="patient-records" \
  AWS_S3_ENDPOINT_URL="https://YOUR_PROJECT.supabase.co/storage/v1/s3" \
  AWS_S3_REGION_NAME="us-east-1"
```

### Option C: Cloudinary (25GB free, images/PDFs only)

```bash
heroku addons:create cloudinary:starter
# Automatically configured, but needs django-cloudinary-storage package
```

> **Recommendation:** Use Cloudflare R2. 10GB free, S3-compatible, private by default, signed URLs for secure access to patient records.
