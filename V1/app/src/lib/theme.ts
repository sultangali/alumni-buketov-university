import type { CSSProperties } from 'react'
import type { Theme } from '../types'

// Design tokens. Mirrors the prototype's `vars()` method: a base set of
// radii / type-scale tokens, a per-theme colour palette, and density tokens
// that depend on whether we are in the narrow (kiosk) layout.

const base: Record<string, string> = {
  '--bw': '1px',
  '--r': '16px',
  '--r-lg': '22px',
  '--t-2xs': '11px',
  '--t-xs': '12.5px',
  '--t-sm': '14px',
  '--t-base': '15.5px',
  '--t-md': '18px',
  '--t-lg': '22px',
  '--t-xl': '28px',
  '--t-2xl': '36px',
  '--t-3xl': '46px',
}

const themes: Record<Theme, Record<string, string>> = {
  light: {
    '--c-bg': '#F3EFE7',
    '--c-bg2': '#FAF7F1',
    '--c-surface': '#FFFFFF',
    '--c-ink': '#16233F',
    '--c-ink2': '#586079',
    '--c-line': 'rgba(22,35,63,0.12)',
    '--c-primary': '#1E50A0',
    '--c-primary2': '#3a7bd5',
    '--c-gold': '#A9802F',
    '--shadow': '0 14px 34px -22px rgba(22,35,63,.5)',
  },
  dark: {
    '--c-bg': '#0A1424',
    '--c-bg2': '#0F1E36',
    '--c-surface': '#13243F',
    '--c-ink': '#EAF1FC',
    '--c-ink2': '#93A7C6',
    '--c-line': 'rgba(255,255,255,0.11)',
    '--c-primary': '#4D8AE8',
    '--c-primary2': '#6aa3f0',
    '--c-gold': '#E2BC6A',
    '--shadow': '0 16px 40px -22px rgba(0,0,0,.7)',
  },
  contrast: {
    '--c-bg': '#000000',
    '--c-bg2': '#0B0B0B',
    '--c-surface': '#0B0B0B',
    '--c-ink': '#FFFFFF',
    '--c-ink2': '#FFE600',
    '--c-line': '#FFFFFF',
    '--c-primary': '#FFE600',
    '--c-primary2': '#FFE600',
    '--c-gold': '#FFE600',
    '--shadow': 'none',
    '--bw': '2px',
    '--r': '12px',
    '--r-lg': '14px',
    '--t-2xs': '13px',
    '--t-xs': '15px',
    '--t-sm': '17px',
    '--t-base': '19px',
    '--t-md': '22px',
    '--t-lg': '27px',
    '--t-xl': '34px',
    '--t-2xl': '44px',
    '--t-3xl': '54px',
  },
}

/** Build the CSS-custom-property bundle for a theme + layout density. */
export function vars(theme: Theme, narrow: boolean, kiosk = false): CSSProperties {
  const merged: Record<string, string> = {
    ...base,
    ...themes[theme],
    '--pad': narrow ? '18px' : '40px',
    '--gap-card': narrow ? '12px' : '16px',
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
