// Simple cookie-based authentication for Vercel
const crypto = require('crypto');

// Approved users (whitelist)
const APPROVED_EMAILS = [
  'alexallen@ashleyriverroofing.com',
  'austin@ashleyriverroofing.com'
];

// Store registered users (email -> password hash)
// Format: { email: { password: hash, name: string, uploads: [] } }
const USERS = {
  // Users will be stored here after registration
};

// Generate secure token
function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

// Hash password
function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

// Check if email is approved
function isEmailApproved(email) {
  return APPROVED_EMAILS.includes(email.toLowerCase());
}

// Create session token (includes user data)
function createSessionToken(email, name) {
  const data = JSON.stringify({
    email,
    name,
    timestamp: Date.now()
  });
  return Buffer.from(data).toString('base64');
}

// Validate session token
function validateSessionToken(token) {
  try {
    const data = JSON.parse(Buffer.from(token, 'base64').toString('utf8'));
    
    // Check if session expired (30 minutes)
    const thirtyMinutes = 30 * 60 * 1000;
    if (Date.now() - data.timestamp > thirtyMinutes) {
      return { valid: false, message: 'Session expired' };
    }
    
    return {
      valid: true,
      user: { email: data.email, name: data.name }
    };
  } catch (err) {
    return { valid: false, message: 'Invalid session' };
  }
}

// Register new user
function registerUser(email, password, name) {
  email = email.toLowerCase();
  
  if (!isEmailApproved(email)) {
    return { success: false, message: 'Email not approved for access' };
  }
  
  if (USERS[email]) {
    return { success: false, message: 'User already registered' };
  }
  
  USERS[email] = {
    password: hashPassword(password),
    name,
    createdAt: new Date().toISOString(),
    uploads: []
  };
  
  return { success: true, message: 'Registration successful' };
}

// Login user
function loginUser(email, password) {
  email = email.toLowerCase();
  
  const user = USERS[email];
  if (!user) {
    return { success: false, message: 'Invalid email or password' };
  }
  
  if (user.password !== hashPassword(password)) {
    return { success: false, message: 'Invalid email or password' };
  }
  
  const sessionToken = createSessionToken(email, user.name);
  
  return { 
    success: true, 
    sessionToken,
    user: { email, name: user.name }
  };
}

// Track upload
function trackUpload(email, uploadData) {
  const user = USERS[email.toLowerCase()];
  if (user) {
    user.uploads.push({
      timestamp: new Date().toISOString(),
      filename: uploadData.filename,
      customerName: uploadData.customerName || 'N/A',
      jobNumber: uploadData.jobNumber || 'N/A'
    });
    return { success: true };
  }
  return { success: false };
}

// Get user uploads
function getUserUploads(email) {
  const user = USERS[email.toLowerCase()];
  return user ? user.uploads : [];
}

// Get all users (admin view)
function getAllUsers() {
  return Object.entries(USERS).map(([email, user]) => ({
    email,
    name: user.name,
    createdAt: user.createdAt,
    uploadCount: user.uploads.length,
    lastUpload: user.uploads.length > 0 ? user.uploads[user.uploads.length - 1].timestamp : null
  }));
}

module.exports = {
  isEmailApproved,
  registerUser,
  loginUser,
  validateSessionToken,
  trackUpload,
  getUserUploads,
  getAllUsers,
  APPROVED_EMAILS
};
