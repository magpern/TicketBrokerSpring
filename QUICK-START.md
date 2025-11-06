# Quick Start Guide

## One-Command Setup

Run the startup script to start both backend and frontend:

```powershell
.\start-dev.ps1
```

This will:
1. Start Spring Boot backend on http://localhost:8080
2. Start React frontend on http://localhost:5173
3. Open both in separate PowerShell windows

## Manual Setup

### Backend

```powershell
cd backend
$env:POSTGRES_DEV_PASSWORD="raspberry"
mvn spring-boot:run -Dspring-boot.run.profiles=dev
```

### Frontend

```powershell
cd frontend
npm install
npm run dev
```

## Access

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:8080
- **Test API**: http://localhost:8080/api/public/settings

## Database

- **Dev Database**: 192.168.1.151:5432/ticketbroker_dev
- **Prod Database**: 192.168.1.151:5433/ticketbroker_prod

Credentials are in `backend/.env` file.

