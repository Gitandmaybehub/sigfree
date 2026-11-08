// Same approach Email Signature Rescue uses for Gmail and Outlook on the web: watch the page,
// find each new message body, and add the signature once. iCloud.com saves text only, so this
// puts the full signature (pictures, colors, links) into the email itself before it is sent.
(() => {
  if (window.__sigfree) return
  window.__sigfree = true
  const MARK = 'data-sigfree-signature'
  let signature = ''

  // Signature HTML comes from SigFree on this Mac. Still rebuild it here so nothing can run on iCloud.com.
  const allowedTags = new Set('table tbody thead tfoot tr td th div p span b strong i em u a img br hr font center'.split(' '))
  function clean(html) {
    const doc = new DOMParser().parseFromString(html, 'text/html')
    const walk = node => {
      for (const child of [...node.children]) {
        if (!allowedTags.has(child.localName)) { child.remove(); continue }
        for (const { name, value } of [...child.attributes]) {
          const url = name === 'href' || name === 'src'
          if (name.startsWith('on') || (url && !/^(https:|http:|mailto:|tel:)/i.test(value.trim()))) child.removeAttribute(name)
        }
        walk(child)
      }
    }
    walk(doc.body)
    return doc.body.innerHTML
  }

  /** Message bodies: large editable boxes that are not inside another editable box. */
  function bodies() {
    return [...document.querySelectorAll('[contenteditable="true"], [contenteditable=""], body[contenteditable], [role="textbox"][aria-multiline="true"]')]
      .filter(el => el.isContentEditable && !el.parentElement?.closest('[contenteditable="true"]') && el.getBoundingClientRect().height >= 80)
  }

  function add(body) {
    // Added once per message. If the person deletes it, it stays deleted.
    if (body.hasAttribute('data-sigfree-done') || body.querySelector(`[${MARK}]`)) return
    body.setAttribute('data-sigfree-done', '')
    const block = document.createElement('div')
    block.setAttribute(MARK, '')
    block.innerHTML = `<br>${clean(signature)}`
    // Replies and forwards: the signature goes above the quoted email.
    let quote = body.querySelector('blockquote, [type="cite"]')
    while (quote && quote.parentElement !== body) quote = quote.parentElement
    if (quote) body.insertBefore(block, quote)
    else {
      if (!body.textContent.trim() && !body.querySelector('img')) body.innerHTML = '<div><br></div>'
      body.append(block)
    }
    body.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertFromPaste' }))
  }

  let timer = 0
  function scan() {
    clearTimeout(timer)
    timer = setTimeout(() => { if (signature) bodies().forEach(add) }, 400)
  }

  function load() {
    chrome.storage.local.get('signature', ({ signature: saved }) => { signature = saved?.html || ''; scan() })
  }
  chrome.storage.onChanged.addListener(changes => { if (changes.signature) load() })
  load()
  try { chrome.runtime.sendMessage('sigfree:refresh') } catch { /* The add-on was reloaded; the next page load reconnects. */ }
  new MutationObserver(scan).observe(document.documentElement, { childList: true, subtree: true })
})()
