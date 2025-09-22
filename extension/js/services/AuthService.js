import { CONFIG } from '../config.js';

// Browser API polyfill for cross-browser compatibility
if (typeof browser === "undefined") {
  var browser = chrome;
}

export class AuthService {
  constructor(storageService, notificationManager) {
    this.storageService = storageService;
    this.notificationManager = notificationManager;
    this.vaultTimeout = CONFIG.DEFAULTS.VAULT_TIMEOUT;
    this.lastActivity = Date.now();
    this.timeoutId = null;
    this.pinAttempts = 0;
    this.pinLockoutUntil = 0;
    this.pinDisplayUpdater = null;
  }

  async init() {
    // Load PIN attempt state
    const pinData = await browser.storage.local.get(['pinAttempts', 'pinLockoutUntil']);
    this.pinAttempts = pinData.pinAttempts || 0;
    this.pinLockoutUntil = pinData.pinLockoutUntil || 0;

    // Load vault timeout setting
    const settings = await this.storageService.loadSettings();
    this.vaultTimeout = settings.vaultTimeout || CONFIG.DEFAULTS.VAULT_TIMEOUT;
  }

  async setupPin(pin) {
    if (!this.validatePinFormat(pin)) {
      throw new Error('Invalid PIN format');
    }

    const hashedPin = await this.hashPin(pin);
    await browser.storage.local.set({
      pin: hashedPin,
      isSetup: true,
      isLocked: false
    });

    // Don't override the user's vault timeout setting
    return true;
  }

  async unlockPin(pin) {
    // Check if currently locked out
    const now = Date.now();
    if (this.pinLockoutUntil > now) {
      const remainingTime = Math.ceil((this.pinLockoutUntil - now) / 1000);
      this.notificationManager.show(
        `Too many failed attempts. Please wait ${remainingTime} seconds before trying again.`,
        'error'
      );
      return false;
    }

    const authData = await browser.storage.local.get(['pin']);
    const hashedPin = await this.hashPin(pin);

    if (hashedPin === authData.pin) {
      // Successful unlock - reset attempt counter
      this.pinAttempts = 0;
      this.pinLockoutUntil = 0;

      await browser.storage.local.set({
        isLocked: false,
        pinAttempts: 0,
        pinLockoutUntil: 0
      });

      // Clear display updater since we're unlocked
      if (this.pinDisplayUpdater) {
        clearInterval(this.pinDisplayUpdater);
        this.pinDisplayUpdater = null;
      }

      return true;
    } else {
      // Failed attempt - increment counter
      this.pinAttempts++;

      if (this.pinAttempts >= CONFIG.MAX_PIN_ATTEMPTS) {
        this.pinLockoutUntil = now + CONFIG.PIN_LOCKOUT_DURATION;
        this.notificationManager.show(
          `Too many failed attempts. Locked out for ${CONFIG.PIN_LOCKOUT_DURATION / 60000} minutes.`,
          'error'
        );
      } else {
        this.notificationManager.show(
          `Invalid PIN. ${CONFIG.MAX_PIN_ATTEMPTS - this.pinAttempts} attempts remaining.`,
          'error'
        );
      }

      // Persist the attempt state
      await browser.storage.local.set({
        pinAttempts: this.pinAttempts,
        pinLockoutUntil: this.pinLockoutUntil
      });

      return false;
    }
  }

  async changePin(currentPin, newPin) {
    if (!this.validatePinFormat(currentPin) || !this.validatePinFormat(newPin)) {
      throw new Error('Invalid PIN format');
    }

    if (currentPin === newPin) {
      throw new Error('New PIN must be different from current PIN');
    }

    // Verify current PIN
    const authData = await browser.storage.local.get(['pin']);
    const hashedCurrentPin = await this.hashPin(currentPin);

    if (hashedCurrentPin !== authData.pin) {
      throw new Error('Current PIN is incorrect');
    }

    // Update PIN
    const hashedNewPin = await this.hashPin(newPin);
    await browser.storage.local.set({ pin: hashedNewPin });

    this.notificationManager.show('PIN changed successfully!', 'success');
    return true;
  }

  async resetAllData() {
    await browser.storage.local.clear();
    this.pinAttempts = 0;
    this.pinLockoutUntil = 0;
    this.vaultTimeout = CONFIG.DEFAULTS.VAULT_TIMEOUT;

    if (this.pinDisplayUpdater) {
      clearInterval(this.pinDisplayUpdater);
      this.pinDisplayUpdater = null;
    }
  }

  async hashPin(pin) {
    const encoder = new TextEncoder();
    const data = encoder.encode(pin);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  validatePinFormat(pin) {
    return pin &&
           pin.length >= CONFIG.MIN_PIN_LENGTH &&
           pin.length <= CONFIG.MAX_PIN_LENGTH &&
           CONFIG.REGEX.DIGITS_ONLY.test(pin);
  }

  async isLocked() {
    const authData = await browser.storage.local.get(['isLocked']);
    return !!authData.isLocked;
  }

  async hasPinSetup() {
    const authData = await browser.storage.local.get(['pin']);
    return !!authData.pin;
  }

  async lockVault() {
    await browser.storage.local.set({ isLocked: true });
  }

  async unlockVault() {
    await browser.storage.local.set({ isLocked: false });
  }

  // Vault timeout functionality
  async startVaultTimeout() {
    // Clear existing timeout
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }

    // Don't start timeout if vault is already locked or timeout is set to 'never'
    if (this.vaultTimeout === 'never' || this.vaultTimeout === 'extension_open') {
      return;
    }

    const authData = await browser.storage.local.get(['isLocked']);
    if (authData.isLocked) {
      return; // Don't start timeout if already locked
    }

    // Handle special timeout types
    if (this.vaultTimeout === 'browser_restart') {
      this.checkBrowserRestart();
      return;
    }

    if (this.vaultTimeout === 'system_lock') {
      this.setupSystemLockListener();
      return;
    }

    // Handle time-based timeouts
    const timeoutMinutes = parseInt(this.vaultTimeout);
    if (timeoutMinutes > 0) {
      const timeoutMs = timeoutMinutes * 60 * 1000;
      this.timeoutId = setTimeout(() => {
        this.autoLockVault();
      }, timeoutMs);
    }
  }

  async autoLockVault() {
    const authData = await browser.storage.local.get(['isLocked', 'pin']);

    // Only auto-lock if vault is unlocked and PIN is set up
    if (!authData.isLocked && authData.pin) {
      await browser.storage.local.set({ isLocked: true });
      return true;
    }
    return false;
  }

  trackActivity() {
    this.lastActivity = Date.now();
    this.startVaultTimeout(); // Restart timeout on activity
  }

  async checkBrowserRestart() {
    const sessionData = await browser.storage.local.get(['lastSessionId']);
    const currentSessionId = Date.now().toString();

    if (!sessionData.lastSessionId) {
      await browser.storage.local.set({ lastSessionId: currentSessionId });
      return;
    }

    // Check if session ID is significantly different (browser restart)
    const timeDiff = parseInt(currentSessionId) - parseInt(sessionData.lastSessionId);
    if (timeDiff > 300000) { // 5 minutes - likely a browser restart
      await this.autoLockVault();
    }

    await browser.storage.local.set({ lastSessionId: currentSessionId });
  }

  setupSystemLockListener() {
    // Browser extensions have limited access to system events
    // We'll use visibility change as a proxy for system lock
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        setTimeout(() => {
          if (document.hidden) {
            this.autoLockVault();
          }
        }, 1000);
      }
    });

    window.addEventListener('blur', () => {
      setTimeout(() => {
        if (document.hidden) {
          this.autoLockVault();
        }
      }, 1000);
    });
  }

  async handleExtensionOpenTimeout() {
    // Only lock if timeout is specifically set to 'extension_open'
    if (this.vaultTimeout === 'extension_open') {
      const authData = await browser.storage.local.get(['isLocked', 'pin']);
      if (!authData.isLocked && authData.pin) {
        await browser.storage.local.set({ isLocked: true });
        console.log('Vault auto-locked due to extension_open timeout setting');
        return true;
      }
    }
    console.log(`Vault timeout is '${this.vaultTimeout}' - no auto-lock needed`);
    return false;
  }

  updateVaultTimeout(newTimeout) {
    this.vaultTimeout = newTimeout;
    this.startVaultTimeout();
  }

  getPinAttemptInfo() {
    const now = Date.now();
    const isLockedOut = this.pinLockoutUntil > now;
    const remainingTime = isLockedOut ? Math.ceil((this.pinLockoutUntil - now) / 1000) : 0;

    return {
      attempts: this.pinAttempts,
      maxAttempts: CONFIG.MAX_PIN_ATTEMPTS,
      isLockedOut,
      remainingTime,
      remainingAttempts: CONFIG.MAX_PIN_ATTEMPTS - this.pinAttempts
    };
  }

  startPinDisplayUpdater(updateCallback) {
    // Clear existing updater
    if (this.pinDisplayUpdater) {
      clearInterval(this.pinDisplayUpdater);
    }

    // Update display every second when locked out
    this.pinDisplayUpdater = setInterval(() => {
      const now = Date.now();
      const isLockedOut = this.pinLockoutUntil > now;

      if (isLockedOut && updateCallback) {
        updateCallback(this.getPinAttemptInfo());
      } else {
        clearInterval(this.pinDisplayUpdater);
        this.pinDisplayUpdater = null;
      }
    }, CONFIG.PIN_DISPLAY_UPDATE_INTERVAL);
  }

  stopPinDisplayUpdater() {
    if (this.pinDisplayUpdater) {
      clearInterval(this.pinDisplayUpdater);
      this.pinDisplayUpdater = null;
    }
  }
}