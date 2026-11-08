import type { SignatureData, StyleOpts, TemplateId } from '../types'
import { TEMPLATE_META } from '../types'
import type { IconUrls } from '../lib/icons'
import { renderSignature } from '../lib/render'

/** Every layout drawn small with the real details, so choosing is by picture instead of by name. */
export default function TemplatePicker({ data, style, icons, onPick }: { data: SignatureData; style: StyleOpts; icons: IconUrls; onPick: (template: TemplateId) => void }) {
  return <div className="template-grid" role="radiogroup" aria-label="Layout">
    {(Object.keys(TEMPLATE_META) as TemplateId[]).map(template => <button
      key={template}
      type="button"
      role="radio"
      aria-checked={style.template === template}
      className={style.template === template ? 'template-tile active' : 'template-tile'}
      onClick={() => onPick(template)}
    >
      <span className="template-thumb" aria-hidden="true" inert><span dangerouslySetInnerHTML={{ __html: renderSignature(data, { ...style, template }, icons) }} /></span>
      <span className="template-name">{TEMPLATE_META[template].label}</span>
    </button>)}
  </div>
}
