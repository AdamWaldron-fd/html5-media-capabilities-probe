#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Define paths
const rootDir = path.join(__dirname, '..');
const buildDir = path.join(rootDir, 'build');
const webosDir = path.join(buildDir, 'webos');
const stagingDir = path.join(webosDir, 'staging');
const appinfoPath = path.join(rootDir, 'appinfo.json');

console.log('🚀 Starting WebOS .ipk build process...\n');

// Step 1: Create directories
console.log('📁 Creating WebOS build directories...');
if (!fs.existsSync(webosDir)) {
  fs.mkdirSync(webosDir, { recursive: true });
}
if (fs.existsSync(stagingDir)) {
  fs.rmSync(stagingDir, { recursive: true, force: true });
}
fs.mkdirSync(stagingDir, { recursive: true });

// Step 2: Copy build files to staging
console.log('📋 Copying files to staging directory...');
const filesToCopy = ['index.html', 'bundle.js', 'bundle.js.LICENSE.txt'];

filesToCopy.forEach(file => {
  const srcPath = path.join(buildDir, file);
  const destPath = path.join(stagingDir, file);

  if (fs.existsSync(srcPath)) {
    fs.copyFileSync(srcPath, destPath);
    console.log(`   ✓ Copied ${file}`);
  } else {
    console.warn(`   ⚠ Warning: ${file} not found in build directory`);
  }
});

// Step 3: Copy appinfo.json to staging
console.log('📄 Copying appinfo.json...');
if (fs.existsSync(appinfoPath)) {
  fs.copyFileSync(appinfoPath, path.join(stagingDir, 'appinfo.json'));
  console.log('   ✓ Copied appinfo.json');
} else {
  console.error('   ✗ Error: appinfo.json not found in root directory');
  process.exit(1);
}

// Step 4: Create placeholder icons if they don't exist
console.log('📷 Checking for icons...');

// Function to create a minimal PNG file
function createPlaceholderPNG() {
  // This is a minimal valid 1x1 transparent PNG
  const pngData = Buffer.from([
    0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG signature
    0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52, // IHDR chunk
    0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, // 1x1 dimensions
    0x08, 0x06, 0x00, 0x00, 0x00, 0x1F, 0x15, 0xC4, // 8-bit RGBA
    0x89, 0x00, 0x00, 0x00, 0x0A, 0x49, 0x44, 0x41, // IDAT chunk
    0x54, 0x78, 0x9C, 0x63, 0x00, 0x01, 0x00, 0x00, // Compressed data
    0x05, 0x00, 0x01, 0x0D, 0x0A, 0x2D, 0xB4, 0x00, // (transparent pixel)
    0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE, // IEND chunk
    0x42, 0x60, 0x82
  ]);
  return pngData;
}

// Check if icons exist in root directory first
const rootIconPath = path.join(rootDir, 'icon.png');
const rootLargeIconPath = path.join(rootDir, 'largeIcon.png');
const stagingIconPath = path.join(stagingDir, 'icon.png');
const stagingLargeIconPath = path.join(stagingDir, 'largeIcon.png');

if (fs.existsSync(rootIconPath)) {
  fs.copyFileSync(rootIconPath, stagingIconPath);
  console.log('   ✓ Copied icon.png from root');
} else {
  fs.writeFileSync(stagingIconPath, createPlaceholderPNG());
  console.log('   ✓ Created placeholder icon.png');
}

if (fs.existsSync(rootLargeIconPath)) {
  fs.copyFileSync(rootLargeIconPath, stagingLargeIconPath);
  console.log('   ✓ Copied largeIcon.png from root');
} else {
  fs.writeFileSync(stagingLargeIconPath, createPlaceholderPNG());
  console.log('   ✓ Created placeholder largeIcon.png');
}

console.log('   ℹ Note: Add icon.png (80x80) and largeIcon.png (130x130) to your project root for custom icons');

// Step 5: Package the app using ares-package
console.log('\n📦 Packaging WebOS application...');
try {
  const aresPackage = path.join(rootDir, 'node_modules', '.bin', 'ares-package');
  const outputDir = webosDir;

  // Run ares-package command
  execSync(`"${aresPackage}" "${stagingDir}" -o "${outputDir}"`, {
    stdio: 'inherit',
    cwd: rootDir
  });

  console.log('\n✅ WebOS .ipk build completed successfully!');
  console.log(`📍 Output location: ${webosDir}`);

  // List generated .ipk files
  const ipkFiles = fs.readdirSync(webosDir).filter(f => f.endsWith('.ipk'));
  if (ipkFiles.length > 0) {
    console.log('\n📦 Generated package:');
    ipkFiles.forEach(ipk => {
      console.log(`   • ${ipk}`);
    });
  }

  // Clean up staging directory
  console.log('\n🧹 Cleaning up staging directory...');
  fs.rmSync(stagingDir, { recursive: true, force: true });

} catch (error) {
  console.error('\n❌ Error during packaging:', error.message);
  process.exit(1);
}
