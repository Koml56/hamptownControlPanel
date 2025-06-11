const sharp = require('sharp'); // npm install sharp
const fs = require('fs');
const path = require('path');

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

async function generateIcons(sourcePath) {
  const outputDir = './public/icons';

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  console.log('🎨 Generating PWA icons…');

  for (const size of sizes) {
    try {
      await sharp(sourcePath)
        .resize(size, size, {
          kernel: sharp.kernel.lanczos3,
          fit: 'contain',
          background: { r: 59, g: 130, b: 246, alpha: 1 },
        })
        .png({ quality: 100, compressionLevel: 6 })
        .toFile(path.join(outputDir, `icon-${size}x${size}.png`));

      console.log(`✅ Generated icon-${size}x${size}.png`);
    } catch (error) {
      console.error(`❌ Failed to generate ${size}x${size}:`, error.message);
    }
  }

  console.log('🎉 All icons generated successfully!');
  console.log(`📁 Icons saved to: ${outputDir}`);
}

const sourceIcon = process.argv[2];

if (!sourceIcon) {
  console.log(`
🎨 WorkVibe Icon Generator

Usage: node generate-icons.js <source-icon-path>

Example: node generate-icons.js logo.png

Requirements:

- Install: npm install sharp
- Source icon should be at least 512x512 pixels
- Supports PNG, JPG, SVG formats

This will generate all required PWA icon sizes:
${sizes.map(size => `- ${size}x${size}`).join('\n')}
  `);
  process.exit(1);
}

if (!fs.existsSync(sourceIcon)) {
  console.error(`❌ Source icon not found: ${sourceIcon}`);
  process.exit(1);
}

generateIcons(sourceIcon);
