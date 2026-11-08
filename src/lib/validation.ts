import type { SignatureData, StyleOpts } from '../types'
import { FONT_STACKS, ICON_RADII, TEMPLATE_META } from '../types'
import { DEFAULT_DATA, DEFAULT_STYLE } from './presets'

function object(raw: unknown, label: string): Record<string, unknown> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error(`${label} must be an object.`)
  return raw as Record<string, unknown>
}

function mergeFields<T extends object>(defaults: T, raw: unknown, label: string): T {
  const input = object(raw, label)
  const result = { ...defaults }
  for (const key of Object.keys(defaults) as (keyof T)[]) {
    if (!Object.hasOwn(input, key)) continue
    if (typeof input[key as string] !== typeof defaults[key]) throw new Error(`${label}.${String(key)} has the wrong type.`)
    result[key] = input[key as string] as T[keyof T]
  }
  return result
}

/** Restore known fields only. Invalid supplied values fail before changing the saved signature. */
export function normalizeData(raw: unknown): SignatureData {
  const input = object(raw, 'Signature')
  const result = mergeFields(DEFAULT_DATA, raw, 'Signature')
  result.banner = mergeFields(DEFAULT_DATA.banner, input.banner ?? {}, 'Banner')
  result.cta = mergeFields(DEFAULT_DATA.cta, input.cta ?? {}, 'Button')
  result.badge = mergeFields(DEFAULT_DATA.badge, input.badge ?? {}, 'Badge')
  result.socials = { ...DEFAULT_DATA.socials }
  if (Object.hasOwn(input, 'socials')) {
    result.socials = {}
    for (const [key, value] of Object.entries(object(input.socials, 'Social links'))) {
      if (typeof value !== 'string') throw new Error('Social links must contain text.')
      if (key !== '__proto__') result.socials[key] = value
    }
  }
  for (const key of ['banner', 'cta', 'badge'] as const) {
    if (Object.hasOwn(input, key) && input[key] === null) throw new Error(`${key} must be an object.`)
  }
  return result
}

export function normalizeStyle(raw: unknown): StyleOpts {
  const result = mergeFields(DEFAULT_STYLE, raw, 'Style')
  if (!Object.hasOwn(TEMPLATE_META, result.template)) throw new Error('Choose a valid template.')
  if (!Object.hasOwn(FONT_STACKS, result.font)) throw new Error('Choose a valid font.')
  for (const position of [result.photoPosition, result.logoPosition]) {
    if (!['left', 'right', 'top', 'bottom'].includes(position)) throw new Error('Choose a valid picture position.')
  }
  for (const [key, min, max] of [['signatureWidth', 360, 720], ['photoSize', 40, 120], ['logoSize', 40, 120], ['pictureGap', 0, 32], ['padding', 0, 24]] as const) {
    if (!Number.isInteger(result[key]) || result[key] < min || result[key] > max) throw new Error(`${key} must be ${min} to ${max}.`)
  }
  if (!Object.hasOwn(ICON_RADII, result.iconShape)) throw new Error('Choose a valid icon shape.')
  if (result.iconColor !== 'brand' && !/^#[\da-f]{6}$/i.test(result.iconColor)) throw new Error('Icon color must be brand or a hex value.')
  for (const color of [result.accent, result.textColor, result.mutedColor]) {
    if (!/^#[\da-f]{3}(?:[\da-f]{3})?$/i.test(color)) throw new Error('Colors must use a hex value.')
  }
  if (!Number.isFinite(result.baseSize) || result.baseSize < 11 || result.baseSize > 16) throw new Error('Text size must be 11 to 16.')
  if (!Number.isFinite(result.iconSize) || result.iconSize < 16 || result.iconSize > 28) throw new Error('Icon size must be 16 to 28.')
  return result
}

/** Only web links become remote images; local raster images are allowed in the preview. */
export function normalizeImageUrl(raw: string): string {
  const value = raw.trim()
  if (/^data:image\/(?:png|jpe?g|gif|webp);base64,[a-z\d+/]+={0,2}$/i.test(value)) return value
  return normalizeUrl(value, true)
}

export function normalizeUrl(raw: string, webOnly = false): string {
  const value = raw.trim()
  // eslint-disable-next-line no-control-regex -- Reject characters that browsers silently strip from URL schemes.
  if (!value || /[\u0000-\u0020\u007f]/.test(value)) return ''
  if (!webOnly) {
    if (/^mailto:[^<>]+@[^<>]+$/i.test(value) || /^tel:\+?[\d().-]+$/i.test(value)) return value
    if (/^[\w.+-]+@[\w.-]+\.\w+$/.test(value)) return `mailto:${value}`
  }
  if (/^[a-z][a-z\d+.-]*:/i.test(value) && !/^https?:\/\//i.test(value)) return ''
  try {
    const url = new URL(/^https?:\/\//i.test(value) ? value : `https://${value.replace(/^\/+/, '')}`)
    return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password ? url.href : ''
  } catch {
    return ''
  }
}
