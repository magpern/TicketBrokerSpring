#!/bin/bash

# Deploy script - builds and transfers images to Raspberry Pi
# Usage: ./deploy-to-pi.sh [version]
# Example: ./deploy-to-pi.sh v1.0.3

set -e

VERSION=${1:-latest}
PI_HOST=${PI_HOST:-192.168.1.151}
PI_USER=${PI_USER:-pi}

echo "Building and deploying to Raspberry Pi..."
echo "Version: $VERSION"
echo "Target: $PI_USER@$PI_HOST"

# Build images
echo ""
echo "Step 1: Building images..."
./build-local.sh $VERSION

# Save images
echo ""
echo "Step 2: Saving images..."
docker save ticketbroker-backend:$VERSION | gzip > backend-$VERSION.tar.gz
docker save ticketbroker-frontend:$VERSION | gzip > frontend-$VERSION.tar.gz

# Transfer to Pi
echo ""
echo "Step 3: Transferring to Raspberry Pi..."
scp backend-$VERSION.tar.gz frontend-$VERSION.tar.gz $PI_USER@$PI_HOST:~/

# Load on Pi
echo ""
echo "Step 4: Loading images on Raspberry Pi..."
ssh $PI_USER@$PI_HOST "gunzip -c backend-$VERSION.tar.gz | docker load"
ssh $PI_USER@$PI_HOST "gunzip -c frontend-$VERSION.tar.gz | docker load"

# Cleanup local files
echo ""
echo "Step 5: Cleaning up local files..."
rm -f backend-$VERSION.tar.gz frontend-$VERSION.tar.gz

echo ""
echo "Deployment complete!"
echo ""
echo "Images are now available on the Raspberry Pi:"
echo "  - ticketbroker-backend:$VERSION"
echo "  - ticketbroker-frontend:$VERSION"
echo ""
echo "You can now update your docker-compose.yml on the Pi to use these images."

