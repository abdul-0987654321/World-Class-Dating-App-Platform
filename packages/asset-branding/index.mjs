/**
 * Flamoral Brand System - ES Module Exports
 */

import tokens from './tokens.json' assert { type: 'json' };

export const colors = tokens.colors;
export const typography = tokens.typography;
export const spacing = tokens.spacing;
export const borderRadius = tokens.borderRadius;
export const shadows = tokens.shadows;

export function getColor(pathStr) {
  const parts = pathStr.split('.');
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

export function getCSSVariable(category, name) {
  return `var(--${category}-${name})`;
}

export function toCSS() {
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
  return lines.join('
');
}

export const icons = {};

export { tokens };

export default {
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