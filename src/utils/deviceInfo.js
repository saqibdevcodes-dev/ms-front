/**
 * Utility to get device information for security logging
 */

/**
 * Attempts to get the device's MAC address (this will generally not work in browsers due to security restrictions)
 * Instead, it generates a semi-persistent device fingerprint that can be used for tracking purposes
 * @returns {Promise<string>} - A device identifier or null if not available
 */
export async function getDeviceFingerprint() {
  try {
    // In a browser environment, we can't directly access the MAC address
    // Instead, we'll create a device fingerprint based on available information

    // Get available information
    const userAgent = navigator.userAgent
    const language = navigator.language
    const platform = navigator.platform
    const screenWidth = window.screen.width
    const screenHeight = window.screen.height
    const colorDepth = window.screen.colorDepth
    const pixelRatio = window.devicePixelRatio
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone

    // Generate a fingerprint by hashing these values
    const fingerprint = await hashString(
      `${userAgent}-${language}-${platform}-${screenWidth}x${screenHeight}-${colorDepth}-${pixelRatio}-${timezone}`
    )

    return fingerprint
  } catch (error) {
    console.error('Error generating device fingerprint:', error)
    return null
  }
}

/**
 * Creates a hash of a string (simple implementation)
 * @param {string} str - The string to hash
 * @returns {Promise<string>} - The hashed string
 */
async function hashString(str) {
  // Use SubtleCrypto if available (modern browsers)
  if (window.crypto && window.crypto.subtle) {
    try {
      const encoder = new TextEncoder()
      const data = encoder.encode(str)
      const hashBuffer = await window.crypto.subtle.digest('SHA-256', data)

      // Convert the hash to a hex string
      const hashArray = Array.from(new Uint8Array(hashBuffer))
      const hashHex = hashArray.map((byte) => byte.toString(16).padStart(2, '0')).join('')

      return hashHex.slice(0, 17) // Return in MAC address like format
    } catch (error) {
      console.error('Error hashing with SubtleCrypto:', error)
    }
  }

  // Fallback to a simple hash
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash = hash & hash // Convert to 32bit integer
  }

  // Format like a MAC address (for consistency)
  const hashStr = Math.abs(hash).toString(16).padStart(12, '0')
  return hashStr
    .match(/.{1,2}/g)
    .join(':')
    .slice(0, 17)
}

/**
 * Get IP address from a public service
 * @returns {Promise<string>} - The IP address or null if not available
 */
export async function getPublicIpAddress() {
  try {
    const response = await fetch('https://api.ipify.org?format=json')
    const data = await response.json()
    return data.ip
  } catch (error) {
    console.error('Error fetching IP address:', error)
    return null
  }
}
