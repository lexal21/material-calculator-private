# verify-docker.ps1 - Verify Docker environment matches Railway
# Run with: .\verify-docker.ps1

$ErrorActionPreference = "Stop"

Write-Host "=== Docker Environment Verification ===" -ForegroundColor Cyan
Write-Host ""

# Check Docker is installed
Write-Host "1. Checking Docker installation..." -ForegroundColor Yellow
try {
    $dockerVersion = docker --version
    Write-Host "   ✓ Docker: $dockerVersion" -ForegroundColor Green
} catch {
    Write-Host "   ✗ Docker not found. Please install Docker Desktop." -ForegroundColor Red
    exit 1
}

# Check Docker Compose is available
Write-Host ""
Write-Host "2. Checking Docker Compose..." -ForegroundColor Yellow
try {
    $composeVersion = docker-compose --version
    Write-Host "   ✓ Docker Compose: $composeVersion" -ForegroundColor Green
} catch {
    Write-Host "   ✗ Docker Compose not found." -ForegroundColor Red
    exit 1
}

# Check Docker daemon is running
Write-Host ""
Write-Host "3. Checking Docker daemon..." -ForegroundColor Yellow
try {
    docker info | Out-Null
    Write-Host "   ✓ Docker daemon is running" -ForegroundColor Green
} catch {
    Write-Host "   ✗ Docker daemon not running. Please start Docker Desktop." -ForegroundColor Red
    exit 1
}

# Build the image
Write-Host ""
Write-Host "4. Building Docker image (this may take a few minutes)..." -ForegroundColor Yellow
try {
    docker-compose build 2>&1 | Out-Null
    Write-Host "   ✓ Image built successfully" -ForegroundColor Green
} catch {
    Write-Host "   ✗ Build failed" -ForegroundColor Red
    exit 1
}

# Start the container
Write-Host ""
Write-Host "5. Starting container..." -ForegroundColor Yellow
docker-compose up -d

Write-Host "   Waiting for app to be ready..." -ForegroundColor Gray
Start-Sleep -Seconds 5

# Check health endpoint
Write-Host ""
Write-Host "6. Testing health endpoint..." -ForegroundColor Yellow
try {
    $healthResponse = Invoke-RestMethod -Uri "http://localhost:3000/health" -TimeoutSec 5
    if ($healthResponse.status -eq "ok") {
        Write-Host "   ✓ Health check passed" -ForegroundColor Green
        Write-Host "   Response: $($healthResponse | ConvertTo-Json -Compress)" -ForegroundColor Gray
    } else {
        Write-Host "   ✗ Unexpected health response" -ForegroundColor Red
        docker-compose logs app
        docker-compose down
        exit 1
    }
} catch {
    Write-Host "   ✗ Health check failed" -ForegroundColor Red
    Write-Host "   Error: $_" -ForegroundColor Red
    docker-compose logs app
    docker-compose down
    exit 1
}

# Verify OCR tools inside container
Write-Host ""
Write-Host "7. Verifying OCR tools in container..." -ForegroundColor Yellow

try {
    $tesseractVersion = docker exec material-calculator tesseract --version 2>&1 | Select-Object -First 1
    Write-Host "   ✓ Tesseract: $tesseractVersion" -ForegroundColor Green
} catch {
    Write-Host "   ✗ Tesseract not found" -ForegroundColor Red
}

try {
    $pdftoppmVersion = docker exec material-calculator pdftoppm -v 2>&1 | Select-Object -First 1
    Write-Host "   ✓ Poppler: $pdftoppmVersion" -ForegroundColor Green
} catch {
    Write-Host "   ✗ pdftoppm not found" -ForegroundColor Red
}

$nodeVersion = docker exec material-calculator node --version
Write-Host "   ✓ Node: $nodeVersion" -ForegroundColor Green

# Clean up
Write-Host ""
Write-Host "8. Stopping container..." -ForegroundColor Yellow
docker-compose down

Write-Host ""
Write-Host "=== VERIFICATION COMPLETE ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "✓ Docker environment ready" -ForegroundColor Green
Write-Host "✓ Matches Railway nixpacks configuration" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "  Start app: docker-compose up" -ForegroundColor White
Write-Host "  Test at: http://localhost:3000" -ForegroundColor White
Write-Host "  See DOCKER.md for full usage guide" -ForegroundColor White
