import type { ReactNode } from 'react'

// Monochrome vector icons. They inherit color via `currentColor`, so set the
// parent's `color` to tint them. No emoji — these render identically everywhere.

export type IconName =
  | 'cap'
  | 'person'
  | 'trophy'
  | 'medal'
  | 'building'
  | 'search'
  | 'plus'
  | 'play'
  | 'image'
  | 'check'
  | 'home'
  | 'gear'
  | 'edit'
  | 'sun'
  | 'moon'
  | 'slideshow'
  | 'chevronLeft'
  | 'chevronRight'

const PATHS: Record<IconName, ReactNode> = {
  chevronLeft: <path d="M15 5l-7 7 7 7" />,
  chevronRight: <path d="M9 5l7 7-7 7" />,
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.4 5.4l1.4 1.4M17.2 17.2l1.4 1.4M18.6 5.4l-1.4 1.4M6.8 17.2l-1.4 1.4" />
    </>
  ),
  moon: <path d="M20.5 13.2A8 8 0 1 1 10.8 3.5a6.3 6.3 0 0 0 9.7 9.7z" />,
  slideshow: (
    <>
      <rect x="3" y="4" width="18" height="13" rx="1.5" />
      <path d="M10 8.5l4 2.5-4 2.5z" />
      <path d="M8 20.5h8" />
    </>
  ),
  gear: (
    <>
      <circle cx="12" cy="12" r="3.2" />
      <path d="M12 2.5v2.6M12 18.9v2.6M4.4 12H1.8M22.2 12h-2.6M6.05 6.05l1.85 1.85M16.1 16.1l1.85 1.85M6.05 17.95l1.85-1.85M16.1 7.9l1.85-1.85" />
    </>
  ),
  edit: (
    <>
      <path d="M4 20h4L18.5 9.5l-4-4L4 16z" />
      <path d="M13.5 6.5l4 4" />
    </>
  ),
  cap: (
    <>
      <path d="M2 9l10-4 10 4-10 4z" />
      <path d="M6 11.2V16c0 1.1 2.7 2.4 6 2.4s6-1.3 6-2.4v-4.8" />
      <path d="M22 9v4.6" />
    </>
  ),
  person: (
    <>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5.5 20a6.5 6.5 0 0 1 13 0" />
    </>
  ),
  trophy: (
    <>
      <path d="M7 4h10v5a5 5 0 0 1-10 0z" />
      <path d="M7 6H4.5A2.5 2.5 0 0 0 7 8.5" />
      <path d="M17 6h2.5A2.5 2.5 0 0 1 17 8.5" />
      <path d="M12 14v3" />
      <path d="M8.5 21h7" />
      <path d="M9.5 21a2.5 2.5 0 0 1 5 0" />
    </>
  ),
  medal: (
    <>
      <circle cx="12" cy="14.5" r="5.5" />
      <path d="M8.5 9.5 6 3.5" />
      <path d="M15.5 9.5 18 3.5" />
      <path d="M12 9V3.5" />
    </>
  ),
  building: (
    <>
      <path d="M3 21h18" />
      <path d="M4 10l8-6 8 6" />
      <path d="M5 10v8M9 10v8M15 10v8M19 10v8" />
      <path d="M4 18h16" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.6-3.6" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  play: <path d="M7 5l12 7-12 7z" />,
  image: (
    <>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <circle cx="8.5" cy="9.5" r="1.5" />
      <path d="m3 17 5-5 4 4 3-3 6 6" />
    </>
  ),
  check: <path d="M20 6 9 17l-5-5" />,
  home: (
    <>
      <path d="M4 11 12 4l8 7" />
      <path d="M6 10v9a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-9" />
      <path d="M10 20v-5h4v5" />
    </>
  ),
}

export function Icon({ name, size = 22 }: { name: IconName; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.9}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={{ display: 'block', flex: '0 0 auto' }}
    >
      {PATHS[name]}
    </svg>
  )
}
