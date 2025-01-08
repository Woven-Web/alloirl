import sharp from 'sharp';
import { mkdir } from 'fs/promises';
import { fileURLToPath } from 'url';
import path from 'path';

const ICON_SIZES = [192, 512];
const PUBLIC_DIR = path.join(process.cwd(), 'public');
const ICONS_DIR = path.join(PUBLIC_DIR, 'icons');

// Create a simple, modern icon - a gradient circle with "A" in it
async function generateBaseIcon(size) {
  const padding = Math.round(size * 0.1);
  const centerX = size / 2;
  const centerY = size / 2;
  const radius = (size - padding * 2) / 2;

  // Create a new SVG
  const svg = `
    <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#6366f1;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#8b5cf6;stop-opacity:1" />
        </linearGradient>
      </defs>
      <circle cx="${centerX}" cy="${centerY}" r="${radius}" fill="url(#grad)"/>
      <text 
        x="${centerX}" 
        y="${centerY + size * 0.1}" 
        font-family="Arial" 
        font-size="${size * 0.5}"
        font-weight="bold"
        fill="white"
        text-anchor="middle"
        dominant-baseline="middle">A</text>
    </svg>`;

  return Buffer.from(svg);
}

async function generateIcons() {
  try {
    // Create icons directory if it doesn't exist
    await mkdir(ICONS_DIR, { recursive: true });

    for (const size of ICON_SIZES) {
      const baseIcon = await generateBaseIcon(size);
      
      // Generate standard icon
      await sharp(baseIcon)
        .png()
        .toFile(path.join(ICONS_DIR, `icon-${size}x${size}.png`));

      // Generate Android Chrome icon
      await sharp(baseIcon)
        .png()
        .toFile(path.join(ICONS_DIR, `android-chrome-${size}x${size}.png`));
    }

    console.log('Icons generated successfully!');
  } catch (error) {
    console.error('Error generating icons:', error);
    process.exit(1);
  }
}

generateIcons();
