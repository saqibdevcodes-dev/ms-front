import { defineStore } from 'pinia'
import ExcelJS from 'exceljs'
import { Ranges } from '@/stores/ranges'
import { Client } from '@/stores/client'
import { finalizeSectionTotals, formatScoreForExport, naScoreToNumber } from '@/utils/naScore'

// Utility function to convert hex color to ARGB format for Excel
const hexToARGB = (hex: string): string => {
  // Handle undefined, null, or empty values
  if (!hex || hex === 'undefined') {
    return 'FF000000' // Default to black if no color provided
  }

  // Remove # if it exists
  hex = hex.replace(/^#/, '')

  // Expand shorthand form (e.g. "03F") to full form (e.g. "0033FF")
  if (hex.length === 3) {
    hex = hex
      .split('')
      .map(function (x) {
        return x + x
      })
      .join('')
  }

  // Add alpha channel (FF for fully opaque) and convert to ARGB
  return 'FF' + hex
}

// Get score styling based on client ranges
const getReportScoreStyle = async (score: number | string, report: any) => {
  // Default colors if no ranges are found
  let fillColor = 'EF4444' // Default red (Red-500)
  let textColor = 'FFFFFF' // White

  if (typeof score === 'string') {
    score = parseInt(score.replace('%', ''))
  }

  try {
    // Get the client ID from the current client or from the report
    const selectedClient = Client().selected_client
    const clientId = selectedClient?.uuid || selectedClient?.id

    if (clientId) {
      // Ensure ranges store is initialized
      const rangesStore = Ranges()
      if (!rangesStore.xios || !rangesStore.xios.get) {
        await rangesStore.init()
      }

      // Fetch the client's ranges if not already loaded
      if (!rangesStore.ranges_data || rangesStore.ranges_data.length === 0) {
        await rangesStore.fetch({ forceRefresh: true })
      }

      // Find the appropriate range for this score
      const clientRanges = rangesStore.ranges_data
      if (clientRanges && clientRanges.length > 0) {
        // Sort ranges by start value (ascending) to find the correct range
        const sortedRanges = [...clientRanges].sort((a, b) => Number(a.start) - Number(b.start))

        // Find the range that contains this score
        const matchingRange = sortedRanges.find((range) => {
          const start = Number(range.start)
          const end = Number(range.end)
          return score >= start && score <= end
        })

        if (matchingRange && matchingRange.color) {
          fillColor = matchingRange.color.replace('#', '')
          // Use white text for darker colors, dark text for lighter colors
          textColor = isLightColor(matchingRange.color) ? '000000' : 'FFFFFF'

          console.log(
            `Applied range color for score ${score}%: ${matchingRange.rating} (${matchingRange.color})`
          )
        } else {
          console.log(`No matching range found for score ${score}%, using fallback colors`)
          // Use fallback colors based on score
          if (score >= 90) {
            fillColor = '10B981' // Green-500 (Excellent)
            textColor = 'FFFFFF'
          } else if (score >= 75) {
            fillColor = '22C55E' // Green-400 (Good)
            textColor = 'FFFFFF'
          } else if (score >= 60) {
            fillColor = 'FCD34D' // Yellow-300 (Average)
            textColor = '000000'
          } else if (score >= 40) {
            fillColor = 'F97316' // Orange-500 (Below Average)
            textColor = 'FFFFFF'
          }
        }
      } else {
        console.log('No client ranges found, using default colors')
        // Use default color scheme if no ranges
        if (score >= 90) {
          fillColor = '10B981' // Green-500 (Excellent)
          textColor = 'FFFFFF'
        } else if (score >= 75) {
          fillColor = '22C55E' // Green-400 (Good)
          textColor = 'FFFFFF'
        } else if (score >= 60) {
          fillColor = 'FCD34D' // Yellow-300 (Average)
          textColor = '000000'
        } else if (score >= 40) {
          fillColor = 'F97316' // Orange-500 (Below Average)
          textColor = 'FFFFFF'
        }
      }
    } else {
      console.log('No client ID found, using default colors')
      // Use default color scheme if no client
      if (score >= 90) {
        fillColor = '10B981' // Green-500 (Excellent)
        textColor = 'FFFFFF'
      } else if (score >= 75) {
        fillColor = '22C55E' // Green-400 (Good)
        textColor = 'FFFFFF'
      } else if (score >= 60) {
        fillColor = 'FCD34D' // Yellow-300 (Average)
        textColor = '000000'
      } else if (score >= 40) {
        fillColor = 'F97316' // Orange-500 (Below Average)
        textColor = 'FFFFFF'
      }
    }
  } catch (error) {
    console.error('Error fetching client ranges for Excel export:', error)
    // Use default color scheme on error
    if (score >= 90) {
      fillColor = '10B981' // Green-500 (Excellent)
      textColor = 'FFFFFF'
    } else if (score >= 75) {
      fillColor = '22C55E' // Green-400 (Good)
      textColor = 'FFFFFF'
    } else if (score >= 60) {
      fillColor = 'FCD34D' // Yellow-300 (Average)
      textColor = '000000'
    } else if (score >= 40) {
      fillColor = 'F97316' // Orange-500 (Below Average)
      textColor = 'FFFFFF'
    }
  }

  return {
    font: { bold: true, color: { argb: textColor } },
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: fillColor } },
    border: {
      top: { style: 'thin', color: { argb: 'BFDBFE' } },
      left: { style: 'thin', color: { argb: 'BFDBFE' } },
      bottom: { style: 'thin', color: { argb: 'BFDBFE' } },
      right: { style: 'thin', color: { argb: 'BFDBFE' } }
    },
    alignment: { horizontal: 'center' }
  }
}

// Helper function to determine if a color is light or dark
const isLightColor = (color: string): boolean => {
  // Remove # if present
  const hex = color.replace('#', '')

  // Convert to RGB
  const r = parseInt(hex.substr(0, 2), 16)
  const g = parseInt(hex.substr(2, 2), 16)
  const b = parseInt(hex.substr(4, 2), 16)

  // Calculate luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255

  // Return true if light (luminance > 0.5)
  return luminance > 0.5
}

// Define store
export const ExcelExport = defineStore('excelExport', () => {
  // Helper function to get rating text based on percentage
  const getRatingText = (percentage: number | string): string => {
    if (typeof percentage === 'string') {
      percentage = parseInt(percentage.replace('%', ''))
    }

    if (percentage >= 90) return 'Excellent'
    if (percentage >= 75) return 'Good'
    if (percentage >= 60) return 'Average'
    if (percentage >= 40) return 'Below Average'
    return 'Poor'
  }

  // Interface for report sections to match the structure used in other files
  interface ReportSection {
    heading: string
    weightage: string
    total_score: number
    total_applicable_score: number
    total_achieved_score: number
    achieved: string
    data?: ReportQuestion[]
  }

  interface ReportQuestion {
    question: string
    sub_question?: string
    response?: string
    total_score: number
    applicable_score: number
    achieved_score: number
    comments?: string
  }

  // Function to check if a specific section has fatal error conditions
  const checkSectionFatalError = (section: ReportSection): boolean => {
    const sectionName = section.heading?.toLowerCase() || ''
    const hasFatalErrorInName = sectionName.includes('fatal error')

    if (!hasFatalErrorInName) return false

    // Check if any question in this section has a "yes" response
    return (
      section.data?.some((question: ReportQuestion) => {
        const response = question.response?.toLowerCase() || ''
        return response === 'yes'
      }) || false
    )
  }

  // Function to check for fatal error conditions (any section with fatal error and yes response)
  const checkFatalError = (reportData: any): boolean => {
    try {
      const content =
        typeof reportData?.content === 'string'
          ? JSON.parse(reportData.content)
          : reportData?.content

      if (!content?.reports) return false

      // Check if there's any section with "Fatal Error" in the name
      // that has at least one question with "yes" response
      return content.reports.some((section: ReportSection) => checkSectionFatalError(section))
    } catch (error) {
      console.error('Error checking fatal error conditions in Excel export:', error)
      return false
    }
  }

  // Function to check if a section is a fatal error section (has fatal error in name)
  const isFatalErrorSection = (section: ReportSection): boolean => {
    const sectionName = section.heading?.toLowerCase() || ''
    return sectionName.includes('fatal error')
  }

  const generateExcelBufferFromReport = async (report: any) => {
    try {
      report.content.reports.forEach((section: any) => {
        finalizeSectionTotals(section, Client().selected_client)
      })
      console.log('report.content.reports', report.content.reports)
      console.log('Exporting single report:', report)

      // Check if this is a Meezan Bank client
      const isMeezanBank = Client().selected_client?.name?.toLowerCase().includes('meezan') || false
      console.log('Is Meezan Bank client:', isMeezanBank)

      // Create a new workbook
      const workbook = new ExcelJS.Workbook()
      const worksheet = workbook.addWorksheet('Mystery Shopping Report')

      // Get report theme colors when available, checking both possible locations
      const reportColors = report.colors || report.content?.colors || {}
      console.log('reportColors', reportColors)
      console.log('titleBg', reportColors.titleBg)
      console.log('summaryBg', reportColors.summaryBg)
      console.log('headerBg', reportColors.headerBg)
      console.log('kpiBg', reportColors.kpiBg)
      console.log('ratingBg', reportColors.ratingBg)
      console.log('scoreFontColor', reportColors.scoreFontColor)
      console.log('bgLight', reportColors.bgLight)
      console.log('bgUltraLight', reportColors.bgUltraLight)

      // Add logo if available using cell-based positioning
      if (report.colors?.logo) {
        try {
          // Create logo row and merge cells A1:D3 for logo space
          const logoRow1 = worksheet.addRow([''])
          const logoRow2 = worksheet.addRow([''])
          const logoRow3 = worksheet.addRow([''])
          const logoRow4 = worksheet.addRow([''])
          const logoRow5 = worksheet.addRow([''])

          // Set logo row heights
          logoRow1.height = 20
          logoRow2.height = 20
          logoRow3.height = 20
          logoRow4.height = 20
          logoRow5.height = 20

          // Merge cells for logo placement
          worksheet.mergeCells(`A${logoRow1.number}:F${logoRow5.number}`)

          // Add the logo to the workbook
          const logoId = workbook.addImage({
            base64: report.colors.logo,
            extension: 'png'
          })

          // Place image in the merged cell range with centering
          worksheet.addImage(logoId, {
            tl: { col: 1.8, row: logoRow1.number - 1 }, // fractional col
            ext: { width: 200, height: 100 }, // image size in pixels
            editAs: 'absolute'
          })

          // Add spacing after logo
          worksheet.addRow([''])
        } catch (error) {
          console.error('Failed to add logo to Excel:', error)
        }
      }

      // Check for additional custom fields in the report and add them
      const addedFields = new Set()

      // Extract colors with fallbacks, mimicking the structure from add.vue
      const colorValues = {
        titleBg: reportColors.titleBg || reportColors.primary || '#2563EB',
        summaryBg: reportColors.summaryBg || reportColors.secondary || '#3B82F6',
        headerBg: reportColors.headerBg || reportColors.secondary || '#3B82F6',
        kpiBg: reportColors.kpiBg || reportColors.bgLight || '#DBEAFE',
        ratingBg: reportColors.ratingBg || '#4F6228',
        scoreFontColor: reportColors.scoreFontColor || '#0000FF',
        bgLight: reportColors.bgLight || '#DBEAFE',
        bgUltraLight: reportColors.bgUltraLight || '#EFF6FF'
      }

      // Define reusable styles with colors matching the report's own theme
      const titleStyle = {
        font: { bold: true, size: 16, color: { argb: 'FFFFFF' } },
        alignment: { horizontal: 'center', vertical: 'middle' },
        fill: {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: hexToARGB(colorValues.titleBg) }
        },
        border: {
          top: { style: 'thin', color: { argb: '000000' } },
          left: { style: 'thin', color: { argb: '000000' } },
          bottom: { style: 'thin', color: { argb: '000000' } },
          right: { style: 'thin', color: { argb: '000000' } }
        }
      }

      const headerStyle = {
        font: { bold: true, color: { argb: 'FFFFFF' } },
        fill: {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: hexToARGB(colorValues.headerBg) }
        },
        alignment: { horizontal: 'center', vertical: 'middle' },
        border: {
          top: { style: 'thin', color: { argb: '000000' } },
          left: { style: 'thin', color: { argb: '000000' } },
          bottom: { style: 'thin', color: { argb: '000000' } },
          right: { style: 'thin', color: { argb: '000000' } }
        }
      }

      const sectionStyle = {
        font: { bold: true, color: { argb: '000000' } },
        fill: {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: hexToARGB(colorValues.summaryBg) }
        },
        alignment: { horizontal: 'center' },
        border: {
          top: { style: 'thin', color: { argb: '000000' } },
          left: { style: 'thin', color: { argb: '000000' } },
          bottom: { style: 'thin', color: { argb: '000000' } },
          right: { style: 'thin', color: { argb: '000000' } }
        }
      }

      const overallStyle = {
        font: { bold: true },
        fill: {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: hexToARGB(colorValues.headerBg) }
        },
        border: {
          top: { style: 'thin', color: { argb: '000000' } },
          left: { style: 'thin', color: { argb: '000000' } },
          bottom: { style: 'thin', color: { argb: '000000' } },
          right: { style: 'thin', color: { argb: '000000' } }
        }
      }

      const cellStyle = {
        border: {
          top: { style: 'thin', color: { argb: '000000' } },
          left: { style: 'thin', color: { argb: '000000' } },
          bottom: { style: 'thin', color: { argb: '000000' } },
          right: { style: 'thin', color: { argb: '000000' } }
        }
      }

      const infoLabelStyle = {
        font: { bold: true, color: { argb: hexToARGB(colorValues.scoreFontColor).substring(2) } },
        fill: {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: hexToARGB(colorValues.bgUltraLight) }
        },
        border: {
          top: { style: 'thin', color: { argb: '000000' } },
          left: { style: 'thin', color: { argb: '000000' } },
          bottom: { style: 'thin', color: { argb: '000000' } },
          right: { style: 'thin', color: { argb: '000000' } }
        }
      }

      // Generate a safe sheet name
      let sheetName = 'Report'

      // Try to get a meaningful name
      if (report.content.primaryField.value) {
        console.log('reports_name', report.content.primaryField.value)
        sheetName = report.content.primaryField.value.substring(0, 30).replace(/[/.*?[\]]/g, '')
      } else if (report.primary_field?.value) {
        sheetName = `${report.primary_field.value}`.substring(0, 30).replace(/[/.*?[\]]/g, '')
      } else if (report.id) {
        sheetName = `Report-${String(report.id).substring(0, 8)}`
      } else if (report._id) {
        sheetName = `Report-${String(report._id).substring(0, 8)}`
      } else if (report.uuid) {
        sheetName = `Report-${String(report.uuid).substring(0, 8)}`
      } else {
        sheetName = `Report-${Math.random().toString(36).substring(2, 10)}`
      }

      // Set default row height and column widths
      worksheet.properties.defaultRowHeight = 20
      worksheet.getColumn('A').width = 5
      worksheet.getColumn('B').width = 20
      worksheet.getColumn('C').width = 20
      worksheet.getColumn('D').width = 15
      worksheet.getColumn('E').width = 15
      worksheet.getColumn('F').width = 15
      worksheet.getColumn('G').width = 15
      worksheet.getColumn('H').width = 15

      // Add title
      const titleRow = worksheet.addRow(['Mystery Shopping Assessment'])
      worksheet.mergeCells(`A${titleRow.number}:F${titleRow.number}`)
      titleRow.eachCell((cell: any) => {
        Object.assign(cell, titleStyle)
      })

      // Add empty row
      worksheet.addRow([''])

      // Helper function to add info rows with proper styling
      const addInfoRow = (label: string, value: string) => {
        const row = worksheet.addRow([label, value, '', '', '', '', '', ''])

        // Style the label cell (column A)
        const labelCell = row.getCell(1)
        labelCell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        }

        // Style the value cell (column B)
        const valueCell = row.getCell(2)
        valueCell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        }

        return row
      }

      // Check for fatal error conditions first
      const hasFatalErrorCondition = checkFatalError(report)
      let overallPerformancePercentage = 0

      if (hasFatalErrorCondition) {
        // If fatal error condition exists, set overall performance to 0
        overallPerformancePercentage = 0
        console.log('Fatal error detected in Excel export - setting overall performance to 0%')
      } else if (report.content && report.content.reports) {
        let totalApplicable = 0
        let totalAchieved = 0

        // Use the pre-calculated scores that are already saved with the report
        report.content.reports.forEach((section: any) => {
          // Use the saved scores directly - don't recalculate
          const sectionApplicable = naScoreToNumber(section.total_applicable_score)
          const sectionAchieved = naScoreToNumber(section.total_achieved_score)

          console.log(
            `Overall calc - Section: ${section.heading}, Applicable: ${sectionApplicable}, Achieved: ${sectionAchieved}`
          )

          totalApplicable += sectionApplicable
          totalAchieved += sectionAchieved
        })

        console.log(
          `Overall totals - Total Applicable: ${totalApplicable}, Total Achieved: ${totalAchieved}`
        )

        overallPerformancePercentage =
          totalApplicable > 0 ? Math.round((totalAchieved / totalApplicable) * 100) : 0

        console.log(`Overall Performance Percentage: ${overallPerformancePercentage}`)

        // Ensure we have a valid number
        if (isNaN(overallPerformancePercentage)) {
          console.log(`Overall percentage is NaN, setting to 0`)
          overallPerformancePercentage = 0
        }
      }

      // Store the start row for total score box - we'll update this after adding custom fields
      let totalScoreStartRow: number | undefined

      // 1. Add fields from customFields first
      let lastCustomFieldRow: any = null
      if (Array.isArray(report.content?.customFields)) {
        report.content.customFields.forEach((field: any, index: number) => {
          const key = field.headerField || field.label
          if (!key || addedFields.has(key)) return

          let value = field.value || 'N/A'
          if (report.content.selectedFieldValues?.[key]) {
            value =
              report.content.selectedFieldValues[key].name ||
              report.content.selectedFieldValues[key].value ||
              'N/A'
          }

          const row = addInfoRow(field.label || key, value)
          if (index === 0) {
            totalScoreStartRow = row.number // Set the start row for the first custom field
          }
          lastCustomFieldRow = row
          addedFields.add(key)
        })
      }

      // 2. Add remaining fields from selectedFieldValues not in customFields
      if (
        report.content?.selectedFieldValues &&
        typeof report.content.selectedFieldValues === 'object'
      ) {
        Object.entries(report.content.selectedFieldValues).forEach(([key, val]: [string, any]) => {
          if (addedFields.has(key)) return

          const label = key.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())
          const value = val?.name || val?.value || 'N/A'

          const row = addInfoRow(label, value)
          if (!totalScoreStartRow) {
            totalScoreStartRow = row.number // Set the start row if no custom fields were added
          }
          lastCustomFieldRow = row
          addedFields.add(key)
        })
      }

      // 3. Add address if not already added
      if (!addedFields.has('address') && report.content.selectedFieldValues?.address) {
        const address =
          report.content.selectedFieldValues.address.name ||
          report.content.selectedFieldValues.address.value ||
          'N/A'
        const row = addInfoRow('Address', address)
        if (!totalScoreStartRow) {
          totalScoreStartRow = row.number
        }
        lastCustomFieldRow = row
        addedFields.add('address')
      }

      // 4. Now add Created Date and Time after all custom fields
      const createdDate = report.created_at
        ? new Date(report.content.date).toLocaleDateString()
        : 'N/A'
      const createdDateRow = addInfoRow('Date of Visit', createdDate)
      if (!totalScoreStartRow) {
        totalScoreStartRow = createdDateRow.number
      }
      if (!lastCustomFieldRow) {
        lastCustomFieldRow = createdDateRow
      }

      // Ensure correct parsing and 12-hour time format
      const timeRaw = report.content?.time || report.created_at
      let timeValue = 'N/A'

      if (timeRaw) {
        const fakeDate = new Date(`1970-01-01T${timeRaw}:00`)
        if (!isNaN(fakeDate.getTime())) {
          timeValue = fakeDate.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
          })
        }
      }

      const timeRow = addInfoRow('Time of Visit', timeValue)
      lastCustomFieldRow = timeRow

      const finalTotalScoreStartRow = totalScoreStartRow || createdDateRow.number

      worksheet.mergeCells(`D${finalTotalScoreStartRow}:F${finalTotalScoreStartRow}`)
      const totalScoreCell = worksheet.getRow(finalTotalScoreStartRow).getCell(4)
      totalScoreCell.value = 'Total Score'
      totalScoreCell.font = { bold: true, size: 20, color: { argb: 'FFFFFF' } }
      totalScoreCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: hexToARGB(colorValues.titleBg) }
      }
      totalScoreCell.alignment = { horizontal: 'center', vertical: 'middle' }
      totalScoreCell.border = {
        top: { style: 'thick' },
        left: { style: 'thick' },
        bottom: { style: 'thick' },
        right: { style: 'thick' }
      }

      // Add empty row
      worksheet.addRow([''])

      // Add the large percentage score spanning from the second field row to the last field row
      const secondFieldRow = finalTotalScoreStartRow + 1
      worksheet.mergeCells(`D${secondFieldRow}:F${lastCustomFieldRow.number}`)
      const scoreCell = worksheet.getRow(secondFieldRow).getCell(4)

      if (hasFatalErrorCondition) {
        scoreCell.value = '0%'
        scoreCell.font = {
          bold: true,
          size: 36,
          color: { argb: 'FFFFFF' }
        }
        // Set red background for fatal error
        scoreCell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFDC2626' } // Red color
        }
      } else {
        scoreCell.value = `${overallPerformancePercentage}%`
        scoreCell.font = {
          bold: true,
          size: 50,
          color: { argb: hexToARGB(colorValues.scoreFontColor) }
        }
        scoreCell.fill = undefined // Remove any background
      }

      scoreCell.alignment = { horizontal: 'center', vertical: 'middle' }
      scoreCell.border = {
        top: { style: 'thick' },
        left: { style: 'thick' },
        bottom: { style: 'thick' },
        right: { style: 'thick' }
      }

      // If report has content data, add sections and details
      if (report.content && report.content.reports) {
        // Ensure all-N/A sections show N/A totals (including reports saved before this logic)
        report.content.reports.forEach((section: any) => {
          finalizeSectionTotals(section, Client().selected_client)
        })

        // Add summary section
        const summaryRow = worksheet.addRow(['Score Summary'])
        worksheet.mergeCells(`A${summaryRow.number}:F${summaryRow.number}`)
        summaryRow.eachCell((cell: any) => {
          Object.assign(cell, sectionStyle)
        })

        // Add headers for summary
        const headerRow = worksheet.addRow(['Section', '', 'Total', 'Applicable', 'Achieved', '%'])
        headerRow.eachCell((cell: any) => {
          Object.assign(cell, headerStyle)
          // Apply center alignment for score columns
          if ([2, 3, 4, 5, 6].includes(cell._column._number)) {
            cell.alignment = { horizontal: 'center', vertical: 'middle' }
          }
        })

        // Add section data
        let overallApplicable = 0
        let overallAchieved = 0
        let overallTotalScore = 0

        // Separate sections into non-fatal and fatal
        const nonFatalSections = report.content.reports.filter((s: any) => !isFatalErrorSection(s))
        const fatalSections = report.content.reports.filter((s: any) => isFatalErrorSection(s))

        // First, add all NON-FATAL sections
        for (const section of nonFatalSections) {
          // Use the pre-calculated section scores that are already saved with the report
          // Don't recalculate - use the saved values directly

          // Use the saved section percentage (achieved field) or calculate from saved scores

          // Debug logging to understand the data structure
          console.log(`Section: ${section.heading || section.title}`, {
            achieved: section.achieved,
            total_applicable_score: section.total_applicable_score,
            total_achieved_score: section.total_achieved_score,
            total_score: section.total_score
          })

          // First try to use the saved achieved percentage
          // Check if this is a fatal error section
          const isFatalSection = isFatalErrorSection(section)
          const hasFatalErrorCondition = checkSectionFatalError(section)

          // Calculate section scores from individual questions if not present in section data
          let sectionPercentage: number | string = 0

          // Preserve N/A values
          if (
            typeof section.achieved === 'string' &&
            section.achieved.toUpperCase().includes('N/A')
          ) {
            sectionPercentage = formatScoreForExport(section.achieved)
          } else if (
            section.achieved !== undefined &&
            section.achieved !== null &&
            !isNaN(Number(String(section.achieved).replace('%', '')))
          ) {
            sectionPercentage = Number(String(section.achieved).replace('%', ''))
          } else {
            // Calculate from saved scores with proper validation
            const applicableScore = naScoreToNumber(section.total_applicable_score)
            const achievedScore = naScoreToNumber(section.total_achieved_score)

            console.log(
              `Calculating from scores - Applicable: ${applicableScore}, Achieved: ${achievedScore}`
            )

            if (applicableScore > 0) {
              sectionPercentage = Math.round((achievedScore / applicableScore) * 100)
            } else {
              sectionPercentage = 0
            }
            console.log(
              `Calculated percentage: ${
                typeof sectionPercentage === 'string' ? sectionPercentage : `${sectionPercentage}%`
              }`
            )
            // Calculate from questions if available
            let sectionTotalScore = 0
            let sectionApplicableScore = 0
            let sectionAchievedScore = 0

            if (section.data && Array.isArray(section.data)) {
              section.data.forEach((item: any, index: any) => {
                const totalScore = Number(item.total_score || 0)
                const rawApplicable =
                  item.applicable_score !== null && item.applicable_score !== undefined
                    ? item.applicable_score
                    : item.total_score || 0
                const applicableScoreNum = naScoreToNumber(rawApplicable)
                const achievedScoreNum = naScoreToNumber(item.achieved_score)

                sectionTotalScore += totalScore

                // Handle question-wise scoring for fatal error sections
                if (isFatalSection) {
                  // For fatal error sections, applicable score is always the total score
                  sectionApplicableScore += totalScore

                  // Check if this fatal error section has "yes" or "no" response
                  if (hasFatalErrorCondition) {
                    // Fatal error with "yes" response - achieved score is 0 for all questions
                    sectionAchievedScore += 0
                  } else {
                    // Fatal error with "no" response - achieved score is full score for all questions
                    sectionAchievedScore += totalScore
                  }
                } else {
                  // Normal calculation for non-fatal sections
                  sectionApplicableScore += applicableScoreNum
                  sectionAchievedScore += achievedScoreNum
                }
              })
            }

            // Handle fatal error section scoring
            if (isFatalSection) {
              // Fatal error section - applicable score always shows total score
              section.total_score = sectionTotalScore
              section.total_applicable_score = sectionTotalScore // Show total score as applicable

              // For fatal error sections, calculate achieved score normally from question responses
              // Don't override it to 0 or total - let it be calculated naturally
              section.total_achieved_score = sectionAchievedScore
            } else {
              // Normal calculation for non-fatal sections
              section.total_applicable_score = sectionApplicableScore
              section.total_achieved_score = sectionAchievedScore
              section.total_score = sectionTotalScore
            }
          }

          finalizeSectionTotals(section, Client().selected_client)

          // Additional check for fatal sections with pre-calculated scores
          if (
            isFatalSection &&
            section.achieved !== undefined &&
            section.achieved !== null &&
            !isNaN(Number(section.achieved))
          ) {
            // If section already has calculated scores but is a fatal error section:
            // - Applicable score always shows total score
            const originalTotalScore = Number(section.total_score) || 0
            section.total_applicable_score = originalTotalScore

            // For fatal error sections, keep the existing achieved score calculation
            // Don't override it - let it be calculated naturally from question responses
            // Keep original total_score
          }

          // Ensure we have a valid number
          if (typeof sectionPercentage === 'number' && isNaN(sectionPercentage)) {
            sectionPercentage = 0
          }
          const sectionRow = worksheet.addRow([
            isFatalSection && hasFatalErrorCondition
              ? `${section.heading || section.title || 'Section'} ⚠️ FATAL ERROR`
              : `${section.heading || section.title || 'Section'}`,
            '',
            section.total_score || 0,
            formatScoreForExport(section.total_applicable_score),
            formatScoreForExport(section.total_achieved_score),
            typeof sectionPercentage === 'string' ? sectionPercentage : `${sectionPercentage}%`
          ])

          // Apply styles to each cell
          const stylePromises: Promise<any>[] = []
          sectionRow.eachCell((cell: any, colNumber: any) => {
            // Apply fatal error styling for fatal error sections with "yes" responses
            if (isFatalSection && hasFatalErrorCondition) {
              Object.assign(cell, {
                fill: {
                  type: 'pattern',
                  pattern: 'solid',
                  fgColor: { argb: 'FFF87171' } // Light red background
                },
                font: {
                  color: { argb: 'FFDC2626' }, // Dark red text
                  bold: true
                }
              })
            } else {
              Object.assign(cell, cellStyle)
            }

            // Apply center alignment for score columns
            if ([2, 3, 4, 5, 6].includes(colNumber)) {
              cell.alignment = { horizontal: 'center', vertical: 'middle' }
            }

            // Apply performance color to the Performance % column using client ranges
            if (colNumber === 6) {
              if (isFatalSection && hasFatalErrorCondition) {
                // Fatal error sections get special styling
                Object.assign(cell, {
                  fill: {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: 'FFDC2626' } // Dark red background
                  },
                  font: {
                    color: { argb: 'FFFFFFFF' }, // White text
                    bold: true
                  }
                })
              } else {
                stylePromises.push(
                  getReportScoreStyle(sectionPercentage, report).then((style) => {
                    Object.assign(cell, style)
                  })
                )
              }
            }
          })

          // Wait for all styling promises to complete
          await Promise.all(stylePromises)

          // Accumulate totals (we're only in non-fatal sections loop here)
          overallTotalScore += Number(section.total_score) || 0
          overallApplicable += naScoreToNumber(section.total_applicable_score)
          overallAchieved += naScoreToNumber(section.total_achieved_score)
        }

        // Calculate overall percentage (from non-fatal sections only)
        const overallPercentage =
          overallApplicable > 0 ? Math.round((overallAchieved / overallApplicable) * 100) : 0

        // Add NON-FATAL sections total row
        const totalsRow = worksheet.addRow([
          '📊 Other Sections Performance',
          '',
          overallTotalScore,
          overallApplicable,
          overallAchieved,
          `${overallPercentage}%`
        ])

        totalsRow.font = { bold: true }
        const nonFatalStylePromises: Promise<any>[] = []
        totalsRow.eachCell((cell: any, colNumber: any) => {
          // Always use normal styling for other sections (not red)
          Object.assign(cell, {
            fill: {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: hexToARGB(colorValues.kpiBg) }
            },
            font: { bold: true, color: { argb: '000000' } },
            border: {
              top: { style: 'thick', color: { argb: '000000' } },
              left: { style: 'thin', color: { argb: '000000' } },
              bottom: { style: 'thick', color: { argb: '000000' } },
              right: { style: 'thin', color: { argb: '000000' } }
            }
          })

          // Apply center alignment for score columns
          if ([2, 3, 4, 5, 6].includes(colNumber)) {
            cell.alignment = { horizontal: 'center', vertical: 'middle' }
          }

          // Apply performance color to the Performance % column
          if (colNumber === 6) {
            nonFatalStylePromises.push(
              getReportScoreStyle(overallPercentage, report).then((style) => {
                Object.assign(cell, style)
              })
            )
          }
        })

        await Promise.all(nonFatalStylePromises)

        // Now add FATAL ERROR sections individually
        if (fatalSections.length > 0) {
          let fatalTotalScore = 0
          let fatalApplicable = 0
          let fatalAchieved = 0

          for (const section of fatalSections) {
            const hasFatalErrorCondition = checkSectionFatalError(section)

            // Use the saved section percentage
            let sectionPercentage = 0
            if (
              section.achieved !== undefined &&
              section.achieved !== null &&
              !isNaN(Number(section.achieved))
            ) {
              sectionPercentage = Number(section.achieved)
            } else {
              const applicableScore = naScoreToNumber(section.total_applicable_score)
              const achievedScore = naScoreToNumber(section.total_achieved_score)
              if (applicableScore > 0) {
                sectionPercentage = Math.round((achievedScore / applicableScore) * 100)
              }
            }

            const sectionRow = worksheet.addRow([
              hasFatalErrorCondition
                ? `${section.heading || section.title || 'Section'} ⚠️ FATAL ERROR`
                : `${section.heading || section.title || 'Section'}`,
              '',
              section.total_score || 0,
              formatScoreForExport(section.total_applicable_score),
              formatScoreForExport(section.total_achieved_score),
              typeof sectionPercentage === 'string' ? sectionPercentage : `${sectionPercentage}%`
            ])

            // Apply styles to fatal sections
            const stylePromises: Promise<any>[] = []
            sectionRow.eachCell((cell: any, colNumber: any) => {
              if (hasFatalErrorCondition) {
                Object.assign(cell, {
                  fill: {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: 'FFF87171' }
                  },
                  font: {
                    color: { argb: 'FFDC2626' },
                    bold: true
                  }
                })
              } else {
                Object.assign(cell, cellStyle)
              }

              if ([2, 3, 4, 5, 6].includes(colNumber)) {
                cell.alignment = { horizontal: 'center', vertical: 'middle' }
              }

              if (colNumber === 6) {
                if (hasFatalErrorCondition) {
                  Object.assign(cell, {
                    fill: {
                      type: 'pattern',
                      pattern: 'solid',
                      fgColor: { argb: 'FFDC2626' }
                    },
                    font: {
                      color: { argb: 'FFFFFFFF' },
                      bold: true
                    }
                  })
                } else {
                  stylePromises.push(
                    getReportScoreStyle(sectionPercentage, report).then((style) => {
                      Object.assign(cell, style)
                    })
                  )
                }
              }
            })

            await Promise.all(stylePromises)

            // Accumulate fatal section totals
            fatalTotalScore += Number(section.total_score) || 0
            fatalApplicable += naScoreToNumber(section.total_applicable_score)
            fatalAchieved += naScoreToNumber(section.total_achieved_score)
          }

          // Add FATAL ERROR sections total row
          const fatalPerformance =
            fatalApplicable > 0 ? Math.round((fatalAchieved / fatalApplicable) * 100) : 0

          const fatalRow = worksheet.addRow([
            '⚠️ Fatal Error Sections Performance',
            '',
            fatalTotalScore,
            fatalApplicable,
            fatalAchieved,
            fatalApplicable > 0 ? `${fatalPerformance}%` : '0%'
          ])

          // Apply styling for fatal error sections row
          const fatalStylePromises: Promise<any>[] = []
          fatalRow.eachCell((cell: any, colNumber: any) => {
            Object.assign(cell, {
              fill: {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFDC2626' } // Red background
              },
              font: {
                bold: true,
                color: { argb: 'FFFFFF' } // White text
              },
              border: {
                top: { style: 'thin', color: { argb: '000000' } },
                left: { style: 'thin', color: { argb: '000000' } },
                bottom: { style: 'thin', color: { argb: '000000' } },
                right: { style: 'thin', color: { argb: '000000' } }
              }
            })

            // Apply center alignment for score columns
            if ([2, 3, 4, 5, 6].includes(colNumber)) {
              cell.alignment = { horizontal: 'center', vertical: 'middle' }
            }

            // Apply performance color to the Performance % column (only if not all sections have "yes")
            if (colNumber === 6) {
              if (fatalApplicable > 0) {
                fatalStylePromises.push(
                  getReportScoreStyle(fatalPerformance, report).then((style) => {
                    Object.assign(cell, style)
                  })
                )
              }
            }
          })

          // Wait for fatal style promises to complete
          await Promise.all(fatalStylePromises)
        } // End of if (hasFatalErrorSections) condition

        // Add detailed sections if available
        // worksheet.addRow([''])
        // const detailedSectionRow = worksheet.addRow(['Detailed Sections'])
        // worksheet.mergeCells(`A${detailedSectionRow.number}:F${detailedSectionRow.number}`)
        // detailedSectionRow.eachCell((cell: any) => {
        //   Object.assign(cell, sectionStyle)
        // })
        // worksheet.addRow([''])

        // Helper function to add section headers that span full width
        const addSectionHeader = (worksheet: any, title: any, style: any) => {
          const sectionHeaderRow = worksheet.addRow([title])
          worksheet.mergeCells(`A${sectionHeaderRow.number}:F${sectionHeaderRow.number}`)
          sectionHeaderRow.eachCell((cell: any) => {
            Object.assign(cell, style)
          })
          return sectionHeaderRow
        }

        let sectionCounter = 1 // Section counter

        report.content.reports.forEach((section: any, sectionIndex: any) => {
          // Calculate section percentage

          // Add section header spanning full width with percentage
          addSectionHeader(
            worksheet,
            `${section.heading || `Section ${sectionIndex + 1}`} `,
            sectionStyle
          )

          // Adjust column widths for better layout
          worksheet.getColumn('A').width = 40 // Question Number
          worksheet.getColumn('B').width = 70 // Question text (much wider)
          worksheet.getColumn('C').width = 15 // Response
          worksheet.getColumn('D').width = 15 // Total Score
          worksheet.getColumn('E').width = 18 // Applicable Score
          worksheet.getColumn('F').width = 18 // Achieved Score
          if (isMeezanBank) {
            worksheet.getColumn('G').width = 50 // Comments column for Meezan Bank
          }

          // Question headers (add Comments column for Meezan Bank)
          const questionHeaderRow = isMeezanBank
            ? worksheet.addRow([
                'No.',
                '',
                'Responses',
                'Total Score',
                'Applicable Score',
                'Achieved Score',
                'Comments'
              ])
            : worksheet.addRow([
                'No.',
                '',
                'Responses',
                'Total Score',
                'Applicable Score',
                'Achieved Score'
              ])
          questionHeaderRow.eachCell((cell: any) => {
            Object.assign(cell, headerStyle)
            // Apply center alignment for No. column and score columns
            if ([1, 3, 4, 5, 6].includes(cell._column._number)) {
              cell.alignment = { horizontal: 'center', vertical: 'middle' }
            } else if (cell._column._number === 2) {
              cell.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true }
            }
          })

          // Questions and responses
          if (section.data && section.data.length > 0) {
            let sectionTotalScore = 0
            let sectionApplicableScore = 0
            let sectionAchievedScore = 0

            // Group questions by main question text
            const questionGroups = new Map()

            section.data.forEach((item: any, index: number) => {
              // Use a combination of question text and index to create unique groups
              // This ensures each question-subquestion pair gets its own group
              const mainQuestion = item.question || ''
              const groupKey = `${index}_${mainQuestion}` // Use index to ensure uniqueness

              if (!questionGroups.has(groupKey)) {
                questionGroups.set(groupKey, {
                  mainQuestion: mainQuestion,
                  items: []
                })
              }
              questionGroups.get(groupKey).items.push(item)
            })

            let questionCounter = 1

            questionGroups.forEach((group, groupKey) => {
              console.log(group.items)

              const items = group.items
              const mainQuestion = group.mainQuestion

              // Each item should be treated as its own question with potential sub-question
              items.forEach((item: any) => {
                const totalScore = Number(item.total_score || 0)
                const rawApplicable =
                  item.applicable_score !== null && item.applicable_score !== undefined
                    ? item.applicable_score
                    : item.total_score || 0
                const applicableScoreDisplay = formatScoreForExport(rawApplicable)
                const achievedScoreDisplay = formatScoreForExport(item.achieved_score)
                // const applicableScoreNum = naScoreToNumber(rawApplicable)
                // const achievedScoreNum = naScoreToNumber(item.achieved_score)

                const isApplicableNA =
                  typeof rawApplicable === 'string' && rawApplicable.toUpperCase().includes('N/A')

                const isAchievedNA =
                  typeof item.achieved_score === 'string' &&
                  item.achieved_score.toUpperCase().includes('N/A')

                if (!isApplicableNA) {
                  sectionApplicableScore += naScoreToNumber(rawApplicable)
                }

                if (!isAchievedNA) {
                  sectionAchievedScore += naScoreToNumber(item.achieved_score)
                }

                // Check if this question has a sub-question
                const hasSubQuestion = item.sub_question && item.sub_question.trim() !== ''

                if (hasSubQuestion) {
                  // Add main question row without number
                  const questionRow = isMeezanBank
                    ? worksheet.addRow(['', mainQuestion || '', '', '', '', '', ''])
                    : worksheet.addRow(['', mainQuestion || '', '', '', '', ''])

                  // Style the main question row - BOLD only for questions with sub-questions
                  questionRow.getCell(2).font = { bold: true }
                  questionRow.eachCell((cell: any, colNumber: any) => {
                    Object.assign(cell, cellStyle)
                    if (colNumber === 2) {
                      cell.alignment = { horizontal: 'left', vertical: 'top', wrapText: true }
                    }
                  })

                  // Add sub-question row with number
                  const subQuestionRow = isMeezanBank
                    ? worksheet.addRow([
                        `${sectionCounter}.${questionCounter}`,
                        item.sub_question,
                        item.response || '',
                        totalScore,
                        applicableScoreDisplay,
                        achievedScoreDisplay,
                        item.comments || ''
                      ])
                    : worksheet.addRow([
                        `${sectionCounter}.${questionCounter}`,
                        item.sub_question,
                        item.response || '',
                        totalScore,
                        applicableScoreDisplay,
                        achievedScoreDisplay
                      ])

                  // Apply styles and formatting for sub-question
                  subQuestionRow.eachCell((cell: any, colNumber: any) => {
                    Object.assign(cell, cellStyle)
                    if (colNumber === 1) {
                      // Center align the question number
                      cell.alignment = { horizontal: 'center', vertical: 'middle' }
                    } else if ([3, 4, 5, 6].includes(colNumber)) {
                      // Apply center alignment for response and score columns
                      cell.alignment = { horizontal: 'center', vertical: 'middle' }
                    } else if (colNumber === 2 || (isMeezanBank && colNumber === 7)) {
                      // Left align and wrap text for question text and comments (Meezan Bank)
                      cell.alignment = { horizontal: 'left', vertical: 'top', wrapText: true }
                    }
                  })
                } else {
                  // No sub-question, so put the number on the main question row - NOT BOLD
                  const questionRow = isMeezanBank
                    ? worksheet.addRow([
                        `${sectionCounter}.${questionCounter}`,
                        mainQuestion || '',
                        item.response || '',
                        totalScore,
                        applicableScoreDisplay,
                        achievedScoreDisplay,
                        item.comments || ''
                      ])
                    : worksheet.addRow([
                        `${sectionCounter}.${questionCounter}`,
                        mainQuestion || '',
                        item.response || '',
                        totalScore,
                        applicableScoreDisplay,
                        achievedScoreDisplay
                      ])

                  // Style the main question row - NO BOLD for questions without sub-questions
                  questionRow.eachCell((cell: any, colNumber: any) => {
                    Object.assign(cell, cellStyle)
                    if (colNumber === 1) {
                      // Center align the question number
                      cell.alignment = { horizontal: 'center', vertical: 'middle' }
                    } else if ([3, 4, 5, 6].includes(colNumber)) {
                      // Apply center alignment for response and score columns
                      cell.alignment = { horizontal: 'center', vertical: 'middle' }
                    } else if (colNumber === 2 || (isMeezanBank && colNumber === 7)) {
                      // Left align and wrap text for question text and comments (Meezan Bank)
                      cell.alignment = { horizontal: 'left', vertical: 'top', wrapText: true }
                    }
                  })
                }

                // Add to section totals
                sectionTotalScore += totalScore
                // sectionApplicableScore += applicableScoreNum
                // sectionAchievedScore += achievedScoreNum

                questionCounter++

                // For non-Meezan Bank clients: add comment row immediately after each question
                if (!isMeezanBank) {
                  const commentRow = worksheet.addRow(['', `${item.comments}`, '', '', '', ''])
                  commentRow.eachCell((cell: any) => {
                    cell.fill = {
                      type: 'pattern',
                      pattern: 'solid',
                      fgColor: { argb: 'E6F3FF' }
                    }
                    Object.assign(cell, cellStyle)
                    // Make comment text italic and wrap text
                    if (cell._column._number === 2) {
                      cell.font = { italic: true }
                      cell.alignment = { horizontal: 'left', vertical: 'top', wrapText: true }
                    }
                  })
                }
              })
            })

            // Add section totals row using ONLY the saved section totals (no fallback to calculated values)
            const sectionTotalsRow = isMeezanBank
              ? worksheet.addRow([
                  'SECTION TOTAL',
                  '',
                  '',
                  section.total_score || 0,
                  formatScoreForExport(section.total_applicable_score),
                  formatScoreForExport(section.total_achieved_score),
                  ''
                ])
              : worksheet.addRow([
                  'SECTION TOTAL',
                  '',
                  '',
                  section.total_score || 0,
                  formatScoreForExport(section.total_applicable_score),
                  formatScoreForExport(section.total_achieved_score)
                ])

            sectionTotalsRow.font = { bold: true }
            sectionTotalsRow.eachCell((cell: any) => {
              Object.assign(cell, {
                fill: {
                  type: 'pattern',
                  pattern: 'solid',
                  fgColor: { argb: hexToARGB(colorValues.summaryBg) }
                },
                font: { bold: true, color: { argb: '000000' } },
                border: {
                  top: { style: 'thick', color: { argb: '000000' } },
                  left: { style: 'thin', color: { argb: '000000' } },
                  bottom: { style: 'thick', color: { argb: '000000' } },
                  right: { style: 'thin', color: { argb: '000000' } }
                }
              })
              // Apply center alignment for score columns
              if ([3, 4, 5, 6].includes(cell._column._number)) {
                cell.alignment = { horizontal: 'center', vertical: 'middle' }
              }
            })
          } else if (section.questions && section.questions.length > 0) {
            // Alternative: if there's a questions array but no data array
            let sectionTotalScore = 0
            let sectionApplicableScore = 0
            let sectionAchievedScore = 0

            section.questions.forEach((question: any, index: any) => {
              const questionText = question.title || ''

              const totalScore = Number(question.max_score || 0)
              const applicableScore = Number(question.max_score || 0) // Applicable score is max_score
              const achievedScore = Number(question.score || 0)

              const dataRow = isMeezanBank
                ? worksheet.addRow([
                    `${sectionCounter}.${index + 1}`,
                    questionText,
                    question.response || '',
                    totalScore,
                    applicableScore,
                    achievedScore,
                    question.comments || ''
                  ])
                : worksheet.addRow([
                    `${sectionCounter}.${index + 1}`,
                    questionText,
                    question.response || '',
                    totalScore,
                    applicableScore,
                    achievedScore
                  ])

              // Add to section totals
              sectionTotalScore += totalScore
              sectionApplicableScore += applicableScore
              sectionAchievedScore += achievedScore

              // Apply styles
              dataRow.eachCell((cell: any, colNumber: any) => {
                Object.assign(cell, cellStyle)
                // Apply center alignment for No. column and score columns
                if ([1, 3, 4, 5, 6].includes(colNumber)) {
                  cell.alignment = { horizontal: 'center', vertical: 'middle' }
                } else if (colNumber === 2 || (isMeezanBank && colNumber === 7)) {
                  // Left align and wrap text for question text and comments (Meezan Bank)
                  cell.alignment = { horizontal: 'left', vertical: 'top', wrapText: true }
                }
              })

              // For non-Meezan Bank clients: add comment row immediately after each question
              if (!isMeezanBank && question.comments && question.comments.trim() !== '') {
                const commentRow = worksheet.addRow([
                  '',
                  `Comments: ${question.comments || 'No comments'}`,
                  '',
                  '',
                  '',
                  ''
                ])
                commentRow.eachCell((cell: any) => {
                  cell.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: 'E6F3FF' }
                  }
                  Object.assign(cell, cellStyle)
                  // Make comment text italic and wrap text
                  if (cell._column._number === 2) {
                    cell.font = { italic: true }
                    cell.alignment = { horizontal: 'left', vertical: 'top', wrapText: true }
                  }
                })
              }
            })

            // Add section totals row using ONLY the saved section totals (no fallback to calculated values)
            const sectionTotalsRow = isMeezanBank
              ? worksheet.addRow([
                  'SECTION TOTAL',
                  '',
                  '',
                  section.total_score || 0,
                  formatScoreForExport(section.total_applicable_score),
                  formatScoreForExport(section.total_achieved_score),
                  ''
                ])
              : worksheet.addRow([
                  'SECTION TOTAL',
                  '',
                  '',
                  section.total_score || 0,
                  formatScoreForExport(section.total_applicable_score),
                  formatScoreForExport(section.total_achieved_score)
                ])

            sectionTotalsRow.font = { bold: true }
            sectionTotalsRow.eachCell((cell: any) => {
              Object.assign(cell, {
                fill: {
                  type: 'pattern',
                  pattern: 'solid',
                  fgColor: { argb: hexToARGB(colorValues.bgLight) }
                },
                font: { bold: true, color: { argb: '000000' } },
                border: {
                  top: { style: 'thick', color: { argb: '000000' } },
                  left: { style: 'thin', color: { argb: '000000' } },
                  bottom: { style: 'thick', color: { argb: '000000' } },
                  right: { style: 'thin', color: { argb: '000000' } }
                }
              })
              // Apply center alignment for score columns
              if ([3, 4, 5, 6].includes(cell._column._number)) {
                cell.alignment = { horizontal: 'center', vertical: 'middle' }
              }
            })
          }

          // Remove the spacing between sections to eliminate extra rows
          sectionCounter++
        })
      }

      // Generate and return Excel file buffer
      return await workbook.xlsx.writeBuffer()
    } catch (error) {
      console.error('Error generating Excel buffer for report:', error)
      throw error
    }
  }

  // Export public functions
  return {
    hexToARGB,
    getReportScoreStyle,
    getRatingText,
    generateExcelBufferFromReport
  }
})

export default {
  ExcelExport
}
