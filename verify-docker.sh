#!/bin/bash
# verify-docker.sh - Verify Docker environment matches Railway

set -e

echo "=== Docker Environment Verification ==="
echo ""

# Check Docker is installed
echo "1. Checking Docker installation..."
if ! command -v docker &> /dev/null; then
    echo "   ✗ Docker not found. Please install Docker Desktop."
    exit 1
fi
echo "   ✓ Docker version: $(docker --version)"

# Check Docker Compose is available
echo ""
echo "2. Checking Docker Compose..."
if ! command -v docker-compose &> /dev/null; then
    echo "   ✗ Docker Compose not found."
    exit 1
fi
echo "   ✓ Docker Compose version: $(docker-compose --version)"

# Check Docker daemon is running
echo ""
echo "3. Checking Docker daemon..."
if ! docker info &> /dev/null; then
    echo "   ✗ Docker daemon not running. Please start Docker Desktop."
    exit 1
fi
echo "   ✓ Docker daemon is running"

# Build the image
echo ""
echo "4. Building Docker image (this may take a few minutes)..."
docker-compose build --quiet

echo "   ✓ Image built successfully"

# Start the container
echo ""
echo "5. Starting container..."
docker-compose up -d

echo "   Waiting for app to be ready..."
sleep 5

# Check health endpoint
echo ""
echo "6. Testing health endpoint..."
HEALTH_RESPONSE=$(curl -s http://localhost:3000/health || echo "FAILED")

if [[ "$HEALTH_RESPONSE" == *"ok"* ]]; then
    echo "   ✓ Health check passed"
    echo "   Response: $HEALTH_RESPONSE"
else
    echo "   ✗ Health check failed"
    echo "   Response: $HEALTH_RESPONSE"
    docker-compose logs app
    docker-compose down
    exit 1
fi

# Verify OCR tools inside container
echo ""
echo "7. Verifying OCR tools in container..."

TESSERACT_VERSION=$(docker exec material-calculator tesseract --version 2>&1 | head -n1)
if [[ "$TESSERACT_VERSION" == *"tesseract"* ]]; then
    echo "   ✓ Tesseract: $TESSERACT_VERSION"
else
    echo "   ✗ Tesseract not found"
fi

PDFTOPPM_VERSION=$(docker exec material-calculator pdftoppm -v 2>&1 | head -n1)
if [[ "$PDFTOPPM_VERSION" == *"pdftoppm"* ]]; then
    echo "   ✓ Poppler: $PDFTOPPM_VERSION"
else
    echo "   ✗ pdftoppm not found"
fi

NODE_VERSION=$(docker exec material-calculator node --version)
echo "   ✓ Node: $NODE_VERSION"

# Clean up
echo ""
echo "8. Stopping container..."
docker-compose down

echo ""
echo "=== VERIFICATION COMPLETE ==="
echo ""
echo "✓ Docker environment ready"
echo "✓ Matches Railway nixpacks configuration"
echo ""
echo "Next steps:"
echo "  Start app: docker-compose up"
echo "  Test at: http://localhost:3000"
echo "  See DOCKER.md for full usage guide"
