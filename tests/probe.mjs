// probe.mjs — cek cepat; muat halaman & tampilkan semua pesan console
import { chromium } from 'playwright';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
page.on('console', (m) => console.log(`[${m.type()}] ${m.text().slice(0, 400)}`));
page.on('pageerror', (e) => console.log('[pageerror] ' + e.message));
await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);
const info = await page.evaluate(() => ({
  adf: !!window.__adf,
  bootDisplay: getComputedStyle(document.getElementById('boot')).display,
  menuClass: document.getElementById('screen-menu').className,
  modulesDone: document.querySelectorAll('script[type="module"]').length,
}));
console.log(JSON.stringify(info, null, 2));
await browser.close();
