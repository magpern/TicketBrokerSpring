# Quick script to update Raspberry Pi containers with new images
# Usage: .\update-pi-images.ps1 [version]
# Example: .\update-pi-images.ps1 v1.0.5

param(
    [string]$Version = "latest",
    [string]$PiHost = "192.168.1.151",
    [string]$PiUser = "magpern"
)

Write-Host "Updating containers on Raspberry Pi to version $Version..." -ForegroundColor Cyan
Write-Host ""

$commands = @"
cd ~/TicketBrokerSpring
export IMAGE_TAG=$Version
docker-compose -f docker-compose.infrastructure.yml -f docker-compose.app.yml -f docker-compose.app.local.yml down
docker-compose -f docker-compose.infrastructure.yml -f docker-compose.app.yml -f docker-compose.app.local.yml up -d
docker-compose -f docker-compose.infrastructure.yml -f docker-compose.app.yml -f docker-compose.app.local.yml ps
"@

ssh "${PiUser}@${PiHost}" $commands

Write-Host ""
Write-Host "Done! Containers updated to version $Version" -ForegroundColor Green

