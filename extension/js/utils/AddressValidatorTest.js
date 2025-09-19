// Comprehensive Bitcoin Address Validation Test Suite
// All 33 addresses must pass validation before commits can be merged

import { AddressValidator } from './AddressValidator.js';

export class AddressValidatorTest {
  static TEST_ADDRESSES = {
    // Legacy Addresses (P2PKH) - Original format from 2009
    legacy_p2pkh: [
      '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa',  // Genesis block address
      '1CounterpartyXXXXXXXXXXXXXXXUWLpVr',  // Burn address
      '1dice8EMZmqKvrGE4Qc9bUFf9PX3xaYDp',
      '1LfV1tSt3KNyHpFJnAzrqsLFdeD2EvU1MK',
      '1BoatSLRHtKNngkdXEeobR76b53LETtpyT',
      '1F1tAaz5x1HUXrCNLbtMDqcw6o5GNn4xqX'
    ],

    // Pay-to-Script-Hash (P2SH) - Introduced 2012
    p2sh: [
      '3J98t1WpEZ73CNmQviecrnyiWrnqRhWNLy',
      '3CQuL1dSGm4kfT9d2MyW8Tkg9qvDPb97B3',
      '3E8ociqZa9mZUSwGdSmAEMAoAxBK3FNDcd',
      '3HSMPBUuAPQf6CU5B3qa6fALrrZXswHaF1',
      '37XuVSEpWW4trkfmvWzegTHQt7BdktSKtJ'
    ],

    // Native SegWit (P2WPKH - Bech32) - Introduced 2017
    segwit_v0_p2wpkh: [
      'bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4',  // First bech32 burn address
      'bc1qp0lfxhscvpz4jgeqfma4t9r5dxt0k5xq7vf6yy',
      'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq',
      'bc1q5shngj24323srmxv99st02na6srekfctt30ch',
      'bc1q7cyrfmck2ffu2ud3rn5l5a8yv6f0chkp0zpemf'
    ],

    // Native SegWit (P2WSH - Bech32) - Multisig/Script
    segwit_v0_p2wsh: [
      'bc1qeklep85ntjz4605drds6aww9u0qr46qzrv5xswd35uhjuj8ahfcqgf6hak',
      'bc1q6rgl33d3s9dugudw7n68yrryajkr3ha2q8fmm20zs62k4q9shqfqmhqg6d',
      'bc1qdyfhhanqvrxem8ah6n7jlp5z890sp3dmcdjqpm0x5za9gqx5vypq8dn3wl'
    ],

    // Taproot (P2TR - Bech32m) - Introduced 2021
    taproot_p2tr: [
      'bc1p0xlxvlhemja6c4dqv22uapctqupfhlxm9h8z3k2e72q4k9hcz7vqzk5jj0',
      'bc1p5cyxnuxmeuwuvkwfem96lqzszd02n6xdcjrs20cac6yqjjwudpxqkedrcr',
      'bc1p4qhjn9zdvkux4e44uhx8tc55attvtyu358kutcqkudyccelu0was9fqzwh',
      'bc1p7vsfr0qk2xj03mzgdecnkfkqle8r0jylpzqkq0pt76mdt5fvzv2sd9zhqt'
    ],

    // Testnet Addresses (for testing)
    testnet: [
      'tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx',  // Testnet bech32
      '2MzQwSSnBHWHqSAqtTVQ6v47XtaisrJa1Vc',  // Testnet P2SH
      'mipcBbFg9gMiCh81Kj8tqqdgoZub1ZJRfn'  // Testnet P2PKH
    ],

    // Edge Cases and Special Addresses
    edge_cases: [
      '1111111111111111111114oLvT2',  // Burn address (short)
      '1QLbz7JHiBTspS962RLKV8GndWFwi5j6Qr',  // Valid but unusual
      'bc1zw508d6qejxtdg4y5r3zarvaryvqyzf3du',  // 42-character bech32
      'bc1qqqqqp399et2xygdj5xreqhjjvcmzhxw4aywxecjdzew6hylgvsesrxh6hy'  // Long bech32
    ]
  };

  static getAllTestAddresses() {
    const allAddresses = [];
    Object.values(this.TEST_ADDRESSES).forEach(categoryAddresses => {
      allAddresses.push(...categoryAddresses);
    });
    return allAddresses;
  }

  static async runAllTests() {
    console.log('🧪 Running comprehensive Bitcoin address validation tests...');
    console.log(`Testing ${this.getAllTestAddresses().length} addresses across all formats\n`);

    const results = {
      total: 0,
      passed: 0,
      failed: 0,
      failures: []
    };

    // Test each category
    for (const [category, addresses] of Object.entries(this.TEST_ADDRESSES)) {
      console.log(`\n📋 Testing ${category.toUpperCase().replace(/_/g, ' ')} (${addresses.length} addresses):`);

      for (const address of addresses) {
        results.total++;
        const validation = AddressValidator.validate(address);

        if (validation.isValid) {
          console.log(`  ✅ ${address} - ${validation.type?.name || 'Valid'}`);
          results.passed++;
        } else {
          console.log(`  ❌ ${address} - ERROR: ${validation.error}`);
          results.failed++;
          results.failures.push({
            address,
            category,
            error: validation.error,
            errorType: validation.errorType
          });
        }
      }
    }

    // Summary
    console.log('\n' + '='.repeat(80));
    console.log('📊 TEST RESULTS SUMMARY');
    console.log('='.repeat(80));
    console.log(`Total addresses tested: ${results.total}`);
    console.log(`✅ Passed: ${results.passed}`);
    console.log(`❌ Failed: ${results.failed}`);
    console.log(`Success rate: ${((results.passed / results.total) * 100).toFixed(1)}%`);

    if (results.failed > 0) {
      console.log('\n🚨 FAILURES:');
      results.failures.forEach(failure => {
        console.log(`  • ${failure.address} (${failure.category}): ${failure.error}`);
      });
      console.log('\n⚠️  TESTS FAILED - Address validation needs fixes before deployment!');
      return false;
    } else {
      console.log('\n🎉 ALL TESTS PASSED! Address validation is ready for deployment.');
      return true;
    }
  }

  static async testSingleAddress(address) {
    console.log(`🔍 Testing single address: ${address}`);
    const validation = AddressValidator.validate(address);

    if (validation.isValid) {
      console.log(`✅ Valid - Type: ${validation.type?.name || 'Unknown'}`);
      console.log(`   Format: ${validation.type?.type || 'unknown'}`);
      console.log(`   SegWit: ${validation.type?.segwit ? 'Yes' : 'No'}`);
    } else {
      console.log(`❌ Invalid - Error: ${validation.error}`);
      console.log(`   Error Type: ${validation.errorType}`);
    }

    return validation;
  }

  // Quick test runner for development
  static async quickTest() {
    console.log('🚀 Quick test with sample addresses...');
    const sampleAddresses = [
      '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa',  // Legacy
      '3J98t1WpEZ73CNmQviecrnyiWrnqRhWNLy',  // P2SH
      'bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4',  // SegWit
      'bc1p0xlxvlhemja6c4dqv22uapctqupfhlxm9h8z3k2e72q4k9hcz7vqzk5jj0'  // Taproot
    ];

    let allPassed = true;
    for (const address of sampleAddresses) {
      const result = await this.testSingleAddress(address);
      if (!result.isValid) allPassed = false;
      console.log('---');
    }

    return allPassed;
  }

  // Test specific address categories
  static async testCategory(categoryName) {
    if (!this.TEST_ADDRESSES[categoryName]) {
      console.log(`❌ Unknown category: ${categoryName}`);
      console.log(`Available categories: ${Object.keys(this.TEST_ADDRESSES).join(', ')}`);
      return false;
    }

    const addresses = this.TEST_ADDRESSES[categoryName];
    console.log(`🧪 Testing ${categoryName} addresses (${addresses.length} total):`);

    let passed = 0;
    for (const address of addresses) {
      const validation = AddressValidator.validate(address);
      if (validation.isValid) {
        console.log(`  ✅ ${address}`);
        passed++;
      } else {
        console.log(`  ❌ ${address} - ${validation.error}`);
      }
    }

    console.log(`\nResults: ${passed}/${addresses.length} passed`);
    return passed === addresses.length;
  }
}

// Auto-run tests in development mode
if (typeof window !== 'undefined' && window.location?.hostname === 'localhost') {
  console.log('🧪 Development mode detected - running quick tests...');
  AddressValidatorTest.quickTest();
}