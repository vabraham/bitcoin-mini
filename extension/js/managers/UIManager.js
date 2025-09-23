import { CONFIG } from '../config.js';

export class UIManager {
  constructor(storageService, notificationManager) {
    this.storageService = storageService;
    this.notificationManager = notificationManager;
    this.currentBtcPrice = 0;

    // Cache DOM elements for performance
    this.elements = {};
    this.cacheElements();
  }

  cacheElements() {
    const elementIds = [
      'price', 'priceChange', 'priceTime',
      'fee_fast', 'fee_hour', 'fee_econ', 'feeTime',
      'fee_fast_category', 'fee_hour_category', 'fee_econ_category',
      'watchRows', 'totalValue', 'addr', 'label', 'addrErr',
      'refreshPriceBtn', 'refreshFeesBtn', 'addWatchBtn',
      'toggleBtcBtn', 'toggleSatsBtn', 'toggleCurrencyBtn',
      'addressSection', 'lockedSection', 'lockBtn',
      'pinInput', 'unlockBtn', 'pinWarning',
      'settingsBtn', 'riskInfoBtn', 'feeInfoBtn',
      'riskTooltip', 'feeTooltip', 'notification',
      'notificationIcon', 'notificationText'
    ];

    elementIds.forEach(id => {
      this.elements[id] = document.getElementById(id);
    });
  }

  safeUpdateElement(id, content, property = 'textContent') {
    const element = this.elements[id] || document.getElementById(id);
    if (element) {
      element[property] = content;
      return true;
    }
    console.warn(`Element not found: ${id}`);
    return false;
  }

  safeGetElement(id) {
    return this.elements[id] || document.getElementById(id);
  }

  // Price display
  displayPriceData(priceData) {
    if (!priceData) return;

    this.safeUpdateElement('price', priceData.price);
    this.safeUpdateElement('priceChange', priceData.change);
    this.safeUpdateElement('priceTime', priceData.time);

    // Update price change class
    const changeEl = this.safeGetElement('priceChange');
    if (changeEl) {
      changeEl.className = priceData.changeClass;
    }

    // Apply cache status class to time element
    const timeEl = this.safeGetElement('priceTime');
    if (timeEl && priceData.timeClass) {
      timeEl.className = `muted ${priceData.timeClass}`;
    } else if (timeEl) {
      timeEl.className = 'muted';
    }
  }

    // Store current BTC price for calculations
    if (priceData.currentPrice) {
      this.currentBtcPrice = priceData.currentPrice;
    }
  }

  displayPriceError(error) {
    this.safeUpdateElement('price', 'API Error');

    const changeEl = this.safeGetElement('priceChange');
    if (changeEl) {
      if (error.message && error.message.includes('429')) {
        changeEl.textContent = 'Rate limited - try again later';
      } else {
        changeEl.textContent = 'Connection failed - try refresh';
      }
      changeEl.className = 'price-muted';
    }

    this.safeUpdateElement('priceTime', new Date().toLocaleTimeString());
  }

  displayPriceLoading() {
    this.safeUpdateElement('price', 'Loading...');
    this.safeUpdateElement('priceChange', '');
    this.safeUpdateElement('priceTime', '');
  }

  // Fees display
  displayFeesData(feesData) {
    if (!feesData) return;

    this.safeUpdateElement('fee_fast', feesData.fastestFee);
    this.safeUpdateElement('fee_hour', feesData.hourFee);
    this.safeUpdateElement('fee_econ', feesData.economyFee);
    this.safeUpdateElement('feeTime', feesData.time);

    // Apply cache status class to time element
    const timeEl = this.safeGetElement('feeTime');
    if (timeEl && feesData.timeClass) {
      timeEl.className = `muted ${feesData.timeClass}`;
    } else if (timeEl) {
      timeEl.className = 'muted';
    }

    // Update fee categories
    this.updateFeeCategory('fee_fast', feesData.fastestFee);
    this.updateFeeCategory('fee_hour', feesData.hourFee);
    this.updateFeeCategory('fee_econ', feesData.economyFee);
  }

  displayFeesError() {
    this.safeUpdateElement('fee_fast', 'Error');
    this.safeUpdateElement('fee_hour', 'Error');
    this.safeUpdateElement('fee_econ', 'Error');
    this.safeUpdateElement('feeTime', 'Connection failed');
  }

  updateFeeCategory(elementId, fee) {
    const categoryElement = this.safeGetElement(elementId + '_category');
    if (!categoryElement) return;

    if (!fee || fee === '—') {
      categoryElement.textContent = '—';
      categoryElement.className = 'fee-category';
      return;
    }

    const feeValue = parseFloat(fee);
    if (isNaN(feeValue)) {
      categoryElement.textContent = '—';
      categoryElement.className = 'fee-category';
      return;
    }

    if (feeValue < CONFIG.FEE_THRESHOLDS.VERY_LOW) {
      categoryElement.textContent = 'Very Low';
      categoryElement.className = 'fee-category fee-very-low';
    } else if (feeValue < CONFIG.FEE_THRESHOLDS.LOW) {
      categoryElement.textContent = 'Low';
      categoryElement.className = 'fee-category fee-low';
    } else if (feeValue <= CONFIG.FEE_THRESHOLDS.MEDIUM) {
      categoryElement.textContent = 'Medium';
      categoryElement.className = 'fee-category fee-medium';
    } else if (feeValue <= CONFIG.FEE_THRESHOLDS.HIGH) {
      categoryElement.textContent = 'High';
      categoryElement.className = 'fee-category fee-high';
    } else {
      categoryElement.textContent = 'Very High';
      categoryElement.className = 'fee-category fee-very-high';
    }
  }

  // Watchlist rendering
  renderWatchlist() {
    // Try to get the element fresh each time to avoid caching issues
    const tbody = document.getElementById('watchRows');
    if (!tbody) {
      console.error('watchRows element not found - DOM may not be ready');

      // Try again after a short delay
      setTimeout(() => {
        this.renderWatchlist();
      }, 50);
      return;
    }

    // Check if storage is loaded, but still try to render existing data
    if (!this.storageService.isDataLoaded) {
      console.warn('⚠️ [RENDER] Storage not marked as loaded, but attempting to render existing data...');
      const existingWatchlist = this.storageService.getWatchlist();
      if (!existingWatchlist || existingWatchlist.length === 0) {
        console.warn('⚠️ [RENDER] No watchlist data available, showing loading message');
        tbody.innerHTML = '<tr><td colspan="5">Loading addresses...</td></tr>';
        return;
      } else {
        console.log(`⚡ [RENDER] Found ${existingWatchlist.length} addresses despite data not loaded flag - rendering anyway`);
      }
    }

    tbody.innerHTML = '';
    const watchlist = this.storageService.getWatchlist();

    // Rendering watchlist

    watchlist.forEach((item, index) => {
      if (!item || !item.address) {
        console.warn('Invalid watchlist item at index', index, item);
        return;
      }

      const row = document.createElement('tr');
      const balance = this.formatAmountWithStatus(item.balance_btc, item.api_status, item.api_error);
      const risk = this.formatQuantumRisk(item.quantum_risk);

      row.innerHTML = `
        <td>${item.label || ''}</td>
        <td class="muted">${item.address.slice(0, 8)}...</td>
        <td>${balance}</td>
        <td class="${risk.class}">${risk.text}</td>
        <td style="text-align: right;">
          <div style="display: flex; justify-content: flex-end; gap: 5px;">
            <button class="refresh-btn-small" data-address="${item.address}" title="Refresh address data">🔄</button>
            <button class="remove-btn-small" data-index="${index}" title="Remove address"></button>
          </div>
        </td>
      `;

      tbody.appendChild(row);
    });

    this.updateTotal();
  }


  formatQuantumRisk(risk) {
    if (!risk || risk === 'checking...') {
      return { text: 'Checking...', class: 'muted' };
    }

    switch (risk) {
      case 'error':
        return { text: '❌ Error', class: 'warn' };
      case 'timeout':
        return { text: '⏱️ Timeout', class: 'muted' };
      case 'unknown':
        return { text: '❓ Unknown', class: 'muted' };
      case 'high':
        return { text: '🔴 High', class: 'warn' };
      case 'elevated':
        return { text: '🟡 Elevated', class: 'muted' };
      case 'low':
        return { text: '🟢 Low', class: 'ok' };
      default:
        return { text: '—', class: 'muted' };
    }
  }

  formatAmount(btc) {
    const unit = this.storageService.getUnit();
    const currency = this.storageService.getCurrency();

    if (unit === 'BTC') {
      return (btc || 0).toFixed(8);
    } else if (unit === 'SATS') {
      return Math.floor((btc || 0) * 1e8).toLocaleString();
    } else if (unit === 'USD') {
      const value = (btc || 0) * (this.currentBtcPrice || 0);
      const symbol = CONFIG.CURRENCY_SYMBOLS[currency] || currency.toUpperCase();
      return symbol + value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    return (btc || 0).toFixed(8);
  }

  formatAmountWithStatus(btc, apiStatus, apiError) {
    const formattedAmount = this.formatAmount(btc);

    // Enhanced error display with specific error types
    if (apiStatus === 'error') {
      let errorIcon = '❌';
      let errorColor = '#dc2626';
      let tooltip = apiError || 'API error occurred';

      // Customize display based on error type
      if (apiError && apiError.includes('rate limit')) {
        errorIcon = '🚫';
        tooltip = 'Rate limited - try refreshing later';
      } else if (apiError && apiError.includes('timeout')) {
        errorIcon = '⏱️';
        tooltip = 'Request timeout - API too slow';
      } else if (apiError && apiError.includes('network')) {
        errorIcon = '🌐';
        tooltip = 'Network error - check connection';
      } else if (apiError && apiError.includes('unavailable')) {
        errorIcon = '🔧';
        tooltip = 'Blockchain APIs temporarily unavailable';
      }

      return `<span title="${tooltip}" style="color: ${errorColor};">${errorIcon} ${formattedAmount}</span>`;
    }

    // Show cached data indicator
    if (apiStatus === 'success' && btc > 0) {
      return `<span title="Balance loaded successfully">${formattedAmount}</span>`;
    }

    // If balance is 0 and no explicit success status, indicate it might be unused
    if ((btc === 0 || !btc) && apiStatus !== 'success') {
      return `<span title="Address appears unused or balance unavailable" style="color: #6b7280;">${formattedAmount}</span>`;
    }

    return formattedAmount;
  }

  updateTotal() {
    try {
      const total = this.storageService.getTotalBalance();
      const formatted = this.formatAmount(total);
      const unit = this.storageService.getUnit();
      this.safeUpdateElement('totalValue', `${formatted} ${unit}`);
    } catch (error) {
      console.error('Error in updateTotal:', error);
      // Don't let this break the rendering
      this.safeUpdateElement('totalValue', '0 BTC');
    }
  }

  // Authentication UI
  showAddressSection() {
    const addressSection = this.safeGetElement('addressSection');
    const lockedSection = this.safeGetElement('lockedSection');
    const lockBtn = this.safeGetElement('lockBtn');

    if (addressSection) addressSection.style.display = 'block';
    if (lockedSection) lockedSection.style.display = 'none';
    if (lockBtn) {
      lockBtn.textContent = '🔒 Lock';
      lockBtn.style.background = '#c53030';
    }
  }

  hideAddressSection() {
    const addressSection = this.safeGetElement('addressSection');
    const lockedSection = this.safeGetElement('lockedSection');
    const lockBtn = this.safeGetElement('lockBtn');

    if (addressSection) addressSection.style.display = 'none';
    if (lockedSection) lockedSection.style.display = 'block';
    if (lockBtn) {
      lockBtn.textContent = '🔓 Unlock';
      lockBtn.style.background = '#059669';
    }

    this.clearPinInput();
  }

  clearPinInput() {
    const pinInput = this.safeGetElement('pinInput');
    if (pinInput) {
      pinInput.value = '';
      this.updatePinDots('pinInput', 'pinDot');
    }
  }

  updatePinDots(inputId, dotPrefix) {
    const input = this.safeGetElement(inputId);
    if (!input) return;

    const value = input.value;
    const maxDots = CONFIG.MAX_PIN_LENGTH;

    for (let i = 1; i <= maxDots; i++) {
      const dot = document.getElementById(dotPrefix + i);
      if (dot) {
        if (i <= value.length) {
          dot.classList.add('filled');
        } else {
          dot.classList.remove('filled');
        }
      }
    }

    // Update button states
    this.updatePinButtonStates(inputId, value);
  }

  updatePinButtonStates(inputId, value) {
    const isValidPin = value.length >= CONFIG.MIN_PIN_LENGTH &&
                      value.length <= CONFIG.MAX_PIN_LENGTH &&
                      CONFIG.REGEX.DIGITS_ONLY.test(value);

    if (inputId === 'pinSetupInput') {
      const button = document.getElementById('confirmPinSetupBtn');
      if (button) button.disabled = !isValidPin;
    } else if (inputId === 'pinInput') {
      const button = this.safeGetElement('unlockBtn');
      if (button) button.disabled = !isValidPin;
    }
  }

  updatePinAttemptDisplay(attemptInfo) {
    const pinInput = this.safeGetElement('pinInput');
    const unlockBtn = this.safeGetElement('unlockBtn');
    const pinWarning = this.safeGetElement('pinWarning');

    if (!pinInput || !unlockBtn) return;

    if (attemptInfo.isLockedOut) {
      pinInput.disabled = true;
      unlockBtn.disabled = true;
      pinInput.placeholder = `Wait ${attemptInfo.remainingTime}s`;
      unlockBtn.textContent = 'Unlock';

      if (pinWarning) {
        pinWarning.innerHTML = `<strong>Account locked!</strong> Too many failed attempts. Please wait ${attemptInfo.remainingTime} seconds before trying again.`;
        pinWarning.style.display = 'block';
      }
    } else {
      pinInput.disabled = false;
      unlockBtn.disabled = false;
      pinInput.placeholder = '••••••';
      unlockBtn.textContent = 'Unlock';

      if (pinWarning) {
        pinWarning.style.display = 'none';
      }
    }
  }

  // Modal management
  showModal(modalId) {
    console.log('Showing modal:', modalId);
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.style.display = 'flex';
      console.log('Modal shown successfully:', modalId);
    } else {
      console.error('Modal not found:', modalId);
    }
  }

  hideModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.style.display = 'none';

      // Clear specific modal inputs when hiding
      if (modalId === 'changePinModal') {
        this.setElementValue('currentPinInput', '');
        this.setElementValue('newPinInput', '');
        this.updatePinDots('currentPinInput', 'currentPinDot');
        this.updatePinDots('newPinInput', 'newPinDot');
        this.updateChangePinButton();
      } else if (modalId === 'resetConfirmModal') {
        this.setElementValue('resetConfirmInput', '');
        const confirmBtn = document.getElementById('confirmResetBtn');
        if (confirmBtn) confirmBtn.disabled = true;
      } else if (modalId === 'pinSetupModal') {
        this.setElementValue('pinSetupInput', '');
        this.updatePinDots('pinSetupInput', 'pinSetupDot');
      }
    }
  }

  // Settings UI
  loadSettingsUI(settings) {
    const vaultTimeoutSelect = document.getElementById('vaultTimeoutSelect');
    const currencySelect = document.getElementById('currencySelect');

    if (vaultTimeoutSelect) {
      vaultTimeoutSelect.value = settings.vaultTimeout || CONFIG.DEFAULTS.VAULT_TIMEOUT;
    }

    if (currencySelect) {
      currencySelect.value = settings.currency || CONFIG.DEFAULTS.CURRENCY;
    }
  }

  getSettingsFromUI() {
    const vaultTimeoutSelect = document.getElementById('vaultTimeoutSelect');
    const currencySelect = document.getElementById('currencySelect');

    return {
      vaultTimeout: vaultTimeoutSelect ? vaultTimeoutSelect.value : CONFIG.DEFAULTS.VAULT_TIMEOUT,
      currency: currencySelect ? currencySelect.value : CONFIG.DEFAULTS.CURRENCY
    };
  }

  // Toggle buttons
  updateToggleButtons() {
    const unit = this.storageService.getUnit();

    document.querySelectorAll('.unit-btn').forEach(btn => btn.classList.remove('active'));

    // Map units to correct button IDs
    let buttonId;
    switch (unit) {
      case 'BTC':
        buttonId = 'toggleBtcBtn';
        break;
      case 'SATS':
        buttonId = 'toggleSatsBtn';
        break;
      case 'USD':
        buttonId = 'toggleCurrencyBtn';
        break;
      default:
        buttonId = 'toggleBtcBtn';
    }

    const activeBtn = document.getElementById(buttonId);
    if (activeBtn) activeBtn.classList.add('active');
  }

  updateCurrencyToggle() {
    const currency = this.storageService.getCurrency();
    const toggleCurrencyBtn = this.safeGetElement('toggleCurrencyBtn');

    if (toggleCurrencyBtn) {
      toggleCurrencyBtn.textContent = currency.toUpperCase();
    }
  }

  // Input validation and feedback
  showAddressError(message) {
    this.safeUpdateElement('addrErr', message);
  }

  clearAddressError() {
    this.safeUpdateElement('addrErr', '');
  }

  clearAddressInputs() {
    const addrInput = this.safeGetElement('addr');
    const labelInput = this.safeGetElement('label');

    if (addrInput) addrInput.value = '';
    if (labelInput) labelInput.value = '';
  }

  getAddressInputs() {
    const addrInput = this.safeGetElement('addr');
    const labelInput = this.safeGetElement('label');

    return {
      address: addrInput ? addrInput.value.trim() : '',
      label: labelInput ? labelInput.value.trim() : ''
    };
  }

  // Tooltip management
  showTooltip(tooltipId, buttonElement) {
    const tooltip = document.getElementById(tooltipId);
    if (!tooltip || !buttonElement) return;

    tooltip.classList.add('show');

    // Position tooltip
    const rect = buttonElement.getBoundingClientRect();
    const tooltipWidth = 300;
    const tooltipHeight = 200;

    let left = rect.left - tooltipWidth - CONFIG.TOOLTIP_OFFSET;
    let top = rect.top - (tooltipHeight / 2) + (rect.height / 2);

    if (left < CONFIG.TOOLTIP_OFFSET) left = CONFIG.TOOLTIP_OFFSET;
    if (top < CONFIG.TOOLTIP_OFFSET) top = rect.bottom + CONFIG.TOOLTIP_OFFSET;
    if (top + tooltipHeight > window.innerHeight - CONFIG.TOOLTIP_OFFSET) {
      top = window.innerHeight - tooltipHeight - CONFIG.TOOLTIP_OFFSET;
    }

    tooltip.style.left = left + 'px';
    tooltip.style.top = top + 'px';
  }

  hideTooltip(tooltipId) {
    const tooltip = document.getElementById(tooltipId);
    if (tooltip) {
      tooltip.classList.remove('show');
    }
  }

  hideAllTooltips() {
    ['riskTooltip', 'feeTooltip'].forEach(id => this.hideTooltip(id));
  }

  // Utility methods
  focusElement(id) {
    const element = this.safeGetElement(id);
    if (element) {
      setTimeout(() => element.focus(), 100);
    }
  }

  setElementValue(id, value) {
    const element = this.safeGetElement(id);
    if (element) {
      element.value = value;
      return true;
    }
    return false;
  }

  getElementValue(id) {
    const element = this.safeGetElement(id);
    return element ? element.value : '';
  }

  enableElement(id) {
    const element = this.safeGetElement(id);
    if (element) element.disabled = false;
  }

  disableElement(id) {
    const element = this.safeGetElement(id);
    if (element) element.disabled = true;
  }

  // Add visual feedback for PIN change
  addPinFieldError(fieldId) {
    const field = this.safeGetElement(fieldId);
    if (field) {
      field.style.borderColor = '#dc2626';
      field.style.backgroundColor = '#2d1b1b';

      setTimeout(() => {
        field.style.borderColor = '#333';
        field.style.backgroundColor = '#0b1220';
      }, 2000);
    }
  }

  // Refresh button states
  setRefreshButtonState(buttonId, isRefreshing) {
    const button = this.safeGetElement(buttonId);
    if (button) {
      button.disabled = isRefreshing;
      if (isRefreshing) {
        button.textContent = 'Refreshing...';
      } else {
        button.textContent = 'Refresh';
      }
    }
  }

  // Update change PIN button state
  updateChangePinButton() {
    const currentPin = this.getElementValue('currentPinInput');
    const newPin = this.getElementValue('newPinInput');
    const button = document.getElementById('confirmChangePinBtn');

    if (button) {
      // Enable button when both PINs are 4-6 characters and all digits
      const currentValid = currentPin.length >= CONFIG.MIN_PIN_LENGTH &&
                          currentPin.length <= CONFIG.MAX_PIN_LENGTH &&
                          CONFIG.REGEX.DIGITS_ONLY.test(currentPin);
      const newValid = newPin.length >= CONFIG.MIN_PIN_LENGTH &&
                      newPin.length <= CONFIG.MAX_PIN_LENGTH &&
                      CONFIG.REGEX.DIGITS_ONLY.test(newPin);
      button.disabled = !(currentValid && newValid);
    }
  }
}