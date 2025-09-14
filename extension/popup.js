// Bitcoin Mini Extension - Simple & Clean
// Browser API polyfill for cross-browser compatibility
if (typeof browser === "undefined") {
  var browser = chrome;
}

class BitcoinMini {
  constructor() {
    this.unit = 'BTC';
    this.watchlist = [];
    this.vaultTimeout = 'never'; // Default for existing users, will be set to 'extension_open' when PIN is first created
    this.lastActivity = Date.now();
    this.timeoutId = null;
    this.init();
  }
  
  async init() {
    // Load data first to get current vault timeout setting
    await this.loadData();
    
    // Handle "On Extension Open" timeout BEFORE setting UI state
    if (this.vaultTimeout === 'extension_open') {
      const authData = await browser.storage.local.get(['isLocked', 'pin']);
      if (!authData.isLocked && authData.pin) {
        // Lock the vault immediately before showing UI
        await browser.storage.local.set({ isLocked: true });
      }
    }
    
    // Set initial address section state based on lock status
    await this.initAddressSection();
    
    this.bindEvents();
    await this.refreshPrice();
    await this.refreshFees();
    this.renderWatchlist();
    
    // Start timeout for other options (not needed for extension_open)
    if (this.vaultTimeout !== 'extension_open') {
      this.startVaultTimeout();
    }
  }
  
  // Storage
  async loadData() {
    const result = await browser.storage.local.get(['watchlist', 'unit', 'vaultTimeout']);
    this.watchlist = result.watchlist || [];
    this.unit = result.unit || 'BTC';
    this.vaultTimeout = result.vaultTimeout || 'never';
  }
  
  async saveData() {
    await browser.storage.local.set({
      watchlist: this.watchlist,
      unit: this.unit,
      vaultTimeout: this.vaultTimeout
    });
  }
  
  // Events
  bindEvents() {
    document.getElementById('refreshPriceBtn').onclick = () => {
      this.trackActivity();
      this.refreshPrice();
    };
    document.getElementById('refreshFeesBtn').onclick = () => {
      this.trackActivity();
      this.refreshFees();
    };
    document.getElementById('addWatchBtn').onclick = () => {
      this.trackActivity();
      this.addWatch();
    };
    document.getElementById('toggleBtcBtn').onclick = () => {
      this.trackActivity();
      this.setUnit('BTC');
    };
    document.getElementById('toggleSatsBtn').onclick = () => {
      this.trackActivity();
      this.setUnit('SATS');
    };
    document.getElementById('toggleUsdBtn').onclick = () => {
      this.trackActivity();
      this.setUnit('USD');
    };
    
    // Input elements
    const addrInput = document.getElementById('addr');
    const labelInput = document.getElementById('label');
    
    // Track activity on input interactions
    addrInput.addEventListener('input', () => this.trackActivity());
    labelInput.addEventListener('input', () => this.trackActivity());
    
    // Enter key support
    addrInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        this.trackActivity();
        this.addWatch();
      }
    });
    
    labelInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        this.trackActivity();
        this.addWatch();
      }
    });
    
    // Risk info button tooltip
    document.getElementById('riskInfoBtn').addEventListener('click', (e) => {
      e.stopPropagation();
      const tooltip = document.getElementById('riskTooltip');
      tooltip.classList.toggle('show');
      
      // Improved positioning - center tooltip relative to button
      const rect = e.target.getBoundingClientRect();
      const tooltipWidth = 300; // Max width from CSS
      const tooltipHeight = 200; // Estimated height
      
      // Position tooltip to the left of button, centered vertically
      let left = rect.left - tooltipWidth - 10;
      let top = rect.top - (tooltipHeight / 2) + (rect.height / 2);
      
      // Ensure tooltip stays within viewport
      if (left < 10) left = 10;
      if (top < 10) top = rect.bottom + 10;
      if (top + tooltipHeight > window.innerHeight - 10) {
        top = window.innerHeight - tooltipHeight - 10;
      }
      
      tooltip.style.left = left + 'px';
      tooltip.style.top = top + 'px';
    });
    
    // Handle remove button clicks
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('remove-btn-small')) {
        const index = parseInt(e.target.getAttribute('data-index'));
        this.removeWatch(index);
      }
    });
    
    // Fee info button tooltip
    document.getElementById('feeInfoBtn').addEventListener('click', (e) => {
      e.stopPropagation();
      const tooltip = document.getElementById('feeTooltip');
      tooltip.classList.toggle('show');
      
      // Position tooltip dynamically
      const buttonRect = e.target.getBoundingClientRect();
      const tooltipRect = tooltip.getBoundingClientRect();
      
      let left = buttonRect.left - tooltipRect.width + buttonRect.width;
      let top = buttonRect.top + (buttonRect.height / 2) - (tooltipRect.height / 2);
      
      // Ensure tooltip stays within viewport
      if (left < 0) left = 5;
      if (top < 0) top = 5;
      if (left + tooltipRect.width > window.innerWidth) {
        left = window.innerWidth - tooltipRect.width - 5;
      }
      if (top + tooltipRect.height > window.innerHeight) {
        top = window.innerHeight - tooltipRect.height - 5;
      }
      
      tooltip.style.left = left + 'px';
      tooltip.style.top = top + 'px';
    });
    
    // Close tooltip when clicking elsewhere
    document.addEventListener('click', (e) => {
      if (!e.target.closest('#riskInfoBtn') && !e.target.closest('#riskTooltip') && 
          !e.target.closest('#feeInfoBtn') && !e.target.closest('#feeTooltip')) {
        document.getElementById('riskTooltip').classList.remove('show');
        document.getElementById('feeTooltip').classList.remove('show');
      }
    });

    // PIN entry (only when locked)
    document.getElementById('pinInput').addEventListener('input', (e) => {
      // Allow any input during typing, but filter to numbers only
      let value = e.target.value;
      // Remove non-numeric characters
      value = value.replace(/\D/g, '');
      // Limit to 6 characters
      value = value.substring(0, 6);
      e.target.value = value;
      
      this.updatePinDots('pinInput', 'pinDot');
    });

    document.getElementById('unlockBtn').addEventListener('click', async () => {
      const pin = document.getElementById('pinInput').value;
      const success = await this.unlockPin(pin);
      if (!success) {
        this.showNotification('Invalid PIN. Please try again.', 'error');
        document.getElementById('pinInput').value = '';
        this.updatePinDots('pinInput', 'pinDot');
      }
    });

    // Reset button
    document.getElementById('resetBtn').addEventListener('click', () => {
      this.showResetConfirmModal();
    });

    // Enter key support for PIN input
    document.getElementById('pinInput').addEventListener('keypress', async (e) => {
      if (e.key === 'Enter' && document.getElementById('unlockBtn').disabled === false) {
        const pin = document.getElementById('pinInput').value;
        const success = await this.unlockPin(pin);
        if (!success) {
          this.showNotification('Invalid PIN. Please try again.', 'error');
          document.getElementById('pinInput').value = '';
          this.updatePinDots('pinInput', 'pinDot');
        }
      }
    });

    // Lock/Unlock button
    document.getElementById('lockBtn').addEventListener('click', async () => {
      const authData = await browser.storage.local.get(['isLocked', 'pin']);
      if (authData.isLocked) {
        // Show PIN entry to unlock
        this.showPinEntry();
        // Focus the PIN input when unlock button is clicked
        setTimeout(() => {
          document.getElementById('pinInput').focus();
        }, 100);
      } else {
        // Check if PIN is set up
        if (!authData.pin) {
          // First time locking - show PIN setup modal
          this.showPinSetupModal();
        } else {
          // PIN already set up, just lock
          await browser.storage.local.set({ isLocked: true });
          this.hideAddressSection();
        }
      }
    });

    // PIN Setup Modal event listeners
    document.getElementById('pinSetupInput').addEventListener('input', (e) => {
      // Allow any input during typing, but filter to numbers only
      let value = e.target.value;
      // Remove non-numeric characters
      value = value.replace(/\D/g, '');
      // Limit to 6 characters
      value = value.substring(0, 6);
      e.target.value = value;
      
      this.updatePinDots('pinSetupInput', 'pinSetupDot');
    });
    
    document.getElementById('confirmPinSetupBtn').addEventListener('click', async () => {
      const pin = document.getElementById('pinSetupInput').value;
      if (pin && pin.length >= 4 && pin.length <= 6 && /^\d+$/.test(pin)) {
        await this.setupPin(pin);
        await browser.storage.local.set({ isLocked: true });
        this.hideAddressSection();
        this.hidePinSetupModal();
      }
    });

    document.getElementById('cancelPinSetupBtn').addEventListener('click', () => {
      this.hidePinSetupModal();
    });

    // Enter key support for PIN setup
    document.getElementById('pinSetupInput').addEventListener('keypress', async (e) => {
      if (e.key === 'Enter' && document.getElementById('confirmPinSetupBtn').disabled === false) {
        const pin = document.getElementById('pinSetupInput').value;
        if (pin && pin.length >= 4 && pin.length <= 6 && /^\d+$/.test(pin)) {
          await this.setupPin(pin);
          await browser.storage.local.set({ isLocked: true });
          this.hideAddressSection();
          this.hidePinSetupModal();
        }
      }
    });

    // Reset confirmation modal event listeners
    document.getElementById('resetConfirmInput').addEventListener('input', (e) => {
      const value = e.target.value.toUpperCase();
      const button = document.getElementById('confirmResetBtn');
      button.disabled = value !== 'RESET';
    });

    document.getElementById('confirmResetBtn').addEventListener('click', async () => {
      await this.resetAllData();
      this.hideResetConfirmModal();
    });

    document.getElementById('cancelResetBtn').addEventListener('click', () => {
      this.hideResetConfirmModal();
    });

    // Enter key support for reset confirmation
    document.getElementById('resetConfirmInput').addEventListener('keypress', async (e) => {
      if (e.key === 'Enter' && document.getElementById('confirmResetBtn').disabled === false) {
        await this.resetAllData();
        this.hideResetConfirmModal();
      }
    });

    // Settings modal event listeners
    document.getElementById('settingsBtn').addEventListener('click', () => {
      this.showSettingsModal();
    });

    document.getElementById('cancelSettingsBtn').addEventListener('click', () => {
      this.hideSettingsModal();
    });

    document.getElementById('saveSettingsBtn').addEventListener('click', () => {
      this.saveSettings();
    });

    // Change PIN modal event listeners
    document.getElementById('changePinBtn').addEventListener('click', () => {
      this.showChangePinModal();
    });

    document.getElementById('cancelChangePinBtn').addEventListener('click', () => {
      this.hideChangePinModal();
    });

    document.getElementById('confirmChangePinBtn').addEventListener('click', async () => {
      await this.changePin();
    });

    // Current PIN input
    document.getElementById('currentPinInput').addEventListener('input', (e) => {
      // Allow any input during typing, but filter to numbers only
      let value = e.target.value;
      value = value.replace(/\D/g, '');
      value = value.substring(0, 6);
      e.target.value = value;
      
      this.updatePinDots('currentPinInput', 'currentPinDot');
      this.updateChangePinButton();
    });

    // Current PIN keypress support
    document.getElementById('currentPinInput').addEventListener('keypress', async (e) => {
      if (e.key === 'Enter' && document.getElementById('confirmChangePinBtn').disabled === false) {
        await this.changePin();
      }
    });

    // New PIN input
    document.getElementById('newPinInput').addEventListener('input', (e) => {
      // Allow any input during typing, but filter to numbers only
      let value = e.target.value;
      value = value.replace(/\D/g, '');
      value = value.substring(0, 6);
      e.target.value = value;
      
      this.updatePinDots('newPinInput', 'newPinDot');
      this.updateChangePinButton();
    });

    // New PIN keypress support
    document.getElementById('newPinInput').addEventListener('keypress', async (e) => {
      if (e.key === 'Enter' && document.getElementById('confirmChangePinBtn').disabled === false) {
        await this.changePin();
      }
    });
  }
  
  // API Calls
  async refreshPrice() {
    try {
      // Fetch current price and historical data in parallel
      const [currentResponse, historicalResponse] = await Promise.all([
        fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd'),
        fetch('https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=usd&days=365&interval=daily')
      ]);
      
      const currentData = await currentResponse.json();
      const historicalData = await historicalResponse.json();
      
      if (currentData?.bitcoin?.usd && historicalData?.prices) {
        this.currentBtcPrice = currentData.bitcoin.usd;
        const currentPrice = currentData.bitcoin.usd;
        
        // Get price from 365 days ago (first item in the array)
        const prices = historicalData.prices;
        const priceOneYearAgo = prices[0][1]; // [timestamp, price] - first item is oldest
        
        // Calculate YoY change: (current - old) / old * 100
        const yoyChange = ((currentPrice - priceOneYearAgo) / priceOneYearAgo) * 100;
        
        // Display price
        document.getElementById('price').textContent = `$${currentPrice.toLocaleString()}`;
        
        // Display YoY change with color coding
        const changeEl = document.getElementById('priceChange');
        if (yoyChange > 0.01) { // Only green if more than 0.01%
          changeEl.textContent = `+${yoyChange.toFixed(2)}% YoY`;
          changeEl.className = 'price-up';
        } else if (yoyChange < -0.01) { // Only red if less than -0.01%
          changeEl.textContent = `${yoyChange.toFixed(2)}% YoY`;
          changeEl.className = 'price-down';
        } else { // White for essentially no change
          changeEl.textContent = `${yoyChange.toFixed(2)}% YoY`;
          changeEl.className = 'price-neutral';
        }
        
        document.getElementById('priceTime').textContent = new Date().toLocaleTimeString();
      }
    } catch (error) {
      console.error('Price fetch error:', error);
      document.getElementById('price').textContent = 'Error';
      document.getElementById('priceChange').textContent = '';
    }
  }
  
  async refreshFees() {
    try {
      const response = await fetch('https://mempool.space/api/v1/fees/recommended');
      const data = await response.json();
      if (data) {
        document.getElementById('fee_fast').textContent = data.fastestFee ? parseFloat(data.fastestFee).toFixed(1) : '—';
        document.getElementById('fee_hour').textContent = data.hourFee ? parseFloat(data.hourFee).toFixed(1) : '—';
        document.getElementById('fee_econ').textContent = data.economyFee ? parseFloat(data.economyFee).toFixed(1) : '—';
        document.getElementById('feeTime').textContent = new Date().toLocaleTimeString();
        
        // Categorize fees
        this.categorizeFee('fee_fast', data.fastestFee);
        this.categorizeFee('fee_hour', data.hourFee);
        this.categorizeFee('fee_econ', data.economyFee);
      }
    } catch (error) {
      console.error('Fees error:', error);
    }
  }
  
  categorizeFee(elementId, fee) {
    const categoryElement = document.getElementById(elementId + '_category');
    if (!fee || fee === '—') {
      categoryElement.textContent = '—';
      categoryElement.className = 'fee-category';
      return;
    }
    
    const feeValue = parseFloat(fee);
    if (feeValue < 5) {
      categoryElement.textContent = 'Very Low';
      categoryElement.className = 'fee-category fee-very-low';
    } else if (feeValue < 10) {
      categoryElement.textContent = 'Low';
      categoryElement.className = 'fee-category fee-low';
    } else if (feeValue <= 50) {
      categoryElement.textContent = 'Medium';
      categoryElement.className = 'fee-category fee-medium';
    } else if (feeValue <= 100) {
      categoryElement.textContent = 'High';
      categoryElement.className = 'fee-category fee-high';
    } else {
      categoryElement.textContent = 'Very High';
      categoryElement.className = 'fee-category fee-very-high';
    }
  }
  
  async addWatch() {
    const addr = document.getElementById('addr').value.trim();
    const label = document.getElementById('label').value.trim();
    const errEl = document.getElementById('addrErr');
    
    if (!addr) {
      errEl.textContent = 'Address required';
      return;
    }
    
    if (!this.validateAddress(addr)) {
      errEl.textContent = 'Invalid Bitcoin address';
      return;
    }
    
    if (this.watchlist.some(item => item.address === addr)) {
      errEl.textContent = 'Address already in watchlist';
      return;
    }
    
    errEl.textContent = '';
    
    // Add to watchlist
    const newItem = { address: addr, label: label || '', balance_btc: 0, quantum_risk: 'checking...' };
    this.watchlist.push(newItem);
    
    // Fetch balance and check quantum exposure in parallel
    try {
      const [summary, quantumResult] = await Promise.all([
        this.fetchAddressSummary(addr),
        this.checkQuantumExposure(addr)
      ]);
      
      newItem.balance_btc = summary.balance_btc || 0;
      newItem.quantum_risk = quantumResult.overall_risk;
    } catch (error) {
      console.error('Address fetch error:', error);
      newItem.quantum_risk = 'error';
    }
    
    // Clear inputs and save
    document.getElementById('addr').value = '';
    document.getElementById('label').value = '';
    await this.saveData();
    this.renderWatchlist();
  }
  
  async fetchAddressSummary(address) {
    const response = await fetch(`https://blockstream.info/api/address/${address}`);
    const data = await response.json();
    
    const chainStats = data.chain_stats || {};
    const mempoolStats = data.mempool_stats || {};
    const funded = (chainStats.funded_txo_sum || 0) + (mempoolStats.funded_txo_sum || 0);
    const spent = (chainStats.spent_txo_sum || 0) + (mempoolStats.spent_txo_sum || 0);
    
    return {
      balance_btc: Math.max((funded - spent) / 1e8, 0)
    };
  }
  
  
  async checkQuantumExposure(address) {
    try {
      const [addrInfo, utxos] = await Promise.all([
        fetch(`https://blockstream.info/api/address/${address}`).then(r => {
          if (!r.ok) throw new Error(`Address API error: ${r.status}`);
          return r.json();
        }),
        fetch(`https://blockstream.info/api/address/${address}/utxo`).then(r => {
          if (!r.ok) throw new Error(`UTXO API error: ${r.status}`);
          return r.json();
        })
      ]);
      
      let exposedValue = 0;
      let hasExposed = false;
      
      // Handle case where utxos might be null or empty
      if (!utxos || !Array.isArray(utxos)) {
        console.warn('No UTXOs found for address:', address);
        return { overall_risk: 'unknown', exposed_value_btc: 0 };
      }
      
      for (const utxo of utxos.slice(0, 5)) { // Limit to 5 for speed
        try {
          const tx = await fetch(`https://blockstream.info/api/tx/${utxo.txid}`).then(r => {
            if (!r.ok) throw new Error(`Transaction API error: ${r.status}`);
            return r.json();
          });
          const scriptType = tx.vout?.[utxo.vout]?.scriptpubkey_type;
          
          if (['p2pk', 'v1_p2tr'].includes(scriptType?.toLowerCase())) {
            hasExposed = true;
            exposedValue += (utxo.value || 0) / 1e8;
          }
        } catch (e) {
          console.warn('Error checking UTXO:', utxo.txid, e.message);
          // Skip on error
        }
      }
      
      const spentCount = addrInfo?.chain_stats?.spent_txo_count || 0;
      const addressType = this.inferAddressType(address);
      const reuseRisk = spentCount > 0 && ['p2pkh', 'p2wpkh_or_wsh'].includes(addressType);
      
      let overallRisk = 'low';
      if (hasExposed) {
        overallRisk = 'high';
      } else if (reuseRisk) {
        overallRisk = 'elevated';
      }
      
      return { overall_risk: overallRisk, exposed_value_btc: exposedValue };
      
    } catch (error) {
      console.error('Quantum exposure check failed for address:', address, error);
      return { overall_risk: 'error', exposed_value_btc: 0 };
    }
  }
  
  inferAddressType(address) {
    const addr = address.toLowerCase();
    if (addr.startsWith('bc1p')) return 'p2tr';
    if (addr.startsWith('bc1q')) return 'p2wpkh_or_wsh';
    if (addr.startsWith('1')) return 'p2pkh';
    if (addr.startsWith('3')) return 'p2sh';
    return 'unknown';
  }
  
  validateAddress(addr) {
    return /^(bc1|[13])[a-zA-HJ-NP-Z0-9]{25,87}$/.test(addr);
  }
  
  // UI
  renderWatchlist() {
    const tbody = document.getElementById('watchRows');
    tbody.innerHTML = '';
    
    this.watchlist.forEach((item, index) => {
      const row = document.createElement('tr');
      const balance = this.formatAmount(item.balance_btc);
      const risk = this.formatQuantumRisk(item.quantum_risk);
      
      row.innerHTML = `
        <td>${item.label || ''}</td>
        <td class="muted">${item.address.slice(0, 8)}...</td>
        <td>${balance}</td>
        <td class="${risk.class}">${risk.text}</td>
        <td style="text-align: right;"><div style="display: flex; justify-content: flex-end;"><button class="remove-btn-small" data-index="${index}" title="Remove address"></button></div></td>
      `;
      
      tbody.appendChild(row);
    });
    
    this.updateTotal();
  }
  
  formatQuantumRisk(risk) {
    if (!risk || risk === 'checking...') {
      return { text: 'Checking...', class: 'muted' };
    }
    
    if (risk === 'error') {
      return { text: '❌ Error', class: 'warn' };
    }
    
    if (risk === 'unknown') {
      return { text: '❓ Unknown', class: 'muted' };
    }
    
    switch (risk.toLowerCase()) {
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
  
  async removeWatch(index) {
    this.watchlist.splice(index, 1);
    await this.saveData();
    this.renderWatchlist();
  }
  
  formatAmount(btc) {
    if (this.unit === 'BTC') {
      return (btc || 0).toFixed(8);
    } else if (this.unit === 'SATS') {
      return Math.floor((btc || 0) * 1e8).toLocaleString();
    } else if (this.unit === 'USD') {
      const usdValue = (btc || 0) * (this.currentBtcPrice || 0);
      return '$' + usdValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    return (btc || 0).toFixed(8);
  }
  
  updateTotal() {
    const total = this.watchlist.reduce((sum, item) => sum + (item.balance_btc || 0), 0);
    const formatted = this.formatAmount(total);
    document.getElementById('totalValue').textContent = `${formatted} ${this.unit}`;
  }
  
  toggleUnits() {
    this.unit = this.unit === 'BTC' ? 'SATS' : 'BTC';
    this.saveData();
    this.renderWatchlist();
  }

  setUnit(newUnit) {
    this.unit = newUnit;
    this.saveData();
    this.renderWatchlist();
    this.updateToggleButtons();
  }

  updateToggleButtons() {
    document.querySelectorAll('.unit-btn').forEach(btn => btn.classList.remove('active'));
    const activeBtn = document.getElementById(`toggle${this.unit}Btn`);
    if (activeBtn) activeBtn.classList.add('active');
  }

  // Address section initialization
  async initAddressSection() {
    const authData = await browser.storage.local.get(['isLocked', 'pin']);
    
    // If vault is locked, always show lock screen
    if (authData.isLocked) {
      this.hideAddressSection();
    } 
    // If vault is unlocked but PIN is set up, show address section
    else if (authData.pin) {
      this.showAddressSection();
    }
    // If no PIN is set up, show address section (no lock functionality yet)
    else {
      this.showAddressSection();
    }
  }

  showAddressSection() {
    document.getElementById('addressSection').style.display = 'block';
    document.getElementById('lockedSection').style.display = 'none';
    document.getElementById('lockBtn').textContent = '🔒 Lock';
    document.getElementById('lockBtn').style.background = '#c53030';
  }

  hideAddressSection() {
    document.getElementById('addressSection').style.display = 'none';
    document.getElementById('lockedSection').style.display = 'block';
    document.getElementById('lockBtn').textContent = '🔓 Unlock';
    document.getElementById('lockBtn').style.background = '#059669';
    
    // Clear PIN input when locking
    document.getElementById('pinInput').value = '';
    this.updatePinDots('pinInput', 'pinDot');
  }

  showPinEntry() {
    // PIN entry is already visible in the locked section
    // Update PIN dots for unlock screen
    this.updatePinDotsForUnlock();
  }

  async updatePinDotsForUnlock() {
    // Show all 6 dots for unlock screen since we can't determine exact PIN length from hash
    const maxDots = 6;
    for (let i = 1; i <= maxDots; i++) {
      const dot = document.getElementById('pinDot' + i);
      if (dot) {
        dot.style.display = 'block';
      }
    }
  }

  showPinSetupModal() {
    document.getElementById('pinSetupModal').style.display = 'flex';
    document.getElementById('pinSetupInput').focus();
  }

  hidePinSetupModal() {
    document.getElementById('pinSetupModal').style.display = 'none';
    document.getElementById('pinSetupInput').value = '';
    this.updatePinDots('pinSetupInput', 'pinSetupDot');
  }

  showResetConfirmModal() {
    document.getElementById('resetConfirmModal').style.display = 'flex';
    document.getElementById('resetConfirmInput').focus();
  }

  hideResetConfirmModal() {
    document.getElementById('resetConfirmModal').style.display = 'none';
    document.getElementById('resetConfirmInput').value = '';
    document.getElementById('confirmResetBtn').disabled = true;
  }

  showSettingsModal() {
    document.getElementById('settingsModal').style.display = 'flex';
    this.loadSettingsUI();
  }

  hideSettingsModal() {
    document.getElementById('settingsModal').style.display = 'none';
  }

  loadSettingsUI() {
    // Set the current vault timeout setting
    const dropdown = document.getElementById('vaultTimeoutSelect');
    if (dropdown) {
      dropdown.value = this.vaultTimeout;
    }
  }

  async saveSettings() {
    const dropdown = document.getElementById('vaultTimeoutSelect');
    if (dropdown) {
      this.vaultTimeout = dropdown.value;
      await this.saveData();
      this.hideSettingsModal();
      this.startVaultTimeout();
    }
  }

  showChangePinModal() {
    document.getElementById('changePinModal').style.display = 'flex';
    document.getElementById('currentPinInput').focus();
  }

  hideChangePinModal() {
    document.getElementById('changePinModal').style.display = 'none';
    document.getElementById('currentPinInput').value = '';
    document.getElementById('newPinInput').value = '';
    this.updatePinDots('currentPinInput', 'currentPinDot');
    this.updatePinDots('newPinInput', 'newPinDot');
    document.getElementById('confirmChangePinBtn').disabled = true;
  }

  updateChangePinButton() {
    const currentPin = document.getElementById('currentPinInput').value;
    const newPin = document.getElementById('newPinInput').value;
    const button = document.getElementById('confirmChangePinBtn');
    
    if (button) {
      // Enable button when both PINs are 4-6 characters and all digits
      const currentValid = currentPin.length >= 4 && currentPin.length <= 6 && /^\d+$/.test(currentPin);
      const newValid = newPin.length >= 4 && newPin.length <= 6 && /^\d+$/.test(newPin);
      button.disabled = !(currentValid && newValid);
    }
  }

  async changePin() {
    const currentPin = document.getElementById('currentPinInput').value;
    const newPin = document.getElementById('newPinInput').value;
    
    // Verify current PIN
    const authData = await browser.storage.local.get(['pin']);
    const hashedCurrentPin = await this.hashPin(currentPin);
    
    if (hashedCurrentPin !== authData.pin) {
      this.showNotification('❌ Current PIN is incorrect. Please try again.', 'error');
      
      // Add visual feedback to current PIN field
      const currentPinInput = document.getElementById('currentPinInput');
      currentPinInput.style.borderColor = '#dc2626';
      currentPinInput.style.backgroundColor = '#2d1b1b';
      
      // Clear and focus current PIN field
      currentPinInput.value = '';
      this.updatePinDots('currentPinInput', 'currentPinDot');
      this.updateChangePinButton();
      
      // Reset visual feedback after 2 seconds
      setTimeout(() => {
        currentPinInput.style.borderColor = '#333';
        currentPinInput.style.backgroundColor = '#0b1220';
      }, 2000);
      
      // Focus the current PIN field
      currentPinInput.focus();
      return;
    }
    
    // Check if new PIN is different from current PIN
    if (currentPin === newPin) {
      this.showNotification('❌ New PIN must be different from current PIN.', 'error');
      
      // Add visual feedback to new PIN field
      const newPinInput = document.getElementById('newPinInput');
      newPinInput.style.borderColor = '#dc2626';
      newPinInput.style.backgroundColor = '#2d1b1b';
      
      // Clear new PIN field
      newPinInput.value = '';
      this.updatePinDots('newPinInput', 'newPinDot');
      this.updateChangePinButton();
      
      // Reset visual feedback after 2 seconds
      setTimeout(() => {
        newPinInput.style.borderColor = '#333';
        newPinInput.style.backgroundColor = '#0b1220';
      }, 2000);
      
      // Focus the new PIN field
      newPinInput.focus();
      return;
    }
    
    // Update PIN
    const hashedNewPin = await this.hashPin(newPin);
    await browser.storage.local.set({ pin: hashedNewPin });
    
    this.showNotification('✅ PIN changed successfully!', 'success');
    this.hideChangePinModal();
  }

  // In-app notification system
  showNotification(message, type = 'success') {
    console.log('Showing notification:', message, type); // Debug log
    const notification = document.getElementById('notification');
    const icon = document.getElementById('notificationIcon');
    const text = document.getElementById('notificationText');
    
    if (!notification || !icon || !text) {
      console.error('Notification elements not found');
      return;
    }
    
    // Set message and icon
    text.textContent = message;
    icon.textContent = type === 'success' ? '✓' : '✗';
    
    // Set styling based on type
    notification.className = `notification ${type}`;
    
    // Show notification
    notification.style.display = 'block';
    setTimeout(() => {
      notification.classList.add('show');
    }, 10);
    
    // Auto-hide after 3 seconds
    setTimeout(() => {
      this.hideNotification();
    }, 3000);
  }

  hideNotification() {
    const notification = document.getElementById('notification');
    notification.classList.remove('show');
    setTimeout(() => {
      notification.style.display = 'none';
    }, 300);
  }

  async setupPin(pin) {
    const hashedPin = await this.hashPin(pin);
    await browser.storage.local.set({
      pin: hashedPin,
      isSetup: true,
      isLocked: false,
      vaultTimeout: 'extension_open' // Set secure default for new users
    });
    this.vaultTimeout = 'extension_open'; // Update current instance
    this.showAddressSection();
    
    // Refresh price data to ensure USD values work correctly
    await this.refreshPrice();
    this.renderWatchlist();
  }

  async unlockPin(pin) {
    const authData = await browser.storage.local.get(['pin']);
    const hashedPin = await this.hashPin(pin);
    
    if (hashedPin === authData.pin) {
      await browser.storage.local.set({ isLocked: false });
      this.showAddressSection();
      
      // Refresh price data to ensure USD values work correctly
      await this.refreshPrice();
      this.renderWatchlist();
      
      // Clear PIN input after successful unlock
      document.getElementById('pinInput').value = '';
      this.updatePinDots('pinInput', 'pinDot');
      
      return true;
    }
    return false;
  }

  async resetAllData() {
    await browser.storage.local.clear();
    this.watchlist = [];
    this.showAddressSection();
    
    // Refresh price data and render empty watchlist
    await this.refreshPrice();
    this.renderWatchlist();
  }

  async hashPin(pin) {
    const encoder = new TextEncoder();
    const data = encoder.encode(pin);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  updatePinDots(inputId, dotPrefix) {
    const input = document.getElementById(inputId);
    const value = input.value;
    
    // Always show up to 6 dots for both setup and unlock
    const maxDots = 6;
    
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
    
    // Enable/disable button based on PIN length
    if (inputId === 'pinSetupInput') {
      const button = document.getElementById('confirmPinSetupBtn');
      if (button) {
        // Enable button when PIN is 4-6 characters and all digits
        button.disabled = !(value.length >= 4 && value.length <= 6 && /^\d+$/.test(value));
      }
    } else {
      const button = document.getElementById('unlockBtn');
      if (button) {
        // For unlock, we need to check against the stored PIN length
        // Since we can't get the exact length from hash, we'll enable for 4-6 digits
        button.disabled = !(value.length >= 4 && value.length <= 6 && /^\d+$/.test(value));
      }
    }
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
      // Check if this is a fresh browser session
      this.checkBrowserRestart();
      return;
    }

    if (this.vaultTimeout === 'system_lock') {
      // Listen for system lock events (limited in browser extensions)
      this.setupSystemLockListener();
      return;
    }

    // Handle time-based timeouts
    const timeoutMinutes = parseInt(this.vaultTimeout);
    if (timeoutMinutes > 0) {
      const timeoutMs = timeoutMinutes * 60 * 1000; // Convert to milliseconds
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
      this.hideAddressSection();
    }
  }

  // Track user activity to reset timeout
  trackActivity() {
    this.lastActivity = Date.now();
    this.startVaultTimeout(); // Restart timeout on activity
  }

  // Check if browser was restarted
  async checkBrowserRestart() {
    const sessionData = await browser.storage.local.get(['lastSessionId']);
    const currentSessionId = Date.now().toString();
    
    if (!sessionData.lastSessionId) {
      // First time setup
      await browser.storage.local.set({ lastSessionId: currentSessionId });
      return;
    }
    
    // Check if session ID is significantly different (browser restart)
    const timeDiff = parseInt(currentSessionId) - parseInt(sessionData.lastSessionId);
    if (timeDiff > 300000) { // 5 minutes - likely a browser restart
      await this.autoLockVault();
    }
    
    // Update session ID
    await browser.storage.local.set({ lastSessionId: currentSessionId });
  }

  // Setup system lock listener (limited functionality in browser extensions)
  setupSystemLockListener() {
    // Browser extensions have limited access to system events
    // We'll use visibility change as a proxy for system lock
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        // Page became hidden - could be system lock, tab switch, or minimize
        setTimeout(() => {
          if (document.hidden) {
            // Still hidden after delay - likely system lock
            this.autoLockVault();
          }
        }, 1000);
      }
    });

    // Also listen for window blur (when user switches away)
    window.addEventListener('blur', () => {
      setTimeout(() => {
        if (document.hidden) {
          this.autoLockVault();
        }
      }, 1000);
    });
  }
}

// Start the app
let app;
window.addEventListener('DOMContentLoaded', () => {
  app = new BitcoinMini();
});