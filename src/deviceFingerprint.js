/**
 * Device Fingerprinting Module
 * Collects device-specific information to generate a unique device identifier
 */

/**
 * Gets WebGL renderer information (GPU details)
 * @returns {Object} WebGL renderer info
 */
function getWebGLInfo() {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');

    if (!gl) {
      return { vendor: 'unknown', renderer: 'unknown' };
    }

    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    if (debugInfo) {
      return {
        vendor: gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL),
        renderer: gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL)
      };
    }

    return {
      vendor: gl.getParameter(gl.VENDOR),
      renderer: gl.getParameter(gl.RENDERER)
    };
  } catch (e) {
    return { vendor: 'unknown', renderer: 'unknown' };
  }
}

/**
 * Gets audio context information
 * @returns {Object} Audio context info
 */
function getAudioInfo() {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) {
      return { sampleRate: 'unknown', channels: 'unknown' };
    }

    const audioContext = new AudioContext();
    const info = {
      sampleRate: audioContext.sampleRate,
      channels: audioContext.destination.maxChannelCount
    };
    audioContext.close();
    return info;
  } catch (e) {
    return { sampleRate: 'unknown', channels: 'unknown' };
  }
}

/**
 * Gets canvas fingerprint hash
 * @returns {string} Canvas fingerprint
 */
function getCanvasFingerprint() {
  try {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = 200;
    canvas.height = 50;

    // Draw text with specific styling
    ctx.textBaseline = 'top';
    ctx.font = '14px Arial';
    ctx.fillStyle = '#f60';
    ctx.fillRect(125, 1, 62, 20);
    ctx.fillStyle = '#069';
    ctx.fillText('Device Probe', 2, 15);
    ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
    ctx.fillText('Device Probe', 4, 17);

    return canvas.toDataURL();
  } catch (e) {
    return 'unknown';
  }
}

/**
 * Simple string hash function
 * @param {string} str - String to hash
 * @returns {string} Hash string
 */
function simpleHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36);
}

/**
 * Collects comprehensive device information and generates a unique device ID
 * @returns {Object} Device fingerprint data
 */
export function generateDeviceFingerprint() {
  const deviceInfo = {
    // Browser and User Agent
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    vendor: navigator.vendor,
    language: navigator.language,
    languages: navigator.languages ? navigator.languages.join(',') : navigator.language,

    // Hardware
    hardwareConcurrency: navigator.hardwareConcurrency || 'unknown',
    deviceMemory: navigator.deviceMemory || 'unknown',
    maxTouchPoints: navigator.maxTouchPoints || 0,

    // Screen
    screenWidth: screen.width,
    screenHeight: screen.height,
    screenColorDepth: screen.colorDepth,
    screenPixelDepth: screen.pixelDepth || screen.colorDepth,
    devicePixelRatio: window.devicePixelRatio || 1,
    screenOrientation: screen.orientation ? screen.orientation.type : 'unknown',

    // Display
    availWidth: screen.availWidth,
    availHeight: screen.availHeight,
    innerWidth: window.innerWidth,
    innerHeight: window.innerHeight,

    // WebGL (GPU info)
    webgl: getWebGLInfo(),

    // Audio
    audio: getAudioInfo(),

    // Timezone
    timezoneOffset: new Date().getTimezoneOffset(),
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,

    // Storage
    localStorage: typeof localStorage !== 'undefined',
    sessionStorage: typeof sessionStorage !== 'undefined',
    indexedDB: !!window.indexedDB,

    // Features
    cookieEnabled: navigator.cookieEnabled,
    doNotTrack: navigator.doNotTrack || 'unknown',

    // Media capabilities
    mediaDevices: !!navigator.mediaDevices,

    // Connection (if available)
    connection: navigator.connection ? {
      effectiveType: navigator.connection.effectiveType,
      downlink: navigator.connection.downlink,
      rtt: navigator.connection.rtt
    } : 'unknown',

    // Canvas fingerprint
    canvasHash: simpleHash(getCanvasFingerprint())
  };

  // Create a concatenated string of all device information
  const deviceString = [
    deviceInfo.userAgent,
    deviceInfo.platform,
    deviceInfo.vendor,
    deviceInfo.language,
    deviceInfo.languages,
    deviceInfo.hardwareConcurrency,
    deviceInfo.deviceMemory,
    deviceInfo.maxTouchPoints,
    deviceInfo.screenWidth,
    deviceInfo.screenHeight,
    deviceInfo.screenColorDepth,
    deviceInfo.screenPixelDepth,
    deviceInfo.devicePixelRatio,
    deviceInfo.screenOrientation,
    deviceInfo.webgl.vendor,
    deviceInfo.webgl.renderer,
    deviceInfo.audio.sampleRate,
    deviceInfo.audio.channels,
    deviceInfo.timezoneOffset,
    deviceInfo.timezone,
    deviceInfo.canvasHash
  ].join('|');

  // Generate a unique device ID by hashing the concatenated string
  const deviceId = simpleHash(deviceString);

  return {
    deviceId,
    deviceString,
    details: deviceInfo
  };
}

/**
 * Gets a short device ID (hash only)
 * @returns {string} Device ID
 */
export function getDeviceId() {
  const fingerprint = generateDeviceFingerprint();
  return fingerprint.deviceId;
}

/**
 * Generates a more detailed device identifier with make/model info
 * @returns {Object} Detailed device info
 */
export function getDeviceDetails() {
  const fingerprint = generateDeviceFingerprint();
  const details = fingerprint.details;

  // Try to extract device make/model from user agent
  const ua = details.userAgent;
  let deviceMake = 'unknown';
  let deviceModel = 'unknown';

  // Mobile device detection
  if (/iPhone/.test(ua)) {
    deviceMake = 'Apple';
    const match = ua.match(/iPhone\s+OS\s+([\d_]+)/);
    deviceModel = match ? `iPhone (iOS ${match[1].replace(/_/g, '.')})` : 'iPhone';
  } else if (/iPad/.test(ua)) {
    deviceMake = 'Apple';
    const match = ua.match(/iPad.*OS\s+([\d_]+)/);
    deviceModel = match ? `iPad (iOS ${match[1].replace(/_/g, '.')})` : 'iPad';
  } else if (/Android/.test(ua)) {
    deviceMake = 'Android';
    const match = ua.match(/Android\s+([\d.]+);?\s*([^;)]+)?/);
    if (match) {
      deviceModel = match[2] ? `${match[2]} (Android ${match[1]})` : `Android ${match[1]}`;
    } else {
      deviceModel = 'Android Device';
    }
  } else if (/Mac OS X/.test(ua)) {
    deviceMake = 'Apple';
    const match = ua.match(/Mac OS X\s+([\d_]+)/);
    deviceModel = match ? `Mac (macOS ${match[1].replace(/_/g, '.')})` : 'Mac';
  } else if (/Windows/.test(ua)) {
    deviceMake = 'Microsoft';
    if (/Windows NT 10/.test(ua)) deviceModel = 'Windows 10/11';
    else if (/Windows NT 6.3/.test(ua)) deviceModel = 'Windows 8.1';
    else if (/Windows NT 6.2/.test(ua)) deviceModel = 'Windows 8';
    else if (/Windows NT 6.1/.test(ua)) deviceModel = 'Windows 7';
    else deviceModel = 'Windows';
  } else if (/Linux/.test(ua)) {
    deviceMake = 'Linux';
    deviceModel = 'Linux Device';
  } else if (/CrOS/.test(ua)) {
    deviceMake = 'Google';
    deviceModel = 'Chromebook';
  }

  // Extract browser info
  let browserName = 'unknown';
  let browserVersion = 'unknown';

  if (/Edg\//.test(ua)) {
    browserName = 'Microsoft Edge';
    const match = ua.match(/Edg\/([\d.]+)/);
    browserVersion = match ? match[1] : 'unknown';
  } else if (/Chrome\//.test(ua) && !/Edg\//.test(ua)) {
    browserName = 'Google Chrome';
    const match = ua.match(/Chrome\/([\d.]+)/);
    browserVersion = match ? match[1] : 'unknown';
  } else if (/Safari\//.test(ua) && !/Chrome\//.test(ua)) {
    browserName = 'Safari';
    const match = ua.match(/Version\/([\d.]+)/);
    browserVersion = match ? match[1] : 'unknown';
  } else if (/Firefox\//.test(ua)) {
    browserName = 'Firefox';
    const match = ua.match(/Firefox\/([\d.]+)/);
    browserVersion = match ? match[1] : 'unknown';
  }

  return {
    deviceId: fingerprint.deviceId,
    deviceMake,
    deviceModel,
    browserName,
    browserVersion,
    cpuCores: details.hardwareConcurrency,
    ramGB: details.deviceMemory,
    gpu: `${details.webgl.vendor} - ${details.webgl.renderer}`,
    screenResolution: `${details.screenWidth}x${details.screenHeight}`,
    pixelRatio: details.devicePixelRatio,
    timezone: details.timezone,
    fingerprint: fingerprint.details
  };
}

export default {
  generateDeviceFingerprint,
  getDeviceId,
  getDeviceDetails
};
