
# Switch to Clean & Minimal Fonts

## Overview
Replace the current font stack (Space Grotesk, Space Mono, Lora, Roboto) with a minimal, Swiss-inspired typography system that's clean and modern.

## Recommended Font Pairing

| Usage | Current | New |
|-------|---------|-----|
| Sans-serif (UI) | Space Grotesk | **Inter** |
| Monospace (Data) | Space Mono | **JetBrains Mono** |
| Serif (Editorial) | Lora | **Remove** (not used) |

**Why Inter + JetBrains Mono:**
- **Inter** - Designed specifically for screens, highly legible at small sizes, clean geometric shapes, free from Google Fonts
- **JetBrains Mono** - Clean monospace with ligatures, excellent for numbers/data, pairs well with Inter

## Changes

### 1. Update Google Font imports in `src/index.css`
Remove the 5 current font imports and replace with 2 minimal fonts:
- Import Inter (weights: 300, 400, 500, 600, 700)
- Import JetBrains Mono (weights: 400, 500)

### 2. Update CSS variables in `src/index.css`
Change the font-family variables:
```css
--font-sans: 'Inter', ui-sans-serif, system-ui, sans-serif;
--font-mono: 'JetBrains Mono', ui-monospace, monospace;
```

### 3. Update Tailwind config in `tailwind.config.ts`
Update the fontFamily definitions to match:
```
sans: ['Inter', 'ui-sans-serif', ...]
mono: ['JetBrains Mono', 'ui-monospace', ...]
```
Remove the serif definition if unused.

## Files to Modify
- `src/index.css` - Font imports and CSS variables
- `tailwind.config.ts` - Tailwind font family config

## Result
A cleaner, more minimal typography with better screen readability and reduced page weight (fewer font files to load).
