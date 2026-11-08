import type { IconShape } from '../types'
import { normalizeImageUrl, normalizeUrl } from './validation'

export interface SocialNetwork {
  key: string
  label: string
  /** Domain whose public favicon is the fallback icon until a drawn icon is hosted. */
  domain: string
}

/**
 * Icons are PNGs drawn in the browser from brand glyphs (see iconImage.ts),
 * then hosted with the other signature pictures. Gmail does not show SVG,
 * so every icon must be a hosted raster image. Until a drawn icon is hosted,
 * the network's public favicon is used. Any entry can be overridden by pasting
 * a custom hosted image URL into the social field as `icon:<url>|<profile url>`.
 */
export const SOCIALS: SocialNetwork[] = [
  { key: 'x', label: 'X / Twitter', domain: 'x.com' },
  { key: 'linkedin', label: 'LinkedIn', domain: 'linkedin.com' },
  { key: 'instagram', label: 'Instagram', domain: 'instagram.com' },
  { key: 'facebook', label: 'Facebook', domain: 'facebook.com' },
  { key: 'youtube', label: 'YouTube', domain: 'youtube.com' },
  { key: 'tiktok', label: 'TikTok', domain: 'tiktok.com' },
  { key: 'threads', label: 'Threads', domain: 'threads.net' },
  { key: 'google', label: 'Google reviews', domain: 'google.com' },
  { key: 'yelp', label: 'Yelp', domain: 'yelp.com' },
  { key: 'nextdoor', label: 'Nextdoor', domain: 'nextdoor.com' },
  { key: 'whatsapp', label: 'WhatsApp', domain: 'wa.me' },
  { key: 'github', label: 'GitHub', domain: 'github.com' },
  { key: 'calendly', label: 'Calendly', domain: 'calendly.com' },
]

/** Hosted icon URLs, keyed by iconKey(). */
export type IconUrls = Record<string, string>

export function iconKey(network: string, color: string, shape: IconShape): string {
  return `${network}|${color.toLowerCase()}|${shape}`
}

export function socialIconUrl(domain: string, size = 64): string {
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=${size}`
}

/** Split an optional `icon:<custom url>|<profile url>` value. */
export function parseSocialValue(
  network: SocialNetwork,
  raw: string,
): { profileUrl: string; iconUrl: string; custom: boolean } | null {
  const value = raw.trim()
  if (!value) return null
  let customIcon = ''
  let rest = value
  if (rest.toLowerCase().startsWith('icon:')) {
    const withoutPrefix = rest.slice(5)
    const pipe = withoutPrefix.indexOf('|')
    if (pipe >= 0) {
      customIcon = withoutPrefix.slice(0, pipe).trim()
      rest = withoutPrefix.slice(pipe + 1).trim()
    } else {
      rest = ''
    }
  }
  const profileUrl = normalizeUrl(rest, true)
  if (!profileUrl) return null
  const custom = normalizeImageUrl(customIcon)
  return { profileUrl, iconUrl: custom || socialIconUrl(network.domain), custom: !!custom }
}
