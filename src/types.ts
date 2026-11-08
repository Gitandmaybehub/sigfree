export type TemplateId =
  | 'classicBar'
  | 'cleanRows'
  | 'bandHeader'
  | 'compactLine'
  | 'cardCentered'
  | 'minimalMono'
  | 'darkCard'
  | 'gradientEdge'
  | 'twoColumn'
  | 'stackCenter'
  | 'cesCard'

export type FontKey = 'arial' | 'googleSans' | 'georgia' | 'verdana' | 'tahoma' | 'trebuchet'
export type PicturePosition = 'left' | 'right' | 'top' | 'bottom'

export type IconShape = 'square' | 'rounded' | 'circle' | 'plain'

export interface BannerData {
  imageUrl: string
  linkUrl: string
}

export interface CtaData {
  text: string
  url: string
}

export interface BadgeData {
  enabled: boolean
  text: string
}

export interface SignatureData {
  name: string
  title: string
  company: string
  phone: string
  mobile: string
  email: string
  website: string
  address: string
  photoUrl: string
  logoUrl: string
  /** Hand-written signature image (transparent PNG or GIF), shown above the name. */
  handwrittenUrl: string
  socials: Record<string, string>
  banner: BannerData
  cta: CtaData
  badge: BadgeData
  disclaimer: string
  /** Optional "Sent with SigFree" line, off by default. */
  watermark: boolean
}

export interface StyleOpts {
  template: TemplateId
  accent: string
  textColor: string
  mutedColor: string
  font: FontKey
  photoPosition: PicturePosition
  logoPosition: PicturePosition
  signatureWidth: number
  photoSize: number
  logoSize: number
  pictureGap: number
  padding: number
  showBorder: boolean
  baseSize: number
  iconSize: number
  iconShape: IconShape
  /** 'brand' uses each network's own color; otherwise a hex color for every icon. */
  iconColor: string
  /** Adds a hover style for email clients that keep <style> blocks (Apple Mail). */
  hoverIcons: boolean
}

export const TEMPLATE_META: Record<TemplateId, { label: string; hint: string }> = {
  classicBar: { label: 'Classic Bar', hint: 'Accent sidebar, contact stack' },
  cleanRows: { label: 'Clean Rows', hint: 'Logo or photo beside details' },
  bandHeader: { label: 'Band Header', hint: 'Name on a colored band' },
  compactLine: { label: 'Compact Line', hint: 'One tight line, minimal' },
  cardCentered: { label: 'Card', hint: 'Centered bordered card' },
  minimalMono: { label: 'Minimal Mono', hint: 'Text-only, serif friendly' },
  darkCard: { label: 'Dark Card', hint: 'Black card, white text' },
  gradientEdge: { label: 'Gradient Edge', hint: 'Two-tone top bar' },
  twoColumn: { label: 'Two Column', hint: 'Contacts left, socials right' },
  stackCenter: { label: 'Stack Center', hint: 'Handwritten-style stack' },
  cesCard: { label: 'Photo Card', hint: 'Profile photo, logo and contact details' },
}

export const FONT_STACKS: Record<FontKey, { label: string; stack: string }> = {
  googleSans: { label: 'Google Sans', stack: "'Google Sans', Arial, Helvetica, sans-serif" },
  arial: { label: 'Arial / Helvetica', stack: 'Arial, Helvetica, sans-serif' },
  georgia: { label: 'Georgia (serif)', stack: "Georgia, 'Times New Roman', serif" },
  verdana: { label: 'Verdana', stack: 'Verdana, Geneva, sans-serif' },
  tahoma: { label: 'Tahoma', stack: 'Tahoma, Geneva, sans-serif' },
  trebuchet: { label: 'Trebuchet MS', stack: "'Trebuchet MS', Helvetica, sans-serif" },
}

export const ICON_RADII: Record<IconShape, (size: number) => number> = {
  square: () => 0,
  rounded: () => 8,
  circle: (size) => Math.round(size / 2),
  plain: () => 0,
}
