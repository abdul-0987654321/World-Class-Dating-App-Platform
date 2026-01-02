# Flamoral Favicon Assets

## Files Included

| File | Size | Usage |
|------|------|-------|
| `favicon.svg` | 32x32 (scalable) | Modern browsers (primary) |
| `favicon-16x16.svg` | 16x16 | Legacy browser tabs |
| `favicon-32x32.svg` | 32x32 | Standard favicon |
| `apple-touch-icon-180x180.svg` | 180x180 | iOS home screen icon |

## Converting SVG to PNG/ICO

To generate PNG and ICO files from these SVGs, use one of these methods:

### Using ImageMagick (Recommended)

```bash
# Generate PNG versions
magick favicon-16x16.svg favicon-16x16.png
magick favicon-32x32.svg favicon-32x32.png
magick apple-touch-icon-180x180.svg apple-touch-icon.png

# Generate ICO (multi-resolution)
magick favicon-16x16.png favicon-32x32.png favicon.ico
```

### Using Sharp (Node.js)

```javascript
const sharp = require('sharp');

// Generate PNGs
await sharp('favicon.svg')
  .resize(16, 16)
  .png()
  .toFile('favicon-16x16.png');

await sharp('favicon.svg')
  .resize(32, 32)
  .png()
  .toFile('favicon-32x32.png');

await sharp('apple-touch-icon-180x180.svg')
  .resize(180, 180)
  .png()
  .toFile('apple-touch-icon.png');
```

### Online Tools

- [RealFaviconGenerator](https://realfavicongenerator.net/)
- [Favicon.io](https://favicon.io/favicon-converter/)

## HTML Integration

Add this to your `<head>` section:

```html
<!-- Favicon -->
<link rel="icon" type="image/svg+xml" href="/favicon.svg">
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">
<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png">

<!-- Apple Touch Icon -->
<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">

<!-- Theme Color (matches brand) -->
<meta name="theme-color" content="#EC4899">
<meta name="msapplication-TileColor" content="#0A0A0F">
```

## Design Notes

- The favicon uses a simplified version of the main Flamoral icon
- Primary colors: Pink (#EC4899), Blue (#3B82F6), Green (#22C55E)
- Optimized for visibility at small sizes
- The flame-heart symbol is the core recognizable element
- Connection dots are retained in larger sizes for brand consistency
