import type { IconShape } from '../types'
import { BRAND_GLYPHS } from './brandIcons'

/** Drawn at 4x the largest icon size so icons stay sharp on phone and Retina screens. */
const PX = 112

function contrastGlyph(hex: string): string {
  const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255)
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.6 ? '#111111' : '#ffffff'
}

/** Draw one social icon as a PNG: a colored shape with a white glyph, or the glyph alone. */
export async function drawIcon(network: string, color: string, shape: IconShape): Promise<Blob> {
  const glyph = BRAND_GLYPHS[network]
  if (!glyph) throw new Error(`No icon for ${network}.`)
  const fill = color === 'brand' ? glyph.color : color
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = PX
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Could not draw icons in this browser.')
  let glyphColor = fill
  let scale = PX / 24
  if (shape !== 'plain') {
    const radius = shape === 'circle' ? PX / 2 : shape === 'rounded' ? PX * 0.22 : 0
    ctx.fillStyle = fill
    ctx.beginPath()
    ctx.roundRect(0, 0, PX, PX, radius)
    ctx.fill()
    glyphColor = contrastGlyph(fill)
    scale = (PX * 0.54) / 24
  }
  ctx.translate((PX - 24 * scale) / 2, (PX - 24 * scale) / 2)
  ctx.scale(scale, scale)
  ctx.fillStyle = glyphColor
  ctx.fill(new Path2D(glyph.path))
  return new Promise((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Could not draw icon.')), 'image/png'))
}
