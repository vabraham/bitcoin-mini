/**
 * Simplified test - just open the popup HTML directly
 */

import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function testExtension() {
  console.log('🚀 Starting simple extension test...\n');

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  const popupPath = path.join(__dirname, 'extension', 'popup.html');
  console.log(`📦 Loading popup from: file://${popupPath}\n`);

  await page.goto(`file://${popupPath}`);
  await page.waitForTimeout(2000); // Wait for JS to load

  console.log('📸 Taking screenshot of main popup...\n');
  await page.screenshot({ path: 'test-results/01-popup-simple.png' });

  // Click alerts button
  console.log('🔔 Opening Price Alerts modal...\n');
  await page.click('#alertsBtn');
  await page.waitForTimeout(500);

  console.log('📸 Taking screenshot of alerts modal...\n');
  await page.screenshot({ path: 'test-results/02-alerts-modal-simple.png' });

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

  console.log('✨ Test complete! Check test-results/ folder for screenshots');
  console.log('   Press Ctrl+C to exit\n');

  // Don't close - keep open for inspection
  await new Promise(() => {});
}

testExtension().catch(console.error);
