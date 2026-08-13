(function (globalScope) {
  function getStorage() {
    return globalScope && globalScope.localStorage ? globalScope.localStorage : null;
  }

  function readJSON(key, fallback) {
    const storage = getStorage();
    if (!storage) return fallback;
    try {
      const raw = storage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (error) {
      return fallback;
    }
  }

  function resolveUserStorageKey(user, storageKey) {
    if (storageKey) return storageKey;
    if (user && user.storageKey) return user.storageKey;
    if (user && user.id) return `userState_${user.id}`;
    return 'userState_default';
  }

  function buildAdminUserRecord(userData, storageKey) {
    const safeUser = userData || {};
    const resolvedId = safeUser.id || storageKey?.replace('userState_', '') || 'default';
    return {
      id: resolvedId,
      name: safeUser.name || 'Unknown User',
      email: safeUser.email || 'No email',
      balance: Number(safeUser.balance || 0),
      brokerBalance: Number(safeUser.brokerBalance || 0),
      investmentProfit: Number(safeUser.investmentProfit || 0),
      cryptoHoldings: safeUser.cryptoHoldings || {},
      activeInvestments: safeUser.activeInvestments || [],
      transactions: safeUser.transactions || [],
      swaps: safeUser.swaps || [],
      managedAccounts: safeUser.managedAccounts || [],
      referrals: safeUser.referrals || [],
      userData: safeUser.userData || {},
      status: safeUser.status || 'active',
      disabled: !!safeUser.disabled,
      disabledDate: safeUser.disabledDate || null,
      disabledReason: safeUser.disabledReason || null,
      storageKey
    };
  }

  function syncDashboardUserState(userStateData, options) {
    const storage = options && options.storage ? options.storage : getStorage();
    if (!storage) return userStateData;

    const dashboardState = {
      ...userStateData,
      userData: userStateData.userData || {},
      balance: Number(userStateData.balance || 0),
      brokerBalance: Number(userStateData.brokerBalance || 0),
      cryptoHoldings: userStateData.cryptoHoldings || {},
      activeInvestments: userStateData.activeInvestments || [],
      transactions: userStateData.transactions || [],
      swaps: userStateData.swaps || [],
      managedAccounts: userStateData.managedAccounts || [],
      referrals: userStateData.referrals || []
    };

    storage.setItem('userBalance', String(dashboardState.balance));
    storage.setItem('userBrokerBalance', String(dashboardState.brokerBalance));
    storage.setItem('cryptoHoldings', JSON.stringify(dashboardState.cryptoHoldings));
    storage.setItem('activeInvestments', JSON.stringify(dashboardState.activeInvestments));
    storage.setItem('profitHistory', JSON.stringify(userStateData.profitHistory || readJSON('profitHistory', [])));
    storage.setItem('transactions', JSON.stringify(dashboardState.transactions));
    storage.setItem('swaps', JSON.stringify(dashboardState.swaps));
    storage.setItem('managedAccounts', JSON.stringify(dashboardState.managedAccounts));
    storage.setItem('referrals', JSON.stringify(dashboardState.referrals));
    storage.setItem('userData', JSON.stringify(dashboardState.userData));

    if (globalScope && typeof globalScope.dispatchEvent === 'function') {
      try {
        globalScope.dispatchEvent(new globalScope.CustomEvent('rivertrade:user-state-updated'));
      } catch (error) {
        globalScope.dispatchEvent && globalScope.dispatchEvent(new Event('rivertrade:user-state-updated'));
      }
    }

    return dashboardState;
  }

  function persistUserFinancialData(user, storageKey, options) {
    const storage = getStorage();
    if (!storage) return null;

    const resolvedStorageKey = resolveUserStorageKey(user, storageKey);
    const currentState = readJSON(resolvedStorageKey, {});
    const mergedState = {
      ...currentState,
      id: user && user.id ? user.id : currentState.id || resolvedStorageKey.replace('userState_', ''),
      name: user && user.name ? user.name : currentState.name,
      email: user && user.email ? user.email : currentState.email,
      balance: Number(user && Number.isFinite(user.balance) ? user.balance : currentState.balance || 0),
      brokerBalance: Number(user && Number.isFinite(user.brokerBalance) ? user.brokerBalance : currentState.brokerBalance || 0),
      investmentProfit: Number(user && Number.isFinite(user.investmentProfit) ? user.investmentProfit : currentState.investmentProfit || 0),
      cryptoHoldings: user && user.cryptoHoldings ? user.cryptoHoldings : currentState.cryptoHoldings || {},
      activeInvestments: user && user.activeInvestments ? user.activeInvestments : currentState.activeInvestments || [],
      transactions: user && user.transactions ? user.transactions : currentState.transactions || [],
      swaps: user && user.swaps ? user.swaps : currentState.swaps || [],
      managedAccounts: user && user.managedAccounts ? user.managedAccounts : currentState.managedAccounts || [],
      referrals: user && user.referrals ? user.referrals : currentState.referrals || [],
      userData: { ...(currentState.userData || {}), ...(user && user.userData ? user.userData : {}) },
      disabled: user && Object.prototype.hasOwnProperty.call(user, 'disabled') ? !!user.disabled : !!currentState.disabled,
      disabledDate: user && Object.prototype.hasOwnProperty.call(user, 'disabledDate') ? user.disabledDate : currentState.disabledDate || null,
      disabledReason: user && Object.prototype.hasOwnProperty.call(user, 'disabledReason') ? user.disabledReason : currentState.disabledReason || null,
      status: user && user.status ? user.status : currentState.status || 'active',
      createdDate: user && user.createdDate ? user.createdDate : currentState.createdDate || new Date().toISOString()
    };

    storage.setItem(resolvedStorageKey, JSON.stringify(mergedState));

    if (!options || options.syncDashboard !== false) {
      syncDashboardUserState(mergedState, { storage });
    }

    return mergedState;
  }

  const api = {
    persistUserFinancialData,
    resolveUserStorageKey,
    buildAdminUserRecord,
    syncDashboardUserState,
    readJSON
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }

  globalScope.persistUserFinancialData = persistUserFinancialData;
  globalScope.resolveUserStorageKey = resolveUserStorageKey;
  globalScope.buildAdminUserRecord = buildAdminUserRecord;
  globalScope.syncDashboardUserState = syncDashboardUserState;
})(typeof globalThis !== 'undefined' ? globalThis : this);
