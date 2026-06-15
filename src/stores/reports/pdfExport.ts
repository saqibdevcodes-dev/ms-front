import { Toast } from '@/utils/toast'
import html2canvas from 'html2canvas'
import { jsPDF } from 'jspdf'
import JSZip from 'jszip'
import FileSaver from 'file-saver'

// Helper function to ensure colors have the # prefix
const ensureHexPrefix = (color: string | undefined | null): string => {
  if (!color) return '#000000';
  
  // If color already has # prefix, return as is
  if (color.startsWith('#')) return color;
  
  // Check if valid hex color (3 or 6 characters)
  const hexRegex = /^[0-9A-Fa-f]{3}$|^[0-9A-Fa-f]{6}$/;
  if (hexRegex.test(color)) {
    return '#' + color;
  }
  
  // Return original or default color if not valid hex
  return color || '#000000';
}

// Helper function to get rating text
const getRatingText = (percentage: number | string): string => {
  // If it's a string with %, remove the % and convert to number
  if (typeof percentage === 'string') {
    percentage = parseInt(percentage.replace('%', ''))
  }

  if (percentage >= 90) return 'Excellent'
  if (percentage >= 75) return 'Good'
  if (percentage >= 60) return 'Average'
  if (percentage >= 40) return 'Below Average'
  return 'Poor'
}

// Helper function to get score color for PDF
const getScoreColorForPDF = (score: number | string | null | undefined, report: any): string => {
  const reportColors = report.colors || report.content?.colors || {}

  // Default colors
  const defaultColors = {
    green: '#22c55e',
    yellow: '#f59e0b',
    red: '#ef4444',
    grey: '#9ca3af'
  }

  // Use report colors if available
  const colors: Record<string, string> = {
    green: ensureHexPrefix(reportColors.greenColor || defaultColors.green),
    yellow: ensureHexPrefix(reportColors.yellowColor || defaultColors.yellow),
    red: ensureHexPrefix(reportColors.redColor || defaultColors.red),
    grey: ensureHexPrefix(reportColors.greyColor || defaultColors.grey)
  }

  if (score === null || score === undefined || isNaN(Number(score))) {
    return colors.grey
  }

  const numScore = Number(score)
  if (numScore >= 80) {
    return colors.green
  } else if (numScore >= 50) {
    return colors.yellow
  } else {
    return colors.red
  }
}

// Create the PDF container for a report
const createPDFContainer = (report: any): HTMLElement => {
  // Create a temporary container for the report content
  const container = document.createElement('div')
  container.className = 'pdf-export-container'
  container.style.width = '800px'
  container.style.padding = '15px'
  container.style.fontFamily = 'Arial, sans-serif'
  container.style.backgroundColor = '#ffffff'
  container.style.fontSize = '10px' // Smaller base font size for more compact layout
  container.style.margin = '0 auto' // Center the container
  container.style.textAlign = 'left' // Align text to the left for better readability

  // Add logo if available - check multiple possible locations
  if (report.content?.logo || report.logo || report.colors?.logo) {
    const logoContainer = document.createElement('div')
    logoContainer.style.textAlign = 'center'
    logoContainer.style.marginBottom = '10px'
    logoContainer.style.display = 'flex'
    logoContainer.style.justifyContent = 'center'
    logoContainer.style.alignItems = 'center'

    const logoImg = document.createElement('img')
    logoImg.src = report.content?.logo || report.logo || report.colors?.logo
    logoImg.style.maxHeight = '60px' // Reduced logo size
    logoImg.style.maxWidth = '100%'

    logoContainer.appendChild(logoImg)
    container.appendChild(logoContainer)
  }

  // Add title
  const title = document.createElement('h1')
  title.textContent = report.template_name || 'Mystery Shopping Assessment'
  title.style.textAlign = 'center' // Keep title centered
  title.style.color = '#fff'
  title.style.backgroundColor = ensureHexPrefix(
    report.colors?.titleBg || report.content?.colors?.titleBg || '#2563EB'
  )
  title.style.padding = '8px'
  title.style.marginBottom = '10px'
  title.style.fontSize = '16px' // Smaller title
  title.style.display = 'block'
  title.style.lineHeight = '40px' // Match to minHeight for vertical centering
  title.style.minHeight = '40px'
  container.appendChild(title)

  // Add report info
  const infoSection = document.createElement('div')
  infoSection.style.marginBottom = '10px'

  const infoTable = document.createElement('table')
  infoTable.style.width = '100%'
  infoTable.style.borderCollapse = 'collapse'
  infoTable.style.marginBottom = '10px'
  infoTable.style.fontSize = '9px'

  // Add report info rows
  const infoRows = [
    ['Report Name', report.template_name || report.primary_field?.value || 'Unnamed Report'],
    ['Branch', report.branch_name || report.primary_field?.value || 'N/A'],
    ['Status', report.status || 'N/A'],
    ['Created Date', report.created_at ? new Date(report.created_at).toLocaleDateString() : 'N/A']
  ]

  // Add client name if available
  if (report.client_name || report.content?.client_name) {
    infoRows.unshift(['Client', report.client_name || report.content?.client_name])
  }
  
  // Add creator info if available
  if (report.creator?.name) {
    infoRows.push(['Created By', report.creator.name])
  }
  
  // Add last updated info if available
  if (report.updated_at) {
    infoRows.push([
      'Last Updated', 
      new Date(report.updated_at).toLocaleDateString()
    ])
  }
  
  // Add updater info if available
  if (report.updater?.name) {
    infoRows.push(['Updated By', report.updater.name])
  }
  
  infoRows.forEach((row) => {
    const tr = document.createElement('tr')

    const labelCell = document.createElement('td')
    labelCell.textContent = row[0]
    labelCell.style.fontWeight = 'bold'
    labelCell.style.padding = '4px'
    labelCell.style.backgroundColor = ensureHexPrefix(
      report.colors?.bgUltraLight || report.content?.colors?.bgUltraLight || '#EFF6FF'
    )
    labelCell.style.border = '1px solid #000000'
    labelCell.style.width = '25%'
    labelCell.style.textAlign = 'left' // Align text to the left
    labelCell.style.verticalAlign = 'middle' // Vertically center text
    labelCell.style.height = '28px' // Consistent height
    labelCell.style.lineHeight = '28px' // Match lineHeight to height for vertical centering

    const valueCell = document.createElement('td')
    valueCell.textContent = row[1]
    valueCell.style.padding = '4px'
    valueCell.style.border = '1px solid #000000'
    valueCell.style.textAlign = 'left' // Align text to the left
    valueCell.style.verticalAlign = 'middle' // Vertically center text
    valueCell.style.height = '28px' // Consistent height
    valueCell.style.lineHeight = '28px' // Match lineHeight to height for vertical centering

    tr.appendChild(labelCell)
    tr.appendChild(valueCell)
    infoTable.appendChild(tr)
  })

  infoSection.appendChild(infoTable)
  container.appendChild(infoSection)

  // Add field values section if available
  if (report.content?.selectedFieldValues && Object.keys(report.content.selectedFieldValues).length > 0) {
    const fieldValuesSection = document.createElement('div')
    fieldValuesSection.style.marginBottom = '10px'
    
    // Add field values title
    const fieldValuesTitle = document.createElement('h2')
    fieldValuesTitle.textContent = 'Custom Field Values'
    fieldValuesTitle.style.backgroundColor = ensureHexPrefix(
      report.colors?.headerBg || report.content?.colors?.headerBg || '#4B5563'
    )
    fieldValuesTitle.style.color = '#fff'
    fieldValuesTitle.style.padding = '6px'
    fieldValuesTitle.style.textAlign = 'center'
    fieldValuesTitle.style.marginBottom = '8px'
    fieldValuesTitle.style.fontSize = '12px'
    fieldValuesTitle.style.display = 'block'
    fieldValuesTitle.style.lineHeight = '32px'
    fieldValuesTitle.style.minHeight = '32px'
    fieldValuesSection.appendChild(fieldValuesTitle)
    
    // Create field values table
    const fieldValuesTable = document.createElement('table')
    fieldValuesTable.style.width = '100%'
    fieldValuesTable.style.borderCollapse = 'collapse'
    fieldValuesTable.style.marginBottom = '10px'
    fieldValuesTable.style.fontSize = '8px'
    
    // Add each field value
    for (const [key, value] of Object.entries(report.content.selectedFieldValues)) {
      // Format the field name with proper casing
      const formattedKey = key
        .replace(/([A-Z])/g, ' $1') // Add space before capital letters
        .replace(/^./, (str) => str.toUpperCase()) // Capitalize first letter
      
      // Format the value based on its type
      let formattedValue = ''
      if (value !== null && typeof value === 'object') {
        // Use type assertion to access potentially existing properties
        const valueObj = value as Record<string, any>
        formattedValue = valueObj.name || valueObj.value || JSON.stringify(value)
      } else {
        formattedValue = String(value)
      }
      
      const tr = document.createElement('tr')
      
      const labelCell = document.createElement('td')
      labelCell.textContent = formattedKey
      labelCell.style.fontWeight = 'bold'
      labelCell.style.padding = '3px'
      labelCell.style.backgroundColor = ensureHexPrefix(
        report.colors?.bgLight || report.content?.colors?.bgLight || '#F3F4F6'
      )
      labelCell.style.border = '1px solid #000000'
      labelCell.style.width = '25%'
      labelCell.style.textAlign = 'center'
      labelCell.style.verticalAlign = 'middle'
      labelCell.style.height = '26px'
      labelCell.style.lineHeight = '26px'
      
      const valueCell = document.createElement('td')
      valueCell.textContent = formattedValue
      valueCell.style.padding = '3px'
      valueCell.style.border = '1px solid #000000'
      valueCell.style.textAlign = 'center'
      valueCell.style.verticalAlign = 'middle'
      valueCell.style.height = '26px'
      valueCell.style.lineHeight = '26px'
      
      tr.appendChild(labelCell)
      tr.appendChild(valueCell)
      fieldValuesTable.appendChild(tr)
    }
    
    fieldValuesSection.appendChild(fieldValuesTable)
    container.appendChild(fieldValuesSection)
  }

  // Add summary section if report has content
  if (report.content && report.content.reports) {
    const summaryTitle = document.createElement('h2')
    summaryTitle.textContent = 'Score Summary'
    summaryTitle.style.backgroundColor = ensureHexPrefix(
      report.colors?.summaryBg || report.content?.colors?.summaryBg || '#3B82F6'
    )
    summaryTitle.style.color = '#fff'
    summaryTitle.style.padding = '6px'
    summaryTitle.style.textAlign = 'center'
    summaryTitle.style.marginBottom = '8px'
    summaryTitle.style.fontSize = '12px'
    summaryTitle.style.display = 'block'
    summaryTitle.style.lineHeight = '32px'
    summaryTitle.style.minHeight = '32px'
    container.appendChild(summaryTitle)

    // Summary table
    const summaryTable = document.createElement('table')
    summaryTable.style.width = '100%'
    summaryTable.style.borderCollapse = 'collapse'
    summaryTable.style.marginBottom = '10px'
    summaryTable.style.fontSize = '8px'

    // Summary header
    const summaryHeader = document.createElement('tr')
    const headerLabels = [
      'KPI Section',
      'Applicable Score',
      'Achieved Score',
      'Performance %',
      'Rating'
    ]

    headerLabels.forEach((text) => {
      const th = document.createElement('th')
      th.textContent = text
      th.style.backgroundColor = ensureHexPrefix(
        report.colors?.headerBg || report.content?.colors?.headerBg || '#3B82F6'
      )
      th.style.color = '#fff'
      th.style.padding = '4px'
      th.style.border = '1px solid #000000'
      th.style.textAlign = 'center'
      th.style.fontSize = '8px'
      th.style.verticalAlign = 'middle'
      th.style.height = '28px'
      th.style.lineHeight = '28px'
      summaryHeader.appendChild(th)
    })

    summaryTable.appendChild(summaryHeader)

    // Add section data
    let overallApplicable = 0
    let overallAchieved = 0

    report.content.reports.forEach((section: any) => {
      const sectionRow = document.createElement('tr')

      const nameCell = document.createElement('td')
      nameCell.textContent = section.heading || 'Section'
      nameCell.style.padding = '3px'
      nameCell.style.border = '1px solid #000000'
      nameCell.style.fontSize = '8px'
      nameCell.style.textAlign = 'center'
      nameCell.style.verticalAlign = 'middle'
      nameCell.style.height = '26px'
      nameCell.style.lineHeight = '26px'

      const applicableCell = document.createElement('td')
      applicableCell.textContent = section.total_applicable_score || '0'
      applicableCell.style.padding = '3px'
      applicableCell.style.border = '1px solid #000000'
      applicableCell.style.textAlign = 'center'
      applicableCell.style.fontSize = '8px'
      applicableCell.style.verticalAlign = 'middle'
      applicableCell.style.height = '26px'
      applicableCell.style.lineHeight = '26px'

      const achievedCell = document.createElement('td')
      achievedCell.textContent = section.total_achieved_score || '0'
      achievedCell.style.padding = '3px'
      achievedCell.style.border = '1px solid #000000'
      achievedCell.style.textAlign = 'center'
      achievedCell.style.fontSize = '8px'
      achievedCell.style.verticalAlign = 'middle'
      achievedCell.style.height = '26px'
      achievedCell.style.lineHeight = '26px'

      const percentCell = document.createElement('td')
      percentCell.textContent = section.achieved || '0%'
      percentCell.style.padding = '3px'
      percentCell.style.border = '1px solid #000000'
      percentCell.style.textAlign = 'center'
      percentCell.style.fontSize = '8px'
      percentCell.style.verticalAlign = 'middle'
      percentCell.style.height = '26px'
      percentCell.style.lineHeight = '26px'

      // Apply performance color
      const performance = parseInt(section.achieved) || 0
      const color = getScoreColorForPDF(performance, report)
      percentCell.style.backgroundColor = color
      percentCell.style.color = performance >= 80 ? '#fff' : '#000'

      const ratingCell = document.createElement('td')
      ratingCell.textContent = getRatingText(performance)
      ratingCell.style.padding = '3px'
      ratingCell.style.border = '1px solid #000000'
      ratingCell.style.textAlign = 'center'
      ratingCell.style.backgroundColor = ensureHexPrefix(
        report.colors?.ratingBg || report.content?.colors?.ratingBg || '#4F6228'
      )
      ratingCell.style.color = '#fff'
      ratingCell.style.verticalAlign = 'middle'
      ratingCell.style.height = '26px'
      ratingCell.style.lineHeight = '26px'

      sectionRow.appendChild(nameCell)
      sectionRow.appendChild(applicableCell)
      sectionRow.appendChild(achievedCell)
      sectionRow.appendChild(percentCell)
      sectionRow.appendChild(ratingCell)
      summaryTable.appendChild(sectionRow)

      // Add to overall totals
      overallApplicable += parseInt(section.total_applicable_score || '0')
      overallAchieved += parseInt(section.total_achieved_score || '0')
    })

    // Add overall row
    const overallPerformance =
      overallApplicable > 0 ? Math.round((overallAchieved / overallApplicable) * 100) : 0

    const overallRow = document.createElement('tr')

    const overallLabelCell = document.createElement('td')
    overallLabelCell.textContent = 'Overall Performance'
    overallLabelCell.style.fontWeight = 'bold'
    overallLabelCell.style.padding = '3px'
    overallLabelCell.style.backgroundColor = ensureHexPrefix(
      report.colors?.headerBg || report.content?.colors?.headerBg || '#3B82F6'
    )
    overallLabelCell.style.color = '#fff'
    overallLabelCell.style.border = '1px solid #000000'
    overallLabelCell.style.verticalAlign = 'middle'
    overallLabelCell.style.textAlign = 'center'
    overallLabelCell.style.height = '30px'
    overallLabelCell.style.lineHeight = '30px'

    const overallApplicableCell = document.createElement('td')
    overallApplicableCell.textContent = String(overallApplicable)
    overallApplicableCell.style.padding = '3px'
    overallApplicableCell.style.backgroundColor =
      report.colors?.headerBg || report.content?.colors?.headerBg || '#3B82F6'
    overallApplicableCell.style.color = '#fff'
    overallApplicableCell.style.border = '1px solid #000000'
    overallApplicableCell.style.textAlign = 'center'
    overallApplicableCell.style.verticalAlign = 'middle'
    overallApplicableCell.style.height = '30px'
    overallApplicableCell.style.lineHeight = '30px'

    const overallAchievedCell = document.createElement('td')
    overallAchievedCell.textContent = String(overallAchieved)
    overallAchievedCell.style.padding = '3px'
    overallAchievedCell.style.backgroundColor =
      report.colors?.headerBg || report.content?.colors?.headerBg || '#3B82F6'
    overallAchievedCell.style.color = '#fff'
    overallAchievedCell.style.border = '1px solid #000000'
    overallAchievedCell.style.textAlign = 'center'
    overallAchievedCell.style.verticalAlign = 'middle'
    overallAchievedCell.style.height = '30px'
    overallAchievedCell.style.lineHeight = '30px'

    const overallPercentCell = document.createElement('td')
    overallPercentCell.textContent = `${overallPerformance}%`
    overallPercentCell.style.padding = '3px'
    overallPercentCell.style.border = '1px solid #000000'
    overallPercentCell.style.textAlign = 'center'
    overallPercentCell.style.verticalAlign = 'middle'
    overallPercentCell.style.height = '30px'
    overallPercentCell.style.lineHeight = '30px'

    // Apply performance color
    const overallColor = getScoreColorForPDF(overallPerformance, report)
    overallPercentCell.style.backgroundColor = overallColor
    overallPercentCell.style.color = overallPerformance >= 80 ? '#fff' : '#000'

    const overallRatingCell = document.createElement('td')
    overallRatingCell.textContent = getRatingText(overallPerformance)
    overallRatingCell.style.padding = '3px'
    overallRatingCell.style.backgroundColor =
      report.colors?.ratingBg || report.content?.colors?.ratingBg || '#4F6228'
    overallRatingCell.style.color = '#fff'
    overallRatingCell.style.border = '1px solid #000000'
    overallRatingCell.style.textAlign = 'center'
    overallRatingCell.style.verticalAlign = 'middle'
    overallRatingCell.style.height = '30px'
    overallRatingCell.style.lineHeight = '30px'

    overallRow.appendChild(overallLabelCell)
    overallRow.appendChild(overallApplicableCell)
    overallRow.appendChild(overallAchievedCell)
    overallRow.appendChild(overallPercentCell)
    overallRow.appendChild(overallRatingCell)
    summaryTable.appendChild(overallRow)

    container.appendChild(summaryTable)

    // Add detailed sections
    const detailedTitle = document.createElement('h2')
    detailedTitle.textContent = 'Detailed Sections'
    detailedTitle.style.backgroundColor = ensureHexPrefix(
      report.colors?.detailedBg || report.content?.colors?.detailedBg || '#663D00'
    )
    detailedTitle.style.color = '#fff'
    detailedTitle.style.padding = '6px 6px 10px 6px'
    detailedTitle.style.textAlign = 'center'
    detailedTitle.style.marginTop = '10px'
    detailedTitle.style.marginBottom = '8px'
    detailedTitle.style.fontSize = '12px'
    detailedTitle.style.display = 'block'
    detailedTitle.style.lineHeight = '28px'
    detailedTitle.style.minHeight = '32px'
    detailedTitle.style.paddingTop = '12px'
    container.appendChild(detailedTitle)
    
    // Add each section with its questions
    report.content.reports.forEach((section: any, sectionIndex: number) => {
      // Update status for large reports
      if (sectionIndex % 3 === 0 && sectionIndex > 0) {
        Toast.info(
          `Processing section ${sectionIndex + 1} of ${report.content.reports.length}...`
        )
      }

      const sectionTitle = document.createElement('h3')
      sectionTitle.textContent = section.heading || 'Section'
      sectionTitle.style.backgroundColor = ensureHexPrefix(
        report.colors?.sectionBg || report.content?.colors?.sectionBg || '#663D00'
      )
      sectionTitle.style.color = '#fff'
      sectionTitle.style.padding = '4px 4px 8px 4px'
      sectionTitle.style.marginTop = '8px'
      sectionTitle.style.marginBottom = '5px'
      sectionTitle.style.fontSize = '10px'
      sectionTitle.style.textAlign = 'center'
      sectionTitle.style.display = 'block'
      sectionTitle.style.lineHeight = '20px'
      sectionTitle.style.minHeight = '28px'
      sectionTitle.style.paddingTop = '10px'
      
      // Add performance info to section title
      if (section.achieved) {
        const performanceInfo = document.createElement('span')
        performanceInfo.textContent = ` (${section.achieved} - ${getRatingText(parseInt(section.achieved) || 0)})`
        performanceInfo.style.fontSize = '9px'
        performanceInfo.style.fontWeight = 'normal'
        performanceInfo.style.marginLeft = '5px'
        performanceInfo.style.display = 'inline-flex'
        performanceInfo.style.alignItems = 'center'
        sectionTitle.appendChild(performanceInfo)
      }
      
      container.appendChild(sectionTitle)

      // Questions table with larger font size
      if (section.data && section.data.length > 0) {
        const questionsTable = document.createElement('table')
        questionsTable.style.width = '100%'
        questionsTable.style.borderCollapse = 'collapse'
        questionsTable.style.marginBottom = '8px'
        questionsTable.style.fontSize = '9px' // Increase base font size from 7px to 9px

        // Questions header with larger font
        const questionsHeader = document.createElement('tr')
        const headerLabels = [
          'Question',
          'Response',
          'Score',
          'Comments'
        ]

        headerLabels.forEach((text) => {
          const th = document.createElement('th')
          th.textContent = text
          th.style.backgroundColor = ensureHexPrefix(
            report.colors?.headerBg || report.content?.colors?.headerBg || '#FF00FF'
          )
          th.style.color = '#fff'
          th.style.padding = '3px 3px 6px 3px'
          th.style.border = '1px solid #000000'
          th.style.fontSize = '10px' // Increase header font size from 8px to 10px
          th.style.textAlign = 'center'
          th.style.verticalAlign = 'middle'
          th.style.height = '24px'
          th.style.lineHeight = '14px'
          th.style.fontWeight = 'bold'
          th.style.paddingTop = '8px'
          questionsHeader.appendChild(th)
        })

        questionsTable.appendChild(questionsHeader)

        // Questions and responses with larger text
        section.data.forEach((item: any) => {
          const dataRow = document.createElement('tr')

          // Create cells with appropriate type conversions
          const cells = [
            item.question || '',
            item.response || '',
            String(item.total_score || 0),
            item.comments || ''
          ]

          cells.forEach((cellText, idx) => {
            const td = document.createElement('td')
            td.textContent = cellText
            td.style.padding = '2px 8px 8px 8px' // Keep reduced top padding
            td.style.border = '1px solid #000000'
            td.style.verticalAlign = 'top' // Keep text at top
            td.style.height = '28px' // Slightly increase height for larger text
            td.style.lineHeight = '18px' // Increase line height for larger text
            td.style.textAlign = 'left' // Keep left alignment
            td.style.paddingTop = '0px' // Keep top padding removed
            td.style.fontSize = '9px' // Explicitly set cell font size

            dataRow.appendChild(td)
          })

          questionsTable.appendChild(dataRow)

          // Simplified detailed information - only show if significant data exists
          if ((item.observations && item.observations.length > 10) || 
              (item.evidence && item.evidence.length > 10) || 
              (item.notes && item.notes.length > 10)) {
            
            const detailsRow = document.createElement('tr')
            const detailsCell = document.createElement('td')
            detailsCell.colSpan = 4
            detailsCell.style.padding = '4px'
            detailsCell.style.border = '1px solid #000000'
            detailsCell.style.backgroundColor = '#F0F4F8'
            detailsCell.style.textAlign = 'center'
            detailsCell.style.verticalAlign = 'middle'
            detailsCell.style.minHeight = '24px'
            
            // Create compact details content
            const detailsContent = document.createElement('div')
            detailsContent.style.fontSize = '6px'
            detailsContent.style.display = 'flex'
            detailsContent.style.flexDirection = 'column'
            detailsContent.style.justifyContent = 'center'
            detailsContent.style.alignItems = 'center'
            detailsContent.style.padding = '4px'
            detailsContent.style.lineHeight = '1.5'
            
            // Add observations/evidence/notes in a more compact format
            const contentList = []
            if (item.observations) contentList.push(`<b>Obs:</b> ${item.observations.substring(0, 100)}${item.observations.length > 100 ? '...' : ''}`)
            if (item.evidence) contentList.push(`<b>Evid:</b> ${item.evidence.substring(0, 100)}${item.evidence.length > 100 ? '...' : ''}`)
            if (item.notes) contentList.push(`<b>Notes:</b> ${item.notes.substring(0, 100)}${item.notes.length > 100 ? '...' : ''}`)
            
            detailsContent.innerHTML = contentList.join(' | ')
            
            // Image count indicator rather than thumbnails
            if (item.images && item.images.length > 0) {
              const imagesInfo = document.createElement('div')
              imagesInfo.innerHTML = `<b>Images:</b> ${item.images.length}`
              imagesInfo.style.fontSize = '6px'
              imagesInfo.style.marginTop = '2px'
              imagesInfo.style.textAlign = 'center'
              detailsContent.appendChild(imagesInfo)
            }
            
            detailsCell.appendChild(detailsContent)
            detailsRow.appendChild(detailsCell)
            questionsTable.appendChild(detailsRow)
          }
        })

        container.appendChild(questionsTable)
      }
    })
  }

  return container
}

// Function to generate the PDF from a container element
const generatePDF = async (container: HTMLElement, fileName: string): Promise<void> => {
  Toast.info('Rendering PDF to fit on a single page...')

  // Temporarily append to document to capture with html2canvas
  document.body.appendChild(container)
  container.style.position = 'absolute'
  container.style.left = '-9999px'

  try {
    // Use html2canvas to convert the container to a canvas with improved settings
    const canvas = await html2canvas(container, {
      scale: 1.5, // Balance between quality and size
      useCORS: true,
      logging: false,
      allowTaint: true,
      backgroundColor: '#ffffff',
      imageTimeout: 30000 // Longer timeout for complex reports
    })

    // Remove the temporary container
    document.body.removeChild(container)

    // Create a new PDF document
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'pt', // Use points for more precise sizing
      format: 'a4',
      compress: true
    })

    // Get PDF dimensions in points
    const pdfWidth = pdf.internal.pageSize.getWidth()
    const pdfHeight = pdf.internal.pageSize.getHeight()
    
    // Calculate content scale to fit everything on one page
    const scale = Math.min(
      (pdfWidth - 40) / canvas.width, // 20pt margin on each side
      (pdfHeight - 40) / canvas.height // 20pt margin on top and bottom
    )
    
    // Calculate dimensions after scaling
    const scaledWidth = canvas.width * scale
    const scaledHeight = canvas.height * scale
    
    // Calculate positions to center content
    const x = (pdfWidth - scaledWidth) / 2
    const y = (pdfHeight - scaledHeight) / 2
    
    // Add the entire image to a single page
    pdf.addImage(
      canvas,
      'PNG',
      x,
      y,
      scaledWidth,
      scaledHeight,
      undefined,
      'FAST'
    )

    // Save the PDF
    pdf.save(fileName)
    Toast.success(`PDF saved as ${fileName} (all content on a single page)`)
    
    return Promise.resolve()
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown rendering error'
    Toast.error('Error rendering PDF: ' + errorMessage)
    
    // Remove the temporary container if it's still in the DOM
    if (document.body.contains(container)) {
      document.body.removeChild(container)
    }
    
    return Promise.reject(error)
  }
}

// Function to export a single report to PDF
export const exportSingleReportToPDF = async (report: any): Promise<void> => {
  try {
    Toast.info('Preparing PDF export...')
    
    // Generate file name
    let fileName = 'Mystery_Shopping_Report.pdf'
    if (report.name) {
      fileName = `Report_${report.name.replace(/[/.*?[\]]/g, '')}.pdf`
    } else if (report.id) {
      fileName = `Report_${String(report.id).substring(0, 8)}.pdf`
    } else if (report._id) {
      fileName = `Report_${String(report._id).substring(0, 8)}.pdf`
    } else if (report.primary_field?.value) {
      fileName = `Report_${report.primary_field.value.replace(/[/.*?[\]]/g, '')}.pdf`
    }
    
    // Create PDF container
    const container = createPDFContainer(report)
    
    // Generate and save PDF
    await generatePDF(container, fileName)
  } catch (error) {
    console.error('Error exporting single report to PDF:', error)
    Toast.error('Failed to export report to PDF')
  }
}

// Function to export multiple reports as a zip of PDFs
export const exportMultipleReportsToPDF = async (reportsArray: any[]): Promise<void> => {
  try {
    Toast.info(`Creating PDF files for ${reportsArray.length} reports...`)

    // Create a new JSZip instance
    const zip = new JSZip()

    // Process each report
    for (const [index, report] of reportsArray.entries()) {
      try {
        // Update progress
        Toast.info(`Processing report ${index + 1} of ${reportsArray.length}...`)

        // Create PDF container for this report
        const container = createPDFContainer(report)
        
        // Temporarily append to document to capture with html2canvas
        document.body.appendChild(container)
        container.style.position = 'absolute'
        container.style.left = '-9999px'

        try {
          // Use html2canvas to convert the container to a canvas
          const canvas = await html2canvas(container, {
            scale: 1.5, // Balance between quality and size
            useCORS: true,
            logging: false,
            allowTaint: true,
            backgroundColor: '#ffffff',
            imageTimeout: 30000 // Longer timeout for complex reports
          })

          // Remove the temporary container
          document.body.removeChild(container)

          // Create a new PDF document
          const pdf = new jsPDF({
            orientation: 'portrait',
            unit: 'pt', // Use points for more precise sizing
            format: 'a4',
            compress: true
          })

          // Get PDF dimensions in points
          const pdfWidth = pdf.internal.pageSize.getWidth()
          const pdfHeight = pdf.internal.pageSize.getHeight()
          
          // Calculate content scale to fit everything on one page
          const scale = Math.min(
            (pdfWidth - 40) / canvas.width, // 20pt margin on each side
            (pdfHeight - 40) / canvas.height // 20pt margin on top and bottom
          )
          
          // Calculate dimensions after scaling
          const scaledWidth = canvas.width * scale
          const scaledHeight = canvas.height * scale
          
          // Calculate positions to center content
          const x = (pdfWidth - scaledWidth) / 2
          const y = (pdfHeight - scaledHeight) / 2
          
          // Add the entire image to a single page
          pdf.addImage(
            canvas,
            'PNG',
            x,
            y,
            scaledWidth,
            scaledHeight,
            undefined,
            'FAST'
          )

          // Generate filename and blob for zip
          let fileName = 'report.pdf'
          if (report.name) {
            fileName = `Report_${report.name.replace(/[/.*?[\]]/g, '')}.pdf`
          } else if (report.id) {
            fileName = `Report_${String(report.id).substring(0, 8)}.pdf`
          } else if (report._id) {
            fileName = `Report_${String(report._id).substring(0, 8)}.pdf`
          } else if (report.primary_field?.value) {
            fileName = `Report_${report.primary_field.value.replace(/[/.*?[\]]/g, '')}.pdf`
          }

          // Get PDF as blob and add to zip
          const pdfBlob = pdf.output('blob')
          zip.file(fileName, pdfBlob)
        } catch (renderError) {
          console.error(`Error rendering PDF for report ${index + 1}:`, renderError)
          // Remove the temporary container if it's still in the DOM
          if (document.body.contains(container)) {
            document.body.removeChild(container)
          }
        }
      } catch (reportError) {
        console.error(`Error processing report ${index + 1}:`, reportError)
      }
    }

    // Generate filename with current date
    const dateString = new Date().toISOString().split('T')[0]
    const zipFileName = `Mystery_Shopping_Reports_${dateString}.zip`

    // Generate and download the zip file
    const zipBlob = await zip.generateAsync({ type: 'blob' })
    FileSaver.saveAs(zipBlob, zipFileName)

    Toast.success(`Reports exported to ${zipFileName}`)
  } catch (error) {
    console.error('Error exporting multiple reports to PDF:', error)
    Toast.error('Failed to export reports to PDF')
  }
}

export default {
  exportSingleReportToPDF,
  exportMultipleReportsToPDF
} 