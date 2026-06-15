/**
 * Utility to prevent excessive API calls from cross-tab synchronization
 *
 * This solves the issue where data changes in one tab trigger cascading
 * API refreshes across multiple stores, creating a feedback loop.
 */

// Set cooldown periods (in milliseconds) for different stores
const COOLDOWN_PERIODS = {
  responses: 5000, // 5 seconds
  templates: 5000,
  ranges: 5000,
  reports: 5000,
  branches: 5000,
  // Add other stores as needed
  default: 3000 // Default cooldown for any store not specifically listed
}

// Track last refresh timestamp for each store
const lastSyncTimestamps = {}

/**
 * Determines if a store should refresh based on cooldown period
 * @param {string} storeName - Name of the store ('responses', 'templates', etc.)
 * @returns {boolean} - Whether the refresh should proceed
 */
export const shouldRefresh = (storeName) => {
  const now = Date.now()
  const lastSync = lastSyncTimestamps[storeName] || 0
  const cooldown = COOLDOWN_PERIODS[storeName] || COOLDOWN_PERIODS.default

  if (now - lastSync < cooldown) {
    console.log(`🛑 Prevented ${storeName} refresh - within cooldown period (${cooldown}ms)`)
    return false
  }

  // Update timestamp and allow refresh
  lastSyncTimestamps[storeName] = now
  return true
}

/**
 * Resets the cooldown for a specific store
 * This can be useful when you want to force a refresh
 * @param {string} storeName - Name of the store to reset
 */
export const resetCooldown = (storeName) => {
  if (storeName) {
    delete lastSyncTimestamps[storeName]
  } else {
    // Reset all cooldowns if no specific store is provided
    Object.keys(lastSyncTimestamps).forEach((key) => {
      delete lastSyncTimestamps[key]
    })
  }
}

/**
 * Gets the remaining cooldown time in milliseconds
 * @param {string} storeName - Name of the store
 * @returns {number} - Milliseconds remaining in cooldown, 0 if ready
 */
export const getRemainingCooldown = (storeName) => {
  const now = Date.now()
  const lastSync = lastSyncTimestamps[storeName] || 0
  const cooldown = COOLDOWN_PERIODS[storeName] || COOLDOWN_PERIODS.default

  const remaining = cooldown - (now - lastSync)
  return Math.max(0, remaining)
}
