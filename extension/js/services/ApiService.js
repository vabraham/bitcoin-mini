import { CONFIG } from '../config.js';

export class ApiService {
  constructor() {
    this.lastPriceUpdate = 0;
    this.lastFeesUpdate = 0;
    this.priceCache = null;
    this.feesCache = null;
    this.isRateLimited = false;
    this.retryCount = 0;
  }

  // Centralized API Error Handling
  categorizeAPIError(response, error) {
    if (!response) return 'network';
    if (response.status === 429) return 'rate_limit';
    if (response.status >= 500) return 'server';
    if (response.status >= 400) return 'client';
    return 'unknown';
  }

  shouldRetryAPI(errorType, attempt) {
    const retryable = ['network', 'server', 'rate_limit'];
    return retryable.includes(errorType) && attempt < CONFIG.MAX_RETRIES;
  }

  getRetryDelay(attempt, errorType) {
    if (errorType === 'rate_limit') {
      this.isRateLimited = true;
      setTimeout(() => {
        this.isRateLimited = false;
        this.retryCount = 0;
      }, CONFIG.RATE_LIMIT_DELAY);
      return CONFIG.RATE_LIMIT_DELAY;
    }
    return Math.min(2000 * Math.pow(2, attempt), 30000);
  }

  async fetchWithRetry(url, options = {}, maxRetries = CONFIG.MAX_RETRIES) {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const response = await fetch(url, {
          ...options,
          headers: {
            'User-Agent': 'BitcoinMini-Extension/1.0',
            ...options.headers
          }
        });

        if (response.ok) return response;

        const errorType = this.categorizeAPIError(response, null);

        if (!this.shouldRetryAPI(errorType, attempt)) {
          throw new Error(`API error: ${response.status} ${response.statusText}`);
        }

        if (attempt < maxRetries) {
          const delay = this.getRetryDelay(attempt, errorType);
          console.log(`Retrying ${url} in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      } catch (error) {
        if (attempt === maxRetries) throw error;

        const errorType = this.categorizeAPIError(null, error);
        if (!this.shouldRetryAPI(errorType, attempt)) throw error;

        const delay = this.getRetryDelay(attempt, errorType);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  async refreshPriceIfNeeded(currency, force = false) {
    const now = Date.now();
    const timeSinceLastUpdate = now - this.lastPriceUpdate;

    if (!force && !this.isRateLimited && timeSinceLastUpdate < CONFIG.MIN_UPDATE_INTERVAL) {
      console.log('Skipping price update - too soon since last update');
      return null;
    }

    if (this.isRateLimited) {
      console.log('Skipping price update - rate limited');
      return this.priceCache?.data || null;
    }

    if (!force && this.priceCache && (now - this.priceCache.timestamp) < CONFIG.CACHE_TIMEOUT) {
      console.log('Using cached price data');
      return this.priceCache.data;
    }

    return await this.fetchPriceData(currency);
  }

  async fetchPriceData(currency) {
    try {
      if (!currency || typeof currency !== 'string') {
        console.error('Invalid currency:', currency);
        throw new Error('Invalid currency');
      }

      const [currentResponse, historicalResponse] = await Promise.all([
        this.fetchWithRetry(`${CONFIG.ENDPOINTS.COINGECKO_PRICE}?ids=bitcoin&vs_currencies=${currency}`),
        this.fetchWithRetry(`${CONFIG.ENDPOINTS.COINGECKO_HISTORY}?vs_currency=${currency}&days=365&interval=daily`)
      ]);

      const [currentData, historicalData] = await Promise.all([
        currentResponse.json(),
        historicalResponse.json()
      ]);

      // Validate data structure
      const hasCurrentPrice = currentData?.bitcoin?.[currency] > 0;
      const hasHistoricalPrices = historicalData?.prices?.length > 0 &&
                                 historicalData.prices[0]?.length >= 2 &&
                                 historicalData.prices[0][1] > 0;

      if (!hasCurrentPrice || !hasHistoricalPrices) {
        throw new Error('Invalid price data structure');
      }

      const currentPrice = currentData.bitcoin[currency];
      const priceOneYearAgo = historicalData.prices[0][1];
      const yoyChange = ((currentPrice - priceOneYearAgo) / priceOneYearAgo) * 100;

      const symbol = CONFIG.CURRENCY_SYMBOLS[currency] || currency.toUpperCase();
      const priceText = `${symbol}${currentPrice.toLocaleString()}`;

      let changeText, changeClass;
      if (yoyChange > 0.01) {
        changeText = `+${yoyChange.toFixed(2)}% YoY`;
        changeClass = 'price-up';
      } else if (yoyChange < -0.01) {
        changeText = `${yoyChange.toFixed(2)}% YoY`;
        changeClass = 'price-down';
      } else {
        changeText = `${yoyChange.toFixed(2)}% YoY`;
        changeClass = 'price-neutral';
      }

      const priceData = {
        price: priceText,
        change: changeText,
        changeClass: changeClass,
        time: new Date().toLocaleTimeString(),
        currentPrice: currentPrice
      };

      this.lastPriceUpdate = Date.now();
      this.priceCache = {
        timestamp: this.lastPriceUpdate,
        data: priceData
      };

      return priceData;

    } catch (error) {
      console.error('Price fetch error:', error);
      throw error;
    }
  }

  async refreshFeesIfNeeded(force = false) {
    const now = Date.now();
    const timeSinceLastUpdate = now - this.lastFeesUpdate;

    if (!force && !this.isRateLimited && timeSinceLastUpdate < CONFIG.MIN_UPDATE_INTERVAL) {
      console.log('Skipping fees update - too soon since last update');
      return null;
    }

    if (this.isRateLimited) {
      console.log('Skipping fees update - rate limited');
      return this.feesCache?.data || null;
    }

    if (!force && this.feesCache && (now - this.feesCache.timestamp) < CONFIG.CACHE_TIMEOUT) {
      console.log('Using cached fees data');
      return this.feesCache.data;
    }

    return await this.fetchFeesData();
  }

  async fetchFeesData() {
    try {
      const response = await this.fetchWithRetry(CONFIG.ENDPOINTS.MEMPOOL_FEES);
      const data = await response.json();

      if (!data || typeof data !== 'object') {
        throw new Error('Invalid fees data structure');
      }

      const feesData = {
        fastestFee: data.fastestFee ? parseFloat(data.fastestFee).toFixed(1) : '—',
        hourFee: data.hourFee ? parseFloat(data.hourFee).toFixed(1) : '—',
        economyFee: data.economyFee ? parseFloat(data.economyFee).toFixed(1) : '—',
        time: new Date().toLocaleTimeString()
      };

      this.lastFeesUpdate = Date.now();
      this.feesCache = {
        timestamp: this.lastFeesUpdate,
        data: feesData
      };

      return feesData;

    } catch (error) {
      console.error('Fees fetch error:', error);
      throw error;
    }
  }

  async fetchAddressSummary(address) {
    try {
      console.log('Fetching balance for address:', address);

      const response = await this.fetchWithRetry(`${CONFIG.ENDPOINTS.BLOCKSTREAM_ADDRESS}/${address}`);
      const data = await response.json();

      if (!data) {
        console.warn('No data returned for address:', address);
        return await this.fetchAddressSummaryFallback(address);
      }

      const chainStats = data.chain_stats || {};
      const mempoolStats = data.mempool_stats || {};
      const funded = (chainStats.funded_txo_sum || 0) + (mempoolStats.funded_txo_sum || 0);
      const spent = (chainStats.spent_txo_sum || 0) + (mempoolStats.spent_txo_sum || 0);
      const balance = Math.max((funded - spent) / 1e8, 0);

      console.log(`Balance for ${address}: ${balance} BTC`);

      return {
        balance_btc: balance,
        api_status: 'success',
        data_source: 'blockstream'
      };

    } catch (error) {
      console.error('Error fetching balance for', address, ':', error);

      // Check if it's a 400 error (bad request) vs other errors
      const is400Error = error.message && error.message.includes('400');

      if (is400Error) {
        console.warn('Address rejected by primary API, trying fallback...');
      }

      return await this.fetchAddressSummaryFallback(address, error);
    }
  }

  async fetchAddressSummaryFallback(address, primaryError = null) {
    try {
      console.log('Trying fallback API for address:', address);

      const response = await this.fetchWithRetry(`${CONFIG.ENDPOINTS.MEMPOOL_ADDRESS}/${address}`);
      const data = await response.json();

      if (!data || !data.chain_stats) {
        console.warn('No valid data from fallback API for address:', address);
        return this.createErrorResponse(address, 'Both APIs returned no data - address may be unused or invalid', primaryError);
      }

      const chainStats = data.chain_stats || {};
      const mempoolStats = data.mempool_stats || {};
      const funded = (chainStats.funded_txo_sum || 0) + (mempoolStats.funded_txo_sum || 0);
      const spent = (chainStats.spent_txo_sum || 0) + (mempoolStats.spent_txo_sum || 0);
      const balance = Math.max((funded - spent) / 1e8, 0);

      console.log(`Fallback balance for ${address}: ${balance} BTC`);

      return {
        balance_btc: balance,
        api_status: 'success',
        data_source: 'mempool_fallback'
      };

    } catch (fallbackError) {
      console.error('Fallback API error for', address, ':', fallbackError);
      return this.createErrorResponse(address, 'Unable to fetch balance data', primaryError, fallbackError);
    }
  }

  createErrorResponse(address, userMessage, primaryError = null, fallbackError = null) {
    // Determine the most likely cause based on error patterns
    let errorType = 'api_error';
    let detailedMessage = userMessage;

    if (primaryError && fallbackError) {
      const both400 = primaryError.message?.includes('400') && fallbackError.message?.includes('400');
      if (both400) {
        errorType = 'address_not_recognized';
        detailedMessage = 'Address format not recognized by blockchain APIs - may be invalid or unused';
      } else {
        errorType = 'api_unavailable';
        detailedMessage = 'Blockchain APIs temporarily unavailable - try again later';
      }
    }

    return {
      balance_btc: 0,
      api_status: 'error',
      error_type: errorType,
      error_message: detailedMessage,
      user_message: userMessage,
      data_source: 'none'
    };
  }

  async checkQuantumExposure(address) {
    try {
      if (!address || typeof address !== 'string') {
        console.warn('Invalid address provided to checkQuantumExposure:', address);
        return { overall_risk: 'error', exposed_value_btc: 0 };
      }

      // Skip special addresses
      if (CONFIG.SPECIAL_ADDRESSES.includes(address)) {
        console.log('Skipping quantum check for special address');
        return { overall_risk: 'unknown', exposed_value_btc: 0 };
      }

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('API timeout')), CONFIG.ADDRESS_TIMEOUT)
      );

      const [addrInfo, utxos] = await Promise.race([
        Promise.all([
          this.fetchWithRetry(`${CONFIG.ENDPOINTS.BLOCKSTREAM_ADDRESS}/${address}`)
            .then(r => r.json()).catch(() => null),
          this.fetchWithRetry(`${CONFIG.ENDPOINTS.BLOCKSTREAM_ADDRESS}/${address}/utxo`)
            .then(r => r.json()).catch(() => null)
        ]),
        timeoutPromise
      ]);

      let exposedValue = 0;
      let hasExposed = false;

      if (!addrInfo || !utxos || !Array.isArray(utxos)) {
        console.log('API data unavailable for address:', address);
        return { overall_risk: 'unknown', exposed_value_btc: 0 };
      }

      for (const utxo of utxos.slice(0, CONFIG.MAX_UTXOS_TO_CHECK)) {
        try {
          if (!utxo?.txid) {
            console.warn('Invalid UTXO data:', utxo);
            continue;
          }

          const tx = await this.fetchWithRetry(`${CONFIG.ENDPOINTS.BLOCKSTREAM_TX}/${utxo.txid}`)
            .then(r => r.json()).catch(() => null);

          if (!tx?.vout || !Array.isArray(tx.vout)) {
            console.warn('Invalid transaction data for UTXO:', utxo.txid);
            continue;
          }

          const scriptType = tx.vout?.[utxo.vout]?.scriptpubkey_type;

          if (['p2pk', 'v1_p2tr'].includes(scriptType?.toLowerCase())) {
            hasExposed = true;
            exposedValue += (utxo.value || 0) / 1e8;
          }
        } catch (e) {
          console.warn('Error checking UTXO:', utxo?.txid || 'unknown', e.message);
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

  categorizeFee(fee) {
    if (!fee || fee === '—') {
      return { text: '—', class: 'fee-category' };
    }

    const feeValue = parseFloat(fee);
    if (isNaN(feeValue)) {
      return { text: '—', class: 'fee-category' };
    }

    if (feeValue < CONFIG.FEE_THRESHOLDS.VERY_LOW) {
      return { text: 'Very Low', class: 'fee-category fee-very-low' };
    } else if (feeValue < CONFIG.FEE_THRESHOLDS.LOW) {
      return { text: 'Low', class: 'fee-category fee-low' };
    } else if (feeValue <= CONFIG.FEE_THRESHOLDS.MEDIUM) {
      return { text: 'Medium', class: 'fee-category fee-medium' };
    } else if (feeValue <= CONFIG.FEE_THRESHOLDS.HIGH) {
      return { text: 'High', class: 'fee-category fee-high' };
    } else {
      return { text: 'Very High', class: 'fee-category fee-very-high' };
    }
  }

  getCachedData() {
    return {
      price: this.priceCache?.data || null,
      fees: this.feesCache?.data || null
    };
  }

  clearCache() {
    this.priceCache = null;
    this.feesCache = null;
  }
}