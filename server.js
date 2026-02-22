require('dotenv').config();
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cookieParser = require('cookie-parser');
const parser = require('./pdf-parser');
const lossParser = require('./loss-parser');
const crypto = require('crypto');

// HARDCODED USERS FOR VERCEL (stateless workaround)
// After registration, update these with the hashes
const HARDCODED_USERS = {
  'alexallen@ashleyriverroofing.com': {
    name: 'Alex Allen',
    password: '908e212865f04c4a5a98420df313e59852c174ac189fe37bb464d73be73536e4', // Activated
    uploads: []
  },
  'austin@ashleyriverroofing.com': {
    name: 'Austin',
    password: '03b816815bb194ceb17ee51e842937b7e367476d0b0464a9f5cb7ba8c22acde0', // Activated
    uploads: []
  }
};

function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

function createSessionToken(email, name) {
  const data = JSON.stringify({ email, name, timestamp: Date.now() });
  return Buffer.from(data).toString('base64');
}

function validateSessionToken(token) {
  try {
    const data = JSON.parse(Buffer.from(token, 'base64').toString('utf8'));
    const thirtyMinutes = 30 * 60 * 1000;
    if (Date.now() - data.timestamp > thirtyMinutes) {
      return { valid: false };
    }
    return { valid: true, user: { email: data.email, name: data.name } };
  } catch (err) {
    return { valid: false };
  }
}

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(cookieParser());

// Configure file upload (use /tmp for Railway)
const upload = multer({
  dest: '/tmp/',
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'));
    }
  },
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit (increased for new Ridge Top PDFs)
  }
});

const uploadMulti = multer({
  dest: '/tmp/',
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') cb(null, true);
    else cb(new Error('Only PDF files are allowed'));
  },
  limits: { fileSize: 50 * 1024 * 1024 }
});

// Authentication middleware
function requireAuth(req, res, next) {
  const sessionToken = req.cookies.session;
  
  console.log('[AUTH] Path:', req.path, 'Session:', sessionToken ? 'exists' : 'missing');
  
  if (!sessionToken) {
    console.log('[AUTH] No session, redirecting to login');
    return res.redirect('/login.html');
  }
  
  const validation = validateSessionToken(sessionToken);
  
  console.log('[AUTH] Validation:', validation.valid ? 'VALID' : 'INVALID');
  
  if (!validation.valid) {
    console.log('[AUTH] Invalid session, clearing and redirecting');
    res.clearCookie('session');
    return res.redirect('/login.html');
  }
  
  console.log('[AUTH] Authenticated as:', validation.user.email);
  req.user = validation.user;
  next();
}

// Public routes (login/register pages and assets)
app.get('/login.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/register.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'register.html'));
});

app.get('/logo.jpg', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'logo.jpg'));
});

app.get('/style.css', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'style.css'));
});

// API Routes (no auth required for these)
app.post('/api/register', (req, res) => {
  const { name, email, password } = req.body;
  
  if (!name || !email || !password) {
    return res.json({ success: false, message: 'All fields are required' });
  }
  
  const emailLower = email.toLowerCase();
  
  if (!HARDCODED_USERS[emailLower]) {
    return res.json({ success: false, message: 'Email not approved for access' });
  }
  
  // Return the hash so I can add it to the code
  const hash = hashPassword(password);
  console.log(`[REGISTER] ${email} hash: ${hash}`);
  
  return res.json({ 
    success: true, 
    message: 'Registration received! Admin will activate your account within 24 hours. Your hash: ' + hash 
  });
});

app.post('/api/login', (req, res) => {
  const { email, password } = req.body;
  
  console.log('[LOGIN] Attempt:', email);
  
  if (!email || !password) {
    return res.json({ success: false, message: 'Email and password are required' });
  }
  
  const emailLower = email.toLowerCase();
  const user = HARDCODED_USERS[emailLower];
  
  if (!user) {
    console.log('[LOGIN] User not found');
    return res.json({ success: false, message: 'Invalid email or password' });
  }
  
  if (!user.password) {
    console.log('[LOGIN] Account not activated yet');
    return res.json({ success: false, message: 'Account not activated yet. Please contact admin.' });
  }
  
  if (user.password !== hashPassword(password)) {
    console.log('[LOGIN] Wrong password');
    return res.json({ success: false, message: 'Invalid email or password' });
  }
  
  console.log('[LOGIN] SUCCESS');
  
  const sessionToken = createSessionToken(emailLower, user.name);
  
  // Set session cookie (30 days)
  res.cookie('session', sessionToken, {
    maxAge: 30 * 24 * 60 * 60 * 1000,
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/'
  });
  
  res.json({ success: true, user: { email: emailLower, name: user.name } });
});

app.post('/api/logout', (req, res) => {
  // Clear session cookie (stateless auth - no server-side session to delete)
  res.clearCookie('session');
  res.json({ success: true });
});

// Get current user info
app.get('/api/user', requireAuth, (req, res) => {
  const user = HARDCODED_USERS[req.user.email];
  res.json({ 
    success: true, 
    user: req.user,
    uploads: user ? user.uploads : []
  });
});

// Get all users (for admin dashboard)
app.get('/api/users', requireAuth, (req, res) => {
  const users = Object.entries(HARDCODED_USERS).map(([email, user]) => ({
    email,
    name: user.name,
    uploadCount: user.uploads.length
  }));
  res.json({ 
    success: true, 
    users
  });
});

// Protected routes (require authentication)
app.use(requireAuth);

// CompanyCam API Proxy Endpoints - Uses native query parameter for search
app.get('/api/companycam/projects', async (req, res) => {
  try {
    const token = process.env.COMPANYCAM_API_TOKEN;
    if (!token) {
      return res.status(500).json({ error: 'CompanyCam API token not configured' });
    }

    const page = parseInt(req.query.page) || 1;
    const perPage = 50;
    const search = req.query.search?.trim() || '';
    
    console.log('CompanyCam: Fetching page ' + page + ' (search: "' + search + '")...');
    
    // Build URL with native query parameter if searching
    let url = 'https://api.companycam.com/v2/projects?per_page=' + perPage + '&page=' + page;
    if (search) {
      url += '&query=' + encodeURIComponent(search);
    }
    
    const response = await fetch(url, {
      headers: {
        'Authorization': 'Bearer ' + token,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      console.error('CompanyCam API error on page ' + page + ': ' + response.status);
      throw new Error('CompanyCam API error: ' + response.status);
    }

    const projects = await response.json();
    
    // Check headers for pagination info
    const totalCount = response.headers.get('x-total');
    const totalPages = response.headers.get('x-total-pages');
    
    console.log('CompanyCam: Got ' + projects.length + ' projects (total: ' + totalCount + ', pages: ' + totalPages + ')');
    
    return res.json({
      projects: Array.isArray(projects) ? projects : [],
      page: page,
      perPage: perPage,
      hasMore: projects.length === perPage,
      total: totalCount ? parseInt(totalCount) : null,
      totalPages: totalPages ? parseInt(totalPages) : null,
      isSearch: !!search
    });
  } catch (error) {
    console.error('CompanyCam projects error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/companycam/photos/:projectId', async (req, res) => {
  try {
    const token = process.env.COMPANYCAM_API_TOKEN;
    if (!token) {
      return res.status(500).json({ error: 'CompanyCam API token not configured' });
    }

    const { projectId } = req.params;
    
    // Fetch ALL photos with pagination
    let allPhotos = [];
    let page = 1;
    let hasMore = true;
    
    while (hasMore && page <= 100) { // Safety limit
      const response = await fetch('https://api.companycam.com/v2/projects/' + projectId + '/photos?per_page=100&page=' + page, {
        headers: {
          'Authorization': 'Bearer ' + token,
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('CompanyCam API error: ' + response.status);
      }

      const data = await response.json();
      const photos = Array.isArray(data) ? data : (data.results || data.data || []);
      
      if (photos.length === 0) {
        hasMore = false;
      } else {
        allPhotos = allPhotos.concat(photos);
        page++;
        if (photos.length < 100) {
          hasMore = false;
        }
      }
    }
    
    console.log('CompanyCam: Loaded ' + allPhotos.length + ' photos for project ' + projectId);
    res.json(allPhotos);
  } catch (error) {
    console.error('CompanyCam photos error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Serve static files (protected)
app.use(express.static('public'));

// Get custom pricing endpoint
app.get('/pricing', (req, res) => {
  res.json({
    'Landmark PRO Shingles': { unit: 'Bundle', price: 35 },
    'SwiftStart Starter Strip': { unit: 'Bundle', price: 52 },
    'Shadow Ridge Hip & Ridge Cap': { unit: 'Bundle', price: 65.5 },
    'Drip Edge (1-1/2 X 3-3/4")': { unit: 'Piece', price: 9.25 },
    'Ice & Water Shield': { unit: 'Roll', price: 69 },
    'RoofRunner Synthetic Underlayment': { unit: 'Roll', price: 85.75 },
    'Ridge Vent (12" / 4 ft)': { unit: 'Piece', price: 9 },
    '7/16 OSB Plywood': { unit: 'Sheet', price: 15.99 },
    '1-1/4" Roofing Nails': { unit: 'Box', price: 39.99 },
    'Button Caps': { unit: 'Box', price: 19.50 },
    'L Flashing (Trim Coil)': { unit: 'Roll', price: 134.50 },
    'Step Flashing': { unit: 'Bundle', price: 38.00 },
    'Joint Sealant 10z Black': { unit: 'Tube', price: 7.29 }
  });
});

// Diagnostic endpoint (protected)
app.get('/api/diagnostic', requireAuth, (req, res) => {
  const diagnostics = {
    server: 'running',
    user: req.user.email,
    environment: process.env.NODE_ENV || 'production',
    tmpDir: '/tmp/',
    tmpDirExists: fs.existsSync('/tmp/'),
    tmpDirWritable: (() => {
      try {
        const testFile = '/tmp/test-' + Date.now() + '.txt';
        fs.writeFileSync(testFile, 'test');
        fs.unlinkSync(testFile);
        return true;
      } catch (err) {
        return false;
      }
    })(),
    modules: {
      pdfParse: (() => { try { require('pdf-parse'); return 'installed'; } catch { return 'missing'; } })(),
      pdfLib: (() => { try { require('pdf-lib'); return 'installed'; } catch { return 'missing'; } })()
    }
  };
  res.json(diagnostics);
});

// Parse complete loss sheet (standalone)
app.post('/api/parse-loss', upload.single('pdf'), async (req, res) => {
  console.log('[PARSE-LOSS] Request from:', req.user.email);
  
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No file uploaded' });
  }
  
  // Check if this is actually a loss sheet (not a roof report)
  const isLoss = await lossParser.isLossSheet(req.file.path);
  
  if (!isLoss) {
    // This is a roof report, not a loss sheet - route to roof parser
    console.log('[PARSE-LOSS] Detected roof report, routing to roof parser');
    try {
      const location = req.body.location || 'charleston';
      const result = await parser.parseAndCalculate(req.file.path, location);
      
      // Calculate labor items (same as /upload endpoint)
      const laborItems = [];
      const squares = result.measurements.roofSquares || 0;
      const pitchData = result.raw.pitch_data || {};
      
      if (squares > 0) laborItems.push({ name: 'Labor - Squares', quantity: squares, unit: 'SQ', unitPrice: 90, total: squares * 90 });
      if (squares > 0) laborItems.push({ name: 'Tear Off - 1 Layer', quantity: squares, unit: 'SQ', unitPrice: 25, total: squares * 25 });
      
      const starterBundles = result.materials.find(m => m.name.includes('Starter'))?.quantity || 0;
      if (starterBundles > 0) laborItems.push({ name: 'Starter per Bundle', quantity: starterBundles, unit: 'BD', unitPrice: 25, total: starterBundles * 25 });
      
      const hipRidgeBundles = result.materials.find(m => m.name.includes('Hip'))?.quantity || 0;
      if (hipRidgeBundles > 0) laborItems.push({ name: 'Hip and Ridge Cap per Bundle', quantity: hipRidgeBundles, unit: 'BD', unitPrice: 25, total: hipRidgeBundles * 25 });
      
      if (pitchData.tier_8_9 > 0) laborItems.push({ name: 'Steep Charge for 8-9/12 pitch', quantity: pitchData.tier_8_9, unit: 'SQ', unitPrice: 5, total: pitchData.tier_8_9 * 5 });
      if (pitchData.tier_10_11 > 0) laborItems.push({ name: 'Steep Charge for 10-11/12 pitch', quantity: pitchData.tier_10_11, unit: 'SQ', unitPrice: 10, total: pitchData.tier_10_11 * 10 });
      if (pitchData.tier_12_plus > 0) laborItems.push({ name: 'Steep Charge for 12+/12 pitch', quantity: pitchData.tier_12_plus, unit: 'SQ', unitPrice: 20, total: pitchData.tier_12_plus * 20 });
      
      const plywoodQty = result.materials.find(m => m.name.includes('Plywood'))?.quantity || 0;
      const plywoodRate = plywoodQty > 10 ? 10 : 30;
      if (plywoodQty > 0) laborItems.push({ name: `Plywood (${plywoodQty > 10 ? 'Lots' : 'Few'})`, quantity: plywoodQty, unit: 'Sheet', unitPrice: plywoodRate, total: plywoodQty * plywoodRate });
      
      const laborSubtotal = laborItems.reduce((sum, item) => sum + item.total, 0);
      const subtotal = result.materials.reduce((sum, m) => sum + m.total, 0);
      const tax = subtotal * 0.09;
      
      // Clean up temp file
      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      
      return res.json({
        success: true,
        measurements: result.measurements,
        raw: result.raw,
        materials: result.materials,
        labor: { items: laborItems, subtotal: laborSubtotal },
        lossItems: [],
        subtotal,
        tax,
        grandTotal: subtotal + tax
      });
    } catch (err) {
      console.error('[PARSE-LOSS] Roof report parsing failed:', err);
      if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      return res.status(500).json({ success: false, message: err.message });
    }
  }
  
  const shedIncluded = req.body.shed_included !== 'false';
  
  console.log('[PARSE-LOSS] Parsing loss sheet, shed_included:', shedIncluded);
  
  try {
    const result = await lossParser.parseCompleteLossSheet(req.file.path, { shed_included: shedIncluded });
    
    // Clean up temp file
    if (fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    if (result.success) {
      console.log('[PARSE-LOSS] SUCCESS');
      res.json(result);
    } else {
      console.error('[PARSE-LOSS] Parse failed:', result.message);
      res.status(500).json({ success: false, message: result.message || 'Failed to parse loss sheet' });
    }
  } catch (err) {
    console.error('[PARSE-LOSS] ERROR:', err);
    
    // Clean up on error
    try {
      if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    } catch (e) {}
    
    res.status(500).json({ success: false, message: err.message });
  }
});

// Upload and process endpoint (protected + tracked)
app.post('/api/loss-compare', uploadMulti.fields([
  { name: 'pdf0', maxCount: 1 },
  { name: 'pdf1', maxCount: 1 }
]), async (req, res) => {
  console.log('[LOSS-COMPARE] Request from:', req.user.email);
  const files = req.files;
  const pdfPaths = [];
  if (files.pdf0 && files.pdf0[0]) pdfPaths.push(files.pdf0[0].path);
  if (files.pdf1 && files.pdf1[0]) pdfPaths.push(files.pdf1[0].path);

  if (pdfPaths.length === 0) {
    return res.status(400).json({ success: false, error: 'No PDF files uploaded' });
  }

  console.log('[LOSS-COMPARE] Processing', pdfPaths.length, 'file(s)');
  try {
    const result = await lossParser.processDocuments(pdfPaths);
    console.log('[LOSS-COMPARE] SUCCESS');
    res.json(result);
  } catch (err) {
    console.error('[LOSS-COMPARE] ERROR:', err.message);
    res.status(500).json({ success: false, error: 'Failed to process documents', message: err.message });
  } finally {
    pdfPaths.forEach(p => { try { if (fs.existsSync(p)) fs.unlinkSync(p); } catch (e) {} });
  }
});

app.post('/upload', upload.single('pdf'), async (req, res) => {
  console.log('[UPLOAD] Request received from:', req.user.email);
  
  if (!req.file) {
    console.log('[UPLOAD] ERROR: No file uploaded');
    return res.status(400).json({ error: 'No file uploaded' });
  }

  console.log('[UPLOAD] File received:', req.file.originalname, 'Size:', req.file.size, 'Path:', req.file.path);

  try {
    // CHECK IF LOSS SHEET FIRST (before attempting roof report parse)
    const isLoss = await lossParser.isLossSheet(req.file.path);
    if (isLoss) {
      console.log('[UPLOAD] Detected loss sheet - wrong endpoint');
      // Clean up file
      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(400).json({
        error: 'Loss sheet detected',
        message: 'This appears to be an insurance loss sheet. Please upload it on the Home tab instead of Materials/Labor.',
        isLossSheet: true
      });
    }
    
    const location = req.body.location || 'inland';
    const customPricing = req.body.pricing ? JSON.parse(req.body.pricing) : null;
    
    console.log('[UPLOAD] Starting PDF parse...');
    const result = await parser.parseAndCalculate(req.file.path, location);
    console.log('[UPLOAD] Parse successful. Found', result.materials.length, 'materials');
    
    // Apply custom pricing if provided
    if (customPricing) {
      console.log('[UPLOAD] Applying custom pricing');
      result.materials.forEach(item => {
        if (customPricing[item.name]) {
          item.unitPrice = customPricing[item.name].price;
          item.total = item.quantity * item.unitPrice;
        }
      });
    }
    
    // Calculate subtotal and tax
    const subtotal = result.materials.reduce((sum, m) => sum + m.total, 0);
    const tax = subtotal * 0.09;
    const grandTotal = subtotal + tax;
    
    // ==========================================
    // CALCULATE LABOR ITEMS
    // ==========================================
    const laborItems = [];
    
    // Get measurements
    const squares = parseFloat(result.raw.roof_sq) || result.measurements.roofSquares || 0;
    const pitchData = result.raw.pitch_data || {};
    
    // Labor - Squares (base labor rate)
    if (squares > 0) {
      laborItems.push({
        name: 'Labor - Squares',
        quantity: parseFloat(squares.toFixed(2)),
        unit: 'SQ',
        unitPrice: 90,
        total: parseFloat((squares * 90).toFixed(2))
      });
    }
    
    // Starter per Bundle - find starter in materials
    const starterMat = result.materials.find(m => m.name && m.name.toLowerCase().includes('starter'));
    if (starterMat && starterMat.quantity > 0) {
      laborItems.push({
        name: 'Starter per Bundle',
        quantity: starterMat.quantity,
        unit: 'BD',
        unitPrice: 25,
        total: starterMat.quantity * 25
      });
    }
    
    // Hip and Ridge Cap per Bundle - find hip/ridge cap in materials
    const hipRidgeMat = result.materials.find(m => 
      m.name && m.name.toLowerCase().includes('ridge') && 
      (m.name.toLowerCase().includes('cap') || m.name.toLowerCase().includes('hip'))
    );
    if (hipRidgeMat && hipRidgeMat.quantity > 0) {
      laborItems.push({
        name: 'Hip and Ridge Cap per Bundle',
        quantity: hipRidgeMat.quantity,
        unit: 'BD',
        unitPrice: 25,
        total: hipRidgeMat.quantity * 25
      });
    }
    
    // Steep Charge 8-9/12 pitch
    const tier_8_9 = parseFloat(pitchData.tier_8_9) || 0;
    if (tier_8_9 > 0) {
      laborItems.push({
        name: 'Steep Charge for 8-9/12 pitch',
        quantity: parseFloat(tier_8_9.toFixed(2)),
        unit: 'SQ',
        unitPrice: 5,
        total: parseFloat((tier_8_9 * 5).toFixed(2))
      });
    }
    
    // Steep Charge 10-11/12 pitch
    const tier_10_11 = parseFloat(pitchData.tier_10_11) || 0;
    if (tier_10_11 > 0) {
      laborItems.push({
        name: 'Steep Charge for 10-11/12 pitch',
        quantity: parseFloat(tier_10_11.toFixed(2)),
        unit: 'SQ',
        unitPrice: 10,
        total: parseFloat((tier_10_11 * 10).toFixed(2))
      });
    }
    
    // Steep Charge 12+/12 pitch
    const tier_12_plus = parseFloat(pitchData.tier_12_plus) || 0;
    if (tier_12_plus > 0) {
      laborItems.push({
        name: 'Steep Charge for 12+/12 pitch',
        quantity: parseFloat(tier_12_plus.toFixed(2)),
        unit: 'SQ',
        unitPrice: 20,
        total: parseFloat((tier_12_plus * 20).toFixed(2))
      });
    }
    
    // Plywood Replacement - find plywood in materials
    const plywoodMat = result.materials.find(m => m.name && m.name.toLowerCase().includes('plywood'));
    if (plywoodMat && plywoodMat.quantity > 0) {
      const plywoodRate = plywoodMat.quantity > 10 ? 10 : 30;
      laborItems.push({
        name: 'Plywood Replacement',
        quantity: plywoodMat.quantity,
        unit: 'SH',
        unitPrice: plywoodRate,
        total: plywoodMat.quantity * plywoodRate
      });
    }
    
    // Step Flashing Install Labor
    const stepFlashingLength = parseFloat(result.raw.step_flashing) || 0;
    if (stepFlashingLength > 0) {
      laborItems.push({
        name: 'Step Flashing Install',
        quantity: parseFloat(stepFlashingLength.toFixed(2)),
        unit: 'LF',
        unitPrice: 2,
        total: parseFloat((stepFlashingLength * 2).toFixed(2))
      });
    }
    
    // L Flashing (Trim Coil) Install Labor
    const wallFlashingLength = parseFloat(result.raw.flashing_length) || 0;
    if (wallFlashingLength > 0) {
      laborItems.push({
        name: 'L Flashing (Trim Coil) Install',
        quantity: parseFloat(wallFlashingLength.toFixed(2)),
        unit: 'LF',
        unitPrice: 2,
        total: parseFloat((wallFlashingLength * 2).toFixed(2))
      });
    }
    
    // Calculate labor subtotal
    const laborSubtotal = laborItems.reduce((sum, item) => sum + item.total, 0);
    
    console.log('[UPLOAD] Generated', laborItems.length, 'labor items. Labor subtotal:', laborSubtotal);
    
    // Track upload
    const user = HARDCODED_USERS[req.user.email];
    if (user) {
      user.uploads.push({
        timestamp: new Date().toISOString(),
        filename: req.file.originalname,
        customerName: result.raw.customer_name,
        jobNumber: result.raw.order_number
      });
    }
    
    // ==========================================
    // PARSE LOSS SHEET ITEMS (if present)
    // ==========================================
    let lossItems = [];
    try {
      const isLoss = await lossParser.isLossSheet(req.file.path);
      if (isLoss) {
        console.log('[UPLOAD] Detected loss sheet, parsing exterior items...');
        const lossResult = await lossParser.parseLossSheet(req.file.path);
        if (lossResult.success) {
          lossItems = lossResult.lossItems;
          console.log('[UPLOAD] Found', lossItems.length, 'loss items');
        }
      }
    } catch (lossErr) {
      console.error('[UPLOAD] Loss sheet parsing failed (non-fatal):', lossErr.message);
      // Continue without loss items - this is optional enhancement
    }
    
    // Clean up uploaded file
    if (fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
      console.log('[UPLOAD] Cleaned up temp file');
    }
    
    console.log('[UPLOAD] SUCCESS. Sending results.');
    res.json({
      success: true,
      measurements: result.measurements,
      raw: result.raw,
      materials: result.materials,
      labor: {
        items: laborItems,
        subtotal: laborSubtotal
      },
      lossItems: lossItems, // NEW: loss sheet items
      subtotal: subtotal,
      tax: tax,
      grandTotal: grandTotal
    });
  } catch (err) {
    console.error('[UPLOAD] ERROR:', err.message);
    console.error('[UPLOAD] Stack:', err.stack);
    
    // Clean up on error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(500).json({
      error: 'Failed to process PDF',
      message: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
});

// Only start server if not in Vercel (Vercel uses serverless functions)
if (process.env.VERCEL !== '1') {
  app.listen(port, () => {
    console.log(`Material Calculator (Authenticated) running on port ${port}`);
    console.log(`Approved users: ${Object.keys(HARDCODED_USERS).join(', ')}`);
  });
}

// Export for Vercel
module.exports = app;
