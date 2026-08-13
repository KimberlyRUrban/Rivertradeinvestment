/**
 * Authentication Service
 * Handles all authentication-related API calls to the backend
 */

class AuthService {
  constructor(apiBaseURL = 'http://localhost:5000/api') {
    this.apiBaseURL = apiBaseURL;
    this.supabaseClient = window.supabaseClient || null;
  }

  /**
   * Register a new user
   * @param {Object} userData - User registration data
   * @param {string} password - Password supplied separately
   * @returns {Promise} Registration response
   */
  async register(userData, password = null) {
    try {
      if (this.supabaseClient && this.supabaseClient.auth) {
        const { data, error } = await this.supabaseClient.auth.signUp({
          email: userData.email,
          password,
          options: {
            data: {
              first_name: userData.firstName,
              last_name: userData.lastName,
              country: userData.country,
              countryCode: userData.countryCode,
              phone: userData.phone,
              currency: userData.currency,
              referralCode: userData.referralCode || null,
              wantsBonus: userData.wantsBonus || false
            }
          }
        });

        if (error) {
          throw new Error(error.message || 'Registration failed');
        }

        if (data.session) {
          localStorage.setItem('authToken', data.session.access_token);
          localStorage.setItem('user', JSON.stringify(data.user));
        }

        return { user: data.user, token: data.session?.access_token || null, message: 'Registration successful' };
      }

      const payload = { ...(userData || {}) };
      if (password) {
        payload.password = password;
      }

      const response = await fetch(`${this.apiBaseURL}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Registration failed');
      }

      const data = await response.json();
      if (data.token) {
        localStorage.setItem('authToken', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
      }
      return data;
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  }

  /**
   * Login user
   * @param {string} email - User email
   * @param {string} password - User password
   * @returns {Promise} Login response
   */
  async login(email, password) {
    try {
      if (this.supabaseClient && this.supabaseClient.auth) {
        const { data, error } = await this.supabaseClient.auth.signInWithPassword({ email, password });

        if (error) {
          throw new Error(error.message || 'Login failed');
        }

        if (data.session) {
          localStorage.setItem('authToken', data.session.access_token);
          localStorage.setItem('user', JSON.stringify(data.user));
        }

        return { user: data.user, token: data.session?.access_token || null, message: 'Login successful' };
      }

      const response = await fetch(`${this.apiBaseURL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Login failed');
      }

      const data = await response.json();
      if (data.token) {
        localStorage.setItem('authToken', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
      }
      return data;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }

  /**
   * Logout user
   */
  logout() {
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    window.location.href = 'index.html';
  }

  /**
   * Get current user
   * @returns {Object} Current user data
   */
  getCurrentUser() {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  }

  /**
   * Check if user is authenticated
   * @returns {boolean} True if authenticated
   */
  isAuthenticated() {
    return !!localStorage.getItem('authToken');
  }

  /**
   * Get auth token
   * @returns {string} Auth token
   */
  getToken() {
    return localStorage.getItem('authToken');
  }

  /**
   * Verify Cloudflare Turnstile token
   * @param {string} token - Cloudflare Turnstile token
   * @returns {Promise} Verification response
   */
  async verifyRecaptcha(token) {
    try {
      const response = await fetch(`${this.apiBaseURL}/auth/verify-turnstile`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ token })
      });

      return await response.json();
    } catch (error) {
      console.error('Cloudflare Turnstile verification error:', error);
      throw error;
    }
  }

  /**
   * Validate a referral code via the backend
   * @param {string} code - Referral code to validate
   * @returns {Promise} Validation response
   */
  async validateReferralCode(code) {
    try {
      if (this.supabaseClient && this.supabaseClient.from) {
        const { data, error } = await this.supabaseClient.from('referrals').select('code, bonus, referrer_name').eq('code', code).maybeSingle();
        if (error) throw new Error(error.message || 'Unable to validate referral code');
        if (!data) {
          return { data: { valid: false } };
        }
        return { data: { valid: true, bonus: data.bonus || 5, referrerName: data.referrer_name || 'a referrer' } };
      }

      const response = await fetch(`${this.apiBaseURL}/referrals/validate?code=${encodeURIComponent(code)}`);
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || 'Unable to validate referral code');
      }

      return await response.json();
    } catch (error) {
      console.error('Referral validation error:', error);
      throw error;
    }
  }

  /**
   * Refresh authentication token
   * @returns {Promise} New token
   */
  async refreshToken() {
    try {
      const response = await fetch(`${this.apiBaseURL}/auth/refresh-token`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.getToken()}`
        }
      });

      if (!response.ok) {
        this.logout();
        throw new Error('Token refresh failed');
      }

      const data = await response.json();
      if (data.token) {
        localStorage.setItem('authToken', data.token);
      }
      return data;
    } catch (error) {
      console.error('Token refresh error:', error);
      throw error;
    }
  }

  /**
   * Request password reset
   * @param {string} email - User email
   * @returns {Promise} Reset request response
   */
  async requestPasswordReset(email) {
    try {
      const response = await fetch(`${this.apiBaseURL}/auth/request-password-reset`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email })
      });

      return await response.json();
    } catch (error) {
      console.error('Password reset request error:', error);
      throw error;
    }
  }

  /**
   * Reset password
   * @param {string} token - Reset token
   * @param {string} newPassword - New password
   * @returns {Promise} Reset response
   */
  async resetPassword(token, newPassword) {
    try {
      const response = await fetch(`${this.apiBaseURL}/auth/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ token, newPassword })
      });

      return await response.json();
    } catch (error) {
      console.error('Password reset error:', error);
      throw error;
    }
  }
}

// Create global instance
const authService = new AuthService();
window.AuthService = authService;
window.authAPI = authService;
window.authService = authService;
