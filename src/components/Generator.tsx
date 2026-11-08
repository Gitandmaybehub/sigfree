import { useEffect, useMemo, useRef, useState } from 'react'
import type { SignatureData, StyleOpts, TemplateId } from '../types'
import { FONT_STACKS } from '../types'
import { renderSignature } from '../lib/render'
import { SOCIALS } from '../lib/icons'
import { downloadFile, exportJson } from '../lib/exporters'
import { NAMED_PRESETS } from '../lib/presets'
import { normalizeData, normalizeStyle } from '../lib/validation'
import { loadCurrent, loadProfile, normalizeFreeform, saveCurrent } from '../lib/storage'
import { uploadPhoto } from '../lib/upload'
import FreeformEditor from './FreeformEditor'
import TemplatePicker from './TemplatePicker'
import ExportPanel from './ExportPanel'
import { useHostedIcons } from './useHostedIcons'

function Photo({ label, value, onChange, onBusy }: { label: string; value: string; onChange: (value: string) => void; onBusy: (busy: boolean) => void }) {
  const input = useRef<HTMLInputElement>(null)
  const inFlight = useRef(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  async function upload(file?: File) {
    if (!file || inFlight.current) return
    inFlight.current = true
    setBusy(true); onBusy(true); setError('')
    try { onChange(await uploadPhoto(file)) }
    catch (err) { setError(err instanceof Error ? err.message : 'Upload failed. Try again.') }
    finally { inFlight.current = false; setBusy(false); onBusy(false) }
  }
  return <div className="field">
    <span className="field-label">{label}</span>
    <div className="upload-box" onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); void upload(e.dataTransfer.files[0]) }}>
      {value ? <img src={value} alt={label + ' preview'} className="upload-thumb" /> : <span className="upload-empty">No picture</span>}
      <div className="upload-actions">
        <button className="btn btn-ghost btn-small" disabled={busy} onClick={() => input.current?.click()}>{busy ? 'Uploading...' : value ? 'Replace' : 'Upload'}</button>
        {value && !busy ? <button className="btn btn-ghost btn-small" onClick={() => onChange('')}>Remove</button> : null}
      </div>
    </div>
    <input ref={input} type="file" aria-label={label} accept="image/png,image/jpeg,image/gif,image/webp,image/heic,image/heif,.heic,.heif" hidden onChange={e => { void upload(e.target.files?.[0]); e.target.value = '' }} />
    {error ? <span className="field-hint error" role="alert">{error}</span> : <span className="field-hint">{value.startsWith('https:') ? 'Ready for email.' : 'Choose or drop a picture.'}</span>}
  </div>
}

function Field({ label, value, onChange, type = 'text', placeholder }: { label: string; value: string; onChange: (value: string) => void; type?: string; placeholder?: string }) {
  return <label className="field"><span className="field-label">{label}</span><input type={type} value={value} placeholder={placeholder} onChange={e => onChange(e.target.value)} /></label>
}

function Slider({ label, value, min, max, onChange }: { label: string; value: number; min: number; max: number; onChange: (value: number) => void }) {
  return <label className="field"><span className="field-label">{label}: {value}px</span><input aria-label={label} type="range" min={min} max={max} value={value} onChange={e => onChange(Number(e.target.value))} /></label>
}

const TABS = { details: 'Details', style: 'Style', links: 'Links & extras' } as const
const POSITIONS = { left: 'Left of text', right: 'Right of text', top: 'Above text', bottom: 'Below text' }
const ICON_SHAPES = { circle: 'Circle', rounded: 'Rounded', square: 'Square', plain: 'Logo only' }
const SOCIAL_HINTS: Record<string, string> = { google: 'Your Google review link', yelp: 'yelp.com/biz/...', whatsapp: 'wa.me/15551234567' }

export default function Generator() {
  const [initial] = useState(loadCurrent)
  const [profile, setProfile] = useState(initial.profile)
  const [data, setData] = useState<SignatureData>(initial.data)
  const [style, setStyleState] = useState<StyleOpts>(initial.style)
  const [freeform, setFreeform] = useState(initial.freeform)
  const [tab, setTab] = useState<keyof typeof TABS>('details')
  const [device, setDevice] = useState<'desktop' | 'mobile'>('desktop')
  const [dark, setDark] = useState(false)
  const [toast, setToast] = useState('')
  const [saveError, setSaveError] = useState('')
  const [uploadCount, setUploadCount] = useState(0)
  const fileRef = useRef<HTMLInputElement>(null)
  const { icons, pending: iconsPending, failed: iconsFailed } = useHostedIcons(data, style)
  const formHtml = useMemo(() => renderSignature(data, style, icons), [data, style, icons])
  const html = freeform.enabled ? freeform.html : formHtml
  const localImages = /src="(?:data:|blob:)/i.test(html)
  const busy = uploadCount > 0 || iconsPending > 0
  const ready = !busy && !localImages

  const patch = (value: Partial<SignatureData>) => setData(prev => ({ ...prev, ...value }))
  const setStyle = (value: Partial<StyleOpts>) => setStyleState(prev => ({ ...prev, ...value }))
  // Picture position, size and spacing controls exist only in the Photo Card layout.
  const setCardStyle = (value: Partial<StyleOpts>) => setStyle({ ...value, template: 'cesCard' })
  const onBusy = (on: boolean) => setUploadCount(count => count + (on ? 1 : -1))
  const setPhoto = (photoUrl: string) => { patch({ photoUrl }); if (photoUrl && style.template !== 'cesCard') setStyle({ template: 'cesCard' }) }

  useEffect(() => {
    try {
      saveCurrent(profile, { data, style, freeform })
      // Storage is external; clear an earlier quota error once a write succeeds.
      // oxlint-disable-next-line react/set-state-in-effect
      setSaveError('')
    } catch { setSaveError('This browser could not save your edits. Use Save backup to keep them.') }
  }, [data, style, profile, freeform])
  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(''), 5000)
    return () => window.clearTimeout(timer)
  }, [toast])

  async function loadBackup(file: File) {
    try {
      if (file.size > 10 * 1024 * 1024) throw new Error('Backup is too large.')
      const parsed = JSON.parse(await file.text())
      if (parsed.version !== 1 || !parsed.data || !parsed.style) throw new Error('Invalid backup')
      const next = { data: normalizeData(parsed.data), style: normalizeStyle(parsed.style), freeform: normalizeFreeform(parsed.freeform) }
      setData(next.data); setStyleState(next.style); setFreeform(next.freeform); setToast('Backup loaded.')
    } catch { setToast('That file is not a valid SigFree backup. Your edits are unchanged.') }
  }
  function chooseProfile(preset: typeof NAMED_PRESETS[number]) {
    const next = loadProfile(preset)
    setProfile(preset.key); setData(next.data); setStyleState(next.style); setFreeform(next.freeform)
  }

  const details = <section className="panel">
    <div className="photo-grid">
      <Photo label="Profile photo" value={data.photoUrl} onChange={setPhoto} onBusy={onBusy} />
      <Photo label="Logo" value={data.logoUrl} onChange={logoUrl => patch({ logoUrl })} onBusy={onBusy} />
    </div>
    <div className="grid-2">
      {(['photoPosition', 'logoPosition'] as const).map(key => <label className="field" key={key}>
        <span className="field-label">{key === 'photoPosition' ? 'Photo position' : 'Logo position'}</span>
        <select aria-label={key === 'photoPosition' ? 'Photo position' : 'Logo position'} value={style[key]} onChange={e => setCardStyle({ [key]: e.target.value })}>
          {Object.entries(POSITIONS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </label>)}
    </div>
    <p className="panel-note">Moving pictures uses the Photo Card layout. Uploaded pictures are public so people can see them in your emails.</p>
    <Field label="Full name" value={data.name} onChange={name => patch({ name })} />
    <div className="grid-2"><Field label="Title" value={data.title} onChange={title => patch({ title })} /><Field label="Company" value={data.company} onChange={company => patch({ company })} /></div>
    <Field label="Email" type="email" value={data.email} onChange={email => patch({ email })} />
    <div className="grid-2"><Field label="Phone" type="tel" value={data.phone} onChange={phone => patch({ phone })} /><Field label="Mobile" type="tel" value={data.mobile} onChange={mobile => patch({ mobile })} /></div>
    <Field label="Website" value={data.website} onChange={website => patch({ website })} />
    <Field label="Address" value={data.address} onChange={address => patch({ address })} />
    <div className="grid-2"><Field label="Button text" placeholder="Book a call" value={data.cta.text} onChange={text => patch({ cta: { ...data.cta, text } })} /><Field label="Button link" placeholder="yoursite.com/book" value={data.cta.url} onChange={url => patch({ cta: { ...data.cta, url } })} /></div>
  </section>

  const styling = <section className="panel">
    <span className="field-label">Layout</span>
    <TemplatePicker data={data} style={style} icons={icons} onPick={(template: TemplateId) => setStyle({ template })} />
    <details open={style.template === 'cesCard'}><summary>Size and spacing</summary>
      <p className="panel-note">These controls use Photo Card. The signature keeps its width when pasted into mail.</p>
      <Slider label="Signature width" value={style.signatureWidth} min={360} max={720} onChange={signatureWidth => setCardStyle({ signatureWidth })} />
      <div className="grid-2">
        <Slider label="Photo size" value={style.photoSize} min={40} max={120} onChange={photoSize => setCardStyle({ photoSize })} />
        <Slider label="Logo size" value={style.logoSize} min={40} max={120} onChange={logoSize => setCardStyle({ logoSize })} />
        <Slider label="Picture spacing" value={style.pictureGap} min={0} max={32} onChange={pictureGap => setCardStyle({ pictureGap })} />
        <Slider label="Outer spacing" value={style.padding} min={0} max={24} onChange={padding => setCardStyle({ padding })} />
      </div>
      <label className="check-row"><input type="checkbox" checked={style.showBorder} onChange={e => setCardStyle({ showBorder: e.target.checked })} />Show border</label>
    </details>
    <div className="grid-3">
      <Field label="Accent" type="color" value={style.accent} onChange={accent => setStyle({ accent })} />
      <Field label="Text" type="color" value={style.textColor} onChange={textColor => setStyle({ textColor })} />
      <Field label="Soft text" type="color" value={style.mutedColor} onChange={mutedColor => setStyle({ mutedColor })} />
    </div>
    <div className="grid-2">
      <label className="field"><span className="field-label">Font</span><select aria-label="Font" value={style.font} onChange={e => setStyle({ font: e.target.value as StyleOpts['font'] })}>{Object.entries(FONT_STACKS).map(([key, font]) => <option key={key} value={key}>{font.label}</option>)}</select></label>
      <Slider label="Text size" value={style.baseSize} min={11} max={16} onChange={baseSize => setStyle({ baseSize })} />
    </div>
    {style.font === 'googleSans' && <p className="panel-note">Mail apps that cannot show Google Sans use Arial.</p>}
    <h3 className="panel-heading">Social icons</h3>
    <div className="segmented wide" role="radiogroup" aria-label="Icon color">
      <button role="radio" aria-checked={style.iconColor === 'brand'} className={style.iconColor === 'brand' ? 'seg active' : 'seg'} onClick={() => setStyle({ iconColor: 'brand' })}>Brand colors</button>
      <button role="radio" aria-checked={style.iconColor !== 'brand'} className={style.iconColor !== 'brand' ? 'seg active' : 'seg'} onClick={() => setStyle({ iconColor: style.iconColor === 'brand' ? style.accent : style.iconColor })}>One color</button>
    </div>
    <div className="grid-2">
      {style.iconColor !== 'brand' && <Field label="Icon color" type="color" value={style.iconColor} onChange={iconColor => setStyle({ iconColor })} />}
      <label className="field"><span className="field-label">Icon shape</span><select aria-label="Icon shape" value={style.iconShape} onChange={e => setStyle({ iconShape: e.target.value as StyleOpts['iconShape'] })}>{Object.entries(ICON_SHAPES).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
      <Slider label="Icon size" value={style.iconSize} min={16} max={28} onChange={iconSize => setStyle({ iconSize })} />
    </div>
    {iconsFailed && <p className="panel-note error" role="alert">Some icons could not be uploaded, so the signature uses plain website icons for now. Change any icon setting to try again.</p>}
  </section>

  const links = <section className="panel">
    <p className="panel-note">Paste your profile links. Leave a field empty to hide it.</p>
    {SOCIALS.map(network => <Field key={network.key} label={network.label} placeholder={SOCIAL_HINTS[network.key]} value={data.socials[network.key] || ''} onChange={url => setData(prev => ({ ...prev, socials: { ...prev.socials, [network.key]: url } }))} />)}
    <details><summary>Extra images and text</summary>
      <Field label="Photo URL" value={data.photoUrl.startsWith('data:') ? '' : data.photoUrl} onChange={setPhoto} />
      <Field label="Logo URL" value={data.logoUrl.startsWith('data:') ? '' : data.logoUrl} onChange={logoUrl => patch({ logoUrl })} />
      <Field label="Handwritten signature URL" value={data.handwrittenUrl} onChange={handwrittenUrl => patch({ handwrittenUrl })} />
      <Field label="Banner image URL" value={data.banner.imageUrl} onChange={imageUrl => patch({ banner: { ...data.banner, imageUrl } })} />
      <Field label="Banner link" value={data.banner.linkUrl} onChange={linkUrl => patch({ banner: { ...data.banner, linkUrl } })} />
      <Field label="Disclaimer" value={data.disclaimer} onChange={disclaimer => patch({ disclaimer })} />
      <label className="check-row"><input type="checkbox" checked={data.badge.enabled} onChange={e => patch({ badge: { ...data.badge, enabled: e.target.checked } })} />Show badge</label>
      {data.badge.enabled && <Field label="Badge text" value={data.badge.text} onChange={text => patch({ badge: { ...data.badge, text } })} />}
    </details>
  </section>

  return <div className={freeform.enabled ? 'generator is-freeform' : 'generator'} id="generator">
    <div className="gen-left">
      <div className="editor-heading"><h2>Signature details</h2><span>Saves as you type</span></div>
      <div className="profile-label">Profile</div>
      <div className="preset-row">
        {NAMED_PRESETS.map(preset => <button className={profile === preset.key ? 'chip active' : 'chip'} aria-pressed={profile === preset.key} key={preset.key} disabled={uploadCount > 0} onClick={() => chooseProfile(preset)}>{preset.label}</button>)}
      </div>
      {freeform.enabled && <p className="guide-note">Edit your signature directly in the preview. Switch to Form layout to use these fields.</p>}
      <fieldset className="form-fields" hidden={freeform.enabled} disabled={freeform.enabled}>
        <div className="tabs" aria-label="Editor sections">
          {(Object.keys(TABS) as (keyof typeof TABS)[]).map(key => <button key={key} disabled={uploadCount > 0} aria-pressed={tab === key} className={tab === key ? 'tab active' : 'tab'} onClick={() => setTab(key)}>{TABS[key]}</button>)}
        </div>
        {tab === 'details' ? details : tab === 'style' ? styling : links}
      </fieldset>
      <div className="danger-row">
        <button className="btn btn-ghost btn-small" disabled={uploadCount > 0} onClick={() => fileRef.current?.click()}>Load backup</button>
        <button className="btn btn-ghost btn-small" onClick={() => downloadFile('sigfree-backup.json', exportJson(data, style, freeform), 'application/json')}>Save backup</button>
        <input ref={fileRef} type="file" aria-label="Load backup" accept="application/json,.json" hidden onChange={e => { if (e.target.files?.[0]) void loadBackup(e.target.files[0]); e.target.value = '' }} />
      </div>
      {saveError && <p className="guide-note" role="alert">{saveError}</p>}
    </div>
    <div className="gen-right">
      <div className="preview-bar">
        <h2>{freeform.enabled ? 'Edit signature' : 'Preview'}</h2>
        {!freeform.enabled && <div className="segmented">{(['desktop', 'mobile'] as const).map(key => <button key={key} aria-pressed={device === key} className={device === key ? 'seg active' : 'seg'} onClick={() => setDevice(key)}>{key === 'desktop' ? 'Desktop' : 'Phone'}</button>)}<button aria-pressed={dark} className={dark ? 'seg active' : 'seg'} onClick={() => setDark(on => !on)}>Dark mode</button></div>}
      </div>
      <div className="layout-mode">
        <button className="btn btn-small" disabled={uploadCount > 0} aria-pressed={freeform.enabled} onClick={() => setFreeform(prev => ({ html: prev.html || formHtml, enabled: !prev.enabled }))}>{freeform.enabled ? 'Form layout' : 'Edit freely'}</button>
        {freeform.enabled && <button className="btn btn-small" onClick={() => setFreeform({ html: formHtml, enabled: true })}>Rebuild from fields</button>}
      </div>
      {freeform.enabled
        ? <FreeformEditor key={profile} html={freeform.html} onChange={next => setFreeform(prev => ({ ...prev, html: next }))} />
        : <div className="preview-shell">
          <div className="mail-heading"><span>New message</span><span>{device === 'mobile' ? 'Phone width' : 'Desktop width'}</span></div>
          <div role="document" aria-label="Email signature preview" className={['preview-frame', device === 'mobile' && 'mobile', dark && 'dark'].filter(Boolean).join(' ')} dangerouslySetInnerHTML={{ __html: html }} />
        </div>}
      <p className="preview-note">{dark ? 'Dark mode check: logos with see-through backgrounds can disappear on dark screens. Outlook may also flip text colors.' : 'Email apps may adjust fonts and colors. Wide layouts scroll in the preview.'}</p>
      {localImages && <p className="guide-note" role="alert">This signature has pictures saved only in this browser. Upload them again above before copying.</p>}
      <ExportPanel html={html} data={data} profile={profile} profileLabel={NAMED_PRESETS.find(preset => preset.key === profile)?.label ?? 'this'} freeform={freeform.enabled} ready={ready} busyLabel={uploadCount ? 'Uploading picture...' : iconsPending ? 'Preparing icons...' : ''} onToast={setToast} />
    </div>
    {toast && <div className="toast" role="status">{toast}</div>}
  </div>
}
