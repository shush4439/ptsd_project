/**
 * Haven - Database Connectivity Engine
 * Supports PostgreSQL connection pooling and auto-creates schema.
 * Operates with an intelligent in-memory fallback for local developers.
 */

const { Pool } = require('pg');
require('dotenv').config();

const databaseUrl = process.env.DATABASE_URL;
let pool = null;
let useFallback = false;

// Fallback in-memory store for local testing
const fallbackStore = {
  users: [],
  contacts: [],
  settings: []
};

if (databaseUrl) {
  console.log('[DB] DATABASE_URL found. Connecting to PostgreSQL...');
  pool = new Pool({
    connectionString: databaseUrl,
    ssl: {
      rejectUnauthorized: false // Required for Render/Supabase cloud DBs
    }
  });
} else {
  console.warn('[DB] WARNING: DATABASE_URL environment variable is missing.');
  console.warn('[DB] Running app with local in-memory fallback database.');
  useFallback = true;
}

// Database Schema Initialization Queries
const initDbQuery = `
  CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) NOT NULL,
    login_method VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT unique_user_method UNIQUE(username, login_method)
  );

  CREATE TABLE IF NOT EXISTS contacts (
    id VARCHAR(50) NOT NULL,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    relation VARCHAR(100),
    created_at TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY (id, user_id)
  );

  CREATE TABLE IF NOT EXISTS settings (
    user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    accessibility_mode BOOLEAN DEFAULT FALSE,
    allow_home_access BOOLEAN DEFAULT FALSE
  );
`;

// Helper: Run initialization queries on Startup
async function initDb() {
  if (useFallback) return;
  try {
    const client = await pool.connect();
    console.log('[DB] Successfully connected to PostgreSQL. Creating tables if not exist...');
    await client.query(initDbQuery);
    client.release();
    console.log('[DB] Database schema checks complete.');
  } catch (err) {
    console.error('[DB] Schema initialization error. Switching to fallback storage:', err.message);
    useFallback = true;
  }
}

// Invoke DB schema setup
initDb();

// Exportable Database Operations
const db = {
  // 1. Authenticate user (Get or Create)
  async getOrCreateUser(username, loginMethod) {
    if (useFallback) {
      let user = fallbackStore.users.find(u => u.username === username && u.login_method === loginMethod);
      if (!user) {
        user = {
          id: fallbackStore.users.length + 1,
          username,
          login_method: loginMethod,
          created_at: new Date()
        };
        fallbackStore.users.push(user);
        // Pre-populate settings for fallback user
        fallbackStore.settings.push({
          user_id: user.id,
          accessibility_mode: false,
          allow_home_access: false
        });

        // Pre-populate default contacts to ensure the presentation is not empty
        DEFAULT_CONTACTS.forEach(c => {
          fallbackStore.contacts.push({
            id: c.id,
            user_id: user.id,
            name: c.name,
            phone: c.phone,
            relation: c.relation,
            created_at: new Date()
          });
        });
      } else {
        // Reset home access lock on login
        const setting = fallbackStore.settings.find(s => s.user_id === user.id);
        if (setting) setting.allow_home_access = false;
      }
      return user;
    }

    const queryGetUser = 'SELECT * FROM users WHERE username = $1 AND login_method = $2';
    const queryCreateUser = 'INSERT INTO users (username, login_method) VALUES ($1, $2) RETURNING *';
    const queryCreateSettings = 'INSERT INTO settings (user_id) VALUES ($1) ON CONFLICT DO NOTHING';

    try {
      const res = await pool.query(queryGetUser, [username, loginMethod]);
      if (res.rows.length > 0) {
        const user = res.rows[0];
        // Reset home access lock on login
        await pool.query('UPDATE settings SET allow_home_access = false WHERE user_id = $1', [user.id]);
        return user;
      }
      
      const insertRes = await pool.query(queryCreateUser, [username, loginMethod]);
      const newUser = insertRes.rows[0];
      await pool.query(queryCreateSettings, [newUser.id]);
      return newUser;
    } catch (err) {
      console.error('[DB] getOrCreateUser error:', err);
      throw err;
    }
  },

  // 2. Fetch User by ID
  async getUserById(userId) {
    if (useFallback) {
      return fallbackStore.users.find(u => u.id === parseInt(userId)) || null;
    }
    const query = 'SELECT * FROM users WHERE id = $1';
    try {
      const res = await pool.query(query, [userId]);
      return res.rows.length > 0 ? res.rows[0] : null;
    } catch (err) {
      console.error('[DB] getUserById error:', err);
      throw err;
    }
  },

  // 3. Fetch Contacts
  async getContacts(userId) {
    if (useFallback) {
      const uId = parseInt(userId);
      return fallbackStore.contacts.filter(c => c.user_id === uId);
    }
    const query = 'SELECT * FROM contacts WHERE user_id = $1 ORDER BY name ASC';
    try {
      const res = await pool.query(query, [userId]);
      return res.rows;
    } catch (err) {
      console.error('[DB] getContacts error:', err);
      throw err;
    }
  },

  // 4. Save/Update Contact
  async saveContact(userId, contact) {
    const { id, name, phone, relation } = contact;
    if (useFallback) {
      const uId = parseInt(userId);
      const idx = fallbackStore.contacts.findIndex(c => c.id === id && c.user_id === uId);
      const newContact = { id, user_id: uId, name, phone, relation, created_at: new Date() };
      if (idx > -1) {
        fallbackStore.contacts[idx] = newContact;
      } else {
        fallbackStore.contacts.push(newContact);
      }
      return newContact;
    }

    const query = `
      INSERT INTO contacts (id, user_id, name, phone, relation) 
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (id, user_id) 
      DO UPDATE SET name = EXCLUDED.name, phone = EXCLUDED.phone, relation = EXCLUDED.relation
      RETURNING *
    `;
    try {
      const res = await pool.query(query, [id, userId, name, phone, relation]);
      return res.rows[0];
    } catch (err) {
      console.error('[DB] saveContact error:', err);
      throw err;
    }
  },

  // 5. Delete Contact
  async deleteContact(userId, contactId) {
    if (useFallback) {
      const uId = parseInt(userId);
      const lengthBefore = fallbackStore.contacts.length;
      fallbackStore.contacts = fallbackStore.contacts.filter(c => !(c.id === contactId && c.user_id === uId));
      return fallbackStore.contacts.length < lengthBefore;
    }

    const query = 'DELETE FROM contacts WHERE user_id = $1 AND id = $2';
    try {
      const res = await pool.query(query, [userId, contactId]);
      return res.rowCount > 0;
    } catch (err) {
      console.error('[DB] deleteContact error:', err);
      throw err;
    }
  },

  // 6. Fetch Settings
  async getSettings(userId) {
    if (useFallback) {
      const uId = parseInt(userId);
      let s = fallbackStore.settings.find(st => st.user_id === uId);
      if (!s) {
        s = { user_id: uId, accessibility_mode: false, allow_home_access: false };
        fallbackStore.settings.push(s);
      }
      return s;
    }

    const query = 'SELECT * FROM settings WHERE user_id = $1';
    try {
      const res = await pool.query(query, [userId]);
      if (res.rows.length > 0) {
        return res.rows[0];
      }
      // Insert default settings if somehow missing
      const insertQuery = 'INSERT INTO settings (user_id) VALUES ($1) RETURNING *';
      const insertRes = await pool.query(insertQuery, [userId]);
      return insertRes.rows[0];
    } catch (err) {
      console.error('[DB] getSettings error:', err);
      throw err;
    }
  },

  // 7. Save Settings
  async saveSettings(userId, settingsData) {
    const { accessibility_mode, allow_home_access } = settingsData;
    if (useFallback) {
      const uId = parseInt(userId);
      const idx = fallbackStore.settings.findIndex(s => s.user_id === uId);
      const newSettings = { user_id: uId, accessibility_mode, allow_home_access };
      if (idx > -1) {
        fallbackStore.settings[idx] = newSettings;
      } else {
        fallbackStore.settings.push(newSettings);
      }
      return newSettings;
    }

    const query = `
      INSERT INTO settings (user_id, accessibility_mode, allow_home_access) 
      VALUES ($1, $2, $3)
      ON CONFLICT (user_id) 
      DO UPDATE SET accessibility_mode = EXCLUDED.accessibility_mode, allow_home_access = EXCLUDED.allow_home_access
      RETURNING *
    `;
    try {
      const res = await pool.query(query, [userId, accessibility_mode, allow_home_access]);
      return res.rows[0];
    } catch (err) {
      console.error('[DB] saveSettings error:', err);
      throw err;
    }
  }
};

module.exports = db;
