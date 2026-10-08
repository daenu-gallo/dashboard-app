import puppeteer from 'puppeteer';
(async () => {
  const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  page.on('pageerror', error => console.error('PAGE_ERROR:', error));
  page.on('console', msg => console.log('CONSOLE:', msg.text()));
  await page.goto('http://localhost:4173/test-gallery');
  await new Promise(r => setTimeout(r, 2000));
  await browser.close();
})();
