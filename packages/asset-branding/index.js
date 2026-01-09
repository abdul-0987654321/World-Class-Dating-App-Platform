/**
 * Flamoral Brand System - JavaScript Exports
 */

const tokens = require('../tokens.json');

const colors = tokens.colors;
const typography = tokens.typography;
const spacing = tokens.spacing;
const borderRadius = tokens.borderRadius;
const shadows = tokens.shadows;

function getColor(path) {
  const parts = path.split('.');
  let result = colors;
  for (const part of parts) {
    if (result && typeof result === 'object') {
      result = result[part];
    } else {
      return undefined;
    }
  }
  return result;
}

function getCSSVariable(category, name) {
  return `var(--${category}-${name})`;
}

function toCSS() {
  const lines = [':root {'];
  Object.entries(colors).forEach(([colorName, value]) => {
    if (typeof value === 'object') {
      Object.entries(value).forEach(([shade, hex]) => {
        lines.push(`  --color-${colorName}-${shade}: ${hex};`);
      });
    } else {
      lines.push(`  --color-${colorName}: ${value};`);
    }
  });
  Object.entries(spacing).forEach(([key, value]) => {
    lines.push(`  --spacing-${key}: ${value};`);
  });
  Object.entries(borderRadius).forEach(([key, value]) => {
    lines.push(`  --radius-${key}: ${value};`);
  });
  lines.push('}');
  return lines.join('\n');
}

const icons = {};

module.exports = {
  tokens,
  colors,
  typography,
  spacing,
  borderRadius,
  shadows,
  getColor,
  getCSSVariable,
  toCSS,
  icons,
};
