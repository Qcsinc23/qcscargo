# QCS Cargo Brand Colors Guide

This document outlines the color system for QCS Cargo and provides guidelines for consistent brand application across the website.

## Brand Color System

### Primary Colors (Green Brand)
- **Primary Green**: `#2B5D3A` (HSL: 143 38% 27%)
  - Usage: Actions, headers, CTAs, brand surfaces
  - CSS Token: `--primary: 143 38% 27%`
  - Tailwind: `bg-primary`, `text-primary`, `border-primary`

- **Primary Green (Dark Mode)**: Slightly lighter for better contrast
  - CSS Token: `--primary: 143 38% 35%`

### Secondary Colors (Neutral UI)
- **Secondary**: Neutral gray tones for UI chrome and containers
  - Usage: Surfaces, containers, non-brand elements
  - CSS Token: `--secondary: 210 40% 96%`
  - Tailwind: `bg-secondary`, `text-secondary`

### Accent Colors
- **Yellow Accent**: `#F5A623`
  - Usage: Promotional highlights, "save" indicators, emphasis badges
  - Tailwind: `bg-accent` (mapped to yellow in config)

### Semantic Colors
- **Success Green**: `#10b981` - For positive financial indicators, savings, success states
- **Warning Yellow**: `#f59e0b` - For warnings and cautions
- **Error Red**: `#dc2626` - For errors and destructive actions

## Usage Guidelines

### ✅ DO Use
- `bg-primary` for brand actions and CTAs
- `text-primary` for brand links and highlights
- `border-primary` for brand borders and focus rings
- `bg-primary/10` for subtle brand-tinted backgrounds
- `text-primary-foreground` on `bg-primary` surfaces for proper contrast

### ❌ DON'T Use
- Raw color utilities for brand hues (e.g., `bg-green-600`, `text-blue-500`)
- Hardcoded hex values in components
- Blue color utilities for brand elements (legacy colors)

## Color Mapping

### Before (Blue Theme)
```css
/* Old blue tokens */
--primary: 221.2 83.2% 53.3%;  /* Blue */
--ring: 221.2 83.2% 53.3%;     /* Blue focus ring */
```

### After (Green Theme)
```css
/* New green tokens */
--primary: 143 38% 27%;         /* ~#2B5D3A */
--ring: 143 38% 27%;            /* Aligned focus ring */
```

## Component Examples

### Hero Sections
```jsx
// ✅ Correct
<section className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground">

// ❌ Avoid
<section className="bg-gradient-to-r from-blue-900 to-blue-700 text-white">
```

### CTA Buttons
```jsx
// ✅ Correct
<button className="bg-primary text-primary-foreground hover:bg-primary/90">

// ❌ Avoid
<button className="bg-blue-600 text-white hover:bg-blue-700">
```

### Info Blocks
```jsx
// ✅ Correct - Brand tinted
<div className="bg-primary/5 border-l-4 border-primary">

// ✅ Correct - Neutral
<div className="bg-muted border-l-4 border-border">

// ❌ Avoid
<div className="bg-blue-50 border-l-4 border-blue-600">
```

## Accessibility

### Contrast Requirements
- All text on `bg-primary` uses `text-primary-foreground` (near-white) for WCAG AA compliance
- Focus rings use `ring-primary` to maintain brand consistency
- Interactive elements maintain proper contrast ratios

### Testing
- Use browser dev tools to verify contrast ratios
- Test with screen readers and keyboard navigation
- Ensure focus indicators are visible and branded

## Implementation Checklist

- [x] Updated CSS design tokens in `src/index.css`
- [x] Aligned Tailwind config to use semantic tokens
- [x] Replaced hardcoded blues in BusinessServices.tsx
- [x] Replaced hardcoded blues in RatesPage.tsx  
- [x] Replaced hardcoded blues in Header.tsx
- [ ] Add ESLint rule to prevent hardcoded blue utilities
- [ ] Visual regression testing
- [ ] Accessibility audit

## Maintenance

### Adding New Components
1. Use semantic color utilities (`bg-primary`, `text-primary`, etc.)
2. Avoid hardcoded color values
3. Test in both light and dark modes
4. Verify accessibility compliance

### Future Updates
- All brand color changes should be made in CSS tokens (`src/index.css`)
- Component-level colors should use semantic utilities
- Document any new color additions in this guide

---

**Last Updated**: January 2025  
**Version**: 1.0  
**Contact**: Development Team
