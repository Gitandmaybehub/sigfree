import assert from 'node:assert/strict'
import { imageExtension } from './server.mjs'
assert.equal(imageExtension(Buffer.from([137,80,78,71,13,10,26,10])), 'png')
assert.equal(imageExtension(Buffer.from([255,216,255,224])), 'jpg')
assert.equal(imageExtension(Buffer.from('GIF89a')), 'gif')
for (const value of ['', '<svg onload=alert(1)>', '<html>']) assert.throws(() => imageExtension(Buffer.from(value)))
// Same PORT setting as scripts/server.mjs, so the test can check a server on another port.
const url = `http://127.0.0.1:${process.env.PORT || 8793}`
assert.equal((await fetch(url)).status, 200)
assert.equal((await fetch(url + '/api/images', { method: 'POST', body: 'x' })).status, 403)
assert.equal((await fetch(url + '/api/images', { method: 'POST', headers: { Origin: 'https://other.test', 'X-Sigfree-Upload': '1' }, body: 'x' })).status, 403)
assert.equal((await fetch(url + '/api/images', { method: 'POST', headers: { Origin: url, 'X-Sigfree-Upload': '1' }, body: '<svg/>' })).status, 400)
assert.equal((await fetch(url + '/missing')).status, 404)
for (const body of [Buffer.from('GIF89a'), Buffer.from([255,216,255,224]), Buffer.from([137,80,78,71,13,10,26,10])]) {
  assert.equal((await fetch(url + '/api/images', { method: 'POST', headers: { Origin: url, 'X-Sigfree-Upload': '1' }, body })).status, 400)
}
assert.equal((await fetch(url + '/api/webmail-signature')).status, 200)
assert.equal((await fetch(url + '/api/webmail-signature', { method: 'PUT', headers: { Origin: 'https://www.icloud.com', 'X-Sigfree-Upload': '1' }, body: '{}' })).status, 403)
console.log('PASS: webmail signature guard, raster validation, local server, origin guard, invalid uploads and missing routes')
