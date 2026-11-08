const MAX_BYTES = 5 * 1024 * 1024

/** Hosts a picture through the local server. Returns a public https URL that email apps can load. */
export async function hostImage(image: Blob): Promise<string> {
  const response = await fetch('/api/images', {
    method: 'POST', headers: { 'X-Sigfree-Upload': '1' }, body: image,
    signal: AbortSignal.timeout(90000),
  })
  const result = await response.json().catch(() => ({}))
  if (!response.ok || typeof result.url !== 'string') throw new Error(result.error || 'Picture upload failed. Try again.')
  return result.url
}

/** Shrinks JPG, PNG and WebP to 480px before hosting. GIF keeps its animation and HEIC converts on the Mac. */
export async function uploadPhoto(file: File): Promise<string> {
  if (file.size > MAX_BYTES) throw new Error('Choose an image smaller than 5 MB.')
  const heic = /\.hei[cf]$/i.test(file.name) || ['image/heic', 'image/heif'].includes(file.type)
  if (!heic && !['image/png', 'image/jpeg', 'image/gif', 'image/webp'].includes(file.type)) {
    throw new Error('Choose a JPG, PNG, GIF, WebP or HEIC image.')
  }
  if (heic || file.type === 'image/gif') return hostImage(file)
  const bitmap = await createImageBitmap(file)
  try {
    const scale = Math.min(1, 480 / Math.max(bitmap.width, bitmap.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(bitmap.width * scale))
    canvas.height = Math.max(1, Math.round(bitmap.height * scale))
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Could not read this picture.')
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    const type = file.type === 'image/png' ? 'image/png' : 'image/jpeg'
    const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(b => b ? resolve(b) : reject(new Error('Could not resize this picture.')), type, 0.85))
    return hostImage(blob)
  } finally { bitmap.close() }
}
