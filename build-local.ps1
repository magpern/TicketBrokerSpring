# Local build script for Raspberry Pi deployment (Windows PowerShell)
# Usage: .\build-local.ps1 [version]
# Example: .\build-local.ps1 v1.0.3

param(
    [string]$Version = "latest",
    [string]$PiHost = "192.168.1.151",
    [string]$PiUser = "magpern"
)

Write-Host "Building Docker images for Raspberry Pi (ARM64)..." -ForegroundColor Cyan
Write-Host "Version: $Version"
Write-Host "Target: ${PiUser}@${PiHost}"

# Build backend image for ARM64
Write-Host ""
Write-Host "Building backend image..." -ForegroundColor Yellow
docker buildx build `
  --platform linux/arm64 `
  -t ticketbroker-backend:$Version `
  -t ticketbroker-backend:latest `
  --load `
  ./backend

# Build frontend image for ARM64
Write-Host ""
Write-Host "Building frontend image..." -ForegroundColor Yellow
docker buildx build `
  --platform linux/arm64 `
  -t ticketbroker-frontend:$Version `
  -t ticketbroker-frontend:latest `
  --load `
  ./frontend

Write-Host ""
Write-Host "Images built successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "To transfer images to Raspberry Pi, use deploy-to-pi.ps1 or:" -ForegroundColor Cyan
Write-Host "  docker save ticketbroker-backend:$Version | gzip > backend-$Version.tar.gz"
Write-Host "  docker save ticketbroker-frontend:$Version | gzip > frontend-$Version.tar.gz"
Write-Host "  scp backend-$Version.tar.gz frontend-$Version.tar.gz ${PiUser}@${PiHost}:~/"
Write-Host "  ssh ${PiUser}@${PiHost} 'gunzip -c backend-$Version.tar.gz | docker load'"
Write-Host "  ssh ${PiUser}@${PiHost} 'gunzip -c frontend-$Version.tar.gz | docker load'"

