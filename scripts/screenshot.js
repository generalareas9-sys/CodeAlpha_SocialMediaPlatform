/**
 * Visual verification harness for Linkora.
 * Screenshots every page at 3 viewports x 2 themes (logged-out + logged-in),
 * and reports any page JS errors.
 *
 * Usage: node scripts/screenshot.js [label]   (label defaults to "run")
 * Output: %TEMP%/opencode/linkora-shots/<label>/<page>--<theme>-<vp>.png
 */
const fs = require('fs');
const path = require('path');
const os = require('os');
const puppeteer = require('puppeteer-core');

const BASE = process.env.BASE_URL || 'http://localhost:5000';
const LABEL = process.argv[2] || 'run';
const OUT = path.join(os.tmpdir(), 'opencode', 'linkora-shots', LABEL);

const CHROME_CANDIDATES = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
];
const EXECUTABLE = CHROME_CANDIDATES.find((p) => fs.existsSync(p));
if (!EXECUTABLE) throw new Error('No Chrome/Edge found');

const VIEWPORTS = [360, 768, 1280];
const THEMES = ['light', 'dark'];
const GUEST_PAGES = [
  ['landing', '/'],
  ['login', '/login.html'],
  ['register', '/register.html'],
];
const AUTH_PAGES = [
  ['feed', '/'],
  ['profile', '/profile.html?user=alex_dev'],
  ['post', '/post.html?id=1'],
  ['discover', '/discover.html'],
];

const errors = [];

function attachErrorLogging(page, name) {
  page.on('pageerror', (e) => errors.push(`[${name}] pageerror: ${e.message}`));
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(`[${name}] console.error: ${msg.text()}`);
  });
}

async function shoot(browser, name, url) {
  for (const theme of THEMES) {
    for (const vp of VIEWPORTS) {
      const page = await browser.newPage();
      attachErrorLogging(page, `${name}/${theme}/${vp}`);
      await page.evaluateOnNewDocument((t) => {
        try {
          localStorage.setItem('linkora-theme', t);
        } catch (e) {}
      }, theme);
      await page.setViewport({ width: vp, height: vp === 360 ? 760 : 900, deviceScaleFactor: 1 });
      const file = path.join(OUT, `${name}--${theme}-${vp}.png`);
      if (fs.existsSync(file)) {
        process.stdout.write(`  skip ${path.basename(file)}\n`);
        await page.close();
        continue;
      }
      try {
        await page.goto(BASE + url, { waitUntil: 'networkidle2', timeout: 30000 });
        await new Promise((r) => setTimeout(r, 900));
        await page.screenshot({ path: file, fullPage: true });
        process.stdout.write(`  ok ${path.basename(file)}\n`);
      } catch (e) {
        errors.push(`[${name}/${theme}/${vp}] nav/screenshot: ${e.message}`);
      }
      await page.close();
    }
  }
}

async function login(browser) {
  const page = await browser.newPage();
  attachErrorLogging(page, 'login-flow');
  await page.goto(BASE + '/login.html', { waitUntil: 'networkidle2' });
  await page.type('#login-identifier', 'alex_dev');
  await page.type('#login-password, input[name="password"]', 'password123');
  await Promise.all([
    page.click('#btn-login, button[type="submit"]'),
    page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 }).catch(() => {}),
  ]);
  await new Promise((r) => setTimeout(r, 800));
  const cookie = await page.cookies();
  const authed = cookie.some((c) => /token|auth|jwt|sid/i.test(c.name));
  await page.close();
  return authed;
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  console.log('Chrome:', EXECUTABLE);
  console.log('Output:', OUT);
  const browser = await puppeteer.launch({
    executablePath: EXECUTABLE,
    headless: 'new',
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  });

  console.log('Guest pages...');
  for (const [name, url] of GUEST_PAGES) await shoot(browser, name, url);

  console.log('Logging in...');
  const ok = await login(browser);
  console.log('Login cookie present:', ok);

  console.log('Authed pages...');
  for (const [name, url] of AUTH_PAGES) await shoot(browser, name, url);

  await browser.close();

  if (errors.length) {
    console.log(`\n${errors.length} page error(s):`);
    [...new Set(errors)].forEach((e) => console.log('  ' + e));
  } else {
    console.log('\nNo page JS errors captured.');
  }
  console.log('Screenshots in: ' + OUT);
})();
