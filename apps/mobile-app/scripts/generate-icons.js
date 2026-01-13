/**
 * Generate mobile app icons from Flamoral brand SVG files
 *
 * This script converts the SVG icons from /apps/branding/logo/ into
 * properly sized PNG files for iOS and Android mobile apps.
 *
 * Required icon sizes:
 * - icon.png: 1024x1024 (iOS App Store icon)
 * - adaptive-icon.png: 1024x1024 (Android adaptive icon foreground)
 * - notification-icon.png: 96x96 (Android notification icon)
 * - splash.png: 1284x2778 (splash screen with centered icon)
 *
 * Usage:
 *   cd apps/mobile-app
 *   node scripts/generate-icons.js
 *
 * Prerequisites:
 *   npm install sharp
 */

const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

// Paths
const BRANDING_DIR = path.resolve(__dirname, '../../branding/logo');
const ASSETS_DIR = path.resolve(__dirname, '../assets');

// Source SVG files
const ICON_SVG = path.join(BRANDING_DIR, 'flamoral-icon.svg');

// Brand colors
const BRAND_PINK = '#EC4899';
const BRAND_WHITE = '#FFFFFF';
const BRAND_DARK = '#0A0A0F';

async function ensureAssetsDir() {
  if (!fs.existsSync(ASSETS_DIR)) {
    fs.mkdirSync(ASSETS_DIR, { recursive: true });
  }
}

/**
 * Generate the main app icon (1024x1024)
 * Used for iOS App Store and general app icon
 */
async function generateAppIcon() {
  console.log('Generating icon.png (1024x1024)...');

  const svgContent = fs.readFileSync(ICON_SVG, 'utf-8');

  // Modify SVG to have a white background for app icon
  const svgWithBackground = svgContent.replace(
    '<svg ',
    '<svg style="background-color: #FFFFFF;" '
  );

  await sharp(Buffer.from(svgWithBackground))
    .resize(1024, 1024, {
      fit: 'contain',
      background: { r: 255, g: 255, b: 255, alpha: 1 },
    })
    .png()
    .toFile(path.join(ASSETS_DIR, 'icon.png'));

  console.log('  Created icon.png');
}

/**
 * Generate Android adaptive icon foreground (1024x1024)
 * This should be the icon on a transparent background
 * Android will apply its own background and mask
 */
async function generateAdaptiveIcon() {
  console.log('Generating adaptive-icon.png (1024x1024)...');

  const svgContent = fs.readFileSync(ICON_SVG, 'utf-8');

  // For adaptive icons, we want transparent background
  // The icon should be about 66% of the full size (centered)
  // to account for the adaptive icon safe zone
  await sharp(Buffer.from(svgContent))
    .resize(682, 682, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .extend({
      top: 171,
      bottom: 171,
      left: 171,
      right: 171,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toFile(path.join(ASSETS_DIR, 'adaptive-icon.png'));

  console.log('  Created adaptive-icon.png');
}

/**
 * Generate notification icon (96x96)
 * Android notification icons should be monochrome/white silhouette
 * We'll create a simplified version
 */
async function generateNotificationIcon() {
  console.log('Generating notification-icon.png (96x96)...');

  // Create a simplified notification icon
  // Using just the flame-heart shape in white on transparent
  const notificationSvg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
      <path
        d="M32 56
           C32 56 12 42 12 28
           C12 20 18 14 26 14
           C29 14 31 16 32 18
           C33 16 35 14 38 14
           C46 14 52 20 52 28
           C52 42 32 56 32 56Z"
        fill="#FFFFFF"
      />
    </svg>
  `;

  await sharp(Buffer.from(notificationSvg))
    .resize(96, 96, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toFile(path.join(ASSETS_DIR, 'notification-icon.png'));

  console.log('  Created notification-icon.png');
}

/**
 * Generate splash screen (1284x2778)
 * Shows the icon centered on a brand-colored background
 */
async function generateSplashScreen() {
  console.log('Generating splash.png (1284x2778)...');

  const svgContent = fs.readFileSync(ICON_SVG, 'utf-8');

  // First, resize the icon
  const iconBuffer = await sharp(Buffer.from(svgContent))
    .resize(400, 400, {
      fit: 'contain',
      background: { r: 255, g: 255, b: 255, alpha: 0 },
    })
    .png()
    .toBuffer();

  // Create the splash screen with the icon centered
  // White background with icon centered
  await sharp({
    create: {
      width: 1284,
      height: 2778,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 1 },
    },
  })
    .composite([
      {
        input: iconBuffer,
        gravity: 'center',
      },
    ])
    .png()
    .toFile(path.join(ASSETS_DIR, 'splash.png'));

  console.log('  Created splash.png');
}

/**
 * Verify all source files exist
 */
function verifySourceFiles() {
  if (!fs.existsSync(ICON_SVG)) {
    throw new Error(`Source SVG not found: ${ICON_SVG}`);
  }
  console.log('Source SVG verified:', ICON_SVG);
}

async function main() {
  console.log('===========================================');
  console.log('Flamoral Mobile App Icon Generator');
  console.log('===========================================\n');

  try {
    verifySourceFiles();
    await ensureAssetsDir();

    await generateAppIcon();
    await generateAdaptiveIcon();
    await generateNotificationIcon();
    await generateSplashScreen();

    console.log('\n===========================================');
    console.log('All icons generated successfully!');
    console.log('===========================================');
    console.log('\nGenerated files:');
    console.log(`  - ${path.join(ASSETS_DIR, 'icon.png')} (1024x1024)`);
    console.log(`  - ${path.join(ASSETS_DIR, 'adaptive-icon.png')} (1024x1024)`);
    console.log(`  - ${path.join(ASSETS_DIR, 'notification-icon.png')} (96x96)`);
    console.log(`  - ${path.join(ASSETS_DIR, 'splash.png')} (1284x2778)`);
  } catch (error) {
    console.error('Error generating icons:', error.message);
    process.exit(1);
  }
}

main();
