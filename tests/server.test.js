process.env.NODE_ENV = 'test';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { startServer, stopServer } = require('../server');

const userFile = path.join(__dirname, '..', 'data', 'users.json');
fs.mkdirSync(path.dirname(userFile), { recursive: true });
fs.writeFileSync(userFile, '[]', 'utf8');

test.before(async () => {
  await startServer();
});

test.after(async () => {
  await stopServer();
});

test('health endpoint responds', async () => {
  const response = await fetch('http://127.0.0.1:5000/health');
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.ok, true);
});

test('register endpoint creates a user', async () => {
  const response = await fetch('http://127.0.0.1:5000/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      firstName: 'Ada',
      lastName: 'Lovelace',
      email: 'ada@example.com',
      password: 'secret123',
      country: 'UK',
      countryCode: '+44',
      phone: '123456789',
      currency: 'USD'
    })
  });

  assert.equal(response.status, 201);
  const body = await response.json();
  assert.equal(body.message, 'Registration successful');
});
