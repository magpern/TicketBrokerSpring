# Windows Development Setup Guide

## Prerequisites

- Java 17+ installed
- Maven 3.9+ installed
- Node.js 18+ installed
- Network access to Raspberry Pi at 192.168.1.151

## Step 1: Backend Setup

### 1.1 Environment Variables

The `.env` file has been created in the `backend` directory with:
- `POSTGRES_DEV_PASSWORD=raspberry`
- `POSTGRES_PROD_PASSWORD=LblG88lVAaXyHT50in6m`

**Note**: Update passwords later as needed.

### 1.2 Test Database Connection

Verify you can connect to the Raspberry Pi databases:

```powershell
# Test dev database port
Test-NetConnection -ComputerName 192.168.1.151 -Port 5432

# Test prod database port
Test-NetConnection -ComputerName 192.168.1.151 -Port 5433
```

### 1.3 Run Backend (Development Mode)

```powershell
cd backend
$env:POSTGRES_DEV_PASSWORD="raspberry"
mvn spring-boot:run -Dspring-boot.run.profiles=dev
```

The backend will:
- Connect to `192.168.1.151:5432/ticketbroker_dev`
- Run on http://localhost:8080
- Run Flyway migrations automatically

### 1.4 Verify Backend is Running

Open browser: http://localhost:8080/api/public/settings

You should see JSON response with settings.

## Step 2: Frontend Setup

### 2.1 Install Dependencies

```powershell
cd frontend
npm install
```

### 2.2 Run Frontend

```powershell
npm run dev
```

Frontend will be available at: http://localhost:5173

### 2.3 Verify Frontend Connection

The frontend is configured to proxy API requests to `http://localhost:8080` (see `vite.config.ts`).

## Step 3: Running Both Services

### Option A: Two Terminal Windows

**Terminal 1 - Backend:**
```powershell
cd backend
$env:POSTGRES_DEV_PASSWORD="raspberry"
mvn spring-boot:run -Dspring-boot.run.profiles=dev
```

**Terminal 2 - Frontend:**
```powershell
cd frontend
npm run dev
```

### Option B: PowerShell Script

Create `start-dev.ps1` in the root directory:

```powershell
# Start Backend
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd backend; `$env:POSTGRES_DEV_PASSWORD='raspberry'; mvn spring-boot:run -Dspring-boot.run.profiles=dev"

# Wait a bit for backend to start
Start-Sleep -Seconds 5

# Start Frontend
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd frontend; npm run dev"
```

## Step 4: Access the Application

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:8080
- **API Docs**: http://localhost:8080/api/public/settings

## Troubleshooting

### Backend won't start

1. **Check Java version:**
   ```powershell
   java -version
   ```
   Should be Java 17 or higher.

2. **Check Maven:**
   ```powershell
   mvn -version
   ```

3. **Check database connection:**
   ```powershell
   Test-NetConnection -ComputerName 192.168.1.151 -Port 5432
   ```

4. **Check environment variable:**
   ```powershell
   $env:POSTGRES_DEV_PASSWORD
   ```

### Frontend can't connect to backend

1. Verify backend is running on port 8080
2. Check browser console for errors
3. Verify `vite.config.ts` has correct proxy configuration

### Database connection errors

1. Verify Raspberry Pi is accessible:
   ```powershell
   ping 192.168.1.151
   ```

2. Check database credentials match:
   - Your `.env` file: `POSTGRES_DEV_PASSWORD=raspberry`
   - Raspberry Pi: `/home/magpern/dockerticket/.env`

3. Verify Docker services are running on Raspberry Pi:
   ```bash
   ssh magpern@192.168.1.151
   cd /home/magpern/dockerticket
   docker compose ps
   ```

## Production Mode

To run with production database:

```powershell
cd backend
$env:POSTGRES_PROD_PASSWORD="LblG88lVAaXyHT50in6m"
mvn spring-boot:run -Dspring-boot.run.profiles=prod
```

## Next Steps

1. Run database migrations (Flyway will run automatically on startup)
2. Test the API endpoints
3. Test the frontend booking flow
4. Set up email configuration if needed

