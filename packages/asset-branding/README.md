# Asset Branding

Brand assets, design tokens, and themes for the Dating App Platform (Flamoral).

## Overview

This package contains all the design system tokens, CSS themes, and brand assets used across the dating app platform.

## Contents

- **tokens.json** - Design tokens in JSON format
- **theme.css** - CSS custom properties and base styles
- **tailwind.preset.js** - Tailwind CSS preset
- **src/index.js** - JavaScript exports for tokens
- **src/icons/** - SVG icon assets

## Docker

Build and run the container:

```bash
docker build -t asset-branding .
docker run -p 8080:80 asset-branding
```

Access assets at:
- http://localhost:8080/tokens.json
- http://localhost:8080/theme.css
- http://localhost:8080/health

## License

MIT
