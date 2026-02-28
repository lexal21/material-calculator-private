# Testing Workflow - Material Calculator

## Local Docker Testing (MANDATORY before Railway deployment)

All code changes MUST be tested in Docker before deploying to Railway.

### Quick Test Cycle

```bash
# 1. Make code changes locally
# (edit files in VS Code / your IDE)

# 2. Rebuild Docker image
docker-compose build

# 3. Start container
docker-compose up

# 4. Test at http://localhost:3000
# - Upload test PDFs
# - Verify supplement items work
# - Test delete/undo functionality
# - Check console for errors

# 5. View logs (in separate terminal)
docker-compose logs -f

# 6. Stop when done
# Press Ctrl+C, then:
docker-compose down
```

### Full Test Checklist

Before deploying to Railway, verify:

- [ ] App starts without errors: `docker-compose logs app`
- [ ] Health check passes: `curl http://localhost:3000/health`
- [ ] OCR working: Upload Watson_Loss.pdf
- [ ] Supplement items display correctly
- [ ] Delete single item works (doesn't delete all)
- [ ] Undo button works
- [ ] Multiple undos work in reverse order
- [ ] Totals calculate correctly
- [ ] PDF generation includes supplement items
- [ ] No console errors in browser F12 DevTools

### Test with Real PDFs

```bash
# Copy test PDFs into container if needed
docker cp test-pdfs/Watson_Loss.pdf material-calculator:/app/uploads/

# Or use the mounted volume (already accessible)
# test-pdfs/ is volume-mounted at /app/test-pdfs
```

### Debugging

```bash
# Enter container shell
docker exec -it material-calculator bash

# Inside container, verify OCR tools:
tesseract --version
pdftoppm -v
node --version

# Check logs
docker-compose logs -f app

# Inspect running container
docker inspect material-calculator
```

### Common Issues

**Port 3000 already in use:**
```bash
# Find process using port 3000
netstat -ano | findstr :3000

# Kill process or change port in docker-compose.yml
```

**Changes not reflecting:**
```bash
# Rebuild without cache
docker-compose build --no-cache
docker-compose up
```

**OCR tests failing:**
```bash
# Verify tesseract inside container
docker exec -it material-calculator tesseract --list-langs
# Should show: eng
```

### Deploy to Railway (Only After Docker Tests Pass)

```bash
# After all Docker tests pass:
git add .
git commit -m "Your commit message"
git push origin master

# Railway auto-deploys from master branch
# Monitor at: https://railway.app
```

### Emergency Rollback

If Railway deployment fails:
```bash
# Revert to previous commit
git revert HEAD
git push origin master

# Or reset to specific commit
git reset --hard COMMIT_HASH
git push origin master --force
```

## Test Data

**Watson_Loss.pdf:**
- 1 Fascia item (296.92 LF)
- 4 Pipe Jack items (1 EA each)
- Expected total: 5 supplement items

**Barton_Loss.pdf:**
- 1 Fascia item (124.08 LF)
- 5 Pipe Jack items (1 EA each)
- 1 Drip Edge item
- 1 Step Flashing item
- 1 L Flashing item
- Expected total: 8+ supplement items

## Performance Benchmarks

- PDF upload & parse: < 5 seconds
- OCR processing: < 15 seconds for 18-page PDF
- Delete item: < 100ms
- Undo action: < 100ms

If slower than these benchmarks, investigate.
