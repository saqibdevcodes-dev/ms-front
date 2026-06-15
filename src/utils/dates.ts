/**
 * Date utility functions
 */

/**
 * Format a date to YYYY-MM-DD
 * @param date - Date to format
 * @returns Formatted date string
 */
export const formatDateYMD = (date: Date | string | number): string => {
  const d = date instanceof Date ? date : new Date(date)
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Format a date to DD/MM/YYYY
 * @param date - Date to format
 * @returns Formatted date string
 */
export const formatDateDMY = (date: Date | string | number): string => {
  const d = date instanceof Date ? date : new Date(date)
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${day}/${month}/${year}`
}

/**
 * Format a date with time
 * @param date - Date to format
 * @returns Formatted date and time string
 */
export const formatDateTime = (date: Date | string | number): string => {
  const d = date instanceof Date ? date : new Date(date)
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const hours = String(d.getHours()).padStart(2, '0')
  const minutes = String(d.getMinutes()).padStart(2, '0')
  return `${year}-${month}-${day} ${hours}:${minutes}`
}

/**
 * Calculate the difference in days between two dates
 * @param date1 - First date
 * @param date2 - Second date (defaults to current date)
 * @returns Number of days between the dates
 */
export const daysBetween = (
  date1: Date | string | number,
  date2: Date | string | number = new Date()
): number => {
  const d1 = date1 instanceof Date ? date1 : new Date(date1)
  const d2 = date2 instanceof Date ? date2 : new Date(date2)

  // Convert to UTC to avoid time zone issues
  const utc1 = Date.UTC(d1.getFullYear(), d1.getMonth(), d1.getDate())
  const utc2 = Date.UTC(d2.getFullYear(), d2.getMonth(), d2.getDate())

  // Calculate difference in milliseconds and convert to days
  return Math.floor((utc2 - utc1) / (1000 * 60 * 60 * 24))
}

/**
 * Get relative time description (e.g., "Today", "Yesterday", "3 days ago")
 * @param date - Date to describe
 * @returns Relative time description
 */
export const getRelativeTimeDescription = (date: Date | string | number): string => {
  const d = date instanceof Date ? date : new Date(date)
  const now = new Date()
  const diffDays = daysBetween(d, now)

  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 30) return `${diffDays} days ago`
  if (diffDays < 365) {
    const months = Math.floor(diffDays / 30)
    return `${months} ${months === 1 ? 'month' : 'months'} ago`
  }

  const years = Math.floor(diffDays / 365)
  return `${years} ${years === 1 ? 'year' : 'years'} ago`
}

/**
 * Add days to a date
 * @param date - The base date
 * @param days - Number of days to add
 * @returns New date with days added
 */
export const addDays = (date: Date | string | number, days: number): Date => {
  const result = date instanceof Date ? new Date(date) : new Date(date)
  result.setDate(result.getDate() + days)
  return result
}

/**
 * Extract date from report content with fallback logic
 * @param report - Report object
 * @returns Formatted date string in DD/MM/YYYY format
 */
export const getReportDate = (report: any): string => {
  try {
    // First try to get date from content
    if (report?.content) {
      let content = report.content
      if (typeof content === 'string') {
        content = JSON.parse(content)
      }

      // Direct date field
      if (content.date) {
        const date = new Date(content.date)
        if (!isNaN(date.getTime())) {
          return formatDateDMY(date)
        }
      }

      // Try selectedFieldValues for date
      if (content.selectedFieldValues) {
        const dateFields = [
          'date',
          'visit_date',
          'audit_date',
          'inspection_date',
          'dateOfVisit',
          'visitDate',
          'survey_date'
        ]
        for (const field of dateFields) {
          if (content.selectedFieldValues[field]) {
            const dateValue =
              content.selectedFieldValues[field].value || content.selectedFieldValues[field]
            if (dateValue) {
              // If already formatted, return as is
              if (typeof dateValue === 'string' && dateValue.includes('/')) {
                return dateValue
              }

              const date = new Date(dateValue)
              if (!isNaN(date.getTime())) {
                return formatDateDMY(date)
              }
            }
          }
        }
      }
    }

    // Fallback to report date or created_at
    const fallbackDate = new Date(report.date || report.created_at)
    if (!isNaN(fallbackDate.getTime())) {
      return formatDateDMY(fallbackDate)
    }
  } catch (error) {
    console.error('Error extracting date from report:', error)
  }
  return 'N/A'
}

export default {
  formatDateYMD,
  formatDateDMY,
  formatDateTime,
  daysBetween,
  getRelativeTimeDescription,
  addDays,
  getReportDate
}
