/**
 * CBCS Encryption Support Detection Module
 * Tests if the environment's CDM supports CBCS (Content Based Cipher Scheme) encryption
 * CBCS is used by Widevine, PlayReady, and FairPlay DRM systems
 */

/**
 * Key system identifiers for major DRM providers
 */
const KEY_SYSTEMS = {
  WIDEVINE: 'com.widevine.alpha',
  PLAYREADY: 'com.microsoft.playready',
  PLAYREADY_HARDWARE: 'com.microsoft.playready.hardware',
  PLAYREADY_RECOMMENDATION: 'com.microsoft.playready.recommendation',
  FAIRPLAY: 'com.apple.fps.1_0',
  FAIRPLAY_2_0: 'com.apple.fps.2_0',
  FAIRPLAY_3_0: 'com.apple.fps.3_0',
  CLEARKEY: 'org.w3.clearkey'
};

/**
 * Common video codecs to test with CBCS
 */
const CODECS_TO_TEST = [
  'video/mp4; codecs="avc1.42E01E"',        // H.264 Baseline
  'video/mp4; codecs="avc1.4D401E"',        // H.264 Main
  'video/mp4; codecs="avc1.640028"',        // H.264 High
  'video/mp4; codecs="hev1.1.6.L93.B0"',    // HEVC Main
  'video/mp4; codecs="hvc1.1.6.L93.B0"',    // HEVC Main (hvc1)
  'video/mp4; codecs="vp09.00.10.08"',      // VP9
  'video/mp4; codecs="av01.0.05M.08"'       // AV1
];

/**
 * Tests CBCS support for a specific key system
 * @param {string} keySystem - The key system identifier
 * @param {Array<string>} codecs - List of codecs to test
 * @returns {Promise<Object>} Support details for this key system
 */
async function testKeySystemCBCS(keySystem, codecs = CODECS_TO_TEST) {
  const result = {
    keySystem,
    available: false,
    cbcsSupported: false,
    cencSupported: false,
    supportedCodecs: [],
    supportedEncryptionSchemes: [],
    error: null
  };

  try {
    // Check if requestMediaKeySystemAccess is available
    if (!navigator.requestMediaKeySystemAccess) {
      result.error = 'EME API not available';
      return result;
    }

    // Test with CBCS encryption scheme
    const cbcsConfigs = codecs.map(contentType => ({
      initDataTypes: ['cenc', 'keyids', 'webm'],
      videoCapabilities: [{
        contentType,
        encryptionScheme: 'cbcs',
        robustness: ''
      }],
      distinctiveIdentifier: 'optional',
      persistentState: 'optional',
      sessionTypes: ['temporary']
    }));

    try {
      const cbcsAccess = await navigator.requestMediaKeySystemAccess(keySystem, cbcsConfigs);
      result.available = true;
      result.cbcsSupported = true;

      // Get the configuration that was accepted
      const config = cbcsAccess.getConfiguration();

      // Extract supported codecs
      if (config.videoCapabilities) {
        config.videoCapabilities.forEach(cap => {
          if (cap.contentType) {
            result.supportedCodecs.push(cap.contentType);
          }
        });
      }

      result.supportedEncryptionSchemes.push('cbcs');
    } catch (cbcsError) {
      // CBCS might not be supported, but the key system might still be available
      result.error = `CBCS not supported: ${cbcsError.message}`;
    }

    // Also test CENC (common encryption) for comparison
    const cencConfigs = codecs.map(contentType => ({
      initDataTypes: ['cenc', 'keyids', 'webm'],
      videoCapabilities: [{
        contentType,
        encryptionScheme: 'cenc',
        robustness: ''
      }],
      distinctiveIdentifier: 'optional',
      persistentState: 'optional',
      sessionTypes: ['temporary']
    }));

    try {
      const cencAccess = await navigator.requestMediaKeySystemAccess(keySystem, cencConfigs);
      result.available = true;
      result.cencSupported = true;
      result.supportedEncryptionSchemes.push('cenc');

      // If we haven't gotten codecs from CBCS, get them from CENC
      if (result.supportedCodecs.length === 0) {
        const config = cencAccess.getConfiguration();
        if (config.videoCapabilities) {
          config.videoCapabilities.forEach(cap => {
            if (cap.contentType && !result.supportedCodecs.includes(cap.contentType)) {
              result.supportedCodecs.push(cap.contentType);
            }
          });
        }
      }
    } catch (cencError) {
      // Even CENC not supported
    }

    // Try without encryption scheme specified (legacy support)
    if (!result.available) {
      const legacyConfigs = [{
        initDataTypes: ['cenc'],
        videoCapabilities: codecs.map(contentType => ({
          contentType,
          robustness: ''
        })),
        distinctiveIdentifier: 'optional',
        persistentState: 'optional',
        sessionTypes: ['temporary']
      }];

      try {
        await navigator.requestMediaKeySystemAccess(keySystem, legacyConfigs);
        result.available = true;
        result.error = 'Key system available but encryption scheme detection inconclusive';
      } catch (legacyError) {
        result.error = `Key system not available: ${legacyError.message}`;
      }
    }

  } catch (error) {
    result.error = `Test failed: ${error.message}`;
  }

  return result;
}

/**
 * Detects CBCS encryption support across all major DRM systems
 * @param {Object} options - Configuration options
 * @param {Array<string>} options.keySystemsToTest - Specific key systems to test (default: all)
 * @param {Array<string>} options.codecs - Codecs to test (default: common codecs)
 * @param {number} options.timeout - Timeout in milliseconds (default: 15000)
 * @returns {Promise<Object>} Comprehensive CBCS support results
 */
export async function detectCBCSSupport(options = {}) {
  const startTime = performance.now();
  const {
    keySystemsToTest = Object.values(KEY_SYSTEMS),
    codecs = CODECS_TO_TEST,
    timeout = 15000
  } = options;

  const results = {
    cbcsSupported: false,
    emeAvailable: !!navigator.requestMediaKeySystemAccess,
    keySystems: [],
    supportedDRMs: [],
    details: {
      testedKeySystems: keySystemsToTest.length,
      testedCodecs: codecs
    },
    duration: 0
  };

  if (!results.emeAvailable) {
    results.duration = performance.now() - startTime;
    return results;
  }

  try {
    // Test all key systems with timeout
    const testPromises = keySystemsToTest.map(ks =>
      testKeySystemCBCS(ks, codecs)
    );

    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Detection timeout')), timeout)
    );

    const keySystemResults = await Promise.race([
      Promise.all(testPromises),
      timeoutPromise
    ]);

    results.keySystems = keySystemResults;

    // Determine which DRMs support CBCS
    keySystemResults.forEach(ksResult => {
      if (ksResult.cbcsSupported) {
        results.cbcsSupported = true;

        // Map key system to friendly DRM name
        let drmName = ksResult.keySystem;
        if (ksResult.keySystem.includes('widevine')) {
          drmName = 'Widevine';
        } else if (ksResult.keySystem.includes('playready')) {
          drmName = 'PlayReady';
        } else if (ksResult.keySystem.includes('fps')) {
          drmName = 'FairPlay';
        } else if (ksResult.keySystem.includes('clearkey')) {
          drmName = 'ClearKey';
        }

        if (!results.supportedDRMs.includes(drmName)) {
          results.supportedDRMs.push(drmName);
        }
      }
    });

  } catch (error) {
    results.details.error = error.message;
  }

  results.duration = performance.now() - startTime;
  return results;
}

/**
 * Quick check for CBCS support (returns boolean only)
 * @returns {Promise<boolean>}
 */
export async function hasCBCSSupport() {
  const result = await detectCBCSSupport({ timeout: 10000 });
  return result.cbcsSupported;
}

/**
 * Detects which specific DRM system supports CBCS
 * @returns {Promise<Array<string>>} Array of DRM names that support CBCS
 */
export async function getCBCSSupportedDRMs() {
  const result = await detectCBCSSupport({ timeout: 10000 });
  return result.supportedDRMs;
}

// Export key systems for external use
export { KEY_SYSTEMS };
