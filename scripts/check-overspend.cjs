const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
(async () => {
  const browser = await chromium.launch({channel:'msedge',headless:true});
  const page = await browser.newPage();
  const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:5180');
  for (const skin of ['attic','cloud']) {
    for (const amount of [100000,1000000,1450000,1500000,15000000]) {
      await page.evaluate(({skin,amount})=>{
        localStorage.setItem('pocket-equipped-skin',JSON.stringify(skin));
        localStorage.setItem('pocket-expenses',JSON.stringify([{id:'test',category:'shopping',memo:'test',amount,spentAt:new Date().toISOString()}]));
      },{skin,amount});
      await page.reload();
      await page.locator('.attic').waitFor();
      const wear=await page.locator('.attic').evaluate(el=>Number(el.style.getPropertyValue('--wear')));
      assert.ok(wear>=0 && wear<=1,`wear ${wear}`);
      await page.waitForFunction(()=>[...document.querySelectorAll('.room-art,.dog-art')].every(img=>img.complete&&img.naturalWidth>0));
    }
  }
  await page.setViewportSize({width:390,height:844});
  await page.screenshot({path:'output/overspend-fixed.png'});
  assert.deepEqual(errors,[]);
  console.log('PASS: 10 normal/zero/overspent cases, room and dog loaded, wear capped, no render errors');
  await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
