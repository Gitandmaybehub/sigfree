import { normalizeImageUrl, normalizeUrl } from './validation'

const tags = new Set('table tbody thead tfoot tr td th colgroup col caption div p span b strong i em u s strike sub sup a img br hr ul ol li blockquote font'.split(' '))
const discard = new Set('script style iframe object embed svg math form input textarea button select option video audio source link meta base template canvas noscript frame frameset'.split(' '))
const styles = new Set('color background background-color font-family font-size font-weight font-style text-decoration text-align vertical-align line-height letter-spacing width height min-width max-width min-height max-height padding padding-top padding-right padding-bottom padding-left margin margin-top margin-right margin-bottom margin-left border border-top border-right border-bottom border-left border-width border-style border-color border-radius border-collapse border-spacing table-layout display float white-space word-wrap overflow-wrap'.split(' '))
for (const side of ['top', 'right', 'bottom', 'left']) for (const part of ['width', 'style', 'color']) styles.add(`border-${side}-${part}`)
const fontSizes = ['10px', '13px', '16px', '18px', '24px', '32px', '48px']

/** Rebuild allowed HTML in a detached document before any paste enters the editor. */
export function sanitizeSignatureHtml(html: string): string {
  const parsed = new DOMParser().parseFromString(html, 'text/html')
  const clean = document.implementation.createHTMLDocument('')
  const walk = (node: Node, parent: Node): void => {
    if (node.nodeType === Node.TEXT_NODE) { parent.appendChild(clean.createTextNode(node.textContent ?? '')); return }
    if (node.nodeType !== Node.ELEMENT_NODE) return
    const source = node as HTMLElement
    const tag = source.localName.toLowerCase()
    if (discard.has(tag)) return
    if (!tags.has(tag)) { source.childNodes.forEach(child => walk(child, parent)); return }
    const target = clean.createElement(tag === 'font' ? 'span' : tag)
    for (const property of source.style) {
      const value = source.style.getPropertyValue(property)
      const functions = value.match(/[a-z-]+\s*\(/gi) ?? []
      if (styles.has(property) && !/[<>\\@]/.test(value) && functions.every(fn => /^rgba?\s*\($|^hsla?\s*\($/i.test(fn))) {
        target.style.setProperty(property, value)
      }
    }
    for (const key of ['width', 'height', 'cellpadding', 'cellspacing', 'border', 'colspan', 'rowspan']) {
      const value = source.getAttribute(key)
      if (value && /^\d{1,3}%?$/.test(value)) target.setAttribute(key, value)
    }
    for (const key of ['align', 'valign']) {
      const value = source.getAttribute(key)
      if (value && /^(left|center|right|justify|top|middle|bottom|baseline)$/i.test(value)) target.setAttribute(key, value)
    }
    const background = source.getAttribute('bgcolor')
    if (background && /^(#[\da-f]{3,8}|[a-z]+)$/i.test(background)) target.style.backgroundColor = background
    if (tag === 'table') target.setAttribute('role', 'presentation')
    if (tag === 'font') {
      const face = source.getAttribute('face')
      const color = source.getAttribute('color')
      const size = Number(source.getAttribute('size'))
      if (face && /^[\w\s,'-]+$/.test(face)) target.style.fontFamily = face
      if (color && /^(#[\da-f]{3,8}|[a-z]+)$/i.test(color)) target.style.color = color
      if (size >= 1 && size <= 7) target.style.fontSize = fontSizes[size - 1]
    }
    if (tag === 'a') {
      const href = normalizeUrl(source.getAttribute('href') ?? '')
      if (href) { target.setAttribute('href', href); target.setAttribute('rel', 'noopener noreferrer') }
    }
    if (tag === 'img') {
      const src = normalizeImageUrl(source.getAttribute('src') ?? '')
      if (!src) return
      target.setAttribute('src', src)
      target.setAttribute('alt', source.getAttribute('alt') ?? '')
      target.style.maxWidth = '100%'
    }
    source.childNodes.forEach(child => walk(child, target))
    parent.appendChild(target)
  }
  parsed.body.childNodes.forEach(node => walk(node, clean.body))
  return clean.body.innerHTML
}

export function signatureHtmlToText(html: string): string {
  const parsed = new DOMParser().parseFromString(sanitizeSignatureHtml(html), 'text/html')
  parsed.querySelectorAll('a[href]').forEach(link => {
    const href = link.getAttribute('href') ?? ''
    if (href.startsWith('http') && !(link.textContent ?? '').includes(href.replace(/^https?:\/\//, ''))) link.append(` (${href})`)
  })
  parsed.querySelectorAll('br,div,p,tr,li,blockquote').forEach(node => node.append('\n'))
  return (parsed.body.textContent ?? '').split('\n').map(line => line.replace(/\s+/g, ' ').trim()).filter(Boolean).join('\n')
}
