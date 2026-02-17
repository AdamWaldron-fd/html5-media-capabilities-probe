/**
 * HTML5 Media Capabilities Probe
 * A comprehensive tool for detecting HTML5 media capabilities
 *
 * Features:
 * - Dual decoder detection (multiple video elements)
 * - CBCS encryption support (Widevine/PlayReady/FairPlay)
 * - CMAF support (Common Media Application Format)
 *
 * @version 1.0.0
 */

import {
  detectDualDecoders,
  hasDualDecoderSupport
} from './dualDecoder.js';

import {
  detectCBCSSupport,
  hasCBCSSupport,
  getCBCSSupportedDRMs,
  KEY_SYSTEMS
} from './cbcsEncryption.js';

import {
  detectCMAFSupport,
  hasCMAFSupport,
  getSupportedCMAFVideoCodecs,
  getSupportedCMAFAudioCodecs,
  CMAF_VIDEO_CODECS,
  CMAF_AUDIO_CODECS,
  CMAF_COMBINED_CODECS
} from './cmafSupport.js';

/**
 * Runs all capability tests and returns comprehensive results
 * @param {Object} options - Configuration options
 * @param {boolean} options.testDualDecoders - Test dual decoder support (default: true)
 * @param {boolean} options.testCBCS - Test CBCS encryption support (default: true)
 * @param {boolean} options.testCMAF - Test CMAF support (default: true)
 * @param {Object} options.dualDecoderOptions - Options for dual decoder test
 * @param {Object} options.cbcsOptions - Options for CBCS test
 * @param {Object} options.cmafOptions - Options for CMAF test
 * @param {number} options.timeout - Global timeout in milliseconds (default: 30000)
 * @returns {Promise<Object>} Complete capability report
 */
export async function probeAllCapabilities(options = {}) {
  const startTime = performance.now();
  const {
    testDualDecoders = true,
    testCBCS = true,
    testCMAF = true,
    dualDecoderOptions = {},
    cbcsOptions = {},
    cmafOptions = {},
    timeout = 30000
  } = options;

  const report = {
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent,
    capabilities: {},
    summary: {
      dualDecodersSupported: false,
      cbcsSupported: false,
      cmafSupported: false,
      allSupported: false
    },
    duration: 0
  };

  try {
    const tests = [];

    // Run tests in parallel for better performance
    if (testDualDecoders) {
      tests.push(
        detectDualDecoders(dualDecoderOptions).then(result => ({
          name: 'dualDecoders',
          result
        }))
      );
    }

    if (testCBCS) {
      tests.push(
        detectCBCSSupport(cbcsOptions).then(result => ({
          name: 'cbcs',
          result
        }))
      );
    }

    if (testCMAF) {
      tests.push(
        detectCMAFSupport(cmafOptions).then(result => ({
          name: 'cmaf',
          result
        }))
      );
    }

    // Wait for all tests with timeout
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Global probe timeout')), timeout)
    );

    const results = await Promise.race([
      Promise.all(tests),
      timeoutPromise
    ]);

    // Process results
    results.forEach(({ name, result }) => {
      report.capabilities[name] = result;

      if (name === 'dualDecoders') {
        report.summary.dualDecodersSupported = result.supported;
      } else if (name === 'cbcs') {
        report.summary.cbcsSupported = result.cbcsSupported;
      } else if (name === 'cmaf') {
        report.summary.cmafSupported = result.supported;
      }
    });

    // Determine if all capabilities are supported
    report.summary.allSupported =
      (!testDualDecoders || report.summary.dualDecodersSupported) &&
      (!testCBCS || report.summary.cbcsSupported) &&
      (!testCMAF || report.summary.cmafSupported);

  } catch (error) {
    report.error = error.message;
  }

  report.duration = performance.now() - startTime;
  return report;
}

/**
 * Quick boolean check for all capabilities
 * @returns {Promise<Object>} Object with boolean results for each capability
 */
export async function quickProbe() {
  const startTime = performance.now();

  const [dualDecoders, cbcs, cmaf] = await Promise.all([
    hasDualDecoderSupport().catch(() => false),
    hasCBCSSupport().catch(() => false),
    hasCMAFSupport().catch(() => false)
  ]);

  return {
    dualDecodersSupported: dualDecoders,
    cbcsSupported: cbcs,
    cmafSupported: cmaf,
    allSupported: dualDecoders && cbcs && cmaf,
    duration: performance.now() - startTime
  };
}

/**
 * Generate a human-readable report
 * @param {Object} probeResults - Results from probeAllCapabilities
 * @returns {string} Formatted report
 */
export function generateReport(probeResults) {
  const lines = [];

  lines.push('='.repeat(60));
  lines.push('HTML5 MEDIA CAPABILITIES PROBE REPORT');
  lines.push('='.repeat(60));
  lines.push('');
  lines.push(`Timestamp: ${probeResults.timestamp}`);
  lines.push(`User Agent: ${probeResults.userAgent}`);
  lines.push(`Total Duration: ${probeResults.duration.toFixed(2)}ms`);
  lines.push('');

  lines.push('-'.repeat(60));
  lines.push('SUMMARY');
  lines.push('-'.repeat(60));
  lines.push(`Dual Decoders: ${probeResults.summary.dualDecodersSupported ? '✓ SUPPORTED' : '✗ NOT SUPPORTED'}`);
  lines.push(`CBCS Encryption: ${probeResults.summary.cbcsSupported ? '✓ SUPPORTED' : '✗ NOT SUPPORTED'}`);
  lines.push(`CMAF Format: ${probeResults.summary.cmafSupported ? '✓ SUPPORTED' : '✗ NOT SUPPORTED'}`);
  lines.push(`All Capabilities: ${probeResults.summary.allSupported ? '✓ SUPPORTED' : '✗ NOT SUPPORTED'}`);
  lines.push('');

  // Dual Decoders Details
  if (probeResults.capabilities.dualDecoders) {
    const dd = probeResults.capabilities.dualDecoders;
    lines.push('-'.repeat(60));
    lines.push('DUAL DECODERS DETAILS');
    lines.push('-'.repeat(60));
    lines.push(`Max Concurrent Decoders: ${dd.maxConcurrentDecoders}`);
    lines.push(`Successfully Initialized: ${dd.details.successfullyInitialized}`);
    lines.push(`Simultaneous Playback: ${dd.details.simultaneousPlayback ? 'Yes' : 'No'}`);
    if (dd.details.errors && dd.details.errors.length > 0) {
      lines.push(`Errors: ${dd.details.errors.join(', ')}`);
    }
    lines.push('');
  }

  // CBCS Details
  if (probeResults.capabilities.cbcs) {
    const cbcs = probeResults.capabilities.cbcs;
    lines.push('-'.repeat(60));
    lines.push('CBCS ENCRYPTION DETAILS');
    lines.push('-'.repeat(60));
    lines.push(`EME Available: ${cbcs.emeAvailable ? 'Yes' : 'No'}`);
    lines.push(`Supported DRMs: ${cbcs.supportedDRMs.join(', ') || 'None'}`);
    lines.push('');

    if (cbcs.keySystems && cbcs.keySystems.length > 0) {
      lines.push('Key System Details:');
      cbcs.keySystems.forEach(ks => {
        if (ks.cbcsSupported) {
          lines.push(`  ✓ ${ks.keySystem}`);
          lines.push(`    CBCS: Yes, CENC: ${ks.cencSupported ? 'Yes' : 'No'}`);
          lines.push(`    Supported Codecs: ${ks.supportedCodecs.length}`);
        }
      });
    }
    lines.push('');
  }

  // CMAF Details
  if (probeResults.capabilities.cmaf) {
    const cmaf = probeResults.capabilities.cmaf;
    lines.push('-'.repeat(60));
    lines.push('CMAF SUPPORT DETAILS');
    lines.push('-'.repeat(60));
    lines.push(`MSE Available: ${cmaf.mseAvailable ? 'Yes' : 'No'}`);
    lines.push(`Fragmented MP4: ${cmaf.fragmentedMP4Supported ? 'Supported' : 'Not Supported'}`);
    lines.push(`Supported Video Codecs: ${cmaf.supportedVideoCodecs.join(', ') || 'None'}`);
    lines.push(`Supported Audio Codecs: ${cmaf.supportedAudioCodecs.join(', ') || 'None'}`);
    lines.push('');
  }

  lines.push('='.repeat(60));

  return lines.join('\n');
}

// Export individual modules
export {
  // Dual Decoder
  detectDualDecoders,
  hasDualDecoderSupport,

  // CBCS Encryption
  detectCBCSSupport,
  hasCBCSSupport,
  getCBCSSupportedDRMs,
  KEY_SYSTEMS,

  // CMAF Support
  detectCMAFSupport,
  hasCMAFSupport,
  getSupportedCMAFVideoCodecs,
  getSupportedCMAFAudioCodecs,
  CMAF_VIDEO_CODECS,
  CMAF_AUDIO_CODECS,
  CMAF_COMBINED_CODECS
};

// Default export
export default {
  probeAllCapabilities,
  quickProbe,
  generateReport,

  // Individual capabilities
  detectDualDecoders,
  hasDualDecoderSupport,
  detectCBCSSupport,
  hasCBCSSupport,
  getCBCSSupportedDRMs,
  detectCMAFSupport,
  hasCMAFSupport,
  getSupportedCMAFVideoCodecs,
  getSupportedCMAFAudioCodecs,

  // Constants
  KEY_SYSTEMS,
  CMAF_VIDEO_CODECS,
  CMAF_AUDIO_CODECS,
  CMAF_COMBINED_CODECS
};
