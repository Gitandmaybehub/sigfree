import { useEffect, useRef, useState } from 'react'
import type { ClipboardEvent, DragEvent } from 'react'
import { FONT_STACKS } from '../types'
import { sanitizeSignatureHtml } from '../lib/freeform'
import './freeform.css'

export default function FreeformEditor({ html, onChange }: { html: string; onChange: (html: string) => void }) {
  const editor = useRef<HTMLDivElement>(null)
  const range = useRef<Range | null>(null)
  const emitted = useRef<string | null>(null)
  const dragged = useRef<HTMLImageElement | null>(null)
  const picture = useRef<HTMLImageElement | null>(null)
  const [selected, setSelected] = useState(false)
  const [width, setWidth] = useState(80)
  const [size, setSize] = useState(13)
  const typingSize = useRef(13)
  const [notice, setNotice] = useState('')

  useEffect(() => {
    if (editor.current && html !== emitted.current) {
      editor.current.innerHTML = sanitizeSignatureHtml(html)
      emitted.current = html
      range.current = null
      picture.current = null
      setSelected(false)
    }
  }, [html])

  function remember() {
    const selection = window.getSelection()
    if (selection?.rangeCount && editor.current?.contains(selection.anchorNode) && editor.current.contains(selection.focusNode)) {
      range.current = selection.getRangeAt(0).cloneRange()
    }
  }
  function restore() {
    editor.current?.focus()
    const selection = window.getSelection()
    if (range.current && selection && editor.current?.contains(range.current.commonAncestorContainer)) {
      selection.removeAllRanges(); selection.addRange(range.current)
    }
  }
  function publish() {
    const root = editor.current
    if (!root) return
    root.querySelectorAll('font[size="7"]').forEach(node => {
      node.removeAttribute('size'); (node as HTMLElement).style.fontSize = `${typingSize.current}px`
    })
    const next = sanitizeSignatureHtml(root.innerHTML)
    emitted.current = next
    onChange(next)
    remember()
  }
  function command(name: string, value?: string) {
    restore()
    document.execCommand('styleWithCSS', false, 'true')
    document.execCommand(name, false, value)
    publish()
  }
  function textSize(value: number) {
    typingSize.current = value
    setSize(value)
    restore()
    document.execCommand('styleWithCSS', false, 'false')
    document.execCommand('fontSize', false, '7')
    editor.current?.querySelectorAll('font[size="7"]').forEach(node => {
      node.removeAttribute('size'); (node as HTMLElement).style.fontSize = `${value}px`
    })
    publish()
  }
  function insert(event: ClipboardEvent<HTMLDivElement> | DragEvent<HTMLDivElement>) {
    event.preventDefault()
    const transfer = 'clipboardData' in event ? event.clipboardData : event.dataTransfer
    if (transfer.files.length) { setNotice('Switch to Form layout to upload a picture, then rebuild the freeform layout.'); return }
    restore()
    const rich = transfer.getData('text/html')
    if (rich) document.execCommand('insertHTML', false, sanitizeSignatureHtml(rich))
    else document.execCommand('insertText', false, transfer.getData('text/plain'))
    setNotice('')
    publish()
  }
  function drop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
    const position = document.caretRangeFromPoint?.(event.clientX, event.clientY)
    if (position && editor.current?.contains(position.startContainer)) range.current = position
    const image = dragged.current
    dragged.current = null
    if (image && editor.current?.contains(image) && range.current) {
      restore()
      range.current.insertNode(image)
      range.current.setStartAfter(image); range.current.collapse(true)
      publish()
    } else insert(event)
  }
  function resize(value: number) {
    const image = picture.current
    if (!image || !editor.current?.contains(image)) return
    const next = Math.max(24, Math.min(400, value || 80))
    image.width = next
    image.removeAttribute('height')
    image.style.width = `${next}px`
    image.style.height = 'auto'
    setWidth(next)
    publish()
  }

  return <div className="freeform">
    <div className="freeform-toolbar" role="toolbar" aria-label="Signature formatting">
      {[['bold', 'Bold'], ['italic', 'Italic'], ['underline', 'Underline']].map(([name, label]) => <button type="button" key={name} aria-label={label} onMouseDown={e => e.preventDefault()} onClick={() => command(name)} style={{ fontWeight: name === 'bold' ? 'bold' : undefined, fontStyle: name === 'italic' ? 'italic' : undefined, textDecoration: name === 'underline' ? 'underline' : undefined }}>{label}</button>)}
      <label>Font<select aria-label="Selection font" defaultValue="" onChange={e => command('fontName', e.target.value)}><option value="" disabled>Choose font</option>{Object.entries(FONT_STACKS).map(([key, font]) => <option key={key} value={font.stack}>{font.label}</option>)}</select></label>
      <label>Size<select aria-label="Selection text size" value={size} onChange={e => textSize(Number(e.target.value))}>{[10, 11, 12, 13, 14, 16, 18, 20, 24, 28, 32].map(value => <option key={value} value={value}>{value}px</option>)}</select></label>
      <label>Color<input aria-label="Selection text color" type="color" defaultValue="#111111" onChange={e => command('foreColor', e.target.value)} /></label>
      {['Left', 'Center', 'Right'].map(label => <button type="button" key={label} aria-label={`Align ${label.toLowerCase()}`} onMouseDown={e => e.preventDefault()} onClick={() => command(`justify${label}`)}>{label}</button>)}
      <button type="button" onMouseDown={e => e.preventDefault()} onClick={() => command('undo')}>Undo text</button>
      <button type="button" onMouseDown={e => e.preventDefault()} onClick={() => command('redo')}>Redo text</button>
    </div>
    <p className="freeform-note">Edit the text here. Select text to format it. Click a picture to resize it, or drag it to another place.</p>
    <div ref={editor} className="freeform-document" contentEditable suppressContentEditableWarning role="textbox" aria-label="Freeform signature editor" aria-multiline="true" spellCheck onInput={publish} onKeyUp={remember} onMouseUp={remember} onBlur={remember} onPaste={insert} onDrop={drop} onDragOver={e => e.preventDefault()} onDragEnd={() => { dragged.current = null }} onDragStart={e => {
      if (e.target instanceof HTMLImageElement) { dragged.current = e.target; e.dataTransfer.setData('text/html', sanitizeSignatureHtml(e.target.outerHTML)); e.dataTransfer.effectAllowed = 'move' }
    }} onClick={e => {
      if ((e.target as HTMLElement).closest('a')) e.preventDefault()
      const image = e.target instanceof HTMLImageElement ? e.target : null
      picture.current = image
      setSelected(!!image)
      if (image) setWidth(Math.round(image.getBoundingClientRect().width))
    }} />
    {selected && <div className="freeform-picture" aria-label="Selected picture">
      <label>Picture width<input aria-label="Picture width" type="range" min="24" max="400" value={width} onChange={e => resize(Number(e.target.value))} /></label><output>{width}px</output>
      <button type="button" onClick={() => { picture.current?.remove(); picture.current = null; setSelected(false); publish() }}>Remove picture</button>
    </div>}
    {notice && <p className="freeform-note" role="status">{notice}</p>}
  </div>
}
