const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const assetsDir = path.join(__dirname, 'public', 'assets');
if (!fs.existsSync(assetsDir)) {
  fs.mkdirSync(assetsDir, { recursive: true });
}

// 1. Sleek Linkora Icon SVG (Transparent background, gradient L-link)
const logoIconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="none">
  <defs>
    <linearGradient id="linkoraGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#6366F1" />
      <stop offset="50%" stop-color="#8B5CF6" />
      <stop offset="100%" stop-color="#EC4899" />
    </linearGradient>
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="4" stdDeviation="6" flood-color="#8B5CF6" flood-opacity="0.3"/>
    </filter>
  </defs>
  <!-- Stylized modern connected L link -->
  <g filter="url(#glow)">
    <!-- Vertical link loop -->
    <rect x="22" y="14" width="22" height="48" rx="11" fill="url(#linkoraGrad)"/>
    <!-- Horizontal bottom link loop extending to the right -->
    <rect x="22" y="52" width="56" height="22" rx="11" fill="url(#linkoraGrad)"/>
    <!-- Interlocking node & link punch hole -->
    <circle cx="33" cy="25" r="5" fill="#FFFFFF"/>
    <circle cx="67" cy="63" r="5" fill="#FFFFFF"/>
    <circle cx="33" cy="63" r="4" fill="#FFFFFF" fill-opacity="0.8"/>
    <!-- Connected accent node -->
    <circle cx="67" cy="32" r="8" fill="url(#linkoraGrad)"/>
    <circle cx="67" cy="32" r="3" fill="#FFFFFF"/>
  </g>
</svg>`;

// 2. Full Logo SVG - Dark Variant (Dark text for Light Theme background)
const logoDarkTextSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 180 44" fill="none">
  <defs>
    <linearGradient id="linkoraGradDark" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#6366F1" />
      <stop offset="50%" stop-color="#8B5CF6" />
      <stop offset="100%" stop-color="#EC4899" />
    </linearGradient>
  </defs>
  <!-- Gradient L Icon -->
  <g transform="translate(2, 4) scale(0.36)">
    <rect x="22" y="14" width="22" height="48" rx="11" fill="url(#linkoraGradDark)"/>
    <rect x="22" y="52" width="56" height="22" rx="11" fill="url(#linkoraGradDark)"/>
    <circle cx="33" cy="25" r="5" fill="#FFFFFF"/>
    <circle cx="67" cy="63" r="5" fill="#FFFFFF"/>
    <circle cx="33" cy="63" r="4" fill="#FFFFFF" fill-opacity="0.8"/>
    <circle cx="67" cy="32" r="8" fill="url(#linkoraGradDark)"/>
    <circle cx="67" cy="32" r="3" fill="#FFFFFF"/>
  </g>
  <!-- Wordmark in Plus Jakarta Sans -->
  <text x="44" y="28" fill="#0F172A" font-family="'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="22" font-weight="800" letter-spacing="-0.03em">Linkora</text>
</svg>`;

// 3. Full Logo SVG - Light Variant (Light text for Dark Theme background)
const logoLightTextSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 180 44" fill="none">
  <defs>
    <linearGradient id="linkoraGradLight" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#6366F1" />
      <stop offset="50%" stop-color="#8B5CF6" />
      <stop offset="100%" stop-color="#EC4899" />
    </linearGradient>
  </defs>
  <!-- Gradient L Icon -->
  <g transform="translate(2, 4) scale(0.36)">
    <rect x="22" y="14" width="22" height="48" rx="11" fill="url(#linkoraGradLight)"/>
    <rect x="22" y="52" width="56" height="22" rx="11" fill="url(#linkoraGradLight)"/>
    <circle cx="33" cy="25" r="5" fill="#FFFFFF"/>
    <circle cx="67" cy="63" r="5" fill="#FFFFFF"/>
    <circle cx="33" cy="63" r="4" fill="#FFFFFF" fill-opacity="0.8"/>
    <circle cx="67" cy="32" r="8" fill="url(#linkoraGradLight)"/>
    <circle cx="67" cy="32" r="3" fill="#FFFFFF"/>
  </g>
  <!-- Wordmark in Plus Jakarta Sans -->
  <text x="44" y="28" fill="#F8FAFC" font-family="'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="22" font-weight="800" letter-spacing="-0.03em">Linkora</text>
</svg>`;

// 4. Adaptive Logo SVG (Uses currentColor for text, so it automatically matches theme)
const logoAdaptiveSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 180 44" fill="none">
  <defs>
    <linearGradient id="linkoraGradAdaptive" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#6366F1" />
      <stop offset="50%" stop-color="#8B5CF6" />
      <stop offset="100%" stop-color="#EC4899" />
    </linearGradient>
  </defs>
  <!-- Gradient L Icon -->
  <g transform="translate(2, 4) scale(0.36)">
    <rect x="22" y="14" width="22" height="48" rx="11" fill="url(#linkoraGradAdaptive)"/>
    <rect x="22" y="52" width="56" height="22" rx="11" fill="url(#linkoraGradAdaptive)"/>
    <circle cx="33" cy="25" r="5" fill="#FFFFFF"/>
    <circle cx="67" cy="63" r="5" fill="#FFFFFF"/>
    <circle cx="33" cy="63" r="4" fill="#FFFFFF" fill-opacity="0.8"/>
    <circle cx="67" cy="32" r="8" fill="url(#linkoraGradAdaptive)"/>
    <circle cx="67" cy="32" r="3" fill="#FFFFFF"/>
  </g>
  <!-- Wordmark in Plus Jakarta Sans with currentColor -->
  <text x="44" y="28" fill="currentColor" font-family="'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="22" font-weight="800" letter-spacing="-0.03em">Linkora</text>
</svg>`;

// 5. Favicon SVG (Transparent background)
const faviconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" fill="none">
  <defs>
    <linearGradient id="linkoraFavGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#6366F1" />
      <stop offset="50%" stop-color="#8B5CF6" />
      <stop offset="100%" stop-color="#EC4899" />
    </linearGradient>
  </defs>
  <g transform="translate(1, 1) scale(0.3)">
    <rect x="18" y="10" width="24" height="52" rx="12" fill="url(#linkoraFavGrad)"/>
    <rect x="18" y="50" width="60" height="24" rx="12" fill="url(#linkoraFavGrad)"/>
    <circle cx="30" cy="22" r="5" fill="#FFFFFF"/>
    <circle cx="66" cy="62" r="5" fill="#FFFFFF"/>
    <circle cx="66" cy="30" r="9" fill="url(#linkoraFavGrad)"/>
    <circle cx="66" cy="30" r="3.5" fill="#FFFFFF"/>
  </g>
</svg>`;

// 6. Rich OG Image SVG (1200x630)
const ogImageSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630" fill="none">
  <defs>
    <linearGradient id="ogBg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0B0B12" />
      <stop offset="100%" stop-color="#14141F" />
    </linearGradient>
    <linearGradient id="ogGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#6366F1" />
      <stop offset="50%" stop-color="#8B5CF6" />
      <stop offset="100%" stop-color="#EC4899" />
    </linearGradient>
    <filter id="ogGlow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="10" stdDeviation="24" flood-color="#8B5CF6" flood-opacity="0.4"/>
    </filter>
  </defs>
  <!-- Background -->
  <rect width="1200" height="630" fill="url(#ogBg)"/>
  <!-- Ambient circles -->
  <circle cx="200" cy="150" r="280" fill="#6366F1" fill-opacity="0.12" filter="blur(80px)"/>
  <circle cx="1050" cy="450" r="320" fill="#EC4899" fill-opacity="0.1" filter="blur(100px)"/>
  <circle cx="600" cy="300" r="200" fill="#8B5CF6" fill-opacity="0.08" filter="blur(70px)"/>

  <!-- Logo and Glyph -->
  <g transform="translate(140, 200)" filter="url(#ogGlow)">
    <g transform="scale(1.6)">
      <rect x="22" y="14" width="22" height="48" rx="11" fill="url(#ogGrad)"/>
      <rect x="22" y="52" width="56" height="22" rx="11" fill="url(#ogGrad)"/>
      <circle cx="33" cy="25" r="5" fill="#FFFFFF"/>
      <circle cx="67" cy="63" r="5" fill="#FFFFFF"/>
      <circle cx="33" cy="63" r="4" fill="#FFFFFF" fill-opacity="0.8"/>
      <circle cx="67" cy="32" r="8" fill="url(#ogGrad)"/>
      <circle cx="67" cy="32" r="3" fill="#FFFFFF"/>
    </g>
    <!-- Brand Title -->
    <text x="170" y="70" fill="#FFFFFF" font-family="'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif" font-size="76" font-weight="800" letter-spacing="-0.03em">Linkora</text>
    <!-- Tagline -->
    <text x="174" y="125" fill="#94A3B8" font-family="'Inter', -apple-system, BlinkMacSystemFont, sans-serif" font-size="28" font-weight="500">Connect. Share. Grow.</text>
    <text x="174" y="165" fill="#CBD5E1" font-family="'Inter', -apple-system, BlinkMacSystemFont, sans-serif" font-size="22" font-weight="400">The modern, vibrant social network for creators and thinkers.</text>
  </g>

  <!-- Bottom Badges -->
  <g transform="translate(314, 460)">
    <rect width="180" height="42" rx="21" fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.12)"/>
    <text x="90" y="26" text-anchor="middle" fill="#C7D2FE" font-family="'Inter', sans-serif" font-size="15" font-weight="600">✨ Real-time</text>

    <g transform="translate(200, 0)">
      <rect width="180" height="42" rx="21" fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.12)"/>
      <text x="90" y="26" text-anchor="middle" fill="#F472B6" font-family="'Inter', sans-serif" font-size="15" font-weight="600">📸 Rich Stories</text>
    </g>

    <g transform="translate(400, 0)">
      <rect width="180" height="42" rx="21" fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.12)"/>
      <text x="90" y="26" text-anchor="middle" fill="#A78BFA" font-family="'Inter', sans-serif" font-size="15" font-weight="600">⚡ Live Chat</text>
    </g>
  </g>
</svg>`;

async function buildAssets() {
  console.log('🎨 Generating brand assets with Linkora primary gradient (#6366F1 -> #8B5CF6 -> #EC4899)...');

  // Write SVGs
  fs.writeFileSync(path.join(assetsDir, 'logo.svg'), logoDarkTextSvg);
  fs.writeFileSync(path.join(assetsDir, 'logo-dark.svg'), logoDarkTextSvg);
  fs.writeFileSync(path.join(assetsDir, 'logo-light.svg'), logoLightTextSvg);
  fs.writeFileSync(path.join(assetsDir, 'logo-adaptive.svg'), logoAdaptiveSvg);
  fs.writeFileSync(path.join(assetsDir, 'logo-icon.svg'), logoIconSvg);
  fs.writeFileSync(path.join(assetsDir, 'favicon.svg'), faviconSvg);

  console.log('✅ SVGs written: logo.svg, logo-dark.svg, logo-light.svg, logo-adaptive.svg, logo-icon.svg, favicon.svg');

  // Generate PNGs using Sharp
  const favBuf = Buffer.from(faviconSvg);
  await sharp(favBuf).resize(16, 16).png().toFile(path.join(assetsDir, 'favicon-16.png'));
  await sharp(favBuf).resize(32, 32).png().toFile(path.join(assetsDir, 'favicon-32.png'));
  await sharp(favBuf).resize(180, 180).png().toFile(path.join(assetsDir, 'apple-touch-icon.png'));

  // ICO header + 32x32 PNG embed
  const png32Buf = await sharp(favBuf).resize(32, 32).png().toBuffer();
  const icoHeader = Buffer.from([
    0x00, 0x00,             // Reserved
    0x01, 0x00,             // Type: 1 = ICO
    0x01, 0x00,             // Number of images: 1
    0x20,                   // Width: 32
    0x20,                   // Height: 32
    0x00,                   // Colors: 0 (No color palette)
    0x00,                   // Reserved
    0x01, 0x00,             // Color planes: 1
    0x20, 0x00,             // Bits per pixel: 32
    ...int32ToBytes(png32Buf.length), // Size of image data
    0x16, 0x00, 0x00, 0x00  // Offset of image data (22 bytes header)
  ]);
  const icoBuf = Buffer.concat([icoHeader, png32Buf]);
  fs.writeFileSync(path.join(assetsDir, 'favicon.ico'), icoBuf);

  // Generate OG image PNG (1200x630)
  const ogBuf = Buffer.from(ogImageSvg);
  await sharp(ogBuf).resize(1200, 630).png().toFile(path.join(assetsDir, 'og-image.png'));

  console.log('✅ PNGs & Favicons generated: favicon-16.png, favicon-32.png, apple-touch-icon.png, favicon.ico, og-image.png');
}

function int32ToBytes(val) {
  return [
    val & 0xff,
    (val >> 8) & 0xff,
    (val >> 16) & 0xff,
    (val >> 24) & 0xff
  ];
}

buildAssets().catch(err => {
  console.error('Error generating assets:', err);
  process.exit(1);
});
