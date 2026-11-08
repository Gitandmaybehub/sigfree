import assert from 'node:assert/strict'
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'
import react from '@vitejs/plugin-react'
import { chromium } from 'playwright'

const root = fileURLToPath(new URL('../', import.meta.url))
const pixel = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/l9sAAAAASUVORK5CYII='
const initial = `<div><p>Alpha Beta</p><p>Move here</p><img src="${pixel}" width="80" alt="Profile"></div>`
const server = await createServer({ root, configFile: false, plugins: [react(), {
  name: 'freeform-test-page',
  configureServer(vite) {
    vite.middlewares.use('/freeform-test', async (_req, res) => {
      const html = await vite.transformIndexHtml('/freeform-test', `<html><body><div id="root"></div><script type="module">
        import React, {useState} from 'react';
        import {createRoot} from 'react-dom/client';
        import Editor from '/src/components/FreeformEditor.tsx';
        import {sanitizeSignatureHtml,signatureHtmlToText} from '/src/lib/freeform.ts';
        window.sanitize = sanitizeSignatureHtml; window.toText = signatureHtmlToText;
        function App(){const [html,setHtml]=useState(${JSON.stringify(initial)});window.lastHtml=html;window.setHtml=setHtml;return React.createElement(Editor,{html,onChange:setHtml})}
        createRoot(document.getElementById('root')).render(React.createElement(App));
      </script></body></html>`)
      res.setHeader('Content-Type', 'text/html'); res.end(html)
    })
  },
}], server: { host: '127.0.0.1', port: 0 } })
const browser = await chromium.launch({ headless: true })
try {
  await server.listen()
  const page = await browser.newPage({ viewport: { width: 1100, height: 760 } })
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/freeform-test`)
  const editor = page.getByRole('textbox', { name: 'Freeform signature editor' })
  await editor.locator('p').first().waitFor({ timeout: 10000 })
  const clean = await page.evaluate(() => window.sanitize('<table width="520" style="width:520px;table-layout:fixed;padding:12px;border:1px solid #ddd;color:#123456;font-family:Georgia"><tr><td><script>window.bad=1</script><svg onload="window.bad=1"></svg><a href="javascript:alert(1)">Safe</a><img src="data:image/svg+xml;base64,PHN2Zz4=" onerror="window.bad=1"><b onclick="window.bad=1" style="position:fixed;background:image-set(\'https://host.test/a\' 1x)">Text</b></td></tr></table>'))
  assert.ok(!/script|onload|onerror|onclick|javascript|image-set|position|<svg/.test(clean), clean)
  assert.ok(clean.includes('width="520"') && clean.includes('table-layout: fixed') && clean.includes('padding: 12px') && clean.includes('border-width: 1px') && clean.includes('border-style: solid'), clean)
  assert.equal(await page.evaluate(() => window.toText('<p>One</p><p>Two <a href="https://host.test">Website</a></p>')), 'One\nTwo Website (https://host.test/)')
  await editor.locator('p').first().evaluate(node => { const range = document.createRange(); range.setStart(node.firstChild, 5); range.collapse(true); const selection = window.getSelection(); selection.removeAllRanges(); selection.addRange(range); node.closest('[contenteditable]').focus() })
  await page.keyboard.type(' first')
  assert.equal(await editor.locator('p').first().textContent(), 'Alpha first Beta')
  await editor.locator('p').first().evaluate(node => { const range = document.createRange(); range.selectNodeContents(node); const selection = window.getSelection(); selection.removeAllRanges(); selection.addRange(range); node.dispatchEvent(new MouseEvent('mouseup', { bubbles: true })) })
  await page.getByRole('button', { name: 'Bold', exact: true }).click()
  await page.getByLabel('Selection text size').selectOption('20')
  await page.getByLabel('Selection font').selectOption({ label: 'Georgia (serif)' })
  assert.ok(/font-weight: bold|<b>/.test(await page.evaluate(() => window.lastHtml)))
  assert.ok((await page.evaluate(() => window.lastHtml)).includes('font-size: 20px'))
  assert.ok((await page.evaluate(() => window.lastHtml)).includes('Georgia'))
  await editor.locator('img').click()
  await page.getByLabel('Picture width', { exact: true }).fill('140')
  await page.getByLabel('Picture width', { exact: true }).dispatchEvent('input')
  assert.equal(await editor.locator('img').getAttribute('width'), '140')
  await editor.locator('img').dragTo(editor.locator('p').nth(1))
  assert.equal(await editor.locator('img').count(), 1)
  assert.equal(await editor.locator('p').nth(1).locator('img').count(), 1)
  await editor.evaluate(node => {
    const range = document.createRange(); range.selectNodeContents(node); range.collapse(false); const selection = window.getSelection(); selection.removeAllRanges(); selection.addRange(range)
    node.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }))
    const data = new DataTransfer(); data.setData('text/html', '<p onclick="window.bad=1">Pasted<script>window.bad=1</script><img src="javascript:alert(1)" onerror="window.bad=1"></p>')
    node.dispatchEvent(new ClipboardEvent('paste', { bubbles: true, cancelable: true, clipboardData: data }))
  })
  assert.ok((await editor.textContent()).includes('Pasted'))
  assert.ok(!/script|onclick|onerror|javascript/.test(await editor.innerHTML()))
  assert.equal(await page.evaluate(() => window.bad), undefined)
  assert.deepEqual(errors, [])
  await page.screenshot({ path: `${root}.tmp/freeform-editor.png`, fullPage: true })
  console.log('PASS: sanitized paste, styles, text export, caret persistence, text formatting, image resizing, and image relocation')
} finally { await browser.close(); await server.close() }
