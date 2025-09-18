import { CONFIG } from '../config.js';

// Browser API polyfill for cross-browser compatibility
if (typeof browser === "undefined") {
  var browser = chrome;
}

export class StorageService {
  constructor() {
    this.watchlist = [];
    this.unit = CONFIG.DEFAULTS.UNIT;
    this.currency = CONFIG.DEFAULTS.CURRENCY;
    this.vaultTimeout = CONFIG.DEFAULTS.VAULT_TIMEOUT;
    this.isDataLoaded = false;
  }

  async loadData() {
    try {
      const result = await browser.storage.local.get([
        'watchlist',
        'vaultTimeout',
        'currency'
      ]);

      this.watchlist = Array.isArray(result.watchlist) ? result.watchlist : [];
      this.unit = CONFIG.DEFAULTS.UNIT; // Always default to BTC
      this.vaultTimeout = result.vaultTimeout || CONFIG.DEFAULTS.VAULT_TIMEOUT;
      this.currency = result.currency || CONFIG.DEFAULTS.CURRENCY;

      // Data loaded successfully

      this.isDataLoaded = true;

      return {
        watchlist: this.watchlist,
        unit: this.unit,
        currency: this.currency,
        vaultTimeout: this.vaultTimeout
      };
    } catch (error) {
      console.error('Error loading data:', error);
      this.isDataLoaded = false;
      return this.getDefaults();
    }
  }

  async saveData() {
    try {
      await browser.storage.local.set({
        watchlist: this.watchlist,
        vaultTimeout: this.vaultTimeout,
        currency: this.currency
      });

      console.log('Saved data:', {
        watchlistLength: this.watchlist.length,
        unit: this.unit,
        currency: this.currency,
        vaultTimeout: this.vaultTimeout
      });

      return true;
    } catch (error) {
      console.error('Error saving data:', error);
      return false;
    }
  }

  async loadSettings() {
    try {
      const result = await browser.storage.local.get([
        'unit',
        'vaultTimeout',
        'currency'
      ]);

      return {
        unit: result.unit || CONFIG.DEFAULTS.UNIT,
        vaultTimeout: result.vaultTimeout || CONFIG.DEFAULTS.VAULT_TIMEOUT,
        currency: result.currency || CONFIG.DEFAULTS.CURRENCY
      };
    } catch (error) {
      console.error('Error loading settings:', error);
      return this.getDefaultSettings();
    }
  }

  async saveSettings(settings) {
    try {
      const updateData = {};

      if (settings.unit !== undefined) {
        this.unit = settings.unit;
        updateData.unit = settings.unit;
      }

      if (settings.currency !== undefined) {
        this.currency = settings.currency;
        updateData.currency = settings.currency;
      }

      if (settings.vaultTimeout !== undefined) {
        this.vaultTimeout = settings.vaultTimeout;
        updateData.vaultTimeout = settings.vaultTimeout;
      }

      await browser.storage.local.set(updateData);

      console.log('Saved settings:', updateData);
      return true;
    } catch (error) {
      console.error('Error saving settings:', error);
      return false;
    }
  }

  // Watchlist management
  addAddress(address, label = '') {
    if (!address || this.watchlist.some(item => item.address === address)) {
      return false;
    }

    const newItem = {
      address: address.trim(),
      label: label.trim(),
      balance_btc: 0,
      quantum_risk: 'checking...',
      added_at: Date.now()
    };

    this.watchlist.push(newItem);
    console.log('Added address to watchlist:', address);
    return newItem;
  }

  removeAddress(index) {
    if (index >= 0 && index < this.watchlist.length) {
      const removed = this.watchlist.splice(index, 1)[0];
      console.log('Removed address from watchlist:', removed.address);
      return removed;
    }
    return null;
  }

  updateAddress(address, updates) {
    const item = this.watchlist.find(item => item.address === address);
    if (item) {
      Object.assign(item, updates);
      console.log('Updated address in watchlist:', address, updates);
      return item;
    }
    return null;
  }

  findAddress(address) {
    return this.watchlist.find(item => item.address === address);
  }

  getWatchlist() {
    // Safety check - if data hasn't been loaded yet, return empty array
    if (!this.isDataLoaded) {
      console.warn('getWatchlist() called before data was loaded - returning empty array');
      return [];
    }

    return [...this.watchlist]; // Return a copy to prevent direct mutation
  }

  getTotalBalance() {
    return this.watchlist.reduce((sum, item) => sum + (item.balance_btc || 0), 0);
  }

  clearWatchlist() {
    this.watchlist = [];
  }

  // Currency and unit management

  getUnit() {
    return this.unit;
  }

  setCurrency(currency) {
    if (currency && typeof currency === 'string') {
      this.currency = currency.toLowerCase();
      return true;
    }
    return false;
  }

  getCurrency() {
    return this.currency;
  }

  setVaultTimeout(timeout) {
    this.vaultTimeout = timeout;
  }

  getVaultTimeout() {
    return this.vaultTimeout;
  }

  // Import/Export functionality
  async exportData() {
    try {
      const data = await this.loadData();
      return {
        version: '1.0',
        exported_at: new Date().toISOString(),
        watchlist: data.watchlist,
        settings: {
          unit: data.unit,
          currency: data.currency,
          vaultTimeout: data.vaultTimeout
        }
      };
    } catch (error) {
      console.error('Error exporting data:', error);
      throw error;
    }
  }

  async importData(importData) {
    try {
      if (!importData || !importData.watchlist || !Array.isArray(importData.watchlist)) {
        throw new Error('Invalid import data format');
      }

      // Validate watchlist items
      const validWatchlist = importData.watchlist.filter(item =>
        item &&
        typeof item.address === 'string' &&
        item.address.length > 0
      );

      this.watchlist = validWatchlist;

      // Import settings if available
      if (importData.settings) {
        if (importData.settings.currency) {
          this.setCurrency(importData.settings.currency);
        }
        if (importData.settings.vaultTimeout) {
          this.setVaultTimeout(importData.settings.vaultTimeout);
        }
      }

      await this.saveData();
      console.log('Imported data successfully:', {
        watchlistItems: this.watchlist.length,
        unit: this.unit,
        currency: this.currency
      });

      return true;
    } catch (error) {
      console.error('Error importing data:', error);
      throw error;
    }
  }

  // Data validation
  validateWatchlistItem(item) {
    return item &&
           typeof item === 'object' &&
           typeof item.address === 'string' &&
           item.address.length >= CONFIG.ADDRESS_MIN_LENGTH &&
           typeof item.label === 'string' &&
           typeof item.balance_btc === 'number' &&
           item.balance_btc >= 0;
  }

  cleanupWatchlist() {
    const originalLength = this.watchlist.length;
    this.watchlist = this.watchlist.filter(item => this.validateWatchlistItem(item));

    if (this.watchlist.length !== originalLength) {
      console.log(`Cleaned up watchlist: removed ${originalLength - this.watchlist.length} invalid items`);
    }
  }

  // Storage statistics
  async getStorageStats() {
    try {
      const result = await browser.storage.local.get(null);
      const keys = Object.keys(result);
      const dataSize = JSON.stringify(result).length;

      return {
        totalKeys: keys.length,
        dataSize: dataSize,
        dataSizeKB: Math.round(dataSize / 1024 * 100) / 100,
        keys: keys,
        watchlistCount: this.watchlist.length
      };
    } catch (error) {
      console.error('Error getting storage stats:', error);
      return null;
    }
  }

  // Helper methods
  getDefaults() {
    return {
      watchlist: [],
      unit: CONFIG.DEFAULTS.UNIT,
      currency: CONFIG.DEFAULTS.CURRENCY,
      vaultTimeout: CONFIG.DEFAULTS.VAULT_TIMEOUT
    };
  }

  getDefaultSettings() {
    return {
      unit: CONFIG.DEFAULTS.UNIT,
      currency: CONFIG.DEFAULTS.CURRENCY,
      vaultTimeout: CONFIG.DEFAULTS.VAULT_TIMEOUT
    };
  }

  // Backup functionality
  async createBackup() {
    try {
      const exportData = await this.exportData();
      const backup = {
        ...exportData,
        backup_type: 'full',
        backup_version: '1.0'
      };

      return JSON.stringify(backup, null, 2);
    } catch (error) {
      console.error('Error creating backup:', error);
      throw error;
    }
  }

  async restoreFromBackup(backupString) {
    try {
      const backup = JSON.parse(backupString);

      if (!backup.watchlist) {
        throw new Error('Invalid backup format - missing watchlist');
      }

      await this.importData(backup);
      return true;
    } catch (error) {
      console.error('Error restoring from backup:', error);
      throw error;
    }
  }
}