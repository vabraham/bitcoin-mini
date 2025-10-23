# Bitcoin Mini - Development Guidelines

## Pre-Merge Testing Checklist

Before merging any changes, **ALL** of the following must pass:

### ✅ Automated Tests
```bash
node test-runner.js
```
**Expected Result:** `🎉 ALL TESTS PASSED! Address validation is ready for deployment.`
- Must show 30/30 addresses passing validation
- 100.0% success rate required
- No test failures allowed

### ✅ Manual Integration Testing

#### 1. Address Management
- [ ] **Add Valid Address**: Enter a valid Bitcoin address → Click "Add" → Verify it appears in the list
- [ ] **Add Invalid Address**: Enter invalid text → Verify error message appears
- [ ] **Remove Address**: Click remove button → Verify address disappears from list
- [ ] **Duplicate Prevention**: Try adding same address twice → Verify error message

**Test Addresses to Use:**
- Legacy: `1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa`
- SegWit: `bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4`
- Taproot: `bc1p0xlxvlhemja6c4dqv22uapctqupfhlxm9h8z3k2e72q4k9hcz7vqzk5jj0`

#### 2. Settings & Currency
- [ ] **Change Currency**: Settings → Change currency → Verify price display updates
- [ ] **Toggle Units**: Click BTC/SATS/USD buttons → Verify display changes correctly
- [ ] **Vault Timeout**: Change timeout setting → Verify behavior matches selection

#### 3. PIN Authentication
- [ ] **Set PIN**: First time → Create 4-6 digit PIN → Verify vault locks
- [ ] **Unlock**: Enter correct PIN → Verify vault unlocks
- [ ] **Wrong PIN**: Enter incorrect PIN → Verify error/lockout behavior
- [ ] **Change PIN**: Settings → Change PIN → Test old/new PIN functionality

#### 4. Data Persistence
- [ ] **Reload Test**: Add address → Close/reopen extension → Verify address persists
- [ ] **Settings Persist**: Change settings → Reload → Verify settings saved

### ✅ Browser Testing

#### Chrome/Chromium
- [ ] Load extension in Chrome → Test core functionality
- [ ] Check console for errors (F12 → Console tab)

#### Firefox (if supporting)
- [ ] Load extension in Firefox → Test core functionality
- [ ] Check console for errors

### ✅ Error Handling
- [ ] **Network Errors**: Disconnect internet → Verify graceful fallback
- [ ] **Invalid Input**: Test edge cases (empty fields, special characters)
- [ ] **Rate Limiting**: Verify API rate limit handling

## Pre-Push Requirements

**CRITICAL**: Before pushing ANY branch to remote, you MUST:

1. **Run Tests**: Execute `node test-runner.js` and verify 100% pass rate
2. **Verify No Regression**: Ensure all existing functionality still works
3. **Check Git Status**: Commit all intended changes, no untracked critical files

### Push Command Sequence
```bash
# 1. Run tests first
node test-runner.js

# 2. Only push if tests pass
git push -u origin <branch-name>
```

## Development Commands

### Testing
```bash
# Run all address validation tests
node test-runner.js

# Quick test with sample addresses
node -e "
import('./extension/js/utils/AddressValidator.js').then(({ AddressValidator }) => {
  AddressValidator.validate('1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa').then(console.log);
});"
```

### Extension Loading
```bash
# Chrome: chrome://extensions/ → Enable Developer Mode → Load Unpacked → Select 'extension' folder
# Firefox: about:debugging → This Firefox → Load Temporary Add-on → Select 'extension/manifest.json'
```

## Design & UI Guidelines

**CRITICAL**: Before making ANY UI/design changes, you MUST:

1. **Read DESIGN_GUIDE.md** - Contains all design principles, color palette, spacing system, and component patterns
2. **Follow the design system** - No random colors, spacing, or patterns
3. **Verify with Playwright MCP** (if available) - Take screenshots to confirm visual accuracy before showing user
4. **Reference existing patterns** - Look for similar UI in the codebase and maintain consistency

### Key Design Rules
- **Colors**: Only use colors from DESIGN_GUIDE.md palette (Bitcoin orange #f2a900 for primary actions)
- **Spacing**: Follow 4px/8px/12px/16px grid system
- **Layout**: "Right side" = far-right edge (use `justify-content: space-between`), not middle-right
- **Modals**: Compact (360px, 16px padding) vs Standard (400px, 24px padding)
- **Buttons**: 8px gap, primary actions use orange, secondary use transparent/gray

### When User Requests Design Changes
1. Read DESIGN_GUIDE.md to understand the pattern
2. Check similar existing components for consistency
3. If using Playwright MCP: verify visually before responding
4. Ask clarifying questions about positioning (far-right vs middle-right, etc.)

## Code Quality Guidelines

### File Structure
- **Services** (`js/services/`): API calls, data management, authentication
- **Managers** (`js/managers/`): UI management, notifications
- **Utils** (`js/utils/`): Address validation, helper functions
- **Main** (`js/BitcoinMini.js`): Core application logic

### Adding New Features
1. **Address Validation**: Update `AddressValidator.js` and add tests to `AddressValidatorTest.js`
2. **UI Changes**: Update `UIManager.js` for DOM manipulation - **MUST follow DESIGN_GUIDE.md**
3. **Settings**: Update `StorageService.js` for persistence
4. **API Integration**: Update `ApiService.js` for external calls

### Async/Await Guidelines
- Address validation is **async** - always use `await` when calling validation methods
- API calls are async - handle promises properly
- UI updates after async operations should be in try/catch blocks

## Common Issues & Solutions

### Add Button Not Working
- **Cause**: Usually async validation not being awaited
- **Fix**: Ensure `await AddressValidator.validateAddressForWatchlist()` is used
- **Test**: Run validation tests and manual add functionality

### Storage Issues
- **Cause**: Chrome storage limits or permission issues
- **Fix**: Check manifest.json permissions, test with small data sets
- **Test**: Add/remove multiple addresses, reload extension

### API Rate Limiting
- **Cause**: Too many requests to price/fee APIs
- **Fix**: Respect cache timeouts, implement exponential backoff
- **Test**: Rapid refresh button clicking

## Release Checklist

Before tagging a new version:

1. **All Tests Pass**: ✅ `node test-runner.js` shows 100% success
2. **Manual Testing**: ✅ Complete manual testing checklist above
3. **Version Bump**: Update `manifest.json` version number
4. **Extension Package**: Create new .zip file for store submission
5. **Git Tag**: Tag the release with version number

## Emergency Fixes

For critical bugs (like the recent Add button issue):

1. **Identify Root Cause**: Check async/await chains, validation flow
2. **Create Minimal Fix**: Smallest possible change to resolve issue
3. **Test Immediately**: Run both automated and manual tests
4. **Fast Track**: Skip non-critical features, focus on fix validation

---

**Remember**: Better to catch issues during development than in production. When in doubt, test more thoroughly.