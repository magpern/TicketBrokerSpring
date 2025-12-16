# Raspberry Pi Deployment Guide

## Quick Start (One-Click Deployment)

From your Windows machine, run:

```powershell
.\deploy-to-raspberry.ps1
```

This will:
1. Build both backend and frontend images for ARM64 (Raspberry Pi)
2. Save them as compressed files
3. Transfer them to your Raspberry Pi
4. Load them on the Pi
5. Clean up temporary files

## Prerequisites

### On Windows Machine:
- Docker Desktop with buildx enabled
- PowerShell
- SSH client (usually included with Windows 10/11)
- SSH access to your Raspberry Pi

### On Raspberry Pi:
- Docker and Docker Compose installed
- SSH server enabled
- Your project files (docker-compose files)

## Configuration

### Default Settings
- **Pi Host**: `192.168.1.151`
- **Pi User**: `pi`
- **Version**: `latest`

### Custom Settings

You can override defaults:

```powershell
# Specify version
.\deploy-to-raspberry.ps1 -Version v1.0.3

# Custom Pi address
.\deploy-to-raspberry.ps1 -PiHost 192.168.1.100

# Custom user
.\deploy-to-raspberry.ps1 -PiUser myuser

# Restart containers after deployment
.\deploy-to-raspberry.ps1 -RestartContainers

# All options combined
.\deploy-to-raspberry.ps1 -Version v1.0.3 -PiHost 192.168.1.151 -PiUser pi -RestartContainers
```

## SSH Setup

### Option 1: Password Authentication
The script will prompt for your password when using `scp` and `ssh`.

### Option 2: SSH Key Authentication (Recommended)
Set up SSH keys for passwordless access:

```powershell
# Generate SSH key (if you don't have one)
ssh-keygen -t ed25519

# Copy key to Raspberry Pi
ssh-copy-id pi@192.168.1.151
```

## Troubleshooting

### "Docker buildx is not available"
Enable buildx in Docker Desktop:
1. Open Docker Desktop
2. Go to Settings → Features in development
3. Enable "Use containerd for pulling and storing images"
4. Restart Docker Desktop

### "Failed to transfer files"
- Check that SSH is enabled on the Pi: `sudo systemctl status ssh`
- Verify the Pi is accessible: `ping 192.168.1.151`
- Test SSH connection: `ssh pi@192.168.1.151`

### "Failed to load images on Pi"
- Make sure Docker is running on the Pi: `docker ps`
- Check available disk space: `df -h`
- Verify the files were transferred: `ssh pi@192.168.1.151 "ls -lh *.tar.gz"`

### Images not updating
After deployment, restart your containers:
```bash
ssh pi@192.168.1.151
cd ~/TicketBrokerSpring
docker-compose -f docker-compose.infrastructure.yml -f docker-compose.app.yml up -d
```

## Manual Steps (Alternative)

If the script doesn't work, you can do it manually:

```powershell
# 1. Build images
docker buildx build --platform linux/arm64 -t ticketbroker-backend:latest --load ./backend
docker buildx build --platform linux/arm64 -t ticketbroker-frontend:latest --load ./frontend

# 2. Save images
docker save ticketbroker-backend:latest | gzip > backend.tar.gz
docker save ticketbroker-frontend:latest | gzip > frontend.tar.gz

# 3. Transfer to Pi
scp backend.tar.gz frontend.tar.gz pi@192.168.1.151:~/

# 4. Load on Pi
ssh pi@192.168.1.151 "gunzip -c backend.tar.gz | docker load"
ssh pi@192.168.1.151 "gunzip -c frontend.tar.gz | docker load"

# 5. Cleanup
rm backend.tar.gz frontend.tar.gz
ssh pi@192.168.1.151 "rm backend.tar.gz frontend.tar.gz"
```

## Updating Docker Compose on Pi

After deploying new images, update your `docker-compose.app.yml` on the Pi to use the new images, or use the `-RestartContainers` flag.

