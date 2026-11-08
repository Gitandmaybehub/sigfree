// Reads the signature SigFree saved on this Mac and keeps a copy, so iCloud.com still gets it when SigFree is closed.
const SOURCE = 'http://127.0.0.1:8793/api/webmail-signature'

async function refresh() {
  try {
    const response = await fetch(SOURCE, { cache: 'no-store' })
    if (!response.ok) return
    const { html, updatedAt } = await response.json()
    if (typeof html === 'string') await chrome.storage.local.set({ signature: { html, updatedAt } })
  } catch { /* SigFree is not running; keep the saved copy. */ }
}

chrome.runtime.onStartup.addListener(refresh)
chrome.runtime.onInstalled.addListener(refresh)
chrome.runtime.onMessage.addListener((message, _sender, respond) => {
  if (message === 'sigfree:refresh') refresh().then(() => respond(true))
  return true
})
