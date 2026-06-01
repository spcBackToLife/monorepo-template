import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: true,
  args: ['--no-sandbox','--disable-setuid-sandbox','--disable-gpu'],
});
const page = await browser.newPage();
await page.setViewport({ width: 1800, height: 1400 });
page.on('console', m => console.log(`[${m.type()}]`, m.text()));
page.on('pageerror', e => console.log(`[pageerror]`, e.message));
await page.goto('http://localhost:5174/editor/d84c140e-0437-4c80-a786-c1f389bcbb02', { waitUntil: 'networkidle2', timeout: 30000 });
await new Promise(r => setTimeout(r, 5000));
const info = await page.evaluate(() => {
  return {
    title: document.title,
    bodyText: document.body.innerText.slice(0, 300),
    screenIds: Array.from(document.querySelectorAll('[data-screen-id]')).map(el => el.getAttribute('data-screen-id')),
    nodeIds: Array.from(document.querySelectorAll('[data-node-id]')).slice(0, 5).map(el => el.getAttribute('data-node-id')),
    canvasRoot: document.querySelector('.editor-canvas-root') ? 'yes' : 'no',
    canvasArea: document.querySelector('.editor-canvas-area') ? 'yes' : 'no',
    canvasDomLayer: document.querySelector('.editor-canvas-dom-layer') ? 'yes' : 'no',
    rootDivCount: document.body.querySelectorAll('div').length,
  };
});
console.log('---');
console.log(JSON.stringify(info, null, 2));
await browser.close();
