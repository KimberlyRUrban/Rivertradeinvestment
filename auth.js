// ============ DOM Elements ============
const registerTab = document.getElementById("registerTab");
const loginTab = document.getElementById("loginTab");
const registerForm = document.getElementById("registerForm");
const loginForm = document.getElementById("loginForm");
const authAPI = window.authAPI || window.AuthService || authService;

// ============ Tab Switching ============
registerTab.addEventListener("click", () => {
  registerTab.classList.add("active");
  loginTab.classList.remove("active");
  registerForm.classList.add("active");
  loginForm.classList.remove("active");
  // Clear messages only
  resetMessages();
});

loginTab.addEventListener("click", () => {
  loginTab.classList.add("active");
  registerTab.classList.remove("active");
  loginForm.classList.add("active");
  registerForm.classList.remove("active");
  // Clear messages only
  resetMessages();
});

// ============ Helper Functions ============
function resetMessages() {
  const msgEl = document.getElementById('registerMessage');
  const loginMsgEl = document.getElementById('loginMessage');
  if (msgEl) msgEl.textContent = '';
  if (loginMsgEl) loginMsgEl.textContent = '';
}

function showError(messageEl, message) {
  if (messageEl) {
    messageEl.textContent = message;
    messageEl.style.color = '#ff6b6b';
  }
}

function showSuccess(messageEl, message) {
  if (messageEl) {
    messageEl.textContent = message;
    messageEl.style.color = '#4caf50';
  }
}

// ============ Email Validation ============
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// ============ Password Validation ============
function isValidPassword(password) {
  // Minimum 6 characters
  return password && password.length >= 6;
}

// ============ Referral Code Validation ============
const referralCodeInput = document.getElementById('regReferralCode');
if (referralCodeInput) {
  let validationTimeout;
  referralCodeInput.addEventListener('input', async (e) => {
    const code = e.target.value.trim();
    const feedback = document.getElementById('referralFeedback');
    
    // Clear previous timeout
    clearTimeout(validationTimeout);
    
    if (!code) {
      if (feedback) feedback.remove();
      return;
    }

    // Debounce the validation
    validationTimeout = setTimeout(async () => {
      try {
        // Create feedback element if it doesn't exist
        let feedbackEl = document.getElementById('referralFeedback');
        if (!feedbackEl) {
          feedbackEl = document.createElement('div');
          feedbackEl.id = 'referralFeedback';
          feedbackEl.style.fontSize = '0.9em';
          feedbackEl.style.marginTop = '5px';
          feedbackEl.style.padding = '8px';
          feedbackEl.style.borderRadius = '4px';
          referralCodeInput.parentElement.appendChild(feedbackEl);
        }

        // Show loading state
        feedbackEl.textContent = '🔄 Validating...';
        feedbackEl.style.color = '#999';

        // Validate the referral code
        const result = await authAPI.validateReferralCode(code);
        
        if (result.data && result.data.valid) {
          feedbackEl.innerHTML = `✅ Valid referral code! You'll receive $${result.data.bonus || 5} welcome bonus from <strong>${result.data.referrerName}</strong>`;
          feedbackEl.style.color = '#4caf50';
          feedbackEl.style.backgroundColor = 'rgba(76, 175, 80, 0.1)';
        } else {
          feedbackEl.textContent = '❌ Invalid referral code';
          feedbackEl.style.color = '#541919';
          feedbackEl.style.backgroundColor = '#e8e2da';
        }
      } catch (error) {
        console.error('Referral validation error:', error);
        let feedbackEl = document.getElementById('referralFeedback');
        if (feedbackEl) {
          feedbackEl.textContent = '⚠️ Could not validate referral code';
          feedbackEl.style.color = '#0b0b0b';
          feedbackEl.style.backgroundColor = '#e8e2da';
        }
      }
    }, 500); // Wait 500ms after user stops typing
  });
}

// ============ Registration Form Handler ============
registerForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  
  const msgEl = document.getElementById('registerMessage');
  const submitBtn = registerForm.querySelector('button[type="submit"]');
  
  // Reset message
  resetMessages();

  // Get form values
  const firstName = document.getElementById('regFirstName')?.value.trim() || '';
  const lastName = document.getElementById('regLastName')?.value.trim() || '';
  const email = document.getElementById('regEmail')?.value.trim() || '';
  const country = document.getElementById('regCountry')?.value.trim() || '';
  const countryCode = document.getElementById('regCountryCode')?.value.trim() || '';
  const phone = document.getElementById('regPhone')?.value.trim() || '';
  const currency = document.getElementById('regCurrency')?.value || '';
  const password = document.getElementById('regPassword')?.value || '';
  const confirmPassword = document.getElementById('confirmPassword')?.value || '';
  const referralCode = document.getElementById('regReferralCode')?.value.trim() || '';
  const wantsBonus = document.getElementById('bonus')?.checked || false;

  // Validation
  if (!firstName || !lastName) {
    showError(msgEl, 'First name and last name are required.');
    return;
  }

  if (!email) {
    showError(msgEl, 'Email address is required.');
    return;
  }

  if (!isValidEmail(email)) {
    showError(msgEl, 'Please enter a valid email address.');
    return;
  }

  if (!password) {
    showError(msgEl, 'Password is required.');
    return;
  }

  if (!isValidPassword(password)) {
    showError(msgEl, 'Password must be at least 6 characters long.');
    return;
  }

  if (password !== confirmPassword) {
    showError(msgEl, 'Passwords do not match.');
    return;
  }

  if (!country || !countryCode || !phone) {
    showError(msgEl, 'Country, country code, and phone number are required.');
    return;
  }

  if (!currency) {
    showError(msgEl, 'Please select a currency.');
    return;
  }

  // Disable button during submission
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = 'Registering...';
  }

  try {
    // Prepare user data
    const user = {
      firstName,
      lastName,
      email,
      country,
      countryCode,
      phone,
      currency,
      referralCode: referralCode || null,
      wantsBonus,
      createdAt: new Date().toISOString()
    };

    // Register user via backend auth service
    if (authAPI && typeof authAPI.register === 'function') {
      await authAPI.register(user, password);
      showSuccess(msgEl, 'Registration successful! Redirecting to dashboard...');
      setTimeout(() => {
        window.location.href = 'dashboard.html';
      }, 1000);
    } else {
      throw new Error('AuthService not available');
    }
  } catch (err) {
    console.error('Registration error:', err);
    showError(msgEl, err.message || 'Registration failed. Please try again.');
    
    // Re-enable button
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Register';
    }
  }
});

// ============ Login Form Handler ============
loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  
  const msgEl = document.getElementById('loginMessage') || document.getElementById('registerMessage');
  const submitBtn = loginForm.querySelector('button[type="submit"]');
  
  // Reset message
  resetMessages();

  // Get form values
  const email = document.querySelector('#loginForm input[type="email"]')?.value.trim() || '';
  const password = document.querySelector('#loginForm input[type="password"]')?.value || '';
  const rememberMe = document.getElementById('rememberMe')?.checked || false;

  // Validation
  if (!email) {
    showError(msgEl, 'Email address is required.');
    return;
  }

  if (!isValidEmail(email)) {
    showError(msgEl, 'Please enter a valid email address.');
    return;
  }

  if (!password) {
    showError(msgEl, 'Password is required.');
    return;
  }

  // Disable button during submission
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = 'Signing in...';
  }

  try {
    // Login via backend auth service
    if (authAPI && typeof authAPI.login === 'function') {
      await authAPI.login(email, password);
      
      // Remember me functionality
      if (rememberMe) {
        localStorage.setItem('rememberEmail', email);
      } else {
        localStorage.removeItem('rememberEmail');
      }

      showSuccess(msgEl, 'Login successful! Redirecting...');
      setTimeout(() => {
        window.location.href = 'dashboard.html';
      }, 1000);
    } else {
      throw new Error('AuthService not available');
    }
  } catch (err) {
    console.error('Login error:', err);
    showError(msgEl, err.message || 'Login failed. Please check your credentials.');
    
    // Re-enable button
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Sign In';
    }
  }
});

// ============ Load Remembered Email ============
window.addEventListener('DOMContentLoaded', () => {
  const rememberedEmail = localStorage.getItem('rememberEmail');
  if (rememberedEmail) {
    const emailInput = document.querySelector('#loginForm input[type="email"]');
    if (emailInput) {
      emailInput.value = rememberedEmail;
      const rememberCheckbox = document.getElementById('rememberMe');
      if (rememberCheckbox) {
        rememberCheckbox.checked = true;
      }
    }
  }
});

// ============ Tab Activation from URL Hash ============
(function () {
  function activateFromHash() {
    const hash = (location.hash || "").replace('#', '').toLowerCase();
    if (hash === 'login') {
      if (loginTab) loginTab.click();
    } else if (hash === 'register') {
      if (registerTab) registerTab.click();
    }
  }

  // Run on page load
  try {
    activateFromHash();
  } catch (err) {
    document.addEventListener('DOMContentLoaded', activateFromHash);
  }

  // React to hash changes
  window.addEventListener('hashchange', activateFromHash);
})();


