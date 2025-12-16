#!/bin/bash

# Local build script for Raspberry Pi deployment
# Usage: ./build-local.sh [version]
# Example: ./build-local.sh v1.0.3

set -e

VERSION=${1:-latest}
PI_HOST=${PI_HOST:-192.168.1.151}
PI_USER=${PI_USER:-pi}

echo "Building Docker images for Raspberry Pi (ARM64)..."
echo "Version: $VERSION"
echo "Target: $PI_USER@$PI_HOST"

# Build backend image for ARM64
echo ""
echo "Building backend image..."
docker buildx build \
  --platform linux/arm64 \
  -t ticketbroker-backend:$VERSION \
  -t ticketbroker-backend:latest \
  --load \
  ./backend

# Build frontend image for ARM64
echo ""
echo "Building frontend image..."
docker buildx build \
  --platform linux/arm64 \
  -t ticketbroker-frontend:$VERSION \
  -t ticketbroker-frontend:latest \
  --load \
  ./frontend

echo ""
echo "Images built successfully!"
echo ""
echo "To transfer images to Raspberry Pi, choose one of the following:"
echo ""
echo "Option 1: Save and transfer via scp"
echo "  docker save ticketbroker-backend:$VERSION | gzip > backend-$VERSION.tar.gz"
echo "  docker save ticketbroker-frontend:$VERSION | gzip > frontend-$VERSION.tar.gz"
echo "  scp backend-$VERSION.tar.gz frontend-$VERSION.tar.gz $PI_USER@$PI_HOST:~/"
echo "  ssh $PI_USER@$PI_HOST 'gunzip -c backend-$VERSION.tar.gz | docker load'"
echo "  ssh $PI_USER@$PI_HOST 'gunzip -c frontend-$VERSION.tar.gz | docker load'"
echo ""
echo "Option 2: Use docker save/load directly (if you have SSH access)"
echo "  docker save ticketbroker-backend:$VERSION | ssh $PI_USER@$PI_HOST docker load"
echo "  docker save ticketbroker-frontend:$VERSION | ssh $PI_USER@$PI_HOST docker load"
echo ""
echo "Option 3: Push to a registry the Pi can access"
echo "  docker tag ticketbroker-backend:$VERSION your-registry/ticketbroker-backend:$VERSION"
echo "  docker tag ticketbroker-frontend:$VERSION your-registry/ticketbroker-frontend:$VERSION"
echo "  docker push your-registry/ticketbroker-backend:$VERSION"
echo "  docker push your-registry/ticketbroker-frontend:$VERSION"

