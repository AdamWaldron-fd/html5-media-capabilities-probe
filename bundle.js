#!/usr/bin/env node

/**
 * Simple bundler for WebOS deployment
 * Combines all ES6 modules into a single file with global export
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const srcDir = path.join(__dirname, 'src');
const buildDir = path.join(__dirname, 'build', 'webos');

// Read all source files
const files = [
  'dualDecoder.js',
  'cbcsEncryption.js',
  'cmafSupport.js',
  'deviceFingerprint.js',
  'index.js'
];

console.log('Bundling JavaScript files for WebOS...');

let bundledCode = '(function() {\n';
bundledCode += '  "use strict";\n\n';

// Process each file
files.forEach((file, index) => {
  console.log(`  Processing ${file}...`);
  const filePath = path.join(srcDir, file);
  let content = fs.readFileSync(filePath, 'utf8');

  // Remove import statements
  content = content.replace(/^import\s+.*?from\s+['"].*?['"];?\s*$/gm, '');
  content = content.replace(/^import\s+\{[^}]*\}\s+from\s+['"].*?['"];?\s*$/gm, '');

  // Remove export statements but keep the declarations
  content = content.replace(/^export\s+/gm, '');
  content = content.replace(/^export default\s+/gm, 'const MediaCapabilitiesProbe = ');

  bundledCode += `  // ========== ${file} ==========\n`;
  bundledCode += content;
  bundledCode += '\n\n';
});

// Expose as global
bundledCode += '  // Expose to global scope\n';
bundledCode += '  if (typeof window !== "undefined") {\n';
bundledCode += '    window.MediaCapabilitiesProbe = MediaCapabilitiesProbe;\n';
bundledCode += '  }\n';
bundledCode += '})();\n';

// Write bundled file
const outputPath = path.join(buildDir, 'media-capabilities-probe.js');
fs.mkdirSync(buildDir, { recursive: true });
fs.writeFileSync(outputPath, bundledCode);

console.log(`✓ Bundle created: ${outputPath}`);
console.log(`✓ Size: ${(bundledCode.length / 1024).toFixed(2)} KB`);
