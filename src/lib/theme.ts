import { argbFromHex, Hct, hexFromArgb, SchemeTonalSpot } from '@material/material-color-utilities'

export function applyTheme(seed: string, dark: boolean) {
  const scheme = new SchemeTonalSpot(Hct.fromInt(argbFromHex(seed)), dark, 0)
  const roles = {
    background: scheme.neutralPalette.tone(dark ? 6 : 98),
    foreground: scheme.onSurface,
    card: dark ? scheme.surfaceContainerLow : scheme.surfaceContainerLowest,
    primary: scheme.primary,
    'primary-foreground': scheme.onPrimary,
    muted: dark ? scheme.surfaceContainerHigh : scheme.surfaceContainer,
    'muted-foreground': scheme.onSurfaceVariant,
    accent: scheme.primaryContainer,
    'accent-foreground': scheme.onPrimaryContainer,
    border: scheme.neutralVariantPalette.tone(dark ? 27 : 89),
    input: dark ? scheme.neutralVariantPalette.tone(44) : scheme.outlineVariant,
    ring: scheme.primary,
    destructive: scheme.error,
    'hero-start': scheme.primaryPalette.tone(dark ? 19 : 94),
    'hero-end': scheme.tertiaryPalette.tone(dark ? 14 : 96),
  }
  const style = document.getElementById('feel-theme') ?? document.createElement('style')
  style.id = 'feel-theme'
  const variables = Object.entries(roles).map(([key, role]) => `--${key}: ${hexFromArgb(role)}`).join(';')
  style.textContent = `html:root${dark ? '.dark' : ':not(.dark)'} { ${variables} }`
  if (!style.isConnected) document.head.append(style)
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', hexFromArgb(roles.background))
}
