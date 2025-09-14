# Bitcoin Mini Extension

A simple, secure, and clean Bitcoin price tracker and address vault for your browser.

## Features

- **Real-time Bitcoin Price**: Live BTC price with USD, BTC, and SATS units
- **Secure Address Vault**: Store and track Bitcoin addresses with optional PIN protection
- **Network Fee Tracking**: Monitor current network fees from multiple sources
- **Cross-browser Support**: Works on Chrome, Firefox, and other Chromium-based browsers
- **Privacy-focused**: All data stored locally, no external tracking

## Security Features

- **Optional PIN Protection**: Secure your address vault with a 4-6 digit PIN
- **Vault Timeout Options**: 
  - Never (manual lock only)
  - On Extension Open
  - On Browser Restart
  - On System Lock
  - Time-based (1, 5, 15, 30, 60 minutes)
- **Local Storage**: All data stored locally in your browser
- **No External Dependencies**: Works offline after initial load

## Installation

### Chrome/Chromium-based Browsers
1. Download the extension files
2. Go to `chrome://extensions/`
3. Enable "Developer mode"
4. Click "Load unpacked" and select the extension folder

### Firefox
1. Download the extension files
2. Go to `about:debugging`
3. Click "This Firefox"
4. Click "Load Temporary Add-on"
5. Select the `manifest.json` file

## Usage

1. **View Bitcoin Price**: The extension shows live BTC price on load
2. **Add Addresses**: Click "Add Address" to store Bitcoin addresses
3. **Secure Vault**: Set up a PIN to protect your addresses
4. **Track Fees**: Monitor network fees from multiple sources
5. **Change Settings**: Click the settings icon to customize vault timeout

## Privacy

- No data is sent to external servers except for price and fee data
- All addresses and PINs are stored locally in your browser
- No tracking or analytics
- Open source and auditable

## Browser Compatibility

- Chrome 88+
- Firefox 109+
- Edge 88+
- Other Chromium-based browsers

## Development

Built with vanilla JavaScript, HTML, and CSS. No external dependencies.

## License

MIT License - see LICENSE file for details
