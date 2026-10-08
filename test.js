import puppeteer from 'puppeteer';
(async () => {
  const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  page.on('console', msg => {
    if (msg.text().includes('ErrorBoundary')) {
      msg.args().forEach(async (arg) => {
        // Evaluate the arg in the browser to get its stack
        const stack = await arg.evaluate(obj => obj && obj.stack ? obj.stack : JSON.stringify(obj)).catch(() => null);
        console.log('STACK:', stack);
      });
    }
  });
  await page.goto('http://localhost:4173/test-gallery');
  await new Promise(r => setTimeout(r, 2000));
  await browser.close();
  process.exit(0);
})();
