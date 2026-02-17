# HTML5 Media Capabilities Probe

A comprehensive JavaScript tool for probing HTML5 media capabilities in any browser environment. This tool detects support for advanced video playback features essential for modern streaming applications.

## Features

### 1. Device Fingerprinting
Generates a unique device identifier by collecting comprehensive device-specific information:
- **Hardware**: GPU (WebGL), CPU cores, RAM, screen resolution, pixel ratio
- **Software**: Browser, OS, platform, timezone
- **Capabilities**: Audio context, canvas rendering, WebGL capabilities
- **Device ID**: Unique hash generated from all collected information

This enables tracking test results across sessions and correlating capabilities with specific device configurations.

### 2. Dual Decoder Detection
Tests whether the environment supports multiple video elements playing simultaneously. This is critical for:
- Interstitial ad playback
- Picture-in-picture implementations
- Multi-angle video playback
- Seamless content transitions

### 3. CBCS Encryption Support
Detects support for CBCS (Content Based Cipher Scheme) encryption across major DRM systems:
- **Widevine** (Google)
- **PlayReady** (Microsoft)
- **FairPlay** (Apple)
- **ClearKey** (W3C standard)

CBCS is increasingly used for encrypted content delivery and is required for many modern streaming services.

### 4. CMAF Support
Tests Media Source Extensions (MSE) support for CMAF (Common Media Application Format):
- Fragmented MP4 (fMP4) container support
- Multiple video codecs (H.264, H.265/HEVC, VP9, AV1)
- Multiple audio codecs (AAC, Opus, AC-3, E-AC-3, FLAC)
- Combined audio+video track support

## Installation

### Option 1: Direct Usage (ES Modules)

```html
<!-- In your HTML file -->
<script type="module">
  import MediaCapabilitiesProbe from './src/index.js';

  // Run all tests
  const results = await MediaCapabilitiesProbe.probeAllCapabilities();
  console.log(results);
</script>
```

### Option 2: As a Module in Your Project

1. Copy the `src` folder to your project
2. Import the module:

```javascript
import MediaCapabilitiesProbe from './path/to/src/index.js';
```

### Option 3: Build and Bundle

If you're using a bundler (Webpack, Rollup, Vite, etc.):

```javascript
import MediaCapabilitiesProbe from 'html5-media-capabilities-probe';
```

## Quick Start

### Running the Demo

1. Clone this repository
2. Open `demo/index.html` in any modern browser
3. Click "Run Full Probe" to test all capabilities

### Basic Usage

```javascript
import MediaCapabilitiesProbe from './src/index.js';

// Quick boolean check for all capabilities
const quickResults = await MediaCapabilitiesProbe.quickProbe();
console.log(quickResults);
// Output: { dualDecodersSupported: true, cbcsSupported: true, cmafSupported: true, allSupported: true }

// Comprehensive probe with detailed results
const fullResults = await MediaCapabilitiesProbe.probeAllCapabilities();
console.log(MediaCapabilitiesProbe.generateReport(fullResults));
```

## API Reference

### Main Functions

#### `probeAllCapabilities(options)`

Runs all capability tests and returns comprehensive results.

```javascript
const results = await MediaCapabilitiesProbe.probeAllCapabilities({
  testDualDecoders: true,      // Test dual decoder support
  testCBCS: true,               // Test CBCS encryption
  testCMAF: true,               // Test CMAF support
  timeout: 30000,               // Global timeout in ms

  // Options for individual tests
  dualDecoderOptions: { count: 2 },
  cbcsOptions: { timeout: 15000 },
  cmafOptions: {
    testVideo: true,
    testAudio: true,
    testSourceBuffers: false
  }
});
```

**Returns:**
```javascript
{
  timestamp: "2024-01-01T00:00:00.000Z",
  deviceId: "abc123xyz",           // Unique device identifier
  device: {                         // Device information
    make: "Apple",
    model: "iPhone (iOS 16.0)",
    browser: "Safari 16.0",
    gpu: "Apple - Apple GPU",
    cpuCores: 6,
    ramGB: 8,
    screenResolution: "1170x2532",
    pixelRatio: 3,
    timezone: "America/New_York"
  },
  userAgent: "Mozilla/5.0...",
  capabilities: {
    dualDecoders: { /* detailed results */ },
    cbcs: { /* detailed results */ },
    cmaf: { /* detailed results */ }
  },
  summary: {
    dualDecodersSupported: true,
    cbcsSupported: true,
    cmafSupported: true,
    allSupported: true
  },
  duration: 1234.56
}
```

#### `quickProbe()`

Quick boolean check for all capabilities (faster, less detailed).

```javascript
const results = await MediaCapabilitiesProbe.quickProbe();
// { dualDecodersSupported: true, cbcsSupported: true, cmafSupported: true, allSupported: true }
```

#### `generateReport(probeResults)`

Generates a human-readable text report from probe results.

```javascript
const results = await MediaCapabilitiesProbe.probeAllCapabilities();
const report = MediaCapabilitiesProbe.generateReport(results);
console.log(report);
```

### Individual Capability Tests

#### Dual Decoder Detection

```javascript
// Detailed test
const results = await MediaCapabilitiesProbe.detectDualDecoders(2, 10000);
console.log(results);

// Quick boolean check
const supported = await MediaCapabilitiesProbe.hasDualDecoderSupport();
console.log(supported); // true or false
```

#### CBCS Encryption Detection

```javascript
// Detailed test
const results = await MediaCapabilitiesProbe.detectCBCSSupport({
  timeout: 15000,
  keySystemsToTest: [
    'com.widevine.alpha',
    'com.microsoft.playready',
    'com.apple.fps.1_0'
  ]
});

// Quick boolean check
const supported = await MediaCapabilitiesProbe.hasCBCSSupport();

// Get list of supported DRMs
const drms = await MediaCapabilitiesProbe.getCBCSSupportedDRMs();
console.log(drms); // ['Widevine', 'PlayReady']
```

#### CMAF Support Detection

```javascript
// Detailed test
const results = await MediaCapabilitiesProbe.detectCMAFSupport({
  testVideo: true,
  testAudio: true,
  testCombined: false,
  testSourceBuffers: false,  // Set to true for deeper testing
  timeout: 20000
});

// Quick boolean check
const supported = await MediaCapabilitiesProbe.hasCMAFSupport();

// Get supported video codecs
const videoCodecs = await MediaCapabilitiesProbe.getSupportedCMAFVideoCodecs();
console.log(videoCodecs); // ['H.264 Main', 'H.265 Main', 'VP9 Profile 0']

// Get supported audio codecs
const audioCodecs = await MediaCapabilitiesProbe.getSupportedCMAFAudioCodecs();
console.log(audioCodecs); // ['AAC-LC', 'HE-AAC', 'Opus']
```

#### Device Fingerprinting

```javascript
// Get complete device fingerprint with detailed information
const deviceInfo = MediaCapabilitiesProbe.getDeviceDetails();
console.log(deviceInfo);
// {
//   deviceId: "abc123xyz",
//   deviceMake: "Apple",
//   deviceModel: "iPhone (iOS 16.0)",
//   browserName: "Safari",
//   browserVersion: "16.0",
//   cpuCores: 6,
//   ramGB: 8,
//   gpu: "Apple - Apple GPU",
//   screenResolution: "1170x2532",
//   pixelRatio: 3,
//   timezone: "America/New_York",
//   fingerprint: { /* detailed hardware/software info */ }
// }

// Get just the device ID (lightweight)
const deviceId = MediaCapabilitiesProbe.getDeviceId();
console.log(deviceId); // "abc123xyz"

// Get raw fingerprint data
const fingerprint = MediaCapabilitiesProbe.generateDeviceFingerprint();
console.log(fingerprint);
// {
//   deviceId: "abc123xyz",
//   deviceString: "concatenated device info...",
//   details: { /* all collected information */ }
// }
```

### Constants

Access codec definitions and DRM key systems:

```javascript
import {
  KEY_SYSTEMS,
  CMAF_VIDEO_CODECS,
  CMAF_AUDIO_CODECS,
  CMAF_COMBINED_CODECS
} from './src/index.js';

console.log(KEY_SYSTEMS.WIDEVINE); // 'com.widevine.alpha'
console.log(CMAF_VIDEO_CODECS['H.264 Main']); // 'video/mp4; codecs="avc1.4D401E"'
```

## Use Cases

### Example 1: Pre-flight Check for Video Player

```javascript
async function initializePlayer() {
  const probe = await MediaCapabilitiesProbe.quickProbe();

  if (!probe.cmafSupported) {
    showError('Your browser does not support modern video formats');
    return;
  }

  if (!probe.cbcsSupported) {
    showWarning('DRM-protected content may not be available');
  }

  if (probe.dualDecodersSupported) {
    enableInterstitialAds();
  }

  // Initialize player with appropriate configuration
  initPlayer(probe);
}
```

### Example 2: Feature Detection for Ad Insertion

```javascript
async function configureAdPlayback() {
  const dualDecoderSupport = await MediaCapabilitiesProbe.hasDualDecoderSupport();

  if (dualDecoderSupport) {
    // Use seamless ad insertion with dual decoders
    return { mode: 'dual-decoder', preloadAds: true };
  } else {
    // Fall back to single decoder mode
    return { mode: 'single-decoder', preloadAds: false };
  }
}
```

### Example 3: Adaptive Content Delivery

```javascript
async function selectBestStream() {
  const cmafResults = await MediaCapabilitiesProbe.detectCMAFSupport({
    testVideo: true,
    testAudio: true
  });

  const supportedVideoCodecs = cmafResults.supportedVideoCodecs;

  // Prefer AV1, then HEVC, then H.264
  if (supportedVideoCodecs.includes('AV1 Main')) {
    return { codec: 'av1', quality: 'high' };
  } else if (supportedVideoCodecs.includes('HEVC Main')) {
    return { codec: 'hevc', quality: 'high' };
  } else if (supportedVideoCodecs.includes('H.264 High')) {
    return { codec: 'h264', quality: 'high' };
  } else {
    return { codec: 'h264', quality: 'standard' };
  }
}
```

### Example 4: DRM System Selection

```javascript
async function selectDRMSystem() {
  const cbcsResults = await MediaCapabilitiesProbe.detectCBCSSupport();

  if (!cbcsResults.cbcsSupported) {
    throw new Error('No DRM support available');
  }

  const supportedDRMs = cbcsResults.supportedDRMs;

  // Select DRM system based on priority and availability
  if (supportedDRMs.includes('Widevine')) {
    return { system: 'widevine', keySystem: 'com.widevine.alpha' };
  } else if (supportedDRMs.includes('PlayReady')) {
    return { system: 'playready', keySystem: 'com.microsoft.playready' };
  } else if (supportedDRMs.includes('FairPlay')) {
    return { system: 'fairplay', keySystem: 'com.apple.fps.1_0' };
  }
}
```

### Example 5: Device Tracking and Analytics

```javascript
async function reportCapabilitiesToAnalytics() {
  const results = await MediaCapabilitiesProbe.probeAllCapabilities();

  // Send comprehensive report to your analytics service
  analytics.track('device_capabilities', {
    deviceId: results.deviceId,
    device: {
      make: results.device.make,
      model: results.device.model,
      browser: results.device.browser,
      gpu: results.device.gpu,
      cpuCores: results.device.cpuCores,
      ramGB: results.device.ramGB,
      screenResolution: results.device.screenResolution
    },
    capabilities: {
      dualDecoders: results.summary.dualDecodersSupported,
      cbcs: results.summary.cbcsSupported,
      cmaf: results.summary.cmafSupported
    },
    timestamp: results.timestamp
  });

  // Use device ID for session tracking
  localStorage.setItem('deviceId', results.deviceId);

  return results;
}

// Correlate playback issues with device capabilities
async function logPlaybackError(error) {
  const deviceId = MediaCapabilitiesProbe.getDeviceId();
  const deviceInfo = MediaCapabilitiesProbe.getDeviceDetails();

  errorLogger.report({
    error: error.message,
    deviceId: deviceId,
    device: deviceInfo.deviceModel,
    browser: deviceInfo.browserName,
    gpu: deviceInfo.gpu
  });
}
```


## Browser Compatibility

This tool uses modern browser APIs:
- **Media Source Extensions (MSE)** - Required for CMAF testing
- **Encrypted Media Extensions (EME)** - Required for CBCS testing
- **HTML5 Video Element** - Required for dual decoder testing

### Minimum Browser Versions:
- Chrome/Edge: 70+
- Firefox: 65+
- Safari: 13+
- iOS Safari: 13+
- Chrome Android: 70+

## Performance Considerations

- **Quick Probe**: ~100-500ms - Use for initial checks
- **Full Probe**: ~2-5 seconds - Use when detailed results are needed
- **Source Buffer Testing**: +2-10 seconds - Only enable when necessary

The tool is designed to be non-blocking and uses:
- Parallel test execution where possible
- Configurable timeouts
- Automatic cleanup of test resources

## Troubleshooting

### "MediaSource not supported" error
Your browser doesn't support MSE. Update to a modern browser version.

### CBCS tests always return false
This is expected on older browsers or some mobile devices. CBCS support varies by platform.

### Dual decoder test times out
Some platforms/browsers have strict resource limits. Try increasing the timeout:

```javascript
const results = await MediaCapabilitiesProbe.detectDualDecoders(2, 20000);
```

### Tests fail in iframe
Some browser security policies restrict media APIs in iframes. Run tests in the top-level window.

## Development

### Project Structure

```
html5-media-capabilities-probe/
├── src/
│   ├── index.js              # Main entry point
│   ├── dualDecoder.js        # Dual decoder detection
│   ├── cbcsEncryption.js     # CBCS encryption detection
│   ├── cmafSupport.js        # CMAF support detection
│   └── deviceFingerprint.js  # Device fingerprinting
├── demo/
│   └── index.html            # Interactive demo page
├── package.json
├── .gitignore
└── README.md
```

### Building and Testing

The tool is written in pure ES6 modules and requires no build step. Simply open `demo/index.html` in a browser to test.

For production use, you may want to bundle with:
- Webpack
- Rollup
- Vite
- esbuild

### Contributing

Contributions are welcome! Please ensure:
1. Code follows ES6 module standards
2. All functions include JSDoc comments
3. Tests are added for new capabilities
4. Demo page is updated with new features

## Technical Details

### Dual Decoder Detection

The tool creates multiple hidden video elements and tests if they can:
1. Create MediaSource instances simultaneously
2. Initialize SourceBuffers
3. Attempt playback concurrently

### CBCS Detection

Tests each DRM system by:
1. Checking EME API availability
2. Requesting MediaKeySystemAccess with CBCS encryption scheme
3. Testing fallback to CENC for comparison
4. Identifying supported codecs for each DRM system

### CMAF Detection

Validates CMAF support through:
1. MediaSource.isTypeSupported() checks
2. Optional SourceBuffer creation tests
3. Codec-specific validation
4. Sequence mode support testing

### Device Fingerprinting

Generates a unique device identifier by collecting:
1. **Hardware Information**:
   - GPU vendor and renderer (via WebGL)
   - CPU cores (navigator.hardwareConcurrency)
   - Device memory (navigator.deviceMemory)
   - Screen resolution, color depth, pixel ratio
   - Max touch points

2. **Software Information**:
   - User agent string
   - Platform and vendor
   - Browser language preferences
   - Timezone and offset

3. **Capability Fingerprints**:
   - Audio context sample rate and channel count
   - Canvas rendering fingerprint
   - Available storage APIs

4. **Device ID Generation**:
   - All collected data is concatenated into a string
   - A simple hash function generates a consistent, short device ID
   - The ID remains stable across sessions for the same device/browser combination

**Privacy Note**: The device fingerprint is generated client-side and is not transmitted unless explicitly sent by your application. The fingerprint can identify the device/browser combination but does not include personally identifiable information.

## License

MIT License - See LICENSE file for details

## References

- [Media Source Extensions API](https://www.w3.org/TR/media-source/)
- [Encrypted Media Extensions API](https://www.w3.org/TR/encrypted-media/)
- [CMAF Specification](https://www.iso.org/standard/71975.html)
- [CBCS Encryption](https://www.iso.org/standard/68042.html)

## Support

For issues, questions, or contributions, please open an issue on the project repository.

---

**Note**: This tool performs feature detection only and does not play actual media content. It's designed to be lightweight and fast for use in production applications.
