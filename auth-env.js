// Environment-based authentication for Vercel
// Users stored in environment variables
const crypto = require('crypto');

// Approved users
const APPROVED_EMAILS = [
  'alexallen@ashleyriverroofing.com',
  'austin@ashleyriverroofing.com'
];

// Get users from environment variables
// Format: USER_ALEX=name:Alex Allen|password:hashedpass
// Format: USER_AUSTIN=name:Austin|password:hashedpass
function getUsers() {
  const users = {};
  
  if (process.env.USER_ALEX) {
    const parts = process.env.USER_ALEX.split('|');
    const name = parts[0].split(':')[1];
    const password = parts[1].split(':')[1];
    users['alexallen@ashleyriverroofing.com'] = { name, password, uploads: [] };
  }
  
  if (process.env.USER_AUSTIN) {
    const parts = process.env.USER_AUSTIN.split('|');
    const name = parts[0].split(':')[1];
    const password = parts[1].split(':')[1];
    users['austin@ashleyriverroofing.com'] = { name, password, uploads: [] };
  }
  
  return users;
}

// Hash password
function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
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

// Check if email is approved
function isEmailApproved(email) {
  return APPROVED_EMAILS.includes(email.toLowerCase());
}

// Register user (for initial setup - just returns hash)
function registerUser(email, password, name) {
  email = email.toLowerCase();
  
  if (!isEmailApproved(email)) {
    return { success: false, message: 'Email not approved for access' };
  }
  
  const hash = hashPassword(password);
  
  return { 
    success: true, 
    message: `Add this to Vercel environment variables:\nname:${name}|password:${hash}`,
    hash
  };
}

// Login user
function loginUser(email, password) {
  email = email.toLowerCase();
  
  const users = getUsers();
  const user = users[email];
  
  if (!user) {
    return { success: false, message: 'User not configured. Please contact admin.' };
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

// Track upload (store in memory - will reset on redeploy, but good enough for trial)
const uploads = {};

function trackUpload(email, uploadData) {
  if (!uploads[email]) uploads[email] = [];
  uploads[email].push({
    timestamp: new Date().toISOString(),
    ...uploadData
  });
  return { success: true };
}

function getUserUploads(email) {
  return uploads[email] || [];
}

function getAllUsers() {
  const users = getUsers();
  return Object.entries(users).map(([email, user]) => ({
    email,
    name: user.name,
    uploadCount: uploads[email] ? uploads[email].length : 0
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
