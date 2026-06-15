import { Ranges } from '@/stores/ranges'

/**
 * Get the rating text based on the percentage score using client-defined ranges
 * If client ranges are not available, falls back to default ranges
 * 
 * @param percentage The percentage score to get the rating for
 * @returns The rating text
 */
export const getRatingText = (percentage: number | string): string => {
  // Convert percentage to number if it's a string
  let score = typeof percentage === 'string' ? 
    parseFloat(percentage.replace('%', '')) : percentage
  
  // Get client ranges
  const clientRanges = Ranges().ranges_data
  
  // If client has defined ranges, use those
  if (clientRanges && clientRanges.length > 0) {
    // Sort ranges by start value (highest to lowest)
    const sortedRanges = [...clientRanges].sort((a, b) => b.start - a.start)
    
    // Find the first range that matches the score
    for (const range of sortedRanges) {
      if (score >= range.start && score <= range.end) {
        return range.rating
      }
    }
  }
  
  // Default fallback if no client ranges match or are available
  if (score >= 90) return 'Excellent'
  if (score >= 75) return 'Good'
  if (score >= 60) return 'Average'
  if (score >= 40) return 'Below Average'
  return 'Poor'
}

/**
 * Get the color for a percentage score using client-defined ranges
 * If client ranges are not available, falls back to default colors
 * 
 * @param percentage The percentage score to get the color for
 * @returns The color value
 */
export const getRatingColor = (percentage: number | string): string => {
  // Convert percentage to number if it's a string
  let score = typeof percentage === 'string' ? 
    parseFloat(percentage.replace('%', '')) : percentage
  
  // Get client ranges
  const clientRanges = Ranges().ranges_data
  
  // If client has defined ranges, use those
  if (clientRanges && clientRanges.length > 0) {
    // Sort ranges by start value (highest to lowest)
    const sortedRanges = [...clientRanges].sort((a, b) => b.start - a.start)
    
    // Find the first range that matches the score
    for (const range of sortedRanges) {
      if (score >= range.start && score <= range.end) {
        return range.color
      }
    }
  }
  
  // Default fallback if no client ranges match or are available
  if (score >= 90) return '#22c55e' // Green
  if (score >= 75) return '#10b981' // Green
  if (score >= 60) return '#fcd34d' // Yellow
  if (score >= 40) return '#f97316' // Orange
  return '#ef4444' // Red
}

/**
 * Get CSS classes for displaying a score with background color
 * 
 * @param percentage The percentage score
 * @returns CSS class string for styling the score display
 */
export const getScoreColorClass = (percentage: number | string): string => {
  const color = getRatingColor(percentage)
  
  // Convert hex to RGB for generating lighter background
  const r = parseInt(color.substring(1, 3), 16)
  const g = parseInt(color.substring(3, 5), 16)
  const b = parseInt(color.substring(5, 7), 16)
  
  // Determine if text should be dark or light based on background color
  const brightness = (r * 299 + g * 587 + b * 114) / 1000
  const textColor = brightness > 125 ? 'text-gray-800' : 'text-white'
  
  // Use inline style with background color
  return `bg-[${color}] ${textColor}`
} 