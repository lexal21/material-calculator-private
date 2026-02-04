const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cookieParser = require('cookie-parser');
const parser = require('./pdf-parser');
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
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
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
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
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
  const sessionId = req.cookies.session;
  if (sessionId) {
    auth.logoutUser(sessionId);
  }
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

// Upload and process endpoint (protected + tracked)
app.post('/upload', upload.single('pdf'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  try {
    const location = req.body.location || 'inland';
    const customPricing = req.body.pricing ? JSON.parse(req.body.pricing) : null;
    
    const result = await parser.parseAndCalculate(req.file.path, location);
    
    // Apply custom pricing if provided
    if (customPricing) {
      result.materials.forEach(item => {
        if (customPricing[item.name]) {
          item.unitPrice = customPricing[item.name].price;
          item.total = item.quantity * item.unitPrice;
        }
      });
    }
    
    // Clean up uploaded file
    if (fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    // Calculate subtotal and tax
    const subtotal = result.materials.reduce((sum, m) => sum + m.total, 0);
    const tax = subtotal * 0.09;
    const grandTotal = subtotal + tax;
    
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
    
    res.json({
      success: true,
      measurements: result.measurements,
      raw: result.raw,
      materials: result.materials,
      subtotal: subtotal,
      tax: tax,
      grandTotal: grandTotal
    });
  } catch (err) {
    // Clean up on error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(500).json({
      error: 'Failed to process PDF',
      message: err.message
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
