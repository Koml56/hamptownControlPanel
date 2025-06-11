// generate-icons.js - Run with Node.js to generate PWA icons
// Usage: node generate-icons.js source-icon.png

const sharp = require(‘sharp’); // npm install sharp
const fs = require(‘fs’);
const path = require(‘path’);

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

async function generateIcons(sourcePath) {
const outputDir = ‘./public/icons’;

// Create icons directory if it doesn’t exist
if (!fs.existsSync(outputDir)) {
fs.mkdirSync(outputDir, { recursive: true });
}

console.log(‘🎨 Generating PWA icons…’);

for (const size of sizes) {
try {
await sharp(sourcePath)
.resize(size, size, {
kernel: sharp.kernel.lanczos3,
fit: ‘contain’,
background: { r: 59, g: 130, b: 246, alpha: 1 } // Blue background
})
.png({
quality: 100,
compressionLevel: 6
})
.toFile(path.join(outputDir, `icon-${size}x${size}.png`));

```
  console.log(`✅ Generated icon-${size}x${size}.png`);
} catch (error) {
  console.error(`❌ Failed to generate ${size}x${size}:`, error.message);
}
```

}

console.log(‘🎉 All icons generated successfully!’);
console.log(`📁 Icons saved to: ${outputDir}`);
}

// Command line usage
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
${sizes.map(size => `- ${size}x${size}`).join(’\n’)}
`);
process.exit(1);
}

if (!fs.existsSync(sourceIcon)) {
console.error(`❌ Source icon not found: ${sourceIcon}`);
process.exit(1);
}

generateIcons(sourceIcon);

// Alternative: Simple HTML Canvas version (no dependencies)
// Save this as generate-icons.html and open in browser:
/*

<!DOCTYPE html>

<html>
<head>
    <title>WorkVibe Icon Generator</title>
    <style>
        body { font-family: system-ui; max-width: 600px; margin: 50px auto; padding: 20px; }
        .upload-area { border: 2px dashed #3b82f6; padding: 40px; text-align: center; border-radius: 12px; margin: 20px 0; }
        .icon-preview { display: flex; flex-wrap: wrap; gap: 10px; margin: 20px 0; }
        .icon-item { text-align: center; padding: 10px; border: 1px solid #ddd; border-radius: 8px; }
        canvas { border: 1px solid #ddd; border-radius: 4px; }
        button { background: #3b82f6; color: white; border: none; padding: 12px 24px; border-radius: 8px; cursor: pointer; font-size: 16px; }
        button:hover { background: #2563eb; }
    </style>
</head>
<body>
    <h1>🎨 WorkVibe Icon Generator</h1>
    <p>Upload your logo (minimum 512x512) to generate all PWA icon sizes:</p>

```
<div class="upload-area" onclick="document.getElementById('fileInput').click()">
    <input type="file" id="fileInput" accept="image/*" style="display: none;">
    <p>📁 Click here to select your logo image</p>
</div>

<div id="iconPreview" class="icon-preview"></div>
<button id="downloadBtn" style="display: none;" onclick="downloadAll()">📦 Download All Icons</button>

<script>
    const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
    let generatedIcons = {};

    document.getElementById('fileInput').addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = function(event) {
            generateIcons(event.target.result);
        };
        reader.readAsDataURL(file);
    });

    function generateIcons(imageSrc) {
        const img = new Image();
        img.onload = function() {
            const preview = document.getElementById('iconPreview');
            preview.innerHTML = '<h3>Generated Icons:</h3>';
            
            sizes.forEach(size => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                canvas.width = size;
                canvas.height = size;
                
                // Blue background
                ctx.fillStyle = '#3b82f6';
                ctx.fillRect(0, 0, size, size);
                
                // Draw image centered
                const scale = Math.min(size / img.width, size / img.height) * 0.8;
                const x = (size - img.width * scale) / 2;
                const y = (size - img.height * scale) / 2;
                
                ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
                
                // Store for download
                generatedIcons[`icon-${size}x${size}.png`] = canvas.toDataURL('image/png');
                
                // Create preview
                const iconDiv = document.createElement('div');
                iconDiv.className = 'icon-item';
                iconDiv.innerHTML = `
                    <canvas width="${Math.min(size, 64)}" height="${Math.min(size, 64)}"></canvas>
                    <div>${size}x${size}</div>
                `;
                
                const previewCanvas = iconDiv.querySelector('canvas');
                const previewCtx = previewCanvas.getContext('2d');
                const previewSize = Math.min(size, 64);
                previewCtx.drawImage(canvas, 0, 0, previewSize, previewSize);
                
                preview.appendChild(iconDiv);
            });
            
            document.getElementById('downloadBtn').style.display = 'block';
        };
        img.src = imageSrc;
    }

    function downloadAll() {
        Object.entries(generatedIcons).forEach(([filename, dataUrl]) => {
            const link = document.createElement('a');
            link.download = filename;
            link.href = dataUrl;
            link.click();
        });
        
        alert('🎉 All icons downloaded! Place them in your public/icons/ folder.');
    }
</script>
```

</body>
</html>
*/
