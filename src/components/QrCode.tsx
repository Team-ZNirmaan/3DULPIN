import { useMemo } from 'react'
import QRCode from 'qrcode'

/** A QR code drawn as crisp SVG squares. */
export function QrCode({ text, size = 132, label }: { text: string; size?: number; label: string }) {
  const { n, cells } = useMemo(() => {
    const qr = QRCode.create(text, { errorCorrectionLevel: 'M' })
    const n = qr.modules.size
    const cells: string[] = []
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (qr.modules.get(y, x)) cells.push(`M${x + 4} ${y + 4}h1v1h-1z`)
    return { n, cells: cells.join('') }
  }, [text])
  // Four modules of quiet space on every side, as the QR standard asks.
  return (
    <svg width={size} height={size} viewBox={`0 0 ${n + 8} ${n + 8}`} role="img" aria-label={label} shapeRendering="crispEdges">
      <rect width={n + 8} height={n + 8} fill="#fff" />
      <path d={cells} fill="#0b1f3a" />
    </svg>
  )
}
