/**
 * Create square icons by extending the canvas with transparent padding
 */

const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const ASSETS_DIR = path.resolve(__dirname, '../assets');

async function makeSquare(inputPath, outputPath, targetSize = 1024) {
  console.log(`Processing: ${inputPath}`);

  try {
    // Get image metadata
    const metadata = await sharp(inputPath).metadata();
    console.log(`  Original size: ${metadata.width}x${metadata.height}`);

    // Calculate the larger dimension to make it square
    const maxDim = Math.max(metadata.width, metadata.height);

    // Create a square canvas and center the image
    const result = await sharp(inputPath)
      .resize(targetSize, targetSize, {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 1 }, // White background
      })
      .png()
      .toFile(outputPath);

    console.log(`  Created: ${outputPath} (${targetSize}x${targetSize})`);
    return true;
  } catch (error) {
    console.error(`  Error: ${error.message}`);
    return false;
  }
}

async function main() {
  console.log('Making Square Icons');
  console.log('===================');
  console.log('');

  const iconPath = path.join(ASSETS_DIR, 'icon.png');
  const adaptiveIconPath = path.join(ASSETS_DIR, 'adaptive-icon.png');

  // Backup originals
  const iconBackup = path.join(ASSETS_DIR, 'icon.original.png');
  const adaptiveBackup = path.join(ASSETS_DIR, 'adaptive-icon.original.png');

  // Backup icon.png
  if (fs.existsSync(iconPath) && !fs.existsSync(iconBackup)) {
    fs.copyFileSync(iconPath, iconBackup);
    console.log('Backed up icon.png to icon.original.png');
  }

  // Backup adaptive-icon.png
  if (fs.existsSync(adaptiveIconPath) && !fs.existsSync(adaptiveBackup)) {
    fs.copyFileSync(adaptiveIconPath, adaptiveBackup);
    console.log('Backed up adaptive-icon.png to adaptive-icon.original.png');
  }

  console.log('');

  // Create square versions (1024x1024 for App Store quality)
  await makeSquare(iconBackup || iconPath, iconPath, 1024);
  await makeSquare(adaptiveBackup || adaptiveIconPath, adaptiveIconPath, 1024);

  console.log('');
  console.log('Done! Icons are now square (1024x1024)');
}

main().catch(console.error);
