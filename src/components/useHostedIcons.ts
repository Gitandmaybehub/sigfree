import { useEffect, useRef, useState } from 'react'
import type { SignatureData, StyleOpts } from '../types'
import { SOCIALS, iconKey, parseSocialValue } from '../lib/icons'
import type { IconUrls } from '../lib/icons'
import { drawIcon } from '../lib/iconImage'
import { hostImage } from '../lib/upload'
import { loadIconUrls, saveIconUrls } from '../lib/storage'

/**
 * Draws and hosts the social icons the signature needs in the chosen color and shape.
 * Waits until color changes settle, then uploads only icons not hosted before.
 * Returns the hosted URLs and how many icons are still being prepared.
 */
export function useHostedIcons(data: SignatureData, style: StyleOpts): { icons: IconUrls; pending: number; failed: boolean } {
  const [icons, setIcons] = useState<IconUrls>(loadIconUrls)
  const [pending, setPending] = useState(0)
  const [failed, setFailed] = useState(false)
  const hosted = useRef(icons)
  const needed = SOCIALS
    .filter(network => parseSocialValue(network, data.socials[network.key] ?? '')?.custom === false)
    .map(network => network.key)
    .join(',')
  const { iconColor, iconShape } = style

  useEffect(() => {
    const missing = needed.split(',').filter(network => network && !hosted.current[iconKey(network, iconColor, iconShape)])
    if (!missing.length) return
    let cancelled = false
    const timer = window.setTimeout(async () => {
      setPending(missing.length); setFailed(false)
      for (const network of missing) {
        if (cancelled) return
        try {
          const url = await hostImage(await drawIcon(network, iconColor, iconShape))
          // A finished upload is kept even if the choice changed, so switching back is instant.
          hosted.current = { ...hosted.current, [iconKey(network, iconColor, iconShape)]: url }
          saveIconUrls(hosted.current)
          setIcons(hosted.current)
        } catch { if (!cancelled) setFailed(true) }
        if (!cancelled) setPending(count => Math.max(0, count - 1))
      }
    }, 900)
    return () => { cancelled = true; window.clearTimeout(timer); setPending(0) }
  }, [needed, iconColor, iconShape])

  return { icons, pending, failed }
}
