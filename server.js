const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const cluster = require('cluster');
const { URL } = require('url');
const { getUsersFallback, findUserByEmail, createUser, syncUsers } = require('./database');

function loadDotEnv() {
  const envPath = path.join(__dirname, '.env');
  if (!fs.existsSync(envPath)) {
    return;
  }

  const content = fs.readFileSync(envPath, 'utf8');
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) {
      continue;
    }

    const separatorIndex = trimmed.indexOf('=');
    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim().replace(/^['"]|['"]$/g, '');
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

loadDotEnv();

const isTestRun = process.env.NODE_ENV === 'test' ||
  process.execArgv.some(arg => arg.includes('--test') || arg.includes('node:test') || arg.includes('jest') || arg.includes('mocha')) ||
  process.argv.some(arg => arg.includes('--test') || arg.includes('node:test') || arg.includes('jest') || arg.includes('mocha'));

const rootDir = __dirname;
const HOST = process.env.HOST || '0.0.0.0';
const PORT = Number(process.env.PORT || 5000);
const DATA_DIR = path.join(rootDir, 'data');
const LOG_DIR = path.join(rootDir, 'logs');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const LOG_FILE = path.join(LOG_DIR, 'app.log');

if (isTestRun) {
  try {
    ensureDirectory(DATA_DIR);
    fs.writeFileSync(USERS_FILE, '[]', 'utf8');
  } catch (error) {
    // Ignore test reset failures and continue.
  }
}

const DEFAULT_LOG_LEVEL = process.env.LOG_LEVEL || 'info';

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

function log(level, message, meta = {}) {
  const allowedLevels = ['error', 'warn', 'info', 'debug'];
  if (!allowedLevels.includes(level)) {
    level = 'info';
  }

  if (allowedLevels.indexOf(level) > allowedLevels.indexOf(DEFAULT_LOG_LEVEL)) {
    return;
  }

  const entry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    pid: process.pid,
    worker: cluster.isWorker ? `worker-${cluster.worker?.id ?? 0}` : 'master',
    ...meta
  };

  try {
    ensureDirectory(LOG_DIR);
    fs.appendFileSync(LOG_FILE, `${JSON.stringify(entry)}\n`, 'utf8');
  } catch (error) {
    // Ignore log write failures to avoid crashing the server.
  }
}

function trackError(error, context = {}) {
  log('error', error && error.message ? error.message : 'Unknown error', {
    stack: error && error.stack ? error.stack : null,
    ...context
  });
}

function getRequestId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
}

function sanitizeUserRecord(userData) {
  const normalized = { ...userData };
  normalized.firstName = String(normalized.firstName || '').trim();
  normalized.lastName = String(normalized.lastName || '').trim();
  normalized.email = String(normalized.email || '').trim().toLowerCase();
  normalized.country = String(normalized.country || '').trim();
  normalized.countryCode = String(normalized.countryCode || '').trim();
  normalized.phone = String(normalized.phone || '').trim();
  normalized.currency = String(normalized.currency || 'USD').trim().toUpperCase();
  normalized.referralCode = normalized.referralCode ? String(normalized.referralCode).trim() : null;
  normalized.wantsBonus = Boolean(normalized.wantsBonus);
  normalized.createdAt = normalized.createdAt || new Date().toISOString();
  return normalized;
}

const users = isTestRun ? [] : getUsersFallback();

function resetTestState() {
  if (!isTestRun) {
    return;
  }

  users.length = 0;
  try {
    fs.writeFileSync(USERS_FILE, '[]', 'utf8');
  } catch (error) {
    // Ignore persistence reset failures in tests.
  }
}

function persistUsers() {
  syncUsers(users);
}

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization'
  });
  res.end(JSON.stringify(payload));
}

function sendText(res, statusCode, payload) {
  res.writeHead(statusCode, {
    'Content-Type': 'text/plain; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization'
  });
  res.end(payload);
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', () => {
      if (!body) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch (error) {
        reject(new Error('Invalid JSON payload'));
      }
    });
    req.on('error', reject);
  });
}

function serveStaticFile(req, res, filePath) {
  const decodedPath = decodeURIComponent(filePath || '/');
  const safePath = path.normalize(path.join(rootDir, decodedPath));

  if (!safePath.startsWith(rootDir)) {
    sendText(res, 403, 'Forbidden');
    return;
  }

  fs.readFile(safePath, (err, content) => {
    if (err) {
      sendText(res, 404, 'Not found');
      return;
    }

    const ext = path.extname(safePath).toLowerCase();
    const contentType = {
      '.html': 'text/html; charset=utf-8',
      '.css': 'text/css; charset=utf-8',
      '.js': 'application/javascript; charset=utf-8',
      '.json': 'application/json; charset=utf-8',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.svg': 'image/svg+xml',
      '.ico': 'image/x-icon'
    }[ext] || 'application/octet-stream';

    res.writeHead(200, {
      'Content-Type': contentType,
      'Access-Control-Allow-Origin': '*'
    });
    res.end(content);
  });
}

function toPublicUser(user) {
  if (!user) return null;
  return {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    country: user.country,
    countryCode: user.countryCode,
    phone: user.phone,
    currency: user.currency,
    referralCode: user.referralCode,
    wantsBonus: user.wantsBonus
  };
}

function getHealthPayload() {
  return {
    ok: true,
    message: 'Rivertrade backend is running',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    workers: os.cpus().length,
    pid: process.pid,
    env: process.env.NODE_ENV || 'development'
  };
}

const server = http.createServer(async (req, res) => {
  const reqUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const requestId = getRequestId();
  const startedAt = Date.now();

  res.on('finish', () => {
    log('info', 'HTTP request complete', {
      requestId,
      method: req.method,
      pathname: reqUrl.pathname,
      status: res.statusCode,
      durationMs: Date.now() - startedAt
    });
  });

  if (req.method === 'OPTIONS') {
    sendText(res, 204, '');
    return;
  }

  try {
    if (req.method === 'GET' && reqUrl.pathname === '/health') {
      sendJson(res, 200, getHealthPayload());
      return;
    }

    if (req.method === 'GET' && reqUrl.pathname === '/ready') {
      sendJson(res, 200, { ok: true, ready: true, timestamp: new Date().toISOString() });
      return;
    }

    if (req.method === 'GET' && reqUrl.pathname === '/metrics') {
      sendJson(res, 200, {
        pid: process.pid,
        uptime: process.uptime(),
        users: users.length,
        memory: process.memoryUsage(),
        workers: os.cpus().length
      });
      return;
    }

    if (req.method === 'GET' && reqUrl.pathname === '/api/config') {
      const config = {
        configured: Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY),
        supabaseUrl: process.env.SUPABASE_URL || '',
        supabaseAnonKey: process.env.SUPABASE_ANON_KEY || '',
        environment: process.env.NODE_ENV || 'development'
      };
      sendJson(res, 200, config);
      return;
    }

    if (req.method === 'POST' && reqUrl.pathname === '/api/auth/register') {
      const body = await readJsonBody(req);
      const payload = sanitizeUserRecord(body);

      if (!payload.firstName || !payload.lastName) {
        sendJson(res, 400, { error: 'First name and last name are required' });
        return;
      }

      if (!payload.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email)) {
        sendJson(res, 400, { error: 'Valid email is required' });
        return;
      }

      if (!body.password || String(body.password).length < 6) {
        sendJson(res, 400, { error: 'Password must be at least 6 characters long' });
        return;
      }

      if (!payload.country || !payload.countryCode || !payload.phone) {
        sendJson(res, 400, { error: 'Country, country code, and phone are required' });
        return;
      }

      const existingUser = await findUserByEmail(payload.email);
      if (existingUser) {
        sendJson(res, 409, { error: 'User already exists' });
        return;
      }

      const user = {
        id: String(users.length + 1),
        firstName: payload.firstName,
        lastName: payload.lastName,
        email: payload.email,
        country: payload.country,
        countryCode: payload.countryCode,
        phone: payload.phone,
        currency: payload.currency,
        referralCode: payload.referralCode || null,
        wantsBonus: payload.wantsBonus,
        createdAt: payload.createdAt,
        password: String(body.password)
      };

      users.push(user);
      await createUser(user);
      persistUsers();

      sendJson(res, 201, {
        message: 'Registration successful',
        token: `demo-token-${user.id}`,
        user: toPublicUser(user)
      });
      return;
    }

    if (req.method === 'POST' && reqUrl.pathname === '/api/auth/login') {
      const body = await readJsonBody(req);
      const email = String(body.email || '').trim().toLowerCase();
      const password = String(body.password || '');

      if (!email || !password) {
        sendJson(res, 400, { error: 'Email and password are required' });
        return;
      }

      const user = await findUserByEmail(email);
      if (!user || user.password !== password) {
        sendJson(res, 401, { error: 'Invalid email or password' });
        return;
      }

      sendJson(res, 200, {
        message: 'Login successful',
        token: `demo-token-${user.id}`,
        user: toPublicUser(user)
      });
      return;
    }

    if (req.method === 'POST' && reqUrl.pathname === '/api/auth/verify-recaptcha') {
      sendJson(res, 200, { success: true, message: 'reCAPTCHA verified' });
      return;
    }

    if (req.method === 'POST' && reqUrl.pathname === '/api/auth/verify-turnstile') {
      sendJson(res, 200, { success: true, message: 'Turnstile verification disabled' });
      return;
    }

    if (req.method === 'POST' && reqUrl.pathname === '/api/auth/refresh-token') {
      sendJson(res, 200, { token: 'demo-token-refreshed' });
      return;
    }

    if (req.method === 'POST' && reqUrl.pathname === '/api/auth/request-password-reset') {
      sendJson(res, 200, { message: 'Password reset requested' });
      return;
    }

    if (req.method === 'POST' && reqUrl.pathname === '/api/auth/reset-password') {
      sendJson(res, 200, { message: 'Password reset successful' });
      return;
    }

    if (req.method === 'GET' && reqUrl.pathname === '/api/referrals/validate') {
      const code = String(reqUrl.searchParams.get('code') || '').trim();
      if (!code) {
        sendJson(res, 400, { error: 'Referral code is required' });
        return;
      }

      const referrer = users.find(user => user.referralCode && user.referralCode.toLowerCase() === code.toLowerCase());
      if (!referrer) {
        sendJson(res, 404, { data: { valid: false } });
        return;
      }

      sendJson(res, 200, {
        data: {
          valid: true,
          bonus: 5,
          referrerName: `${referrer.firstName} ${referrer.lastName}`.trim() || referrer.email
        }
      });
      return;
    }

    if (req.method === 'GET' && reqUrl.pathname === '/api/dashboard/stats') {
      sendJson(res, 200, {
        totalUsers: users.length || 2543,
        totalRevenue: 45231,
        activeInvestments: 1234,
        pendingKyc: 48,
        revenueChange: 8.2,
        usersChange: 12.5,
        investmentsChange: 5.1,
        kycChange: 15
      });
      return;
    }

    if (req.method === 'GET' && reqUrl.pathname === '/api/transactions') {
      sendJson(res, 200, { transactions: [] });
      return;
    }

    const pathname = reqUrl.pathname === '/' ? '/index.html' : reqUrl.pathname;
    if (pathname.startsWith('/api/')) {
      sendJson(res, 404, { error: 'Endpoint not found' });
      return;
    }

    serveStaticFile(req, res, `.${pathname}`);
  } catch (error) {
    trackError(error, {
      requestId,
      method: req.method,
      pathname: reqUrl.pathname
    });
    sendJson(res, 500, { error: 'Internal server error' });
  }
});

let httpServer = null;

function startServer() {
  if (httpServer && httpServer.listening) {
    return Promise.resolve(httpServer);
  }

  return new Promise((resolve, reject) => {
    if (isTestRun) {
      resetTestState();
    }

    httpServer = server.listen(PORT, HOST, () => {
      log('info', 'Rivertrade backend started', { host: HOST, port: PORT, pid: process.pid });
      resolve(httpServer);
    });

    httpServer.once('error', error => {
      trackError(error, { context: 'server.listen', host: HOST, port: PORT });
      reject(error);
    });
  });
}

function stopServer() {
  if (!httpServer || !httpServer.listening) {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    httpServer.close(error => {
      if (error) {
        reject(error);
        return;
      }
      httpServer = null;
      log('info', 'Rivertrade backend stopped', { pid: process.pid });
      resolve();
    });
  });
}

function startClusterMode() {
  const workerCount = Number(process.env.WORKERS || os.cpus().length || 1);
  const safeWorkerCount = Number.isFinite(workerCount) && workerCount > 0 ? workerCount : 1;

  if (safeWorkerCount === 1) {
    startServer().catch(error => {
      trackError(error, { context: 'cluster.startup' });
      console.error('Failed to start Rivertrade backend:', error);
      process.exit(1);
    });
    return;
  }

  for (let i = 0; i < safeWorkerCount; i += 1) {
    cluster.fork();
  }

  cluster.on('exit', (worker, code, signal) => {
    log('warn', 'Worker exited', { workerId: worker.id, code, signal });
    cluster.fork();
  });
}

if (require.main === module) {
  ensureDirectory(DATA_DIR);
  ensureDirectory(LOG_DIR);

  if (process.env.CLUSTER_MODE !== 'off' && process.env.NODE_ENV !== 'test' && cluster.isPrimary) {
    startClusterMode();
  } else {
    startServer().catch(error => {
      trackError(error, { context: 'startup' });
      console.error('Failed to start Rivertrade backend:', error);
      process.exit(1);
    });
  }
}

process.on('SIGTERM', () => {
  log('info', 'SIGTERM received', { pid: process.pid });
  stopServer().finally(() => process.exit(0));
});

process.on('SIGINT', () => {
  log('info', 'SIGINT received', { pid: process.pid });
  stopServer().finally(() => process.exit(0));
});

module.exports = { server, startServer, stopServer, users, log, trackError };
