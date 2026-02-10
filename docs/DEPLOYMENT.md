# 🚀 Deployment Instructions

## ✅ Pre-Deployment Checklist

### ✔️ Completed
- [x] Authentication system built
- [x] Two approved users: alexallen@ashleyriverroofing.com, austin@ashleyriverroofing.com
- [x] Session management (30-min timeout)
- [x] Upload tracking
- [x] Search engine blocking (robots.txt + noindex)
- [x] Security headers
- [x] Code prepared for Vercel

---

## 📦 Step 1: Install Dependencies

```bash
cd material-calculator
npm install
```

This will install the new `cookie-parser` dependency.

---

## 🧪 Step 2: Test Locally (Optional)

```bash
node server-authenticated.js
```

Then visit http://localhost:3000

1. Should redirect to login page
2. Click "Register" - try registering with approved email
3. Login and test the calculator

---

## 📤 Step 3: Push to GitHub

```bash
# Initialize git (if not already)
git init

# Add your private remote
git remote add origin https://github.com/YOUR-USERNAME/material-calculator-private.git

# Add all files
git add .

# Commit
git commit -m "Initial commit with authentication"

# Push to private repo
git push -u origin main
```

**⚠️ Important:** Make sure your GitHub repo is **PRIVATE**!

---

## ☁️ Step 4: Deploy to Vercel

### Option A: Vercel CLI (Fastest)

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel --prod
```

### Option B: Vercel Dashboard (Easiest)

1. Go to https://vercel.com/dashboard
2. Click "Add New..." → "Project"
3. Click "Import Git Repository"
4. Select your `material-calculator-private` repo
5. Vercel auto-detects settings (leave defaults)
6. Click "Deploy"

---

## 🔐 Step 5: First Login

After deployment, Vercel will give you a URL like:
`https://material-calculator-private.vercel.app`

1. Visit the URL → redirects to login
2. Click "Register"
3. Have Alex and Austin register:
   - Name: Alex Allen
   - Email: alexallen@ashleyriverroofing.com
   - Password: (create secure password)

Repeat for Austin.

---

## ✅ What's Protected

### 🔒 Security Features
- ✅ Login required to access any page
- ✅ Only approved emails can register
- ✅ Sessions expire after 30 min inactivity
- ✅ All pages have `noindex, nofollow` (hidden from Google)
- ✅ `robots.txt` blocks all search engines
- ✅ Cookies are httpOnly (can't be accessed by JavaScript)
- ✅ HTTPS enforced by Vercel

### 📊 Tracking
- Every PDF upload is logged with:
  - User email
  - Timestamp
  - Filename
  - Customer name
  - Job number

### 🔐 Private Code
- Frontend code is minified by Vercel (harder to read)
- Backend code never exposed to browser
- Session cookies encrypted
- Passwords hashed (SHA-256)

---

## 🎯 User Instructions

**For Alex & Austin:**

1. Visit the app URL
2. Click "Register"
3. Enter your details:
   - Full Name
   - @ashleyriverroofing.com email
   - Create password (8+ characters)
4. After registration → redirects to login
5. Login and use the calculator normally
6. Logout button in top-right corner

---

## 🛠️ Admin View (Future Enhancement)

To see all user activity, visit:
`https://your-app.vercel.app/api/users`

Returns JSON with:
- All registered users
- Upload counts
- Last upload times

*Note: Currently requires login. Can build admin dashboard later if needed.*

---

## 🔄 Making Changes

After any code changes:

```bash
git add .
git commit -m "Description of changes"
git push
```

Vercel auto-deploys on every push to `main` branch!

---

## 🆘 Troubleshooting

### "Email not approved"
- Only these emails work:
  - alexallen@ashleyriverroofing.com
  - austin@ashleyriverroofing.com
- Email must be exact (case-insensitive)

### "Session expired"
- Happens after 30 min of inactivity
- Just login again

### Lost password?
- Currently no reset (email not configured)
- Contact admin to manually reset in code

---

## 🚀 Next Steps (Optional Enhancements)

### Phase 2 (Week 2):
- [ ] Admin dashboard (see all uploads)
- [ ] Password reset via email
- [ ] User profile page
- [ ] Add more users
- [ ] Database storage (currently in-memory)

### Phase 3 (Week 3):
- [ ] Custom domain (calculator.ashleyriverroofing.com)
- [ ] 2FA (two-factor authentication)
- [ ] Audit logs
- [ ] Email notifications on uploads

---

## 💰 Cost

**Vercel Free Tier:**
- ✅ Unlimited projects
- ✅ 100GB bandwidth/month
- ✅ HTTPS included
- ✅ Auto-scaling
- ✅ **$0/month**

**If you exceed (unlikely with 2 users):**
- Pro: $20/month (1TB bandwidth)

---

## 📞 Support

If anything breaks or you need help:
1. Check Vercel deployment logs
2. Ask Roofus (me!) 🔧

---

**Ready to deploy!** 🚀
