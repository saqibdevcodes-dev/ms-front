import JSZip from 'jszip'
import FileSaver from 'file-saver'
import { Toast } from '@/utils/toast'
import {Auth} from '@/stores/auth'
import {Client} from '@/stores/client'
interface MediaItem {
  url: string
  name: string
  extension: string
  section: string
  question: string
}

interface Report {
  id?: number | string
  template_name?: string
  content?: {
    reports?: Array<{
      title?: string
      questions?: Array<{
        title?: string
        images?: string[]
        videos?: string[]
        audios?: string[]
      }>
    }>
  }
  media_links?: {
    video_url?: string
    audio_url?: string
    images_urls?: string[]
    pdf_url?: string
  }
}

/**
 * Sanitizes a string to be used as a valid filename by removing special characters
 */
const sanitizeFilename = (input: string): string => {
  // Replace special characters with underscores
  return input.replace(/[^\w\s-]/g, '_').replace(/\s+/g, '_');
}

/**
 * Extracts media URLs from a report's content based on the media type
 */
const extractMediaFromReport = (report: Report, mediaType: 'images' | 'videos' | 'audios' | 'pdfs'): MediaItem[] => {
  const mediaItems: MediaItem[] = []
  console.log('Extracting media type:', mediaType, 'from report ID:', report.id)

  try {
    // Check if report has media_links first (priority)
    if (report.media_links) {
      console.log('Report has media_links property')
      const mediaUrls = mediaType === 'videos' ? 
        (report.media_links.video_url ? [report.media_links.video_url] : []) :
        mediaType === 'audios' ? 
          (report.media_links.audio_url ? [report.media_links.audio_url] : []) :
        mediaType === 'pdfs' ?
          (report.media_links.pdf_url ? [report.media_links.pdf_url] : []) :
          report.media_links.images_urls || []
      
      if (mediaUrls && mediaUrls.length > 0) {
        console.log(`Found ${mediaUrls.length} ${mediaType} in media_links`)
        
        mediaUrls.forEach((url: string, mediaIndex: number) => {
          if (!url) return
          
          try {
            const extension = getExtensionFromUrl(url) || getDefaultExtension(mediaType)
            const name = sanitizeFilename(`${report.template_name || 'Report'}_${mediaType}_${mediaIndex + 1}`)
            
            mediaItems.push({
              url,
              name,
              extension,
              section: 'Report Media',
              question: `${mediaType} ${mediaIndex + 1}`
            })
          } catch (itemError) {
            console.error(`Error processing media URL: ${url}`, itemError)
          }
        })
        
        // If we found media items in media_links, return them directly
        if (mediaItems.length > 0) {
          console.log(`Returning ${mediaItems.length} ${mediaType} from media_links`)
          return mediaItems
        }
      }
    }
    
    // Fallback to content structure if no media_links or no media found
    if (!report.content?.reports) {
      console.log('No report.content.reports structure found', report.content)
      return mediaItems
    }

    report.content.reports.forEach((section, sectionIndex) => {
      if (!section) return
      
      const sectionTitle = section.title || `Section ${sectionIndex + 1}`

      if (!section.questions) {
        return
      }

      section.questions.forEach((question, questionIndex) => {
        if (!question) return
        
        const questionTitle = question.title || `Question ${questionIndex + 1}`
        const media = question[mediaType]

        if (!media || !Array.isArray(media) || media.length === 0) {
          return
        }

        media.forEach((url, mediaIndex) => {
          if (!url) return
          
          try {
            const extension = getExtensionFromUrl(url) || getDefaultExtension(mediaType)
            const name = sanitizeFilename(`${sectionTitle}_${questionTitle}_${mediaIndex + 1}`)

            mediaItems.push({
              url,
              name,
              extension,
              section: sectionTitle,
              question: questionTitle
            })
          } catch (itemError) {
            console.error(`Error processing media URL in content: ${url}`, itemError)
          }
        })
      })
    })
    
  } catch (error) {
    console.error(`Error extracting ${mediaType} from report:`, error)
    console.error('Report structure:', JSON.stringify(report, null, 2))
  }
  
  console.log(`Found total of ${mediaItems.length} ${mediaType} items`)
  return mediaItems
}

/**
 * Retrieves the file extension from a given URL
 */
const getExtensionFromUrl = (url: string): string => {
  const match = url.match(/\.([a-zA-Z0-9]+)(?:[?#]|$)/)
  return match ? `.${match[1].toLowerCase()}` : ''
}

/**
 * Returns a default file extension based on the media type
 */
const getDefaultExtension = (mediaType: 'images' | 'videos' | 'audios' | 'pdfs'): string => {
  switch (mediaType) {
    case 'images':
      return '.jpg'
    case 'videos':
      return '.mp4'
    case 'audios':
      return '.mp3'
    case 'pdfs':
      return '.pdf'
    default:
      return ''
  }
}

/**
 * Generates a sanitized filename for the report based on its template name or ID
 */
const generateFilename = (report: Report, mediaType: string): string => {
  const now = new Date()
  const dateStr = `${now.getFullYear()}-${(now.getMonth() + 1)
    .toString()
    .padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}`

  let reportName = 'report'
  if (report.template_name) {
    reportName = sanitizeFilename(report.template_name)
  } else if (report.id) {
    reportName = `Report_${report.id}`
  }

  return `${reportName}_${mediaType}_${dateStr}.zip`
}

/**
 * Fetches a media file as a blob from a given URL
 */
const fetchMediaAsBlob = async (url: string): Promise<Blob> => {
  try {
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`Failed to download media (HTTP ${response.status})`)
    }
    return await response.blob()
  } catch (error) {
    console.error(`Error fetching ${url}:`, error)
    throw error instanceof Error ? error : new Error('Unknown error during fetch')
  }
}

/**
 * Exports media from a single report, either downloading directly or creating a zip file
 */
const exportMediaFromSingleReport = async (report: Report, mediaType: 'images' | 'videos' | 'audios' | 'pdfs'): Promise<void> => {
  try {
    console.log(`Exporting ${mediaType} from report:`, report.id)
    const mediaItems = extractMediaFromReport(report, mediaType)

    if (mediaItems.length === 0) {
      Toast.info(`No ${mediaType} found in this report.`)
      return
    }

    if (mediaItems.length === 1) {
      // If only one media item, download it directly
      const media = mediaItems[0]
      try {
        const blob = await fetchMediaAsBlob(media.url)
        FileSaver.saveAs(blob, `${media.name}${media.extension}`)
        Toast.success(`${mediaType.slice(0, -1)} downloaded successfully.`)
      } catch (error) {
        console.error(`Error downloading media:`, error)
        Toast.error(`Failed to download ${mediaType.slice(0, -1)}: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
      return
    }

    // For multiple media items, create a zip file
    const zip = new JSZip()
    const zipFilename = generateFilename(report, mediaType)
    let successfulExports = 0

    // Add a README file with report information
    let readme = `# ${report.template_name || `Report_${report.id || ''}`} - ${mediaType.toUpperCase()}\n\n`
    readme += `Date: ${new Date().toLocaleDateString()}\n`
    readme += `Total ${mediaType}: ${mediaItems.length}\n\n`
    readme += `## Media Files\n\n`

    // Add each media file to the zip
    for (let i = 0; i < mediaItems.length; i++) {
      const media = mediaItems[i]
      const filename = `${media.name}${media.extension}`

      try {
        const blob = await fetchMediaAsBlob(media.url)
        zip.file(filename, blob)
        successfulExports++

        // Add media info to readme
        readme += `### ${i + 1}. ${media.name}\n`
        readme += `- Section: ${media.section}\n`
        readme += `- Question: ${media.question}\n`
        readme += `- Filename: ${filename}\n\n`
      } catch (error) {
        console.error(`Failed to add ${filename} to zip:`, error)
        readme += `### ${i + 1}. ${media.name} (FAILED TO DOWNLOAD)\n`
        readme += `- Section: ${media.section}\n`
        readme += `- Question: ${media.question}\n`
        readme += `- URL: ${media.url}\n`
        readme += `- Error: ${error instanceof Error ? error.message : 'Unknown error'}\n\n`
      }
    }

    // Add the readme file to the zip
    zip.file('README.md', readme)

    // Generate and save the zip file
    const zipBlob = await zip.generateAsync({ type: 'blob' })
    FileSaver.saveAs(zipBlob, zipFilename)

    Toast.success(`${mediaType} exported successfully as ${zipFilename}`)
  } catch (error) {
    console.error(`Error exporting ${mediaType} from report:`, error)
    Toast.error(`Failed to export ${mediaType}: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Exports media from multiple reports, creating a zip file containing all media
 */
const exportMediaFromMultipleReports = async (reports: Report[], mediaType: 'images' | 'videos' | 'audios' | 'pdfs'): Promise<void> => {
  try {
    if (!reports || reports.length === 0) {
      Toast.error('No reports selected for export.')
      return
    }

    // Create a zip file for all reports
    const zip = new JSZip()
    const now = new Date()
    const dateStr = `${now.getFullYear()}-${(now.getMonth() + 1)
      .toString()
      .padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}`
    console.log('Auth().user.name', Auth().user)
    console.log('Client().selected_client', Client().selected_client)
    const zipFilename = `${Client().selected_client.first_name}_${mediaType}_${dateStr}.zip`

    let totalMediaCount = 0
    let successfulExports = 0

    // Process each report
    for (let i = 0; i < reports.length; i++) {
      const report = reports[i]
      const mediaItems = extractMediaFromReport(report, mediaType)

      if (mediaItems.length === 0) {
        continue
      }

      totalMediaCount += mediaItems.length

      // Create a folder for this report
      const reportName = sanitizeFilename(report.template_name || `Report_${report.id || i + 1}`)
      const reportFolder = zip.folder(reportName)

      if (!reportFolder) {
        console.error(`Failed to create folder for report ${reportName}`)
        continue
      }

      // Add a README file with report information
      let readme = `# ${reportName} - ${mediaType.toUpperCase()}\n\n`
      readme += `Date: ${new Date().toLocaleDateString()}\n`
      readme += `Total ${mediaType}: ${mediaItems.length}\n\n`
      readme += `## Media Files\n\n`

      // Add each media file to the report folder
      for (let j = 0; j < mediaItems.length; j++) {
        const media = mediaItems[j]
        const filename = `${media.name}${media.extension}`

        try {
          const blob = await fetchMediaAsBlob(media.url)
          reportFolder.file(filename, blob)
          successfulExports++

          // Add media info to readme
          readme += `### ${j + 1}. ${media.name}\n`
          readme += `- Section: ${media.section}\n`
          readme += `- Question: ${media.question}\n`
          readme += `- Filename: ${filename}\n\n`
        } catch (error) {
          console.error(`Failed to add ${filename} to zip:`, error)
          readme += `### ${j + 1}. ${media.name} (FAILED TO DOWNLOAD)\n`
          readme += `- Section: ${media.section}\n`
          readme += `- Question: ${media.question}\n`
          readme += `- URL: ${media.url}\n`
          readme += `- Error: ${error instanceof Error ? error.message : 'Unknown error'}\n\n`
        }
      }

      // Add the readme file to the report folder
      reportFolder.file('README.md', readme)
    }

    if (totalMediaCount === 0) {
      Toast.info(`No ${mediaType} found in the selected reports.`)
      return
    }

    // Add a main README file with summary
    let mainReadme = `# ${mediaType.toUpperCase()} Export Summary\n\n`
    mainReadme += `Date: ${new Date().toLocaleDateString()}\n`
    mainReadme += `Reports processed: ${reports.length}\n`
    mainReadme += `Total ${mediaType} found: ${totalMediaCount}\n`
    mainReadme += `Successfully exported: ${successfulExports}\n\n`
    mainReadme += `## Reports\n\n`

    reports.forEach((report, index) => {
      const reportName = sanitizeFilename(report.template_name || `Report_${report.id || index + 1}`)
      const mediaCount = extractMediaFromReport(report, mediaType).length
      mainReadme += `- ${reportName}: ${mediaCount} ${mediaType}\n`
    })

    zip.file('README.md', mainReadme)

    // Generate and save the zip file
    const zipBlob = await zip.generateAsync({ type: 'blob' })
    FileSaver.saveAs(zipBlob, zipFilename)

    Toast.success(`${mediaType} exported successfully as ${zipFilename}`)
  } catch (error) {
    console.error(`Error exporting ${mediaType} from multiple reports:`, error)
    Toast.error(`Failed to export ${mediaType}: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

export default {
  exportImages: (report: Report) => exportMediaFromSingleReport(report, 'images'),
  exportVideos: (report: Report) => exportMediaFromSingleReport(report, 'videos'),
  exportAudios: (report: Report) => exportMediaFromSingleReport(report, 'audios'),
  exportPdfs: (report: Report) => exportMediaFromSingleReport(report, 'pdfs'),
  exportMultipleImages: (reports: Report[]) => exportMediaFromMultipleReports(reports, 'images'),
  exportMultipleVideos: (reports: Report[]) => exportMediaFromMultipleReports(reports, 'videos'),
  exportMultipleAudios: (reports: Report[]) => exportMediaFromMultipleReports(reports, 'audios'),
  exportMultiplePdfs: (reports: Report[]) => exportMediaFromMultipleReports(reports, 'pdfs')
} 