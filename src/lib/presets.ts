import type { SignatureData, StyleOpts } from '../types'

/** Sample pictures for the sample person. Upload your own photo and logo to replace them. */
const SAMPLE_PHOTO = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAKAAAACgCAIAAAAErfB6AAAEFElEQVR4nOzcT4hUdQDA8d9MI7vN7uLurGlZ2lJGf0Q3MltJgyKCSq0oQSIPFWR4yOgSeMmLRIeQaDsYRpCEy4aFhdAhKekgZZarS1CtlqRQa7utujrj7myzvZRAnD846+XNd76f4/vNm8t33nu/33szk2rcuCGIKxmEZmA4A8MZGM7AcAaGMzCcgeEMDGdgOAPDGRjOwHAGhjMwnIHhDAxnYDgDwxkYzsBwBoYzMJyB4QwMZ2A4A8MZGM7AcAaGMzCcgeEMDGdgOAPDGRjOwHAGhjMwnIHhDAxnYDgDwxkYzsBwBoYzMJyB4QwMZ2A4A8MZGM7AcAaGS4Xa17v6mYbUtBLb+/t6DvVV2PGt5Y91tGaKt28/dOCj/oMBgRB45W13JBKJ4u3Z/HjlwC8uXlJy++mxc5jAnqLhDAxnYDgDwxkYzsBwBoYzMJyB4QwMZ2A4A8MZGM7AcAaGMzCcgeEMDGdgOAPDGRjOwHAGhjMwnIHhDAxnYDgDw9X8j8+SiUTJX55FJicnQ92r+cAzm5vLDf2VPRvqXs0HnjO9tdzQkb+HQ92L+zW4o62t87rZFV4wf+asckMDQ0Oh7sXxCL4qmXxq/oI1nXctmTO3paHh3MRE26bXyr346YV3lhv6aehEqHsxCpxJp19ddv/yW2+/OZO5eN7UmEq9cHfX1v3fltyr64a55d7w6MhIqHsxOkUvmn39y/cum9feXjwr3vzoylvaZxTv8vaKxxtSpT+jI7lcUKyO4C8OD4yOjUXn5OKhVDK5b936l3bt/LDvhwtbotXR6w89Eh3Z5d5tz29HwlQ9eNO83c+tDdVbs6Pnz9HRECfxuga/t3/fK0vvKzkUnai3PrHqzYdXHD99qv3q9Kzm5nLL3wve+WZvmKroYrH0xo5QvWvSTXELHK9Z9KY9uwsV705Mb2yMps3XtrRUrhstkPb+fjQoboGz+fy2A9+HK7Z+16dB58VuHbzus0++O34sXIHe/oNf/no46Lw43uh44P13j506GabkxxODz37cG/S/OAb+p1C4Z0v3wHDV96E+/+Xnri3dQReJ6a3Kk7ncwu7Nq3q2DZ65rEnpmfHxtTt3PLn9g+jDES5boQ4eNyUaN24I8fb8osWrF3R2tGZmNDWlp/33p6NRmGgdPFEo5PL5/sE/3vj6q2gNHVRKDQS+RJQ5qjuczVZ1sNat2ntcOHTWp7xV8Cs7cAaGMzCcgeEMDGdgOAPDGRjOwHAGhjMwnIHhDAxnYDgDwxkYzsBwBoYzMJyB4QwMZ2A4A8MZGM7AcAaGMzCcgeEMDGdgOAPDGRjOwHAGhjMwnIHhDAxnYDgDwxkYzsBwBoYzMJyB4QwMZ2A4A8MZGM7AcAaGMzCcgeEMDGdgOAPDGRjOwHD/AgAA//9swZOWAAAABklEQVQDACyTxD+6I0I2AAAAAElFTkSuQmCC'
const SAMPLE_LOGO = 'data:image/png;base64,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'

/** Starting details for a made-up person. Every email and link uses the reserved example domains. */
export const DEFAULT_DATA: SignatureData = {
  name: 'Jordan Lee',
  title: 'Founder',
  company: 'Lee Studio',
  phone: '',
  mobile: '',
  email: 'jordan@example.com',
  website: 'example.com',
  address: '',
  photoUrl: SAMPLE_PHOTO,
  logoUrl: SAMPLE_LOGO,
  handwrittenUrl: '',
  socials: {},
  banner: { imageUrl: '', linkUrl: '' },
  cta: { text: '', url: '' },
  badge: { enabled: false, text: 'Verified' },
  disclaimer: '',
  watermark: false,
}

export const DEFAULT_STYLE: StyleOpts = {
  template: 'cesCard',
  accent: '#087f79',
  textColor: '#030712',
  mutedColor: '#6b7280',
  font: 'arial',
  photoPosition: 'left',
  logoPosition: 'left',
  signatureWidth: 520,
  photoSize: 80,
  logoSize: 80,
  pictureGap: 14,
  padding: 12,
  showBorder: false,
  baseSize: 13,
  iconSize: 20,
  iconShape: 'circle',
  iconColor: 'brand',
  hoverIcons: false,
}

export interface NamedPreset {
  key: string
  label: string
  icon: string
  build(): SignatureData
  style: Partial<StyleOpts>
}

/** Work signature: photo, logo, social icons and a button. */
export const WORK_PRESET: NamedPreset = {
  key: 'work',
  label: 'Work',
  icon: '💼',
  build: () => ({
    ...DEFAULT_DATA,
    name: 'Jordan Lee',
    title: 'Founder',
    company: 'Lee Studio',
    email: 'jordan@example.com',
    phone: '',
    website: 'example.com',
    address: '',
    socials: {
      instagram: 'https://example.com/instagram',
      facebook: 'https://example.com/facebook',
    },
    cta: { text: 'Book a call', url: 'https://example.com/book' },
    badge: { enabled: false, text: 'Verified' },
  }),
  style: { template: 'cesCard', accent: '#087f79' },
}

/** Personal signature: photo and one social link, no logo or company. */
export const PERSONAL_PRESET: NamedPreset = {
  key: 'personal',
  label: 'Personal',
  icon: '🙋',
  build: () => ({
    ...DEFAULT_DATA,
    name: 'Jordan Lee',
    title: '',
    company: '',
    logoUrl: '',
    email: 'jordan.lee@example.net',
    phone: '',
    mobile: '',
    website: '',
    address: '',
    socials: {
      instagram: 'https://example.com/instagram',
    },
    cta: { text: '', url: '' },
    badge: { enabled: false, text: 'Verified' },
  }),
  style: { template: 'cesCard', accent: '#030712' },
}

/** Student signature with a badge. */
export const SCHOOL_PRESET: NamedPreset = {
  key: 'school',
  label: 'Student',
  icon: '🎓',
  build: () => ({
    ...DEFAULT_DATA,
    name: 'Jordan Lee',
    title: 'Student',
    logoUrl: '',
    company: 'Example University',
    email: 'jordan.lee@example.org',
    phone: '',
    website: 'example.org',
    address: 'Anytown, USA',
    socials: {
      linkedin: 'https://example.com/linkedin',
    },
    cta: { text: '', url: '' },
    badge: { enabled: true, text: 'Example University Student' },
  }),
  style: { template: 'cesCard', accent: '#024698' },
}

// Your own profiles can live in src/lib/presets.local.ts, which git ignores.
// When that file exports NAMED_PRESETS, the app shows those instead of the samples above.
const local = import.meta.glob<{ NAMED_PRESETS?: NamedPreset[] }>('./presets.local.ts', { eager: true })
const localPresets = Object.values(local)[0]?.NAMED_PRESETS

export const NAMED_PRESETS: NamedPreset[] = localPresets?.length ? localPresets : [WORK_PRESET, PERSONAL_PRESET, SCHOOL_PRESET]

/** Starting details of the first profile. Kept for compatibility with earlier exports. */
export function defaultPreset(): SignatureData {
  return NAMED_PRESETS[0].build()
}
