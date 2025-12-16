# One-click build and deploy script for Raspberry Pi
# Usage: .\deploy-to-raspberry.ps1 [version]
# Example: .\deploy-to-raspberry.ps1 v1.0.3

param(
    [string]$Version = "latest",
    [string]$PiHost = "192.168.1.151",
    [string]$PiUser = "magpern",
    [switch]$RestartContainers = $false
)

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Raspberry Pi Deployment Script" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Version: $Version" -ForegroundColor Yellow
Write-Host "Target: ${PiUser}@${PiHost}" -ForegroundColor Yellow
Write-Host ""

# Step 1: Build images
Write-Host "Step 1: Building Docker images for ARM64..." -ForegroundColor Green
Write-Host ""

try {
    # Check if buildx is available
    $buildxCheck = docker buildx version 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERROR: Docker buildx is not available. Please enable it in Docker Desktop settings." -ForegroundColor Red
        exit 1
    }

    # Build backend - BuildKit cache mount in Dockerfile will cache Maven dependencies
    Write-Host "  Building backend..." -ForegroundColor Cyan
    docker buildx build `
        --platform linux/arm64 `
        -t ticketbroker-backend:$Version `
        -t ticketbroker-backend:latest `
        --load `
        ./backend
    
    if ($LASTEXITCODE -ne 0) {
        throw "Backend build failed"
    }
    Write-Host "  ✓ Backend built successfully" -ForegroundColor Green

    # Build frontend - BuildKit cache mount in Dockerfile will cache npm dependencies
    Write-Host "  Building frontend..." -ForegroundColor Cyan
    docker buildx build `
        --platform linux/arm64 `
        -t ticketbroker-frontend:$Version `
        -t ticketbroker-frontend:latest `
        --load `
        ./frontend
    
    if ($LASTEXITCODE -ne 0) {
        throw "Frontend build failed"
    }
    Write-Host "  ✓ Frontend built successfully" -ForegroundColor Green
    Write-Host ""

} catch {
    Write-Host ""
    Write-Host "ERROR: Build failed - $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Step 2: Save images
Write-Host "Step 2: Saving images to compressed files..." -ForegroundColor Green
Write-Host ""

try {
    # Use absolute paths to avoid path issues
    $scriptDir = $PSScriptRoot
    if (-not $scriptDir) {
        $scriptDir = Get-Location
    }
    
    $backendTar = Join-Path $scriptDir "backend-$Version.tar"
    $frontendTar = Join-Path $scriptDir "frontend-$Version.tar"
    $backendFile = Join-Path $scriptDir "backend-$Version.tar.gz"
    $frontendFile = Join-Path $scriptDir "frontend-$Version.tar.gz"

    # Save backend as tar
    Write-Host "  Saving backend..." -ForegroundColor Cyan
    docker save ticketbroker-backend:$Version -o $backendTar
    if ($LASTEXITCODE -ne 0) {
        throw "Failed to save backend image"
    }
    if (-not (Test-Path $backendTar)) {
        throw "Backend tar file was not created: $backendTar"
    }

    # Compress using available tool
    Write-Host "  Compressing backend..." -ForegroundColor Cyan
    $useZip = $false
    
    # Try gzip first (check if it's actually available and works)
    $gzipAvailable = $false
    if (Get-Command gzip -ErrorAction SilentlyContinue) {
        # Try to use gzip - if it fails, fall back to other methods
        try {
            # Use cmd to properly handle binary redirection
            $null = cmd /c "gzip -c `"$backendTar`" > `"$backendFile`""
            if (Test-Path $backendFile) {
                $gzipAvailable = $true
                Remove-Item $backendTar -Force
            }
        } catch {
            $gzipAvailable = $false
        }
    }
    
    if (-not $gzipAvailable) {
        if (Get-Command 7z -ErrorAction SilentlyContinue) {
            # 7zip available - create gzip
            # 7z needs the output file to not exist, and we need to specify the format correctly
            $null = & 7z a -tgzip -y $backendFile $backendTar 2>&1
            Start-Sleep -Milliseconds 500  # Give 7zip time to finish
            if (Test-Path $backendFile) {
                Remove-Item $backendTar -Force
            } else {
                # 7zip failed, try PowerShell compression instead
                Write-Host "    7zip failed, using PowerShell compression..." -ForegroundColor Yellow
                $zipFile = "$backendFile.zip"
                Compress-Archive -Path $backendTar -DestinationPath $zipFile -Force
                Remove-Item $backendTar -Force
                $backendFile = $zipFile
                $useZip = $true
            }
        } else {
            # Fallback: Use PowerShell compression (creates .zip)
            $zipFile = "$backendFile.zip"
            Compress-Archive -Path $backendTar -DestinationPath $zipFile -Force
            Remove-Item $backendTar -Force
            $backendFile = $zipFile
            $useZip = $true
        }
    }
    
    if (-not (Test-Path $backendFile)) {
        throw "Backend compressed file was not created: $backendFile"
    }
    Write-Host "  ✓ Backend saved: $(Split-Path $backendFile -Leaf)" -ForegroundColor Green

    # Save frontend as tar
    Write-Host "  Saving frontend..." -ForegroundColor Cyan
    docker save ticketbroker-frontend:$Version -o $frontendTar
    if ($LASTEXITCODE -ne 0) {
        throw "Failed to save frontend image"
    }
    if (-not (Test-Path $frontendTar)) {
        throw "Frontend tar file was not created: $frontendTar"
    }

    # Compress frontend
    Write-Host "  Compressing frontend..." -ForegroundColor Cyan
    if ($useZip) {
        $zipFile = "$frontendFile.zip"
        Compress-Archive -Path $frontendTar -DestinationPath $zipFile -Force
        Remove-Item $frontendTar -Force
        $frontendFile = $zipFile
    } elseif ($gzipAvailable) {
        # Use same method as backend
        $null = cmd /c "gzip -c `"$frontendTar`" > `"$frontendFile`""
        if (Test-Path $frontendFile) {
            Remove-Item $frontendTar -Force
        } else {
            throw "gzip compression failed for frontend"
        }
    } elseif (Get-Command 7z -ErrorAction SilentlyContinue) {
        $null = & 7z a -tgzip -y $frontendFile $frontendTar 2>&1
        Start-Sleep -Milliseconds 500  # Give 7zip time to finish
        if (Test-Path $frontendFile) {
            Remove-Item $frontendTar -Force
        } else {
            # 7zip failed, try PowerShell compression instead
            Write-Host "    7zip failed, using PowerShell compression..." -ForegroundColor Yellow
            $zipFile = "$frontendFile.zip"
            Compress-Archive -Path $frontendTar -DestinationPath $zipFile -Force
            Remove-Item $frontendTar -Force
            $frontendFile = $zipFile
            $useZip = $true
        }
    }
    
    if (-not (Test-Path $frontendFile)) {
        throw "Frontend compressed file was not created: $frontendFile"
    }
    Write-Host "  ✓ Frontend saved: $(Split-Path $frontendFile -Leaf)" -ForegroundColor Green
    Write-Host ""

} catch {
    Write-Host ""
    Write-Host "ERROR: Failed to save images - $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Step 3: Transfer to Pi
Write-Host "Step 3: Transferring to Raspberry Pi..." -ForegroundColor Green
Write-Host ""

try {
    Write-Host "  Uploading files..." -ForegroundColor Cyan
    
    # Check if files exist
    if (-not (Test-Path $backendFile)) {
        throw "Backend file not found: $backendFile"
    }
    if (-not (Test-Path $frontendFile)) {
        throw "Frontend file not found: $frontendFile"
    }

    # Use scp to transfer (requires SSH access)
    scp $backendFile $frontendFile "${PiUser}@${PiHost}:~/"
    
    if ($LASTEXITCODE -ne 0) {
        throw "Failed to transfer files to Raspberry Pi. Make sure SSH is configured."
    }
    Write-Host "  ✓ Files transferred successfully" -ForegroundColor Green
    Write-Host ""

} catch {
    Write-Host ""
    Write-Host "ERROR: Transfer failed - $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Make sure:" -ForegroundColor Yellow
    Write-Host "  - SSH is enabled on the Raspberry Pi" -ForegroundColor Yellow
    Write-Host "  - You have SSH key authentication set up (or password authentication)" -ForegroundColor Yellow
    Write-Host "  - The Pi is accessible at $PiHost" -ForegroundColor Yellow
    exit 1
}

# Step 4: Load on Pi
Write-Host "Step 4: Loading images on Raspberry Pi..." -ForegroundColor Green
Write-Host ""

try {
    Write-Host "  Loading backend..." -ForegroundColor Cyan
    # Handle both .tar.gz and .tar.gz.zip files
    if ($backendFile.EndsWith(".zip")) {
        # Extract zip on Pi first, then load
        ssh "${PiUser}@${PiHost}" "unzip -p backend-$Version.tar.gz.zip | docker load"
    } else {
        ssh "${PiUser}@${PiHost}" "gunzip -c backend-$Version.tar.gz | docker load"
    }
    
    if ($LASTEXITCODE -ne 0) {
        throw "Failed to load backend image on Pi"
    }
    Write-Host "  ✓ Backend loaded" -ForegroundColor Green

    Write-Host "  Loading frontend..." -ForegroundColor Cyan
    # Handle both .tar.gz and .tar.gz.zip files
    if ($frontendFile.EndsWith(".zip")) {
        ssh "${PiUser}@${PiHost}" "unzip -p frontend-$Version.tar.gz.zip | docker load"
    } else {
        ssh "${PiUser}@${PiHost}" "gunzip -c frontend-$Version.tar.gz | docker load"
    }
    
    if ($LASTEXITCODE -ne 0) {
        throw "Failed to load frontend image on Pi"
    }
    Write-Host "  ✓ Frontend loaded" -ForegroundColor Green
    Write-Host ""

} catch {
    Write-Host ""
    Write-Host "ERROR: Failed to load images on Pi - $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Step 5: Cleanup on Pi
Write-Host "Step 5: Cleaning up on Raspberry Pi..." -ForegroundColor Green
Write-Host ""

try {
    ssh "${PiUser}@${PiHost}" "rm -f backend-$Version.tar.gz frontend-$Version.tar.gz backend-$Version.tar.gz.zip frontend-$Version.tar.gz.zip"
    Write-Host "  ✓ Cleanup complete" -ForegroundColor Green
    Write-Host ""

} catch {
    Write-Host "  ⚠ Warning: Could not clean up files on Pi (non-critical)" -ForegroundColor Yellow
    Write-Host ""
}

# Step 6: Cleanup local files
Write-Host "Step 6: Cleaning up local files..." -ForegroundColor Green
Write-Host ""

try {
    Remove-Item -Force $backendFile, $frontendFile -ErrorAction SilentlyContinue
    Write-Host "  ✓ Local files cleaned up" -ForegroundColor Green
    Write-Host ""

} catch {
    Write-Host "  ⚠ Warning: Could not clean up local files (non-critical)" -ForegroundColor Yellow
    Write-Host ""
}

# Step 7: Restart containers (optional)
if ($RestartContainers) {
    Write-Host "Step 7: Restarting containers on Raspberry Pi..." -ForegroundColor Green
    Write-Host ""
    
    try {
        Write-Host "  Restarting containers..." -ForegroundColor Cyan
        ssh "${PiUser}@${PiHost}" "cd ~/TicketBrokerSpring && docker-compose -f docker-compose.infrastructure.yml -f docker-compose.app.yml restart ticketbroker-api ticketbroker-frontend"
        
        if ($LASTEXITCODE -ne 0) {
            Write-Host "  ⚠ Warning: Could not restart containers automatically" -ForegroundColor Yellow
            Write-Host "  You may need to restart them manually:" -ForegroundColor Yellow
            Write-Host "    ssh ${PiUser}@${PiHost}" -ForegroundColor Yellow
            Write-Host "    cd ~/TicketBrokerSpring" -ForegroundColor Yellow
            Write-Host "    docker-compose -f docker-compose.infrastructure.yml -f docker-compose.app.yml restart" -ForegroundColor Yellow
        } else {
            Write-Host "  ✓ Containers restarted" -ForegroundColor Green
        }
        Write-Host ""

    } catch {
        Write-Host "  ⚠ Warning: Could not restart containers - $($_.Exception.Message)" -ForegroundColor Yellow
        Write-Host ""
    }
}

# Success!
Write-Host "========================================" -ForegroundColor Green
Write-Host "  Deployment Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Images are now available on the Raspberry Pi:" -ForegroundColor Cyan
Write-Host "  - ticketbroker-backend:$Version" -ForegroundColor White
Write-Host "  - ticketbroker-frontend:$Version" -ForegroundColor White
Write-Host ""
if (-not $RestartContainers) {
    Write-Host "To restart containers with new images, run:" -ForegroundColor Yellow
    Write-Host "  ssh ${PiUser}@${PiHost}" -ForegroundColor White
    Write-Host "  cd ~/TicketBrokerSpring" -ForegroundColor White
    Write-Host "  docker-compose -f docker-compose.infrastructure.yml -f docker-compose.app.yml up -d" -ForegroundColor White
    Write-Host ""
    Write-Host "Or use the -RestartContainers flag:" -ForegroundColor Yellow
    Write-Host "  .\deploy-to-raspberry.ps1 -Version $Version -RestartContainers" -ForegroundColor White
    Write-Host ""
}

