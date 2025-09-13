// Bitcoin Mini Extension - Simple & Clean
class BitcoinMini {
  constructor() {
    this.unit = 'BTC';
    this.watchlist = [];
    this.init();
  }
  
  async init() {
    await this.loadData();
    this.bindEvents();
    await this.refreshPrice();
    await this.refreshFees();
    this.renderWatchlist();
    
  }
  
  // Storage
  async loadData() {
    const result = await chrome.storage.local.get(['watchlist', 'unit']);
    this.watchlist = result.watchlist || [];
    this.unit = result.unit || 'BTC';
  }
  
  async saveData() {
    await chrome.storage.local.set({
      watchlist: this.watchlist,
      unit: this.unit
    });
  }
  
  // Events
  bindEvents() {
    document.getElementById('refreshPriceBtn').onclick = () => this.refreshPrice();
    document.getElementById('refreshFeesBtn').onclick = () => this.refreshFees();
    document.getElementById('addWatchBtn').onclick = () => this.addWatch();
    document.getElementById('toggleBtcBtn').onclick = () => this.setUnit('BTC');
    document.getElementById('toggleSatsBtn').onclick = () => this.setUnit('SATS');
    document.getElementById('toggleUsdBtn').onclick = () => this.setUnit('USD');
    
    // Input elements
    const addrInput = document.getElementById('addr');
    const labelInput = document.getElementById('label');
    
    
    // Enter key support
    addrInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        this.addWatch();
      }
    });
    
    labelInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
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
}

// Start the app
let app;
window.addEventListener('DOMContentLoaded', () => {
  app = new BitcoinMini();
});