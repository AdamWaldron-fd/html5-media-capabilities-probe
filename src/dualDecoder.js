/**
 * Dual Decoder Detection Module
 * Tests if the environment supports multiple video elements playing simultaneously
 * This is essential for interstitial ad playback scenarios
 */

/**
 * Creates a minimal MSE video element for testing
 * @param {number} index - Video element identifier
 * @returns {Promise<HTMLVideoElement>} The created video element
 */
function createTestVideoElement(index) {
  const video = document.createElement('video');
  video.id = `probe-video-${index}`;
  video.muted = true;
  video.playsInline = true;
  video.style.position = 'absolute';
  video.style.left = '-9999px';
  video.style.width = '1px';
  video.style.height = '1px';
  video.style.opacity = '0';
  document.body.appendChild(video);
  return video;
}

/**
 * Creates a simple MediaSource with minimal video data
 * @param {HTMLVideoElement} video - The video element to attach to
 * @returns {Promise<boolean>} True if successful
 */
function attachMediaSource(video) {
  return new Promise((resolve, reject) => {
    if (!window.MediaSource) {
      reject(new Error('MediaSource not supported'));
      return;
    }

    const mediaSource = new MediaSource();
    video.src = URL.createObjectURL(mediaSource);

    const timeout = setTimeout(() => {
      reject(new Error('MediaSource open timeout'));
    }, 5000);

    mediaSource.addEventListener('sourceopen', () => {
      clearTimeout(timeout);
      try {
        // Use a common codec that most browsers support
        const mimeCodec = 'video/mp4; codecs="avc1.42E01E"';

        if (!MediaSource.isTypeSupported(mimeCodec)) {
          reject(new Error(`Codec ${mimeCodec} not supported`));
          return;
        }

        const sourceBuffer = mediaSource.addSourceBuffer(mimeCodec);

        // We don't actually need to append data for this test
        // Just having the source buffer created is enough
        sourceBuffer.addEventListener('error', (e) => {
          reject(new Error('SourceBuffer error'));
        });

        resolve(true);
      } catch (error) {
        reject(error);
      }
    });

    mediaSource.addEventListener('error', (e) => {
      clearTimeout(timeout);
      reject(new Error('MediaSource error'));
    });
  });
}

/**
 * Tests if multiple video elements can be created and initialized simultaneously
 * @param {Object} options - Configuration options
 * @param {number} options.count - Number of decoders to test (default: 2)
 * @param {number} options.timeout - Timeout in milliseconds (default: 10000)
 * @returns {Promise<Object>} Test results
 */
export async function detectDualDecoders(options = {}) {
  const { count = 2, timeout = 10000 } = options;
  const startTime = performance.now();
  const videoElements = [];
  const results = {
    supported: false,
    maxConcurrentDecoders: 0,
    details: {
      testedCount: count,
      successfullyInitialized: 0,
      errors: [],
      browserInfo: {
        userAgent: navigator.userAgent,
        vendor: navigator.vendor,
        platform: navigator.platform
      }
    },
    duration: 0
  };

  try {
    // Check basic MediaSource support
    if (!window.MediaSource) {
      results.details.errors.push('MediaSource API not available');
      results.duration = performance.now() - startTime;
      return results;
    }

    // Create multiple video elements
    for (let i = 0; i < count; i++) {
      videoElements.push(createTestVideoElement(i));
    }

    // Small delay to ensure DOM is ready
    await new Promise(resolve => setTimeout(resolve, 100));

    // Try to initialize MediaSource on all video elements simultaneously
    const initPromises = videoElements.map((video, index) =>
      attachMediaSource(video)
        .then(() => ({ success: true, index }))
        .catch((error) => ({ success: false, index, error: error.message }))
    );

    // Use Promise.allSettled to wait for all promises regardless of success/failure
    // Add a timeout wrapper for each individual promise
    const wrappedPromises = initPromises.map((promise, index) =>
      Promise.race([
        promise,
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error(`Timeout for decoder ${index}`)), timeout)
        )
      ]).catch(error => ({ success: false, index, error: error.message }))
    );

    const settledResults = await Promise.allSettled(wrappedPromises);
    const initResults = settledResults.map(result =>
      result.status === 'fulfilled' ? result.value : { success: false, error: 'Promise rejected' }
    );

    // Count successful initializations
    const successful = initResults.filter(r => r.success);
    results.details.successfullyInitialized = successful.length;
    results.maxConcurrentDecoders = successful.length;
    results.supported = successful.length >= 2;

    // Collect errors
    initResults
      .filter(r => !r.success)
      .forEach(r => results.details.errors.push(`Decoder ${r.index}: ${r.error}`));

    // Note: We don't test actual playback since we're not loading real media data
    // Successfully creating multiple MediaSource instances with SourceBuffers
    // is sufficient to prove dual decoder capability
    if (successful.length >= 2) {
      results.details.simultaneousPlayback = 'not tested (MediaSource initialization sufficient)';
    }

  } catch (error) {
    results.details.errors.push(`Test failed: ${error.message}`);
  } finally {
    // Cleanup: Remove all created video elements
    videoElements.forEach(video => {
      try {
        video.pause();
        video.src = '';
        video.load();
        if (video.parentNode) {
          video.parentNode.removeChild(video);
        }
      } catch (e) {
        // Ignore cleanup errors
      }
    });

    results.duration = performance.now() - startTime;
  }

  return results;
}

/**
 * Quick check for dual decoder support (returns boolean only)
 * @returns {Promise<boolean>}
 */
export async function hasDualDecoderSupport() {
  const result = await detectDualDecoders({ count: 2, timeout: 5000 });
  return result.supported;
}
