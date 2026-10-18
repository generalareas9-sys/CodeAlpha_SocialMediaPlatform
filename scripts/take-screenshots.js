/**
 * Automated Screenshot Capturing with Playwright
 * Generates screenshots for Linkora at 1366x768 resolution.
 */
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const http = require('http');

const PORT = process.env.PORT || 5000;
const BASE_URL = `http://localhost:${PORT}`;
const SCREENSHOTS_DIR = path.join(__dirname, '..', 'screenshots');

async function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

async function isServerRunning() {
  return new Promise((resolve) => {
    const req = http.get(BASE_URL, (res) => {
      resolve(res.statusCode < 500);
    });
    req.on('error', () => resolve(false));
    req.setTimeout(1500, () => {
      req.destroy();
      resolve(false);
    });
  });
}

async function waitForPageReady(page) {
  try {
    await page.waitForLoadState('networkidle', { timeout: 4000 });
  } catch (e) {}

  await page.evaluate(async () => {
    const images = Array.from(document.querySelectorAll('img'));
    await Promise.all(
      images.map((img) => {
        if (img.complete) return Promise.resolve();
        return new Promise((resolve) => {
          img.addEventListener('load', resolve, { once: true });
          img.addEventListener('error', resolve, { once: true });
          setTimeout(resolve, 1500);
        });
      })
    );
  }).catch(() => {});

  // Wait for rendering & animations
  await page.waitForTimeout(800);
}

async function setTheme(page, theme) {
  await page.evaluate((t) => {
    localStorage.setItem('linkora-theme', t);
    document.documentElement.setAttribute('data-theme', t);
    if (typeof applyTheme === 'function') {
      applyTheme(t);
    }
  }, theme);
  await page.waitForTimeout(300);
}

async function run() {
  await ensureDir(SCREENSHOTS_DIR);

  const running = await isServerRunning();
  if (running) {
    console.log(`Using existing running server at ${BASE_URL}`);
  } else {
    console.log(`Starting server on port ${PORT}...`);
    require('../server');
    await new Promise(r => setTimeout(r, 1200));
  }

  console.log('Launching Playwright Chromium...');
  let browser;
  try {
    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });
  } catch (err) {
    console.log('Falling back to local Chrome channel if chromium launch failed...');
    browser = await chromium.launch({
      channel: 'chrome',
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });
  }

  const context = await browser.newContext({
    viewport: { width: 1366, height: 768 },
    deviceScaleFactor: 1
  });

  const page = await context.newPage();

  console.log('1. Capturing landing.png (guest)...');
  await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' });
  await setTheme(page, 'dark');
  await waitForPageReady(page);
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'landing.png'), fullPage: false });

  console.log('2. Capturing login.png (guest)...');
  await page.goto(`${BASE_URL}/login.html`, { waitUntil: 'domcontentloaded' });
  await setTheme(page, 'dark');
  await waitForPageReady(page);
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'login.png'), fullPage: false });

  console.log('Logging in as alex_dev / password123...');
  await page.evaluate(async () => {
    await API.login('alex_dev', 'password123');
  });
  await page.waitForTimeout(600);

  console.log('3. Capturing feed-light.png...');
  await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' });
  await setTheme(page, 'light');
  await waitForPageReady(page);
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'feed-light.png'), fullPage: false });

  console.log('4. Capturing feed-dark.png...');
  await setTheme(page, 'dark');
  await waitForPageReady(page);
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'feed-dark.png'), fullPage: false });

  console.log('5. Capturing profile.png...');
  await page.goto(`${BASE_URL}/profile.html?user=alex_dev`, { waitUntil: 'domcontentloaded' });
  await setTheme(page, 'dark');
  await waitForPageReady(page);
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'profile.png'), fullPage: false });

  console.log('6. Capturing discover.png...');
  await page.goto(`${BASE_URL}/discover.html`, { waitUntil: 'domcontentloaded' });
  await setTheme(page, 'dark');
  await waitForPageReady(page);
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'discover.png'), fullPage: false });

  await browser.close();
  console.log('All 6 screenshots captured successfully in /screenshots!');
  process.exit(0);
}

run().catch((err) => {
  console.error('Screenshot script error:', err);
  process.exit(1);
});
