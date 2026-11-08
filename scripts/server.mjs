import { createServer } from 'node:http'
import { readFile, writeFile, mkdtemp, mkdir, rm } from 'node:fs/promises'
import { resolve, extname, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createHash } from 'node:crypto'
import { spawn, execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { tmpdir } from 'node:os'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../dist')
const port = Number(process.env.PORT || 8793)
const origin = `http://127.0.0.1:${port}`
const repo = 'your-github-name/sigfree-assets' // your own public GitHub repo for pictures
const maxBytes = 5 * 1024 * 1024
const webmailFile = resolve(dirname(fileURLToPath(import.meta.url)), '../.local/webmail-signature.json')
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg' }

function github(path, body) {
  return new Promise((resolve, reject) => {
    const args = ['api', `repos/${repo}/contents/${path}`]
    if (body) args.push('--method', 'PUT', '--input', '-')
    const child = spawn('gh', args, { stdio: ['pipe', 'pipe', 'pipe'], timeout: 45000 })
    let output = '', error = ''
    child.stdout.on('data', chunk => { output += chunk })
    child.stderr.on('data', chunk => { error += chunk })
    child.on('error', () => reject(new Error('Image hosting is unavailable. Your previous photo is unchanged.')))
    child.on('close', code => {
      if (code) { reject(new Error(error.includes('404') ? 'Not found' : 'Image hosting failed. Your previous photo is unchanged.')); return }
      try { resolve(JSON.parse(output)) } catch { reject(new Error('Invalid image hosting response.')) }
    })
    child.stdin.on('error', () => {})
    child.stdin.end(body ? JSON.stringify(body) : undefined)
  })
}

export function imageExtension(bytes) {
  if (bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) return 'png'
  if (bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) return 'jpg'
  if (/^GIF8[79]a$/.test(bytes.subarray(0, 6).toString())) return 'gif'
  throw new Error('Choose a PNG, JPG or GIF image.')
}

async function upload(req) {
  let size = 0
  const chunks = []
  for await (const chunk of req) {
    size += chunk.length
    if (size > maxBytes) throw new Error('Image is larger than 5 MB.')
    chunks.push(chunk)
  }
  let bytes = Buffer.concat(chunks)
  if (bytes.subarray(4, 8).toString() === 'ftyp' && /^(heic|heix|hevc|hevx|mif1|msf1)$/.test(bytes.subarray(8, 12).toString())) {
    const dir = await mkdtemp(resolve(tmpdir(), 'sigfree-'))
    try {
      await writeFile(resolve(dir, 'photo.heic'), bytes)
      await promisify(execFile)('/usr/bin/sips', ['-s', 'format', 'jpeg', '-Z', '480', resolve(dir, 'photo.heic'), '--out', resolve(dir, 'photo.jpg')], { timeout: 15000 })
      bytes = await readFile(resolve(dir, 'photo.jpg'))
    } catch { throw new Error('Could not read this HEIC picture. Export it as JPG and try again.') }
    finally { await rm(dir, { recursive: true, force: true }) }
  }
  const extension = imageExtension(bytes)
  const checkDir = await mkdtemp(resolve(tmpdir(), 'sigfree-check-'))
  try {
    await writeFile(resolve(checkDir, `image.${extension}`), bytes)
    await promisify(execFile)('/usr/bin/sips', ['-s', 'format', 'png', '-Z', '480', resolve(checkDir, `image.${extension}`), '--out', resolve(checkDir, 'decoded.png')], { timeout: 15000 })
    if ((await readFile(resolve(checkDir, 'decoded.png'))).length < 32) throw new Error('Empty picture')
  } catch { throw new Error('This picture is damaged or cannot be read. Choose another image.') }
  finally { await rm(checkDir, { recursive: true, force: true }) }
  // ponytail: content names preserve photos already used in sent signatures.
  const path = `uploads/${createHash('sha256').update(bytes).digest('hex')}.${extension}`
  let url
  try { url = (await github(path)).download_url }
  catch (error) {
    if (error.message !== 'Not found') throw error
    try {
      const result = await github(path, { message: 'Add signature image', content: bytes.toString('base64'), branch: 'main' })
      url = `https://raw.githubusercontent.com/${repo}/${result.commit.sha}/${path}`
    } catch (createError) {
      // Another upload may have created the same content while this one waited.
      try { url = (await github(path)).download_url } catch { throw createError }
    }
  }
  const response = await fetch(url, { signal: AbortSignal.timeout(15000) })
  if (!response.ok || !response.headers.get('content-type')?.startsWith('image/')) throw new Error('Photo saved, but not yet readable. Try the upload again.')
  if (!Buffer.from(await response.arrayBuffer()).equals(bytes)) throw new Error('Photo verification failed. Try the upload again.')
  return { url }
}

export const server = createServer(async (req, res) => {
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('Cache-Control', 'no-store')
  const reply = (status, data) => { res.writeHead(status, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(data)) }
  if (req.headers.host !== `127.0.0.1:${port}`) { reply(403, { error: 'Local access only.' }); return }
  // The browser add-on reads the signature chosen for webmail; only the SigFree page can change it.
  if (req.url === '/api/webmail-signature') {
    if (req.method === 'GET') {
      try { reply(200, JSON.parse(await readFile(webmailFile, 'utf8'))) } catch { reply(200, { html: '', updatedAt: 0 }) }
      return
    }
    if (req.method !== 'PUT') { reply(405, { error: 'Use GET or PUT.' }); return }
    if (req.headers.origin !== origin || req.headers['x-sigfree-upload'] !== '1') { reply(403, { error: 'Open SigFree on this Mac to change it.' }); return }
    try {
      let body = ''
      for await (const chunk of req) { body += chunk; if (body.length > 200000) throw new Error('Signature is too large.') }
      const { html, profile } = JSON.parse(body)
      if (typeof html !== 'string' || typeof profile !== 'string') throw new Error('Invalid signature.')
      const saved = { html, profile, updatedAt: Date.now() }
      await mkdir(dirname(webmailFile), { recursive: true })
      await writeFile(webmailFile, JSON.stringify(saved))
      reply(200, saved)
    } catch (error) { reply(400, { error: error.message }) }
    return
  }
  if (req.url === '/api/images') {
    if (req.method !== 'POST') { reply(405, { error: 'Use POST.' }); return }
    if (req.headers.origin !== origin || req.headers['x-sigfree-upload'] !== '1') { reply(403, { error: 'Open SigFree on this Mac to upload.' }); return }
    if (Number(req.headers['content-length']) > maxBytes) { reply(413, { error: 'Image is larger than 5 MB.' }); return }
    try { reply(200, await upload(req)) } catch (error) { reply(400, { error: error.message }) }
    return
  }
  if (!['GET', 'HEAD'].includes(req.method)) { reply(405, { error: 'Method not allowed.' }); return }
  try {
    const path = decodeURIComponent(new URL(req.url, origin).pathname)
    const file = resolve(root, path === '/' ? 'index.html' : `.${path}`)
    if (!file.startsWith(root + '/')) { reply(403, { error: 'Not allowed.' }); return }
    const content = await readFile(file)
    res.writeHead(200, { 'Content-Type': mime[extname(file)] || 'application/octet-stream' })
    res.end(req.method === 'HEAD' ? undefined : content)
  } catch { reply(404, { error: 'Not found.' }) }
})

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  server.listen(port, '127.0.0.1', () => console.log(`SigFree: ${origin}`))
}
