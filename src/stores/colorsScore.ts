import { defineStore } from 'pinia'
import { Ranges } from './ranges'

export const useColorsScore = defineStore('colorsScore', {
  state: () => ({
    colors: []
  }),
  actions: {
    async init() {
      Ranges().ranges_data
    },
    // Helper function to get range-based colors and text for performance
    getRangeBasedPerformance(score: number) {
      const rangesStore = Ranges().ranges_data
      let rating = 'Unknown'
      let color = '#9ca3af' // Default gray

      // Get client ranges if available
      if (rangesStore && rangesStore.length > 0) {
        // Sort ranges by start value (highest to lowest) to find the correct range
        const sortedRanges = [...rangesStore].sort((a, b) => b.start - a.start)

        // Find the first range that matches the score
        const matchingRange = sortedRanges.find((range) => {
          return score >= range.start && score <= range.end
        })

        if (matchingRange) {
          rating = matchingRange.rating
          color = matchingRange.color
        } else {
          // Fallback if no range matches
          rating = this.getSystemGeneratedRating(score)
          color = this.getSystemGeneratedColor(score)
        }
      } else {
        // System-generated fallback if no ranges available
        rating = this.getSystemGeneratedRating(score)
        color = this.getSystemGeneratedColor(score)
      }

      return { rating, color }
    },

    // System-generated fallback functions
    getSystemGeneratedRating(score: number): string {
      if (score >= 90) return 'Excellent'
      if (score >= 80) return 'Very Good'
      if (score >= 70) return 'Good'
      if (score >= 60) return 'Average'
      if (score >= 40) return 'Below Average'
      return 'Poor'
    },

    getSystemGeneratedColor(score: number): string {
      if (score >= 90) return '#22c55e' // Green
      if (score >= 80) return '#10b981' // Emerald
      if (score >= 70) return '#84cc16' // Lime
      if (score >= 60) return '#eab308' // Yellow
      if (score >= 40) return '#f97316' // Orange
      return '#ef4444' // Red
    },

    // Helper function to determine if a color is light (for text contrast)
    isLightColor(hex: string): boolean {
      // Remove the hash if present
      hex = hex.replace('#', '')

      // Convert hex to RGB
      const r = parseInt(hex.substr(0, 2), 16) / 255
      const g = parseInt(hex.substr(2, 2), 16) / 255
      const b = parseInt(hex.substr(4, 2), 16) / 255

      const max = Math.max(r, g, b)
      const min = Math.min(r, g, b)
      const l = (max + min) / 2

      return l > 0.5
    },

    // Updated performance emoji based on ranges
    getPerformanceEmoji(score: number): string {
      const { rating } = this.getRangeBasedPerformance(score)

      // Map rating text to emojis
      const emojiMap: Record<string, string> = {
        excellent: '🌟',
        'very good': '✅',
        good: '👍',
        average: '⚠️',
        'below average': '😟',
        poor: '❌'
      }

      const key = rating.toLowerCase()
      return emojiMap[key] || (score >= 80 ? '✅' : score >= 60 ? '⚠️' : '❌')
    }
  }
})
