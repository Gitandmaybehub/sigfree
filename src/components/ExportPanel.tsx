import { useEffect, useState } from 'react'
import type { SignatureData } from '../types'
import { copyRich, copyText, downloadFile, exportPlainText, wrapDocument } from '../lib/exporters'
import { signatureHtmlToText } from '../lib/freeform'

type Action = 'rich' | 'icloud'
interface Guide { label: string; action: Action; steps: string[]; note: string; url: string }

// Steps checked against vendor and support pages, October 2026.
const GUIDES: Guide[] = [
  {
    label: 'Gmail',
    action: 'rich',
    steps: [
      'Click Copy signature.',
      'In Gmail on the web, open Settings (gear), See all settings, General, Signature.',
      'Create new, paste with Command+V, then pick it for new emails and replies.',
      'Scroll down and click Save Changes.',
      'Gmail phone app: Settings, your account, turn Mobile signature off. The app then uses this same signature with pictures.',
    ],
    note: 'Gmail allows 10,000 characters, counting the hidden code. The size check is shown above the steps.',
    url: 'https://support.google.com/mail/answer/8395',
  },
  {
    label: 'Mail on Mac',
    action: 'rich',
    steps: [
      'Click Copy signature.',
      'In Mail, open Settings, Signatures. Pick the account (iCloud, Gmail, school) on the left and click +.',
      'Turn off "Always match my default message font", then paste.',
      'Choose it in Choose Signature and open a new email to check it.',
    ],
    note: 'This is the way to send your iCloud address with pictures from a Mac.',
    url: 'https://support.apple.com/guide/mail/mail11943/mac',
  },
  {
    label: 'iPhone Mail',
    action: 'rich',
    steps: [
      'Click Copy signature on this Mac. With Handoff on, the iPhone gets the same clipboard for about 2 minutes.',
      'On the iPhone open Settings, Apps, Mail, Signature, and paste.',
      'Right away, shake the phone and tap Undo when it says "Undo Change Attributes". That brings back the colors and pictures.',
      'Send yourself a test email from the iPhone.',
    ],
    note: 'Apple officially allows text only here. The shake trick is a known workaround, not tested on iOS 26 yet. If pictures turn into the word "image", your iPhone keeps text and links only. Mac and iPhone signatures do not sync.',
    url: 'https://support.apple.com/guide/iphone/change-mail-settings-iph80dabb18b/ios',
  },
  {
    label: 'Outlook computer',
    action: 'rich',
    steps: [
      'Click Copy signature.',
      'New Outlook and Outlook on the web: Settings, Accounts, Signatures. Classic Outlook for Windows: File, Options, Mail, Signatures.',
      'Add a signature, paste, then set it for new messages and replies. Save.',
    ],
    note: 'For Outlook.com and school Microsoft accounts, the signature syncs between new Outlook and the web. Classic Outlook may ask people to download pictures.',
    url: 'https://support.microsoft.com/office/8ee5d4f4-68fd-464a-a1c1-0e1c80bb27f2',
  },
  {
    label: 'Outlook phone',
    action: 'rich',
    steps: [
      'Click Copy signature on this Mac. With Handoff on, the iPhone gets the same clipboard.',
      'In Outlook on the phone tap your profile picture, then Settings. Under Mail tap Signature. Turn on Per Account Signature if you have more than one account.',
      'Delete the old text and paste.',
    ],
    note: 'Outlook phone does not get the computer signature, so set it on each phone. iPhone shows pictures after the January 2025 update. Android keeps text and links only.',
    url: 'https://support.microsoft.com/en-us/outlook/can-i-change-my-email-signature',
  },
  {
    label: 'iCloud.com',
    action: 'icloud',
    steps: [
      'One time: in Chrome open chrome://extensions, turn on Developer mode, click Load unpacked, and pick the extension folder inside SigFree.',
      'Click Use on iCloud.com above. SigFree keeps it updated while you edit this profile.',
      'On icloud.com/mail, Settings, Composing: turn off Add a signature, so you do not get two.',
      'Write a new email. The signature with pictures is already in it. Delete it from any email where you do not want it.',
    ],
    note: 'Apple only lets the iCloud.com signature setting hold plain text. The add-on puts the full signature into each email instead, the same way signature companies do it for Gmail. It works in Chrome on this Mac. Text version for other browsers is below.',
    url: 'https://support.apple.com/guide/icloud/mm6b1a3290/icloud',
  },
]

const GMAIL_LIMIT = 10000

interface Webmail { html: string; profile?: string; updatedAt: number }

async function saveWebmail(html: string, profile: string): Promise<Webmail> {
  const response = await fetch('/api/webmail-signature', { method: 'PUT', headers: { 'X-Sigfree-Upload': '1' }, body: JSON.stringify({ html, profile }) })
  const result = await response.json()
  if (!response.ok) throw new Error(result.error || 'Could not save.')
  return result
}

/** The iCloud.com add-on reads this. When it holds the open profile, edits update it on their own. */
function useWebmailSignature(html: string, profile: string, ready: boolean) {
  const [webmail, setWebmail] = useState<Webmail | null>(null)
  useEffect(() => {
    fetch('/api/webmail-signature').then(response => response.json()).then(setWebmail).catch(() => setWebmail(null))
  }, [])
  const linked = webmail?.profile === profile
  useEffect(() => {
    if (!linked || !ready || webmail?.html === html) return
    const timer = window.setTimeout(() => { saveWebmail(html, profile).then(setWebmail).catch(() => {}) }, 1000)
    return () => window.clearTimeout(timer)
  }, [linked, ready, html, profile, webmail?.html])
  return { webmail, linked, use: async () => setWebmail(await saveWebmail(html, profile)) }
}

export default function ExportPanel({ html, data, profile, profileLabel, freeform, ready, busyLabel, onToast }: {
  html: string; data: SignatureData; profile: string; profileLabel: string; freeform: boolean; ready: boolean; busyLabel: string; onToast: (message: string) => void
}) {
  const icloud = useWebmailSignature(html, profile, ready)
  const [active, setActive] = useState(0)
  const guide = GUIDES[active]
  const text = freeform ? signatureHtmlToText(html) : exportPlainText(data)

  async function copySignature() {
    const result = await copyRich(html)
    onToast(result.rich ? `Signature copied. Paste it into ${guide.label}.` : result.ok ? 'Copied as text only. Use Download .html to keep pictures.' : 'Copy failed. Use Download .html, open it, and copy from there.')
  }
  async function copyTextSignature() {
    onToast(await copyText(text) ? `Text signature copied. Paste it into ${guide.label}.` : 'Copy failed. Select the text below and copy it.')
  }

  return <section className="export" id="export" aria-labelledby="export-title">
    <div className="export-heading"><h3 id="export-title">Use your signature</h3><p>Pick where you send email from.</p></div>
    <div className="guide-tabs" role="tablist" aria-label="Mail app">
      {GUIDES.map((entry, i) => <button key={entry.label} role="tab" aria-selected={active === i} className={active === i ? 'tab active' : 'tab'} onClick={() => setActive(i)}>{entry.label}</button>)}
    </div>
    <div className="export-bar">
      {guide.action === 'rich'
        ? <button className="btn btn-primary" disabled={!ready} onClick={() => { void copySignature() }}>{busyLabel || 'Copy signature'}</button>
        : <button className="btn btn-primary" disabled={!ready || icloud.linked} onClick={() => { icloud.use().then(() => onToast(`iCloud.com add-on now uses ${profileLabel}.`), () => onToast('Could not save. Is SigFree running?')) }}>{busyLabel || (icloud.linked ? 'Used on iCloud.com' : 'Use on iCloud.com')}</button>}
      {guide.action === 'rich' && <button className="btn btn-ghost" disabled={!ready} onClick={() => downloadFile('email-signature.html', wrapDocument(html))}>Download .html</button>}
    </div>
    {guide.action === 'icloud' && <p className="export-note">{icloud.linked ? `The add-on adds this ${profileLabel} signature to new iCloud.com emails and follows your edits.` : icloud.webmail?.profile ? 'The add-on is using a different profile. Click Use on iCloud.com to switch to this one.' : 'No signature chosen for iCloud.com yet.'}</p>}
    {guide.label === 'Gmail' && <p className={html.length > GMAIL_LIMIT ? 'export-note error' : 'export-note'}>Size: {html.length.toLocaleString()} of {GMAIL_LIMIT.toLocaleString()} characters{html.length > GMAIL_LIMIT ? '. Too long for Gmail: remove the banner, disclaimer or some icons.' : '.'}</p>}
    <ol className="guide-steps">{guide.steps.map(step => <li key={step}>{step}</li>)}</ol>
    <p className="guide-note">{guide.note} <a href={guide.url} target="_blank" rel="noreferrer">Official guide</a></p>
    {guide.action === 'icloud' && <details className="text-fallback"><summary>Text version for iCloud.com settings (no add-on)</summary>
      <p className="export-note">Settings, Composing, turn on Add a signature, paste. Text only: no pictures or colors.</p>
      <button className="btn btn-ghost btn-small" onClick={() => { void copyTextSignature() }}>Copy text signature</button>
      <pre className="text-preview" aria-label="Text signature preview">{text}</pre>
    </details>}
  </section>
}
