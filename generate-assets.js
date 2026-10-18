const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// Ensure public/assets directory exists
const targetDirs = [
  path.join(__dirname, 'public', 'assets'),
  'C:\\Users\\OZEYID\\Documents\\CodeAlpha_SocialMediaPlatform\\public\\assets'
];

targetDirs.forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// 1. logo-icon.svg
const logoIconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="none">
  <defs>
    <linearGradient id="linkoraBg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#4F46E5" />
      <stop offset="100%" stop-color="#4338CA" />
    </linearGradient>
  </defs>
  <rect width="100" height="100" rx="22" fill="url(#linkoraBg)"/>
  <!-- Stylized L with chain-link curve and connection nodes -->
  <path d="M34 24 C34 19.58 37.58 16 42 16 C46.42 16 50 19.58 50 24 V52 C50 54.21 51.79 56 54 56 H72 C76.42 56 80 59.58 80 64 C80 68.42 76.42 72 72 72 H52 C39.85 72 34 62.15 34 50 Z" fill="#FFFFFF"/>
  <circle cx="68" cy="32" r="7" fill="#C7D2FE"/>
  <path d="M50 32 H61" stroke="#C7D2FE" stroke-width="4" stroke-linecap="round"/>
</svg>`;

// 2. logo.svg (icon + wordmark)
const logoSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 180 44" fill="none">
  <defs>
    <linearGradient id="linkoraLogoBg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#4F46E5" />
      <stop offset="100%" stop-color="#4338CA" />
    </linearGradient>
  </defs>
  <g transform="translate(0, 2)">
    <rect width="40" height="40" rx="10" fill="url(#linkoraLogoBg)"/>
    <path d="M14 11 C14 9.34 15.34 8 17 8 C18.66 8 20 9.34 20 11 V21 C20 22.1 20.9 23 22 23 H29 C30.66 23 32 24.34 32 26 C32 27.66 30.66 29 29 29 H21 C16.58 29 14 25.42 14 21 Z" fill="#FFFFFF"/>
    <circle cx="28" cy="14" r="3" fill="#C7D2FE"/>
    <path d="M20 14 H25" stroke="#C7D2FE" stroke-width="2" stroke-linecap="round"/>
  </g>
  <text x="52" y="30" fill="#F8FAFC" font-family="'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="24" font-weight="700" letter-spacing="-0.03em">Linkora</text>
</svg>`;

// 3. favicon.svg
const faviconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" fill="none">
  <rect width="32" height="32" rx="8" fill="#4F46E5"/>
  <path d="M11 8 C11 6.89 11.89 6 13 6 C14.11 6 15 6.89 15 8 V16 C15 16.55 15.45 17 16 17 H22 C23.11 17 24 17.89 24 19 C24 20.11 23.11 21 22 21 H16 C12.68 21 11 18.5 11 16 Z" fill="#FFFFFF"/>
  <circle cx="21" cy="10" r="2.2" fill="#C7D2FE"/>
</svg>`;

function writeFiles(filename, content) {
  targetDirs.forEach(dir => {
    fs.writeFileSync(path.join(dir, filename), content);
  });
}

writeFiles('logo-icon.svg', logoIconSvg);
writeFiles('logo.svg', logoSvg);
writeFiles('favicon.svg', faviconSvg);
console.log('✅ SVGs created: logo.svg, logo-icon.svg, favicon.svg');

// PNG Generator Helper
function createPNG(width, height, getPixelRGBA) {
  const rowSize = 1 + width * 4;
  const rawData = Buffer.alloc(rowSize * height);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowSize;
    rawData[rowOffset] = 0;
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = getPixelRGBA(x, y);
      const pixelOffset = rowOffset + 1 + x * 4;
      rawData[pixelOffset] = r;
      rawData[pixelOffset + 1] = g;
      rawData[pixelOffset + 2] = b;
      rawData[pixelOffset + 3] = a;
    }
  }

  const compressed = zlib.deflateSync(rawData);

  function crc32(buf) {
    let crc = 0xffffffff;
    for (let i = 0; i < buf.length; i++) {
      let byte = buf[i];
      for (let j = 0; j < 8; j++) {
        const bit = (byte ^ crc) & 1;
        crc = (crc >>> 1) ^ (bit ? 0xedb88320 : 0);
        byte >>>= 1;
      }
    }
    return (crc ^ 0xffffffff) >>> 0;
  }

  function makeChunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const typeAndData = Buffer.concat([Buffer.from(type, 'ascii'), data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(typeAndData), 0);
    return Buffer.concat([len, typeAndData, crc]);
  }

  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  return Buffer.concat([
    sig,
    makeChunk('IHDR', ihdr),
    makeChunk('IDAT', compressed),
    makeChunk('IEND', Buffer.alloc(0))
  ]);
}

// Draw icon bitmap
function renderIconPixel(x, y, size) {
  const normX = (x / size) * 100;
  const normY = (y / size) * 100;
  
  // Rounded rectangle bounds (rx: 22)
  const pad = 4;
  const rad = 20;
  const min = pad;
  const max = 100 - pad;

  let insideBox = false;
  if (normX >= min + rad && normX <= max - rad && normY >= min && normY <= max) insideBox = true;
  else if (normY >= min + rad && normY <= max - rad && normX >= min && normX <= max) insideBox = true;
  else {
    const cx = normX < 50 ? min + rad : max - rad;
    const cy = normY < 50 ? min + rad : max - rad;
    const distSq = (normX - cx) ** 2 + (normY - cy) ** 2;
    if (distSq <= rad ** 2) insideBox = true;
  }

  if (!insideBox) return [0, 0, 0, 0];

  // Primary background color #4F46E5 (79, 70, 229) with subtle vertical gradient
  const gradT = normY / 100;
  const bgR = Math.round(79 * (1 - gradT * 0.15));
  const bgG = Math.round(70 * (1 - gradT * 0.15));
  const bgB = Math.round(229 * (1 - gradT * 0.15));

  // Glyph shape: "L" chain-link
  // Vertical stem: normX between 34 and 48, normY between 22 and 60
  // Horizontal foot: normY between 56 and 70, normX between 34 and 74
  // Connection circle: center (68, 32), r=7
  let isGlyph = false;
  if (normX >= 35 && normX <= 48 && normY >= 22 && normY <= 64) isGlyph = true;
  if (normY >= 56 && normY <= 70 && normX >= 35 && normX <= 72) isGlyph = true;
  
  // Connection node
  const nodeDistSq = (normX - 68) ** 2 + (normY - 32) ** 2;
  if (nodeDistSq <= 49) return [199, 210, 254, 255]; // #C7D2FE
  
  // Connection bridge
  if (normY >= 30 && normY <= 34 && normX >= 48 && normX <= 68) return [199, 210, 254, 255];

  if (isGlyph) {
    return [255, 255, 255, 255]; // Pure white glyph
  }

  return [bgR, bgG, bgB, 255];
}

// 4. Generate favicon-16.png
const fav16 = createPNG(16, 16, (x, y) => renderIconPixel(x, y, 16));
writeFiles('favicon-16.png', fav16);

// 5. Generate favicon-32.png
const fav32 = createPNG(32, 32, (x, y) => renderIconPixel(x, y, 32));
writeFiles('favicon-32.png', fav32);

// 6. Generate apple-touch-icon.png (180x180)
const touchIcon = createPNG(180, 180, (x, y) => renderIconPixel(x, y, 180));
writeFiles('apple-touch-icon.png', touchIcon);

// 7. Generate favicon.ico wrapping the 32x32 PNG
function createICO(pngBuffer, size = 32) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // ICO image
  header.writeUInt16LE(1, 4); // 1 image

  const entry = Buffer.alloc(16);
  entry.writeUInt8(size, 0); // width
  entry.writeUInt8(size, 1); // height
  entry.writeUInt8(0, 2); // colors
  entry.writeUInt8(0, 3); // reserved
  entry.writeUInt16LE(1, 4); // color planes
  entry.writeUInt16LE(32, 6); // bits per pixel
  entry.writeUInt32LE(pngBuffer.length, 8); // size of image in bytes
  entry.writeUInt32LE(22, 12); // offset (6 + 16 = 22)

  return Buffer.concat([header, entry, pngBuffer]);
}

const favIco = createICO(fav32, 32);
writeFiles('favicon.ico', favIco);
console.log('✅ Icons created: favicon-16.png, favicon-32.png, apple-touch-icon.png, favicon.ico');

// 8. Generate og-image.png (1200x630)
const ogImage = createPNG(1200, 630, (x, y) => {
  // Deep dark surface #0F172A (15, 23, 42)
  // Subtle radial indigo glow centered at (600, 250)
  const distSq = (x - 600) ** 2 + (y - 250) ** 2;
  const maxDist = 700;
  const glow = Math.max(0, 1 - Math.sqrt(distSq) / maxDist);

  let r = Math.round(15 + glow * 25);
  let g = Math.round(23 + glow * 25);
  let b = Math.round(42 + glow * 80);

  // Centered logo card 140x140 at (530, 180)
  if (x >= 530 && x <= 670 && y >= 180 && y <= 320) {
    const iconPixel = renderIconPixel(x - 530, y - 180, 140);
    if (iconPixel[3] > 0) return iconPixel;
  }

  return [r, g, b, 255];
});

writeFiles('og-image.png', ogImage);
console.log('✅ OG Image created: og-image.png (1200x630)');
console.log('🎉 Step (a) asset generation complete!');
