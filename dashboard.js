// User Dashboard Functions

// Suppress TradingView telemetry errors globally
const originalFetch = window.fetch;
window.fetch = function(...args) {
    const url = args[0];
    // Suppress TradingView telemetry requests
    if (typeof url === 'string' && url.includes('telemetry.tradingview.com')) {
        return Promise.resolve(new Response('', { status: 204 }));
    }
    return originalFetch.apply(this, args);
};

// Check authentication
function checkAuth() {
    try {
        // Check if authToken exists (can be string or JSON)
        const authRaw = localStorage.getItem('authToken');
        if (!authRaw) { 
            // No auth token - allow demo access
            console.debug('No auth token found, allowing demo access');
            return true; // Allow dashboard access for demo
        }
        
        // Try to parse if it's JSON, otherwise treat as string token
        let token = authRaw;
        try {
            const parsed = JSON.parse(authRaw);
            token = parsed.token || authRaw;
        } catch (e) {
            // It's just a string token, not JSON
            token = authRaw;
        }
        
        // If we have a token, allow access
        if (token) {
            // Set display name
            const ud = JSON.parse(localStorage.getItem('userData') || '{}');
            const name = (ud && (ud.firstName || ud.email)) ? (ud.firstName || ud.email) : (localStorage.getItem('currentUser') || 'User');
            const disp = document.getElementById('userDisplay');
            if (disp) disp.textContent = name;
            return true;
        }
        
        // No token, allow demo access
        return true;
    } catch (e) { 
        console.debug('Auth check error:', e.message, 'allowing demo access');
        return true; // Allow demo access on error
    }
}

// Initialize Mobile Dashboard
function initMobileDashboard() {
    const userData = JSON.parse(localStorage.getItem('userData') || '{}');
    const firstName = userData.firstName || userData.email || 'User';
    
    // Update sidebar user display
    const userDisplay = document.getElementById('userDisplay');
    if (userDisplay) {
        userDisplay.textContent = firstName;
    }
    
    // Update greeting
    const greetingEl = document.getElementById('mobileUserGreeting');
    if (greetingEl) {
        greetingEl.textContent = `Hello ${firstName}!`;
    }

    // Update balance information (from userState)
    updateMobileBalance();

    // Add event listeners for mobile features
    setupMobileEventListeners();
}

// Update mobile balance display
function updateMobileBalance() {
    const availableBalanceEl = document.getElementById('mobileAvailableBalance');
    const lockedBalanceEl = document.getElementById('mobileLockedBalance');
    const totalProfitEl = document.getElementById('mobileTotalProfit');
    const bonusEl = document.getElementById('mobileBonus');
    const referralBonusEl = document.getElementById('mobileReferralBonus');
    const withdrawalsEl = document.getElementById('mobileWithdrawals');
    const brokerBalanceEl = document.getElementById('mobileBrokerBalance');

    // Calculate locked balance from active investments
    const lockedBalance = userState.activeInvestments.reduce((sum, inv) => sum + inv.amount, 0);
    
    // Calculate total profit from profit history
    const totalProfit = userState.profitHistory.reduce((sum, p) => sum + p.amount, 0);
    
    // Calculate referral bonus from referrals
    const referralBonus = userState.referrals.reduce((sum, r) => sum + (r.bonus || 0), 0);
    
    // Calculate total withdrawals from transactions
    const totalWithdrawals = userState.transactions
        .filter(tx => tx.type?.toLowerCase() === 'withdraw')
        .reduce((sum, tx) => sum + (tx.amount || 0), 0);
    
    // Calculate bonus (can be from deposits or other sources)
    const bonus = 0; // Default or fetch from userData

    if (availableBalanceEl) availableBalanceEl.textContent = '$' + (userState.balance || 0).toFixed(2);
    if (brokerBalanceEl) brokerBalanceEl.textContent = '$' + (userState.brokerBalance || 0).toFixed(2);
    if (lockedBalanceEl) lockedBalanceEl.textContent = '$' + lockedBalance.toFixed(2);
    if (totalProfitEl) totalProfitEl.textContent = '$' + totalProfit.toFixed(2);
    if (bonusEl) bonusEl.textContent = '$' + bonus.toFixed(2);
    if (referralBonusEl) referralBonusEl.textContent = '$' + referralBonus.toFixed(2);
    if (withdrawalsEl) withdrawalsEl.textContent = '$' + totalWithdrawals.toFixed(2);

    const cryptoHoldings = userState.cryptoHoldings || {};
    ['BTC','ETH','USDT','BNB','XRP','DOGE'].forEach(symbol => {
        const desktopEl = document.getElementById(`holding-${symbol}`);
        const mobileEl = document.getElementById(`mobileHolding-${symbol}`);
        const value = formatCryptoValue(parseFloat(cryptoHoldings[symbol] || 0));
        if (desktopEl) desktopEl.textContent = value;
        if (mobileEl) mobileEl.textContent = value;
    });

    const desktopAvailableEl = document.getElementById('desktopAvailableBalance');
    const desktopProfitEl = document.getElementById('desktopInvestmentProfit');
    const desktopLockedEl = document.getElementById('desktopLockedBalance');

    if (desktopAvailableEl) desktopAvailableEl.textContent = '$' + (userState.balance || 0).toFixed(2);
    if (desktopProfitEl) desktopProfitEl.textContent = '$' + totalProfit.toFixed(2);
    if (desktopLockedEl) desktopLockedEl.textContent = '$' + lockedBalance.toFixed(2);
}

// Update balance visibility (show/hide amounts)
function updateBalanceVisibility(isVisible) {
    const balanceElements = document.querySelectorAll('[data-balance-amount]');
    const statElements = document.querySelectorAll('.stat-value');
    
    if (isVisible) {
        // Show actual values
        balanceElements.forEach(el => {
            const originalValue = el.getAttribute('data-original-value');
            if (originalValue) {
                el.textContent = originalValue;
            }
        });
        statElements.forEach(el => {
            const originalValue = el.getAttribute('data-original-value');
            if (originalValue) {
                el.textContent = originalValue;
            }
        });
    } else {
        // Hide with asterisks and preserve amounts
        balanceElements.forEach(el => {
            if (!el.getAttribute('data-original-value')) {
                el.setAttribute('data-original-value', el.textContent);
            }
            const value = el.getAttribute('data-original-value');
            const match = value.match(/\$?(\d+(\.\d{2})?)/);
            if (match) {
                const amount = match[1];
                el.textContent = '$' + '•'.repeat(amount.replace('.', '').length);
            } else {
                el.textContent = '••••••';
            }
        });
        statElements.forEach(el => {
            if (!el.getAttribute('data-original-value')) {
                el.setAttribute('data-original-value', el.textContent);
            }
            el.textContent = '••••••';
        });
    }
}

// Update balance toggle icon
function updateBalanceToggleIcon(isVisible) {
    const balanceToggle = document.getElementById('balanceToggle');
    if (balanceToggle) {
        const icon = balanceToggle.querySelector('i');
        if (icon) {
            icon.className = isVisible ? 'fa-solid fa-eye' : 'fa-solid fa-eye-slash';
        }
        balanceToggle.setAttribute('aria-pressed', isVisible);
        balanceToggle.title = isVisible ? 'Hide balance' : 'Show balance';
    }
}

// Setup mobile event listeners
function setupMobileEventListeners() {
    // Welcome close button
    const welcomeClose = document.querySelector('.welcome-close');
    if (welcomeClose) {
        welcomeClose.addEventListener('click', () => {
            const banner = document.querySelector('.welcome-banner');
            if (banner) banner.style.display = 'none';
        });
    }

    // Balance visibility toggle - improved implementation
    const balanceToggle = document.getElementById('balanceToggle');
    if (balanceToggle) {
        let balanceVisible = localStorage.getItem('balanceVisible') !== 'false'; // Default to true
        
        // Initialize display state
        updateBalanceVisibility(balanceVisible);
        updateBalanceToggleIcon(balanceVisible);
        
        // Handle click/touch events
        balanceToggle.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            balanceVisible = !balanceVisible;
            localStorage.setItem('balanceVisible', balanceVisible);
            updateBalanceVisibility(balanceVisible);
            updateBalanceToggleIcon(balanceVisible);
        });
        
        // Support keyboard activation
        balanceToggle.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                balanceToggle.click();
            }
        });
    }

    // Mobile menu toggle
    const mobileMenuToggle = document.getElementById('mobileMenuToggle');
    if (mobileMenuToggle) {
        mobileMenuToggle.addEventListener('click', () => {
            const sidebar = document.querySelector('.sidebar');
            if (sidebar) {
                const isOpen = sidebar.classList.toggle('mobile-menu-open');
                document.body.classList.toggle('mobile-menu-active', isOpen);
                
                // Close menu when clicking outside
                if (isOpen) {
                    document.addEventListener('click', closeMobileMenuOnOutsideClick);
                }
            }
        });
    }

    // Close mobile menu on outside click
    function closeMobileMenuOnOutsideClick(e) {
        const sidebar = document.querySelector('.sidebar');
        const mobileMenuToggle = document.getElementById('mobileMenuToggle');
        
        if (sidebar && !sidebar.contains(e.target) && !mobileMenuToggle.contains(e.target)) {
            sidebar.classList.remove('mobile-menu-open');
            document.body.classList.remove('mobile-menu-active');
            document.removeEventListener('click', closeMobileMenuOnOutsideClick);
        }
    }

    // Close mobile menu when clicking on a nav item
    const sidebarNavItems = document.querySelectorAll('.sidebar .nav a');
    sidebarNavItems.forEach(item => {
        item.addEventListener('click', () => {
            const sidebar = document.querySelector('.sidebar');
            if (sidebar) {
                sidebar.classList.remove('mobile-menu-open');
                document.body.classList.remove('mobile-menu-active');
            }
        });
    });


    // Bottom navigation items
    const navItems = document.querySelectorAll('.mobile-bottom-nav .nav-item');
    navItems.forEach(item => {
        if (!item.classList.contains('menu-toggle')) {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                navItems.forEach(nav => nav.classList.remove('active'));
                item.classList.add('active');
                
                const nav = item.getAttribute('data-nav');
                handleMobileNavigation(nav);
            });
        }
    });
}

// Handle mobile navigation
function handleMobileNavigation(nav) {
    switch (nav) {
        case 'history':
            // Show transactions section and scroll to it
            const historySection = document.getElementById('transactionsSection');
            if (historySection) {
                historySection.style.display = 'block';
                historySection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                // Highlight the section temporarily
                historySection.style.backgroundColor = 'rgba(0, 0, 0, 0.05)';
                setTimeout(() => {
                    historySection.style.backgroundColor = 'transparent';
                }, 2000);
            } else {
                alert('Transactions section not found');
            }
            break;
        case 'deposit':
            // Open deposit modal
            const depositModal = document.getElementById('depositModal');
            if (depositModal) {
                depositModal.style.display = 'flex';
                depositModal.setAttribute('aria-hidden', 'false');
                document.body.style.overflow = 'hidden'; // Prevent scrolling when modal open
            } else {
                alert('Please contact support for deposit assistance');
            }
            break;
        case 'home':
            // Reload dashboard to home view
            window.location.href = 'dashboard.html';
            break;
        case 'withdraw':
            // Open withdraw modal
            const withdrawModal = document.getElementById('withdrawModal');
            if (withdrawModal) {
                withdrawModal.style.display = 'flex';
                withdrawModal.setAttribute('aria-hidden', 'false');
                document.body.style.overflow = 'hidden'; // Prevent scrolling when modal open
            } else {
                alert('Please contact support for withdrawal assistance');
            }
            break;
    }
}

// Global state management
const userState = {
    balance: parseFloat(localStorage.getItem('userBalance') || '0'),
    brokerBalance: parseFloat(localStorage.getItem('userBrokerBalance') || '0'),
    activeInvestments: JSON.parse(localStorage.getItem('activeInvestments') || '[]'),
    profitHistory: JSON.parse(localStorage.getItem('profitHistory') || '[]'),
    transactions: JSON.parse(localStorage.getItem('transactions') || '[]'),
    swaps: JSON.parse(localStorage.getItem('swaps') || '[]'),
    cryptoHoldings: JSON.parse(localStorage.getItem('cryptoHoldings') || '{}'),
    managedAccounts: JSON.parse(localStorage.getItem('managedAccounts') || '[]'),
    referrals: JSON.parse(localStorage.getItem('referrals') || '[]'),
    userData: JSON.parse(localStorage.getItem('userData') || '{}')
};

// Initialize empty crypto holdings if not present (users start with zero balance)
if (!userState.cryptoHoldings || Object.keys(userState.cryptoHoldings).length === 0) {
    userState.cryptoHoldings = {
        BTC: 0,
        ETH: 0,
        USDT: 0,
        BNB: 0,
        XRP: 0,
        DOGE: 0
    };
    localStorage.setItem('cryptoHoldings', JSON.stringify(userState.cryptoHoldings));
}

// Initialize managed accounts if not exists
if (userState.managedAccounts.length === 0) {
    userState.managedAccounts = [];
    localStorage.setItem('managedAccounts', JSON.stringify(userState.managedAccounts));
}

// Initialize referral code if not exists
if (!userState.userData.referralCode) {
    userState.userData.referralCode = 'REF_' + Math.random().toString(36).slice(2, 8).toUpperCase();
    localStorage.setItem('userData', JSON.stringify(userState.userData));
}

// Helper function to save userState to localStorage
function saveUserState() {
    localStorage.setItem('userBalance', userState.balance.toString());
    localStorage.setItem('userBrokerBalance', userState.brokerBalance.toString());
    localStorage.setItem('cryptoHoldings', JSON.stringify(userState.cryptoHoldings));
    localStorage.setItem('activeInvestments', JSON.stringify(userState.activeInvestments));
    localStorage.setItem('profitHistory', JSON.stringify(userState.profitHistory));
    localStorage.setItem('transactions', JSON.stringify(userState.transactions));
    localStorage.setItem('swaps', JSON.stringify(userState.swaps));
    localStorage.setItem('managedAccounts', JSON.stringify(userState.managedAccounts));
    localStorage.setItem('referrals', JSON.stringify(userState.referrals));
    localStorage.setItem('userData', JSON.stringify(userState.userData));
    window.dispatchEvent(new CustomEvent('rivertrade:user-state-updated'));
}

function refreshDashboardRealtime() {
    try {
        // Skip all refreshes if user is viewing a feature section (not the main dashboard)
        // This prevents scroll jumping and form state loss
        const currentView = window.currentDashboardView;
        if (currentView && currentView !== 'Dashboard' && currentView) {
            return; // Don't refresh when viewing feature sections like Swap Crypto
        }
        
        // Check if user is actively interacting with a form - if so, don't re-render
        const activeElement = document.activeElement;
        const isFormInput = activeElement && (
            activeElement.tagName === 'INPUT' || 
            activeElement.tagName === 'SELECT' || 
            activeElement.tagName === 'TEXTAREA'
        );
        
        // Skip full re-render if user is typing in a form
        if (isFormInput) {
            return;
        }
        
        // Only update balance elements on main dashboard
        updateMobileBalance();
    } catch (error) {
        console.warn('Realtime dashboard refresh failed:', error);
    }
}


const defaultDepositCryptoWallets = {
    BTC: {
        address: localStorage.getItem('adminBtcAddress') || '1A1z7agoat7W8EzGtqtU2CCZN6SHDA5tcD',
        network: localStorage.getItem('adminBtcNetwork') || 'Bitcoin Network'
    },
    USDT: {
        address: localStorage.getItem('adminUsdtAddress') || 'TVgcd7agoat7W8EzGtqtU2CCZN6SHDA5tcD',
        network: localStorage.getItem('adminUsdtNetwork') || 'TRC20'
    },
    ETH: {
        address: localStorage.getItem('adminEthAddress') || '0x0000000000000000000000000000000000000000',
        network: localStorage.getItem('adminEthNetwork') || 'ERC20'
    },
    BNB: {
        address: localStorage.getItem('adminBnbAddress') || 'bnb1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq',
        network: localStorage.getItem('adminBnbNetwork') || 'BEP20'
    },
    SOL: {
        address: localStorage.getItem('adminSolAddress') || 'SOLXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
        network: localStorage.getItem('adminSolNetwork') || 'Solana Network'
    },
    MATIC: {
        address: localStorage.getItem('adminMaticAddress') || '0x0000000000000000000000000000000000000000',
        network: localStorage.getItem('adminMaticNetwork') || 'Polygon (MATIC)'
    },
    TRX: {
        address: localStorage.getItem('adminTrxAddress') || 'TXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
        network: localStorage.getItem('adminTrxNetwork') || 'TRC20'
    }
};

function loadDepositCryptoWallets() {
    const storedWallets = JSON.parse(localStorage.getItem('adminCryptoWallets') || localStorage.getItem('depositCryptoWallets') || '{}');
    return { ...defaultDepositCryptoWallets, ...storedWallets };
}

function getEnabledDepositMethods() {
    const storedMethods = JSON.parse(localStorage.getItem('adminEnabledDepositMethods') || localStorage.getItem('depositEnabledMethods') || '[]');
    return Array.isArray(storedMethods) && storedMethods.length ? storedMethods : ['crypto', 'bank', 'card'];
}

function getEnabledWithdrawMethods() {
    const storedMethods = JSON.parse(localStorage.getItem('adminEnabledWithdrawMethods') || localStorage.getItem('withdrawEnabledMethods') || '[]');
    return Array.isArray(storedMethods) && storedMethods.length ? storedMethods : ['wallet', 'bank', 'paypal', 'stripe', 'sepa'];
}

function enforceDepositMethodOptions(selectElement) {
    if (!selectElement) return;
    const allowed = getEnabledDepositMethods();
    if (!allowed.length) {
        selectElement.innerHTML = '<option value="">No payment methods available</option>';
        selectElement.disabled = true;
        return;
    }

    Array.from(selectElement.options).forEach(option => {
        if (!option.value) return;
        const allowedOption = allowed.includes(option.value);
        option.hidden = !allowedOption;
        option.disabled = !allowedOption;
    });

    if (!allowed.includes(selectElement.value)) {
        selectElement.value = '';
    }
}

function enforceWithdrawMethodOptions(selectElement) {
    if (!selectElement) return;
    const allowed = getEnabledWithdrawMethods();
    if (!allowed.length) {
        selectElement.innerHTML = '<option value="">No withdrawal methods available</option>';
        selectElement.disabled = true;
        return;
    }

    Array.from(selectElement.options).forEach(option => {
        if (!option.value) return;
        const allowedOption = allowed.includes(option.value);
        option.hidden = !allowedOption;
        option.disabled = !allowedOption;
    });

    if (!allowed.includes(selectElement.value)) {
        selectElement.value = '';
    }
}

function updateWithdrawDetailFields(container, method) {
    if (!container) return;
    const detailGroups = container.querySelectorAll('.withdraw-details-group');
    detailGroups.forEach(group => {
        const isActive = group.getAttribute('data-method') === method;
        group.style.display = isActive ? 'block' : 'none';
        group.querySelectorAll('input, select, textarea').forEach(input => {
            input.required = isActive;
        });
    });
}

function initWithdrawMethodDetails(selectElement, container) {
    if (!selectElement || !container) return;
    updateWithdrawDetailFields(container, selectElement.value);
    selectElement.addEventListener('change', () => {
        updateWithdrawDetailFields(container, selectElement.value);
    });
}

function collectWithdrawMethodDetails(container, method) {
    const details = {};
    if (!container) return details;
    const getValue = (id) => container.querySelector(`#${id}`)?.value || '';

    switch (method) {
        case 'wallet':
            details.walletAddress = getValue('withdrawAddress');
            break;
        case 'bank':
            details.accountName = getValue('withdrawBankAccountName');
            details.accountNumber = getValue('withdrawBankAccountNumber');
            details.routingNumber = getValue('withdrawBankRoutingNumber');
            details.bankName = getValue('withdrawBankName');
            break;
        case 'paypal':
            details.paypalEmail = getValue('withdrawPaypalEmail');
            break;
        case 'stripe':
            details.cardName = getValue('withdrawCardName');
            details.cardNumber = getValue('withdrawCardNumber');
            details.cardExpiry = getValue('withdrawCardExpiry');
            details.cardCvv = getValue('withdrawCardCvv');
            break;
        case 'sepa':
            details.iban = getValue('withdrawSepaIban');
            details.bic = getValue('withdrawSepaBic');
            details.accountHolder = getValue('withdrawSepaAccountHolder');
            break;
    }
    return details;
}

const depositSettings = {
    enabledMethods: getEnabledDepositMethods(),
    cryptoWallets: loadDepositCryptoWallets(),
    cryptoCurrency: localStorage.getItem('adminCryptoCurrency') || localStorage.getItem('depositCryptoCurrency') || 'BTC',
    cryptoNetwork: localStorage.getItem('adminCryptoNetwork') || localStorage.getItem('depositCryptoNetwork') || 'TRC20',
    bankDetails: JSON.parse(localStorage.getItem('adminBankDetails') || localStorage.getItem('depositBankDetails') || JSON.stringify({
        accountName: 'Rivertrade Corp',
        accountNumber: '1234567890',
        bankName: 'Rivertrade Bank',
        swiftCode: 'RTBCUS33',
        iban: 'US00RTBC0000001234567890'
    })),
    cardDetails: JSON.parse(localStorage.getItem('adminCardDetails') || localStorage.getItem('depositCardDetails') || JSON.stringify({
        cardName: 'Rivertrade Payments',
        cardNumber: '4111 1111 1111 1111',
        bankName: 'Rivertrade Bank',
        routingNumber: '021000021'
    }))
};

function saveDepositSettings() {
    localStorage.setItem('depositCryptoWallets', JSON.stringify(depositSettings.cryptoWallets));
    localStorage.setItem('depositCryptoCurrency', depositSettings.cryptoCurrency);
    localStorage.setItem('depositCryptoNetwork', depositSettings.cryptoNetwork);
    localStorage.setItem('depositBankDetails', JSON.stringify(depositSettings.bankDetails));
    localStorage.setItem('depositCardDetails', JSON.stringify(depositSettings.cardDetails));
}

function loadDepositSettings() {
    depositSettings.cryptoWallets = loadDepositCryptoWallets();
    depositSettings.cryptoCurrency = localStorage.getItem('adminCryptoCurrency') || localStorage.getItem('depositCryptoCurrency') || 'BTC';
    depositSettings.cryptoNetwork = localStorage.getItem('adminCryptoNetwork') || localStorage.getItem('depositCryptoNetwork') || depositSettings.cryptoWallets[depositSettings.cryptoCurrency]?.network || 'TRC20';
    depositSettings.enabledMethods = getEnabledDepositMethods();
    depositSettings.bankDetails = JSON.parse(localStorage.getItem('adminBankDetails') || localStorage.getItem('depositBankDetails') || JSON.stringify({
        accountName: 'Rivertrade Bank',
        accountNumber: '1234567890',
        bankName: 'Rivertrade Bank',
        swiftCode: 'RTBKUS33',
        iban: 'US00RTBK00000012345678'
    }));
    depositSettings.cardDetails = JSON.parse(localStorage.getItem('adminCardDetails') || localStorage.getItem('depositCardDetails') || JSON.stringify({
        cardName: 'Rivertrade Payment',
        cardNumber: '4242 4242 4242 4242',
        bankName: 'Rivertrade Bank',
        routingNumber: '021000021'
    }));
}

function getDepositInstructions(method, currency = depositSettings.cryptoCurrency) {
    loadDepositSettings();
    switch (method) {
        case 'crypto': {
            const wallet = depositSettings.cryptoWallets[currency] || {
                address: depositSettings.cryptoAddress,
                network: depositSettings.cryptoNetwork
            };
            return {
                title: `Send ${currency} on ${wallet.network} to this wallet address:`,
                address: wallet.address,
                details: `Please send the exact amount of ${currency} on ${wallet.network} to the wallet above. Your deposit will be confirmed after 1–3 blockchain confirmations.`
            };
        }
        case 'bank':
            return {
                title: 'Use these bank transfer details:',
                address: `${depositSettings.bankDetails.accountName}\nAccount Number: ${depositSettings.bankDetails.accountNumber}\nBank Name: ${depositSettings.bankDetails.bankName}\nSWIFT: ${depositSettings.bankDetails.swiftCode}\nIBAN: ${depositSettings.bankDetails.iban}`,
                details: 'Please include your email address in the payment reference. Bank transfers may take 1–3 business days to process.'
            };
        case 'card':
            return {
                title: 'Use these card payment details:',
                address: `${depositSettings.cardDetails.cardName}\nCard Number: ${depositSettings.cardDetails.cardNumber}\nBank Name: ${depositSettings.cardDetails.bankName}\nRouting Number: ${depositSettings.cardDetails.routingNumber}`,
                details: 'For card deposits, follow the instructions from our payments partner. Do not share your full card PIN or CVV when making a transfer request.'
            };
        default:
            return null;
    }
}

function handleDeposit(amount, currency, depositMethod, depositAddress = '') {
    if (amount <= 0) return { success: false, message: 'Invalid amount' };
    if (!depositMethod) return { success: false, message: 'Please select a deposit method' };

    const now = new Date();
    const transaction = {
        id: String(Date.now()),
        type: 'Deposit',
        amount: amount,
        currency: currency || depositMethod,
        method: depositMethod,
        depositAddress: depositAddress,
        timestamp: now.toISOString(),
        date: now.toLocaleDateString(),
        user: localStorage.getItem('currentUser') || 'Guest',
        status: 'Pending Approval'
    };

    userState.transactions.push(transaction);
    saveUserState();
    return { success: true, message: 'Deposit request submitted and pending admin approval.', transaction };
}

// Withdraw functionality
function handleWithdraw({ amount, currency, address, method }) {
    if (!method) {
        return { success: false, message: 'Please select a withdrawal method' };
    }
    if (amount <= 0 || amount > userState.balance) {
        return { success: false, message: 'Invalid amount or insufficient balance' };
    }

    const transaction = {
        type: 'Withdraw',
        amount: amount,
        currency: currency || method,
        method: method,
        address: address,
        timestamp: new Date().toISOString(),
        status: 'Pending Approval'
    };

    userState.transactions.push(transaction);
    saveUserState();
    return { success: true, message: 'Withdrawal initiated', transaction };
}

// Investment Plans (consolidated Basic + Starter into a single Starter plan)
const defaultInvestmentPlans = [
    { id: 'starter', name: 'Starter Plan', minAmount: 5000, maxAmount: 9000, duration: 45, roi: 6 },
    { id: 'deluxe', name: 'Deluxe Plan', minAmount: 10000, maxAmount: 29000, duration: 60, roi: 8 },
    { id: 'premium', name: 'Premium Plan', minAmount: 30000, maxAmount: 49000, duration: 90, roi: 12 },
    { id: 'vip', name: 'VIP Plan', minAmount: 100000, maxAmount: 150000, duration: 120, roi: 18 },
    { id: 'gold', name: 'Gold Plan', minAmount: 200000, maxAmount: 300000, duration: 150, roi: 22 },
    { id: 'vip_platinum', name: 'VIP Platinum', minAmount: 500000, maxAmount: 1000000, duration: 180, roi: 30 }
];

function getInvestmentPlans() {
    try {
        const stored = JSON.parse(localStorage.getItem('investmentPlans') || 'null');
        return stored && Array.isArray(stored) ? stored : defaultInvestmentPlans;
    } catch (e) {
        return defaultInvestmentPlans;
    }
}

function processInvestmentFromSource(planId, amount, source) {
    const plan = getInvestmentPlans().find(p => p.id === planId);
    if (!plan) return { success: false, message: 'Invalid investment plan' };
    if (amount < plan.minAmount || amount > plan.maxAmount) {
        return { success: false, message: `Amount must be between $${plan.minAmount.toLocaleString()} and $${plan.maxAmount.toLocaleString()}.` };
    }

    const sourceBalance = getFundingSourceUsdValue(source);
    if (sourceBalance < amount) {
        return {
            success: false,
            message: `Insufficient funds in ${getFundingSourceLabel(source)}. Current available is $${sourceBalance.toFixed(2)}. Please deposit or choose another funding source.`
        };
    }

    if (source === 'balance') {
        userState.balance = parseFloat((userState.balance - amount).toFixed(2));
    } else if (source === 'brokerBalance') {
        userState.brokerBalance = parseFloat((userState.brokerBalance - amount).toFixed(2));
    } else {
        const prices = getCryptoPrices();
        const price = parseFloat(prices[source] || 0);
        const unitsToDeduct = parseFloat((amount / price).toFixed(6));
        userState.cryptoHoldings[source] = parseFloat((parseFloat(userState.cryptoHoldings[source] || 0) - unitsToDeduct).toFixed(6));
    }

    saveUserState();
    const investmentResult = startInvestment(planId, amount);
    if (!investmentResult.success) {
        return investmentResult;
    }
    return { success: true, message: `${investmentResult.message} Deducted $${amount.toFixed(2)} from ${getFundingSourceLabel(source)}.` };
}

function startInvestment(planId, amount) {
    const plan = getInvestmentPlans().find(p => p.id === planId);
    if (!plan) return { success: false, message: 'Invalid investment plan' };
    if (amount < plan.minAmount || amount > plan.maxAmount) {
        return { success: false, message: 'Amount out of range for selected plan' };
    }

    const investment = {
        id: `inv-${Date.now()}`,
        planId: planId,
        amount: amount,
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + plan.duration * 24 * 60 * 60 * 1000).toISOString(),
        expectedRoi: amount * (plan.roi / 100),
        status: 'active'
    };

    userState.activeInvestments.push(investment);
    saveUserState();
    return { success: true, message: 'Investment started', investment };
}

// Profit History
function getProfitHistory() {
    return userState.profitHistory;
}

// Get Expert Traders from localStorage
function getExpertTraders() {
    try {
        const experts = localStorage.getItem('expertTraders');
        return experts ? JSON.parse(experts) : getDefaultExperts();
    } catch (e) {
        return getDefaultExperts();
    }
}

// Default expert traders if none exist
function getDefaultExperts() {
    return [
        {
            id: 'expert-001',
            name: 'Alex Sterling',
            title: 'Bitcoin Trading Specialist',
            experience: '8 years',
            successRate: 87,
            totalFollowers: 2450,
            avgROI: 24.5,
            minInvestment: 100,
            specialty: 'BTC/USD',
            bio: 'Specialized in Bitcoin technical analysis and trend following.',
            verified: true
        },
        {
            id: 'expert-002',
            name: 'Sarah Chen',
            title: 'Altcoin Expert',
            experience: '6 years',
            successRate: 82,
            totalFollowers: 1820,
            avgROI: 31.2,
            minInvestment: 50,
            specialty: 'ETH/ALT',
            bio: 'Expert in altcoin selection and DeFi opportunities.',
            verified: true
        },
        {
            id: 'expert-003',
            name: 'Marcus Johnson',
            title: 'Risk Management Guru',
            experience: '10 years',
            successRate: 91,
            totalFollowers: 3200,
            avgROI: 18.7,
            minInvestment: 200,
            specialty: 'Portfolio Diversification',
            bio: 'Focus on capital preservation and consistent returns.',
            verified: true
        },
        {
            id: 'expert-004',
            name: 'Elena Rodriguez',
            title: 'Day Trading Master',
            experience: '5 years',
            successRate: 79,
            totalFollowers: 1340,
            avgROI: 35.8,
            minInvestment: 100,
            specialty: 'Intraday Trading',
            bio: 'High-frequency trading and scalping techniques.',
            verified: true
        }
    ];
}

// Copy Expert Trading
function startCopyTrading(expertId, amount) {
    const experts = getExpertTraders();
    const expert = experts.find(e => e.id === expertId);
    
    if (!expert) {
        return { success: false, message: 'Expert trader not found' };
    }
    
    if (amount < expert.minInvestment) {
        return { success: false, message: `Minimum investment is $${expert.minInvestment}` };
    }
    
    if (userState.balance < amount) {
        return { success: false, message: 'Insufficient balance' };
    }
    
    const copyTrade = {
        id: `copy-${Date.now()}`,
        expertId: expertId,
        expertName: expert.name,
        amount: amount,
        startDate: new Date().toISOString(),
        status: 'active',
        expectedROI: (amount * expert.avgROI / 100).toFixed(2)
    };

    // Deduct from balance and add to active copy trades
    userState.balance -= amount;
    userState.activeInvestments = userState.activeInvestments || [];
    userState.activeInvestments.push(copyTrade);
    saveUserState();
    
    return { success: true, message: 'Copy trading initiated successfully', copyTrade };
}

// Transaction History
function getTransactionHistory() {
    return userState.transactions;
}

// Get Active Investments
function getActiveInvestments() {
    return userState.activeInvestments;
}

// Logout function
function logout() {
    // Use AuthService logout if available, else fallback
    try { if (window.AuthService && typeof window.AuthService.logout === 'function') window.AuthService.logout(); } catch (e) { }
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('currentUser');
    // keep userData for offline UX (optional) — remove if you prefer full wipe
    window.location.href = 'auth.html';
}

// Event Listeners for UI Interactions
document.addEventListener('DOMContentLoaded', () => {
    // Initialize language system
    if (window.languageSwitcher) {
        const currentLang = localStorage.getItem('site_language') || 'en';
        window.languageSwitcher.setLanguage(currentLang);
    }
    
    // Check authentication first
    if (!checkAuth()) return;

    // Initialize mobile dashboard if on mobile
    initMobileDashboard();

    // Initialize tile click handlers
    setupTileClickHandlers();
    refreshDashboardRealtime();
    window.addEventListener('rivertrade:user-state-updated', refreshDashboardRealtime);
    window.addEventListener('rivertrade:admin-data-updated', refreshDashboardRealtime);
    window.addEventListener('storage', (event) => {
        if (event.key === 'investmentPlans' || event.key === 'userState' || event.key === 'userData') {
            refreshDashboardRealtime();
        }
    });
    
    // Store refresh interval ID so we can pause it when viewing feature sections
    let dashboardRefreshInterval = window.setInterval(refreshDashboardRealtime, 2000);
    window.pauseDashboardRefresh = () => {
        if (dashboardRefreshInterval) clearInterval(dashboardRefreshInterval);
    };
    window.resumeDashboardRefresh = () => {
        dashboardRefreshInterval = window.setInterval(refreshDashboardRealtime, 2000);
    };

    // Check if user came from investment button on index page
    const selectedPlan = sessionStorage.getItem('selectedInvestmentPlan');
    if (selectedPlan) {
        try {
            const plan = JSON.parse(selectedPlan);
            // Auto-open investment modal with pre-selected plan
            setTimeout(() => {
                const planObj = getInvestmentPlans().find(p => p.id === plan.planId);
                if (planObj) {
                    openInvestModal(plan.planId);
                }
            }, 300);
            sessionStorage.removeItem('selectedInvestmentPlan');
        } catch (e) { console.error('Failed to parse investment plan', e); }
    }

    // Attach click handlers to navigation items
    const nav = document.querySelector('.nav');
    nav.addEventListener('click', (e) => {
        const link = e.target.closest('a');
        if (!link) return;

        // Check if this is the home button - allow default navigation
        const label = link.querySelector('.label');
        if (label && label.textContent === 'Home') {
            return; // Allow default link behavior for home button
        }

        e.preventDefault();
        const section = label ? label.textContent : '';

        // Remove active class from all links
        nav.querySelectorAll('a').forEach(a => a.classList.remove('active'));
        // Add active class to clicked link
        link.classList.add('active');

        // Update main content based on section
        updateMainContent(section);
    });

    // Modal closing functionality
    setupModalHandlers();
});

// Setup modal open/close handlers
function setupModalHandlers() {
    // Close buttons for modals
    document.querySelectorAll('.modal-close').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const modalId = btn.getAttribute('data-modal');
            const modal = document.getElementById(modalId);
            if (modal) {
                modal.style.display = 'none';
                modal.setAttribute('aria-hidden', 'true');
                document.body.style.overflow = 'auto';
            }
        });
    });

    // Backdrop click to close
    document.querySelectorAll('.modal-backdrop').forEach(backdrop => {
        backdrop.addEventListener('click', (e) => {
            const modal = e.target.closest('.modal');
            if (modal) {
                modal.style.display = 'none';
                modal.setAttribute('aria-hidden', 'true');
                document.body.style.overflow = 'auto';
            }
        });
    });

    // Deposit Modal
    const depositConfirm = document.getElementById('depositConfirm');
    if (depositConfirm) {
        depositConfirm.addEventListener('click', () => {
            const amount = parseFloat(document.getElementById('depositAmount').value);
            if (!amount || amount < 100) {
                alert('Please enter an amount of at least $100');
                return;
            }
            const method = document.getElementById('depositMethod').value;
            const currency = document.getElementById('depositCurrency')?.value || 'BTC';
            if (!method) {
                alert('Please select a payment method');
                return;
            }

            const allowedMethods = getEnabledDepositMethods();
            if (!allowedMethods.includes(method)) {
                alert('Selected payment method is currently disabled by admin. Please choose an allowed method.');
                return;
            }

            const instructions = getDepositInstructions(method, currency);
            const result = handleDeposit(amount, currency, method, instructions?.address || '');
            if (result.success) {
                alert(result.message + '\nYou will receive further instructions.');
                updateMobileBalance(); // Update display
                const modal = document.getElementById('depositModal');
                if (modal) {
                    modal.style.display = 'none';
                    modal.setAttribute('aria-hidden', 'true');
                    document.body.style.overflow = 'auto';
                }
            } else {
                alert('Error: ' + result.message);
            }
        });
    }

    // Withdraw Modal
    const withdrawConfirm = document.getElementById('withdrawConfirm');
    if (withdrawConfirm) {
        const withdrawModalSelect = document.querySelector('#withdrawModal #withdrawMethod');
        const withdrawModalDetailsContainer = document.querySelector('#withdrawModal #withdrawMethodDetailsContainer');
        if (withdrawModalSelect) {
            enforceWithdrawMethodOptions(withdrawModalSelect);
            initWithdrawMethodDetails(withdrawModalSelect, withdrawModalDetailsContainer);
        }

        withdrawConfirm.addEventListener('click', () => {
            const modal = document.getElementById('withdrawModal');
            const withdrawMethodSelect = modal?.querySelector('#withdrawMethod');
            const amount = parseFloat(modal?.querySelector('#withdrawAmount')?.value || '0');
            const method = withdrawMethodSelect?.value || '';
            const address = modal?.querySelector('#withdrawAddress')?.value || '';
            const methodDetails = collectWithdrawMethodDetails(modal?.querySelector('#withdrawMethodDetailsContainer'), method);

            if (!withdrawMethodSelect) {
                alert('Withdrawal method selector not found.');
                return;
            }

            if (!amount || amount < 50) {
                alert('Please enter an amount of at least $50');
                return;
            }
            if (!method) {
                alert('Please select a withdrawal method');
                return;
            }

            const allowedWithdrawMethods = getEnabledWithdrawMethods();
            if (!allowedWithdrawMethods.includes(method)) {
                alert('Selected withdrawal method is currently disabled by admin. Please choose an allowed method.');
                return;
            }

            if (method === 'wallet' && !address) {
                alert('Please enter your wallet address');
                return;
            }
            if (method !== 'wallet' && Object.values(methodDetails).some(value => !value)) {
                alert('Please fill in all required withdrawal details for the selected payment method.');
                return;
            }

            const result = handleWithdraw({ amount, currency: method, address: address || '', method, details: methodDetails });
            if (result.success) {
                alert(result.message + '\nYou will receive a confirmation email.');
                updateMobileBalance(); // Update display
                const modal = document.getElementById('withdrawModal');
                if (modal) {
                    modal.style.display = 'none';
                    modal.setAttribute('aria-hidden', 'true');
                    document.body.style.overflow = 'auto';
                }
            } else {
                alert('Error: ' + result.message);
            }
        });
    }

    // Show deposit instructions when payment method changes
    const depositMethod = document.getElementById('depositMethod');
    const depositCurrency = document.getElementById('depositCurrency');
    const depositCurrencyGroup = document.getElementById('depositCurrencyGroup');
    const depositNetworkGroup = document.getElementById('depositNetworkGroup');
    if (depositMethod) {
        enforceDepositMethodOptions(depositMethod);
        depositMethod.addEventListener('change', (e) => {
            const instructionsPanel = document.getElementById('depositInstructionsPanel');
            const titleEl = document.getElementById('depositInstructionTitle');
            const addressEl = document.getElementById('depositAddressDisplay');
            const detailsEl = document.getElementById('depositMethodDetails');
            const copyBtn = document.getElementById('copyDepositAddress');

            if (depositCurrencyGroup) {
                depositCurrencyGroup.style.display = e.target.value === 'crypto' ? 'block' : 'none';
            }
            if (depositNetworkGroup) {
                depositNetworkGroup.style.display = e.target.value === 'crypto' ? 'block' : 'none';
            }

            const selectedCurrency = depositCurrency?.value || 'BTC';
            const instructions = getDepositInstructions(e.target.value, selectedCurrency);
            if (instructions && instructionsPanel) {
                instructionsPanel.style.display = 'block';
                if (titleEl) titleEl.textContent = instructions.title;
                if (addressEl) addressEl.textContent = instructions.address;
                if (detailsEl) detailsEl.textContent = instructions.details;
                if (copyBtn) {
                    copyBtn.style.display = 'inline-block';
                    copyBtn.onclick = () => {
                        navigator.clipboard.writeText(instructions.address).then(() => {
                            alert('Deposit instructions copied to clipboard.');
                        }).catch(() => {
                            alert('Unable to copy. Please copy the address manually.');
                        });
                    };
                }
            } else if (instructionsPanel) {
                instructionsPanel.style.display = 'none';
            }
        });
    }
    if (depositCurrency) {
        depositCurrency.addEventListener('change', () => {
            if (depositMethod && depositMethod.value === 'crypto') {
                const instructionsPanel = document.getElementById('depositInstructionsPanel');
                const titleEl = document.getElementById('depositInstructionTitle');
                const addressEl = document.getElementById('depositAddressDisplay');
                const detailsEl = document.getElementById('depositMethodDetails');
                const copyBtn = document.getElementById('copyDepositAddress');

                const instructions = getDepositInstructions('crypto', depositCurrency.value);
                if (instructions && instructionsPanel) {
                    instructionsPanel.style.display = 'block';
                    if (titleEl) titleEl.textContent = instructions.title;
                    if (addressEl) addressEl.textContent = instructions.address;
                    if (detailsEl) detailsEl.textContent = instructions.details;
                    if (copyBtn) {
                        copyBtn.style.display = 'inline-block';
                        copyBtn.onclick = () => {
                            navigator.clipboard.writeText(instructions.address).then(() => {
                                alert('Deposit instructions copied to clipboard.');
                            }).catch(() => {
                                alert('Unable to copy. Please copy the address manually.');
                            });
                        };
                    }
                }
            }
        });
    }
}

// Function to update main content based on selected section
function updateMainContent(section) {
    const main = document.querySelector('main');
    let content = '';

    switch (section) {
        case 'Deposit':
            content = `
                <h2>Deposit Funds</h2>
                <div class="form-container">
                    <form id="depositForm" class="dashboard-form">
                        <div class="form-group">
                            <label for="depositAmount">Amount</label>
                            <input type="number" id="depositAmount" min="0" step="0.01" required>
                        </div>
                                <div class="form-group">
                            <label for="depositMethodSelect">Payment Method</label>
                            <select id="depositMethodSelect" required>
                                <option value="">-- Choose Payment Method --</option>
                                <option value="crypto">Cryptocurrency</option>
                                <option value="bank">Bank Transfer</option>
                                <option value="card">Debit/Credit Card</option>
                            </select>
                        </div>
                        <div class="form-group" id="depositCurrencyGroupPage" style="display:none;">
                            <label for="depositCurrencyPage">Cryptocurrency</label>
                            <select id="depositCurrencyPage">
                                <option value="BTC">Bitcoin (BTC)</option>
                                <option value="USDT">Tether (USDT)</option>
                                <option value="ETH">Ethereum (ETH)</option>
                                <option value="BNB">Binance Coin (BNB)</option>
                                <option value="SOL">Solana (SOL)</option>
                                <option value="MATIC">Polygon (MATIC)</option>
                                <option value="TRX">Tron (TRX)</option>
                            </select>
                        </div>
                        <div id="depositSectionInstructionsPanel" style="display:none; margin-top:15px; padding:15px; background:#f0f0f0; border-radius:8px;">
                            <p id="depositSectionInstructionTitle" style="margin:0 0 10px 0;"></p>
                            <code id="depositSectionAddressDisplay" style="word-break:break-all; background:#fff; padding:10px; border-radius:4px; display:block; margin:0 0 10px 0;"></code>
                            <button type="button" id="copyDepositSectionAddress" class="btn-secondary" style="display:none; margin-bottom:10px;">Copy address/details</button>
                            <div id="depositSectionMethodDetails" style="white-space:pre-wrap; color:#333;"></div>
                        </div>
                        <div class="form-group">
                            <label for="depositNetworkPage">Select Network</label>
                            <select id="depositNetworkPage" required>
                                <option value="">-- Choose Network --</option>
                                <option value="btc">Bitcoin Network</option>
                                <option value="mainnet">Mainnet</option>
                                <option value="bep20">BEP20 (Binance Smart Chain)</option>
                                <option value="erc20">ERC20 (Ethereum)</option>
                                <option value="trc20">TRC20 (Tron)</option>
                                <option value="solana">Solana Network</option>
                                <option value="polygon">Polygon (MATIC)</option>
                            </select>
                        </div>
                        <button type="submit" class="btn-primary">Deposit</button>
                    </form>
                </div>
            `;
            break;

        case 'Withdraw':
            content = `
                <h2>Withdraw Funds</h2>
                <div class="form-container">
                    <form id="withdrawForm" class="dashboard-form">
                        <div class="form-group">
                            <label for="withdrawAmount">Amount</label>
                            <input type="number" id="withdrawAmount" min="0" step="0.01" required>
                        </div>
                        <div class="form-group">
                            <label for="withdrawCurrency">Select Cryptocurrency</label>
                            <select id="withdrawCurrency" required>
                                <option value="">-- Choose Currency --</option>
                                <option value="BTC">Bitcoin (BTC)</option>
                                <option value="ETH">Ethereum (ETH)</option>
                                <option value="USDT">Tether (USDT)</option>
                                <option value="BNB">Binance Coin (BNB)</option>
                                <option value="XRP">Ripple (XRP)</option>
                                <option value="SOL">Solana (SOL)</option>
                                <option value="DOGE">Dogecoin (DOGE)</option>
                                <option value="ADA">Cardano (ADA)</option>
                                <option value="LINK">Chainlink (LINK)</option>
                                <option value="LTC">Litecoin (LTC)</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="withdrawMethod">Withdrawal Method</label>
                            <select id="withdrawMethod" required>
                                <option value="">-- Choose Method --</option>
                                <option value="wallet">Blockchain Wallet Address</option>
                                <option value="bank">Bank Transfer</option>
                                <option value="paypal">PayPal</option>
                                <option value="stripe">Credit/Debit Card (Stripe)</option>
                                <option value="sepa">SEPA Transfer</option>
                            </select>
                        </div>
                        <div id="withdrawMethodDetailsContainerPage">
                          <div id="withdrawDetailsWalletPage" class="withdraw-details-group" data-method="wallet">
                            <div class="form-group">
                              <label for="withdrawAddress">Wallet Address</label>
                              <input type="text" id="withdrawAddress" placeholder="Enter wallet address" required>
                            </div>
                            <div class="form-group">
                              <label for="withdrawNetwork">Network (if applicable)</label>
                              <select id="withdrawNetwork">
                                <option value="">-- Select Network --</option>
                                <option value="btc">Bitcoin Network</option>
                                <option value="mainnet">Mainnet</option>
                                <option value="bep20">BEP20</option>
                                <option value="erc20">ERC20</option>
                                <option value="trc20">TRC20</option>
                                <option value="solana">Solana Network</option>
                                <option value="polygon">Polygon (MATIC)</option>
                              </select>
                            </div>
                          </div>
                          <div id="withdrawDetailsBankPage" class="withdraw-details-group" data-method="bank" style="display:none;">
                            <div class="form-group">
                              <label for="withdrawBankAccountName">Account Name</label>
                              <input type="text" id="withdrawBankAccountName" placeholder="Account holder name" />
                            </div>
                            <div class="form-group">
                              <label for="withdrawBankAccountNumber">Account Number</label>
                              <input type="text" id="withdrawBankAccountNumber" placeholder="Account number" />
                            </div>
                            <div class="form-group">
                              <label for="withdrawBankRoutingNumber">Routing Number</label>
                              <input type="text" id="withdrawBankRoutingNumber" placeholder="Routing number" />
                            </div>
                            <div class="form-group">
                              <label for="withdrawBankName">Bank Name</label>
                              <input type="text" id="withdrawBankName" placeholder="Bank name" />
                            </div>
                          </div>
                          <div id="withdrawDetailsPaypalPage" class="withdraw-details-group" data-method="paypal" style="display:none;">
                            <div class="form-group">
                              <label for="withdrawPaypalEmail">PayPal Email</label>
                              <input type="email" id="withdrawPaypalEmail" placeholder="example@paypal.com" />
                            </div>
                          </div>
                          <div id="withdrawDetailsStripePage" class="withdraw-details-group" data-method="stripe" style="display:none;">
                            <div class="form-group">
                              <label for="withdrawCardName">Cardholder Name</label>
                              <input type="text" id="withdrawCardName" placeholder="Name on card" />
                            </div>
                            <div class="form-group">
                              <label for="withdrawCardNumber">Card Number</label>
                              <input type="text" id="withdrawCardNumber" placeholder="1234 5678 9012 3456" />
                            </div>
                            <div class="form-group">
                              <label for="withdrawCardExpiry">Expiry Date</label>
                              <input type="text" id="withdrawCardExpiry" placeholder="MM/YY" />
                            </div>
                            <div class="form-group">
                              <label for="withdrawCardCvv">CVV</label>
                              <input type="text" id="withdrawCardCvv" placeholder="CVV" />
                            </div>
                          </div>
                          <div id="withdrawDetailsSepaPage" class="withdraw-details-group" data-method="sepa" style="display:none;">
                            <div class="form-group">
                              <label for="withdrawSepaIban">IBAN</label>
                              <input type="text" id="withdrawSepaIban" placeholder="IBAN" />
                            </div>
                            <div class="form-group">
                              <label for="withdrawSepaBic">BIC / SWIFT</label>
                              <input type="text" id="withdrawSepaBic" placeholder="BIC or SWIFT code" />
                            </div>
                            <div class="form-group">
                              <label for="withdrawSepaAccountHolder">Account Holder</label>
                              <input type="text" id="withdrawSepaAccountHolder" placeholder="Account holder name" />
                            </div>
                          </div>
                        </div>
                        <button type="submit" class="btn-primary">Withdraw</button>
                    </form>
                </div>
            `;
            break;

        case 'Investment Plans':
            content = `
                <h2>Investment Plans</h2>
                <div class="plans-grid">
                    ${getInvestmentPlans().map((plan, idx) => `
                        <div class="plan-card" data-index="${idx}">
                            <h3>${plan.name}</h3>
                            <div class="plan-details">
                                <p>Min: $${plan.minAmount.toLocaleString()}</p>
                                <p>Max: $${plan.maxAmount.toLocaleString()}</p>
                                <p>Duration: ${plan.duration} days</p>
                                <p>ROI: ${plan.roi}%</p>
                            </div>
                            <button class="btn-invest" data-plan="${plan.id}">Invest Now</button>
                        </div>
                    `).join('')}
                </div>
            `;
            break;

        case 'Profit History':
            const profits = getProfitHistory();
            content = `
                <h2>Profit History</h2>
                <div class="table-container">
                    <table class="dashboard-table">
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Amount</th>
                                <th>Source</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${profits.length ? profits.map(profit => `
                                <tr>
                                    <td>${new Date(profit.timestamp).toLocaleDateString()}</td>
                                    <td>$${profit.amount.toFixed(2)}</td>
                                    <td>${profit.source}</td>
                                    <td>${profit.status}</td>
                                </tr>
                            `).join('') : '<tr><td colspan="4">No profit history available</td></tr>'}
                        </tbody>
                    </table>
                </div>
            `;
            break;

        case 'Copy Expert':
            const experts = getExpertTraders();
            const activeCopyTrades = userState.activeInvestments.filter(inv => inv.expertId);
            content = `
                <h2>Copy Expert Trading</h2>
                <div style="margin-bottom: 30px;">
                    <h3>Available Expert Traders</h3>
                    <div class="experts-grid">
                        ${experts.map(expert => `
                            <div class="expert-card" style="background: white; border: 1px solid #e0e0e0; border-radius: 10px; padding: 20px; display: flex; flex-direction: column;">
                                <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 15px;">
                                    <div>
                                        <h3 style="margin: 0 0 5px 0; font-size: 18px;">${expert.name}</h3>
                                        <p style="margin: 0; color: #5e3fc9; font-weight: 500;">${expert.title}</p>
                                        ${expert.verified ? '<span style="display: inline-block; background: #00b894; color: white; padding: 3px 8px; border-radius: 4px; font-size: 12px; margin-top: 5px;">✓ Verified</span>' : ''}
                                    </div>
                                </div>
                                <div style="border-top: 1px solid #f0f0f0; padding-top: 15px; margin-bottom: 15px;">
                                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; font-size: 14px;">
                                        <div>
                                            <p style="margin: 0; color: #999; font-size: 12px;">Experience</p>
                                            <p style="margin: 5px 0 0 0; font-weight: bold;">${expert.experience}</p>
                                        </div>
                                        <div>
                                            <p style="margin: 0; color: #999; font-size: 12px;">Success Rate</p>
                                            <p style="margin: 5px 0 0 0; font-weight: bold; color: #00b894;">${expert.successRate}%</p>
                                        </div>
                                        <div>
                                            <p style="margin: 0; color: #999; font-size: 12px;">Avg ROI</p>
                                            <p style="margin: 5px 0 0 0; font-weight: bold; color: #5e3fc9;">${expert.avgROI}%</p>
                                        </div>
                                        <div>
                                            <p style="margin: 0; color: #999; font-size: 12px;">Followers</p>
                                            <p style="margin: 5px 0 0 0; font-weight: bold;">${expert.totalFollowers.toLocaleString()}</p>
                                        </div>
                                    </div>
                                </div>
                                <div style="border-top: 1px solid #f0f0f0; padding-top: 15px; margin-bottom: 15px;">
                                    <p style="margin: 0 0 10px 0; color: #999; font-size: 12px;">Specialty</p>
                                    <p style="margin: 0 0 10px 0; font-weight: bold; color: #666;">${expert.specialty}</p>
                                    <p style="margin: 0; color: #666; font-size: 13px; line-height: 1.5;">${expert.bio}</p>
                                </div>
                                <div style="border-top: 1px solid #f0f0f0; padding-top: 15px;">
                                    <p style="margin: 0 0 10px 0; color: #999; font-size: 12px;">Min Investment</p>
                                    <p style="margin: 0 0 15px 0; font-weight: bold; font-size: 16px;">$${expert.minInvestment}</p>
                                    <button onclick="showCopyTradeModal('${expert.id}', '${expert.name}', ${expert.minInvestment}, ${expert.avgROI})" class="btn-primary" style="width: 100%; padding: 10px; border: none; border-radius: 6px; background: #5e3fc9; color: white; font-weight: bold; cursor: pointer;">Copy This Trader</button>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
                
                ${activeCopyTrades.length ? `
                    <div style="margin-top: 40px;">
                        <h3>Active Copy Trades</h3>
                        <div class="table-container">
                            <table class="dashboard-table">
                                <thead>
                                    <tr>
                                        <th>Expert</th>
                                        <th>Amount</th>
                                        <th>Expected ROI</th>
                                        <th>Status</th>
                                        <th>Started</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${activeCopyTrades.map(trade => `
                                        <tr>
                                            <td>${trade.expertName}</td>
                                            <td>$${trade.amount.toFixed(2)}</td>
                                            <td>$${trade.expectedROI}</td>
                                            <td><span class="status-badge active">${trade.status}</span></td>
                                            <td>${new Date(trade.startDate).toLocaleDateString()}</td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ` : ''}
            `;
            break;

        case 'Transactions':
            const transactions = getTransactionHistory();
            content = `
                <h2>Transaction History</h2>
                <div class="table-container">
                    <table class="dashboard-table">
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Type</th>
                                <th>Amount</th>
                                <th>Currency</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${transactions.length ? transactions.map(tx => `
                                <tr>
                                    <td>${new Date(tx.timestamp).toLocaleDateString()}</td>
                                    <td>${tx.type}</td>
                                    <td>${tx.amount}</td>
                                    <td>${tx.currency}</td>
                                    <td>${tx.status}</td>
                                </tr>
                            `).join('') : '<tr><td colspan="5">No transactions available</td></tr>'}
                        </tbody>
                    </table>
                </div>
            `;
            break;

        case 'My Investments':
            const investments = getActiveInvestments();
            content = `
                <h2>My Investments</h2>
                <div class="investments-grid">
                    ${investments.length ? investments.map(inv => `
                        <div class="investment-card">
                            <h3>${inv.planId}</h3>
                            <div class="investment-details">
                                <p>Amount: $${inv.amount}</p>
                                <p>Start Date: ${new Date(inv.startDate).toLocaleDateString()}</p>
                                <p>End Date: ${new Date(inv.endDate).toLocaleDateString()}</p>
                                <p>Expected ROI: $${inv.expectedRoi}</p>
                                <p class="status ${inv.status}">${inv.status}</p>
                            </div>
                        </div>
                    `).join('') : '<p class="no-data">No active investments</p>'}
                </div>
            `;
            break;

        case 'Contact Support':
            content = renderContactSupportView();
            break;

        default:
            // Home view - keep existing content
            return;
    }

    main.innerHTML = content;
    attachEventHandlers(section);
}

// Attach event handlers for the different sections
function attachEventHandlers(section) {
    switch (section) {
        case 'Deposit':
            const depositForm = document.getElementById('depositForm');
            if (depositForm) {
                depositForm.addEventListener('submit', (e) => {
                    e.preventDefault();
                    const amount = parseFloat(document.getElementById('depositAmount').value);
                    const currency = document.getElementById('depositCurrencyPage')?.value || 'BTC';
                    const method = document.getElementById('depositMethodSelect').value;
                    if (!method) {
                        alert('Please select a payment method.');
                        return;
                    }
                    const allowedMethods = getEnabledDepositMethods();
                    if (!allowedMethods.includes(method)) {
                        alert('Selected payment method is currently disabled by admin. Please choose an allowed method.');
                        return;
                    }
                    const instructions = getDepositInstructions(method, currency);
                    const result = handleDeposit(amount, currency, method, instructions?.address || '');
                    alert(result.message);
                });
            }
            const depositMethodSelect = document.getElementById('depositMethodSelect');
            const depositCurrencyGroup = document.getElementById('depositCurrencyGroupPage');
            const depositCurrency = document.getElementById('depositCurrencyPage');
            if (depositMethodSelect) {
                enforceDepositMethodOptions(depositMethodSelect);
                depositMethodSelect.addEventListener('change', (e) => {
                    const instructionsPanel = document.getElementById('depositSectionInstructionsPanel');
                    const titleEl = document.getElementById('depositSectionInstructionTitle');
                    const addressEl = document.getElementById('depositSectionAddressDisplay');
                    const detailsEl = document.getElementById('depositSectionMethodDetails');
                    const copyBtn = document.getElementById('copyDepositSectionAddress');

                    if (depositCurrencyGroup) {
                        depositCurrencyGroup.style.display = e.target.value === 'crypto' ? 'block' : 'none';
                    }

                    const selectedCurrency = depositCurrency?.value || 'BTC';
                    const instructions = getDepositInstructions(e.target.value, selectedCurrency);
                    if (instructions && instructionsPanel) {
                        instructionsPanel.style.display = 'block';
                        if (titleEl) titleEl.textContent = instructions.title;
                        if (addressEl) addressEl.textContent = instructions.address;
                        if (detailsEl) detailsEl.textContent = instructions.details;
                        if (copyBtn) {
                            copyBtn.style.display = 'inline-block';
                            copyBtn.onclick = () => {
                                navigator.clipboard.writeText(instructions.address).then(() => {
                                    alert('Deposit instructions copied to clipboard.');
                                }).catch(() => {
                                    alert('Unable to copy. Please copy the details manually.');
                                });
                            };
                        }
                    } else if (instructionsPanel) {
                        instructionsPanel.style.display = 'none';
                    }
                });
            }
            if (depositCurrency) {
                depositCurrency.addEventListener('change', () => {
                    if (depositMethodSelect && depositMethodSelect.value === 'crypto') {
                        const instructionsPanel = document.getElementById('depositSectionInstructionsPanel');
                        const titleEl = document.getElementById('depositSectionInstructionTitle');
                        const addressEl = document.getElementById('depositSectionAddressDisplay');
                        const detailsEl = document.getElementById('depositSectionMethodDetails');
                        const copyBtn = document.getElementById('copyDepositSectionAddress');
                        const instructions = getDepositInstructions('crypto', depositCurrency.value);
                        if (instructions && instructionsPanel) {
                            instructionsPanel.style.display = 'block';
                            if (titleEl) titleEl.textContent = instructions.title;
                            if (addressEl) addressEl.textContent = instructions.address;
                            if (detailsEl) detailsEl.textContent = instructions.details;
                            if (copyBtn) {
                                copyBtn.style.display = 'inline-block';
                                copyBtn.onclick = () => {
                                    navigator.clipboard.writeText(instructions.address).then(() => {
                                        alert('Deposit instructions copied to clipboard.');
                                    }).catch(() => {
                                        alert('Unable to copy. Please copy the details manually.');
                                    });
                                };
                            }
                        }
                    }
                });
            }
            break;

        case 'Withdraw':
            const withdrawForm = document.getElementById('withdrawForm');
            const withdrawMethodSelect = document.getElementById('withdrawMethod');
            const withdrawMethodDetailsContainerPage = document.getElementById('withdrawMethodDetailsContainerPage');
            if (withdrawMethodSelect) {
                enforceWithdrawMethodOptions(withdrawMethodSelect);
                initWithdrawMethodDetails(withdrawMethodSelect, withdrawMethodDetailsContainerPage);
            }
            if (withdrawForm) {
                withdrawForm.addEventListener('submit', (e) => {
                    e.preventDefault();
                    const amount = parseFloat(document.getElementById('withdrawAmount').value);
                    const currency = document.getElementById('withdrawCurrency').value;
                    const method = withdrawMethodSelect?.value || '';
                    const address = document.getElementById('withdrawAddress')?.value || '';
                    const methodDetails = collectWithdrawMethodDetails(withdrawMethodDetailsContainerPage, method);

                    if (!method) {
                        alert('Please select a withdrawal method');
                        return;
                    }
                    if (method === 'wallet' && !address) {
                        alert('Please enter your wallet address');
                        return;
                    }
                    if (method !== 'wallet' && Object.values(methodDetails).some(value => !value)) {
                        alert('Please fill in all required withdrawal details for the selected payment method');
                        return;
                    }

                    const allowedWithdrawMethods = getEnabledWithdrawMethods();
                    if (!allowedWithdrawMethods.includes(method)) {
                        alert('Selected withdrawal method is currently disabled by admin. Please choose an allowed method.');
                        return;
                    }

                    const result = handleWithdraw({ amount, currency, address: address || '', method, details: methodDetails });
                    alert(result.message);
                });
            }
            break;

        case 'Investment Plans':
            const investButtons = document.querySelectorAll('.btn-invest');
            investButtons.forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const planId = e.target.dataset.plan;
                    // open modal flow for investing
                    openInvestModal(planId);
                });
            });
            break;

        case 'Copy Expert':
            const copyButtons = document.querySelectorAll('.btn-copy');
            copyButtons.forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const expertId = e.target.dataset.expert;
                    const amount = prompt('Enter amount to copy trade:');
                    if (amount) {
                        const result = startCopyTrading(expertId, parseFloat(amount));
                        alert(result.message);
                    }
                });
            });
            break;

        case 'Contact Support':
            const supportForm = document.getElementById('contactSupportForm');
            if (supportForm) {
                supportForm.addEventListener('submit', (e) => {
                    e.preventDefault();
                    const subject = document.getElementById('supportSubject').value;
                    const message = document.getElementById('supportMessage').value;
                    const attachment = document.getElementById('supportAttachment').files[0];

                    const ticket = {
                        id: `TKT-${Date.now()}`,
                        subject: subject,
                        message: message,
                        attachment: attachment ? attachment.name : null,
                        status: 'open',
                        createdAt: new Date().toISOString(),
                        userId: localStorage.getItem('currentUser') || 'unknown'
                    };

                    let tickets = JSON.parse(localStorage.getItem('supportTickets') || '[]');
                    tickets.push(ticket);
                    localStorage.setItem('supportTickets', JSON.stringify(tickets));

                    alert(`Support ticket submitted successfully!\nTicket ID: ${ticket.id}`);
                    supportForm.reset();
                });
            }
            break;
    }
}

// ===== COPY TRADING MODAL FUNCTIONS =====
function showCopyTradeModal(expertId, expertName, minInvestment, avgROI) {
    const modal = document.createElement('div');
    modal.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center; z-index: 10000;';
    modal.innerHTML = `
        <div style="background: white; border-radius: 10px; padding: 30px; max-width: 500px; width: 90%;box-shadow: 0 10px 40px rgba(0,0,0,0.3);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <h2 style="margin: 0; font-size: 24px;">Copy ${expertName}</h2>
                <button onclick="this.closest('[data-copy-modal]').remove()" style="background: none; border: none; font-size: 24px; cursor: pointer;">&times;</button>
            </div>
            <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                <p style="margin: 0 0 10px 0; color: #999; font-size: 12px;">Expert Details</p>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; font-size: 14px;">
                    <div>
                        <p style="margin: 0; color: #999; font-size: 12px;">Average ROI</p>
                        <p style="margin: 5px 0 0 0; font-weight: bold; font-size: 18px; color: #5e3fc9;">${avgROI}%</p>
                    </div>
                    <div>
                        <p style="margin: 0; color: #999; font-size: 12px;">Minimum Investment</p>
                        <p style="margin: 5px 0 0 0; font-weight: bold; font-size: 18px; color: #00b894;">$${minInvestment}</p>
                    </div>
                </div>
            </div>
            <div style="margin-bottom: 20px;">
                <label style="display: block; margin-bottom: 8px; color: #333; font-weight: 500;">Investment Amount (USD)</label>
                <input type="number" id="copyTradeAmount" min="${minInvestment}" step="1" placeholder="Enter amount" style="width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 6px; font-size: 14px; box-sizing: border-box;">
                <p style="margin: 8px 0 0 0; font-size: 12px; color: #999;">Your available balance: $${userState.balance.toFixed(2)}</p>
            </div>
            <div style="margin-bottom: 20px; padding: 15px; background: #f0f8ff; border-radius: 8px; border-left: 4px solid #5e3fc9;">
                <p id="expectedROIDisplay" style="margin: 0; font-size: 14px; color: #333;"><strong>Expected Returns:</strong> $0.00</p>
            </div>
            <div style="display: flex; gap: 10px;">
                <button onclick="this.closest('[data-copy-modal]').remove()" style="flex: 1; padding: 12px; background: #f0f0f0; border: none; border-radius: 6px; cursor: pointer; font-weight: bold;">Cancel</button>
                <button onclick="confirmCopyTrade('${expertId}', '${expertName}');" style="flex: 1; padding: 12px; background: #5e3fc9; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: bold;">Start Copy Trading</button>
            </div>
        </div>
    `;
    modal.setAttribute('data-copy-modal', 'true');
    document.body.appendChild(modal);
    
    // Update expected ROI as user types
    const amountInput = modal.querySelector('#copyTradeAmount');
    const expectedROIDisplay = modal.querySelector('#expectedROIDisplay');
    amountInput.addEventListener('input', function() {
        const amount = parseFloat(this.value) || 0;
        const expectedReturn = (amount * avgROI / 100).toFixed(2);
        expectedROIDisplay.innerHTML = `<strong>Expected Returns:</strong> $${expectedReturn}`;
    });
    
    // Auto-focus on input
    amountInput.focus();
}

function confirmCopyTrade(expertId, expertName) {
    const modal = document.querySelector('[data-copy-modal]');
    const amountInput = modal.querySelector('#copyTradeAmount');
    const amount = parseFloat(amountInput.value);
    
    if (isNaN(amount) || amount <= 0) {
        alert('Please enter a valid amount');
        return;
    }
    
    const result = startCopyTrading(expertId, amount);
    if (result.success) {
        alert(`Success!\n\nYou are now copying ${expertName}\nAmount: $${amount.toFixed(2)}\nExpected ROI: $${result.copyTrade.expectedROI}`);
        modal.remove();
        showTileContent('Copy Expert');
    } else {
        alert('Error: ' + result.message);
    }
}

function renderDashboardSection(section) {
    showTileContent(section);
}

//   <!-- TradingView library (loaded dynamically by script below) -->
// ---------------- Invest modal (opens when user clicks Invest Now) ----------------
const investModalEl = document.getElementById('investModal');
const investBackdrop = document.getElementById('investModalBackdrop');
const investTitle = document.getElementById('investModalTitle');
const investDetails = document.getElementById('investPlanDetails');
const investSourceSelect = document.getElementById('investSource');
const investSourceInfo = document.getElementById('investSourceInfo');
const investAmountInput = document.getElementById('investAmount');
const investConfirmBtn = document.getElementById('investConfirm');
const investCancelBtn = document.getElementById('investCancel');

function getFundingSourceUsdValue(source) {
    const prices = getCryptoPrices();
    if (source === 'balance') return parseFloat(userState.balance || 0);
    if (source === 'brokerBalance') return parseFloat(userState.brokerBalance || 0);
    const units = parseFloat(userState.cryptoHoldings?.[source] || 0);
    const price = parseFloat(prices[source] || 0);
    return parseFloat((units * price).toFixed(2));
}

function getFundingSourceLabel(source) {
    if (source === 'balance') return 'Available Balance';
    if (source === 'brokerBalance') return 'Broker Account';
    return `${source} Holdings`;
}

function renderInvestSourceOptions() {
    const prices = getCryptoPrices();
    const holdings = userState.cryptoHoldings || {};
    const sources = [
        { value: 'balance', label: `Available Balance ($${parseFloat(userState.balance || 0).toFixed(2)})` },
        { value: 'brokerBalance', label: `Broker Account ($${parseFloat(userState.brokerBalance || 0).toFixed(2)})` }
    ];

    ['BTC', 'ETH', 'USDT', 'BNB', 'XRP', 'DOGE'].forEach(symbol => {
        const units = parseFloat(holdings[symbol] || 0);
        const usd = parseFloat((units * (prices[symbol] || 0)).toFixed(2));
        sources.push({ value: symbol, label: `${symbol} Holdings (${formatCryptoValue(units)} ≈ $${usd.toLocaleString()})` });
    });

    return sources.map(source => `<option value="${source.value}">${source.label}</option>`).join('');
}

function updateInvestSourceInfo() {
    if (!investSourceInfo || !investSourceSelect) return;
    const source = investSourceSelect.value;
    const usdValue = getFundingSourceUsdValue(source);
    const label = getFundingSourceLabel(source);
    investSourceInfo.textContent = `${label} available: $${usdValue.toFixed(2)}. This source will be used for the investment.`;
}

function openInvestModal(planId) {
    const plan = getInvestmentPlans().find(p => p.id === planId);
    if (!plan) return alert('Plan not found');
    // populate modal
    investTitle.textContent = `Invest in ${plan.name}`;
    investDetails.textContent = `${plan.name} — Min: $${plan.minAmount.toLocaleString()} • Max: $${plan.maxAmount.toLocaleString()} • Duration: ${plan.duration} days • ROI: ${plan.roi}%`;
    investAmountInput.value = plan.minAmount;
    if (investSourceSelect) {
        investSourceSelect.innerHTML = renderInvestSourceOptions();
        investSourceSelect.value = 'balance';
        investSourceSelect.addEventListener('change', updateInvestSourceInfo);
    }
    updateInvestSourceInfo();
    investConfirmBtn.dataset.plan = planId;
    investModalEl.style.display = 'flex';
    investModalEl.setAttribute('aria-hidden', 'false');
    setTimeout(() => investAmountInput.focus(), 50);
}

function closeInvestModal() {
    investModalEl.style.display = 'none';
    investModalEl.setAttribute('aria-hidden', 'true');
    investConfirmBtn.removeAttribute('data-plan');
    investAmountInput.value = '';
}

// modal controls
if (investConfirmBtn) {
    investConfirmBtn.addEventListener('click', async () => {
        const planId = investConfirmBtn.dataset.plan;
        const amount = parseFloat(investAmountInput.value);
        const source = investSourceSelect?.value || 'balance';
        if (isNaN(amount) || amount <= 0) return alert('Please enter a valid amount');
        if (!source) return alert('Please select a funding source');

        const result = processInvestmentFromSource(planId, amount, source);
        if (!result.success) {
            alert(result.message);
            return;
        }

        // Try to create investment on backend, but fallback to local if offline
        const authRaw = localStorage.getItem('authToken');
        let token = null;
        try {
            token = authRaw ? JSON.parse(authRaw).token : null;
        } catch (err) {
            token = null;
        }

        let apiSuccess = false;
        if (token) {
            try {
                const payload = {
                    investmentType: planId,
                    symbol: planId,
                    amount,
                    currentValue: amount,
                    notes: `Plan ${planId}`
                };
                const ires = await fetch('/api/investments', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
                    body: JSON.stringify(payload)
                });

                if (ires.ok) {
                    const idata = await ires.json();
                    apiSuccess = true;
                    alert(`${idata.message || result.message} Deducted from ${getFundingSourceLabel(source)}.`);
                }
            } catch (e) {
                console.log('API call failed, using local fallback:', e.message);
            }
        }

        if (!apiSuccess) {
            alert(`${result.message} Deducted from ${getFundingSourceLabel(source)}.`);
        }

        updateMobileBalance();
        closeInvestModal();
    });
}
if (investCancelBtn) investCancelBtn.addEventListener('click', closeInvestModal);
if (investBackdrop) investBackdrop.addEventListener('click', closeInvestModal);
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && investModalEl && investModalEl.getAttribute('aria-hidden') === 'false') closeInvestModal(); });
// ---------------- Theme toggle (cross-browser, all devices) ----------------
document.addEventListener('DOMContentLoaded', function() {
    const themeToggles = document.querySelectorAll('[id*="themeToggle"]');
    
    // Initialize theme on page load
    function initTheme() {
        const saved = localStorage.getItem('dashboard-theme') || 
                     (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
        document.documentElement.setAttribute('data-theme', saved);
        document.body.setAttribute('data-theme', saved);
        applyThemeToUI();
    }

    function applyThemeToUI() {
        const theme = document.documentElement.getAttribute('data-theme') || 'light';
        const isDark = theme === 'dark';
        
        // Update all theme icons
        document.querySelectorAll('[id*="themeIcon"]').forEach(icon => {
            icon.className = isDark ? 'fa-solid fa-moon' : 'fa-regular fa-sun';
        });
        
        // Update all theme labels
        document.querySelectorAll('[id*="themeLabel"]').forEach(label => {
            label.textContent = isDark ? 'Dark' : 'Light';
        });
        
        // Update all theme buttons
        themeToggles.forEach(toggle => {
            toggle.setAttribute('aria-pressed', String(isDark));
            toggle.classList.toggle('active', isDark);
        });
    }

    function toggleTheme() {
        const current = document.documentElement.getAttribute('data-theme') || 'light';
        const next = current === 'light' ? 'dark' : 'light';
        
        document.documentElement.setAttribute('data-theme', next);
        document.body.setAttribute('data-theme', next);
        localStorage.setItem('dashboard-theme', next);
        
        applyThemeToUI();
        
        // Reload TradingView widgets with new theme
        if (typeof reloadTradingViewWidgets === 'function') {
            reloadTradingViewWidgets();
        }
    }

    // Initialize theme
    initTheme();

    // Add click listeners to all theme toggles
    themeToggles.forEach(toggle => {
        toggle.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            toggleTheme();
        });

        // Also support keyboard interaction (Space/Enter)
        toggle.addEventListener('keydown', function(e) {
            if (e.key === ' ' || e.key === 'Enter') {
                e.preventDefault();
                toggleTheme();
            }
        });
    });

    // Listen for system theme changes (iOS, Android, etc.)
    if (window.matchMedia) {
        const darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)');
        
        // For modern browsers with addEventListener support
        if (darkModeQuery.addEventListener) {
            darkModeQuery.addEventListener('change', function(e) {
                const newTheme = e.matches ? 'dark' : 'light';
                document.documentElement.setAttribute('data-theme', newTheme);
                document.body.setAttribute('data-theme', newTheme);
                localStorage.setItem('dashboard-theme', newTheme);
                applyThemeToUI();
            });
        }
        // For older browsers using addListener
        else if (darkModeQuery.addListener) {
            darkModeQuery.addListener(function(e) {
                const newTheme = e.matches ? 'dark' : 'light';
                document.documentElement.setAttribute('data-theme', newTheme);
                document.body.setAttribute('data-theme', newTheme);
                localStorage.setItem('dashboard-theme', newTheme);
                applyThemeToUI();
            });
        }
    }
});

// ---------------- Price formatting utility ----------------
function formatUSD(n) { 
    if (typeof n !== 'number') return n;
    return n.toLocaleString(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });
}

// ---------------- Time display ----------------
const timeDisplay = document.getElementById('timeDisplay');
function refreshTime() { const d = new Date(); timeDisplay.textContent = d.toLocaleString() + ' • ' + d.toISOString().slice(0, 10); } refreshTime(); setInterval(refreshTime, 1000);

// ---------------- WebSocket live updates (Binance combined miniTicker stream) ----------------
const pairIds = ['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT', 'XRPUSDT', 'DOGEUSDT'];
const uiMap = { BTCUSDT: { priceEl: document.getElementById('btcPrice'), changeEl: document.getElementById('btcChange') }, ETHUSDT: { priceEl: document.getElementById('ethPrice'), changeEl: document.getElementById('ethChange') }, BNBUSDT: { priceEl: document.getElementById('bnbPrice'), changeEl: document.getElementById('bnbChange') }, SOLUSDT: { priceEl: document.getElementById('solPrice'), changeEl: document.getElementById('solChange') }, XRPUSDT: { priceEl: document.getElementById('xrpPrice'), changeEl: document.getElementById('xrpChange') }, DOGEUSDT: { priceEl: document.getElementById('dogePrice'), changeEl: document.getElementById('dogeChange') } };

// Preload cached prices immediately
function loadCachedPrices() {
    try {
        const cached = JSON.parse(localStorage.getItem('cryptoPrices') || '{}');
        const now = Date.now();
        if (cached.timestamp && (now - cached.timestamp) < 300000) { // 5 min cache
            Object.entries(cached.data || {}).forEach(([sym, data]) => {
                const map = uiMap[sym];
                if (map && data.price && data.change !== undefined) {
                    map.priceEl.textContent = formatUSD(data.price);
                    map.changeEl.textContent = data.change + '%';
                    map.changeEl.style.color = parseFloat(data.change) >= 0 ? 'limegreen' : 'tomato';
                }
            });
        }
    } catch (e) { console.debug('Cache load error:', e) }
}

// Fallback API to load prices quickly if cache misses
async function loadPricesFallback() {
    try {
        // Create abort controller with timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);
        
        const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,binancecoin,solana,ripple,dogecoin&vs_currencies=usd&include_24hr_change=true', { 
            signal: controller.signal
        });
        clearTimeout(timeoutId);
        
        if (!response.ok) throw new Error('API error: ' + response.status);
        const data = await response.json();
        console.debug('Prices loaded from CoinGecko API');
        
        const mapping = {
            bitcoin: 'BTCUSDT', ethereum: 'ETHUSDT', binancecoin: 'BNBUSDT',
            solana: 'SOLUSDT', ripple: 'XRPUSDT', dogecoin: 'DOGEUSDT'
        };
        
        const priceData = {};
        let updateCount = 0;
        Object.entries(mapping).forEach(([coinName, sym]) => {
            const coin = data[coinName];
            if (coin && coin.usd !== undefined) {
                const price = coin.usd;
                const change = (coin.usd_24h_change || 0).toFixed(2);
                const map = uiMap[sym];
                if (map && map.priceEl && map.changeEl) {
                    map.priceEl.textContent = formatUSD(price);
                    map.changeEl.textContent = change + '%';
                    map.changeEl.style.color = parseFloat(change) >= 0 ? 'limegreen' : 'tomato';
                    priceData[sym] = { price, change };
                    updateCount++;
                }
            }
        });
        
        console.debug(`Updated ${updateCount} price elements`);
        
        // Cache the fetched prices
        localStorage.setItem('cryptoPrices', JSON.stringify({ timestamp: Date.now(), data: priceData }));
    } catch (e) { 
        console.warn('Fallback API error:', e.message);
        // Try alternative API if main fails
        loadPricesAlternative();
    }
}

// Alternative API fallback (CoinGecko alternative endpoint)
async function loadPricesAlternative() {
    try {
        const symbols = ['bitcoin', 'ethereum', 'binancecoin', 'solana', 'ripple', 'dogecoin'];
        const mapping = {
            bitcoin: 'BTCUSDT', ethereum: 'ETHUSDT', binancecoin: 'BNBUSDT',
            solana: 'SOLUSDT', ripple: 'XRPUSDT', dogecoin: 'DOGEUSDT'
        };
        
        // Fetch each coin separately as fallback
        const priceData = {};
        for (const [coinName, sym] of Object.entries(mapping)) {
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 5000);
                
                const res = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${coinName}&vs_currencies=usd&include_24hr_change=true`, {
                    signal: controller.signal
                });
                clearTimeout(timeoutId);
                
                if (res.ok) {
                    const coinData = await res.json();
                    const coin = coinData[coinName];
                    if (coin && coin.usd !== undefined) {
                        const price = coin.usd;
                        const change = (coin.usd_24h_change || 0).toFixed(2);
                        const map = uiMap[sym];
                        if (map && map.priceEl && map.changeEl) {
                            map.priceEl.textContent = formatUSD(price);
                            map.changeEl.textContent = change + '%';
                            map.changeEl.style.color = parseFloat(change) >= 0 ? 'limegreen' : 'tomato';
                            priceData[sym] = { price, change };
                        }
                    }
                }
            } catch (err) {
                console.debug(`Failed to load ${coinName}:`, err.message);
            }
        }
        
        if (Object.keys(priceData).length > 0) {
            localStorage.setItem('cryptoPrices', JSON.stringify({ timestamp: Date.now(), data: priceData }));
            console.debug('Prices updated from alternative API');
        }
    } catch (e) {
        console.warn('Alternative API error:', e.message);
    }
}

// Load prices from cache first, then fetch fresh data
// Wait for DOM to be ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        loadCachedPrices();
        loadPricesFallback();
    });
} else {
    loadCachedPrices();
    loadPricesFallback();
}

// Refresh prices from fallback API every 5 minutes
setInterval(loadPricesFallback, 300000);

// WebSocket connection disabled - fallback API provides all price data
// const streams = pairIds.map(p => p.toLowerCase() + '@miniTicker').join('/');
// const WS_URL = `wss://stream.binance.com:9443/stream?streams=${streams}`;
// let ws = null; let reconnectDelay = 1000; let wsAttempted = false;
// Note: If WebSocket connection is needed, enable above and implement error suppression

// Note: Prices loaded from CoinGecko API fallback (fully functional)

// ----------------- TradingView widgets -----------------
// We'll load s3.tradingview.com/tv.js once and create widgets for selected symbols
const TV_SCRIPT = 'https://s3.tradingview.com/tv.js';
let TV = null; // will hold TradingView global when loaded
let activeWidgets = {};

// symbols and human labels
const chartSymbols = [{ id: 'BTCUSDT', symbol: 'BINANCE:BTCUSDT', label: 'BTC/USDT' }, { id: 'ETHUSDT', symbol: 'BINANCE:ETHUSDT', label: 'ETH/USDT' }, { id: 'BNBUSDT', symbol: 'BINANCE:BNBUSDT', label: 'BNB/USDT' }, { id: 'SOLUSDT', symbol: 'BINANCE:SOLUSDT', label: 'SOL/USDT' }, { id: 'XRPUSDT', symbol: 'BINANCE:XRPUSDT', label: 'XRP/USDT' }, { id: 'DOGEUSDT', symbol: 'BINANCE:DOGEUSDT', label: 'DOGE/USDT' }];

// load TradingView script
function loadTradingViewScript(cb) {
    if (window.TradingView) { TV = window.TradingView; cb && cb(); return; }
    const s = document.createElement('script'); 
    s.src = TV_SCRIPT; 
    s.async = true; 
    s.onload = () => { 
        TV = window.TradingView; 
        console.debug('TradingView script loaded successfully');
        cb && cb(); 
    }; 
    s.onerror = () => { 
        console.warn('Failed to load TradingView script from CDN'); 
    }; 
    document.head.appendChild(s);
}

// create chart card DOM
function createChartCard(id, label) {
    const card = document.createElement('div'); card.className = 'chart-card'; card.id = 'card-' + id;
    const title = document.createElement('div'); title.className = 'chart-title'; title.textContent = label;
    const wrap = document.createElement('div'); wrap.className = 'chart-wrapper'; wrap.id = 'tv-' + id;
    card.appendChild(title); card.appendChild(wrap);
    return card;
}

function clearChartsSection() {
    const s = document.getElementById('chartsSection'); s.innerHTML = '';
    activeWidgets = {};
}

function createWidgetsFor(symbolIds) {
    // ensure library loaded
    loadTradingViewScript(() => {
        const theme = document.body.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
        const container = document.getElementById('chartsSection');
        // add cards
        symbolIds.forEach(id => {
            const cfg = chartSymbols.find(c => c.id === id);
            if (!cfg) return;
            const card = createChartCard(cfg.id, cfg.label);
            container.appendChild(card);
            // create TradingView widget
            try {
                const widget = new TradingView.widget({
                    autosize: true,
                    symbol: cfg.symbol,
                    interval: '60',
                    timezone: 'Etc/UTC',
                    theme: theme,
                    style: '1',
                    locale: 'en',
                    toolbar_bg: theme === 'dark' ? '#0b0d0f' : '#ffffff',
                    enable_publishing: false,
                    allow_symbol_change: true,
                    hide_side_toolbar: false,
                    container_id: 'tv-' + cfg.id,
                    disabled_features: ['use_localstorage_db', 'widget_dom_node', 'focus_on_publish'],
                    enabled_features: []
                });
                activeWidgets[cfg.id] = widget;
            } catch (e) { console.debug('TradingView widget error', e) }
        });
    });
}

function reloadTradingViewWidgets() {
    // destroy/replace by clearing and recreating using current filter
    const filter = document.getElementById('chartFilter').value;
    applyFilterAndRender(filter);
}

function applyFilterAndRender(filter) {
    clearChartsSection();
    let toShow = [];
    if (filter === 'all') toShow = chartSymbols.map(c => c.id);
    else if (filter === 'top3') toShow = chartSymbols.slice(0, 3).map(c => c.id);
    else toShow = [filter];
    createWidgetsFor(toShow);
    
    // Add 'single-chart' class if only one chart is displayed
    const chartsGrid = document.getElementById('chartsSection');
    if (chartsGrid) {
        if (toShow.length === 1) {
            chartsGrid.classList.add('single-chart');
        } else {
            chartsGrid.classList.remove('single-chart');
        }
    }
}

// init filter dropdown behavior
document.addEventListener('DOMContentLoaded', function() {
    const chartFilterEl = document.getElementById('chartFilter');
    if (chartFilterEl) {
        chartFilterEl.addEventListener('change', (e) => {
            applyFilterAndRender(e.target.value);
        });
        
        // initial render: show all
        applyFilterAndRender('all');
    }
});

// ============= NEW FEATURE FUNCTIONS =============

// SWAP CRYPTO
function getCryptoPrices() {
    return {
        BTC: 30000,
        ETH: 2000,
        USDT: 1,
        BNB: 320,
        XRP: 0.45,
        DOGE: 0.07
    };
}

function getCryptoSwapRate(fromCrypto, toCrypto) {
    const prices = getCryptoPrices();
    
    // Handle USD to crypto conversion
    if (fromCrypto === 'USD' || fromCrypto === 'balance') {
        return prices[toCrypto] ? (1 / prices[toCrypto]) : null;
    }
    
    // Handle crypto to USD conversion
    if (toCrypto === 'USD' || toCrypto === 'balance') {
        return prices[fromCrypto] ? prices[fromCrypto] : null;
    }
    
    // Handle crypto to crypto conversion
    if (!prices[fromCrypto] || !prices[toCrypto]) return null;
    return prices[fromCrypto] / prices[toCrypto];
}

function formatCryptoValue(amount) {
    return parseFloat(amount).toFixed(6).replace(/\.0+$/, '');
}

function handleCryptoSwap(fromCrypto, toCrypto, amount) {
    if (!fromCrypto || !toCrypto || fromCrypto === toCrypto) {
        return { success: false, message: 'Please choose two different sources.' };
    }
    if (amount <= 0 || isNaN(amount)) {
        return { success: false, message: 'Invalid swap amount.' };
    }

    const holdings = userState.cryptoHoldings || {};
    let available, fromLabel, toLabel;
    
    // Handle swaps from Available Balance (USD)
    if (fromCrypto === 'USD' || fromCrypto === 'balance') {
        available = userState.balance || 0;
        fromLabel = 'USD';
        
        if (available < amount) {
            return { success: false, message: `Insufficient balance. Available: $${available.toFixed(2)}` };
        }
    } else {
        // Crypto to crypto or crypto to balance
        available = parseFloat(holdings[fromCrypto] || 0);
        fromLabel = fromCrypto;
        
        if (available < amount) {
            return { success: false, message: `Insufficient ${fromCrypto} balance. Available: ${formatCryptoValue(available)}` };
        }
    }

    const rate = getCryptoSwapRate(fromCrypto, toCrypto);
    if (!rate) {
        return { success: false, message: 'Unable to calculate swap rate for selected pair.' };
    }

    // Calculate conversion amount
    let toAmount;
    if (fromCrypto === 'USD' || fromCrypto === 'balance') {
        // Converting from USD to crypto: amount * (1/price) = amount/price
        toAmount = parseFloat((amount / getCryptoPrices()[toCrypto]).toFixed(6));
    } else if (toCrypto === 'USD' || toCrypto === 'balance') {
        // Converting from crypto to USD: amount * price
        toAmount = parseFloat((amount * getCryptoPrices()[fromCrypto]).toFixed(2));
    } else {
        // Crypto to crypto
        toAmount = parseFloat((amount * rate).toFixed(6));
    }

    // Deduct from source
    if (fromCrypto === 'USD' || fromCrypto === 'balance') {
        userState.balance = parseFloat((userState.balance - amount).toFixed(2));
    } else {
        holdings[fromCrypto] = parseFloat((available - amount).toFixed(6));
    }

    // Add to destination
    if (toCrypto === 'USD' || toCrypto === 'balance') {
        userState.balance = parseFloat(((userState.balance || 0) + toAmount).toFixed(2));
    } else {
        holdings[toCrypto] = parseFloat(((parseFloat(holdings[toCrypto] || 0) || 0) + toAmount).toFixed(6));
    }
    
    userState.cryptoHoldings = holdings;
    saveUserState();

    const swapResult = {
        id: `swap-${Date.now()}`,
        from: fromLabel,
        to: toCrypto,
        fromAmount: (fromLabel === 'USD') ? `$${amount.toFixed(2)}` : formatCryptoValue(amount),
        toAmount: (toCrypto === 'USD') ? `$${toAmount.toFixed(2)}` : formatCryptoValue(toAmount),
        rate: formatCryptoValue(rate),
        timestamp: new Date().toISOString(),
        status: 'Completed'
    };
    userState.swaps.push(swapResult);
    saveUserState();
    return { success: true, message: 'Swap completed successfully.', swap: swapResult };
}

// MANAGED ACCOUNTS
function addManagedAccount(name, manager, balance) {
    const acc = {
        id: `acc-${Date.now()}`,
        name,
        manager,
        balance,
        roi: (Math.random() * 20 + 5).toFixed(2),
        status: 'active',
        createdAt: new Date().toISOString()
    };
    userState.managedAccounts.push(acc);
    return { success: true, account: acc };
}

function getManagedAccounts() {
    return userState.managedAccounts;
}

// PROFILE FUNCTIONS
function updateUserProfile(updates) {
    const current = JSON.parse(localStorage.getItem('userData') || '{}');
    const updated = { ...current, ...updates };
    localStorage.setItem('userData', JSON.stringify(updated));
    userState.userData = updated;
    return { success: true, userData: updated };
}

function getUserProfile() {
    return JSON.parse(localStorage.getItem('userData') || {});
}

// REFERRALS
function getReferralLink() {
    const code = userState.userData.referralCode || ('REF_' + Math.random().toString(36).slice(2, 8).toUpperCase());
    return `${window.location.origin}/?ref=${code}`;
}

function addReferral(referredEmail) {
    const referral = {
        id: `ref-${Date.now()}`,
        email: referredEmail,
        status: 'pending',
        commission: 0,
        joinedAt: new Date().toISOString()
    };
    userState.referrals.push(referral);
    return { success: true, referral };
}

function getReferrals() {
    return userState.referrals;
}

function getReferralStats() {
    const active = userState.referrals.filter(r => r.status === 'active').length;
    const totalCommission = userState.referrals.reduce((sum, r) => sum + (r.commission || 0), 0);
    return { total: userState.referrals.length, active, totalCommission };
}

// ============= TILE CLICK HANDLERS =============

function setupTileClickHandlers() {
    const tiles = document.querySelectorAll('.tile');
    tiles.forEach(tile => {
        tile.addEventListener('click', () => {
            const label = tile.querySelector('.label')?.textContent || '';
            showTileContent(label);
        });
    });
}

function showTileContent(tileLabel) {
    const main = document.querySelector('main');
    window.currentDashboardView = tileLabel;
    
    // Pause refresh interval when viewing feature sections
    // This prevents scroll jumping and form state loss
    if (tileLabel && tileLabel !== 'Dashboard') {
        window.pauseDashboardRefresh?.();
    } else {
        window.resumeDashboardRefresh?.();
    }
    
    let html = '';

    switch (tileLabel) {
        case 'Transactions':
            html = renderTransactionsView();
            break;
        case 'My Investments':
            html = renderMyInvestmentsView();
            break;
        case 'Swap Crypto':
            html = renderSwapCryptoView();
            break;
        case 'Managed Accounts':
            html = renderManagedAccountsView();
            break;
        case 'Profile':
            html = renderProfileView();
            break;
        case 'Referrals':
            html = renderReferralsView();
            break;
        case 'Contact Support':
            html = renderContactSupportView();
            break;
        default:
            return;
    }

    // Clear old sections and insert new content
    const oldSections = main.querySelectorAll('section');
    const isNewSection = oldSections.length === 0;
    oldSections.forEach(s => s.remove());
    
    const section = document.createElement('section');
    section.innerHTML = html;
    main.appendChild(section);
    
    // Only scroll into view on initial display, not on refresh
    if (isNewSection) {
        section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    attachTileFeatureHandlers(tileLabel);
}

function renderTransactionsView() {
    const transactions = getTransactionHistory();
    return `
        <div class="feature-container transactions-container">
            <h2>Transaction History</h2>
            <div class="filter-bar">
                <input type="text" id="txFilter" placeholder="Search transactions..." class="search-input">
                <select id="txTypeFilter" class="filter-select">
                    <option value="">All Types</option>
                    <option value="deposit">Deposits</option>
                    <option value="withdraw">Withdrawals</option>
                    <option value="swap">Swaps</option>
                </select>
            </div>
            <div class="table-container">
                <table class="feature-table">
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Type</th>
                            <th>Amount</th>
                            <th>Currency</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${transactions.length ? transactions.map(tx => `
                            <tr>
                                <td>${new Date(tx.timestamp).toLocaleDateString()}</td>
                                <td><span class="badge badge-${tx.type}">${tx.type.toUpperCase()}</span></td>
                                <td>${tx.amount}</td>
                                <td>${tx.currency}</td>
                                <td><span class="status-${tx.status}">${tx.status}</span></td>
                            </tr>
                        `).join('') : '<tr><td colspan="5" class="text-center">No transactions yet</td></tr>'}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

function renderMyInvestmentsView() {
    const investments = getActiveInvestments();
    const plans = investmentPlans;
    return `
        <div class="feature-container investments-container">
            <h2>My Investments</h2>
            <div class="investments-grid">
                ${investments.length ? investments.map(inv => {
        const plan = plans.find(p => p.id === inv.planId);
        return `
                        <div class="investment-card">
                            <h3>${plan?.name || 'Investment'}</h3>
                            <div class="card-stat">
                                <span class="stat-label">Amount Invested:</span>
                                <span class="stat-value">$${inv.amount.toLocaleString()}</span>
                            </div>
                            <div class="card-stat">
                                <span class="stat-label">Expected ROI:</span>
                                <span class="stat-value" style="color: limegreen;">+$${inv.expectedRoi.toFixed(2)}</span>
                            </div>
                            <div class="card-stat">
                                <span class="stat-label">Start Date:</span>
                                <span class="stat-value">${new Date(inv.startDate).toLocaleDateString()}</span>
                            </div>
                            <div class="card-stat">
                                <span class="stat-label">End Date:</span>
                                <span class="stat-value">${new Date(inv.endDate).toLocaleDateString()}</span>
                            </div>
                            <div class="card-stat">
                                <span class="stat-label">Status:</span>
                                <span class="stat-value badge badge-${inv.status}">${inv.status.toUpperCase()}</span>
                            </div>
                        </div>
                    `;
    }).join('') : '<p class="no-data">No active investments</p>'}
            </div>
        </div>
    `;
}

function renderSwapCryptoView() {
    const cryptos = ['BTC', 'ETH', 'USDT', 'BNB', 'XRP', 'DOGE'];
    const holdings = userState.cryptoHoldings || {};
    const balance = userState.balance || 0;
    
    // Holdings preview with balance included
    const balanceHtml = `
        <div class="holding-item balance-item">
            <span>Available Balance</span>
            <strong>$${balance.toFixed(2)}</strong>
        </div>
    `;
    const holdingsHtml = Object.entries(holdings).map(([symbol, amount]) => `
        <div class="holding-item">
            <span>${symbol}</span>
            <strong>${formatCryptoValue(amount)}</strong>
        </div>
    `).join('');

    return `
        <div class="feature-container swap-container">
            <h2>Swap Crypto</h2>
            <div class="holdings-preview">
                <h3>Your Balances</h3>
                <div class="holdings-grid">
                    ${balanceHtml}
                    ${holdingsHtml}
                </div>
            </div>
            <form id="swapForm" class="feature-form">
                <div class="form-row">
                    <div class="form-group">
                        <label for="fromCrypto">From</label>
                        <select id="fromCrypto" required>
                            <option value="balance">Available Balance</option>
                            ${cryptos.map(c => `<option value="${c}">${c}</option>`).join('')}
                        </select>
                    </div>
                    <button type="button" class="swap-button" id="swapToggle">⇆</button>
                    <div class="form-group">
                        <label for="toCrypto">To</label>
                        <select id="toCrypto" required>
                            ${cryptos.map(c => `<option value="${c}" ${c === 'BTC' ? 'selected' : ''}>${c}</option>`).join('')}
                        </select>
                    </div>
                </div>
                <div class="form-group">
                    <label for="swapAmount">Amount to Swap</label>
                    <input type="number" id="swapAmount" min="0.001" step="0.001" placeholder="Enter amount" required>
                </div>
                <div id="swapPreview" class="swap-preview">Enter an amount and select currencies to preview the swap.</div>
                <button type="submit" class="btn-primary">Execute Swap</button>
            </form>
            <div class="swaps-history">
                <h3>Recent Swaps</h3>
                ${userState.swaps.length ? userState.swaps.slice(-5).reverse().map(swap => `
                    <div class="swap-item">
                        <span>${swap.from} → ${swap.to}</span>
                        <span>${swap.fromAmount} = ${swap.toAmount}</span>
                        <span class="status-${swap.status}">${swap.status}</span>
                    </div>
                `).join('') : '<p class="no-data">No swaps yet</p>'}
            </div>
        </div>
    `;
}

function renderManagedAccountsView() {
    const accounts = getManagedAccounts();
    return `
        <div class="feature-container accounts-container">
            <h2>Managed Accounts</h2>
            <p class="info-text">Professional accounts managed by our experienced traders</p>
            <div class="accounts-grid">
                ${accounts.map(acc => `
                    <div class="account-card">
                        <div class="account-header">
                            <h3>${acc.name}</h3>
                            <span class="badge badge-${acc.status}">${acc.status.toUpperCase()}</span>
                        </div>
                        <div class="account-info">
                            <p><strong>Manager:</strong> ${acc.manager}</p>
                            <p><strong>Current Balance:</strong> $${acc.balance.toLocaleString()}</p>
                            <p><strong>ROI:</strong> <span style="color: limegreen;">+${acc.roi}%</span></p>
                            <p><strong>Created:</strong> ${new Date(acc.createdAt).toLocaleDateString()}</p>
                        </div>
                        <button class="btn-secondary view-account-btn" data-id="${acc.id}">View Details</button>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

function renderProfileView() {
    const user = getUserProfile();
    return `
        <div class="feature-container profile-container">
            <h2>User Profile & Settings</h2>
            <form id="profileForm" class="feature-form">
                <div class="form-row">
                    <div class="form-group">
                        <label for="pFirstName">First Name</label>
                        <input type="text" id="pFirstName" value="${user.firstName || ''}" required>
                    </div>
                    <div class="form-group">
                        <label for="pLastName">Last Name</label>
                        <input type="text" id="pLastName" value="${user.lastName || ''}" required>
                    </div>
                </div>
                <div class="form-group">
                    <label for="pEmail">Email</label>
                    <input type="email" id="pEmail" value="${user.email || ''}" disabled>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label for="pCountry">Country</label>
                        <input type="text" id="pCountry" value="${user.country || ''}" required>
                    </div>
                    <div class="form-group">
                        <label for="pPhone">Phone</label>
                        <input type="tel" id="pPhone" value="${user.phone || ''}" required>
                    </div>
                </div>
                <div class="form-group">
                    <label for="pCurrency">Main Currency</label>
                    <select id="pCurrency">
                        <option value="USD" ${user.currency === 'USD' ? 'selected' : ''}>USD</option>
                        <option value="EUR" ${user.currency === 'EUR' ? 'selected' : ''}>EUR</option>
                        <option value="GBP" ${user.currency === 'GBP' ? 'selected' : ''}>GBP</option>
                    </select>
                </div>
                <button type="submit" class="btn-primary">Save Changes</button>
            </form>
        </div>
    `;
}

function renderReferralsView() {
    const stats = getReferralStats();
    const referrals = getReferrals();
    const refLink = getReferralLink();
    return `
        <div class="feature-container referrals-container">
            <h2>Referral Program</h2>
            <div class="referral-stats">
                <div class="stat-box">
                    <h4>Total Referrals</h4>
                    <p class="stat-number">${stats.total}</p>
                </div>
                <div class="stat-box">
                    <h4>Active Referrals</h4>
                    <p class="stat-number">${stats.active}</p>
                </div>
                <div class="stat-box">
                    <h4>Total Commission</h4>
                    <p class="stat-number">$${stats.totalCommission.toFixed(2)}</p>
                </div>
            </div>
            
            <div class="referral-link-section">
                <h3>Your Referral Link</h3>
                <div class="ref-link-box">
                    <input type="text" id="referralLink" value="${refLink}" readonly class="ref-link-input">
                    <button id="copyRefLink" class="btn-secondary">Copy Link</button>
                </div>
            </div>

            <div class="referrals-list">
                <h3>Your Referrals</h3>
                ${referrals.length ? `
                    <table class="feature-table">
                        <thead>
                            <tr>
                                <th>Email</th>
                                <th>Status</th>
                                <th>Commission</th>
                                <th>Joined Date</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${referrals.map(ref => `
                                <tr>
                                    <td>${ref.email}</td>
                                    <td><span class="badge badge-${ref.status}">${ref.status}</span></td>
                                    <td>$${ref.commission.toFixed(2)}</td>
                                    <td>${new Date(ref.joinedAt).toLocaleDateString()}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                ` : '<p class="no-data">No referrals yet. Share your link to get started!</p>'}
            </div>
        </div>
    `;
}

function renderContactSupportView() {
    return `
        <div class="feature-container support-container">
            <h2>Contact Support</h2>
            <div class="support-content">
                <div class="support-form-section">
                    <h3>Send us a Message</h3>
                    <form id="contactSupportForm" class="feature-form">
                        <div class="form-group">
                            <label for="supportSubject">Subject</label>
                            <select id="supportSubject" required>
                                <option value="">-- Select Subject --</option>
                                <option value="deposit_issue">Deposit Issue</option>
                                <option value="withdrawal_issue">Withdrawal Issue</option>
                                <option value="account_security">Account Security</option>
                                <option value="investment_help">Investment Help</option>
                                <option value="technical_issue">Technical Issue</option>
                                <option value="other">Other</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="supportMessage">Message</label>
                            <textarea id="supportMessage" rows="6" placeholder="Describe your issue..." required></textarea>
                        </div>
                        <div class="form-group">
                            <label for="supportAttachment">Attachment (optional)</label>
                            <input type="file" id="supportAttachment">
                        </div>
                        <button type="submit" class="btn-primary">Submit Ticket</button>
                    </form>
                </div>

                <div class="support-info-section">
                    <h3>Support Information</h3>
                    <div class="support-info-box">
                        <h4><i class="fa-solid fa-envelope"></i> Email</h4>
                        <p>support@rivertrade.com</p>
                    </div>
                    <div class="support-info-box">
                        <h4><i class="fa-solid fa-headset"></i> Live Chat</h4>
                        <p>Available 24/7</p>
                    </div>
                    <div class="support-info-box">
                        <h4><i class="fa-solid fa-phone"></i> Phone</h4>
                        <p>+1 (800) 123-4567</p>
                    </div>
                    <div class="support-info-box">
                        <h4><i class="fa-solid fa-clock"></i> Response Time</h4>
                        <p>Within 24 hours</p>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function attachTileFeatureHandlers(tileLabel) {
    switch (tileLabel) {
        case 'Swap Crypto':
            const swapForm = document.getElementById('swapForm');
            const fromCryptoEl = document.getElementById('fromCrypto');
            const toCryptoEl = document.getElementById('toCrypto');
            const swapAmountEl = document.getElementById('swapAmount');
            const swapPreviewEl = document.getElementById('swapPreview');

            function refreshSwapPreview() {
                if (!fromCryptoEl || !toCryptoEl || !swapAmountEl || !swapPreviewEl) return;
                const from = fromCryptoEl.value;
                const to = toCryptoEl.value;
                const amount = parseFloat(swapAmountEl.value);
                if (!from || !to || from === to || !amount || amount <= 0) {
                    swapPreviewEl.textContent = 'Enter an amount and select two different sources to preview the swap.';
                    return;
                }
                const rate = getCryptoSwapRate(from, to);
                if (!rate) {
                    swapPreviewEl.textContent = 'Unable to preview swap for selected pair.';
                    return;
                }
                
                let toAmount, fromLabel, toLabel;
                
                if (from === 'balance') {
                    // USD to crypto conversion
                    fromLabel = 'Available Balance';
                    toLabel = to;
                    toAmount = formatCryptoValue(amount / getCryptoPrices()[to]);
                    swapPreviewEl.textContent = `$${amount.toFixed(2)} will convert to approximately ${toAmount} ${to} at current rates.`;
                } else if (to === 'balance') {
                    // Crypto to USD conversion
                    fromLabel = from;
                    toLabel = 'Available Balance';
                    toAmount = (amount * getCryptoPrices()[from]).toFixed(2);
                    swapPreviewEl.textContent = `${formatCryptoValue(amount)} ${from} will convert to approximately $${toAmount} at current rates.`;
                } else {
                    // Crypto to crypto conversion
                    fromLabel = from;
                    toLabel = to;
                    toAmount = formatCryptoValue(amount * rate);
                    swapPreviewEl.textContent = `${formatCryptoValue(amount)} ${from} will convert to approximately ${toAmount} ${to} at a rate of 1 ${from} = ${formatCryptoValue(rate)} ${to}.`;
                }
            }

            if (swapForm) {
                document.getElementById('swapToggle')?.addEventListener('click', () => {
                    if (!fromCryptoEl || !toCryptoEl) return;
                    const from = fromCryptoEl.value;
                    const to = toCryptoEl.value;
                    fromCryptoEl.value = to;
                    toCryptoEl.value = from;
                    refreshSwapPreview();
                });

                // Use 'change' for select elements and 'input' for text inputs
                fromCryptoEl?.addEventListener('change', refreshSwapPreview);
                toCryptoEl?.addEventListener('change', refreshSwapPreview);
                swapAmountEl?.addEventListener('input', refreshSwapPreview);

                swapForm.addEventListener('submit', (e) => {
                    e.preventDefault();
                    const from = fromCryptoEl.value;
                    const to = toCryptoEl.value;
                    const amount = parseFloat(swapAmountEl.value);
                    const result = handleCryptoSwap(from, to, amount);
                    if (result.success) {
                        alert('Swap successful: ' + amount + ' ' + from + ' → ' + result.swap.toAmount + ' ' + to);
                        swapForm.reset();
                        refreshSwapPreview();
                        showTileContent('Swap Crypto');
                    } else {
                        alert(result.message);
                    }
                });

                refreshSwapPreview();
            }
            break;

        case 'Managed Accounts':
            document.querySelectorAll('.view-account-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const accId = e.target.dataset.id;
                    alert('Viewing account details for: ' + accId);
                });
            });
            break;

        case 'Profile':
            const profileForm = document.getElementById('profileForm');
            if (profileForm) {
                profileForm.addEventListener('submit', (e) => {
                    e.preventDefault();
                    const updates = {
                        firstName: document.getElementById('pFirstName').value,
                        lastName: document.getElementById('pLastName').value,
                        country: document.getElementById('pCountry').value,
                        phone: document.getElementById('pPhone').value,
                        currency: document.getElementById('pCurrency').value
                    };
                    const result = updateUserProfile(updates);
                    if (result.success) {
                        alert('Profile updated successfully!');
                        // Update sidebar user display
                        const disp = document.getElementById('userDisplay');
                        if (disp) disp.textContent = updates.firstName || result.userData.email;
                    }
                });
            }
            break;

        case 'Referrals':
            const copyBtn = document.getElementById('copyRefLink');
            if (copyBtn) {
                copyBtn.addEventListener('click', () => {
                    const link = document.getElementById('referralLink').value;
                    navigator.clipboard.writeText(link).then(() => {
                        alert('Referral link copied to clipboard!');
                    });
                });
            }
            break;

        case 'Contact Support':
            const supportForm = document.getElementById('contactSupportForm');
            if (supportForm) {
                supportForm.addEventListener('submit', (e) => {
                    e.preventDefault();
                    const subject = document.getElementById('supportSubject').value;
                    const message = document.getElementById('supportMessage').value;
                    const attachment = document.getElementById('supportAttachment').files[0];

                    if (!subject || !message) {
                        alert('Please fill in all required fields');
                        return;
                    }

                    const ticket = {
                        id: `TKT-${Date.now()}`,
                        subject: subject,
                        message: message,
                        attachment: attachment ? attachment.name : null,
                        status: 'open',
                        createdAt: new Date().toISOString(),
                        userId: localStorage.getItem('currentUser') || 'unknown'
                    };

                    // Save ticket to localStorage
                    let tickets = JSON.parse(localStorage.getItem('supportTickets') || '[]');
                    tickets.push(ticket);
                    localStorage.setItem('supportTickets', JSON.stringify(tickets));

                    alert(`Support ticket submitted successfully!\nTicket ID: ${ticket.id}\n\nOur team will respond within 24 hours.`);
                    supportForm.reset();
                });
            }
            break;
    }
}