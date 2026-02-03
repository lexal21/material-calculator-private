// Authentication Module
const crypto = require('crypto');

// Approved users (whitelist)
const APPROVED_EMAILS = [
  'alexallen@ashleyriverroofing.com',
  'austin@ashleyriverroofing.com'
];

// In-memory user storage (for development)
// In production, this would be a database
const users = new Map();

// In-memory session storage
const sessions = new Map();

// Generate secure session ID
function generateSessionId() {
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

// Register new user
function registerUser(email, password, name) {
  email = email.toLowerCase();
  
  if (!isEmailApproved(email)) {
    return { success: false, message: 'Email not approved for access' };
  }
  
  if (users.has(email)) {
    return { success: false, message: 'User already registered' };
  }
  
  users.set(email, {
    email,
    name,
    password: hashPassword(password),
    createdAt: new Date().toISOString(),
    uploads: []
  });
  
  return { success: true, message: 'Registration successful' };
}

// Login user
function loginUser(email, password) {
  email = email.toLowerCase();
  
  const user = users.get(email);
  if (!user) {
    return { success: false, message: 'Invalid email or password' };
  }
  
  if (user.password !== hashPassword(password)) {
    return { success: false, message: 'Invalid email or password' };
  }
  
  // Create session
  const sessionId = generateSessionId();
  sessions.set(sessionId, {
    email,
    createdAt: Date.now(),
    lastActivity: Date.now()
  });
  
  return { 
    success: true, 
    sessionId,
    user: { email: user.email, name: user.name }
  };
}

// Validate session
function validateSession(sessionId) {
  const session = sessions.get(sessionId);
  if (!session) {
    return { valid: false };
  }
  
  // Check if session expired (30 minutes of inactivity)
  const now = Date.now();
  const thirtyMinutes = 30 * 60 * 1000;
  
  if (now - session.lastActivity > thirtyMinutes) {
    sessions.delete(sessionId);
    return { valid: false, message: 'Session expired' };
  }
  
  // Update last activity
  session.lastActivity = now;
  
  const user = users.get(session.email);
  return { 
    valid: true, 
    user: { email: user.email, name: user.name }
  };
}

// Logout user
function logoutUser(sessionId) {
  sessions.delete(sessionId);
  return { success: true };
}

// Track upload
function trackUpload(email, uploadData) {
  const user = users.get(email.toLowerCase());
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
  const user = users.get(email.toLowerCase());
  return user ? user.uploads : [];
}

// Get all users (admin view)
function getAllUsers() {
  return Array.from(users.values()).map(user => ({
    email: user.email,
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
  validateSession,
  logoutUser,
  trackUpload,
  getUserUploads,
  getAllUsers,
  APPROVED_EMAILS
};
