const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cookieParser = require('cookie-parser');
const parser = require('./pdf-parser');
const auth = require('./auth');

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
  const sessionId = req.cookies.session;
  
  if (!sessionId) {
    return res.redirect('/login.html');
  }
  
  const validation = auth.validateSession(sessionId);
  
  if (!validation.valid) {
    res.clearCookie('session');
    return res.redirect('/login.html');
  }
  
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
  
  const result = auth.registerUser(email, password, name);
  res.json(result);
});

app.post('/api/login', (req, res) => {
  const { email, password } = req.body;
  
  if (!email || !password) {
    return res.json({ success: false, message: 'Email and password are required' });
  }
  
  const result = auth.loginUser(email, password);
  
  if (result.success) {
    // Set session cookie (30 days)
    res.cookie('session', result.sessionId, {
      maxAge: 30 * 24 * 60 * 60 * 1000,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax'
    });
  }
  
  res.json({ success: result.success, message: result.message, user: result.user });
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
  res.json({ 
    success: true, 
    user: req.user,
    uploads: auth.getUserUploads(req.user.email)
  });
});

// Get all users (for admin dashboard)
app.get('/api/users', requireAuth, (req, res) => {
  res.json({ 
    success: true, 
    users: auth.getAllUsers()
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
    'RoofRunner Synthetic Underlayment': { unit: 'Roll', price: 82 },
    'Ridge Vent (12" / 4 ft)': { unit: 'Piece', price: 9 },
    '7/16 OSB Plywood': { unit: 'Sheet', price: 15.99 },
    '1-1/4" Roofing Nails': { unit: 'Box', price: 39.99 },
    'Button Caps': { unit: 'Bag', price: 27 }
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
    auth.trackUpload(req.user.email, {
      filename: req.file.originalname,
      customerName: result.raw.customer_name,
      jobNumber: result.raw.order_number
    });
    
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

app.listen(port, () => {
  console.log(`Material Calculator (Authenticated) running on port ${port}`);
  console.log(`Approved users: ${auth.APPROVED_EMAILS.join(', ')}`);
});
