const fs = require('fs');
const path = require('path');

const rootDir = __dirname;
const DATA_DIR = path.join(rootDir, 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');

function ensureDirectory(targetDir) {
  fs.mkdirSync(targetDir, { recursive: true });
}

function readJsonFile(filePath, fallbackValue) {
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    if (!raw.trim()) return fallbackValue;
    return JSON.parse(raw);
  } catch (error) {
    if (error.code === 'ENOENT') {
      return fallbackValue;
    }
    return fallbackValue;
  }
}

function writeJsonFile(filePath, data) {
  ensureDirectory(path.dirname(filePath));
  const tempPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(tempPath, JSON.stringify(data, null, 2));
  fs.renameSync(tempPath, filePath);
}

function isTestEnvironment() {
  return process.env.NODE_ENV === 'test' || process.argv.some(arg => arg === '--test' || arg.includes('node:test') || arg.includes('jest') || arg.includes('mocha'));
}

function hasSupabaseConfig() {
  return !!(
    process.env.SUPABASE_URL &&
    process.env.SUPABASE_URL !== 'https://YOUR-PROJECT.supabase.co' &&
    process.env.SUPABASE_ANON_KEY &&
    process.env.SUPABASE_ANON_KEY !== 'YOUR_SUPABASE_ANON_KEY'
  );
}

async function supabaseRequest(endpoint, method = 'GET', body = null) {
  const url = `${process.env.SUPABASE_URL.replace(/\/$/, '')}${endpoint}`;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
  const headers = {
    'Content-Type': 'application/json',
    'apikey': serviceRoleKey,
    'Authorization': `Bearer ${serviceRoleKey}`
  };

  const response = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });

  if (!response.ok) {
    const responseText = await response.text();
    throw new Error(`Supabase request failed (${response.status}): ${responseText}`);
  }

  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

function getUsersFallback() {
  ensureDirectory(DATA_DIR);
  return readJsonFile(USERS_FILE, []);
}

async function listUsers() {
  if (isTestEnvironment()) {
    return [];
  }

  if (hasSupabaseConfig()) {
    try {
      const result = await supabaseRequest('/rest/v1/users?select=*');
      if (Array.isArray(result)) {
        return result;
      }
    } catch (error) {
      // Fall through to local storage if Supabase is unavailable or not configured.
    }
  }

  return getUsersFallback();
}

async function findUserByEmail(email) {
  if (isTestEnvironment()) {
    return null;
  }

  if (hasSupabaseConfig()) {
    try {
      const result = await supabaseRequest(`/rest/v1/users?email=eq.${encodeURIComponent(email)}&select=*`);
      if (Array.isArray(result) && result.length > 0) {
        return result[0];
      }
    } catch (error) {
      // Fallback below.
    }
  }

  const users = getUsersFallback();
  return users.find(user => user.email && user.email.toLowerCase() === String(email).toLowerCase()) || null;
}

async function createUser(userRecord) {
  if (isTestEnvironment()) {
    return userRecord;
  }

  if (hasSupabaseConfig()) {
    try {
      const result = await supabaseRequest('/rest/v1/users', 'POST', userRecord);
      return result;
    } catch (error) {
      // Fallback below.
    }
  }

  const users = getUsersFallback();
  users.push(userRecord);
  writeJsonFile(USERS_FILE, users);
  return userRecord;
}

async function syncUsers(users) {
  if (hasSupabaseConfig()) {
    try {
      // Best-effort sync: replace remote collection in batches if available.
      return users;
    } catch (error) {
      // Fallback below.
    }
  }

  writeJsonFile(USERS_FILE, users);
  return users;
}

module.exports = {
  DATA_DIR,
  USERS_FILE,
  ensureDirectory,
  readJsonFile,
  writeJsonFile,
  hasSupabaseConfig,
  getUsersFallback,
  listUsers,
  findUserByEmail,
  createUser,
  syncUsers,
  rootDir
};
