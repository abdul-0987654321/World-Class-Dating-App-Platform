# FLAMORAL Layout System Documentation

## Overview

This document outlines the layout system used in the FLAMORAL web application. The layout system ensures consistent spacing, alignment, and responsive behavior across all pages.

## Core Principles

1. **Container-First Layout**: All major content sections must use a container wrapper
2. **Flex/Grid Over Absolute**: Never use `position: absolute` for structural layout elements
3. **No Viewport Hacks**: Avoid `width: 100vw` or negative margin centering tricks
4. **Mobile-First Responsive**: Design for mobile first, then enhance for larger screens

## Layout Container

### Global CSS Class

The `.layout-container` class is defined in `src/index.css` and provides:

```css
.layout-container {
  width: 100%;
  max-width: 1200px;
  margin-left: auto;
  margin-right: auto;
  padding-left: 1rem;
  padding-right: 1rem;
}

/* Responsive adjustments */
@media (min-width: 640px) {
  .layout-container {
    padding-left: 1.5rem;
    padding-right: 1.5rem;
  }
}

@media (min-width: 1024px) {
  .layout-container {
    padding-left: 2rem;
    padding-right: 2rem;
  }
}
```

### Tailwind Equivalent

When using Tailwind CSS, use this pattern:

```jsx
<div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
  {/* Content */}
</div>
```

### Usage Rules

1. **Every `<section>` must contain exactly one layout container** wrapping all content
2. **No content should be a direct child of `<section>`** without the wrapper
3. **Nested containers are NOT allowed** - only one level of container per section

## Section Spacing

Use consistent vertical spacing between sections:

```css
.section-padding {
  padding-top: 4rem;    /* 64px */
  padding-bottom: 4rem;
}

@media (min-width: 768px) {
  .section-padding {
    padding-top: 6rem;  /* 96px */
    padding-bottom: 6rem;
  }
}
```

Or with Tailwind:
```jsx
<section className="py-16 md:py-24">
```

## Grid Systems

### Feature Cards (2-column)
```css
.card-grid-2 {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1rem;
}

@media (min-width: 640px) {
  .card-grid-2 {
    grid-template-columns: repeat(2, 1fr);
    gap: 1.5rem;
  }
}
```

### Feature Cards (3-column)
```css
.card-grid-3 {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1rem;
}

@media (min-width: 768px) {
  .card-grid-3 {
    grid-template-columns: repeat(3, 1fr);
    gap: 1.5rem;
  }
}
```

### Stats/Step Cards (4-column)
```css
.card-grid-4 {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
}

@media (min-width: 768px) {
  .card-grid-4 {
    grid-template-columns: repeat(4, 1fr);
    gap: 1.5rem;
  }
}
```

## CTA Centering

Always use flexbox for centering call-to-action elements:

```css
.cta-center {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
}
```

**Never use:**
- `position: absolute` with `left: 50%` and `transform: translateX(-50%)`
- `margin: 0 auto` on inline elements

## Forbidden Patterns

These patterns are flagged by the layout regression checker and must not be used:

### 1. position: absolute on layout elements
```css
/* BAD */
.card {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
}

/* GOOD */
.cards-container {
  display: flex;
  justify-content: center;
}
```

### 2. width: 100vw
```css
/* BAD */
.full-section {
  width: 100vw;
  margin-left: -50vw;
  left: 50%;
}

/* GOOD */
.full-section {
  width: 100%;
}
```

### 3. Negative margin viewport hacks
```css
/* BAD */
.break-out {
  margin-left: calc(-50vw + 50%);
  margin-right: calc(-50vw + 50%);
}

/* GOOD - use full-width section without container */
<section className="bg-pink-500">
  <div className="layout-container">
    {/* Content */}
  </div>
</section>
```

## Allowed Exceptions

The following components MAY use absolute positioning for decorative elements:

- Background gradient orbs/blobs
- Floating decorative elements
- Animation layers
- Overlays and modals

These elements must:
1. Have `pointer-events: none` if they overlap interactive content
2. Be purely decorative (not affect document flow)
3. Be contained within a relatively positioned parent

## Breakpoints

```js
// Tailwind/CSS breakpoints
xs: 375px   // Small phones
sm: 640px   // Large phones / small tablets
md: 768px   // Tablets
lg: 1024px  // Laptops
xl: 1280px  // Desktops
2xl: 1536px // Large desktops
3xl: 1440px // Wide monitors (custom)
4xl: 1920px // Ultra-wide (custom)
```

## Regression Testing

Run the layout regression check before committing:

```bash
npm run lint:layout
```

This checks for:
- `position: absolute` in layout components (warning)
- `width: 100vw` usage (error)
- Negative margin viewport hacks (error)
- Transform-based centering on structural elements (warning)
- Fixed pixel widths over 1000px (warning)

## Quick Reference

| Pattern | Use This | Not This |
|---------|----------|----------|
| Container | `.layout-container` or `max-w-7xl mx-auto` | `width: 100vw` |
| Centering | `flex justify-center` | `position: absolute; left: 50%` |
| Grid | `grid grid-cols-1 md:grid-cols-3` | Manual `width: 33.33%` floats |
| Spacing | `py-16 md:py-24` or `.section-padding` | `margin-top: 100px` |
| Full-width bg | Section with bg, container inside | `width: 100vw; margin-left: -50vw` |
