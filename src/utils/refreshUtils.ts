/**
 * Refresh Utilities
 * 
 * This file contains utilities for manual data refreshing.
 * It provides a centralized place to handle refresh functionality
 * without automatic refresh timers.
 */

import { ref } from 'vue'

// Define injection key strings for Vue provide/inject
export const REFRESH_TRIGGER_KEY = 'refreshTrigger'
export const REFRESH_DATA_KEY = 'refreshData'
export const TRIGGER_REFRESH_KEY = 'triggerRefresh'

/**
 * Previously returned timestamp for cache busting, now returns empty object
 * @returns Empty object
 */
export function getTimestampParam() {
  return {}
}

/**
 * Previously returned cache-busting parameter, now returns empty string
 * @returns Empty string
 */
export function getTimestampUrlParam() {
  return ''
}

// Track last refresh time to prevent excessive refreshes
// Use a more efficient data structure with a single variable instead of a let
const refreshState = {
  lastRefreshTime: 0
}

/**
 * Checks if enough time has passed since the last refresh
 * @param minInterval Minimum interval in milliseconds (default: 30000 - 30 seconds)
 * @returns Boolean indicating if a refresh is allowed
 */
export function canRefresh(minInterval = 30000) {
  const now = Date.now()
  const timeSinceLastRefresh = now - refreshState.lastRefreshTime
  return timeSinceLastRefresh > minInterval
}

/**
 * Updates the last refresh timestamp
 */
export function updateRefreshTimestamp() {
  refreshState.lastRefreshTime = Date.now()
} 