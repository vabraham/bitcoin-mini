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
    document.getElementById('checkExposureBtn').onclick = () => this.checkExposure();
    document.getElementById('toggleUnitsBtn').onclick = () => this.toggleUnits();
    
    // Input elements
    const addrInput = document.getElementById('addr');
    const labelInput = document.getElementById('label');
    const qeInput = document.getElementById('qe_addr');
    
    
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
    
    qeInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        this.checkExposure();
      }
    });
  }
  
  // API Calls
  async refreshPrice() {
    try {
      const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd');
      const data = await response.json();
      if (data?.bitcoin?.usd) {
        document.getElementById('price').textContent = `$${data.bitcoin.usd.toLocaleString()}`;
        document.getElementById('priceTime').textContent = new Date().toLocaleTimeString();
      }
    } catch (error) {
      document.getElementById('price').textContent = 'Error';
    }
  }
  
  async refreshFees() {
    try {
      const response = await fetch('https://mempool.space/api/v1/fees/recommended');
      const data = await response.json();
      if (data) {
        document.getElementById('fee_fast').textContent = data.fastestFee || '—';
        document.getElementById('fee_hour').textContent = data.hourFee || '—';
        document.getElementById('fee_econ').textContent = data.economyFee || '—';
        document.getElementById('feeTime').textContent = new Date().toLocaleTimeString();
      }
    } catch (error) {
      console.error('Fees error:', error);
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
    const newItem = { address: addr, label: label || '', balance_btc: 0 };
    this.watchlist.push(newItem);
    
    // Fetch balance
    try {
      const summary = await this.fetchAddressSummary(addr);
      newItem.balance_btc = summary.balance_btc || 0;
    } catch (error) {
      console.error('Address fetch error:', error);
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
  
  async checkExposure() {
    const addr = document.getElementById('qe_addr').value.trim();
    const errEl = document.getElementById('qe_err');
    const riskEl = document.getElementById('qe_risk');
    
    if (!addr) {
      errEl.textContent = 'Address required';
      return;
    }
    
    if (!this.validateAddress(addr)) {
      errEl.textContent = 'Invalid Bitcoin address';
      return;
    }
    
    errEl.textContent = '';
    riskEl.textContent = 'Checking...';
    
    try {
      const result = await this.checkQuantumExposure(addr);
      riskEl.textContent = result.overall_risk.toUpperCase();
      riskEl.className = result.overall_risk === 'high' ? 'warn' : 'ok';
      document.getElementById('qe_addr').value = '';
    } catch (error) {
      errEl.textContent = 'Check failed';
      riskEl.textContent = '—';
    }
  }
  
  async checkQuantumExposure(address) {
    const [addrInfo, utxos] = await Promise.all([
      fetch(`https://blockstream.info/api/address/${address}`).then(r => r.json()),
      fetch(`https://blockstream.info/api/address/${address}/utxo`).then(r => r.json())
    ]);
    
    let exposedValue = 0;
    let hasExposed = false;
    
    for (const utxo of utxos.slice(0, 5)) { // Limit to 5 for speed
      try {
        const tx = await fetch(`https://blockstream.info/api/tx/${utxo.txid}`).then(r => r.json());
        const scriptType = tx.vout?.[utxo.vout]?.scriptpubkey_type;
        
        if (['p2pk', 'v1_p2tr'].includes(scriptType?.toLowerCase())) {
          hasExposed = true;
          exposedValue += (utxo.value || 0) / 1e8;
        }
      } catch (e) {
        // Skip on error
      }
    }
    
    const spentCount = addrInfo.chain_stats?.spent_txo_count || 0;
    const addressType = this.inferAddressType(address);
    const reuseRisk = spentCount > 0 && ['p2pkh', 'p2wpkh_or_wsh'].includes(addressType);
    
    let overallRisk = 'low';
    if (hasExposed) {
      overallRisk = 'high';
    } else if (reuseRisk) {
      overallRisk = 'elevated';
    }
    
    return { overall_risk: overallRisk, exposed_value_btc: exposedValue };
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
      
      row.innerHTML = `
        <td>${item.label || ''}</td>
        <td class="muted">${item.address.slice(0, 8)}...</td>
        <td>${balance}</td>
        <td><button onclick="app.removeWatch(${index})">Remove</button></td>
      `;
      
      tbody.appendChild(row);
    });
    
    this.updateTotal();
  }
  
  async removeWatch(index) {
    this.watchlist.splice(index, 1);
    await this.saveData();
    this.renderWatchlist();
  }
  
  formatAmount(btc) {
    if (this.unit === 'BTC') {
      return (btc || 0).toFixed(8);
    } else {
      return Math.floor((btc || 0) * 1e8).toLocaleString();
    }
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
}

// Start the app
let app;
window.addEventListener('DOMContentLoaded', () => {
  app = new BitcoinMini();
});