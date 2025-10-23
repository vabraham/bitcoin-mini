/**
 * Automated Playwright test for Bitcoin Mini extension
 * This loads the extension properly and tests the alerts modal
 */

import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function testExtension() {
  console.log('🚀 Starting automated extension test...\n');

  const extensionPath = path.join(__dirname, 'extension');
  const userDataDir = path.join(__dirname, '.playwright-chrome-data');

  // Clean up old data
  if (fs.existsSync(userDataDir)) {
    fs.rmSync(userDataDir, { recursive: true, force: true });
  }

  console.log(`📦 Loading extension from: ${extensionPath}`);
  console.log(`💾 Using user data dir: ${userDataDir}\n`);

  // Launch browser with extension using actual Chrome
  const context = await chromium.launchPersistentContext(userDataDir, {
    headless: false,
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    args: [
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`,
    ]
  });

  console.log('⏳ Waiting for extension to load...\n');
  await new Promise(resolve => setTimeout(resolve, 3000));

  // Get all pages
  const pages = await context.pages();
  console.log(`📄 Found ${pages.length} page(s)\n`);

  let page = pages[0];
  if (!page) {
    page = await context.newPage();
  }

  // Try to find the extension ID from background contexts
  const backgrounds = context.backgroundPages();
  console.log(`🔍 Background pages: ${backgrounds.length}`);

  const serviceWorkers = context.serviceWorkers();
  console.log(`🔍 Service workers: ${serviceWorkers.length}\n`);

  let extensionId = null;

  // Try to get ID from service worker URL
  if (serviceWorkers.length > 0) {
    const workerUrl = serviceWorkers[0].url();
    console.log(`🔗 Service worker URL: ${workerUrl}`);
    const match = workerUrl.match(/chrome-extension:\/\/([a-zA-Z]+)\//);
    if (match) {
      extensionId = match[1];
      console.log(`✅ Found extension ID: ${extensionId}\n`);
    }
  }

  // If no service worker, try navigating to extensions page
  if (!extensionId) {
    console.log('🔍 Trying chrome://extensions method...\n');
    await page.goto('chrome://extensions/');
    await page.waitForTimeout(2000);

    extensionId = await page.evaluate(() => {
      const manager = document.querySelector('extensions-manager');
      if (!manager || !manager.shadowRoot) return null;

      // Enable developer mode first
      const devModeToggle = manager.shadowRoot.querySelector('#devMode');
      if (devModeToggle && !devModeToggle.checked) {
        devModeToggle.click();
      }

      // Find Bitcoin Mini extension
      const items = manager.shadowRoot.querySelectorAll('extensions-item');
      for (const item of items) {
        const name = item.shadowRoot?.querySelector('#name')?.textContent;
        if (name && name.includes('Bitcoin Mini')) {
          return item.id;
        }
      }
      return null;
    });

    if (extensionId) {
      console.log(`✅ Found extension ID via chrome://extensions: ${extensionId}\n`);
    }
  }

  if (!extensionId) {
    console.log('❌ Could not find extension ID\n');
    console.log('📋 Available service workers:');
    for (const sw of serviceWorkers) {
      console.log(`   - ${sw.url()}`);
    }
    console.log('\nℹ️  The extension may not have loaded properly.');
    console.log('   Try loading it manually in chrome://extensions first.\n');
    await context.close();
    return;
  }

  // Now test the popup
  await testPopup(page, extensionId, context);
}

async function testPopup(page, extensionId, context) {
  const popupUrl = `chrome-extension://${extensionId}/popup.html`;
  console.log(`🌐 Navigating to popup: ${popupUrl}\n`);

  try {
    await page.goto(popupUrl, { waitUntil: 'networkidle' });
  } catch (e) {
    console.log(`⚠️  Navigation warning: ${e.message}`);
    console.log('   Continuing anyway...\n');
  }

  await page.waitForTimeout(2000);

  // Listen for console messages
  const consoleLogs = [];
  page.on('console', msg => {
    const text = msg.text();
    consoleLogs.push({ type: msg.type(), text });
    if (msg.type() === 'error') {
      console.log(`   [CONSOLE ERROR] ${text}`);
    }
  });

  console.log('📸 Taking screenshot of popup...\n');
  await page.screenshot({ path: 'test-results/01-popup-automated.png' });

  // Click the alerts button
  console.log('🔔 Clicking Price Alerts button...\n');
  try {
    await page.click('#alertsBtn', { timeout: 5000 });
    await page.waitForTimeout(1500);

    console.log('📸 Taking screenshot of alerts modal...\n');
    await page.screenshot({ path: 'test-results/02-alerts-modal-automated.png' });

    // Check current price display
    const currentPriceText = await page.textContent('#alertCurrentPrice').catch(() => null);
    console.log(`💰 Current price text: "${currentPriceText}"\n`);

    if (currentPriceText) {
      if (currentPriceText.includes('USD')) {
        console.log('❌ FAIL: Still showing "USD" prefix\n');
      } else if (currentPriceText.startsWith('$')) {
        console.log('✅ PASS: Using $ symbol correctly\n');
      }
    }

    // Check for toggles
    const toggleCount = await page.$$eval('.toggle-switch-inline', toggles => toggles.length);
    console.log(`🎛️  Found ${toggleCount} inline toggle(s)`);
    if (toggleCount === 2) {
      console.log('✅ PASS: Both toggles present\n');
    } else {
      console.log(`❌ FAIL: Expected 2 toggles, found ${toggleCount}\n`);
    }

    // Check button layout
    const buttonsExist = await page.$eval('.modal-buttons-compact', el => {
      const styles = window.getComputedStyle(el);
      return {
        display: styles.display,
        justifyContent: styles.justifyContent
      };
    }).catch(() => null);

    if (buttonsExist) {
      console.log(`📐 Button container: ${JSON.stringify(buttonsExist)}`);
      if (buttonsExist.justifyContent === 'flex-end') {
        console.log('✅ PASS: Buttons right-justified\n');
      } else {
        console.log('❌ FAIL: Buttons not right-justified\n');
      }
    }

  } catch (error) {
    console.log(`❌ Error during test: ${error.message}\n`);
  }

  // Print console errors if any
  const errors = consoleLogs.filter(log => log.type === 'error');
  if (errors.length > 0) {
    console.log(`\n⚠️  Found ${errors.length} console error(s):`);
    errors.forEach((err, i) => {
      console.log(`   ${i + 1}. ${err.text}`);
    });
    console.log();
  } else {
    console.log('✅ No console errors detected\n');
  }

  console.log('✨ Test complete! Check test-results/ folder for screenshots.');
  console.log('   Browser will close in 5 seconds...\n');

  await new Promise(resolve => setTimeout(resolve, 5000));
  await context.close();
  process.exit(0);
}

testExtension().catch(error => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});
