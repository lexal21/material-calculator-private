# Docker Setup - Material Calculator

This Docker environment mirrors Railway's nixpacks deployment for local testing before production deployment.

## Environment Match

The Dockerfile replicates Railway's nixpacks configuration:
- **Node.js**: 20 (bullseye-slim base)
- **tesseract-ocr**: Full OCR engine with English language data
- **poppler-utils**: PDF manipulation tools (pdftoppm, pdftotext)
- **npm**: Clean install of dependencies (`npm ci`)

## Quick Start

### Production Build (mirrors Railway)
```bash
docker-compose up --build
```

App runs at: http://localhost:3000

### Development Mode (with hot-reload)
```bash
docker-compose --profile dev up app-dev
```

Dev server runs at: http://localhost:3001

## Commands

### Build image
```bash
docker-compose build
```

### Start services
```bash
docker-compose up
```

### Start in background
```bash
docker-compose up -d
```

### View logs
```bash
docker-compose logs -f
```

### Stop services
```bash
docker-compose down
```

### Rebuild from scratch
```bash
docker-compose down
docker-compose build --no-cache
docker-compose up
```

### Enter container shell
```bash
docker exec -it material-calculator bash
```

## Testing Workflow

**MANDATORY:** Test all changes in Docker before deploying to Railway.

1. Make code changes locally
2. Rebuild Docker image: `docker-compose build`
3. Start container: `docker-compose up`
4. Test functionality at http://localhost:3000
5. Check logs: `docker-compose logs -f`
6. If tests pass → Deploy to Railway
7. If tests fail → Fix locally, repeat from step 2

## Volumes

- `./uploads:/app/uploads` - Persistent file storage
- `./test-pdfs:/app/test-pdfs` - Test PDFs accessible in container

## Health Check

The app includes a health endpoint: `GET /health`

Returns:
```json
{
  "status": "ok",
  "timestamp": "2026-02-28T05:00:00.000Z"
}
```

Docker health check runs every 30s. Check status:
```bash
docker ps
# Look for "healthy" in STATUS column
```

## Troubleshooting

### Container won't start
```bash
docker-compose logs app
```

### OCR not working
Verify tesseract installation:
```bash
docker exec -it material-calculator tesseract --version
docker exec -it material-calculator which pdftoppm
```

### Port already in use
Change port in docker-compose.yml:
```yaml
ports:
  - "3001:3000"  # Use 3001 instead
```

### Clear everything and start fresh
```bash
docker-compose down -v  # Remove volumes
docker system prune -a  # Remove unused images
docker-compose build --no-cache
docker-compose up
```

## Environment Variables

Set in docker-compose.yml under `environment`:
```yaml
environment:
  - NODE_ENV=production
  - PORT=3000
  - CUSTOM_VAR=value
```

## Production Parity

This Docker setup matches Railway's deployment:
- ✓ Same Node version (20)
- ✓ Same system packages (tesseract, poppler)
- ✓ Same install command (npm ci)
- ✓ Same start command (node server.js)
- ✓ Health checks enabled

**Difference:** Railway auto-assigns PORT via environment variable. Locally defaults to 3000.

## CI/CD Integration (Future)

When ready, add to GitHub Actions:
```yaml
- name: Test in Docker
  run: |
    docker-compose build
    docker-compose up -d
    sleep 10
    curl -f http://localhost:3000/health || exit 1
    docker-compose down
```
