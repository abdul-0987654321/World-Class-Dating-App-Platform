#!/usr/bin/env node
/**
 * Flamoral Asset Branding Build Script
 * Generates CommonJS, ESM, and TypeScript declaration files
 */

const fs = require('fs');
const path = require('path');

const rootDir = path.join(__dirname, '..');
const srcDir = path.join(rootDir, 'src');

console.log('Building @flamoral/asset-branding...');

// Read the source file
const sourceCode = fs.readFileSync(path.join(srcDir, 'index.js'), 'utf-8');

// Generate CommonJS version (index.js) - just copy from src
fs.writeFileSync(path.join(rootDir, 'index.js'), sourceCode);
console.log('  Generated: index.js (CommonJS)');

// Generate ESM version (index.mjs)
const esmContent = [
  '/**',
  ' * Flamoral Brand System - ES Module Exports',
  ' */',
  '',
  "import tokens from './tokens.json' assert { type: 'json' };",
  '',
  'export const colors = tokens.colors;',
  'export const typography = tokens.typography;',
  'export const spacing = tokens.spacing;',
  'export const borderRadius = tokens.borderRadius;',
  'export const shadows = tokens.shadows;',
  '',
  'export function getColor(pathStr) {',
  "  const parts = pathStr.split('.');",
  '  let result = colors;',
  '  for (const part of parts) {',
  "    if (result && typeof result === 'object') {",
  '      result = result[part];',
  '    } else {',
  '      return undefined;',
  '    }',
  '  }',
  '  return result;',
  '}',
  '',
  'export function getCSSVariable(category, name) {',
  '  return `var(--${category}-${name})`;',
  '}',
  '',
  'export function toCSS() {',
  "  const lines = [':root {'];",
  '  Object.entries(colors).forEach(([colorName, value]) => {',
  "    if (typeof value === 'object') {",
  '      Object.entries(value).forEach(([shade, hex]) => {',
  '        lines.push(`  --color-${colorName}-${shade}: ${hex};`);',
  '      });',
  '    } else {',
  '      lines.push(`  --color-${colorName}: ${value};`);',
  '    }',
  '  });',
  '  Object.entries(spacing).forEach(([key, value]) => {',
  '    lines.push(`  --spacing-${key}: ${value};`);',
  '  });',
  '  Object.entries(borderRadius).forEach(([key, value]) => {',
  '    lines.push(`  --radius-${key}: ${value};`);',
  '  });',
  "  lines.push('}');",
  "  return lines.join('\n');",
  '}',
  '',
  'export const icons = {};',
  '',
  'export { tokens };',
  '',
  'export default {',
  '  tokens,',
  '  colors,',
  '  typography,',
  '  spacing,',
  '  borderRadius,',
  '  shadows,',
  '  getColor,',
  '  getCSSVariable,',
  '  toCSS,',
  '  icons,',
  '};',
].join('\n');
fs.writeFileSync(path.join(rootDir, 'index.mjs'), esmContent);
console.log('  Generated: index.mjs (ESM)');

// Generate TypeScript declarations (index.d.ts)
const dtsContent = [
  '/**',
  ' * Flamoral Brand System - TypeScript Declarations',
  ' */',
  '',
  'export interface ColorToken {',
  '  [key: string]: string | ColorToken;',
  '}',
  '',
  'export interface TypographyToken {',
  '  fontFamily: { sans: string; mono: string; };',
  '  fontSize: { [key: string]: string; };',
  '  fontWeight: { [key: string]: number; };',
  '  lineHeight: { [key: string]: number | string; };',
  '  letterSpacing: { [key: string]: string; };',
  '}',
  '',
  'export interface SpacingToken { [key: string]: string; }',
  'export interface BorderRadiusToken { [key: string]: string; }',
  'export interface ShadowToken { [key: string]: string; }',
  '',
  'export interface Tokens {',
  '  colors: ColorToken;',
  '  typography: TypographyToken;',
  '  spacing: SpacingToken;',
  '  borderRadius: BorderRadiusToken;',
  '  shadows: ShadowToken;',
  '}',
  '',
  'export declare const tokens: Tokens;',
  'export declare const colors: ColorToken;',
  'export declare const typography: TypographyToken;',
  'export declare const spacing: SpacingToken;',
  'export declare const borderRadius: BorderRadiusToken;',
  'export declare const shadows: ShadowToken;',
  'export declare const icons: Record<string, string>;',
  '',
  'export declare function getColor(path: string): string | undefined;',
  'export declare function getCSSVariable(category: string, name: string): string;',
  'export declare function toCSS(): string;',
  '',
  'declare const _default: {',
  '  tokens: Tokens;',
  '  colors: ColorToken;',
  '  typography: TypographyToken;',
  '  spacing: SpacingToken;',
  '  borderRadius: BorderRadiusToken;',
  '  shadows: ShadowToken;',
  '  getColor: typeof getColor;',
  '  getCSSVariable: typeof getCSSVariable;',
  '  toCSS: typeof toCSS;',
  '  icons: Record<string, string>;',
  '};',
  '',
  'export default _default;',
].join('\n');
fs.writeFileSync(path.join(rootDir, 'index.d.ts'), dtsContent);
console.log('  Generated: index.d.ts (TypeScript)');

console.log('Build complete!');
