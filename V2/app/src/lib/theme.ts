import type { CSSProperties } from 'react'
import type { Theme } from '../types'

// Design tokens — "Azure Legacy" editorial archive (V2), strict Swiss profile.
// A base set of geometry / type-scale / font tokens, a per-theme colour palette,
// and density tokens that depend on whether we are in the narrow (kiosk) layout.
// Strict mode (A2): zero radius, defined borders, accent rules, precise elevation.

const base: Record<string, string> = {
  '--bw': '1px',
  '--r': '0px',
  '--r-lg': '0px',
  '--r-pill': '0px',
  '--rule': '3px',
  '--t-2xs': '11px',
  '--t-xs': '12.5px',
  '--t-sm': '13.5px',
  '--t-base': '15.5px',
  '--t-md': '18px',
  '--t-lg': '23px',
  '--t-xl': '30px',
  '--t-2xl': '40px',
  '--t-3xl': '54px',
  '--font-display': "'EB Garamond', Georgia, 'Times New Roman', serif",
  '--font-ui': "'Inter', system-ui, -apple-system, sans-serif",
}

const themes: Record<Theme, Record<string, string>> = {
  light: {
    '--c-bg': '#FAFAF7',
    '--c-bg2': '#F2F1EA',
    '--c-surface': '#FFFFFF',
    '--c-ink': '#14171A',
    '--c-ink2': '#5B6159',
    '--c-line': '#E0DFD6',
    '--c-line2': '#C7C5B8',
    '--c-primary': '#1B5AA6',
    '--c-primary2': '#134A8C',
    '--c-accent': '#1B5AA6',
    '--c-accent2': '#134A8C',
    '--c-accent-weak': 'rgba(27,90,166,0.10)',
    '--c-on-accent': '#FFFFFF',
    '--c-gold': '#9A7B33',
    '--shadow': '0 2px 0 var(--c-line), 0 14px 28px -20px rgba(20,30,45,.45)',
  },
  dark: {
    '--c-bg': '#0C0F16',
    '--c-bg2': '#11151E',
    '--c-surface': '#151A24',
    '--c-ink': '#EAEEF4',
    '--c-ink2': '#97A0B0',
    '--c-line': 'rgba(255,255,255,0.13)',
    '--c-line2': 'rgba(255,255,255,0.24)',
    '--c-primary': '#5AA6EC',
    '--c-primary2': '#7DBBF2',
    '--c-accent': '#5AA6EC',
    '--c-accent2': '#7DBBF2',
    '--c-accent-weak': 'rgba(90,166,236,0.16)',
    '--c-on-accent': '#06203A',
    '--c-gold': '#D8B873',
    '--shadow': '0 2px 0 rgba(0,0,0,.5), 0 16px 30px -22px rgba(0,0,0,.8)',
  },
  contrast: {
    '--c-bg': '#000000',
    '--c-bg2': '#0B0B0B',
    '--c-surface': '#0B0B0B',
    '--c-ink': '#FFFFFF',
    '--c-ink2': '#FFE600',
    '--c-line': '#FFFFFF',
    '--c-line2': '#FFFFFF',
    '--c-primary': '#FFE600',
    '--c-primary2': '#FFE600',
    '--c-accent': '#FFE600',
    '--c-accent2': '#FFE600',
    '--c-accent-weak': 'rgba(255,230,0,0.18)',
    '--c-on-accent': '#000000',
    '--c-gold': '#FFE600',
    '--shadow': 'none',
    '--bw': '2px',
    '--r': '0px',
    '--r-lg': '0px',
    '--r-pill': '0px',
    '--t-2xs': '13px',
    '--t-xs': '15px',
    '--t-sm': '17px',
    '--t-base': '19px',
    '--t-md': '22px',
    '--t-lg': '28px',
    '--t-xl': '36px',
    '--t-2xl': '46px',
    '--t-3xl': '58px',
  },
}

/** Build the CSS-custom-property bundle for a theme + layout density. */
export function vars(theme: Theme, narrow: boolean, kiosk = false): CSSProperties {
  const merged: Record<string, string> = {
    ...base,
    ...themes[theme],
    '--pad': narrow ? '18px' : '48px',
    '--gap-card': narrow ? '12px' : '18px',
    '--gap-ctrl': narrow ? '6px' : '10px',
  }
  if (kiosk) {
    Object.assign(merged, {
      '--pad': '28px',
      '--gap-card': '16px',
      '--touch': '60px',
      '--t-2xs': '14px',
      '--t-xs': '15px',
      '--t-sm': '17px',
      '--t-base': '19px',
      '--t-md': '23px',
      '--t-lg': '30px',
      '--t-xl': '40px',
      '--t-2xl': '54px',
      '--t-3xl': '72px',
    })
  }
  return merged as CSSProperties
}
