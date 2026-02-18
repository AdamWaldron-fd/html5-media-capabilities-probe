#!/usr/bin/env node

/**
 * ES5 Bundler for WebOS deployment
 * Combines all ES6 modules into a single ES5-compatible file
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { transformSync } from '@babel/core';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const srcDir = path.join(__dirname, 'src');
const buildDir = path.join(__dirname, 'build', 'webos');

// Read all source files in dependency order
const files = [
  'dualDecoder.js',
  'cbcsEncryption.js',
  'cmafSupport.js',
  'deviceFingerprint.js',
  'index.js'
];

console.log('Bundling JavaScript files for WebOS with ES5 transpilation...');

let bundledCode = '';

// Process each file
files.forEach((file, index) => {
  console.log(`  Processing ${file}...`);
  const filePath = path.join(srcDir, file);
  let content = fs.readFileSync(filePath, 'utf8');

  // Remove ALL import statements
  content = content.replace(/^import\s+.*?from\s+['"].*?['"];?\s*$/gm, '');
  content = content.replace(/^import\s+\{[^}]*\}\s+from\s+['"].*?['"];?\s*$/gm, '');

  // Remove export default followed by object literal (including the entire object)
  // We'll reconstruct the main export at the end
  content = content.replace(/^export default\s+\{[\s\S]*?\n\};?\s*$/gm, '');

  // Remove export { ... } statements
  content = content.replace(/^export\s+\{[^}]*\};?\s*$/gm, '');

  // Remove export keyword from function/const/let/var declarations
  content = content.replace(/^export\s+(async\s+)?function\s+/gm, '$1function ');
  content = content.replace(/^export\s+(const|let|var)\s+/gm, '$1 ');

  bundledCode += `  // ========== ${file} ==========\n`;
  bundledCode += content;
  bundledCode += '\n\n';
});

// Add the main export object at the end
bundledCode += `
  // ========== Main Export ==========
  var MediaCapabilitiesProbe = {
    // Main API
    probeAllCapabilities: probeAllCapabilities,
    quickProbe: quickProbe,
    generateReport: generateReport,

    // Individual capabilities
    detectDualDecoders: detectDualDecoders,
    hasDualDecoderSupport: hasDualDecoderSupport,
    detectCBCSSupport: detectCBCSSupport,
    hasCBCSSupport: hasCBCSSupport,
    getCBCSSupportedDRMs: getCBCSSupportedDRMs,
    detectCMAFSupport: detectCMAFSupport,
    hasCMAFSupport: hasCMAFSupport,
    getSupportedCMAFVideoCodecs: getSupportedCMAFVideoCodecs,
    getSupportedCMAFAudioCodecs: getSupportedCMAFAudioCodecs,

    // Device Fingerprinting
    generateDeviceFingerprint: generateDeviceFingerprint,
    getDeviceId: getDeviceId,
    getDeviceDetails: getDeviceDetails,

    // Constants
    KEY_SYSTEMS: KEY_SYSTEMS,
    CMAF_VIDEO_CODECS: CMAF_VIDEO_CODECS,
    CMAF_AUDIO_CODECS: CMAF_AUDIO_CODECS,
    CMAF_COMBINED_CODECS: CMAF_COMBINED_CODECS
  };
`;

console.log('  Transpiling to ES5...');

// Wrap in IIFE before transpilation
const wrappedCode = `(function() {\n  "use strict";\n\n${bundledCode}\n  // Expose to global scope\n  if (typeof window !== "undefined") {\n    window.MediaCapabilitiesProbe = MediaCapabilitiesProbe;\n  }\n})();`;

// Transpile to ES5
let transpiledCode;
try {
  const result = transformSync(wrappedCode, {
    presets: [
      ['@babel/preset-env', {
        targets: {
          browsers: ['chrome 38', 'safari 9', 'ie 11']
        },
        useBuiltIns: false,
        modules: false
      }]
    ],
    comments: false,
    compact: false
  });

  transpiledCode = result.code;
} catch (error) {
  console.error('Error transpiling code:', error);
  process.exit(1);
}

// Add polyfills at the beginning for older WebOS devices
const polyfills = `
// Polyfills for older WebOS devices
if (!Promise.prototype.finally) {
  Promise.prototype.finally = function(callback) {
    var constructor = this.constructor;
    return this.then(
      function(value) {
        return constructor.resolve(callback()).then(function() {
          return value;
        });
      },
      function(reason) {
        return constructor.resolve(callback()).then(function() {
          throw reason;
        });
      }
    );
  };
}

if (!Object.assign) {
  Object.assign = function(target) {
    if (target == null) {
      throw new TypeError('Cannot convert undefined or null to object');
    }
    var to = Object(target);
    for (var index = 1; index < arguments.length; index++) {
      var nextSource = arguments[index];
      if (nextSource != null) {
        for (var nextKey in nextSource) {
          if (Object.prototype.hasOwnProperty.call(nextSource, nextKey)) {
            to[nextKey] = nextSource[nextKey];
          }
        }
      }
    }
    return to;
  };
}

if (!Array.prototype.includes) {
  Array.prototype.includes = function(searchElement, fromIndex) {
    var O = Object(this);
    var len = parseInt(O.length) || 0;
    if (len === 0) return false;
    var n = parseInt(fromIndex) || 0;
    var k;
    if (n >= 0) {
      k = n;
    } else {
      k = len + n;
      if (k < 0) k = 0;
    }
    while (k < len) {
      var currentElement = O[k];
      if (searchElement === currentElement ||
         (searchElement !== searchElement && currentElement !== currentElement)) {
        return true;
      }
      k++;
    }
    return false;
  };
}

if (!String.prototype.includes) {
  String.prototype.includes = function(search, start) {
    if (typeof start !== 'number') {
      start = 0;
    }
    if (start + search.length > this.length) {
      return false;
    } else {
      return this.indexOf(search, start) !== -1;
    }
  };
}

if (!Array.prototype.find) {
  Array.prototype.find = function(predicate) {
    if (this == null) {
      throw new TypeError('Array.prototype.find called on null or undefined');
    }
    if (typeof predicate !== 'function') {
      throw new TypeError('predicate must be a function');
    }
    var list = Object(this);
    var length = list.length >>> 0;
    var thisArg = arguments[1];
    var value;
    for (var i = 0; i < length; i++) {
      value = list[i];
      if (predicate.call(thisArg, value, i, list)) {
        return value;
      }
    }
    return undefined;
  };
}

`;

const finalCode = polyfills + '\n' + transpiledCode;

// Write bundled file
const outputPath = path.join(buildDir, 'media-capabilities-probe.js');
fs.mkdirSync(buildDir, { recursive: true });
fs.writeFileSync(outputPath, finalCode);

console.log(`✓ Bundle created: ${outputPath}`);
console.log(`✓ Size: ${(finalCode.length / 1024).toFixed(2)} KB`);
console.log('✓ Transpiled to ES5 with polyfills');
