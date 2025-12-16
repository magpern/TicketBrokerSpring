#!/bin/bash

# Quick script to update Raspberry Pi containers with new images
# Usage: ./update-pi-images.sh [version]
# Example: ./update-pi-images.sh v1.0.5

VERSION=${1:-latest}
PI_HOST=${PI_HOST:-192.168.1.151}
PI_USER=${PI_USER:-magpern}

echo "Updating containers on Raspberry Pi to version $VERSION..."

ssh ${PI_USER}@${PI_HOST} << EOF
cd ~/TicketBrokerSpring

# Export version for docker-compose
export IMAGE_TAG=$VERSION

# Stop and remove old containers
docker-compose -f docker-compose.infrastructure.yml -f docker-compose.app.yml -f docker-compose.app.local.yml down

# Start with new images
docker-compose -f docker-compose.infrastructure.yml -f docker-compose.app.yml -f docker-compose.app.local.yml up -d

# Show status
docker-compose -f docker-compose.infrastructure.yml -f docker-compose.app.yml -f docker-compose.app.local.yml ps
EOF

echo "Done! Containers updated to version $VERSION"

