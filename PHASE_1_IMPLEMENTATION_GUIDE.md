# Phase 1 Implementation Guide
## Bitcoin Mini - Feature Roadmap & Implementation Plans

**Document Version:** 1.0
**Created:** 2025-09-30
**Status:** Planning Phase

---

## 📊 Current State Assessment

### ✅ Already Completed (Phase 1 Features)
- **Multiple Fiat Currencies** - 58 currencies fully implemented
- **Basic Address Management** - Add/remove/label functionality working
- **Basic Notifications** - In-app toast notifications functional

### ⚠️ Partially Completed
- **Enhanced Address Management** - 50% done (import/export code exists, needs UI)
- **Notification Controls** - 25% done (basic system exists, needs enhancements)

### ❌ Not Started
- **Price Alerts** - Most critical missing feature
- **Historical Price Charts** - Deferred to Phase 2

---

## 🎯 Phase 1 Feature Implementation Order

### Priority 1: Price Alerts ⭐⭐⭐
### Priority 2: Enhanced Address Management ⭐⭐
### Priority 3: Notification Controls ⭐

---

# Feature #1: Price Alerts

## Overview
**Priority:** HIGHEST (⭐⭐⭐)
**Effort:** Medium (4-6 weeks)
**User Impact:** Very High
**Branch Name:** `feature/price-alerts`

## Business Justification
- Most requested feature across ALL competitors
- Universal user demand proven by market research
- Easy to implement with existing notification infrastructure
- High differentiation potential (privacy-first alerts)

## User Stories

### US-1: Set Price Alert Threshold
**As a** Bitcoin Mini user
**I want to** set a target BTC price (high or low)
**So that** I can be notified when Bitcoin reaches my target

**Acceptance Criteria:**
- User can set "alert me when price goes above $X"
- User can set "alert me when price goes below $Y"
- User can set percentage-based alerts (e.g., "alert me if price drops 5%")
- User can enable/disable alerts without deleting them
- Alerts persist across browser sessions

### US-2: Receive Price Alert Notification
**As a** Bitcoin Mini user
**I want to** receive a browser notification when my alert triggers
**So that** I can take action immediately

**Acceptance Criteria:**
- Browser notification appears when threshold crossed
- Notification shows: current price, threshold, direction (above/below)
- Notification includes sound (if enabled in settings)
- Alert can trigger once or repeatedly
- Alert history is logged

### US-3: Manage Multiple Alerts
**As a** Bitcoin Mini user
**I want to** create and manage multiple price alerts
**So that** I can track different price targets

**Acceptance Criteria:**
- User can create unlimited alerts
- User can view all active alerts in a list
- User can edit existing alerts
- User can delete alerts
- User can see alert history (triggered alerts)

## Technical Implementation

### Data Schema

```javascript
// StorageService.js - Add to storage schema
{
  priceAlerts: [
    {
      id: 'uuid-v4-string',
      type: 'above' | 'below' | 'percent_change',
      threshold: 95000, // USD or selected currency
      currency: 'usd',
      enabled: true,
      triggerOnce: false, // or repeat
      createdAt: 1234567890,
      lastTriggered: null,
      timesTriggered: 0
    }
  ],
  alertHistory: [
    {
      alertId: 'uuid',
      triggeredAt: 1234567890,
      price: 95500,
      threshold: 95000,
      type: 'above'
    }
  ]
}
```

### Files to Modify/Create

#### 1. `extension/js/services/AlertService.js` (NEW FILE)
```javascript
export class AlertService {
  constructor(storageService, notificationManager) {
    this.storageService = storageService;
    this.notificationManager = notificationManager;
    this.alerts = [];
    this.checkInterval = null;
  }

  async loadAlerts() {
    // Load alerts from storage
  }

  async saveAlerts() {
    // Save alerts to storage
  }

  async createAlert(alertConfig) {
    // Create new alert
    // Validate threshold
    // Add to alerts array
    // Save to storage
  }

  async updateAlert(alertId, updates) {
    // Update existing alert
  }

  async deleteAlert(alertId) {
    // Remove alert
  }

  async checkAlerts(currentPrice, currency) {
    // Compare currentPrice against all enabled alerts
    // Trigger notifications for crossed thresholds
    // Log to history
    // Handle triggerOnce vs repeat logic
  }

  startMonitoring() {
    // Start interval to check price against alerts
    // Should sync with existing price refresh logic
  }

  stopMonitoring() {
    // Stop monitoring
  }
}
```

**Key Methods:**
- `createAlert(type, threshold, options)` - Add new alert
- `checkAlerts(currentPrice, currency)` - Compare price vs thresholds
- `triggerAlert(alert, currentPrice)` - Fire notification
- `getActiveAlerts()` - Return enabled alerts
- `getAlertHistory(limit)` - Return recent triggered alerts

#### 2. `extension/js/managers/NotificationManager.js` (MODIFY)
Add browser notification support:

```javascript
async requestNotificationPermission() {
  // Request browser notification permission
  if (Notification.permission === 'default') {
    return await Notification.requestPermission();
  }
  return Notification.permission;
}

showPriceAlert(alert, currentPrice) {
  // Show browser notification with:
  // - Current price
  // - Threshold crossed
  // - Direction (above/below)
  // - Sound (if enabled)

  const notification = new Notification('Bitcoin Mini - Price Alert', {
    body: `Bitcoin is now $${currentPrice} (${alert.type} $${alert.threshold})`,
    icon: '../icon128.png',
    badge: '../icon48.png',
    requireInteraction: false,
    silent: !this.soundEnabled
  });

  // Play sound if enabled
  if (this.soundEnabled) {
    this.playAlertSound();
  }
}

playAlertSound() {
  // Play notification sound
  const audio = new Audio('../sounds/alert.mp3');
  audio.play();
}
```

#### 3. `extension/popup.html` (MODIFY)
Add alerts UI to Settings modal:

```html
<!-- In Settings Modal, add new section -->
<div class="settings-section">
  <h4>Price Alerts</h4>
  <p>Get notified when Bitcoin reaches your target price.</p>

  <button id="managePriceAlertsBtn" class="settings-action-btn">
    <svg><!-- bell icon --></svg>
    Manage Price Alerts
  </button>
</div>

<!-- New Modal: Price Alerts Manager -->
<div id="priceAlertsModal" class="modal-overlay" style="display: none;">
  <div class="modal-content alert-modal">
    <h3>Price Alerts</h3>

    <!-- Create New Alert -->
    <div class="alert-create-section">
      <h4>Create New Alert</h4>
      <div class="alert-form">
        <select id="alertType">
          <option value="above">Alert when price goes above</option>
          <option value="below">Alert when price goes below</option>
        </select>

        <input type="number" id="alertThreshold" placeholder="Enter price threshold">

        <label>
          <input type="checkbox" id="alertTriggerOnce" checked>
          Trigger only once (disable after firing)
        </label>

        <button id="createAlertBtn">Create Alert</button>
      </div>
    </div>

    <!-- Active Alerts List -->
    <div class="alert-list-section">
      <h4>Active Alerts</h4>
      <div id="activeAlertsList">
        <!-- Dynamically populated -->
      </div>
    </div>

    <!-- Alert History -->
    <div class="alert-history-section">
      <h4>Recent Triggers</h4>
      <div id="alertHistoryList">
        <!-- Dynamically populated -->
      </div>
    </div>

    <div class="modal-buttons">
      <button id="closeAlertsModalBtn" class="cancel-btn">Close</button>
    </div>
  </div>
</div>
```

#### 4. `extension/js/managers/UIManager.js` (MODIFY)
Add alert UI rendering methods:

```javascript
renderActiveAlerts(alerts) {
  // Render list of active alerts
  // Each alert row: threshold, type, enabled toggle, delete button
}

renderAlertHistory(history) {
  // Render list of triggered alerts
  // Show: time, price, threshold, type
}

showAlertCreatedNotification(alert) {
  // Show success toast
}

showAlertTriggeredNotification(alert, price) {
  // Show alert triggered toast
}
```

#### 5. `extension/js/BitcoinMini.js` (MODIFY)
Integrate AlertService:

```javascript
import { AlertService } from './services/AlertService.js';

constructor() {
  // ... existing code ...
  this.alertService = new AlertService(this.storageService, this.notificationManager);
}

async init() {
  // ... existing code ...

  // Load and start alert monitoring
  await this.alertService.loadAlerts();
  this.alertService.startMonitoring();
}

async refreshPriceIfNeeded(force = false) {
  // ... existing price refresh code ...

  // After price update, check alerts
  if (priceData && priceData.currentPrice) {
    await this.alertService.checkAlerts(
      priceData.currentPrice,
      this.storageService.getCurrency()
    );
  }
}
```

#### 6. `extension/css/popup.css` (MODIFY)
Add styles for alert UI:

```css
.alert-modal {
  max-width: 500px;
}

.alert-create-section {
  background: rgba(255,255,255,0.05);
  padding: 12px;
  border-radius: 6px;
  margin-bottom: 16px;
}

.alert-form {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.alert-list-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px;
  background: rgba(255,255,255,0.03);
  border-radius: 4px;
  margin-bottom: 8px;
}

.alert-enabled-toggle {
  /* Toggle switch styles */
}

.alert-history-item {
  padding: 6px;
  border-left: 3px solid #4a90e2;
  margin-bottom: 6px;
  font-size: 12px;
}
```

#### 7. `extension/manifest.json` (MODIFY)
Add notifications permission:

```json
{
  "permissions": [
    "storage",
    "notifications"  // ADD THIS
  ]
}
```

### Testing Plan

#### Automated Tests (`test-alerts.js`)
```javascript
// Test alert creation
// Test alert threshold comparison
// Test alert triggering
// Test alert history
// Test enable/disable alerts
// Test delete alerts
```

#### Manual Testing Checklist
- [ ] Create "above" alert → Verify it triggers when price crosses threshold
- [ ] Create "below" alert → Verify it triggers when price drops
- [ ] Create multiple alerts → Verify all work independently
- [ ] Toggle alert enabled/disabled → Verify monitoring respects setting
- [ ] Set "trigger once" → Verify alert disables after firing
- [ ] Set "repeat" → Verify alert fires multiple times
- [ ] Delete alert → Verify it no longer triggers
- [ ] Browser notification permission → Verify request flow
- [ ] Sound enabled/disabled → Verify audio playback
- [ ] Alert history → Verify triggered alerts are logged
- [ ] Reload extension → Verify alerts persist

### Edge Cases to Handle
1. **Currency change** - Convert existing alert thresholds or warn user
2. **Rapid price changes** - Debounce alert checks to avoid spam
3. **Notification permission denied** - Fallback to in-app notifications
4. **Multiple alerts crossing simultaneously** - Batch notifications
5. **Extension closed** - Service worker needed for background alerts (Chrome MV3)

### Performance Considerations
- Alert checking should piggyback on existing price refresh (don't add new API calls)
- Use efficient comparison logic (Map/Set for O(1) lookups)
- Limit alert history to last 100 entries to avoid storage bloat
- Debounce alert checks to 1 per price update

---

# Feature #2: Enhanced Address Management

## Overview
**Priority:** High (⭐⭐)
**Effort:** Low-Medium (2-3 weeks)
**User Impact:** Medium-High
**Branch Name:** `feature/enhanced-address-management`

## Business Justification
- Import/export functionality already exists in code (easy win!)
- Users want better organization for multiple addresses
- Competitive parity with portfolio tracking tools
- Builds on existing watchlist feature

## User Stories

### US-4: Import/Export Address List
**As a** Bitcoin Mini user
**I want to** export my address watchlist to a file
**So that** I can back up my data or transfer to another device

**Acceptance Criteria:**
- User can export watchlist to JSON file
- Export includes: addresses, labels, categories, notes
- User can import previously exported JSON file
- Import validates addresses and merges with existing watchlist
- Import prevents duplicates

### US-5: Categorize Addresses
**As a** Bitcoin Mini user
**I want to** organize addresses into categories
**So that** I can group related addresses (e.g., "Savings", "Trading", "Cold Storage")

**Acceptance Criteria:**
- User can create custom categories
- User can assign address to one or more categories
- User can filter watchlist by category
- Categories persist across sessions

### US-6: Search and Filter Addresses
**As a** Bitcoin Mini user
**I want to** search my address watchlist
**So that** I can quickly find specific addresses

**Acceptance Criteria:**
- Search input above watchlist
- Search filters by: address, label, category, notes
- Search is case-insensitive
- Search updates results in real-time

### US-7: Add Notes to Addresses
**As a** Bitcoin Mini user
**I want to** add notes/comments to each address
**So that** I can remember important details

**Acceptance Criteria:**
- Notes field per address (optional)
- Notes are searchable
- Notes display in expanded view or tooltip

## Technical Implementation

### Data Schema Updates

```javascript
// StorageService.js - Update address schema
{
  watchlist: [
    {
      address: 'bc1q...',
      label: 'My Savings',
      balance_btc: 0.5,
      quantum_risk: 'low',
      categories: ['Savings', 'Cold Storage'], // NEW
      notes: 'Bought during 2024 dip', // NEW
      color: '#4a90e2', // NEW (optional color coding)
      added_at: 1234567890,
      last_updated: 1234567890 // NEW
    }
  ],
  categories: [ // NEW
    { id: 'uuid', name: 'Savings', color: '#10b981' },
    { id: 'uuid', name: 'Trading', color: '#f59e0b' },
    { id: 'uuid', name: 'Cold Storage', color: '#6366f1' }
  ]
}
```

### Files to Modify/Create

#### 1. `extension/js/services/StorageService.js` (MODIFY)
Already has `exportData()` and `importData()` methods! Just need to:
- Update schema to include categories and notes
- Add `getCategories()`, `addCategory()`, `deleteCategory()` methods

```javascript
// Add to StorageService class
async getCategories() {
  return this.categories || [];
}

async addCategory(name, color) {
  const category = {
    id: crypto.randomUUID(),
    name: name.trim(),
    color: color || this.generateRandomColor()
  };
  this.categories.push(category);
  await this.saveData();
  return category;
}

async deleteCategory(categoryId) {
  // Remove category from list
  // Remove category from all addresses
}

generateRandomColor() {
  const colors = ['#10b981', '#f59e0b', '#6366f1', '#ec4899', '#8b5cf6'];
  return colors[Math.floor(Math.random() * colors.length)];
}
```

#### 2. `extension/popup.html` (MODIFY)

**Add Import/Export buttons to address section:**
```html
<!-- In Add Address card, after watchlist table -->
<div class="address-actions" style="margin-top: 12px; display: flex; gap: 8px;">
  <button id="exportAddressesBtn" class="secondary-btn">
    📤 Export Addresses
  </button>
  <button id="importAddressesBtn" class="secondary-btn">
    📥 Import Addresses
  </button>
  <input type="file" id="importFileInput" accept=".json" style="display: none;">
</div>
```

**Add search/filter above watchlist:**
```html
<!-- Above watchlist table -->
<div class="watchlist-filters" style="margin-bottom: 8px;">
  <input
    id="addressSearchInput"
    type="text"
    placeholder="Search addresses, labels, notes..."
    style="width: 100%; padding: 6px; border-radius: 4px;"
  >

  <div id="categoryFilterButtons" style="margin-top: 6px; display: flex; gap: 4px; flex-wrap: wrap;">
    <!-- Dynamically populated category filter buttons -->
    <button class="category-filter-btn active" data-category="all">All</button>
  </div>
</div>
```

**Modify watchlist table to show categories/notes:**
```html
<table style="margin-top: 8px;">
  <thead>
    <tr>
      <th>Label</th>
      <th>Address</th>
      <th>Balance</th>
      <th>Categories</th> <!-- NEW -->
      <th>Risk</th>
      <th style="text-align: right;">Action</th>
    </tr>
  </thead>
  <tbody id="watchRows"></tbody>
</table>
```

**Add category/notes to address input form:**
```html
<!-- In Add Address section -->
<input id="addr" type="text" placeholder="Bitcoin address">
<input id="label" type="text" placeholder="Label (optional)">
<input id="addressNotes" type="text" placeholder="Notes (optional)"> <!-- NEW -->

<div class="category-selection" style="margin: 8px 0;"> <!-- NEW -->
  <label>Categories:</label>
  <div id="categoriesCheckboxes">
    <!-- Dynamically populated -->
  </div>
  <button id="addNewCategoryBtn" class="small-link-btn">+ Add Category</button>
</div>

<button id="addWatchBtn">Add</button>
```

#### 3. `extension/js/managers/UIManager.js` (MODIFY)

Add methods:
```javascript
renderWatchlistFiltered(searchQuery, categoryFilter) {
  // Filter watchlist based on search query and category
  // Update table with filtered results
}

renderCategoryFilterButtons(categories) {
  // Render category filter buttons
  // Add click handlers to filter watchlist
}

renderCategoryCheckboxes(categories) {
  // Render category checkboxes in add address form
}

showCategoryTags(address) {
  // Render category tags/badges for address in table
}

exportAddressesToFile() {
  // Create JSON blob from exportData()
  // Trigger download
  const data = await this.storageService.exportData();
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `bitcoin-mini-addresses-${Date.now()}.json`;
  a.click();
}

importAddressesFromFile(file) {
  // Read file
  // Parse JSON
  // Call storageService.importData()
  // Show success/error notification
}
```

#### 4. `extension/js/BitcoinMini.js` (MODIFY)

Add event handlers:
```javascript
handleClick(e) {
  // ... existing handlers ...

  else if (target.id === 'exportAddressesBtn') {
    this.exportAddresses();
  } else if (target.id === 'importAddressesBtn') {
    this.triggerImportFile();
  } else if (target.id === 'addNewCategoryBtn') {
    this.showAddCategoryDialog();
  } else if (target.classList.contains('category-filter-btn')) {
    this.filterByCategory(target.dataset.category);
  }
}

handleInput(e) {
  // ... existing handlers ...

  else if (target.id === 'addressSearchInput') {
    this.filterWatchlist(target.value);
  }
}

async exportAddresses() {
  try {
    await this.uiManager.exportAddressesToFile();
    this.notificationManager.showSuccess('Addresses exported successfully');
  } catch (error) {
    this.notificationManager.showError('Failed to export addresses');
  }
}

triggerImportFile() {
  const fileInput = document.getElementById('importFileInput');
  fileInput.click();
  fileInput.onchange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      await this.importAddresses(file);
    }
  };
}

async importAddresses(file) {
  try {
    await this.uiManager.importAddressesFromFile(file);
    this.notificationManager.showSuccess('Addresses imported successfully');
    this.uiManager.renderWatchlist();
  } catch (error) {
    this.notificationManager.showError('Failed to import addresses: ' + error.message);
  }
}

filterWatchlist(searchQuery) {
  // Real-time filter as user types
  this.uiManager.renderWatchlistFiltered(searchQuery, this.currentCategoryFilter);
}

filterByCategory(categoryId) {
  this.currentCategoryFilter = categoryId;
  this.uiManager.renderWatchlistFiltered(this.currentSearchQuery, categoryId);
}
```

### Testing Plan

#### Automated Tests
```javascript
// Test export creates valid JSON
// Test import validates and merges data
// Test search filters correctly
// Test category assignment
// Test notes storage/retrieval
```

#### Manual Testing Checklist
- [ ] Export addresses → Verify JSON file downloads
- [ ] Import addresses → Verify addresses added without duplicates
- [ ] Import invalid JSON → Verify error handling
- [ ] Add category → Verify category appears in filters
- [ ] Assign category to address → Verify tag appears
- [ ] Filter by category → Verify only matching addresses shown
- [ ] Search by address → Verify results
- [ ] Search by label → Verify results
- [ ] Search by notes → Verify results
- [ ] Add notes to address → Verify notes persist
- [ ] Delete category → Verify removed from all addresses

---

# Feature #3: Notification Controls

## Overview
**Priority:** Medium (⭐)
**Effort:** Low (1 week)
**User Impact:** Medium
**Branch Name:** `feature/notification-controls`

## Business Justification
- Low-hanging fruit (notification system already exists)
- Nice UX polish
- Enables better price alert experience
- User customization increases engagement

## User Stories

### US-8: Customize Notification Sound
**As a** Bitcoin Mini user
**I want to** choose notification sounds or disable them
**So that** alerts match my preferences

**Acceptance Criteria:**
- User can enable/disable notification sounds
- User can select from 3-5 sound options
- User can test sound before saving
- Setting persists across sessions

### US-9: Control Notification Frequency
**As a** Bitcoin Mini user
**I want to** control how often I receive notifications
**So that** I'm not overwhelmed by alerts

**Acceptance Criteria:**
- User can set minimum interval between notifications (1min, 5min, 15min, 1hr)
- System respects frequency limit
- Critical alerts can override frequency limit (optional setting)

### US-10: Do Not Disturb Schedule
**As a** Bitcoin Mini user
**I want to** set quiet hours when notifications are muted
**So that** I'm not disturbed during sleep/work

**Acceptance Criteria:**
- User can set DND start/end time
- Notifications are silenced during DND hours
- User can quickly toggle DND on/off
- DND respects user's timezone

## Technical Implementation

### Data Schema

```javascript
// StorageService.js - Add notification settings
{
  notificationSettings: {
    soundEnabled: true,
    soundType: 'chime', // 'chime', 'bell', 'beep', 'silent'
    minInterval: 300000, // 5 minutes in ms
    dndEnabled: false,
    dndStartTime: '22:00', // 24-hour format
    dndEndTime: '07:00',
    respectDndForAlerts: true // Apply DND to price alerts
  }
}
```

### Files to Modify/Create

#### 1. `extension/popup.html` (MODIFY)
Add to Settings modal:

```html
<div class="settings-section">
  <h4>Notifications</h4>
  <p>Customize how you receive alerts and notifications.</p>

  <!-- Sound Settings -->
  <div class="notification-setting">
    <label>
      <input type="checkbox" id="notificationSoundEnabled" checked>
      Enable notification sounds
    </label>
  </div>

  <div class="notification-setting" id="soundTypeSection">
    <label>Sound Type:</label>
    <select id="notificationSoundType">
      <option value="chime">Chime</option>
      <option value="bell">Bell</option>
      <option value="beep">Beep</option>
      <option value="pop">Pop</option>
    </select>
    <button id="testSoundBtn" class="small-btn">Test Sound</button>
  </div>

  <!-- Frequency Settings -->
  <div class="notification-setting">
    <label>Minimum interval between notifications:</label>
    <select id="notificationInterval">
      <option value="0">No limit</option>
      <option value="60000">1 minute</option>
      <option value="300000">5 minutes</option>
      <option value="900000">15 minutes</option>
      <option value="3600000">1 hour</option>
    </select>
  </div>

  <!-- Do Not Disturb -->
  <div class="notification-setting">
    <label>
      <input type="checkbox" id="dndEnabled">
      Enable Do Not Disturb schedule
    </label>
  </div>

  <div class="notification-setting" id="dndScheduleSection" style="display: none;">
    <label>Quiet hours:</label>
    <div style="display: flex; gap: 8px; align-items: center;">
      <input type="time" id="dndStartTime" value="22:00">
      <span>to</span>
      <input type="time" id="dndEndTime" value="07:00">
    </div>
  </div>
</div>
```

#### 2. `extension/js/services/NotificationService.js` (NEW FILE)
Create dedicated notification service:

```javascript
export class NotificationService {
  constructor(storageService) {
    this.storageService = storageService;
    this.settings = null;
    this.lastNotificationTime = 0;
  }

  async loadSettings() {
    const data = await this.storageService.loadData();
    this.settings = data.notificationSettings || this.getDefaultSettings();
  }

  async saveSettings(settings) {
    this.settings = settings;
    await this.storageService.saveSettings({ notificationSettings: settings });
  }

  canShowNotification() {
    // Check if DND is active
    if (this.settings.dndEnabled && this.isInDndPeriod()) {
      return false;
    }

    // Check minimum interval
    if (this.settings.minInterval > 0) {
      const now = Date.now();
      if (now - this.lastNotificationTime < this.settings.minInterval) {
        return false;
      }
    }

    return true;
  }

  isInDndPeriod() {
    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();

    const [startHour, startMin] = this.settings.dndStartTime.split(':').map(Number);
    const [endHour, endMin] = this.settings.dndEndTime.split(':').map(Number);

    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;

    // Handle overnight DND (e.g., 22:00 to 07:00)
    if (startMinutes > endMinutes) {
      return currentTime >= startMinutes || currentTime < endMinutes;
    } else {
      return currentTime >= startMinutes && currentTime < endMinutes;
    }
  }

  async playSound(soundType) {
    if (!this.settings.soundEnabled) return;

    const soundFile = this.getSoundFile(soundType || this.settings.soundType);
    const audio = new Audio(soundFile);

    try {
      await audio.play();
    } catch (error) {
      console.warn('Could not play notification sound:', error);
    }
  }

  getSoundFile(soundType) {
    const sounds = {
      'chime': 'sounds/chime.mp3',
      'bell': 'sounds/bell.mp3',
      'beep': 'sounds/beep.mp3',
      'pop': 'sounds/pop.mp3'
    };
    return sounds[soundType] || sounds.chime;
  }

  getDefaultSettings() {
    return {
      soundEnabled: true,
      soundType: 'chime',
      minInterval: 300000,
      dndEnabled: false,
      dndStartTime: '22:00',
      dndEndTime: '07:00',
      respectDndForAlerts: true
    };
  }
}
```

#### 3. `extension/js/managers/NotificationManager.js` (MODIFY)
Update to use NotificationService:

```javascript
import { NotificationService } from '../services/NotificationService.js';

constructor() {
  // ... existing code ...
  this.notificationService = new NotificationService(storageService);
}

async showNotification(title, message, type = 'info') {
  // Check if notification is allowed
  if (!this.notificationService.canShowNotification()) {
    console.log('Notification suppressed (DND or rate limited)');
    return;
  }

  // Show browser notification
  if (Notification.permission === 'granted') {
    const notification = new Notification(title, {
      body: message,
      icon: '../icon128.png',
      silent: !this.notificationService.settings.soundEnabled
    });

    // Play sound separately (browser notifications may not play custom sounds)
    if (this.notificationService.settings.soundEnabled) {
      await this.notificationService.playSound();
    }

    this.notificationService.lastNotificationTime = Date.now();
  }

  // Also show in-app toast
  this.showToast(message, type);
}
```

#### 4. `extension/css/popup.css` (MODIFY)
Add styles for notification settings:

```css
.notification-setting {
  margin: 8px 0;
  padding: 8px;
  background: rgba(255,255,255,0.03);
  border-radius: 4px;
}

.notification-setting label {
  display: block;
  margin-bottom: 4px;
  font-size: 13px;
}

.notification-setting select,
.notification-setting input[type="time"] {
  background: #0b1220;
  border: 1px solid #333;
  color: #e0e7ed;
  padding: 4px 8px;
  border-radius: 4px;
}

.small-btn {
  padding: 4px 8px;
  font-size: 11px;
  background: #4a90e2;
  border: none;
  color: white;
  border-radius: 3px;
  cursor: pointer;
  margin-left: 8px;
}
```

#### 5. Add sound files to `extension/sounds/` (NEW FOLDER)
- `chime.mp3` - Pleasant chime sound
- `bell.mp3` - Bell sound
- `beep.mp3` - Simple beep
- `pop.mp3` - Pop sound

(Use royalty-free sounds or generate using Web Audio API)

#### 6. `extension/manifest.json` (MODIFY)
Add sound files to web_accessible_resources:

```json
{
  "web_accessible_resources": [
    {
      "resources": ["css/*", "js/*", "sounds/*"],
      "matches": ["<all_urls>"]
    }
  ]
}
```

### Testing Plan

#### Manual Testing Checklist
- [ ] Enable sounds → Verify notifications have sound
- [ ] Disable sounds → Verify notifications are silent
- [ ] Select different sound → Verify correct sound plays
- [ ] Test sound button → Verify preview plays
- [ ] Set minimum interval → Verify notifications respect limit
- [ ] Enable DND → Verify notifications suppressed during quiet hours
- [ ] DND overnight (22:00-07:00) → Verify works across midnight
- [ ] Save settings → Verify persist across extension reload

---

# Feature #4: Historical Price Charts (DEFERRED TO PHASE 2)

## Overview
**Priority:** Medium (but DEFERRED)
**Effort:** Medium-High (4-6 weeks)
**User Impact:** High
**Branch Name:** `feature/price-charts`

## Deferral Reason
While highly desired, charts require:
- Charting library integration (Chart.js or lightweight alternative)
- Historical price API integration
- More complex UI changes
- Performance optimization for chart rendering

**Recommendation:** Complete Features #1, #2, #3 first (higher ROI for less effort), then tackle charts in Phase 2.

## Brief Implementation Notes (for future reference)

### Technical Approach
1. **Library Choice:** Use lightweight Chart.js alternative (e.g., `chart.xkcd`, `frappe-charts`)
2. **Data Source:** CoinGecko's `/market_chart` endpoint (already in config.js)
3. **Cache Strategy:** Cache historical data locally (1-hour refresh)
4. **UI Location:** Add chart view toggle in price card

### Data Points Needed
- 24h: Hourly prices (24 data points)
- 7d: 4-hour intervals (42 data points)
- 30d: Daily prices (30 data points)
- 1y: Weekly prices (52 data points)

---

# Implementation Workflow

## Branching Strategy

```bash
# Feature #1: Price Alerts
git checkout main
git pull
git checkout -b feature/price-alerts
# ... implement feature ...
# ... test thoroughly ...
git add .
git commit -m "feat: add price alerts with browser notifications"
node test-runner.js  # Ensure tests pass
git push -u origin feature/price-alerts
# Create PR, review, merge

# Feature #2: Enhanced Address Management
git checkout main
git pull
git checkout -b feature/enhanced-address-management
# ... implement feature ...
git commit -m "feat: add address import/export, categories, and search"
node test-runner.js
git push -u origin feature/enhanced-address-management
# Create PR, review, merge

# Feature #3: Notification Controls
git checkout main
git pull
git checkout -b feature/notification-controls
# ... implement feature ...
git commit -m "feat: add notification sound, frequency, and DND settings"
node test-runner.js
git push -u origin feature/notification-controls
# Create PR, review, merge
```

## Testing Before Merge
Each feature branch MUST pass:
1. ✅ `node test-runner.js` - All tests pass
2. ✅ Manual testing checklist complete
3. ✅ No console errors in browser dev tools
4. ✅ Extension loads in Chrome/Firefox
5. ✅ Existing features still work (no regression)

## Estimated Timeline

| Feature | Effort | Calendar Time | Cumulative |
|---------|--------|---------------|------------|
| Price Alerts | 4-6 weeks | ~1.5 months | 1.5 months |
| Enhanced Address Mgmt | 2-3 weeks | ~3 weeks | 2.25 months |
| Notification Controls | 1 week | ~1 week | 2.5 months |
| **Total Phase 1** | **7-10 weeks** | **~2.5-3 months** | **2.5-3 months** |

*Note: Timeline assumes 1 developer working part-time (~20 hrs/week)*

---

# Success Metrics

## Feature #1: Price Alerts
- **Adoption:** 60%+ of users create at least one alert within 30 days
- **Engagement:** 40%+ of users have active alerts at any time
- **Feedback:** User rating remains 4.5+ stars after launch

## Feature #2: Enhanced Address Management
- **Adoption:** 30%+ of users use categories or notes
- **Utility:** 20%+ of users export/import addresses
- **Feedback:** Positive mentions in reviews about "better organization"

## Feature #3: Notification Controls
- **Adoption:** 50%+ of users customize notification settings
- **Satisfaction:** <5% of users report notification annoyance
- **Engagement:** No drop in active users after launch

---

# Risk Mitigation

## Technical Risks

### Risk: Browser notification permission denied
**Mitigation:**
- Fallback to in-app toasts
- Clear explanation of why permission is needed
- Allow alerts to work without browser notifications

### Risk: Price alert spam (rapid price changes)
**Mitigation:**
- Debounce alert checks (max 1 per price update)
- Enforce minimum 30-second interval between same alert triggers
- User setting for alert cooldown period

### Risk: Import corrupts existing data
**Mitigation:**
- Validate JSON schema before import
- Show preview of import before confirming
- Create automatic backup before import
- Add "undo" feature for 1 minute after import

### Risk: Performance degradation with many alerts
**Mitigation:**
- Limit alerts to 50 per user
- Use efficient data structures (Map for O(1) lookups)
- Optimize comparison logic
- Profile and benchmark with 50+ alerts

## User Experience Risks

### Risk: Feature complexity overwhelms users
**Mitigation:**
- Progressive disclosure (hide advanced features initially)
- Tooltips and help text throughout
- Video tutorial or GIF demos
- Sensible defaults

### Risk: Settings bloat
**Mitigation:**
- Group related settings
- Use tabbed interface if settings grow too large
- Keep defaults appropriate for 80% of users

---

# Post-Launch Plan

## Phase 1 Complete → Phase 2 Planning

After completing Features #1-3:
1. **Gather User Feedback** (2 weeks)
   - Monitor reviews and GitHub issues
   - Track feature adoption metrics
   - Survey active users

2. **Prioritize Phase 2** (1 week)
   - Historical price charts (HIGH)
   - Lightning Network integration (HIGH)
   - Portfolio tracking with cost basis (MEDIUM)
   - Transaction monitoring (MEDIUM)

3. **Begin Phase 2 Development**
   - Start with highest ROI feature
   - Follow same branching/testing workflow

---

# Appendix: Quick Reference

## Useful Commands

```bash
# Run tests
node test-runner.js

# Load extension in Chrome
# 1. Go to chrome://extensions/
# 2. Enable Developer Mode
# 3. Click "Load Unpacked"
# 4. Select extension/ folder

# Create feature branch
git checkout -b feature/name

# Check git status
git status

# Stage changes
git add .

# Commit with message
git commit -m "feat: description"

# Push branch
git push -u origin feature/name
```

## File Reference

| Component | File Path |
|-----------|-----------|
| Main logic | `extension/js/BitcoinMini.js` |
| Storage | `extension/js/services/StorageService.js` |
| API calls | `extension/js/services/ApiService.js` |
| UI rendering | `extension/js/managers/UIManager.js` |
| Notifications | `extension/js/managers/NotificationManager.js` |
| HTML | `extension/popup.html` |
| Styles | `extension/css/popup.css` |
| Config | `extension/js/config.js` |
| Manifest | `extension/manifest.json` |

## Contact & Support

- **GitHub Issues:** https://github.com/vabraham/bitcoin-mini/issues
- **Documentation:** Check CLAUDE.md for testing guidelines

---

**Document End** - Version 1.0
