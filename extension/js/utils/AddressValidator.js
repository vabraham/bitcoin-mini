import { CONFIG } from '../config.js';

export class AddressValidator {
  static validate(address) {
    if (!address || typeof address !== 'string') {
      return {
        isValid: false,
        error: 'Address is required',
        errorType: 'required'
      };
    }

    const addr = address.trim();

    // Check if it's too short
    if (addr.length < CONFIG.ADDRESS_MIN_LENGTH) {
      return {
        isValid: false,
        error: 'Address is too short to be valid',
        errorType: 'too_short'
      };
    }

    // Check if it looks like a transaction ID
    if (CONFIG.REGEX.TX_ID.test(addr)) {
      return {
        isValid: false,
        error: 'Please enter a Bitcoin address, not a transaction ID',
        errorType: 'tx_id'
      };
    }

    // Check if it looks like a block hash
    if (CONFIG.REGEX.BLOCK_HASH.test(addr)) {
      return {
        isValid: false,
        error: 'Please enter a Bitcoin address, not a block hash',
        errorType: 'block_hash'
      };
    }

    // Check if it contains invalid characters
    if (!CONFIG.REGEX.ADDRESS_CHARS.test(addr)) {
      return {
        isValid: false,
        error: 'Address contains invalid characters',
        errorType: 'invalid_chars'
      };
    }

    // Check if it matches Bitcoin address format
    if (!CONFIG.REGEX.ADDRESS.test(addr)) {
      return {
        isValid: false,
        error: 'Invalid Bitcoin address format',
        errorType: 'invalid_format'
      };
    }

    return {
      isValid: true,
      address: addr,
      type: this.getAddressType(addr)
    };
  }

  static getAddressType(address) {
    const addr = address.toLowerCase();

    if (addr.startsWith('bc1p')) {
      return {
        type: 'p2tr',
        name: 'Taproot (P2TR)',
        segwit: true,
        version: 'v1'
      };
    }

    if (addr.startsWith('bc1q')) {
      return {
        type: 'p2wpkh_or_wsh',
        name: 'SegWit (P2WPKH/P2WSH)',
        segwit: true,
        version: 'v0'
      };
    }

    if (addr.startsWith('1')) {
      return {
        type: 'p2pkh',
        name: 'Legacy (P2PKH)',
        segwit: false,
        version: 'legacy'
      };
    }

    if (addr.startsWith('3')) {
      return {
        type: 'p2sh',
        name: 'Script Hash (P2SH)',
        segwit: false,
        version: 'legacy'
      };
    }

    return {
      type: 'unknown',
      name: 'Unknown',
      segwit: false,
      version: 'unknown'
    };
  }

  static isSpecialAddress(address) {
    return CONFIG.SPECIAL_ADDRESSES.includes(address);
  }

  static validateLabel(label) {
    if (!label) {
      return {
        isValid: true,
        label: ''
      };
    }

    if (typeof label !== 'string') {
      return {
        isValid: false,
        error: 'Label must be text'
      };
    }

    const trimmedLabel = label.trim();

    if (trimmedLabel.length > 50) {
      return {
        isValid: false,
        error: 'Label must be 50 characters or less'
      };
    }

    // Check for potentially problematic characters
    if (trimmedLabel.includes('<') || trimmedLabel.includes('>')) {
      return {
        isValid: false,
        error: 'Label cannot contain < or > characters'
      };
    }

    return {
      isValid: true,
      label: trimmedLabel
    };
  }

  static validateAddressForWatchlist(address, existingWatchlist = []) {
    // First validate the address format
    const addressValidation = this.validate(address);
    if (!addressValidation.isValid) {
      return addressValidation;
    }

    // Check if address already exists in watchlist
    if (existingWatchlist.some(item => item.address === addressValidation.address)) {
      return {
        isValid: false,
        error: 'Address already in watchlist',
        errorType: 'duplicate'
      };
    }

    return addressValidation;
  }

  static sanitizeAddress(address) {
    if (!address || typeof address !== 'string') {
      return '';
    }

    return address.trim();
  }

  static sanitizeLabel(label) {
    if (!label || typeof label !== 'string') {
      return '';
    }

    return label.trim().substring(0, 50);
  }

  // Check if address format suggests it might be quantum vulnerable
  static assessQuantumVulnerability(address) {
    const addressInfo = this.getAddressType(address);

    switch (addressInfo.type) {
      case 'p2tr':
        return {
          riskLevel: 'potential',
          reason: 'Taproot addresses may be vulnerable to quantum attacks',
          recommendation: 'Monitor for quantum computing advances'
        };

      case 'p2pkh':
        return {
          riskLevel: 'reuse',
          reason: 'Legacy addresses are vulnerable if private keys are exposed through address reuse',
          recommendation: 'Avoid reusing this address type'
        };

      case 'p2wpkh_or_wsh':
        return {
          riskLevel: 'reuse',
          reason: 'SegWit addresses are vulnerable if private keys are exposed through address reuse',
          recommendation: 'Avoid reusing this address'
        };

      case 'p2sh':
        return {
          riskLevel: 'depends',
          reason: 'Script hash vulnerability depends on the underlying script',
          recommendation: 'Vulnerability depends on script type'
        };

      default:
        return {
          riskLevel: 'unknown',
          reason: 'Unknown address type',
          recommendation: 'Cannot assess quantum vulnerability'
        };
    }
  }

  // Batch validation for multiple addresses
  static validateBatch(addresses) {
    if (!Array.isArray(addresses)) {
      return {
        isValid: false,
        error: 'Input must be an array of addresses'
      };
    }

    const results = addresses.map((address, index) => ({
      index,
      address,
      ...this.validate(address)
    }));

    const validResults = results.filter(result => result.isValid);
    const invalidResults = results.filter(result => !result.isValid);

    return {
      total: addresses.length,
      valid: validResults.length,
      invalid: invalidResults.length,
      results,
      validAddresses: validResults.map(r => r.address),
      invalidAddresses: invalidResults
    };
  }

  // Check for common address format mistakes
  static suggestCorrections(address) {
    if (!address || typeof address !== 'string') {
      return null;
    }

    const addr = address.trim();
    const suggestions = [];

    // Check for case sensitivity issues
    if (addr !== addr.toLowerCase() && addr !== addr.toUpperCase()) {
      if (addr.startsWith('BC1') || addr.startsWith('bc1')) {
        suggestions.push({
          type: 'case',
          suggestion: addr.toLowerCase(),
          reason: 'Bech32 addresses should be lowercase'
        });
      }
    }

    // Check for common OCR mistakes
    const ocrFixes = {
      '0': 'O',
      'O': '0',
      'l': '1',
      'I': '1'
    };

    let fixedAddress = addr;
    Object.entries(ocrFixes).forEach(([wrong, correct]) => {
      if (addr.includes(wrong)) {
        const fixed = addr.replace(new RegExp(wrong, 'g'), correct);
        if (this.validate(fixed).isValid) {
          suggestions.push({
            type: 'ocr',
            suggestion: fixed,
            reason: `Replaced '${wrong}' with '${correct}' (common OCR mistake)`
          });
        }
      }
    });

    // Check for extra whitespace or characters
    const cleaned = addr.replace(/\s+/g, '').replace(/[^a-zA-Z0-9]/g, '');
    if (cleaned !== addr && this.validate(cleaned).isValid) {
      suggestions.push({
        type: 'cleanup',
        suggestion: cleaned,
        reason: 'Removed extra characters and whitespace'
      });
    }

    return suggestions.length > 0 ? suggestions : null;
  }
}