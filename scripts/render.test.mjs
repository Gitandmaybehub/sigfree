import assert from 'node:assert/strict'
import { fileURLToPath } from 'node:url'
import { rolldown } from 'rolldown'
import { importGlobPlugin } from 'rolldown/experimental'

const root = fileURLToPath(new URL('../', import.meta.url))
const bundle = await rolldown({
  input: 'signature-check',
  // importGlobPlugin fills import.meta.glob the way Vite does (optional src/lib/presets.local.ts).
  plugins: [importGlobPlugin(), {
    name: 'signature-check',
    resolveId: (id) => id === 'signature-check' ? '\0signature-check' : null,
    load: (id) => id === '\0signature-check'
      ? ['render', 'exporters', 'validation', 'presets', 'icons', 'brandIcons'].map((name) => `export * from ${JSON.stringify(`${root}src/lib/${name}.ts`)};`).join('\n')
      : null,
  }],
})
const { output } = await bundle.generate({ format: 'esm' })
await bundle.close()
const lib = await import(`data:text/javascript;base64,${Buffer.from(output[0].code).toString('base64')}`)
const png = 'data:image/png;base64,aGVsbG8='
assert.equal(lib.normalizeImageUrl(png), png)
for (const value of ['javascript:alert(1)', 'data:image/svg+xml;base64,PHN2Zz4=', 'file:///tmp/photo.png', 'https://user:pass@example.com/a']) {
  assert.equal(lib.normalizeImageUrl(value), '')
}
assert.equal(lib.normalizeUrl('mailto:me@example.com'), 'mailto:me@example.com')
assert.equal(lib.normalizeUrl('host.test/about'), 'https://host.test/about')
assert.equal(lib.normalizeUrl('javascript:alert(1)'), '')
assert.equal(lib.normalizeUrl(png), '')
assert.equal(lib.normalizeUrl('java\tscript:alert(1)'), '')
assert.ok(!Object.hasOwn(lib.normalizeData(JSON.parse('{"socials":{"__proto__":"blocked"}}')).socials, '__proto__'))
assert.equal(lib.parseSocialValue(lib.SOCIALS[0], 'icon:https://host.test/icon.png|'), null)
assert.equal(lib.parseSocialValue(lib.SOCIALS[0], 'javascript:alert(1)'), null)
assert.throws(() => lib.normalizeData({ name: 123 }))
assert.throws(() => lib.normalizeData({ banner: null }))
assert.throws(() => lib.normalizeData({ socials: [] }))
assert.throws(() => lib.normalizeData({ socials: { github: 42 } }))
assert.throws(() => lib.normalizeStyle({ template: '__proto__' }))
assert.throws(() => lib.normalizeStyle({ font: 'missing' }))
assert.throws(() => lib.normalizeStyle({ photoPosition: 'floating' }))
assert.throws(() => lib.normalizeStyle({ logoPosition: '<script>' }))
assert.equal(lib.normalizeStyle({}).photoPosition, 'left')
assert.equal(lib.normalizeStyle({}).signatureWidth, 520)
assert.throws(() => lib.normalizeStyle({ signatureWidth: 230 }))
assert.throws(() => lib.normalizeStyle({ photoSize: Infinity }))
assert.throws(() => lib.normalizeStyle({ accent: '#fff; background:url(x)' }))
assert.throws(() => lib.normalizeStyle({ baseSize: NaN }))
assert.equal(lib.normalizeData({ cta: { text: 'Contact' } }).cta.text, 'Contact')

const data = { ...lib.DEFAULT_DATA, name: 'A & B <Studio>', photoUrl: png, title: 'Owner', company: 'Studio', phone: '+1 555 0100', mobile: '+1 555 0101', address: 'Office', socials: {} }
const templates = ['classicBar', 'cleanRows', 'bandHeader', 'compactLine', 'cardCentered', 'minimalMono', 'darkCard', 'gradientEdge', 'twoColumn', 'stackCenter', 'cesCard']
for (const template of templates) {
  const html = lib.renderSignature(data, { ...lib.DEFAULT_STYLE, template })
  assert.ok(html.includes('A &amp; B &lt;Studio&gt;'), template)
  assert.ok(!html.includes('https://data:'), template)
  const stack = []
  for (const [, close, tag] of html.matchAll(/<(\/)?([a-z]+)\b[^>]*>/gi)) {
    if (close) { assert.equal(stack.pop(), tag, `${template}: mismatched ${tag}`); continue }
    if (tag === 'tr') assert.ok(['table', 'tbody', 'thead', 'tfoot'].includes(stack.at(-1)), `${template}: row outside table`)
    if (tag === 'td') assert.equal(stack.at(-1), 'tr', `${template}: cell outside row`)
    if (!['img', 'br', 'hr', 'meta', 'link', 'input'].includes(tag)) stack.push(tag)
  }
  assert.equal(stack.length, 0, template)
}
const card = lib.renderSignature(data, { ...lib.DEFAULT_STYLE, template: 'cesCard' })
assert.ok(card.includes('width="520" style="width:520px;table-layout:fixed;'))
assert.ok(!card.includes('width="100%"'))
assert.ok(!card.includes('border:1px solid'))
for (const photoPosition of ['left', 'right', 'top', 'bottom']) {
  for (const logoPosition of ['left', 'right', 'top', 'bottom']) {
    const moved = lib.renderSignature(data, { ...lib.DEFAULT_STYLE, photoPosition, logoPosition, font: 'googleSans' })
    assert.equal((moved.match(/<img /g) || []).length, 2)
    assert.ok(moved.includes("'Google Sans', Arial, Helvetica, sans-serif"))
  }
}
assert.ok(card.includes(`src="${png}"`))
assert.ok(card.includes('tel:+15550100'))
assert.ok(card.includes('Mobile:'))
assert.ok(card.includes('Office'))
const text = lib.exportPlainText(data)
assert.ok(text.includes('A & B <Studio>\nOwner · Studio'))
assert.ok(text.includes(data.phone))
assert.ok(!text.includes('<table'))
// Hosted icons replace favicons; custom icons and old saved styles still work.
assert.equal(lib.normalizeStyle({}).iconColor, 'brand')
assert.equal(lib.normalizeStyle({ iconColor: '#087F79', iconShape: 'plain' }).iconShape, 'plain')
assert.throws(() => lib.normalizeStyle({ iconColor: 'red' }))
assert.throws(() => lib.normalizeStyle({ iconColor: '#fff' }))
const social = { ...data, socials: { instagram: 'example.com/instagram', x: 'icon:https://host.test/x.png|example.com/x' } }
const hostedUrl = 'https://raw.githubusercontent.com/o/r/abc/uploads/ig.png'
const withIcons = lib.renderSignature(social, lib.DEFAULT_STYLE, { [lib.iconKey('instagram', 'brand', lib.DEFAULT_STYLE.iconShape)]: hostedUrl })
assert.ok(withIcons.includes(`src="${hostedUrl}"`))
assert.ok(withIcons.includes('src="https://host.test/x.png"'))
assert.ok(!withIcons.includes('favicons'))
assert.ok(lib.renderSignature(social, lib.DEFAULT_STYLE).includes('favicons?domain=instagram.com'))
for (const network of lib.SOCIALS) assert.ok(lib.BRAND_GLYPHS[network.key]?.path, network.key)
assert.equal(lib.iconKey('yelp', '#AABBCC', 'circle'), 'yelp|#aabbcc|circle')
console.log(`PASS: ${templates.length} templates, image URLs, input validation, contact fields, hosted icons, and iCloud text export`)
