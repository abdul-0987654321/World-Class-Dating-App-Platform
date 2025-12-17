# Docker Setup Instructions

**Issue:** Docker Hub Authentication Required
**Status:** Email verification needed
**Date:** November 15, 2025

---

## 🚨 Current Issue

Docker Hub requires email verification before images can be pulled:

```
Error: authentication required - email must be verified before using account
```

---

## ✅ Solution Steps

### Option 1: Verify Docker Hub Email (Recommended)

1. **Check your email** for Docker Hub verification email
2. **Click the verification link** in the email
3. **Restart Docker Desktop**
   ```bash
   # Windows
   Restart-Service docker

   # Or close and reopen Docker Desktop
   ```
4. **Try pulling images again**
   ```bash
   cd World-Class-Dating-App-Platform
   docker-compose up -d
   ```

### Option 2: Login to Docker Hub

1. **Login via Docker Desktop**
   - Open Docker Desktop
   - Click "Sign in" in the top right
   - Enter your credentials

2. **Or login via command line**
   ```bash
   docker login
   # Enter username and password
   ```

3. **Verify login**
   ```bash
   docker info | grep Username
   ```

4. **Start services**
   ```bash
   docker-compose up -d
   ```

### Option 3: Create New Docker Hub Account

If you don't have a Docker Hub account or can't access the email:

1. **Create account** at https://hub.docker.com/signup
2. **Verify email** immediately
3. **Login to Docker Desktop** with new credentials
4. **Start services**

---

## 🐳 Starting Infrastructure Services

Once Docker Hub is authenticated, run:

```bash
# Navigate to project root
cd C:\Users\Dell\OneDrive\Desktop\World-Class-Dating-App-Platform\World-Class-Dating-App-Platform

# Start all services
docker-compose up -d

# Verify services are running
docker-compose ps

# View logs
docker-compose logs -f
```

### Expected Services

When running successfully, you should see:

```
NAME                SERVICE             STATUS
postgres            postgres            running
redis               redis               running
elasticsearch       elasticsearch       running
azurite             azurite             running
pgadmin             pgadmin             running
redis-commander     redis-commander     running
mailhog             mailhog             running
```

---

## 🔧 Troubleshooting

### "Network error" or "timeout"

**Issue:** Network connectivity or firewall

**Solution:**
```bash
# Check Docker daemon is running
docker info

# Restart Docker Desktop
# Windows: Restart Docker Desktop application

# Check firewall settings
# Ensure Docker Desktop can access internet
```

### "Port already in use"

**Issue:** Port conflict with existing services

**Solution:**
```bash
# Find which ports are in use
netstat -ano | findstr :5432  # PostgreSQL
netstat -ano | findstr :6379  # Redis

# Stop conflicting services or modify docker-compose.yml ports
```

### "Out of disk space"

**Issue:** Docker running out of space

**Solution:**
```bash
# Clean up Docker
docker system prune -a

# Remove unused volumes
docker volume prune

# Check disk space
docker system df
```

---

## 📋 Post-Setup Verification

Once services are running, verify:

### 1. Check PostgreSQL
```bash
docker exec -it postgres psql -U postgres -c "SELECT version();"
```

Expected output:
```
PostgreSQL 15.x on x86_64-pc-linux-musl...
```

### 2. Check Redis
```bash
docker exec -it redis redis-cli ping
```

Expected output:
```
PONG
```

### 3. Access Web UIs

- **pgAdmin:** http://localhost:5050
  - Email: admin@flamoral.com
  - Password: admin

- **Redis Commander:** http://localhost:8081

- **Mailhog:** http://localhost:8025

### 4. Run Database Migrations

```bash
cd backend/services/user-service
npm run migrate
```

Expected output:
```
✅ Batch 1 run: 5 migrations
```

---

## 🚀 Next Steps After Setup

Once all services are running:

1. **Run Database Migrations**
   ```bash
   cd backend/services/user-service
   npm run migrate
   ```

2. **Start User Service**
   ```bash
   npm run dev
   ```

3. **Test API Endpoints**
   ```bash
   # Health check
   curl http://localhost:3001/health

   # Register user
   curl -X POST http://localhost:3001/api/auth/register \
     -H "Content-Type: application/json" \
     -d '{
       "email": "test@example.com",
       "password": "Test123!@#",
       "first_name": "John",
       "last_name": "Doe",
       "date_of_birth": "1995-01-15",
       "gender": "male"
     }'
   ```

4. **Check Email in Mailhog**
   - Open http://localhost:8025
   - Verify verification email was sent

---

## 📞 Need Help?

### Common Resources
- Docker Desktop Documentation: https://docs.docker.com/desktop/
- Docker Hub: https://hub.docker.com/
- Project E2E Testing Guide: `docs/guides/E2E-Testing-Guide.md`

### Support
- Check Docker Desktop status bar
- View logs: `docker-compose logs`
- Restart services: `docker-compose restart`

---

## ✅ Quick Reference

```bash
# Start all services
docker-compose up -d

# Stop all services
docker-compose down

# View service status
docker-compose ps

# View logs
docker-compose logs -f

# Restart a service
docker-compose restart postgres

# Stop and remove everything
docker-compose down -v

# Rebuild images
docker-compose build
```

---

**Document Created:** November 15, 2025
**Status:** Ready for use after Docker Hub verification
**Next Action:** Verify Docker Hub email and login
