/**
 * Haven - Production API Backend Server
 * Express app managing static content, REST APIs, session cookies, and security.
 */

const express = require('express');
const cookieParser = require('cookie-parser');
const path = require('path');
const db = require('./db');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 8080;
const SESSION_SECRET = process.env.SESSION_SECRET || 'haven-production-secure-default-key';

// HTTPS redirection middleware for production (cloud deployment)
app.use((req, res, next) => {
  if (process.env.NODE_ENV === 'production' && req.headers['x-forwarded-proto'] !== 'https') {
    return res.redirect(`https://${req.headers.host}${req.url}`);
  }
  next();
});

// Parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser(SESSION_SECRET));

// Security Headers (Basic protection)
app.use((req, res, next) => {
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});

// Middleware: Require signed session authentication
async function requireAuth(req, res, next) {
  const userId = req.signedCookies.session_user;
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized: Session missing' });
  }

  try {
    const user = await db.getUserById(userId);
    if (!user) {
      res.clearCookie('session_user');
      return res.status(401).json({ error: 'Unauthorized: Session invalid' });
    }
    req.user = user;
    next();
  } catch (err) {
    console.error('[API Auth Middleware] Error checking session:', err);
    res.status(500).json({ error: 'Internal server error checking session' });
  }
}

// --- API Endpoints ---

// 1. Health & Monitoring Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// 2. Simulated Auth - Login
app.post('/api/auth/login', async (req, res) => {
  const { username, loginMethod } = req.body;
  if (!username || !loginMethod) {
    return res.status(400).json({ error: 'Username and loginMethod are required' });
  }

  try {
    const user = await db.getOrCreateUser(username, loginMethod);
    
    // Create signed session cookie (valid for 30 days)
    res.cookie('session_user', user.id, {
      signed: true,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
    });

    res.json({ success: true, user });
  } catch (err) {
    console.error('[API Auth] Login error:', err);
    res.status(500).json({ error: 'Failed to complete authentication' });
  }
});

// 3. Simulated Auth - Logout
app.post('/api/auth/logout', (req, res) => {
  res.clearCookie('session_user', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax'
  });
  res.json({ success: true });
});

// 4. Simulated Auth - Check Current User (Verification)
app.get('/api/auth/me', async (req, res) => {
  const userId = req.signedCookies.session_user;
  if (!userId) {
    return res.json({ authenticated: false });
  }
  
  try {
    const user = await db.getUserById(userId);
    if (!user) {
      res.clearCookie('session_user');
      return res.json({ authenticated: false });
    }
    res.json({ authenticated: true, user });
  } catch (err) {
    console.error('[API Auth] me error:', err);
    res.status(500).json({ error: 'Error validating session' });
  }
});

// 5. Contacts API - Get all saved contacts for active user
app.get('/api/contacts', requireAuth, async (req, res) => {
  try {
    const contacts = await db.getContacts(req.user.id);
    res.json({ contacts });
  } catch (err) {
    console.error('[API Contacts] Get error:', err);
    res.status(500).json({ error: 'Failed to retrieve contacts' });
  }
});

// 6. Contacts API - Save or edit contact
app.post('/api/contacts', requireAuth, async (req, res) => {
  const { id, name, phone, relation } = req.body;
  if (!id || !name || !phone) {
    return res.status(400).json({ error: 'id, name, and phone are required' });
  }

  try {
    const contact = await db.saveContact(req.user.id, { id, name, phone, relation });
    res.json({ success: true, contact });
  } catch (err) {
    console.error('[API Contacts] Save error:', err);
    res.status(500).json({ error: 'Failed to save contact' });
  }
});

// 7. Contacts API - Delete contact
app.delete('/api/contacts/:id', requireAuth, async (req, res) => {
  const contactId = req.params.id;
  try {
    const success = await db.deleteContact(req.user.id, contactId);
    if (success) {
      res.json({ success: true });
    } else {
      res.status(404).json({ error: 'Contact not found' });
    }
  } catch (err) {
    console.error('[API Contacts] Delete error:', err);
    res.status(500).json({ error: 'Failed to delete contact' });
  }
});

// 8. Settings API - Get app settings
app.get('/api/settings', requireAuth, async (req, res) => {
  try {
    const settings = await db.getSettings(req.user.id);
    res.json({ settings });
  } catch (err) {
    console.error('[API Settings] Get error:', err);
    res.status(500).json({ error: 'Failed to retrieve settings' });
  }
});

// 9. Settings API - Update settings
app.post('/api/settings', requireAuth, async (req, res) => {
  const { accessibility_mode, allow_home_access } = req.body;
  
  if (accessibility_mode === undefined && allow_home_access === undefined) {
    return res.status(400).json({ error: 'accessibility_mode or allow_home_access required' });
  }

  try {
    // Merge existing settings to prevent erasing columns
    const current = await db.getSettings(req.user.id);
    const updated = {
      accessibility_mode: accessibility_mode !== undefined ? accessibility_mode : current.accessibility_mode,
      allow_home_access: allow_home_access !== undefined ? allow_home_access : current.allow_home_access
    };

    const settings = await db.saveSettings(req.user.id, updated);
    res.json({ success: true, settings });
  } catch (err) {
    console.error('[API Settings] Save error:', err);
    res.status(500).json({ error: 'Failed to save settings' });
  }
});

// --- Static Asset Serving ---

// Serve static directory (mounts index.html at root automatically)
app.use(express.static(path.join(__dirname, '.')));

// Fallback to index.html for undefined routes (supporting SPA structure)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Start Server listening
app.listen(PORT, () => {
  console.log(`[Server] Haven PTSD support backend running on port ${PORT}`);
});
