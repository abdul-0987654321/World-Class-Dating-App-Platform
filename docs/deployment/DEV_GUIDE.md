# Flamoral Development Guide

Complete guide to running the Flamoral dating platform locally.

## Quick Start

### 1. Install Dependencies
```bash
yarn install
```

### 2. Start Databases
```bash
docker-compose up -d
```

### 3. Configure Environment
```bash
cp .env.example .env
# Edit .env with your configuration
```

### 4. Run Migrations
```bash
cd backend
yarn migrate
```

### 5. Start Servers
```bash
# Backend
yarn dev:backend

# Web App
yarn dev:web
```

## Access

- Web App: http://localhost:5173
- Backend API: http://localhost:3000
- API Docs: http://localhost:3000/api-docs

## Test Accounts

- User: demo@flamoral.com / Demo123!
- Premium: premium@flamoral.com / Premium123!
- Admin: admin@flamoral.com / Admin123!

For complete documentation, see DOCUMENTATION/ folder.
