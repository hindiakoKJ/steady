/**
 * Steady Promo Screenshot Generator
 * Saves each slide as a 1080x1920 PNG ready for Google Play Store
 *
 * Run: node screenshot.js
 * Requires: npm install puppeteer
 */

const puppeteer = require('puppeteer')
const path = require('path')
const fs = require('fs')

const SLIDE_NAMES = [
  '1-emergency-hub',
  '2-beacon-alert',
  '3-emergency-qr',
  '4-history-log',
  '5-nearby-doctors',
  '6-privacy-promise',
]

const HTML_FILE = path.resolve(__dirname, 'promo-all.html')
const OUT_DIR = path.resolve(__dirname, 'output')
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR)

;(async () => {
  console.log('Launching browser...')
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  })

  const page = await browser.newPage()

  // Set 3x device pixel ratio so 360×640 CSS = 1080×1920 PNG
  await page.setViewport({ width: 360, height: 640, deviceScaleFactor: 3 })

  await page.goto(`file://${HTML_FILE}`, { waitUntil: 'networkidle0' })

  // Wait for fonts/images
  await new Promise(r => setTimeout(r, 1000))

  const slides = await page.$$('.slide')
  console.log(`Found ${slides.length} slides`)

  for (let i = 0; i < slides.length; i++) {
    const slide = slides[i]
    const name = SLIDE_NAMES[i] ?? `slide-${i + 1}`
    const outPath = path.join(OUT_DIR, `steady-promo-${name}.png`)

    await slide.screenshot({ path: outPath })
    console.log(`✓ Saved: ${outPath}`)
  }

  await browser.close()
  console.log('\nDone! All 6 slides saved to promo/output/')
  console.log('Each file is 1080×1920px — ready for Google Play Store.')
})()
