// Loads the iCloud.com add-on in a test browser against a stand-in mail page.
// The test copy points at a stand-in server, so the real saved signature is never touched.
import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

const signature = '<table><tr><td><img src="https://example.com/logo.png" width="80" onerror="window.hacked=1"><a href="javascript:alert(1)">bad</a><a href="https://example.com">Example</a><script>window.hacked=1</script></td></tr></table>'
const page = `<!doctype html><button id="new">New</button><button id="reply">Reply</button><div id="mail"></div>
<script>
  const make = quoted => { const body = document.createElement('div'); body.contentEditable = 'true'; body.style.height = '200px'; body.className = 'body'
    if (quoted) body.innerHTML = '<div>On Monday someone wrote:</div><blockquote>Old email</blockquote>'
    document.getElementById('mail').replaceChildren(body) }
  document.getElementById('new').onclick = () => make(false)
  document.getElementById('reply').onclick = () => make(true)
</script>`
const server = createServer((req, res) => {
  if (req.url === '/api/webmail-signature') { res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ html: signature, updatedAt: 1 })); return }
  res.writeHead(200, { 'Content-Type': 'text/html' }); res.end(page)
})
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
const origin = `http://127.0.0.1:${server.address().port}`

const dir = await mkdtemp(join(tmpdir(), 'sigfree-ext-'))
const ext = join(dir, 'extension')
await cp(fileURLToPath(new URL('../extension', import.meta.url)), ext, { recursive: true })
const manifest = JSON.parse(await readFile(join(ext, 'manifest.json'), 'utf8'))
manifest.content_scripts[0].matches.push(`${origin}/*`)
manifest.host_permissions.push(`${origin}/*`)
await writeFile(join(ext, 'manifest.json'), JSON.stringify(manifest))
await writeFile(join(ext, 'background.js'), (await readFile(join(ext, 'background.js'), 'utf8')).replace('http://127.0.0.1:8793', origin))

const context = await chromium.launchPersistentContext(join(dir, 'profile'), {
  channel: 'chromium', headless: true,
  args: [`--disable-extensions-except=${ext}`, `--load-extension=${ext}`],
})
try {
  const tab = await context.newPage()
  await tab.goto(origin)
  await tab.click('#new')
  const added = tab.locator('.body [data-sigfree-signature]')
  await added.waitFor({ timeout: 10000 })
  assert.equal(await added.locator('img[src="https://example.com/logo.png"]').count(), 1)
  assert.equal(await added.locator('[onerror], script, a[href^="javascript"]').count(), 0)
  assert.equal(await tab.evaluate(() => window.hacked), undefined)
  assert.equal(await tab.evaluate(() => document.querySelector('.body').firstElementChild.matches('div:not([data-sigfree-signature])')), true, 'empty line above the signature')

  // Deleted on purpose: it must not come back.
  await tab.evaluate(() => document.querySelector('[data-sigfree-signature]').remove())
  await tab.waitForTimeout(1200)
  assert.equal(await tab.locator('[data-sigfree-signature]').count(), 0)

  // Reply: signature above the quoted email, only once.
  await tab.click('#reply')
  await tab.locator('.body [data-sigfree-signature]').waitFor({ timeout: 10000 })
  await tab.waitForTimeout(1200)
  assert.equal(await tab.locator('[data-sigfree-signature]').count(), 1)
  assert.equal(await tab.evaluate(() => document.querySelector('[data-sigfree-signature]').nextElementSibling.matches('blockquote')), true)
  console.log('PASS: add-on loads, adds a cleaned signature once, keeps deletions, and places it above quoted replies')
} finally {
  await context.close()
  server.close()
  await rm(dir, { recursive: true, force: true })
}
