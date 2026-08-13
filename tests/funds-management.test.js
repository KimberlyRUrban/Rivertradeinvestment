const test = require('node:test');
const assert = require('node:assert/strict');
const { persistUserFinancialData } = require('../funds-management');

test('persistUserFinancialData writes to user storage and dashboard keys', () => {
  const storage = {};
  const localStorage = {
    getItem(key) {
      return Object.prototype.hasOwnProperty.call(storage, key) ? storage[key] : null;
    },
    setItem(key, value) {
      storage[key] = String(value);
    },
    removeItem(key) {
      delete storage[key];
    }
  };

  global.localStorage = localStorage;

  const user = {
    id: '7',
    name: 'Test User',
    email: 'test@example.com',
    balance: 100,
    brokerBalance: 200,
    investmentProfit: 50,
    cryptoHoldings: { BTC: 1 },
    activeInvestments: [{ planName: 'Basic', amount: 100 }],
    transactions: [{ type: 'deposit', amount: 100, status: 'completed' }],
    swaps: [{ from: 'USD', to: 'BTC', amount: 50 }],
    managedAccounts: [],
    referrals: [{ email: 'friend@example.com', bonus: 10 }],
    userData: { referralCode: 'ABC123' },
    storageKey: 'userState_7'
  };

  const result = persistUserFinancialData(user, user.storageKey, { syncDashboard: true });

  assert.equal(JSON.parse(storage.userState_7).balance, 100);
  assert.equal(storage.userBalance, '100');
  assert.equal(storage.userBrokerBalance, '200');
  assert.equal(storage.cryptoHoldings, JSON.stringify(user.cryptoHoldings));
  assert.equal(JSON.parse(storage.userData).referralCode, 'ABC123');
  assert.deepEqual(result.cryptoHoldings, user.cryptoHoldings);
});
