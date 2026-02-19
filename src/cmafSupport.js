/**
 * CMAF Support Detection Module
 * Tests if Media Source Extensions support CMAF (Common Media Application Format)
 * CMAF is based on ISO-BMFF (MP4) and requires support for fragmented MP4 segments
 */

/**
 * CMAF codec profiles to test
 * Based on CMAF specification and common industry usage
 */
const CMAF_VIDEO_CODECS = {
  // H.264/AVC profiles
  'H.264 Baseline': 'video/mp4; codecs="avc1.42E01E"',
  'H.264 Main': 'video/mp4; codecs="avc1.4D401E"',
  'H.264 High': 'video/mp4; codecs="avc1.640028"',

  // H.265/HEVC profiles
  'HEVC Main': 'video/mp4; codecs="hev1.1.6.L93.B0"',
  'HEVC Main (hvc1)': 'video/mp4; codecs="hvc1.1.6.L93.B0"',
  'HEVC Main 10': 'video/mp4; codecs="hev1.2.4.L93.B0"',

  // VP9 profiles
  'VP9 Profile 0': 'video/mp4; codecs="vp09.00.10.08"',
  'VP9 Profile 2': 'video/mp4; codecs="vp09.02.10.10.01.09.16.09.01"',

  // AV1 profiles
  'AV1 Main': 'video/mp4; codecs="av01.0.05M.08"',
  'AV1 High': 'video/mp4; codecs="av01.0.05H.08"'
};

const CMAF_AUDIO_CODECS = {
  // AAC profiles
  'AAC-LC': 'audio/mp4; codecs="mp4a.40.2"',
  'HE-AAC': 'audio/mp4; codecs="mp4a.40.5"',
  'HE-AAC v2': 'audio/mp4; codecs="mp4a.40.29"',

  // Opus
  'Opus': 'audio/mp4; codecs="opus"',

  // AC-3/E-AC-3
  'AC-3': 'audio/mp4; codecs="ac-3"',
  'E-AC-3': 'audio/mp4; codecs="ec-3"',

  // FLAC
  'FLAC': 'audio/mp4; codecs="flac"'
};

/**
 * Combined video+audio codec strings for complete CMAF track testing
 */
const CMAF_COMBINED_CODECS = {
  'H.264 + AAC': 'video/mp4; codecs="avc1.4D401E,mp4a.40.2"',
  'H.265 + AAC': 'video/mp4; codecs="hvc1.1.6.L93.B0,mp4a.40.2"',
  'VP9 + Opus': 'video/mp4; codecs="vp09.00.10.08,opus"',
  'AV1 + Opus': 'video/mp4; codecs="av01.0.05M.08,opus"',
  'H.264 + E-AC-3': 'video/mp4; codecs="avc1.4D401E,ec-3"'
};

/**
 * Tests if a specific codec is supported by MediaSource
 * @param {string} codec - MIME type with codec string
 * @returns {boolean} True if codec is supported
 */
function isCodecSupported(codec) {
  if (!window.MediaSource) {
    return false;
  }

  try {
    return MediaSource.isTypeSupported(codec);
  } catch (error) {
    return false;
  }
}

/**
 * Tests if MediaSource can create a SourceBuffer for a codec
 * @param {string} codec - MIME type with codec string
 * @returns {Promise<Object>} Result with support details
 */
async function testSourceBufferCreation(codec) {
  return new Promise((resolve) => {
    const result = {
      codec,
      typeSupported: false,
      sourceBufferCreated: false,
      error: null
    };

    if (!window.MediaSource) {
      result.error = 'MediaSource not available';
      resolve(result);
      return;
    }

    // First check isTypeSupported
    result.typeSupported = isCodecSupported(codec);

    if (!result.typeSupported) {
      result.error = 'Codec not supported by MediaSource.isTypeSupported()';
      resolve(result);
      return;
    }

    // Try to actually create a SourceBuffer
    const video = document.createElement('video');
    const mediaSource = new MediaSource();
    video.src = URL.createObjectURL(mediaSource);

    const timeout = setTimeout(() => {
      cleanup();
      result.error = 'SourceBuffer creation timeout';
      resolve(result);
    }, 3000);

    const cleanup = () => {
      clearTimeout(timeout);
      try {
        video.src = '';
        URL.revokeObjectURL(video.src);
      } catch (e) {
        // Ignore cleanup errors
      }
    };

    mediaSource.addEventListener('sourceopen', () => {
      try {
        const sourceBuffer = mediaSource.addSourceBuffer(codec);
        result.sourceBufferCreated = true;

        // Test SourceBuffer mode (for CMAF, 'sequence' mode is important)
        if (sourceBuffer.mode !== undefined) {
          try {
            sourceBuffer.mode = 'sequence';
            result.sequenceModeSupported = true;
          } catch (e) {
            result.sequenceModeSupported = false;
          }
        }

        cleanup();
        resolve(result);
      } catch (error) {
        result.error = `SourceBuffer creation failed: ${error.message}`;
        cleanup();
        resolve(result);
      }
    });

    mediaSource.addEventListener('error', () => {
      result.error = 'MediaSource error event';
      cleanup();
      resolve(result);
    });
  });
}

/**
 * Detects comprehensive CMAF support including all codec profiles
 * @param {Object} options - Configuration options
 * @param {boolean} options.testSourceBuffers - Whether to test actual SourceBuffer creation (default: false)
 * @param {boolean} options.testVideo - Test video codecs (default: true)
 * @param {boolean} options.testAudio - Test audio codecs (default: true)
 * @param {boolean} options.testCombined - Test combined video+audio (default: false)
 * @param {number} options.timeout - Timeout in milliseconds (default: 20000)
 * @returns {Promise<Object>} Comprehensive CMAF support results
 */
export async function detectCMAFSupport(options = {}) {
  const startTime = performance.now();
  const {
    testSourceBuffers = false,
    testVideo = true,
    testAudio = true,
    testCombined = false,
    timeout = 20000
  } = options;

  const results = {
    supported: false,
    mseAvailable: !!window.MediaSource,
    fragmentedMP4Supported: false,
    videoCodecs: {},
    audioCodecs: {},
    combinedCodecs: {},
    supportedVideoCodecs: [],
    supportedAudioCodecs: [],
    supportedCombinedCodecs: [],
    details: {
      mseVersion: window.MediaSource ? 'available' : 'not available'
    },
    duration: 0
  };

  if (!results.mseAvailable) {
    results.duration = performance.now() - startTime;
    return results;
  }

  try {
    // Test basic fMP4 support with a simple H.264 codec
    const basicFMP4 = 'video/mp4; codecs="avc1.42E01E"';
    results.fragmentedMP4Supported = isCodecSupported(basicFMP4);

    const testPromises = [];

    // Test video codecs
    if (testVideo) {
      Object.entries(CMAF_VIDEO_CODECS).forEach(([name, codec]) => {
        if (testSourceBuffers) {
          testPromises.push(
            testSourceBufferCreation(codec).then(result => ({
              category: 'video',
              name,
              result
            }))
          );
        } else {
          const supported = isCodecSupported(codec);
          results.videoCodecs[name] = {
            codec,
            supported,
            tested: 'isTypeSupported'
          };
          if (supported) {
            results.supportedVideoCodecs.push(name);
          }
        }
      });
    }

    // Test audio codecs
    if (testAudio) {
      Object.entries(CMAF_AUDIO_CODECS).forEach(([name, codec]) => {
        if (testSourceBuffers) {
          testPromises.push(
            testSourceBufferCreation(codec).then(result => ({
              category: 'audio',
              name,
              result
            }))
          );
        } else {
          const supported = isCodecSupported(codec);
          results.audioCodecs[name] = {
            codec,
            supported,
            tested: 'isTypeSupported'
          };
          if (supported) {
            results.supportedAudioCodecs.push(name);
          }
        }
      });
    }

    // Test combined codecs
    if (testCombined) {
      Object.entries(CMAF_COMBINED_CODECS).forEach(([name, codec]) => {
        if (testSourceBuffers) {
          testPromises.push(
            testSourceBufferCreation(codec).then(result => ({
              category: 'combined',
              name,
              result
            }))
          );
        } else {
          const supported = isCodecSupported(codec);
          results.combinedCodecs[name] = {
            codec,
            supported,
            tested: 'isTypeSupported'
          };
          if (supported) {
            results.supportedCombinedCodecs.push(name);
          }
        }
      });
    }

    // If testing SourceBuffers, wait for all tests with timeout
    if (testSourceBuffers && testPromises.length > 0) {
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('SourceBuffer tests timeout')), timeout)
      );

      const testResults = await Promise.race([
        Promise.all(testPromises),
        timeoutPromise
      ]);

      // Process results
      testResults.forEach(({ category, name, result }) => {
        if (category === 'video') {
          results.videoCodecs[name] = {
            codec: result.codec,
            supported: result.sourceBufferCreated,
            typeSupported: result.typeSupported,
            sequenceModeSupported: result.sequenceModeSupported,
            tested: 'sourceBuffer',
            error: result.error
          };
          if (result.sourceBufferCreated) {
            results.supportedVideoCodecs.push(name);
          }
        } else if (category === 'audio') {
          results.audioCodecs[name] = {
            codec: result.codec,
            supported: result.sourceBufferCreated,
            typeSupported: result.typeSupported,
            sequenceModeSupported: result.sequenceModeSupported,
            tested: 'sourceBuffer',
            error: result.error
          };
          if (result.sourceBufferCreated) {
            results.supportedAudioCodecs.push(name);
          }
        } else if (category === 'combined') {
          results.combinedCodecs[name] = {
            codec: result.codec,
            supported: result.sourceBufferCreated,
            typeSupported: result.typeSupported,
            sequenceModeSupported: result.sequenceModeSupported,
            tested: 'sourceBuffer',
            error: result.error
          };
          if (result.sourceBufferCreated) {
            results.supportedCombinedCodecs.push(name);
          }
        }
      });
    }

    // Overall CMAF support: need fragmented MP4 and at least one video + one audio codec
    results.supported =
      results.fragmentedMP4Supported &&
      results.supportedVideoCodecs.length > 0 &&
      results.supportedAudioCodecs.length > 0;

  } catch (error) {
    results.details.error = error.message;
  }

  results.duration = performance.now() - startTime;
  return results;
}

/**
 * Quick check for CMAF support (returns boolean only)
 * @returns {Promise<boolean>}
 */
export async function hasCMAFSupport() {
  const result = await detectCMAFSupport({ timeout: 5000 });
  return result.supported;
}

/**
 * Get list of supported CMAF video codecs
 * @returns {Promise<Array<string>>}
 */
export async function getSupportedCMAFVideoCodecs() {
  const result = await detectCMAFSupport({ testVideo: true, testAudio: false, timeout: 5000 });
  return result.supportedVideoCodecs;
}

/**
 * Get list of supported CMAF audio codecs
 * @returns {Promise<Array<string>>}
 */
export async function getSupportedCMAFAudioCodecs() {
  const result = await detectCMAFSupport({ testVideo: false, testAudio: true, timeout: 5000 });
  return result.supportedAudioCodecs;
}

// Export codec definitions for external use
export { CMAF_VIDEO_CODECS, CMAF_AUDIO_CODECS, CMAF_COMBINED_CODECS };
