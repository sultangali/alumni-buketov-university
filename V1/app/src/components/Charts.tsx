import type { CSSProperties } from 'react'

export interface Slice {
  label: string
  value: number
  color: string
}

/** Polar → cartesian on a unit circle, 12 o'clock = -90°, clockwise. */
function pt(cx: number, cy: number, r: number, frac: number) {
  const a = 2 * Math.PI * frac - Math.PI / 2
  return [cx + r * Math.cos(a), cy + r * Math.sin(a)]
}

/**
 * Dependency-free donut/pie chart (SVG). Renders filled wedges from `data`
 * with a centred total, plus a legend. A single non-zero slice draws as a
 * full ring (arc paths degenerate at 100%).
 */
export function PieChart({
  data,
  size = 168,
  thickness = 30,
  centerLabel,
  centerSub,
}: {
  data: Slice[]
  size?: number
  thickness?: number
  centerLabel?: string
  centerSub?: string
}) {
  const slices = data.filter((s) => s.value > 0)
  const total = slices.reduce((s, x) => s + x.value, 0)
  const cx = size / 2
  const cy = size / 2
  const rOuter = size / 2
  const rInner = Math.max(0, rOuter - thickness)
  const single = slices.length === 1

  let acc = 0
  const wedges = slices.map((s, i) => {
    const start = acc / total
    acc += s.value
    const end = acc / total
    const large = end - start > 0.5 ? 1 : 0
    const [ox1, oy1] = pt(cx, cy, rOuter, start)
    const [ox2, oy2] = pt(cx, cy, rOuter, end)
    const [ix2, iy2] = pt(cx, cy, rInner, end)
    const [ix1, iy1] = pt(cx, cy, rInner, start)
    const d = `M${ox1},${oy1} A${rOuter},${rOuter} 0 ${large} 1 ${ox2},${oy2} L${ix2},${iy2} A${rInner},${rInner} 0 ${large} 0 ${ix1},${iy1} Z`
    return <path key={i} d={d} fill={s.color} />
  })

  const legendItem: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 9,
    fontSize: 'var(--t-xs)',
    color: 'var(--c-ink)',
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 22, flexWrap: 'wrap' }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ flex: '0 0 auto' }} role="img">
        {single ? (
          <>
            <circle cx={cx} cy={cy} r={(rOuter + rInner) / 2} fill="none" stroke={slices[0].color} strokeWidth={thickness} />
          </>
        ) : (
          wedges
        )}
        {(centerLabel || centerSub) && (
          <>
            <text
              x={cx}
              y={centerSub ? cy - 2 : cy + 6}
              textAnchor="middle"
              style={{ fontFamily: 'Lora, serif', fontWeight: 700, fontSize: 26, fill: 'var(--c-ink)' }}
            >
              {centerLabel}
            </text>
            {centerSub && (
              <text
                x={cx}
                y={cy + 18}
                textAnchor="middle"
                style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 600, fontSize: 11, fill: 'var(--c-ink2)' }}
              >
                {centerSub}
              </text>
            )}
          </>
        )}
      </svg>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1, minWidth: 130 }}>
        {slices.map((s, i) => {
          const pct = total ? Math.round((s.value / total) * 100) : 0
          return (
            <div key={i} style={legendItem}>
              <span
                style={{
                  width: 11,
                  height: 11,
                  borderRadius: 3,
                  background: s.color,
                  flex: '0 0 auto',
                }}
              />
              <span
                style={{
                  flex: 1,
                  minWidth: 0,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  fontWeight: 600,
                }}
              >
                {s.label}
              </span>
              <span style={{ color: 'var(--c-ink2)', fontWeight: 700, flex: '0 0 auto' }}>
                {s.value} · {pct}%
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
