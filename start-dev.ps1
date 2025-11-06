# PowerShell script to start both backend and frontend
# Usage: .\start-dev.ps1

Write-Host "Starting TicketBroker Development Environment..." -ForegroundColor Green
Write-Host ""

# Set environment variable for backend
$env:POSTGRES_DEV_PASSWORD = "raspberry"

# Start Backend in new window
Write-Host "Starting Backend (Spring Boot)..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\backend'; `$env:POSTGRES_DEV_PASSWORD='raspberry'; Write-Host 'Starting Spring Boot Backend...' -ForegroundColor Green; mvn spring-boot:run -Dspring-boot.run.profiles=dev"

# Wait for backend to start
Write-Host "Waiting for backend to start..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

# Start Frontend in new window
Write-Host "Starting Frontend (React + Vite)..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\frontend'; Write-Host 'Starting React Frontend...' -ForegroundColor Green; npm run dev"

Write-Host ""
Write-Host "Development servers starting..." -ForegroundColor Green
Write-Host "Backend: http://localhost:8080" -ForegroundColor White
Write-Host "Frontend: http://localhost:5173" -ForegroundColor White
Write-Host ""
Write-Host "Press Ctrl+C to stop (close the PowerShell windows to stop servers)" -ForegroundColor Yellow

