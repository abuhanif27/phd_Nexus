# Production Deployment Guide

## Prerequisites

- Docker & Docker Compose v2+
- Domain with DNS pointing to your server
- SSL certificate (use Let's Encrypt / Certbot)

## Quick Deploy

```bash
# 1. Clone and enter project
git clone <repo-url> && cd phd_Nexus

# 2. Configure environment
cp backend/.env.production backend/.env
# Edit backend/.env with real values (see Environment Variables below)

# 3. Generate a secret key
python3 -c "import secrets; print(secrets.token_urlsafe(64))"
# Paste output into DJANGO_SECRET in backend/.env

# 4. Set DB password
export DB_PASSWORD="your-strong-db-password"

# 5. Build and start
cd docker
docker compose -f docker-compose.prod.yml up -d --build

# 6. Run migrations and create superuser
docker exec nexuscare_backend python manage.py migrate
docker exec -it nexuscare_backend python manage.py createsuperuser

# 7. Train AI models (first deploy only)
docker exec nexuscare_backend python manage.py train_sklearn
```

App is now running at `http://your-server:80`.

## Environment Variables

### Backend (backend/.env)

| Variable | Required | Description |
|----------|----------|-------------|
| `DJANGO_SECRET` | ✅ | 64+ char random string |
| `DEBUG` | ✅ | Must be `0` in production |
| `ALLOWED_HOSTS` | ✅ | Comma-separated domains |
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `REDIS_URL` | ✅ | Redis connection string |
| `FRONTEND_URL` | ✅ | Frontend origin for CORS |
| `HF_TOKEN` | ✅ | Hugging Face API token |
| `EMAIL_HOST_USER` | ⚠️ | For email notifications |
| `EMAIL_APP_PASSWORD` | ⚠️ | Gmail app password |

### Frontend (build-time)

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_API_BASE_URL` | Backend API URL |
| `NEXT_PUBLIC_APP_NAME` | Display name |
| `NEXT_PUBLIC_ENV` | `production` |

## SSL/HTTPS Setup

Add a Certbot container or use a reverse proxy (Cloudflare, AWS ALB). For Certbot:

```bash
# Install certbot on host
sudo apt install certbot
sudo certbot certonly --standalone -d your-domain.com

# Mount certs into nginx container (update docker-compose.prod.yml):
# volumes:
#   - /etc/letsencrypt:/etc/letsencrypt:ro
```

Then update `docker/nginx.conf` to listen on 443 with SSL.

## Operations

```bash
# View logs
docker compose -f docker-compose.prod.yml logs -f backend

# Restart a service
docker compose -f docker-compose.prod.yml restart backend

# Run migrations after code update
docker exec nexuscare_backend python manage.py migrate

# Backup database
docker exec nexuscare_db pg_dump -U nexuscare nexuscare > backup_$(date +%Y%m%d).sql

# Restore database
cat backup.sql | docker exec -i nexuscare_db psql -U nexuscare nexuscare

# Scale (if needed)
docker compose -f docker-compose.prod.yml up -d --scale backend=2
```

## Update Deployment

```bash
cd docker
git pull origin main
docker compose -f docker-compose.prod.yml up -d --build
docker exec nexuscare_backend python manage.py migrate
```

## Architecture

```
Client → Nginx (:80/443)
            ├── /api/, /ws/, /admin/, /static/, /media/ → Backend (Daphne :8000)
            └── / → Frontend (Next.js :3000)

Backend → PostgreSQL (:5432)
       → Redis (:6379)
```

## Security Checklist

- [ ] `DJANGO_SECRET` is a unique random value
- [ ] `DEBUG=0`
- [ ] HTTPS enabled with valid certificate
- [ ] Database password is strong and unique
- [ ] `.env` file is not committed to git
- [ ] Firewall allows only ports 80/443
- [ ] HF_TOKEN has minimal required permissions
- [ ] Email credentials use app-specific password
- [ ] Regular database backups configured
