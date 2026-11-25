/**
 * Touch feedback drawn outside React (plain DOM overlays) so it never costs a re-render:
 * - ripple: two yellow waves from the finger on the first touch
 * - tooltip: the value under the finger while dragging ("72 %")
 * - haptic: a short vibration each time the value crosses a step
 */

const ACCENT = '#F5C451'

export function ripple(x: number, y: number, scale = 1): void {
  const size = 220 * scale
  for (const i of [0, 1]) {
    const wave = document.createElement('div')
    wave.style.cssText = `position:fixed; z-index:9998; pointer-events:none; left:${x - size / 2}px; top:${y - size / 2}px; width:${size}px; height:${size}px; border-radius:50%; border:${5 * scale}px solid ${ACCENT}; background:radial-gradient(circle, rgba(245,196,81,0) 55%, rgba(245,196,81,.18) 100%); box-sizing:border-box; opacity:0;`
    document.body.appendChild(wave)
    try {
      const animation = wave.animate(
        [
          { transform: 'scale(.08)', opacity: 1 },
          { transform: 'scale(.55)', opacity: 0.75, offset: 0.45 },
          { transform: 'scale(1)', opacity: 0 },
        ],
        { duration: 820, delay: i * 190, easing: 'cubic-bezier(.15,.7,.3,1)', fill: 'both' },
      )
      animation.onfinish = () => wave.remove()
    } catch {
      wave.remove()
    }
  }
}

let tooltip: HTMLDivElement | null = null
let lastStep: number | null = null

export function showValueTooltip(x: number, y: number, label: string, step: number, scale = 1, fontFamily?: string): void {
  if (!tooltip) {
    tooltip = document.createElement('div')
    tooltip.style.cssText = `position:fixed; z-index:9999; pointer-events:none; opacity:0; transform:translate(-50%,-100%) scale(.7); transition:opacity .12s, transform .12s cubic-bezier(.2,.8,.2,1); padding:.3em .75em; border-radius:999px; background:${ACCENT}; color:#2a2008; font-weight:800; letter-spacing:-0.01em; box-shadow:0 10px 28px rgba(0,0,0,.4); white-space:nowrap;`
    document.body.appendChild(tooltip)
  }
  if (fontFamily) tooltip.style.fontFamily = fontFamily
  tooltip.style.fontSize = `${16 * scale}px`
  tooltip.style.left = `${x}px`
  tooltip.style.top = `${y - 34 * scale}px`
  tooltip.textContent = label
  tooltip.style.opacity = '1'
  tooltip.style.transform = 'translate(-50%,-100%) scale(1)'
  if (lastStep !== null && lastStep !== step) haptic()
  lastStep = step
}

export function hideValueTooltip(): void {
  lastStep = null
  if (!tooltip) return
  tooltip.style.opacity = '0'
  tooltip.style.transform = 'translate(-50%,-100%) scale(.7)'
}

export function haptic(ms = 8): void {
  try {
    navigator.vibrate?.(ms)
  } catch {
    /* not supported */
  }
}
