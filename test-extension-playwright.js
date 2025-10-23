/**
 * Playwright script to load and test the Bitcoin Mini extension
 * Run with: node test-extension-playwright.js
 */

import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function testExtension() {
  console.log('🚀 Starting Playwright extension test...\n');

  // Launch browser with extension loaded
  const extensionPath = path.join(__dirname, 'extension');
  console.log(`📦 Loading extension from: ${extensionPath}\n`);

  const context = await chromium.launchPersistentContext('', {
    headless: false,
    args: [
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`,
      '--no-sandbox'
    ]
  });

  // Wait for extension to load
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Get the first page (background or popup)
  let pages = context.pages();
  console.log(`📄 Initial pages: ${pages.length}\n`);

  // Create a new page to navigate
  const page = await context.newPage();

  // Navigate to chrome://extensions to get the extension ID
  console.log('🔍 Getting extension ID...\n');
  await page.goto('chrome://extensions');
  await page.waitForTimeout(1000);

  // Enable developer mode and get extension ID
  const extensionId = await page.evaluate(() => {
    const manager = document.querySelector('extensions-manager');
    if (!manager || !manager.shadowRoot) return null;

    const items = manager.shadowRoot.querySelectorAll('extensions-item');
    for (const item of items) {
      const name = item.getAttribute('name');
      if (name && name.includes('Bitcoin Mini')) {
        return item.getAttribute('id');
      }
    }
    return null;
  });

  if (!extensionId) {
    console.log('❌ Could not find extension ID. Extension may not be loaded.\n');
    console.log('Attempting to use service worker method...\n');

    // Alternative: Get extension ID from service worker
    const serviceWorkers = await context.serviceWorkers();
    if (serviceWorkers.length > 0) {
      const workerUrl = serviceWorkers[0].url();
      const match = workerUrl.match(/chrome-extension:\/\/([a-z]+)\//);
      if (match) {
        const id = match[1];
        console.log(`✅ Found extension ID from service worker: ${id}\n`);
        await testPopup(page, id);
        return;
      }
    }

    console.log('❌ Could not determine extension ID\n');
    await context.close();
    return;
  }

  console.log(`✅ Found extension ID: ${extensionId}\n`);
  await testPopup(page, extensionId);
}

async function testPopup(page, extensionId) {
  // Navigate to popup
  const popupUrl = `chrome-extension://${extensionId}/popup.html`;
  console.log(`🌐 Navigating to: ${popupUrl}\n`);

  await page.goto(popupUrl);
  await page.waitForTimeout(2000); // Wait for JS to initialize

  console.log('📸 Taking screenshot of main popup...\n');
  await page.screenshot({ path: 'test-results/01-main-popup.png' });

  // Check for console errors
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log(`[CONSOLE ERROR] ${msg.text()}`);
    }
  });

  // Click alerts button
  console.log('🔔 Opening Price Alerts modal...\n');
  try {
    await page.click('#alertsBtn');
    await page.waitForTimeout(1000);

    console.log('📸 Taking screenshot of alerts modal...\n');
    await page.screenshot({ path: 'test-results/02-alerts-modal.png' });

    // Get alert modal text content
    const currentPriceText = await page.textContent('#alertCurrentPrice');
    console.log(`💰 Current price displayed: "${currentPriceText}"\n`);

    // Check if USD prefix exists
    if (currentPriceText && currentPriceText.includes('USD')) {
      console.log('❌ ERROR: Still showing USD prefix!\n');
    } else if (currentPriceText && currentPriceText.startsWith('$')) {
      console.log('✅ SUCCESS: Using $ symbol correctly!\n');
    } else {
      console.log(`ℹ️  Current price text: "${currentPriceText}"\n`);
    }

    // Check for toggles
    const toggles = await page.$$('.toggle-switch-inline');
    console.log(`🎛️  Found ${toggles.length} inline toggles\n`);

  } catch (error) {
    console.log(`❌ Error clicking alerts button: ${error.message}\n`);
  }

  // Keep browser open for manual inspection
  console.log('✨ Test complete! Browser will stay open for inspection.');
  console.log('   Screenshots saved to test-results/ folder');
  console.log('   Press Ctrl+C to exit\n');

  // Don't close - keep open for inspection
  await new Promise(() => {});
}

testExtension().catch(console.error);
