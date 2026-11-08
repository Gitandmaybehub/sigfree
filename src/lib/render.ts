import type { CtaData, SignatureData, StyleOpts } from '../types'
import { FONT_STACKS, ICON_RADII } from '../types'
import { SOCIALS, iconKey, parseSocialValue } from './icons'
import type { IconUrls } from './icons'
import { normalizeImageUrl, normalizeUrl, normalizeData, normalizeStyle } from './validation'

/**
 * Renders a signature as email-client-safe HTML:
 * nested tables, inline styles only, web-safe fonts,
 * explicit image sizes. No classes (except the optional
 * hover hook), no scripts, no tracking pixels.
 */

export function esc(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function displayUrl(raw: string): string {
  return raw.trim().replace(/^https?:\/\//i, '').replace(/\/+$/, '')
}

interface TextStyles {
  family: string
  size: number
  color: string
  muted: string
  accent: string
}

function textStyle(style: StyleOpts): TextStyles {
  return {
    family: FONT_STACKS[style.font].stack,
    size: style.baseSize,
    color: style.textColor,
    muted: style.mutedColor,
    accent: style.accent,
  }
}

const CELL = 'cellpadding="0" cellspacing="0" border="0" role="presentation"'

function spacer(height: number): string {
  return `<tr><td style="font-size:0;line-height:0;height:${height}px;">&#8203;</td></tr>`
}

function titleLine(d: SignatureData, t: TextStyles, color?: string, block = false): string {
  const parts = [d.title.trim(), d.company.trim()].filter(Boolean)
  if (parts.length === 0) return ''
  const inner = `<div style="font-family:${t.family};font-size:${t.size + 1}px;line-height:1.5;color:${color || t.muted};">${esc(parts.join(' · '))}</div>`
  return block ? inner : `<tr><td>${inner}</td></tr>`
}

function contactRows(d: SignatureData, t: TextStyles, centered = false): string {
  const align = centered ? 'text-align:center;' : ''
  const row = (inner: string): string =>
    `<tr><td style="${align}font-family:${t.family};font-size:${t.size}px;line-height:1.6;color:${t.color};">${inner}</td></tr>`

  let html = ''
  if (d.phone.trim()) {
    html += row(`<a href="${esc(normalizeUrl(`tel:${d.phone.replace(/[^\d+]/g, '')}`))}" style="color:${t.color};text-decoration:none;">${esc(d.phone)}</a>`)
  }
  if (d.mobile.trim()) {
    const tel = `tel:${d.mobile.replace(/[^\d+]/g, '')}`
    html += row(`<span style="color:${t.muted};">Mobile:</span>&nbsp; <a href="${esc(tel)}" style="color:${t.color};text-decoration:none;">${esc(d.mobile)}</a>`)
  }
  if (d.email.trim()) {
    html += row(`<a href="${esc(normalizeUrl(d.email))}" style="color:${t.color};text-decoration:none;">${esc(d.email)}</a>`)
  }
  if (d.website.trim()) {
    html += row(`<a href="${esc(normalizeUrl(d.website))}" class="sig-link" style="color:${t.accent};text-decoration:none;font-weight:bold;">${esc(displayUrl(d.website))}</a>`)
  }
  if (d.address.trim()) {
    html += row(`<span style="color:${t.muted};">${esc(d.address)}</span>`)
  }
  return html
}

function socialsHtml(d: SignatureData, s: StyleOpts, icons: IconUrls, inline = false): string {
  const anchors = SOCIALS.map((network) => {
    const parsed = parseSocialValue(network, d.socials[network.key] ?? '')
    if (!parsed) return ''
    const hosted = parsed.custom ? '' : icons[iconKey(network.key, s.iconColor, s.iconShape)]
    // Drawn icons already carry their shape, so only fallback favicons get CSS rounding.
    const radius = hosted ? 0 : ICON_RADII[s.iconShape](s.iconSize)
    const img = `<img src="${esc(normalizeImageUrl(hosted || parsed.iconUrl))}" width="${s.iconSize}" height="${s.iconSize}" alt="${esc(network.label)}" style="display:block;width:${s.iconSize}px;height:${s.iconSize}px;border-radius:${radius}px;border:0;" />`
    return `<a href="${esc(normalizeUrl(parsed.profileUrl))}" target="_blank" rel="noopener noreferrer" class="sig-icon" style="text-decoration:none;display:inline-block;margin-right:${Math.round(s.iconSize / 3)}px;">${img}</a>`
  }).filter(Boolean)

  if (anchors.length === 0) return ''
  if (inline) return anchors.join('')
  return `<tr><td style="padding-top:10px;">${anchors.join('')}</td></tr>`
}

function socialTextLinks(d: SignatureData, t: TextStyles): string {
  const links = SOCIALS.map((network) => {
    const parsed = parseSocialValue(network, d.socials[network.key] ?? '')
    if (!parsed) return ''
    return `<a href="${esc(normalizeUrl(parsed.profileUrl))}" target="_blank" rel="noopener noreferrer" style="color:${t.accent};text-decoration:none;font-size:10px;letter-spacing:2px;text-transform:uppercase;">${esc(network.label)}</a>`
  }).filter(Boolean)
  if (links.length === 0) return ''
  return links.join(`<span style="color:${t.muted};">&nbsp;&nbsp;·&nbsp;&nbsp;</span>`)
}

function ctaHtml(cta: CtaData, s: StyleOpts, invert = false): string {
  const text = cta.text.trim()
  const url = normalizeUrl(cta.url)
  if (!text || !url) return ''
  const family = FONT_STACKS[s.font].stack
  if (invert) {
    return `<table ${CELL}><tr><td bgcolor="#ffffff" style="border-radius:6px;"><a href="${esc(url)}" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:9px 18px;font-family:${family};font-size:13px;font-weight:bold;color:${esc(s.accent)};text-decoration:none;border-radius:6px;">${esc(text)}</a></td></tr></table>`
  }
  return `<table ${CELL}><tr><td bgcolor="${esc(s.accent)}" style="border-radius:6px;"><a href="${esc(url)}" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:9px 18px;font-family:${family};font-size:13px;font-weight:bold;color:#ffffff;text-decoration:none;border-radius:6px;">${esc(text)}</a></td></tr></table>`
}

function bannerHtml(d: SignatureData): string {
  const url = normalizeImageUrl(d.banner.imageUrl)
  if (!url) return ''
  const link = normalizeUrl(d.banner.linkUrl)
  const img = `<img src="${esc(url)}" width="520" alt="" style="display:block;width:100%;max-width:520px;height:auto;border:0;border-radius:8px;" />`
  return link
    ? `<a href="${esc(link)}" target="_blank" rel="noopener noreferrer">${img}</a>`
    : img
}

function disclaimerHtml(text: string, t: TextStyles): string {
  const value = text.trim()
  if (!value) return ''
  return `<div style="margin-top:4px;padding-top:8px;border-top:1px solid #e5e7eb;font-family:${t.family};font-size:11px;line-height:1.55;color:${t.muted};">${esc(value)}</div>`
}

function handwrittenHtml(d: SignatureData): string {
  const url = normalizeImageUrl(d.handwrittenUrl)
  if (!url) return ''
  return `<img src="${esc(url)}" width="180" alt="${esc(d.name)}" style="display:block;max-width:180px;max-height:60px;height:auto;border:0;margin-bottom:4px;" />`
}

function badgeHtml(d: SignatureData, t: TextStyles): string {
  if (!d.badge.enabled || !d.badge.text.trim()) return ''
  return `<span style="display:inline-block;padding:3px 12px;border:1px solid ${esc(t.accent)};border-radius:999px;font-family:${t.family};font-size:10px;font-weight:bold;letter-spacing:1px;text-transform:uppercase;color:${esc(t.accent)};">✔ ${esc(d.badge.text)}</span>`
}

function badgeRow(d: SignatureData, t: TextStyles): string {
  const pill = badgeHtml(d, t)
  if (!pill) return ''
  return `<tr><td style="padding-top:10px;">${pill}</td></tr>`
}

function watermarkHtml(): string {
  return `<div style="font-family:Arial,Helvetica,sans-serif;font-size:10px;color:#9aa3b2;padding-top:8px;">Sent with <a href="https://github.com/" style="color:#9aa3b2;">SigFree</a>, free signature studio</div>`
}

/** Hover rules survive only in clients that keep <style> blocks (Apple Mail). */
function hoverStyleBlock(s: StyleOpts): string {
  if (!s.hoverIcons) return ''
  return '<style>a.sig-icon:hover{opacity:0.75}a.sig-link:hover{text-decoration:underline}</style>'
}

/* ------------------------------ templates ------------------------------ */

function tplClassicBar(d: SignatureData, s: StyleOpts, icons: IconUrls): string {
  const t = textStyle(s)
  const cta = ctaHtml(d.cta, s)
  return `
<table ${CELL} width="560" style="max-width:560px;"><tr>
<td bgcolor="${esc(s.accent)}" width="4" style="width:4px;border-radius:2px;"></td>
<td style="padding-left:16px;">
  <table ${CELL}>
    ${d.handwrittenUrl.trim() ? `<tr><td>${handwrittenHtml(d)}</td></tr>` : ''}
    <tr><td style="font-family:${t.family};font-size:${t.size + 6}px;font-weight:bold;color:${s.accent};line-height:1.25;">${esc(d.name)}</td></tr>
    ${titleLine(d, t)}
    ${spacer(6)}
    ${contactRows(d, t)}
    ${socialsHtml(d, s, icons)}
    ${badgeRow(d, t)}
    ${cta ? `<tr><td style="padding-top:12px;">${cta}</td></tr>` : ''}
  </table>
</td>
</tr></table>`.trim()
}

function tplCleanRows(d: SignatureData, s: StyleOpts, icons: IconUrls): string {
  const t = textStyle(s)
  const cta = ctaHtml(d.cta, s)
  const image = d.logoUrl.trim()
    ? `<img src="${esc(normalizeImageUrl(d.logoUrl))}" width="130" alt="${esc(d.company || d.name)}" style="display:block;max-width:130px;height:auto;border:0;border-radius:8px;" />`
    : d.photoUrl.trim()
      ? `<img src="${esc(normalizeImageUrl(d.photoUrl))}" width="96" height="96" alt="${esc(d.name)}" style="display:block;width:96px;height:96px;border-radius:50%;border:0;" />`
      : ''
  const right = `
  <table ${CELL}>
    ${d.handwrittenUrl.trim() ? `<tr><td>${handwrittenHtml(d)}</td></tr>` : ''}
    <tr><td style="font-family:${t.family};font-size:${t.size + 5}px;font-weight:bold;color:${t.color};line-height:1.25;">${esc(d.name)}</td></tr>
    ${titleLine(d, t)}
    ${spacer(5)}
    ${contactRows(d, t)}
    ${socialsHtml(d, s, icons)}
    ${badgeRow(d, t)}
    ${cta ? `<tr><td style="padding-top:12px;">${cta}</td></tr>` : ''}
  </table>`
  const main = image
    ? `<table ${CELL}><tr><td valign="top" width="150" style="width:150px;padding-right:18px;">${image}</td><td valign="top">${right}</td></tr></table>`
    : right
  return `<table ${CELL} width="560" style="max-width:560px;"><tr><td>${main}</td></tr></table>`.trim()
}

function tplBandHeader(d: SignatureData, s: StyleOpts, icons: IconUrls): string {
  const t = textStyle(s)
  const parts = [d.title.trim(), d.company.trim()].filter(Boolean).join(' · ')
  const cta = ctaHtml(d.cta, s)
  return `
<table ${CELL} width="560" style="max-width:560px;">
<tr><td bgcolor="${esc(s.accent)}" style="padding:14px 16px;background-color:${esc(s.accent)};border-radius:6px 6px 0 0;">
  ${d.handwrittenUrl.trim() ? handwrittenHtml(d) : ''}
  <div style="font-family:${t.family};font-size:${t.size + 7}px;font-weight:bold;color:#ffffff;line-height:1.25;">${esc(d.name)}</div>
  ${parts ? `<div style="font-family:${t.family};font-size:${t.size}px;color:rgba(255,255,255,0.85);line-height:1.5;">${esc(parts)}</div>` : ''}
</td></tr>
<tr><td style="padding:12px 16px 2px;border-left:1px solid #e5e7eb;border-right:1px solid #e5e7eb;">
  <table ${CELL}>
    ${contactRows(d, t)}
    ${socialsHtml(d, s, icons)}
    ${badgeRow(d, t)}
    ${cta ? `<tr><td style="padding-top:12px;">${cta}</td></tr>` : ''}
  </table>
</td></tr>
</table>`.trim()
}

function tplCompactLine(d: SignatureData, s: StyleOpts, icons: IconUrls): string {
  const t = textStyle(s)
  const segments: string[] = []
  segments.push(`<strong style="color:${s.accent};">${esc(d.name)}</strong>`)
  const role = [d.title.trim(), d.company.trim()].filter(Boolean).join(', ')
  if (role) segments.push(`<span style="color:${t.muted};">${esc(role)}</span>`)
  if (d.phone.trim()) segments.push(`<a href="tel:${esc(d.phone.replace(/[^\d+]/g, ''))}" style="color:${t.color};text-decoration:none;">${esc(d.phone)}</a>`)
  if (d.email.trim()) segments.push(`<a href="${esc(normalizeUrl(d.email))}" style="color:${t.color};text-decoration:none;">${esc(d.email)}</a>`)
  if (d.website.trim()) segments.push(`<a href="${esc(normalizeUrl(d.website))}" style="color:${t.accent};text-decoration:none;">${esc(displayUrl(d.website))}</a>`)
  const sep = `<span style="color:${t.muted};">&nbsp;&nbsp;·&nbsp;&nbsp;</span>`
  const line1 = segments.join(sep)
  const socialsInline = socialsHtml(d, s, icons, true)
  const cta = d.cta.text.trim() && d.cta.url.trim()
    ? `<a href="${esc(normalizeUrl(d.cta.url))}" target="_blank" rel="noopener noreferrer" style="color:#ffffff;background-color:${esc(s.accent)};text-decoration:none;font-size:11px;font-weight:bold;padding:4px 12px;border-radius:4px;">${esc(d.cta.text)}</a>`
    : ''
  const badge = badgeHtml(d, t)
  const line2 = [socialsInline, cta, badge].filter(Boolean).join(sep)
  return `
<div style="font-family:${t.family};font-size:${t.size}px;color:${t.color};line-height:1.7;">
<div>${line1}</div>
${line2 ? `<div style="padding-top:4px;">${line2}</div>` : ''}
</div>`.trim()
}

function tplCardCentered(d: SignatureData, s: StyleOpts, icons: IconUrls): string {
  const t = textStyle(s)
  const cta = ctaHtml(d.cta, s)
  const topImage = d.logoUrl.trim()
    ? `<img src="${esc(normalizeImageUrl(d.logoUrl))}" width="140" alt="${esc(d.company || d.name)}" style="display:block;max-width:140px;height:auto;margin:0 auto 12px;border:0;" />`
    : d.photoUrl.trim()
      ? `<img src="${esc(normalizeImageUrl(d.photoUrl))}" width="84" height="84" alt="${esc(d.name)}" style="display:block;width:84px;height:84px;border-radius:50%;border:0;margin:0 auto 12px;" />`
      : ''
  return `
<table ${CELL} width="460" align="center" style="max-width:460px;"><tr><td style="border:1px solid #e5e7eb;border-radius:10px;padding:24px;text-align:center;">
  ${topImage}
  ${d.handwrittenUrl.trim() ? `<div style="text-align:center;">${handwrittenHtml(d)}</div>` : ''}
  <div style="font-family:${t.family};font-size:${t.size + 5}px;font-weight:bold;color:${s.accent};line-height:1.25;">${esc(d.name)}</div>
  ${titleLine(d, t, t.muted, true)}
  <div style="border-top:1px solid #eceef2;margin:12px auto;width:60%;"></div>
  <table ${CELL} align="center">
    ${contactRows(d, t, true)}
  </table>
  <div style="padding-top:10px;">${socialsHtml(d, s, icons, true)}</div>
  <div style="padding-top:10px;">${badgeHtml(d, t)}</div>
  ${cta ? `<div style="padding-top:14px;">${cta}</div>` : ''}
</td></tr></table>`.trim()
}

function tplMinimalMono(d: SignatureData, s: StyleOpts): string {
  const t = textStyle(s)
  const rows: string[] = []
  const add = (html: string): void => {
    if (html) rows.push(html)
  }
  if (d.phone.trim()) add(esc(d.phone))
  if (d.mobile.trim()) add(`Mobile ${esc(d.mobile)}`)
  if (d.email.trim()) add(esc(d.email))
  if (d.website.trim()) add(esc(displayUrl(d.website)))
  if (d.address.trim()) add(`<span style="color:${t.muted};">${esc(d.address)}</span>`)
  const lines = rows
    .map((row) => `<div style="font-family:${t.family};font-size:${t.size}px;color:${t.color};line-height:1.7;">${row}</div>`)
    .join('')
  const socials = socialTextLinks(d, t)
  const cta =
    d.cta.text.trim() && d.cta.url.trim()
      ? `<div style="padding-top:10px;font-family:${t.family};font-size:11px;"><a href="${esc(normalizeUrl(d.cta.url))}" target="_blank" rel="noopener noreferrer" style="color:#ffffff;background-color:${esc(s.accent)};text-decoration:none;padding:6px 14px;border-radius:3px;">${esc(d.cta.text.toUpperCase())}</a></div>`
      : ''
  return `
<div style="letter-spacing:0.5px;">
  ${d.handwrittenUrl.trim() ? handwrittenHtml(d) : ''}
  <div style="font-family:${t.family};font-size:${t.size + 2}px;color:${t.color};text-transform:uppercase;letter-spacing:3px;line-height:1.4;">${esc(d.name)}</div>
  ${[d.title.trim(), d.company.trim()].filter(Boolean).length ? `<div style="font-family:${t.family};font-size:${t.size - 1}px;color:${t.muted};letter-spacing:1px;text-transform:uppercase;line-height:1.6;">${esc([d.title.trim(), d.company.trim()].filter(Boolean).join(' · '))}</div>` : ''}
  <div style="border-top:2px solid ${esc(s.accent)};width:36px;margin:10px 0;"></div>
  ${lines}
  ${socials ? `<div style="padding-top:10px;">${socials}</div>` : ''}
  ${cta}
  ${d.badge.enabled ? `<div style="padding-top:10px;">${badgeHtml(d, t)}</div>` : ''}
</div>`.trim()
}

function tplDarkCard(d: SignatureData, s: StyleOpts, icons: IconUrls): string {
  const t = textStyle(s)
  const cta = ctaHtml(d.cta, s, true)
  const mutedOnDark = 'rgba(255,255,255,0.72)'
  const contactLines = [
    d.phone.trim() ? `<a href="tel:${esc(d.phone.replace(/[^\d+]/g, ''))}" style="color:#ffffff;text-decoration:none;">${esc(d.phone)}</a>` : '',
    d.email.trim() ? `<a href="${esc(normalizeUrl(d.email))}" style="color:#ffffff;text-decoration:none;">${esc(d.email)}</a>` : '',
    d.website.trim() ? `<a href="${esc(normalizeUrl(d.website))}" class="sig-link" style="color:${esc(s.accent)};text-decoration:none;">${esc(displayUrl(d.website))}</a>` : '',
  ].filter(Boolean)
  const contactHtml = contactLines
    .map((line) => `<tr><td style="font-family:${t.family};font-size:${t.size}px;line-height:1.7;color:#ffffff;">${line}</td></tr>`)
    .join('')
  return `
<table ${CELL} width="520" style="max-width:520px;"><tr><td bgcolor="#030712" style="background-color:#030712;border-radius:12px;padding:22px 26px;">
  ${d.logoUrl.trim() ? `<img src="${esc(normalizeImageUrl(d.logoUrl))}" width="120" alt="" style="display:block;max-width:120px;height:auto;margin-bottom:10px;border:0;" />` : ''}
  ${d.handwrittenUrl.trim() ? handwrittenHtml(d) : ''}
  <div style="font-family:${t.family};font-size:${t.size + 6}px;font-weight:bold;color:#ffffff;line-height:1.25;">${esc(d.name)}</div>
  ${titleLine(d, { ...t, muted: mutedOnDark }, mutedOnDark, true)}
  <div style="border-top:1px solid rgba(255,255,255,0.18);margin:12px 0;"></div>
  <table ${CELL}>
    ${contactHtml}
    ${socialsHtml(d, s, icons)}
    ${(() => { const pill = d.badge.enabled ? badgeHtml(d, { ...t, accent: '#ffffff' }) : ''; return pill ? `<tr><td style="padding-top:10px;">${pill.replace('border:1px solid #ffffff', `border:1px solid ${esc(s.accent)}`)}</td></tr>` : '' })()}
    ${cta ? `<tr><td style="padding-top:12px;">${cta}</td></tr>` : ''}
  </table>
</td></tr></table>`.trim()
}

function tplGradientEdge(d: SignatureData, s: StyleOpts, icons: IconUrls): string {
  const t = textStyle(s)
  const cta = ctaHtml(d.cta, s)
  return `
<table ${CELL} width="560" style="max-width:560px;">
<tr><td bgcolor="${esc(s.accent)}" style="height:4px;font-size:0;line-height:0;background-color:${esc(s.accent)};">&nbsp;</td></tr>
<tr><td style="padding-top:14px;">
  <table ${CELL}>
    ${d.handwrittenUrl.trim() ? `<tr><td>${handwrittenHtml(d)}</td></tr>` : ''}
    <tr><td style="font-family:${t.family};font-size:${t.size + 6}px;font-weight:bold;color:${esc(s.accent)};line-height:1.25;">${esc(d.name)}</td></tr>
    ${titleLine(d, t)}
    ${spacer(5)}
    ${contactRows(d, t)}
    ${socialsHtml(d, s, icons)}
    ${badgeRow(d, t)}
    ${cta ? `<tr><td style="padding-top:12px;">${cta}</td></tr>` : ''}
  </table>
</td></tr>
</table>`.trim()
}

function tplTwoColumn(d: SignatureData, s: StyleOpts, icons: IconUrls): string {
  const t = textStyle(s)
  const cta = ctaHtml(d.cta, s)
  return `
<table ${CELL} width="560" style="max-width:560px;"><tr>
<td valign="top" style="padding-right:20px;">
  ${d.handwrittenUrl.trim() ? handwrittenHtml(d) : ''}
  <table ${CELL}>
    <tr><td style="font-family:${t.family};font-size:${t.size + 5}px;font-weight:bold;color:${s.accent};line-height:1.25;">${esc(d.name)}</td></tr>
    ${titleLine(d, t)}
    ${spacer(5)}
    ${contactRows(d, t)}
  </table>
</td>
<td valign="top" align="right" style="text-align:right;border-left:1px solid #e5e7eb;padding-left:20px;">
  ${d.photoUrl.trim() ? `<img src="${esc(normalizeImageUrl(d.photoUrl))}" width="72" height="72" alt="" style="display:block;width:72px;height:72px;border-radius:50%;border:0;margin:0 0 10px auto;" />` : ''}
  ${socialsHtml(d, s, icons, true)}
  ${badgeHtml(d, t) ? `<div style="padding-top:10px;">${badgeHtml(d, t)}</div>` : ''}
  ${cta ? `<div style="padding-top:12px;">${cta}</div>` : ''}
</td>
</tr></table>`.trim()
}

function tplStackCenter(d: SignatureData, s: StyleOpts, icons: IconUrls): string {
  const t = textStyle(s)
  const cta = ctaHtml(d.cta, s)
  return `
<table ${CELL} width="480" align="center" style="max-width:480px;text-align:center;"><tr><td align="center">
  ${d.handwrittenUrl.trim() ? `<div align="center">${handwrittenHtml(d)}</div>` : ''}
  <div style="font-family:${t.family};font-size:${t.size + 6}px;font-weight:bold;color:${t.color};line-height:1.25;">${esc(d.name)}</div>
  ${titleLine(d, t, undefined, true)}
  <div style="border-top:2px solid ${esc(s.accent)};width:48px;margin:12px auto;"></div>
  <table ${CELL} align="center">
    ${contactRows(d, t, true)}
  </table>
  <div style="padding-top:10px;">${socialsHtml(d, s, icons, true)}</div>
  <div style="padding-top:10px;">${badgeHtml(d, t)}</div>
  ${cta ? `<div style="padding-top:14px;">${cta}</div>` : ''}
</td></tr></table>`.trim()
}

const TEMPLATE_RENDERERS: Record<StyleOpts['template'], (d: SignatureData, s: StyleOpts, icons: IconUrls) => string> = {
  classicBar: tplClassicBar,
  cleanRows: tplCleanRows,
  bandHeader: tplBandHeader,
  compactLine: tplCompactLine,
  cardCentered: tplCardCentered,
  minimalMono: tplMinimalMono,
  darkCard: tplDarkCard,
  gradientEdge: tplGradientEdge,
  twoColumn: tplTwoColumn,
  stackCenter: tplStackCenter,
  cesCard: tplCesCard,
}

// ponytail: explicit pixel widths survive signature editors that shrink percentage tables.
function tplCesCard(d: SignatureData, s: StyleOpts, icons: IconUrls): string {
  const t = textStyle(s)
  const items = [{ url: d.photoUrl, alt: d.name, position: s.photoPosition, size: s.photoSize }, { url: d.logoUrl, alt: d.company, position: s.logoPosition, size: s.logoSize }].filter(item => item.url)
  const sideWidth = (position: string) => Math.max(0, ...items.filter(item => item.position === position).map(item => item.size + s.pictureGap))
  const leftWidth = sideWidth('left'), rightWidth = sideWidth('right')
  const width = Math.max(s.signatureWidth, leftWidth + rightWidth + s.padding * 2 + 140)
  const innerWidth = width - s.padding * 2
  const textWidth = innerWidth - leftWidth - rightWidth
  const pictures = (position: StyleOpts['photoPosition']) => {
    const vertical = position === 'left' || position === 'right'
    const cells = items.filter(item => item.position === position)
      .map(({ url, alt, size }) => `<td style="padding:${vertical ? `0 0 ${s.pictureGap}px` : `0 ${s.pictureGap}px ${s.pictureGap}px 0`};"><img src="${esc(url)}" width="${size}" alt="${esc(alt)}" style="display:block;width:${size}px;height:auto;border:0;border-radius:6px;" /></td>`)
    return cells.length ? `<table ${CELL} ${position === 'right' ? 'align="right"' : ''}>${vertical ? cells.map(cell => `<tr>${cell}</tr>`).join('') : `<tr>${cells.join('')}</tr>`}</table>` : ''
  }
  const left = pictures('left'), right = pictures('right'), top = pictures('top'), bottom = pictures('bottom')
  const cta = ctaHtml(d.cta, s)
  return `
<table ${CELL} width="${width}" style="width:${width}px;table-layout:fixed;${s.showBorder ? 'border:1px solid #e2e2e2;' : ''}background:#ffffff;">
<tr><td style="padding:${s.padding}px;">
  ${top}
  <table ${CELL} width="${innerWidth}" style="width:${innerWidth}px;table-layout:fixed;"><tr>
    ${left ? `<td width="${leftWidth}" valign="top" style="width:${leftWidth}px;">${left}</td>` : ''}
    <td width="${textWidth}" valign="top" style="width:${textWidth}px;word-wrap:break-word;overflow-wrap:break-word;">
      <table ${CELL} width="${textWidth}" style="width:${textWidth}px;table-layout:fixed;">
        ${d.handwrittenUrl ? `<tr><td>${handwrittenHtml(d)}</td></tr>` : ''}
        <tr><td style="font-family:${t.family};font-size:${t.size + 3}px;font-weight:bold;color:${t.color};line-height:1.25;">${esc(d.name)}</td></tr>
        ${titleLine(d, t)}
        ${spacer(6)}
        ${contactRows(d, t)}
        ${socialsHtml(d, s, icons)}
        ${badgeRow(d, t)}
        ${cta ? `<tr><td style="padding-top:10px;">${cta}</td></tr>` : ''}
      </table>
    </td>
    ${right ? `<td width="${rightWidth}" valign="top" style="width:${rightWidth}px;">${right}</td>` : ''}
  </tr></table>
  ${bottom ? `<table ${CELL}><tr><td style="padding-top:10px;">${bottom}</td></tr></table>` : ''}
</td></tr>
</table>`.trim()
}

/** Full signature markup: main block, banner, disclaimer, optional watermark. */
export function renderSignature(data: SignatureData, style: StyleOpts, icons: IconUrls = {}): string {
  data = normalizeData(data)
  style = normalizeStyle(style)
  data.photoUrl = normalizeImageUrl(data.photoUrl)
  data.logoUrl = normalizeImageUrl(data.logoUrl)
  data.handwrittenUrl = normalizeImageUrl(data.handwrittenUrl)
  data.banner.imageUrl = normalizeImageUrl(data.banner.imageUrl)
  const t = textStyle(style)
  const main = TEMPLATE_RENDERERS[style.template](data, style, icons)
  const banner = bannerHtml(data)
  const disclaimer = data.disclaimer.trim() ? disclaimerHtml(data.disclaimer, t) : ''
  return `
${hoverStyleBlock(style)}
<table ${CELL} style="${style.template === 'cesCard' ? '' : 'max-width:560px;'}">
<tr><td>${main}</td></tr>
${banner ? `<tr><td style="padding-top:14px;">${banner}</td></tr>` : ''}
${disclaimer ? `<tr><td style="padding-top:10px;">${disclaimer}</td></tr>` : ''}
${data.watermark ? `<tr><td>${watermarkHtml()}</td></tr>` : ''}
</table>`.trim()
}
