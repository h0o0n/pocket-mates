/**
 * 콘솔 제출용 스크린샷 캡처
 * 세로 636×1048 PNG ×3, 가로 1504×741 PNG ×1
 */
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT = join(__dirname, '../../docs/store-screenshots')
const BASE = process.env.SHOT_URL || 'http://127.0.0.1:5173/'

mkdirSync(OUT, { recursive: true })

/** 데모용 데이터가 보이도록 localStorage를 채웁니다. */
async function seedDemo(page) {
  await page.evaluate(() => {
    const hash = localStorage.getItem('pocket-user-hash') || 'screenshot-demo'
    localStorage.setItem('pocket-user-hash', hash)
    const k = (s) => `pocket:u:${hash}:${s}`
    const plan = { monthlyIncome: 3_000_000, fixedExpenses: 1_000_000, savingsGoal: 500_000 }
    const now = new Date()
    const expenses = [
      {
        id: 'shot-1',
        category: 'dining',
        amount: 12800,
        memo: '점심 한식',
        spentAt: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 10).toISOString(),
      },
      {
        id: 'shot-2',
        category: 'coffee',
        amount: 5500,
        memo: '아메리카노',
        spentAt: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 15, 20).toISOString(),
      },
      {
        id: 'shot-3',
        category: 'shopping',
        amount: 24900,
        memo: '생활용품',
        spentAt: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 19, 0).toISOString(),
      },
    ]
    localStorage.setItem(k('plan'), JSON.stringify(plan))
    localStorage.setItem(k('expenses'), JSON.stringify(expenses))
    localStorage.setItem(k('points'), JSON.stringify(680))
    localStorage.setItem(k('inventory'), JSON.stringify(['attic', 'game']))
    localStorage.setItem(k('equipped-skin'), JSON.stringify('attic'))
    localStorage.setItem(k('outfit-inventory'), JSON.stringify(['none', 'scarf']))
    localStorage.setItem(k('equipped-outfit'), JSON.stringify('scarf'))
    localStorage.setItem(k('migrated-v1'), '1')
  })
  await page.reload({ waitUntil: 'networkidle' })
  await page.waitForTimeout(800)
}

async function hideChrome(page) {
  // 캡처에 방해되는 토스트·배너 빈칸·부팅 문구·AIT 뱃지 최소화
  await page.addStyleTag({
    content: `
      .toast { display: none !important; }
      .banner-ad-wrap { display: none !important; }
      .app-boot { display: none !important; }
      [class*="AIT"], [class*="ait-"], [id*="ait"], a[href*="apps-in-toss"],
      div[style*="z-index: 214748"], div[style*="z-index:214748"] {
        display: none !important;
        visibility: hidden !important;
      }
    `,
  })
  await page.evaluate(() => {
    document.querySelectorAll('body *').forEach(el => {
      const text = (el.textContent || '').trim()
      if (text === 'AIT' && el.children.length === 0) {
        const host = el.closest('div') || el
        host.style.setProperty('display', 'none', 'important')
      }
    })
  }).catch(() => {})
}

async function clickTab(page, label) {
  await page.locator(`nav.floating-tab button:has-text("${label}")`).click()
  await page.waitForTimeout(500)
}

async function shotPortrait(page, name) {
  const path = join(OUT, name)
  await page.screenshot({ path, type: 'png', animations: 'disabled' })
  console.log('saved', path)
}

async function main() {
  const browser = await chromium.launch({
    headless: true,
    channel: 'chrome',
  })
  const context = await browser.newContext({
    viewport: { width: 636, height: 1048 },
    deviceScaleFactor: 1,
  })
  const page = await context.newPage()
  await page.goto(BASE, { waitUntil: 'networkidle', timeout: 60_000 })
  await page.waitForSelector('main.app-shell', { timeout: 30_000 })
  await seedDemo(page)
  await hideChrome(page)

  // 1) 홈 — 방 + 남은 돈 + 미션
  await clickTab(page, '홈')
  await page.waitForTimeout(600)
  await shotPortrait(page, 'portrait-01-home.png')

  // 2) 꾸미기 — 리워드 CTA + 스킨
  await clickTab(page, '꾸미기')
  await page.waitForTimeout(600)
  await shotPortrait(page, 'portrait-02-shop.png')

  // 3) 내역 — 소비 리스트
  await clickTab(page, '내역')
  await page.waitForTimeout(600)
  await shotPortrait(page, 'portrait-03-history.png')

  await context.close()

  // 가로형: 홈을 와이드 뷰포트에 담아 방이 잘 보이게
  const landscape = await browser.newContext({
    viewport: { width: 1504, height: 741 },
    deviceScaleFactor: 1,
  })
  const lp = await landscape.newPage()
  await lp.goto(BASE, { waitUntil: 'networkidle', timeout: 60_000 })
  await lp.waitForSelector('main.app-shell', { timeout: 30_000 })
  await seedDemo(lp)
  await hideChrome(lp)
  await lp.addStyleTag({
    content: `
      html, body, #root { background: #f2f4f6 !important; }
      .app-shell {
        width: min(520px, 100%) !important;
        margin: 0 auto !important;
        height: 100% !important;
      }
      .floating-tab { width: min(480px, calc(100% - 24px)) !important; }
      .fab-add { right: max(16px, calc(50% - 260px + 16px)) !important; }
    `,
  })
  // 가로형은 홈 첫 화면 그대로 캡처 (탭 클릭 불필요)
  await lp.waitForTimeout(700)
  const landPath = join(OUT, 'landscape-01-home.png')
  await lp.screenshot({ path: landPath, type: 'png', animations: 'disabled' })
  console.log('saved', landPath)

  await browser.close()
  console.log('done →', OUT)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
