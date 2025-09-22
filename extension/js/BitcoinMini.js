// Bitcoin Mini Extension - Refactored Main Class
import { CONFIG } from './config.js';
import { ApiService } from './services/ApiService.js';
import { AuthService } from './services/AuthService.js';
import { StorageService } from './services/StorageService.js';
import { UIManager } from './managers/UIManager.js';
import { NotificationManager } from './managers/NotificationManager.js';
import { AddressValidator } from './utils/AddressValidator.js';

// Browser API polyfill for cross-browser compatibility
if (typeof browser === "undefined") {
  var browser = chrome;
}

export class BitcoinMini {
  constructor() {
    // Initialize managers and services
    this.notificationManager = new NotificationManager();
    this.storageService = new StorageService();
    this.uiManager = new UIManager(this.storageService, this.notificationManager);
    this.apiService = new ApiService();
    this.authService = new AuthService(this.storageService, this.notificationManager);

    // Track initialization state to prevent race conditions
    this.isInitializing = false;
    this.isInitialized = false;

    // Don't call init() directly in constructor - will be called by initializeApp()
  }

  async init() {
    if (this.isInitializing || this.isInitialized) {
      return;
    }

    this.isInitializing = true;
    try {
      // Load data and initialize services with proper error handling
      const loadResult = await this.storageService.loadData();

      // Initialize auth service with loaded settings
      await this.authService.init();

      // Handle "On Extension Open" timeout AFTER settings are loaded
      await this.authService.handleExtensionOpenTimeout();

      // Set initial address section state based on lock status
      await this.initAddressSection();

      // Bind events
      this.bindEvents();

      // Update PIN attempt display and start updater if needed
      this.updatePinAttemptDisplay();

      // Conservative data refresh logic
      await this.intelligentDataRefresh();

      // Ensure DOM is ready before rendering - use setTimeout to defer rendering
      setTimeout(() => {
        if (this.storageService.isDataLoaded) {
          this.uiManager.renderWatchlist();
          this.uiManager.updateCurrencyToggle();
          // Unit always defaults to BTC, no need to update toggle buttons
        } else {
          console.error('CRITICAL: Trying to render UI but storage data not loaded!');
          // Try to reload data and then render
          this.storageService.loadData().then(() => {
            this.uiManager.renderWatchlist();
            this.uiManager.updateCurrencyToggle();
            // Unit always defaults to BTC, no need to update toggle buttons
          });
        }
      }, 100); // Small delay to ensure everything is ready

      // Start vault timeout (not needed for extension_open)
      if (this.storageService.getVaultTimeout() !== 'extension_open') {
        this.authService.startVaultTimeout();
      }

      this.isInitialized = true;
      // Initialization complete
    } catch (error) {
      console.error('Error during initialization:', error);
      this.notificationManager.showError('Failed to initialize extension');
    } finally {
      this.isInitializing = false;
    }
  }

  // Intelligent data refresh - respects user preferences and recent activity
  async intelligentDataRefresh() {
    const vaultTimeout = this.storageService.getVaultTimeout();
    const cached = this.apiService.getCachedData();
    const now = Date.now();

    // For "Never" timeout users, be more conservative with refreshes
    if (vaultTimeout === 'never') {
      const priceAge = cached.price ? now - cached.price.timestamp : Infinity;
      const feesAge = cached.fees ? now - cached.fees.timestamp : Infinity;

      // Only refresh if data is very stale (15+ minutes) or missing
      const shouldRefreshPrice = !cached.price || priceAge > (15 * 60 * 1000);
      const shouldRefreshFees = !cached.fees || feesAge > (15 * 60 * 1000);

      if (!this.apiService.isRateLimited) {
        if (shouldRefreshPrice) {
          await this.refreshPriceIfNeeded();
        }
        if (shouldRefreshFees) {
          await this.refreshFeesIfNeeded();
        }
      }

      // Always show cached data if available
      this.displayCachedData();
    } else {
      // For other timeout settings, use normal refresh logic
      if (!this.apiService.isRateLimited) {
        await this.refreshPriceIfNeeded();
        await this.refreshFeesIfNeeded();
      } else {
        this.displayCachedData();
      }
    }
  }

  // Address section initialization
  async initAddressSection() {
    const isLocked = await this.authService.isLocked();
    const hasPinSetup = await this.authService.hasPinSetup();

    if (isLocked) {
      this.uiManager.hideAddressSection();
    } else if (hasPinSetup) {
      this.uiManager.showAddressSection();
    } else {
      this.uiManager.showAddressSection();
    }
  }

  // Event binding
  bindEvents() {

    // Direct event listeners for critical buttons to ensure reliability
    this.bindCriticalEvents();

    // Use event delegation for other interactions
    document.addEventListener('click', this.handleClick.bind(this));
    document.addEventListener('input', this.handleInput.bind(this));
    document.addEventListener('keypress', this.handleKeypress.bind(this));

    // Setup visibility listener for conservative refresh
    this.setupVisibilityListener();
  }

  bindCriticalEvents() {
    // Settings button - use direct listener for reliability
    const settingsBtn = document.getElementById('settingsBtn');
    if (settingsBtn) {
      settingsBtn.addEventListener('click', () => {
        this.showSettingsModal();
      });
    }

    // Settings modal buttons
    const saveSettingsBtn = document.getElementById('saveSettingsBtn');
    if (saveSettingsBtn) {
      saveSettingsBtn.addEventListener('click', () => {
        this.saveSettings();
      });
    }

    const cancelSettingsBtn = document.getElementById('cancelSettingsBtn');
    if (cancelSettingsBtn) {
      cancelSettingsBtn.addEventListener('click', () => {
        this.uiManager.hideModal('settingsModal');
      });
    }

    // Other critical buttons that need immediate response
    const refreshPriceBtn = document.getElementById('refreshPriceBtn');
    if (refreshPriceBtn) {
      refreshPriceBtn.addEventListener('click', () => {
        this.authService.trackActivity();
        this.refreshPriceIfNeeded(true);
      });
    }

    const refreshFeesBtn = document.getElementById('refreshFeesBtn');
    if (refreshFeesBtn) {
      refreshFeesBtn.addEventListener('click', () => {
        this.authService.trackActivity();
        this.refreshFeesIfNeeded(true);
      });
    }
  }

  handleClick(e) {
    const target = e.target;
    this.authService.trackActivity();

    // Price and fees refresh buttons (handled by direct listeners now)
    if (target.id === 'refreshPriceBtn' || target.id === 'refreshFeesBtn') {
      // Skip - handled by direct listeners
      return;
    }

    // Unit toggle buttons - temporary session-only changes
    else if (target.id === 'toggleBtcBtn') {
      this.setSessionUnit('BTC');
    } else if (target.id === 'toggleSatsBtn') {
      this.setSessionUnit('SATS');
    } else if (target.id === 'toggleCurrencyBtn') {
      this.setSessionUnit('USD');
    }

    // Address management
    else if (target.id === 'addWatchBtn') {
      this.addWatch();
    } else if (target.classList.contains('remove-btn-small')) {
      const index = parseInt(target.getAttribute('data-index'));
      this.removeWatch(index);
    } else if (target.classList.contains('refresh-btn-small')) {
      const address = target.getAttribute('data-address');
      this.refreshAddressData(address);
    }

    // Authentication
    else if (target.id === 'lockBtn') {
      this.handleLockButton();
    } else if (target.id === 'unlockBtn') {
      this.unlockPin();
    } else if (target.id === 'resetBtn') {
      this.uiManager.showModal('resetConfirmModal');
      this.uiManager.focusElement('resetConfirmInput');
    }

    // PIN Setup Modal
    else if (target.id === 'confirmPinSetupBtn') {
      this.setupPin();
    } else if (target.id === 'cancelPinSetupBtn') {
      this.uiManager.hideModal('pinSetupModal');
    }

    // Reset Confirmation Modal
    else if (target.id === 'confirmResetBtn') {
      this.resetAllData();
    } else if (target.id === 'cancelResetBtn') {
      this.uiManager.hideModal('resetConfirmModal');
    }

    // Settings Modal (all handled by direct listeners)
    else if (target.id === 'settingsBtn' || target.id === 'saveSettingsBtn' || target.id === 'cancelSettingsBtn') {
      // Skip - handled by direct listeners
      return;
    }

    // Change PIN Modal
    else if (target.id === 'changePinBtn') {
      this.showChangePinModal();
    } else if (target.id === 'confirmChangePinBtn') {
      this.changePin();
    } else if (target.id === 'cancelChangePinBtn') {
      this.uiManager.hideModal('changePinModal');
    }

    // Info buttons and tooltips
    else if (target.id === 'riskInfoBtn') {
      this.handleTooltip('riskTooltip', target);
    } else if (target.id === 'feeInfoBtn') {
      this.handleTooltip('feeTooltip', target);
    }

    // Close tooltips when clicking elsewhere
    else if (!target.closest('#riskInfoBtn') && !target.closest('#riskTooltip') &&
             !target.closest('#feeInfoBtn') && !target.closest('#feeTooltip')) {
      this.uiManager.hideAllTooltips();
    }
  }

  handleInput(e) {
    const target = e.target;

    // PIN inputs
    if (target.id === 'pinInput' || target.id === 'pinSetupInput' ||
        target.id === 'currentPinInput' || target.id === 'newPinInput') {
      this.handlePinInput(target);
    }

    // Reset confirmation input
    else if (target.id === 'resetConfirmInput') {
      const button = document.getElementById('confirmResetBtn');
      if (button) {
        button.disabled = target.value.toUpperCase() !== 'RESET';
      }
    }

    // Address inputs
    else if (target.id === 'addr' || target.id === 'label') {
      this.authService.trackActivity();
    }
  }

  handleKeypress(e) {
    if (e.key === 'Enter') {
      const target = e.target;
      e.preventDefault();
      this.authService.trackActivity();

      if (target.id === 'addr' || target.id === 'label') {
        this.addWatch();
      } else if (target.id === 'pinInput') {
        this.unlockPin();
      } else if (target.id === 'pinSetupInput') {
        this.setupPin();
      } else if (target.id === 'currentPinInput' || target.id === 'newPinInput') {
        this.changePin();
      } else if (target.id === 'resetConfirmInput') {
        const button = document.getElementById('confirmResetBtn');
        if (button && !button.disabled) {
          this.resetAllData();
        }
      }
    }
  }

  handlePinInput(target) {
    // Filter to numbers only and limit length
    let value = target.value.replace(/\D/g, '').substring(0, CONFIG.MAX_PIN_LENGTH);
    target.value = value;

    // Update PIN dots
    const dotPrefix = target.id.replace('Input', 'Dot');
    this.uiManager.updatePinDots(target.id, dotPrefix);

    // Update change PIN button if this is in the change PIN modal
    if (target.id === 'currentPinInput' || target.id === 'newPinInput') {
      this.uiManager.updateChangePinButton();
    }
  }

  handleTooltip(tooltipId, buttonElement) {
    const tooltip = document.getElementById(tooltipId);
    if (tooltip && tooltip.classList.contains('show')) {
      this.uiManager.hideTooltip(tooltipId);
    } else {
      this.uiManager.hideAllTooltips();
      this.uiManager.showTooltip(tooltipId, buttonElement);
    }
  }

  // API methods
  async refreshPriceIfNeeded(force = false) {
    try {
      // Show cached data immediately if available
      const cachedData = this.apiService.getCachedData();
      if (cachedData.price && !force) {
        this.uiManager.displayPriceData(cachedData.price);
        this.uiManager.currentBtcPrice = cachedData.price.currentPrice || 0;
        this.uiManager.renderWatchlist(); // Update USD values with cached price
      } else {
        this.uiManager.displayPriceLoading();
      }

      const currency = this.storageService.getCurrency();
      const priceData = await this.apiService.refreshPriceIfNeeded(currency, force);

      if (priceData) {
        this.uiManager.displayPriceData(priceData);
        this.uiManager.currentBtcPrice = priceData.currentPrice || 0;
        this.uiManager.renderWatchlist(); // Update USD values with fresh data
      }
    } catch (error) {
      console.error('Price refresh error:', error);
      this.uiManager.displayPriceError(error);
    }
  }

  async refreshFeesIfNeeded(force = false) {
    try {
      // Show cached fees immediately if available
      const cachedData = this.apiService.getCachedData();
      if (cachedData.fees && !force) {
        this.uiManager.displayFeesData(cachedData.fees);
      }

      const feesData = await this.apiService.refreshFeesIfNeeded(force);
      if (feesData) {
        this.uiManager.displayFeesData(feesData);
      }
    } catch (error) {
      console.error('Fees refresh error:', error);
      this.uiManager.displayFeesError();
    }
  }

  displayCachedData() {
    const cached = this.apiService.getCachedData();
    if (cached.price) {
      this.uiManager.displayPriceData(cached.price);
    }
    if (cached.fees) {
      this.uiManager.displayFeesData(cached.fees);
    }
  }

  // Address management
  async addWatch() {
    const inputs = this.uiManager.getAddressInputs();
    const { address, label } = inputs;

    // Validate address
    const addressValidation = await AddressValidator.validateAddressForWatchlist(
      address,
      this.storageService.getWatchlist()
    );

    if (!addressValidation.isValid) {
      this.uiManager.showAddressError(addressValidation.error);
      return;
    }

    // Validate label
    const labelValidation = AddressValidator.validateLabel(label);
    if (!labelValidation.isValid) {
      this.uiManager.showAddressError(labelValidation.error);
      return;
    }

    this.uiManager.clearAddressError();

    // Add to watchlist
    const newItem = this.storageService.addAddress(addressValidation.address, labelValidation.label);
    if (!newItem) {
      this.uiManager.showAddressError('Failed to add address');
      return;
    }


    // Render immediately to show the address
    this.uiManager.renderWatchlist();

    try {
      // Fetch balance and quantum risk in parallel with timeout
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Address data fetch timeout')), CONFIG.ADDRESS_TIMEOUT)
      );

      const [summary, quantumResult] = await Promise.race([
        Promise.all([
          this.apiService.fetchAddressSummary(addressValidation.address),
          this.apiService.checkQuantumExposure(addressValidation.address)
        ]),
        timeoutPromise
      ]);

      // Update the item with fetched data and API status
      const updateData = {
        balance_btc: summary.balance_btc || 0,
        quantum_risk: quantumResult.overall_risk
      };

      // Add API error information if present
      if (summary.api_status === 'error') {
        updateData.api_error = summary.error_message;
        updateData.api_status = 'error';
        this.notificationManager.showToast(`Address added - ${summary.user_message}`);
      } else {
        updateData.api_status = 'success';
        this.notificationManager.showAddressAdded(addressValidation.address);
      }

      this.storageService.updateAddress(addressValidation.address, updateData);
      this.uiManager.renderWatchlist();

    } catch (error) {
      console.error('Address fetch error:', error);

      if (error.message.includes('timeout')) {
        this.storageService.updateAddress(addressValidation.address, { quantum_risk: 'timeout' });
        this.notificationManager.showToast('Address added - data loading in background');

        // Retry in background
        this.retryAddressDataInBackground(addressValidation.address);
      } else {
        this.storageService.updateAddress(addressValidation.address, { quantum_risk: 'unknown' });
      }

      this.uiManager.renderWatchlist();
    }

    // Clear inputs and save data immediately to prevent loss
    this.uiManager.clearAddressInputs();
    try {
      await this.storageService.saveData();
    } catch (error) {
      console.error('Failed to save address data:', error);
      this.notificationManager.showError('Failed to save address');
    }
  }

  async retryAddressDataInBackground(address) {
    setTimeout(async () => {
      try {
        const [summary, quantumResult] = await Promise.all([
          this.apiService.fetchAddressSummary(address),
          this.apiService.checkQuantumExposure(address)
        ]);

        this.storageService.updateAddress(address, {
          balance_btc: summary.balance_btc || 0,
          quantum_risk: quantumResult.overall_risk
        });

        console.log(`Background update for ${address}: balance=${summary.balance_btc}, risk=${quantumResult.overall_risk}`);
        this.uiManager.renderWatchlist();

        try {
          await this.storageService.saveData();
          console.log('Background address update saved successfully');
        } catch (saveError) {
          console.error('Failed to save background address update:', saveError);
        }

      } catch (retryError) {
        console.error('Background retry failed for', address, ':', retryError);
        this.storageService.updateAddress(address, { quantum_risk: 'unknown' });
        this.uiManager.renderWatchlist();
      }
    }, CONFIG.BACKGROUND_RETRY_DELAY);
  }

  async removeWatch(index) {
    const removed = this.storageService.removeAddress(index);
    if (removed) {
      this.uiManager.renderWatchlist();

      try {
        await this.storageService.saveData();
        console.log('Address removal saved successfully');
        this.notificationManager.showAddressRemoved(removed.address);
      } catch (error) {
        console.error('Failed to save address removal:', error);
        this.notificationManager.showError('Failed to remove address');
        // Re-add the address since save failed
        this.storageService.watchlist.splice(index, 0, removed);
        this.uiManager.renderWatchlist();
      }
    }
  }

  async refreshAddressData(address) {
    console.log('Manually refreshing data for address:', address);

    // Set to checking state
    this.storageService.updateAddress(address, { quantum_risk: 'checking...' });
    this.uiManager.renderWatchlist();

    try {
      const [summary, quantumResult] = await Promise.all([
        this.apiService.fetchAddressSummary(address),
        this.apiService.checkQuantumExposure(address)
      ]);

      this.storageService.updateAddress(address, {
        balance_btc: summary.balance_btc || 0,
        quantum_risk: quantumResult.overall_risk
      });

      console.log(`Refreshed ${address}: balance=${summary.balance_btc}, risk=${quantumResult.overall_risk}`);

      this.uiManager.renderWatchlist();

      try {
        await this.storageService.saveData();
        console.log('Address refresh data saved successfully');
        this.notificationManager.showAddressRefreshed(address);
      } catch (error) {
        console.error('Failed to save refreshed address data:', error);
        this.notificationManager.showError('Data refreshed but failed to save');
      }

    } catch (error) {
      console.error('Refresh error for', address, ':', error);
      this.storageService.updateAddress(address, { quantum_risk: 'unknown' });
      this.uiManager.renderWatchlist();
      this.notificationManager.showError('Failed to refresh address data');
    }
  }

  // Authentication methods
  async handleLockButton() {
    const isLocked = await this.authService.isLocked();

    if (isLocked) {
      this.uiManager.focusElement('pinInput');
    } else {
      const hasPinSetup = await this.authService.hasPinSetup();
      if (!hasPinSetup) {
        this.uiManager.showModal('pinSetupModal');
        this.uiManager.focusElement('pinSetupInput');
      } else {
        await this.authService.lockVault();
        this.uiManager.hideAddressSection();
      }
    }
  }

  async setupPin() {
    const pin = this.uiManager.getElementValue('pinSetupInput');

    try {
      await this.authService.setupPin(pin);
      await this.authService.lockVault();
      this.uiManager.hideAddressSection();
      this.uiManager.hideModal('pinSetupModal');

      // Refresh price data to ensure USD values work correctly
      await this.refreshPriceIfNeeded(true);
      this.uiManager.renderWatchlist();
    } catch (error) {
      console.error('PIN setup error:', error);
      this.notificationManager.showError('Failed to set up PIN');
    }
  }

  async unlockPin() {
    const pin = this.uiManager.getElementValue('pinInput');

    try {
      const success = await this.authService.unlockPin(pin);
      if (success) {
        this.uiManager.showAddressSection();
        this.uiManager.clearPinInput();

        // Refresh price data to ensure USD values work correctly
        await this.refreshPriceIfNeeded(true);
        this.uiManager.renderWatchlist();
      } else {
        this.uiManager.clearPinInput();
        this.updatePinAttemptDisplay();
      }
    } catch (error) {
      console.error('PIN unlock error:', error);
      this.notificationManager.showError('Failed to unlock');
    }
  }

  async changePin() {
    const currentPin = this.uiManager.getElementValue('currentPinInput');
    const newPin = this.uiManager.getElementValue('newPinInput');

    try {
      await this.authService.changePin(currentPin, newPin);
      this.uiManager.hideModal('changePinModal');
    } catch (error) {
      console.error('PIN change error:', error);

      if (error.message.includes('incorrect')) {
        this.uiManager.addPinFieldError('currentPinInput');
        this.uiManager.setElementValue('currentPinInput', '');
        this.uiManager.updatePinDots('currentPinInput', 'currentPinDot');
        this.uiManager.updateChangePinButton();
        this.uiManager.focusElement('currentPinInput');
      } else if (error.message.includes('different')) {
        this.uiManager.addPinFieldError('newPinInput');
        this.uiManager.setElementValue('newPinInput', '');
        this.uiManager.updatePinDots('newPinInput', 'newPinDot');
        this.uiManager.updateChangePinButton();
        this.uiManager.focusElement('newPinInput');
      }
    }
  }

  async resetAllData() {
    try {
      await this.authService.resetAllData();
      this.storageService.clearWatchlist();
      this.uiManager.showAddressSection();
      this.uiManager.hideModal('resetConfirmModal');

      // Refresh price data and render empty watchlist
      await this.refreshPriceIfNeeded(true);
      this.uiManager.renderWatchlist();
      this.notificationManager.showDataReset();
    } catch (error) {
      console.error('Reset error:', error);
      this.notificationManager.showError('Failed to reset data');
    }
  }

  // Settings
  showSettingsModal() {
    console.log('showSettingsModal called');
    // Show modal immediately for responsiveness
    this.uiManager.showModal('settingsModal');

    // Load settings asynchronously
    this.loadSettingsAsync();
  }

  async loadSettingsAsync() {
    try {
      const settings = await this.storageService.loadSettings();
      this.uiManager.loadSettingsUI(settings);
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  }

  async showChangePinModal() {
    const hasPinSetup = await this.authService.hasPinSetup();
    if (!hasPinSetup) {
      this.uiManager.hideModal('settingsModal');
      this.uiManager.showModal('pinSetupModal');
      this.uiManager.focusElement('pinSetupInput');
    } else {
      this.uiManager.showModal('changePinModal');
      this.uiManager.focusElement('currentPinInput');
    }
  }

  async saveSettings() {
    const newSettings = this.uiManager.getSettingsFromUI();
    const oldCurrency = this.storageService.getCurrency();
    let needsRefresh = false;

    // Check if currency changed
    if (newSettings.currency !== oldCurrency) {
      if (this.apiService.isRateLimited) {
        this.notificationManager.showRateLimitWarning();
        return;
      }
      needsRefresh = true;
      this.apiService.clearCache(); // Clear cache for new currency
    }

    // Save settings
    await this.storageService.saveSettings(newSettings);
    this.authService.updateVaultTimeout(newSettings.vaultTimeout);

    this.uiManager.hideModal('settingsModal');
    this.authService.startVaultTimeout();

    // Refresh if currency changed
    if (needsRefresh) {
      await this.refreshPriceIfNeeded(true);
    }

    this.uiManager.renderWatchlist();
    this.uiManager.updateCurrencyToggle();
  }

  // Unit management - session only, no persistence
  setSessionUnit(newUnit) {
    // Update unit in memory only (no saving to storage)
    this.storageService.unit = newUnit;

    // Update UI immediately
    this.uiManager.renderWatchlist();
    this.uiManager.updateToggleButtons();
    this.uiManager.updateCurrencyToggle();
  }

  // PIN attempt display
  updatePinAttemptDisplay() {
    const attemptInfo = this.authService.getPinAttemptInfo();
    this.uiManager.updatePinAttemptDisplay(attemptInfo);

    // Start updater if locked out
    if (attemptInfo.isLockedOut) {
      this.authService.startPinDisplayUpdater((info) => {
        this.uiManager.updatePinAttemptDisplay(info);
      });
    }
  }


  // Visibility change listener for conservative refresh
  setupVisibilityListener() {
    let lastVisibilityChange = Date.now();

    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        const now = Date.now();
        const timeSinceLastChange = now - lastVisibilityChange;
        const vaultTimeout = this.storageService.getVaultTimeout();
        const cached = this.apiService.getCachedData();

        const priceAge = cached.price ? now - cached.price.timestamp : Infinity;
        const feesAge = cached.fees ? now - cached.fees.timestamp : Infinity;

        // For "Never" timeout users, be much more conservative
        if (vaultTimeout === 'never') {
          // Only refresh if:
          // 1. User was away for more than 5 minutes, AND
          // 2. Data is more than 15 minutes old
          const longAbsence = timeSinceLastChange > (5 * 60 * 1000);
          const veryStaleData = priceAge > (15 * 60 * 1000) || feesAge > (15 * 60 * 1000);

          if (longAbsence && veryStaleData && !this.apiService.isRateLimited) {
            console.log('Extension became visible after long absence, refreshing stale data...');
            this.refreshPriceIfNeeded();
            this.refreshFeesIfNeeded();
          } else {
            console.log('Extension became visible, using cached data (Never timeout)');
            this.displayCachedData();
          }
        } else {
          // For other timeout settings, use more aggressive refresh
          if (!this.apiService.isRateLimited &&
              (priceAge > CONFIG.STALE_CACHE_THRESHOLD || feesAge > CONFIG.STALE_CACHE_THRESHOLD)) {
            console.log('Extension became visible, cache is stale, refreshing...');
            this.refreshPriceIfNeeded();
            this.refreshFeesIfNeeded();
          }
        }

        lastVisibilityChange = now;
      }
    });
  }
}

// Initialize the app
let app;
let initializationPromise;

async function initializeApp() {
  if (app) {
    console.log('App already initialized, skipping...');
    return app;
  }

  if (initializationPromise) {
    console.log('App already initializing, waiting for completion...');
    return initializationPromise;
  }

  console.log('Initializing Bitcoin Mini app...');

  initializationPromise = (async () => {
    try {
      app = new BitcoinMini();
      await app.init(); // Properly await initialization
      console.log('App initialization completed successfully');
      return app;
    } catch (error) {
      console.error('App initialization failed:', error);
      app = null; // Reset so we can try again
      initializationPromise = null;
      throw error;
    }
  })();

  return initializationPromise;
}

if (document.readyState === 'loading') {
  console.log('Document still loading, waiting for DOMContentLoaded');
  window.addEventListener('DOMContentLoaded', initializeApp);
} else {
  console.log('Document already loaded, initializing immediately');
  initializeApp();
}