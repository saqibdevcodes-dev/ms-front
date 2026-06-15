/**
 * Utility functions for generating media links for reports
 */

/**
 * Generate a base media URL for a report
 */
export const generateBaseMediaUrl = (report: any): string => {
  if (!report) {
    console.error('Report object is missing')
    return ''
  }

  if (!report.domain_name) {
    console.error('Missing domain_name in report', report.id)
    return ''
  }

  // Handle potential missing client_name
  const clientName = report.client_name
    ? report.client_name.trim().toLowerCase().replace(/\s+/g, '')
    : 'unknown'

  const date = new Date(report?.date)
  const year = String(date.getFullYear()) // "2025"
  const month = String(date.getMonth() + 1).padStart(2, '0') // "07" for July
  const day = String(date.getDate()).padStart(2, '0') // "01" for 1st

  // Format: domain_name/client_name/year/month
  return `https://${report.domain_name}/${clientName}/${year}/${month}`
}

/**
 * Generate video URL for a report
 */
export const generateVideoUrl = (report: any, extension = 'mp4'): string => {
  const baseUrl = generateBaseMediaUrl(report)
  const primaryValue = getPrimaryValue(report)

  return `${baseUrl}/video/${primaryValue}.${extension}`
}

/**
 * Generate timestamp URL for a report
 */
export const generateTimestampUrl = (report: any, extension = 'xlsx'): string => {
  // First get the video URL (including any specific filename formatting it might apply)
  const videoUrl = generateVideoUrl(report, 'mp4')

  // Replace directory and extension in one step
  // This directly replaces '/video/' with '/timestamps/' in the URL path
  // and changes the file extension from .mp4 to .xlsx (or whatever is specified)
  const result = videoUrl.replace(/\/video\//, '/timestamps/').replace(/\.mp4$/, `.${extension}`)

  return result
}

/**
 * Generate audio URL for a report
 */
export const generateAudioUrl = (report: any, extension = 'mp3'): string => {
  const baseUrl = generateBaseMediaUrl(report)
  const primaryValue = getPrimaryValue(report)
  return `${baseUrl}/audio/${primaryValue}.${extension}`
}

/**
 * Generate PDF URL for a report
 */
export const generatePdfUrl = (report: any, extension = 'pdf'): string => {
  const baseUrl = generateBaseMediaUrl(report)
  const primaryValue = getPrimaryValue(report)
  return `${baseUrl}/pdf/${primaryValue}.${extension}`
}

/**
 * Generate picture URLs for a report
 * @returns Array of picture URLs based on actual images in the report
 */
export const generatePictureUrls = (report: any, maxCount = 10, extension = 'jpg'): string[] => {
  const baseUrl = generateBaseMediaUrl(report)
  if (!baseUrl) return [] // Return empty array if baseUrl generation failed

  const primaryValue = getPrimaryValue(report)
  const urls: string[] = []

  // Check if the report has images data
  let actualCount = maxCount

  // If report has media_links with images_urls, use that directly
  if (report.media_links?.images_urls && Array.isArray(report.media_links.images_urls)) {
    return report.media_links.images_urls
  }

  // If report has images in its data, use the actual count
  if (report.content?.images && Array.isArray(report.content.images)) {
    actualCount = report.content.images.length
  } else if (report.images && Array.isArray(report.images)) {
    actualCount = report.images.length
  } else if (report.content?.reports) {
    // For multi-reports, try to count all images across sections
    let totalImages = 0
    for (const section of report.content.reports) {
      if (section?.items) {
        for (const item of section.items) {
          if (item?.images && Array.isArray(item.images)) {
            totalImages += item.images.length
          }
        }
      }
    }
    if (totalImages > 0) {
      actualCount = totalImages
    }
  }

  // Generate URLs for actual pictures (up to maxCount)
  for (let i = 1; i <= actualCount; i++) {
    urls.push(`${baseUrl}/pictures/${primaryValue}/${i}.${extension}`)
  }

  return urls
}

/**
 * Helper function to get primary value from report
 */
const getPrimaryValue = (report: any): string => {
  let primaryValue = 'unknown'

  if (report.content?.primaryField?.value) {
    primaryValue = report.content.primaryField.value
  } else if (report.primary_field_value) {
    primaryValue = report.primary_field_value
  }
  // Fall back to name
  else if (report.name) {
    primaryValue = report.name.replace(/[/?%*:|"<>]/g, '-')
  }
  // Use ID as the last resort
  else if (report.id) {
    primaryValue = String(report.id).substring(0, 8)
  }
  // Or _id if that's all we have
  else if (report._id) {
    primaryValue = String(report._id).substring(0, 8)
  }

  return primaryValue
}

/**
 * Extract and return all media URLs from a report
 * This function returns URLs for video, audio, images, timestamp, and PDF that can be stored in the database
 */
export const extractMediaUrls = (
  report: any
): {
  video_url: string | null
  audio_url: string | null
  images_urls: string[] | null
  timestamp_url: string | null
  pdf_url: string | null
} => {
  if (!report) return { video_url: null, audio_url: null, images_urls: null, timestamp_url: null, pdf_url: null }

  // If report already has media_links, use them directly
  if (report.media_links) {
    return {
      video_url: report.media_links.video_url || null,
      audio_url: report.media_links.audio_url || null,
      images_urls: report.media_links.images_urls || null,
      timestamp_url: report.media_links.timestamp_url || report.timestamp_url || null,
      pdf_url: report.media_links.pdf_url || null
    }
  }

  // Generate URLs if not already available

  // Get video URL
  const videoUrl = generateVideoUrl(report)

  // Get audio URL
  const audioUrl = generateAudioUrl(report)

  // Get image URLs
  const imageUrls = generatePictureUrls(report)

  // Get timestamp URL
  const timestampUrl = generateTimestampUrl(report)

  // Get PDF URL
  const pdfUrl = generatePdfUrl(report)

  return {
    video_url: videoUrl || null,
    audio_url: audioUrl || null,
    images_urls: imageUrls?.length ? imageUrls : null,
    timestamp_url: timestampUrl || null,
    pdf_url: pdfUrl || null
  }
}

/**
 * Generate media links in the format expected by the backend API
 */
export const generateMediaLinksForApi = (
  report: any
): {
  video_link: string | null
  audio_link: string | null
  image_link: string | null
  timestamp_url: string | null
  pdf_link: string | null
} => {
  const mediaUrls = extractMediaUrls(report)

  return {
    video_link: mediaUrls.video_url,
    audio_link: mediaUrls.audio_url,
    image_link: mediaUrls.images_urls?.[0] || null, // Use first image URL if available
    timestamp_url: mediaUrls.timestamp_url,
    pdf_link: mediaUrls.pdf_url
  }
}
