import { CONFIG } from '../config.js';

export class NotificationManager {
  constructor() {
    this.activeNotification = null;
    this.notificationQueue = [];
  }

  show(message, type = 'success') {
    console.log('Showing notification:', message, type);

    // If there's already an active notification, queue this one
    if (this.activeNotification) {
      this.notificationQueue.push({ message, type });
      return;
    }

    this.displayNotification(message, type);
  }

  displayNotification(message, type) {
    const notification = document.getElementById('notification');
    const icon = document.getElementById('notificationIcon');
    const text = document.getElementById('notificationText');

    if (!notification || !icon || !text) {
      console.error('Notification elements not found');
      return;
    }

    // Set message and icon
    text.textContent = message;
    icon.textContent = this.getIconForType(type);

    // Set styling based on type
    notification.className = `notification ${type}`;

    // Show notification
    notification.style.display = 'block';
    this.activeNotification = { message, type };

    setTimeout(() => {
      notification.classList.add('show');
    }, 10);

    // Auto-hide after configured duration
    setTimeout(() => {
      this.hide();
    }, CONFIG.NOTIFICATION_DURATION);
  }

  hide() {
    const notification = document.getElementById('notification');
    if (!notification) return;

    notification.classList.remove('show');

    setTimeout(() => {
      notification.style.display = 'none';
      this.activeNotification = null;

      // Show next notification in queue
      this.processQueue();
    }, 300);
  }

  processQueue() {
    if (this.notificationQueue.length > 0) {
      const next = this.notificationQueue.shift();
      setTimeout(() => {
        this.displayNotification(next.message, next.type);
      }, 100); // Small delay between notifications
    }
  }

  getIconForType(type) {
    switch (type) {
      case 'success':
        return '✓';
      case 'error':
        return '✗';
      case 'warning':
        return '⚠';
      case 'info':
        return 'ℹ';
      default:
        return '✓';
    }
  }

  // Predefined notification types for common scenarios
  showSuccess(message) {
    this.show(message, 'success');
  }

  showError(message) {
    this.show(message, 'error');
  }

  showWarning(message) {
    this.show(message, 'warning');
  }

  showInfo(message) {
    this.show(message, 'info');
  }

  // Common notification messages
  showPinSuccess() {
    this.showSuccess('PIN changed successfully!');
  }

  showPinError(remainingAttempts) {
    if (remainingAttempts > 0) {
      this.showError(`Invalid PIN. ${remainingAttempts} attempts remaining.`);
    } else {
      this.showError('Too many failed attempts. Account locked.');
    }
  }

  showLockoutWarning(remainingTime) {
    this.showError(`Too many failed attempts. Please wait ${remainingTime} seconds before trying again.`);
  }

  showAddressAdded(address) {
    this.showSuccess(`Address ${address.slice(0, 8)}... added to watchlist`);
  }

  showAddressRemoved(address) {
    this.showInfo(`Address ${address.slice(0, 8)}... removed from watchlist`);
  }

  showAddressRefreshed(address) {
    this.showSuccess(`Address ${address.slice(0, 8)}... refreshed`);
  }

  showDataReset() {
    this.showSuccess('All data has been reset');
  }

  showRateLimitWarning() {
    this.showWarning('Rate limited - please wait before making more requests');
  }

  showConnectionError() {
    this.showError('Connection failed - please check your internet connection');
  }

  showAPIError() {
    this.showError('API error - please try again later');
  }

  showSettingsSaved() {
    this.showSuccess('Settings saved successfully');
  }

  showCurrencyChanged(currency) {
    this.showSuccess(`Currency changed to ${currency.toUpperCase()}`);
  }

  showUnitChanged(unit) {
    this.showSuccess(`Unit changed to ${unit}`);
  }

  showBackupCreated() {
    this.showSuccess('Backup created successfully');
  }

  showBackupRestored() {
    this.showSuccess('Backup restored successfully');
  }

  showImportError() {
    this.showError('Import failed - invalid data format');
  }

  showExportError() {
    this.showError('Export failed - please try again');
  }

  // Clear all notifications
  clearAll() {
    this.notificationQueue = [];
    this.hide();
  }

  // Get notification queue length for debugging
  getQueueLength() {
    return this.notificationQueue.length;
  }

  // Check if notification is currently active
  isActive() {
    return this.activeNotification !== null;
  }

  // Force show a notification (clears queue and shows immediately)
  forceShow(message, type = 'success') {
    this.clearAll();
    this.displayNotification(message, type);
  }

  // Batch notifications (useful for multiple validation errors)
  showBatch(notifications, delay = 1000) {
    notifications.forEach((notification, index) => {
      setTimeout(() => {
        if (typeof notification === 'string') {
          this.show(notification);
        } else {
          this.show(notification.message, notification.type || 'success');
        }
      }, index * delay);
    });
  }

  // Create a temporary notification that doesn't interfere with the main system
  showToast(message, duration = 2000) {
    const toast = document.createElement('div');
    toast.className = 'notification toast';
    toast.style.cssText = `
      position: fixed;
      top: 60px;
      right: 20px;
      background: linear-gradient(135deg, #059669 0%, #047857 100%);
      color: white;
      border-radius: 8px;
      padding: 8px 12px;
      font-size: 12px;
      z-index: 3001;
      transform: translateX(100%);
      transition: transform 0.3s ease;
    `;

    toast.textContent = message;
    document.body.appendChild(toast);

    // Show toast
    setTimeout(() => {
      toast.style.transform = 'translateX(0)';
    }, 10);

    // Hide and remove toast
    setTimeout(() => {
      toast.style.transform = 'translateX(100%)';
      setTimeout(() => {
        if (toast.parentNode) {
          toast.parentNode.removeChild(toast);
        }
      }, 300);
    }, duration);
  }
}