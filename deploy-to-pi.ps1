# Deploy script - builds and transfers images to Raspberry Pi (Windows PowerShell)
# Usage: .\deploy-to-pi.ps1 [version]
# Example: .\deploy-to-pi.ps1 v1.0.3

param(
    [string]$Version = "latest",
    [string]$PiHost = "192.168.1.151",
    [string]$PiUser = "pi"
)

Write-Host "Building and deploying to Raspberry Pi..." -ForegroundColor Cyan
Write-Host "Version: $Version"
Write-Host "Target: ${PiUser}@${PiHost}"

# Build images
Write-Host ""
Write-Host "Step 1: Building images..." -ForegroundColor Yellow
& .\build-local.ps1 -Version $Version -PiHost $PiHost -PiUser $PiUser

# Save images
Write-Host ""
Write-Host "Step 2: Saving images..." -ForegroundColor Yellow
docker save ticketbroker-backend:$Version | gzip > backend-$Version.tar.gz
docker save ticketbroker-frontend:$Version | gzip > frontend-$Version.tar.gz

# Transfer to Pi
Write-Host ""
Write-Host "Step 3: Transferring to Raspberry Pi..." -ForegroundColor Yellow
scp backend-$Version.tar.gz frontend-$Version.tar.gz ${PiUser}@${PiHost}:~/

# Load on Pi
Write-Host ""
Write-Host "Step 4: Loading images on Raspberry Pi..." -ForegroundColor Yellow
ssh ${PiUser}@${PiHost} "gunzip -c backend-$Version.tar.gz | docker load"
ssh ${PiUser}@${PiHost} "gunzip -c frontend-$Version.tar.gz | docker load"

# Cleanup local files
Write-Host ""
Write-Host "Step 5: Cleaning up local files..." -ForegroundColor Yellow
Remove-Item -Force backend-$Version.tar.gz, frontend-$Version.tar.gz -ErrorAction SilentlyContinue

Write-Host ""
Write-Host "Deployment complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Images are now available on the Raspberry Pi:" -ForegroundColor Cyan
Write-Host "  - ticketbroker-backend:$Version"
Write-Host "  - ticketbroker-frontend:$Version"
Write-Host ""
Write-Host "You can now update your docker-compose.yml on the Pi to use these images."

