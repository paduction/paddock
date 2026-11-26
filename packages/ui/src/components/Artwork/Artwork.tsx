import { useState } from 'react'
import { Icon } from '../Icon/Icon'

export interface ArtworkProps {
  /** Address of the picture; empty or null shows the icon. */
  src: string | null | undefined
  /** Class of the picture (size and rounding belong to the host). */
  className?: string
  icon: string
  iconSize: number
  iconFilled?: boolean
  iconColor?: string
}

/** A cover or a poster, and an icon in its place when there is none or when it cannot be loaded. */
export function Artwork({ src, className, icon, iconSize, iconFilled = true, iconColor = 'var(--pd-text-3)' }: ArtworkProps) {
  // A player can announce a picture that does not exist (the sound of a TV sent to speakers):
  // remember the address that failed, so a new address is tried again.
  const [failed, setFailed] = useState<string | null>(null)
  if (!src || failed === src) return <Icon name={icon} size={iconSize} filled={iconFilled} color={iconColor} />
  return <img src={src} alt="" className={className} onError={() => setFailed(src)} />
}
