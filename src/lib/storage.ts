import type { SignatureData, StyleOpts } from '../types'
import type { IconUrls } from './icons'
import { DEFAULT_STYLE, NAMED_PRESETS } from './presets'
import type { NamedPreset } from './presets'
import { normalizeData, normalizeStyle } from './validation'
import { sanitizeSignatureHtml } from './freeform'

// Keys stay the same so signatures saved by earlier versions still load.
const DATA_KEY = 'sigfree.data.v3'
const STYLE_KEY = 'sigfree.style.v3'
const PROFILES_KEY = 'sigfree.profiles.v1'
const FREEFORM_KEY = 'sigfree.freeform.v1'
const ACTIVE_KEY = 'sigfree.active-profile'
const ICONS_KEY = 'sigfree.icons.v1'

export interface Freeform { html: string; enabled: boolean }
export interface Profile { data: SignatureData; style: StyleOpts; freeform: Freeform }

export function normalizeFreeform(value: unknown): Freeform {
  if (value == null) return { html: '', enabled: false }
  if (typeof value !== 'object' || !('html' in value) || typeof value.html !== 'string' || value.html.length > 1000000 || !('enabled' in value) || typeof value.enabled !== 'boolean') throw new Error('Invalid freeform layout.')
  return { html: sanitizeSignatureHtml(value.html), enabled: value.enabled }
}

function read<T>(key: string, parse: (value: unknown) => T, fallback: T): T {
  try { return parse(JSON.parse(localStorage.getItem(key) || 'null')) } catch { return fallback }
}

export function loadCurrent(): Profile & { profile: string } {
  // A new browser opens the first profile with that profile's starting details.
  const first = NAMED_PRESETS[0]
  let profile = first.key
  try { profile = localStorage.getItem(ACTIVE_KEY) || first.key } catch { /* Private windows can block storage. */ }
  return {
    profile,
    data: read(DATA_KEY, normalizeData, first.build()),
    style: read(STYLE_KEY, normalizeStyle, { ...DEFAULT_STYLE, ...first.style }),
    freeform: read(FREEFORM_KEY, normalizeFreeform, { html: '', enabled: false }),
  }
}

/** Saves the open signature and its profile slot. Throws when the browser refuses storage. */
export function saveCurrent(profile: string, current: Profile): void {
  localStorage.setItem(DATA_KEY, JSON.stringify(current.data))
  localStorage.setItem(STYLE_KEY, JSON.stringify(current.style))
  localStorage.setItem(FREEFORM_KEY, JSON.stringify(current.freeform))
  const profiles = read<Record<string, Profile>>(PROFILES_KEY, value => (value && typeof value === 'object' ? value : {}) as Record<string, Profile>, {})
  localStorage.setItem(PROFILES_KEY, JSON.stringify({ ...profiles, [profile]: current }))
  localStorage.setItem(ACTIVE_KEY, profile)
  localStorage.removeItem('sigfree.gh.token')
}

/** A saved profile, or the preset's starting details when it was never edited or is damaged. */
export function loadProfile(preset: NamedPreset): Profile {
  try {
    const saved = JSON.parse(localStorage.getItem(PROFILES_KEY) || '{}')[preset.key]
    if (saved) return { data: normalizeData(saved.data), style: normalizeStyle(saved.style), freeform: normalizeFreeform(saved.freeform) }
  } catch { /* Fall through to the preset. */ }
  return { data: preset.build(), style: { ...DEFAULT_STYLE, ...preset.style }, freeform: { html: '', enabled: false } }
}

export function loadIconUrls(): IconUrls {
  return read(ICONS_KEY, value => {
    const urls: IconUrls = {}
    if (value && typeof value === 'object') {
      for (const [key, url] of Object.entries(value)) if (typeof url === 'string' && url.startsWith('https://')) urls[key] = url
    }
    return urls
  }, {})
}

export function saveIconUrls(urls: IconUrls): void {
  try { localStorage.setItem(ICONS_KEY, JSON.stringify(urls)) } catch { /* Icons are drawn again next time. */ }
}
