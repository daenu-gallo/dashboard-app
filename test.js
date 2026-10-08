import puppeteer from 'puppeteer';
(async () => {
  const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  page.on('console', msg => {
    console.log('CONSOLE:', msg.text());
    if (msg.type() === 'error') {
      const location = msg.location();
      console.log('LOCATION:', location);
      msg.args().forEach(async (arg) => {
        const val = await arg.jsonValue().catch(() => null);
        console.log('ARG:', val);
      });
    }
  });
  page.on('pageerror', error => {
    console.error('PAGE_ERROR_STACK:', error.stack);
  });
  await page.goto('http://localhost:4173/test-gallery');
  await new Promise(r => setTimeout(r, 2000));
  await browser.close();
  process.exit(0);
})();
