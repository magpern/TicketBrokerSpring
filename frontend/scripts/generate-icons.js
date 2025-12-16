/**
 * Script to generate PWA icons from SVG source
 * 
 * To use this script, you need to install sharp:
 * npm install -D sharp
 * 
 * Then run: node scripts/generate-icons.js
 */

import sharp from 'sharp';
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const publicDir = join(__dirname, '..', 'public');
const iconSvg = join(publicDir, 'icon.svg');

const sizes = [
  { size: 192, name: 'pwa-192x192.png' },
  { size: 512, name: 'pwa-512x512.png' },
  { size: 180, name: 'apple-touch-icon.png' }
];

async function generateIcons() {
  try {
    const svgBuffer = readFileSync(iconSvg);
    
    for (const { size, name } of sizes) {
      const outputPath = join(publicDir, name);
      await sharp(svgBuffer)
        .resize(size, size)
        .png()
        .toFile(outputPath);
      console.log(`✓ Generated ${name} (${size}x${size})`);
    }
    
    console.log('\n✓ All icons generated successfully!');
  } catch (error) {
    if (error.code === 'MODULE_NOT_FOUND') {
      console.error('Error: sharp module not found. Install it with: npm install -D sharp');
    } else {
      console.error('Error generating icons:', error.message);
    }
    process.exit(1);
  }
}

generateIcons();

