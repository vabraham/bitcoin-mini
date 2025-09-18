# Bitcoin Mini Extension <span style="color: #f2a900;">₿</span>

A simple, secure, and clean Bitcoin price tracker and address vault for your browser.

## Installation

### Chrome Web Store
*Coming soon* - Extension is currently under review by Chrome Web Store.

### Firefox Add-ons
*Coming soon* - Extension will also be available for Firefox users.

### Other Browsers
Also compatible with Edge, Brave, Opera, and other Chromium-based browsers via Chrome Web Store.

## Features

- **Real-time Bitcoin Price**: Live BTC price with USD, BTC, and SATS units
- **Secure Address Vault**: Store and track Bitcoin addresses with optional PIN protection
- **Network Fee Tracking**: Monitor current network fees from multiple sources
- **Cross-browser Support**: Works on Chrome, Firefox, and other Chromium-based browsers
- **Privacy-focused**: All data stored locally, no external tracking (data will not sync between devices/browsers)

## Security Features

- **Optional PIN Protection**: Secure your address vault with a 4-6 digit PIN
- **PIN Rate Limiting**: 5 attempts before 5-minute lockout for security
- **Vault Timeout Options**: Various timeout options available including manual lock, time-based, and system events
- **Local Storage**: All data stored locally in your browser
- **No External Dependencies**: Works offline after initial load

## Usage

1. **View Bitcoin Price**: The extension shows live BTC price on load
2. **Add Addresses**: Click "Add Address" to store Bitcoin addresses
3. **Secure Vault**: Set up a PIN to protect your addresses
4. **Track Fees**: Monitor network fees from multiple sources
5. **Change Settings**: Click the settings icon to customize vault timeout, currency display, pin modification, etc.

## Contributing

Found a bug or have a feature idea? Please [open an issue](https://github.com/beasthouse/bitcoin-mini/issues) on GitHub!

Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

## Support Development

If you find this extension useful, consider supporting development:

**Lightning Address**: `greenpenguin6@primal.net`

Every satoshi helps keep this project maintained and improved! ⚡

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

### Manual Installation for Development
1. Download or clone this repository
2. Go to `chrome://extensions/` in Chrome
3. Enable "Developer mode"
4. Click "Load unpacked" and select the `extension` folder

### Firefox Development
1. Go to `about:debugging` in Firefox
2. Click "This Firefox"
3. Click "Load Temporary Add-on"
4. Select the `manifest.json` file from the `extension` folder

## License

MIT License - see [LICENSE](LICENSE) file for details

---

*Built for the Bitcoin community*
