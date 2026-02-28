/**
 * Lightweight User Agent Parser
 *
 * Regex-based parser for extracting browser, OS, and device type from
 * user agent strings. No external dependencies.
 *
 * Used by session-service.ts to display session details in the admin console.
 */

export interface ParsedUserAgent {
  browser: string;
  os: string;
  device: string;
}

/**
 * Parse a user agent string into browser, OS, and device type.
 * Returns "Unknown" for any field that cannot be determined.
 *
 * @param ua - Raw user agent string (or null)
 * @returns Parsed user agent with browser, os, and device fields
 */
export function parseUserAgent(ua: string | null): ParsedUserAgent {
  if (!ua) {
    return { browser: 'Unknown', os: 'Unknown', device: 'Unknown' };
  }

  return {
    browser: detectBrowser(ua),
    os: detectOS(ua),
    device: detectDevice(ua),
  };
}

function detectBrowser(ua: string): string {
  // Order matters: check more specific browsers first

  // Edge (Chromium-based)
  if (/Edg(e|A|iOS)?\/[\d.]+/i.test(ua)) return 'Edge';

  // Opera / OPR
  if (/OPR\/[\d.]+/i.test(ua) || /Opera\/[\d.]+/i.test(ua)) return 'Opera';

  // Chrome (must come after Edge and Opera which also contain "Chrome")
  if (/Chrome\/[\d.]+/i.test(ua) && !/Chromium/i.test(ua)) return 'Chrome';

  // Firefox
  if (/Firefox\/[\d.]+/i.test(ua)) return 'Firefox';

  // Safari (must come after Chrome check since Chrome also contains "Safari")
  if (/Safari\/[\d.]+/i.test(ua) && /Version\/[\d.]+/i.test(ua)) return 'Safari';

  return 'Unknown';
}

function detectOS(ua: string): string {
  // iOS (check before macOS since iPad can masquerade)
  if (/iPhone|iPad|iPod/i.test(ua)) return 'iOS';

  // Android
  if (/Android/i.test(ua)) return 'Android';

  // Windows
  if (/Windows NT/i.test(ua)) return 'Windows';

  // macOS
  if (/Macintosh|Mac OS X/i.test(ua)) return 'macOS';

  // Linux (check after Android since Android UA also contains "Linux")
  if (/Linux/i.test(ua)) return 'Linux';

  return 'Unknown';
}

function detectDevice(ua: string): string {
  // Tablet detection (check before mobile)
  if (/iPad/i.test(ua)) return 'Tablet';
  if (/Android/i.test(ua) && !/Mobile/i.test(ua)) return 'Tablet';
  if (/Tablet/i.test(ua)) return 'Tablet';

  // Mobile detection
  if (/iPhone|iPod/i.test(ua)) return 'Mobile';
  if (/Android.*Mobile/i.test(ua)) return 'Mobile';
  if (/Mobile|webOS|BlackBerry|IEMobile|Opera Mini/i.test(ua)) return 'Mobile';

  return 'Desktop';
}
