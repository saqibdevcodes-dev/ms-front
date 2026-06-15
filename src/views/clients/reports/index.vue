<script setup lang="ts">
import { onMounted, ref, computed, defineComponent, h, watch } from 'vue'
import DefaultLayout from '@/layouts/DefaultLayout.vue'
import { Toast } from '@/utils/toast'
import Loader from '@/components/ui/Loader.vue'
import 'ag-grid-community/styles/ag-grid.css'
import 'ag-grid-community/styles/ag-theme-quartz.css'
import { AgGridVue } from 'ag-grid-vue3'
import { Client } from '@/stores/client'
import { Templates } from '@/stores/templates'
import { Reports } from '@/stores/reports'
import { Ranges } from '@/stores/ranges'
import { getRatingColor, getRatingText } from '@/utils/ratings'
import Button from '@/components/Buttons/Button.vue'
import Modal from '@/components/modal/modal.vue'
import Dropdown from 'primevue/dropdown'
import router from '@/router'
import { Auth } from '@/stores/auth'
import Swal from 'sweetalert2'
import FileSaver from 'file-saver'
import JSZip from 'jszip'
import pdfExport from '@/stores/reports/pdfExport'
import mediaExport from '@/stores/reports/mediaExport'
import { ExcelExport } from '@/stores/reports/excelExport'
import { generateVideoUrl, generatePdfUrl } from '@/utils/mediaLinks'

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

const getCookie = (name: string): string | null => {
  const nameEQ = name + '='
  const cookies = document.cookie.split(';')
  for (let i = 0; i < cookies.length; i++) {
    let cookie = cookies[i]
    while (cookie.charAt(0) === ' ') {
      cookie = cookie.substring(1, cookie.length)
    }
    if (cookie.indexOf(nameEQ) === 0) {
      return decodeURIComponent(cookie.substring(nameEQ.length, cookie.length))
    }
  }
  return null
}

// Define component options including name
defineOptions({
  name: 'ClientReportsIndexPage'
})

const reports = ref<any[]>([]) // Explicitly typing as any[] to avoid TypeScript 'never' errors
const isLoading = ref(false)
const allReports = ref<any[]>([])

// Define template interface
interface Template {
  id: string
  template_name: string
  branch_code?: string
  created_at: string
  [key: string]: any
}
// Template selection modal state
const selectedTemplate = ref<Template | null>(null)

// Function to handle template selection and create a new report
const createNewReport = () => {
  if (!selectedTemplate.value) {
    Swal.fire({
      title: 'Template Required',
      text: 'Please select a template to create a new report',
      icon: 'warning',
      confirmButtonText: 'OK'
    })
    return
  }

  // Redirect to the add report page with the selected template ID
  router.push(`/client/report/add?template=${selectedTemplate.value.id}`)
}

// Video existence cache to avoid re-checking the same URLs
const videoExistenceCache = new Map<string, boolean>()

// Function to clear video cache (useful for debugging or when videos are updated)
const clearVideoCache = () => {
  videoExistenceCache.clear()
  console.log('Video existence cache cleared')
}

//helper video check with caching and retry logic
async function checkVideoExists(url: string, retries: number = 2): Promise<boolean> {
  // Check cache first
  if (videoExistenceCache.has(url)) {
    console.log('Video exists (cached):', videoExistenceCache.get(url), url)
    return videoExistenceCache.get(url)!
  }

  // Validate URL first
  if (!url || !url.startsWith('http')) {
    console.log('Invalid video URL:', url)
    videoExistenceCache.set(url, false)
    return false
  }

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 5000) // 5 second timeout

      const res = await fetch(url, {
        method: 'HEAD',
        signal: controller.signal,
        cache: 'no-cache' // Ensure fresh check
      })

      clearTimeout(timeoutId)

      const exists = res.ok
      console.log(`Video exists (attempt ${attempt + 1}):`, exists, url)

      // Cache the result
      videoExistenceCache.set(url, exists)

      return exists
    } catch (err) {
      console.log(`Video check failed (attempt ${attempt + 1}):`, err, url)

      // If this is the last attempt, cache the failure
      if (attempt === retries) {
        videoExistenceCache.set(url, false)
        return false
      }

      // Wait before retry (exponential backoff)
      await new Promise((resolve) => setTimeout(resolve, Math.pow(2, attempt) * 1000))
    }
  }

  return false
}

// Function to close the modal
const closeTemplateModal = () => {
  Reports().showTemplateModal = false
  selectedTemplate.value = null
}

// Function to fetch reports
const fetchReports = async () => {
  isLoading.value = true
  try {
    // Make sure client is initialized first
    if (!Client().selected_client) {
      console.log('Client not initialized, initializing now...')
      await Client().init()
    }

    // Initialize the Reports store if needed
    await Reports().init()

    // Initialize the Ranges store and fetch ranges data
    console.log('Fetching ranges data...')
    await Ranges().fetch({ forceRefresh: true })
    console.log('Ranges data fetched')

    // Get all reports with force refresh option - always force refresh in production
    console.log('Fetching reports with force refresh...')
    await Reports().fetchReports({ forceRefresh: true })
    let allReportsData = JSON.parse(JSON.stringify(Reports().reports))

    console.log(`Fetched ${allReportsData.length} reports from server`)

    // Clear any existing grid filters that might be hiding data
    if (gridApi.value && typeof gridApi.value.setFilterModel === 'function') {
      console.log('Clearing grid filters')
      gridApi.value.setFilterModel(null)
    }

    // Filter draft reports from other users if current user is admin
    const isAdmin = Auth().isAdmin()
    const currentUserId = Reports().getCurrentUserId()

    if (isAdmin) {
      // Admin should only see draft reports they created, and all other status reports
      allReportsData = allReportsData.filter((report) => {
        const reportCreatorId = report.creator?.id || report.created_by
        const isCreator = reportCreatorId === currentUserId

        // If it's a draft, only show if user is the creator
        if (report.status === 'draft') {
          return isCreator
        }

        // Show all non-draft reports
        return true
      })

      console.log(
        `Filtered reports for admin: ${allReportsData.length} reports after filtering draft reports from other users`
      )
    }

    // Assign filtered reports to reports.value
    reports.value = allReportsData

    // Process reports to ensure all required fields are present and accessible
    reports.value = JSON.parse(
      JSON.stringify(
        reports.value.map((report) => {
          // Create a new object to avoid mutation issues
          const processedReport = { ...report }

          // Add client name for better display if it's missing
          if (Client().selected_client?.name && !processedReport.client_name) {
            processedReport.client_name = Client().selected_client?.name
          }

          // Ensure ID is accessible (for ag-grid)
          if (!processedReport.id && processedReport._id) {
            processedReport.id = processedReport._id
          }

          // Ensure created_at is present and correctly formatted
          if (!processedReport.created_at && processedReport.createdAt) {
            processedReport.created_at = processedReport.createdAt
          }

          // If still no created_at, check if it's in the content object
          if (!processedReport.created_at && processedReport.content) {
            try {
              const content =
                typeof processedReport.content === 'string'
                  ? JSON.parse(processedReport.content)
                  : processedReport.content

              if (content.created_at || content.createdAt) {
                processedReport.created_at = content.created_at || content.createdAt
              }
            } catch (error) {
              console.error('Error parsing content for created_at:', error)
            }
          }

          // Last resort: use current date if no date is available
          if (!processedReport.created_at) {
            console.log('No created_at found for report:', processedReport.id)
            processedReport.created_at = new Date().toISOString()
          }

          // Ensure primary_field is populated if it exists in content
          if (!processedReport.primary_field && processedReport.content) {
            // Parse content if it's a string
            let content = processedReport.content
            if (typeof content === 'string') {
              try {
                content = JSON.parse(content)
                processedReport.content = content
              } catch (error) {
                console.error('Error parsing report content:', error)
                content = {}
              }
            }

            // Extract primary field from content
            if (content.primaryField) {
              processedReport.primary_field = content.primaryField
            } else if (content.primaryIdentifierField && content.selectedFieldValues) {
              const fieldName = content.primaryIdentifierField
              const fieldVal = content.selectedFieldValues[fieldName]

              processedReport.primary_field = {
                name: fieldName,
                value: typeof fieldVal === 'object' ? fieldVal.name || fieldVal.value : fieldVal
              }
            }
          }

          // Make sure table name is present
          if (!processedReport.table && processedReport.table_name) {
            processedReport.table = processedReport.table_name
          }

          console.log(
            `Processed report: ID=${processedReport.id}, Name=${
              processedReport.template_name
            }, Created=${processedReport.created_at}, Primary=${
              processedReport.primary_field?.value || processedReport.branch_code
            }`
          )
          return processedReport
        })
      )
    )

    console.log(`Fetched and processed ${reports.value.length} reports`)

    // Debug created_at values
    reports.value.forEach((report, index) => {
      console.log(`Report ${index} created_at:`, report.created_at)
    })

    if (reports.value.length === 0) {
      console.log('No reports found or reports not loaded correctly')
    }

    // Final verification to ensure data is properly processed for AG-Grid
    if (reports.value.length > 0) {
      console.log('Performing final data verification for grid compatibility')

      // Ensure all required fields are present in each row
      reports.value = reports.value.map((report) => {
        // Force all objects to have required properties for grid display
        return {
          id: report.id || report._id || Math.random().toString(),
          client_name: report.client_name || Client().selected_client?.name || 'Unknown',
          template_name: report.template_name || 'Unnamed Template',
          status: report.status || 'draft',
          created_at: report.created_at || new Date().toISOString(),
          primary_field: report.primary_field || { name: 'branch_code', value: 'Unknown' },
          content: report.content || {},
          // Keep all original properties
          ...report
        }
      })

      // If grid is ready, update it with the final verified data
      if (gridApi.value && typeof gridApi.value.setRowData === 'function') {
        console.log('Updating grid with verified data')
        try {
          gridApi.value.setRowData(reports.value)
        } catch (err) {
          console.error('Error setting row data with verified data:', err)
        }
      }
    }

    // Filter reports based on user's branch access permissions
    reports.value = filterReportsByUserPermissions(reports.value)
  } catch (error) {
    console.error('Error fetching reports:', error)
    Toast.error('Failed to fetch reports: ' + (error.message || 'Unknown error'))
  } finally {
    isLoading.value = false
  }
}

// Add this after the reports data is loaded in fetchReports function
const filterReportsByUserPermissions = (reportsData) => {
  // Skip filtering for admin users
  if (Auth().isAdmin()) {
    console.log('User is an admin, not filtering reports by branch access')
    return reportsData
  }

  // Get current user's branch assignments
  const isClientUser = Auth().isClientUser()

  // Fix: Define userBranches with a default empty array
  const userBranches = Auth().getUserBranches?.() || []

  console.log(
    `User is ${isClientUser ? 'a client_user' : 'not a client_user'} with ${
      userBranches.length
    } assigned branches`
  )

  // If not a client user or no branch restrictions, return all reports
  if (!isClientUser || userBranches.length === 0) {
    return reportsData
  }

  // Filter reports based on branch permissions
  console.log('Filtering reports based on user branch permissions')
  const filteredReports = reportsData.filter((report) => {
    // Extract branch information from report
    const reportBranchId =
      report.branch_id ||
      report.branch_code ||
      (report.primary_field?.name === 'branch_code' && report.primary_field?.value) ||
      (report.content?.primaryField?.name === 'branch_code' &&
        report.content?.primaryField?.value) ||
      report.content?.selectedFieldValues?.branch_code

    // If no branch info, hide it to be safe
    if (!reportBranchId) {
      console.log(
        `Report ${report.id || report._id} has no branch info, hiding from restricted user`
      )
      return false
    }

    // Check if user has access to this branch
    const hasAccess = Auth().hasBranchAccess?.(reportBranchId) || false

    if (!hasAccess) {
      console.log(
        `Hiding report ${
          report.id || report._id
        } for branch ${reportBranchId} - user doesn't have access`
      )
    }

    return hasAccess
  })

  console.log(
    `Filtered reports: ${filteredReports.length} out of ${reportsData.length} are visible to user`
  )
  return filteredReports
}

// Custom ag-grid overlay components
const CustomLoadingOverlay = defineComponent({
  components: {
    Loader
  },
  template: `
    <div class="ag-overlay-loading-center flex items-center justify-center" style="background-color: rgba(255, 255, 255, 0.8);">
      <Loader size="lg" text="Loading reports..." />
    </div>
  `
})

const CustomNoRowsOverlay = defineComponent({
  components: {
    Loader
  },
  template: `
    <div class="ag-overlay-no-rows-center flex items-center justify-center">
      <div class="flex flex-col items-center p-4">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-12 h-12 text-gray-400 mb-2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m6.75 12l-3-3m0 0l-3 3m3-3v6m-1.5-15H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
        </svg>
        <span class="text-gray-600">No reports found</span>
        <button @click="openTemplateModal" class="mt-3 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
          Create New Report
        </button>
      </div>
    </div>
  `,
  setup() {
    return {
      openTemplateModal: () => Reports().openTemplateModal()
    }
  }
})

const colDefs = ref([
  {
    headerName: 'Sr #',
    valueGetter: (params) => {
      // Return the row index + 1 (to make it 1-indexed)
      return params.node.rowIndex + 1
    },
    filter: true,
    checkboxSelection: true,
    headerCheckboxSelection: true,
    width: 80,
    minWidth: 80,
    maxWidth: 100,
    sortable: false,
    cellClass: 'text-center font-medium'
  },
  {
    field: 'status',
    headerName: 'Status',
    valueGetter: (params) => {
      return params.data?.status || 'draft'
    },
    cellRenderer: (params) => {
      const status = params.value?.toLowerCase() || 'draft'
      const element = document.createElement('div')

      // Apply different text colors based on status
      let textColor = ''
      switch (status) {
        case 'approved':
          textColor = 'text-green-600 font-medium'
          break
        case 'rejected':
          textColor = 'text-red-600 font-medium'
          break
        case 'submitted':
          textColor = 'text-yellow-600 font-medium'
          break
        default:
          textColor = 'text-gray-600'
      }

      // Capitalize first letter of status
      const capitalizedStatus = status.charAt(0).toUpperCase() + status.slice(1)

      element.className = textColor
      element.innerText = capitalizedStatus
      return element
    },
    filter: 'agTextColumnFilter',
    filterParams: {
      buttons: ['reset', 'apply']
    },
    sortable: true,
    flex: 1,
    minWidth: 100
  },
  // Add Month column
  {
    headerName: 'Date of Visit',
    valueGetter: (params) => {
      try {
        // First priority: Check for date field directly in the report object
        if (params.data?.content?.date) {
          const date = new Date(params.data.content.date)
          if (!isNaN(date.getTime())) {
            const day = date.getDate().toString().padStart(2, '0')
            const month = (date.getMonth() + 1).toString().padStart(2, '0')
            const year = date.getFullYear()
            return `${day}/${month}/${year}`
          }
        }

        // Second priority: Try to get date from selectedFieldValues
        if (params.data?.content?.selectedFieldValues) {
          // Look for date field in selectedFieldValues (common date field names)
          const fieldValues = params.data.content.selectedFieldValues
          for (const key of ['date', 'visit_date', 'audit_date', 'inspection_date']) {
            if (fieldValues[key]) {
              const dateValue = fieldValues[key].value || fieldValues[key]
              if (dateValue) {
                // If it's already a formatted date string, return it
                if (typeof dateValue === 'string' && dateValue.includes('/')) {
                  return dateValue
                }

                // Otherwise try to format it as date
                const date = new Date(dateValue)
                if (!isNaN(date.getTime())) {
                  const day = date.getDate().toString().padStart(2, '0')
                  const month = (date.getMonth() + 1).toString().padStart(2, '0')
                  const year = date.getFullYear()
                  return `${day}/${month}/${year}`
                }
              }
            }
          }
        }

        // Third priority: Check customFields array for date fields
        if (params.data?.content?.customFields && Array.isArray(params.data.content.customFields)) {
          const dateField = params.data.content.customFields.find(
            (f) =>
              f.fieldType === 'date' ||
              f.type === 'date' ||
              (f.label && f.label.toLowerCase().includes('date'))
          )

          if (dateField && dateField.value) {
            const date = new Date(dateField.value)
            if (!isNaN(date.getTime())) {
              const day = date.getDate().toString().padStart(2, '0')
              const month = (date.getMonth() + 1).toString().padStart(2, '0')
              const year = date.getFullYear()
              return `${day}/${month}/${year}`
            }
            return dateField.value
          }
        }
      } catch (error) {
        console.error('Error getting report date:', error)
      }
      return 'N/A'
    },
    cellRenderer: (params) => {
      if (!params.value || params.value === 'N/A') {
        return 'N/A'
      }

      // Create element with nice formatting
      const element = document.createElement('div')
      element.className = 'px-2 mt-3 text-blue-800 rounded text-center text-xs font-medium'
      element.innerText = params.value

      return element
    },
    filter: 'agTextColumnFilter',
    filterParams: {
      buttons: ['reset', 'apply']
    },
    sortable: true,
    width: 120,
    minWidth: 120
  },

  {
    headerName: 'Actual Month',
    valueGetter: (params) => {
      try {
        // Try to get the date from created_at field
        const dateStr = params.data?.created_at || params.data?.updated_at
        if (dateStr) {
          const date = new Date(dateStr)
          // Format to get month name (e.g., "January", "February")
          return date.toLocaleString('default', { month: 'long' })
        }
      } catch (error) {
        console.error('Error getting month:', error)
      }
      return 'N/A'
    },
    cellRenderer: (params) => {
      if (!params.value || params.value === 'N/A') {
        return 'N/A'
      }

      // Get month colors based on quarter
      const monthColors = {
        January: { bg: 'bg-blue-100', text: 'text-blue-800' },
        February: { bg: 'bg-blue-100', text: 'text-blue-800' },
        March: { bg: 'bg-blue-100', text: 'text-blue-800' },
        April: { bg: 'bg-green-100', text: 'text-green-800' },
        May: { bg: 'bg-green-100', text: 'text-green-800' },
        June: { bg: 'bg-green-100', text: 'text-green-800' },
        July: { bg: 'bg-yellow-100', text: 'text-yellow-800' },
        August: { bg: 'bg-yellow-100', text: 'text-yellow-800' },
        September: { bg: 'bg-yellow-100', text: 'text-yellow-800' },
        October: { bg: 'bg-red-100', text: 'text-red-800' },
        November: { bg: 'bg-red-100', text: 'text-red-800' },
        December: { bg: 'bg-red-100', text: 'text-red-800' }
      }

      const colors = monthColors[params.value] || { bg: 'bg-gray-100', text: 'text-gray-800' }

      // Create element
      const element = document.createElement('div')
      element.className = `px-2 pt-3 rounded-full text-center text-xs font-medium `
      element.innerText = params.value

      return element
    },
    filter: 'agTextColumnFilter',
    filterParams: {
      buttons: ['reset', 'apply']
    },
    sortable: true,
    width: 120,
    minWidth: 120
  },
  {
    headerName: 'Overall Performance',
    valueGetter: (params) => {
      // Safety check for params.data
      if (!params?.data?.content) {
        return 'N/A'
      }

      try {
        // Check if this report has fatal error conditions
        const hasFatalErrorCondition = checkFatalError(params.data)
        if (hasFatalErrorCondition) {
          return 'FATAL_ERROR'
        }

        // Parse content if it's a string
        const content =
          typeof params.data.content === 'string'
            ? JSON.parse(params.data.content)
            : params.data.content

        // Check if content has reports data with total scores
        if (content?.reports) {
          // Calculate overall score from all sections
          let totalAchieved = 0
          let totalApplicable = 0

          // Loop through all sections in the report to calculate the overall score
          content.reports.forEach((section) => {
            if (section.total_achieved_score !== undefined && section.total_applicable_score) {
              totalAchieved += parseFloat(section.total_achieved_score || 0)
              totalApplicable += parseFloat(section.total_applicable_score || 0)
            }
          })

          // Calculate percentage
          if (totalApplicable > 0) {
            const percentage = (totalAchieved / totalApplicable) * 100
            return percentage.toFixed(2)
          }
        }
      } catch (error) {
        console.error('Error calculating performance:', error)
      }
      return 'N/A'
    },
    cellRenderer: (params) => {
      // Safety check
      if (!params?.value || params.value === 'N/A') {
        return 'N/A'
      }

      try {
        // Handle fatal error case
        if (params.value === 'FATAL_ERROR') {
          // Create the container element for fatal error display
          const container = document.createElement('div')
          container.style.padding = '4px'
          container.style.borderRadius = '4px'
          container.style.width = '100%'
          container.style.height = '100%'

          // Create the fatal error cell
          const fatalErrorCell = document.createElement('div')
          fatalErrorCell.style.display = 'flex'
          fatalErrorCell.style.alignItems = 'center'
          fatalErrorCell.style.justifyContent = 'center'
          fatalErrorCell.style.width = '100%'
          fatalErrorCell.style.height = '24px'
          fatalErrorCell.style.backgroundColor = '#dc2626' // Red color for fatal error
          fatalErrorCell.style.borderRadius = '4px'
          fatalErrorCell.style.color = '#ffffff'
          fatalErrorCell.style.fontWeight = 'bold'
          fatalErrorCell.style.fontSize = '12px'
          fatalErrorCell.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)'
          fatalErrorCell.innerHTML = `<span>⚠️ 0% - FATAL ERROR</span>`

          container.appendChild(fatalErrorCell)
          return container
        }

        // Normal performance calculation
        const score = parseFloat(params.value)
        const color = getRatingColor(score)
        const rating = getRatingText(score)

        // Determine emoji based on rating
        let emoji = ''
        if (rating === 'Excellent') {
          emoji = '🌟'
        } else if (rating === 'Very Good') {
          emoji = '✨'
        } else if (rating === 'Good') {
          emoji = '✅'
        } else if (rating === 'Average') {
          emoji = '👍'
        } else if (rating === 'Below Average') {
          emoji = '⚠️'
        } else {
          emoji = '❌'
        }

        // Determine text color based on background color brightness
        const r = parseInt(color.substring(1, 3), 16)
        const g = parseInt(color.substring(3, 5), 16)
        const b = parseInt(color.substring(5, 7), 16)
        const brightness = (r * 299 + g * 587 + b * 114) / 1000
        const textColor = brightness > 125 ? '#333333' : '#ffffff'

        // Create the container element
        const container = document.createElement('div')
        container.style.padding = '4px'
        container.style.borderRadius = '4px'
        container.style.width = '100%'
        container.style.height = '100%'

        // Create the simple colored cell that fills the entire width
        const coloredCell = document.createElement('div')
        coloredCell.style.display = 'flex'
        coloredCell.style.alignItems = 'center'
        coloredCell.style.justifyContent = 'center'
        coloredCell.style.width = '100%'
        coloredCell.style.height = '24px'
        coloredCell.style.backgroundColor = color
        coloredCell.style.borderRadius = '4px'
        coloredCell.style.color = textColor
        coloredCell.style.fontWeight = 'bold'
        coloredCell.style.fontSize = '12px'
        coloredCell.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)'
        coloredCell.innerHTML = `<span>${emoji} ${score}% - ${rating}</span>`

        // Assemble the components
        container.appendChild(coloredCell)

        return container
      } catch (error) {
        console.error('Error rendering performance score:', error)
        return 'Error'
      }
    },
    filter: 'agTextColumnFilter',
    filterParams: {
      buttons: ['reset', 'apply'],
      defaultOption: 'contains'
    },
    flex: 1,
    minWidth: 200
  },
  {
    headerName: 'Created By',
    valueGetter: (params) => {
      // Try to get the creator name with multiple fallbacks
      try {
        if (params.data?.creator?.name) {
          return params.data.creator.name
        } else if (params.data?.created_by_name) {
          return params.data.created_by_name
        } else if (params.data?.creator_name) {
          return params.data.creator_name
        }
      } catch (error) {
        console.error('Error getting creator name:', error)
      }
      return 'Unknown'
    },
    filter: 'agTextColumnFilter',
    filterParams: {
      buttons: ['reset', 'apply'],
      debounceMs: 200
    },
    flex: 1,
    minWidth: 120
  },
  // New column for Creation Time - only visible to admin users
  {
    headerName: 'Creation Time',
    valueGetter: (params) => {
      try {
        // Only show this column for admin users
        if (!Auth().isAdmin()) {
          return null
        }

        // Extract the timer information from the report content
        const content =
          typeof params.data?.content === 'string'
            ? JSON.parse(params.data.content)
            : params.data?.content

        // Try to get the time from timerInfo in the content
        if (content?.timerInfo?.formattedTime) {
          return content.timerInfo.formattedTime
        }

        // Alternative: check if elapsed_time_seconds is available at the top level
        if (params.data?.elapsed_time_seconds) {
          const seconds = params.data.elapsed_time_seconds
          const hours = Math.floor(seconds / 3600)
          const minutes = Math.floor((seconds % 3600) / 60)
          const remainingSeconds = seconds % 60
          return `${hours.toString().padStart(2, '0')}:${minutes
            .toString()
            .padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`
        }

        return 'N/A'
      } catch (error) {
        console.error('Error getting creation time:', error)
        return 'Error'
      }
    },
    // Custom cell renderer to add visual elements to the time display
    cellRenderer: (params) => {
      if (!Auth().isAdmin()) {
        return null
      }

      // Create the container element
      const container = document.createElement('div')
      container.className = 'flex items-center justify-center gap-1.5'

      // Create the timer icon
      const icon = document.createElement('span')
      icon.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      `

      // Create the time display element
      const timeText = document.createElement('span')
      timeText.className = 'font-mono'

      // Get the time value
      const timeValue = params.value
      timeText.textContent = timeValue || 'N/A'

      // Color-code the time based on duration
      if (timeValue && timeValue !== 'N/A' && timeValue !== 'Error') {
        try {
          // Parse the time string (HH:MM:SS)
          const [hours, minutes, seconds] = timeValue.split(':').map(Number)
          const totalMinutes = hours * 60 + minutes

          // Apply different styling based on duration
          if (totalMinutes < 5) {
            // Very quick report (less than 5 minutes)
            timeText.className += ' text-green-600'
            container.title = 'Quick completion (less than 5 minutes)'
          } else if (totalMinutes < 15) {
            // Normal duration (5-15 minutes)
            timeText.className += ' text-blue-600'
            container.title = 'Normal completion time (5-15 minutes)'
          } else if (totalMinutes < 30) {
            // Longer than average (15-30 minutes)
            timeText.className += ' text-orange-500'
            container.title = 'Longer than average (15-30 minutes)'
          } else {
            // Very long time (more than 30 minutes)
            timeText.className += ' text-red-600'
            container.title = 'Extended completion time (more than 30 minutes)'
          }
        } catch (error) {
          console.error('Error parsing time:', error)
        }
      }

      // Assemble the container
      container.appendChild(icon)
      container.appendChild(timeText)

      return container
    },
    filter: 'agTextColumnFilter',
    filterParams: {
      buttons: ['reset', 'apply'],
      debounceMs: 200
    },
    // Add a tooltip to explain what this column represents
    tooltipValueGetter: () =>
      'The time it took to create this report, measured from when the template was loaded until the report was saved.',
    // Hide this column for non-admin users using CSS
    headerClass: () => {
      return Auth().isAdmin() ? '' : 'hidden'
    },
    // Add sorting capability
    sortable: true,
    // Custom comparator for time-based sorting
    comparator: (valueA, valueB, nodeA, nodeB) => {
      if (valueA === 'N/A' || valueA === 'Error') return 1 // Push N/A and errors to the bottom
      if (valueB === 'N/A' || valueB === 'Error') return -1

      // Parse time strings into seconds for comparison
      try {
        const getSeconds = (timeStr) => {
          const [hours, minutes, seconds] = timeStr.split(':').map(Number)
          return hours * 3600 + minutes * 60 + seconds
        }

        const secondsA = getSeconds(valueA)
        const secondsB = getSeconds(valueB)

        return secondsA - secondsB // Ascending sort (lower duration first)
      } catch (error) {
        console.error('Error comparing time values:', error)
        return 0
      }
    },
    flex: 1,
    minWidth: 120,
    suppressSizeToFit: true
  },
  {
    headerName: 'Media',
    width: 210,
    cellRenderer: (params) => {
      const container = document.createElement('div')
      container.className = 'flex items-center justify-center gap-2'

      // --- VIDEO BUTTON ---
      const videoButton = document.createElement('a')
      videoButton.className = 'p-1 rounded transition-colors cursor-pointer relative group'
      videoButton.title = 'View video records for this report'
      videoButton.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
           stroke-width="1.5" stroke="currentColor"
           class="size-5 text-gray-400">
        <path stroke-linecap="round" stroke-linejoin="round"
              stroke-linejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M12 18.75H4.5a2.25 2.25 0 0 1-2.25-2.25V9m12.841 9.091L16.5 19.5m-1.409-1.409c.407-.407.659-.97.659-1.591v-9a2.25 2.25 0 0 0-2.25-2.25h-9c-.621 0-1.184.252-1.591.659m12.182 12.182L2.909 5.909M1.5 4.5l1.409 1.409" />
      </svg>
      <span class="hidden group-hover:block absolute -bottom-5 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded">Video</span>
    `
      videoButton.style.pointerEvents = 'none' // initially disabled
      container.appendChild(videoButton)

      // ✅ async check if video really exists
      const videoUrl =
        params.data?.media_links?.video_url ||
        params.data?.video_url ||
        params.data?.media_links?.video_link ||
        generateVideoUrl(params.data)
      checkVideoExists(videoUrl).then((exists) => {
        console.log('Video exists:', exists, videoUrl)

        const svgEl = videoButton.querySelector('svg')
        if (svgEl) {
          if (exists) {
            // Green icon for working video
            svgEl.classList.remove('text-gray-400')
            svgEl.classList.add('text-green-500')
            videoButton.style.pointerEvents = 'auto'
            videoButton.title = 'View video records for this reports'
            videoButton.onclick = (e) => {
              e.preventDefault()
              e.stopPropagation()
              Reports().pushMediaRouter(params.data.id + '/video')
            }
          } else {
            // Red icon for no video
            svgEl.classList.remove('text-gray-400')
            svgEl.classList.add('text-red-500')
            videoButton.title = 'No video available for this report'
          }
        }
      })

      // Picture button
      const pictureButton = document.createElement('a')
      pictureButton.className =
        'p-1 rounded hover:bg-blue-100 transition-colors cursor-pointer relative group'
      pictureButton.title = 'View pictures for this report'
      pictureButton.href = `#/client/report/${params.data.id}/pictures`
      pictureButton.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-5 text-blue-500">
          <path stroke-linecap="round" stroke-linejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
        </svg>
        <span class="hidden group-hover:block absolute -bottom-5 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded">Photos</span>
      `
      pictureButton.onclick = (event) => {
        event.preventDefault()
        event.stopPropagation()
        Reports().pushMediaRouter(params.data.id + '/picture')
      }
      container.appendChild(pictureButton)

      // Audio button
      const audioButton = document.createElement('a')
      audioButton.className =
        'p-1 rounded hover:bg-blue-100 transition-colors cursor-pointer relative group'
      audioButton.title = 'Listen to audio recordings for this report'
      audioButton.href = `#/client/report/${params.data.id}/audio`
      audioButton.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-5 text-blue-500">
          <path stroke-linecap="round" stroke-linejoin="round" d="M19.114 5.636a9 9 0 0 1 0 12.728M16.463 8.288a5.25 5.25 0 0 1 0 7.424M6.75 8.25l4.72-4.72a.75.75 0 0 1 1.28.53v15.88a.75.75 0 0 1-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.009 9.009 0 0 1 2.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75Z" />
        </svg>
        <span class="hidden group-hover:block absolute -bottom-5 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded">Audio</span>
      `
      audioButton.onclick = (event) => {
        event.preventDefault()
        event.stopPropagation()
        Reports().pushMediaRouter(params.data.id + '/audio')
      }
      container.appendChild(audioButton)

      // Timestamp button
      const timestampButton = document.createElement('a')
      timestampButton.className =
        'p-1 rounded hover:bg-blue-100 transition-colors cursor-pointer relative group'
      timestampButton.title = 'View timestamps for this report'
      timestampButton.href = `#/client/report/${params.data.id}/timestamps`
      timestampButton.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-5 text-blue-500">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
        <span class="hidden group-hover:block absolute -bottom-5 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded">Time</span>
      `
      timestampButton.onclick = (event) => {
        event.preventDefault()
        event.stopPropagation()
        router.push(`/client/report/view/${params.data.id}/timestamps`)
      }
      container.appendChild(timestampButton)

      // PDF button
      const pdfButton = document.createElement('a')
      pdfButton.className =
        'p-1 rounded hover:bg-blue-100 transition-colors cursor-pointer relative group'
      pdfButton.title = 'Download PDF'
      pdfButton.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-5 text-blue-500">
          <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
        </svg>
        <span class="hidden group-hover:block absolute -bottom-5 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded">PDF</span>
      `
      pdfButton.onclick = (event) => {
        event.preventDefault()
        event.stopPropagation()
        
        // Debug logging
        console.log('=== PDF Button Clicked ===')
        console.log('Full report data:', params.data)
        console.log('media_links:', params.data?.media_links)
        console.log('pdf_url from media_links:', params.data?.media_links?.pdf_url)
        console.log('pdf_url direct:', params.data?.pdf_url)
        
        // Only use media_links.pdf_url, don't generate on the fly
        const pdfUrl = params.data?.media_links?.pdf_url || params.data?.pdf_url
        
        console.log('Final PDF URL:', pdfUrl)
        
        if (pdfUrl) {
          console.log('Downloading PDF:', pdfUrl)
          
          // Create a temporary link element to trigger download
          const link = document.createElement('a')
          link.href = pdfUrl
          link.download = `Report_${params.data.id || 'download'}.pdf`
          link.target = '_blank'
          document.body.appendChild(link)
          link.click()
          document.body.removeChild(link)
        } else {
          console.warn('No PDF URL available for this report')
          console.warn('Available keys in params.data:', Object.keys(params.data || {}))
        }
      }
      container.appendChild(pdfButton)

      return container
    },
    suppressSizeToFit: true
  },
  {
    headerName: 'Created By',
    valueGetter: (params) => {
      // Try to get the creator name with multiple fallbacks
      try {
        if (params.data?.creator?.name) {
          return params.data.creator.name
        } else if (params.data?.created_by_name) {
          return params.data.created_by_name
        } else if (params.data?.creator_name) {
          return params.data.creator_name
        }
      } catch (error) {
        console.error('Error getting creator name:', error)
      }
      return 'Unknown'
    },
    filter: 'agTextColumnFilter',
    filterParams: {
      buttons: ['reset', 'apply'],
      debounceMs: 200
    },
    flex: 1,
    minWidth: 120
  },
  // New column for Creation Time - only visible to admin users
  {
    headerName: 'Creation Time',
    valueGetter: (params) => {
      try {
        // Only show this column for admin users
        if (!Auth().isAdmin()) {
          return null
        }

        // Extract the timer information from the report content
        const content =
          typeof params.data?.content === 'string'
            ? JSON.parse(params.data.content)
            : params.data?.content

        // Try to get the time from timerInfo in the content
        if (content?.timerInfo?.formattedTime) {
          return content.timerInfo.formattedTime
        }

        // Alternative: check if elapsed_time_seconds is available at the top level
        if (params.data?.elapsed_time_seconds) {
          const seconds = params.data.elapsed_time_seconds
          const hours = Math.floor(seconds / 3600)
          const minutes = Math.floor((seconds % 3600) / 60)
          const remainingSeconds = seconds % 60
          return `${hours.toString().padStart(2, '0')}:${minutes
            .toString()
            .padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`
        }

        return 'N/A'
      } catch (error) {
        console.error('Error getting creation time:', error)
        return 'Error'
      }
    },
    // Custom cell renderer to add visual elements to the time display
    cellRenderer: (params) => {
      if (!Auth().isAdmin()) {
        return null
      }

      // Create the container element
      const container = document.createElement('div')
      container.className = 'flex items-center justify-center gap-1.5'

      // Create the timer icon
      const icon = document.createElement('span')
      icon.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      `

      // Create the time display element
      const timeText = document.createElement('span')
      timeText.className = 'font-mono'

      // Get the time value
      const timeValue = params.value
      timeText.textContent = timeValue || 'N/A'

      // Color-code the time based on duration
      if (timeValue && timeValue !== 'N/A' && timeValue !== 'Error') {
        try {
          // Parse the time string (HH:MM:SS)
          const [hours, minutes, seconds] = timeValue.split(':').map(Number)
          const totalMinutes = hours * 60 + minutes

          // Apply different styling based on duration
          if (totalMinutes < 5) {
            // Very quick report (less than 5 minutes)
            timeText.className += ' text-green-600'
            container.title = 'Quick completion (less than 5 minutes)'
          } else if (totalMinutes < 15) {
            // Normal duration (5-15 minutes)
            timeText.className += ' text-blue-600'
            container.title = 'Normal completion time (5-15 minutes)'
          } else if (totalMinutes < 30) {
            // Longer than average (15-30 minutes)
            timeText.className += ' text-orange-500'
            container.title = 'Longer than average (15-30 minutes)'
          } else {
            // Very long time (more than 30 minutes)
            timeText.className += ' text-red-600'
            container.title = 'Extended completion time (more than 30 minutes)'
          }
        } catch (error) {
          console.error('Error parsing time:', error)
        }
      }

      // Assemble the container
      container.appendChild(icon)
      container.appendChild(timeText)

      return container
    },
    filter: 'agTextColumnFilter',
    filterParams: {
      buttons: ['reset', 'apply'],
      debounceMs: 200
    },
    // Add a tooltip to explain what this column represents
    tooltipValueGetter: () =>
      'The time it took to create this report, measured from when the template was loaded until the report was saved.',
    // Hide this column for non-admin users using CSS
    headerClass: () => {
      return Auth().isAdmin() ? '' : 'hidden'
    },
    // Add sorting capability
    sortable: true,
    // Custom comparator for time-based sorting
    comparator: (valueA, valueB, nodeA, nodeB) => {
      if (valueA === 'N/A' || valueA === 'Error') return 1 // Push N/A and errors to the bottom
      if (valueB === 'N/A' || valueB === 'Error') return -1

      // Parse time strings into seconds for comparison
      try {
        const getSeconds = (timeStr) => {
          const [hours, minutes, seconds] = timeStr.split(':').map(Number)
          return hours * 3600 + minutes * 60 + seconds
        }

        const secondsA = getSeconds(valueA)
        const secondsB = getSeconds(valueB)

        return secondsA - secondsB // Ascending sort (lower duration first)
      } catch (error) {
        console.error('Error comparing time values:', error)
        return 0
      }
    },
    flex: 1,
    minWidth: 120,
    suppressSizeToFit: true
  }
])

// Function to extract and set up dynamic columns from customFields
const setupDynamicColumns = () => {
  // Skip if no data is available yet
  if (!reports.value || reports.value.length === 0) {
    console.log('No reports data available to set up dynamic columns')
    return
  }

  try {
    console.log('Setting up dynamic columns based on customFields')
    // Get the first report to extract customFields
    const firstReport = reports.value[0]

    // Skip if no content is available
    if (!firstReport?.content) {
      console.log('No content available in reports to extract customFields')
      return
    }

    // Parse content if it's a string
    const content =
      typeof firstReport.content === 'string'
        ? JSON.parse(firstReport.content)
        : firstReport.content

    // Skip if no customFields are available
    if (
      !content.customFields ||
      !Array.isArray(content.customFields) ||
      content.customFields.length === 0
    ) {
      console.log('No customFields found in report content')
      return
    }

    console.log('Found customFields:', content.customFields)

    // Create a fresh base set of columns that excludes any previously added dynamic columns
    // Only keep the default columns that we know should be there
    const staticColumns = [
      // Keep the Sr. column with checkbox selection (first column)
      {
        headerName: 'Sr #',
        valueGetter: (params) => {
          // Return the row index + 1 (to make it 1-indexed)
          return params.node.rowIndex + 1
        },
        filter: true,
        checkboxSelection: true,
        headerCheckboxSelection: true,
        width: 80,
        minWidth: 80,
        maxWidth: 100,
        sortable: true
      },
      // Keep the Report Name column (second column)
      colDefs.value.find((col) => col.headerName === 'Report Name'),
      // Keep the Status column
      colDefs.value.find((col) => col.headerName === 'Status'),
      // Keep the Date column
      colDefs.value.find((col) => col.headerName === 'Date of Visit'),
      // Keep the Month column
      colDefs.value.find((col) => col.headerName === 'Actual Month'),
      // Keep the Overall Performance column
      colDefs.value.find((col) => col.headerName === 'Overall Performance'),
      // Keep the Created column
      colDefs.value.find((col) => col.headerName === 'Created'),
      // Keep the Created By column
      colDefs.value.find((col) => col.headerName === 'Created By'),
      // Keep the Creation Time column (for admin only)
      colDefs.value.find((col) => col.headerName === 'Creation Time'),
      // Keep the Media column
      colDefs.value.find((col) => col.headerName === 'Media')
    ].filter(Boolean) // Remove any undefined values

    // Find where to insert the dynamic columns (after the Actual Month column instead of Report Name)
    let insertIndex = staticColumns.findIndex((col) => col.headerName === 'Sr #') + 1

    // Fallback - if Actual Month column not found, try Date of Visit column
    if (insertIndex <= 0) {
      insertIndex = staticColumns.findIndex((col) => col.headerName === 'Date of Visit') + 1

      // If Date of Visit column not found either, try Status column
      if (insertIndex <= 0) {
        insertIndex = staticColumns.findIndex((col) => col.headerName === 'Status') + 1

        // If Status not found either, insert at position 3 (after primary field)
        if (insertIndex <= 0) {
          insertIndex = 3
        }
      }
    }

    // Get unique headerFields to avoid duplicates
    const uniqueHeaderFields = new Set()
    const uniqueCustomFields = []

    // Filter out duplicates using the headerField as the unique identifier
    content.customFields.forEach((field) => {
      if (field.headerField && !uniqueHeaderFields.has(field.headerField)) {
        uniqueHeaderFields.add(field.headerField)
        uniqueCustomFields.push(field)
      }
    })

    console.log(
      `Found ${uniqueCustomFields.length} unique custom fields out of ${content.customFields.length} total`
    )

    // Create dynamic columns for each UNIQUE customField
    const dynamicColumns = uniqueCustomFields
      .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0))
      .map((field) => ({
        headerName: field.label || 'Unknown Field',
        field: `content.customFields.${field.headerField}`,
        valueGetter: (params) => {
          if (!params.data?.content) return 'N/A'

          try {
            const content =
              typeof params.data.content === 'string'
                ? JSON.parse(params.data.content)
                : params.data.content

            // Try to get value from selectedFieldValues first
            if (content.selectedFieldValues && content.selectedFieldValues[field.headerField]) {
              const value = content.selectedFieldValues[field.headerField]
              return typeof value === 'object' ? value.name || value.value || value.label : value
            }

            // Try to get value from customFields array as fallback
            if (content.customFields && Array.isArray(content.customFields)) {
              const customField = content.customFields.find(
                (f) => f.headerField === field.headerField
              )
              if (customField && customField.value) {
                return customField.value
              }
            }
          } catch (error) {
            console.error(`Error extracting ${field.label} value:`, error)
          }

          return 'N/A'
        },
        filter: 'agTextColumnFilter',
        filterParams: {
          buttons: ['reset', 'apply'],
          debounceMs: 200
        },
        flex: 1,
        minWidth: 120
      }))

    // Insert dynamic columns at the right position
    staticColumns.splice(insertIndex, 0, ...dynamicColumns)

    // Debug new columns
    console.log('New column definitions:')
    staticColumns.forEach((col, index) => {
      console.log(`${index}: ${col.headerName}`)
    })

    // Update the column definitions
    colDefs.value = staticColumns

    // Force grid to update columns if grid is already initialized
    if (gridApi.value) {
      gridApi.value.setColumnDefs(colDefs.value)
      console.log('Applied new column definitions to grid')
    }
  } catch (error) {
    console.error('Error setting up dynamic columns:', error)
  }
}

// Define grid options for better control
const gridOptions = ref({
  // Default column definition
  defaultColDef: {
    sortable: true,
    resizable: true,
    filter: true,
    floatingFilter: true,
    filterParams: {
      buttons: ['reset', 'apply'],
      debounceMs: 200
    }
  },
  // Row selection
  rowSelection: 'multiple',
  // Custom overlay components
  components: {
    loadingOverlay: CustomLoadingOverlay,
    noRowsOverlay: CustomNoRowsOverlay
  },
  // Enable pagination
  pagination: true,
  paginationPageSize: 20,
  // Better defaults
  suppressCellFocus: false,
  enableCellTextSelection: true,
  // Show selection checkbox but don't allow clicking row to select
  rowMultiSelectWithClick: false,
  // This setting prevents row click from selecting the row
  suppressRowClickSelection: true,
  // Make sure empty rows are handled properly
  suppressNoRowsOverlay: false,
  // Ensure data is displayed correctly
  immutableData: false,
  // Ensure all data changes are properly detected
  getRowId: (params) => {
    // Use a unique identifier for each row
    return params.data.id || params.data._id || Math.random().toString()
  }
})

// Create a proper reference to the grid API
const gridApi = ref<any>(null)

// Function to clear all filters
const clearFilters = () => {
  if (gridApi.value) {
    gridApi.value.setFilterModel(null)
  }
}

// Function to handle grid ready event
const onGridReady = (params) => {
  // Save gridApi for later use
  gridApi.value = params.api

  // Register custom components correctly
  // The ag-Grid API provides options through columnApi and api but doesn't have setComponents
  // We need to modify our column definitions to use the direct component references

  console.log('Grid ready, api available:', !!gridApi.value)

  // Ensure all rows have properly formatted created_at values
  if (reports.value && reports.value.length > 0) {
    // Update each row's data to ensure created_at is available
    reports.value.forEach((report) => {
      if (!report.created_at) {
        // Set a fallback value if missing
        const fallbackValue =
          report.createdAt || report.date || report.updated_at || new Date().toISOString()
        console.log(`Setting missing created_at for report ${report.id} to:`, fallbackValue)
        report.created_at = fallbackValue
      }
    })

    // Force refresh the grid
    if (gridApi.value) {
      try {
        if (typeof gridApi.value.setRowData === 'function') {
          gridApi.value.setRowData(reports.value)
        } else if (typeof gridApi.value.applyTransaction === 'function') {
          gridApi.value.applyTransaction({ update: reports.value })
        } else {
          console.warn('Grid API methods not available for updating rows')
        }
      } catch (err) {
        console.error('Error refreshing grid data:', err)
      }
    }
  }

  // Show loading overlay if data is still loading
  if (isLoading.value) {
    gridApi.value.showLoadingOverlay()
  } else if (reports.value.length === 0) {
    gridApi.value.showNoRowsOverlay()
  }

  // Size columns to fit
  setTimeout(() => {
    gridApi.value.sizeColumnsToFit()
  }, 100)

  // Add listener for grid size changes
  window.addEventListener('resize', () => {
    setTimeout(() => {
      gridApi.value.sizeColumnsToFit()
    }, 100)
  })

  console.log('Grid initialized successfully')
}

// Track selected rows
const selectedRows = ref([])

// Function to update selected rows
const onSelectionChanged = (event) => {
  const gridApi = event.api
  selectedRows.value = gridApi.getSelectedRows()
  console.log('Selected rows:', selectedRows.value)
}

// Function to delete multiple selected reports
const deleteSelectedReports = async () => {
  // Check if any reports are selected
  if (selectedRows.value.length === 0) {
    Swal.fire({
      title: 'No Reports Selected',
      text: 'Please select at least one report to delete',
      icon: 'warning',
      confirmButtonText: 'OK'
    })
    return
  }

  // Confirm deletion
  const result = await Swal.fire({
    title: `Delete ${selectedRows.value.length > 1 ? 'Reports' : 'Report'}?`,
    text: `Are you sure you want to delete ${selectedRows.value.length} selected ${
      selectedRows.value.length > 1 ? 'reports' : 'report'
    }? This action cannot be undone.`,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#d33',
    cancelButtonColor: '#3085d6',
    confirmButtonText: 'Yes, delete',
    cancelButtonText: 'Cancel'
  })

  // If confirmed, proceed with deletion
  if (result.isConfirmed) {
    // Show loading state
    isLoading.value = true

    try {
      // Get all report IDs
      const reportIds = selectedRows.value.map((row) => ({
        id: row.id || row._id,
        table: row.table || row.table_name
      }))

      // Delete reports one by one and track success/failure
      let successCount = 0
      let failureCount = 0

      for (const report of reportIds) {
        try {
          await Reports().deleteReport(report.id, report.table)
          successCount++
        } catch (error) {
          console.error(`Error deleting report ${report.id}:`, error)
          failureCount++
        }
      }

      // Show result message
      if (successCount > 0) {
        let message = `Successfully deleted ${successCount} ${
          successCount > 1 ? 'reports' : 'report'
        }`
        if (failureCount > 0) {
          message += `, but failed to delete ${failureCount} ${
            failureCount > 1 ? 'reports' : 'report'
          }`
        }
        Swal.fire('Deleted!', message, failureCount > 0 ? 'warning' : 'success')
      } else {
        Swal.fire('Error', `Failed to delete ${failureCount} reports`, 'error')
      }

      // Clear selection
      selectedRows.value = []

      // Programmatically deselect rows in the grid
      if (gridApi.value) {
        gridApi.value.deselectAll()
      }

      // Refresh the grid with latest data from backend instead of fetchReports()
      await forceRefreshGridData()
    } catch (error) {
      console.error('Error in bulk delete process:', error)
      Swal.fire('Error', 'Failed to delete reports: ' + (error.message || 'Unknown error'), 'error')
    } finally {
      isLoading.value = false
    }
  }
}

// Function to handle row click event to view report
const onRowClicked = (event) => {
  // Only process if we have valid data with an ID
  if (event?.data?.id) {
    const reportId = event.data.id
    const tableId = event.data.table

    // Construct the table query parameter if available
    const tableQuery = tableId ? `?table=${tableId}` : ''

    console.log(`Navigating to view report: ${reportId}${tableQuery}`)

    // Navigate to the report view page
    router.push(`/client/report/view/${reportId}${tableQuery}`)
  }
}

// Function to update status of selected reports
const updateSelectedReportsStatus = async (newStatus) => {
  // Only admins can update report status
  if (!isAdmin.value) {
    Toast.error('Only administrators can approve or reject reports')
    return
  }

  if (selectedRows.value.length === 0) {
    console.log('No rows selected for status update')
    return
  }

  // Confirm status change
  const statusText = newStatus === 'approved' ? 'approve' : 'reject'
  const result = await Swal.fire({
    title: `${newStatus === 'approved' ? 'Approve' : 'Reject'} ${
      selectedRows.value.length > 1 ? 'Reports' : 'Report'
    }?`,
    text: `Are you sure you want to ${statusText} ${selectedRows.value.length} selected ${
      selectedRows.value.length > 1 ? 'reports' : 'report'
    }?`,
    icon: 'question',
    showCancelButton: true,
    confirmButtonColor: newStatus === 'approved' ? '#28a745' : '#dc3545',
    cancelButtonColor: '#6c757d',
    confirmButtonText: `Yes, ${statusText}`,
    cancelButtonText: 'Cancel'
  })

  // If confirmed, proceed with status update
  if (result.isConfirmed) {
    isLoading.value = true
    try {
      // Get all report IDs
      const reportIds = selectedRows.value.map((row) => ({
        id: row.id || row._id,
        table: row.table || row.table_name
      }))

      // Update reports one by one and track success/failure
      let successCount = 0
      let failureCount = 0
      const successIds = []

      for (const report of reportIds) {
        try {
          const response = await Reports().updateReportStatus(report.id, newStatus, report.table)
          if (response === true) {
            successCount++
            successIds.push(report.id)
          } else {
            failureCount++
            console.error(`Failed to update report ${report.id} status to ${newStatus}`)
          }
        } catch (error) {
          console.error(`Error updating report ${report.id} status:`, error)
          failureCount++
        }
      }

      // Show result message
      if (successCount > 0) {
        let message = `Successfully ${
          newStatus === 'approved' ? 'approved' : 'rejected'
        } ${successCount} ${successCount > 1 ? 'reports' : 'report'}`
        if (failureCount > 0) {
          message += `, but failed to update ${failureCount} ${
            failureCount > 1 ? 'reports' : 'report'
          }`
        }
        Swal.fire(
          `${newStatus === 'approved' ? 'Approved' : 'Rejected'}!`,
          message,
          failureCount > 0 ? 'warning' : 'success'
        )

        // Update the status in the grid data for successfully updated reports
        updateStatusInGridData(successIds, newStatus)
      } else if (failureCount > 0) {
        Swal.fire(
          'Action Failed',
          `Could not update the status for ${failureCount} ${
            failureCount > 1 ? 'reports' : 'report'
          }. Please try again or contact support.`,
          'error'
        )
      }

      // Clear selection
      selectedRows.value = []

      // Programmatically deselect rows in the grid
      if (gridApi.value) {
        gridApi.value.deselectAll()
      }
    } catch (error) {
      console.error('Error in bulk update process:', error)
      Swal.fire(
        'Error',
        'Failed to update reports: ' + (error?.message || 'Unknown error'),
        'error'
      )
    } finally {
      isLoading.value = false
    }
  }
}

// Update the updateStatusInGridData function to use the proper gridApi reference
const updateStatusInGridData = (reportIds, newStatus) => {
  // Update the status directly in the reports array
  reports.value = reports.value.map((report) => {
    if (reportIds.includes(report.id) || reportIds.includes(report._id)) {
      // Create a new object to ensure reactivity
      const updatedReport = { ...report }

      // Update status directly
      updatedReport.status = newStatus

      // Also update status in content if it exists
      if (updatedReport.content) {
        // Parse content if it's a string
        let content = updatedReport.content
        if (typeof content === 'string') {
          try {
            content = JSON.parse(content)
          } catch (e) {
            console.error('Error parsing content:', e)
            content = {}
          }
        }

        // Update status in content
        content.status = newStatus
        updatedReport.content = content
      }

      return updatedReport
    }
    return report
  })

  // Force grid to refresh with updated data
  if (gridApi.value) {
    console.log('Updating grid with new data - reports count:', reports.value.length)
    // Instead of setRowData, refresh the data this way
    if (typeof gridApi.value.applyTransaction === 'function') {
      gridApi.value.applyTransaction({ update: reports.value })
    } else {
      console.warn('applyTransaction method not available on gridApi')
    }
    // If that doesn't work, just set all data
    setTimeout(() => {
      try {
        if (gridApi.value && typeof gridApi.value.setRowData === 'function') {
          gridApi.value.setRowData(reports.value)
        } else if (gridApi.value && typeof gridApi.value.applyTransaction === 'function') {
          gridApi.value.applyTransaction({ update: reports.value })
        } else {
          console.warn('Grid API methods not available for updating rows')
        }
      } catch (err) {
        console.error('Error refreshing grid data:', err)
      }
    }, 100)
  } else {
    console.error('Grid API not available for updating status')
  }
}

// Function to force refresh the grid data from the backend
const forceRefreshGridData = async () => {
  isLoading.value = true
  try {
    console.log('Forcing refresh of grid data from backend')
    await Reports().fetchReports({ forceRefresh: true })
    reports.value = Reports().reports

    // Refresh the grid with new data
    if (gridApi.value) {
      try {
        if (gridApi.value && typeof gridApi.value.setRowData === 'function') {
          gridApi.value.setRowData(reports.value)
          console.log('Grid refreshed with latest data from backend')
        } else if (gridApi.value && typeof gridApi.value.applyTransaction === 'function') {
          gridApi.value.applyTransaction({ update: reports.value })
          console.log('Grid updated with transaction')
        } else {
          console.warn('Grid API methods not available for refresh')
        }
      } catch (err) {
        console.error('Error refreshing grid data:', err)
        // Try to force a complete redraw if setRowData fails
        setTimeout(() => {
          // Use a different approach if the first one fails
          try {
            if (gridApi.value && typeof gridApi.value.refreshCells === 'function') {
              gridApi.value.refreshCells({ force: true })
              console.log('Forced cell refresh as fallback')
            } else {
              console.warn('refreshCells method not available on gridApi')
            }
          } catch (refreshErr) {
            console.error('Error with cell refresh:', refreshErr)
          }
        }, 100)
      }
    } else {
      console.warn('Grid API not available for refresh')
    }
  } catch (error) {
    console.error('Error refreshing grid data:', error)
    Toast.error('Failed to refresh data: ' + (error.message || 'Unknown error'))
  } finally {
    isLoading.value = false
  }
}

const approveSelectedReports = () => {
  updateSelectedReportsStatus('approved')
}

const rejectSelectedReports = () => {
  updateSelectedReportsStatus('rejected')
}

// Submit functionality for reporting users
const isSubmitting = ref(false)

const submitSelectedReports = async () => {
  // Only non-admin users can submit reports
  if (isAdmin.value) {
    Toast.error('Administrators cannot submit reports - use Approve/Reject instead')
    return
  }

  if (selectedRows.value.length === 0) {
    Toast.error('No reports selected for submission')
    return
  }

  // Filter to only draft reports
  const draftReports = selectedRows.value.filter((report) => report.status === 'draft')

  if (draftReports.length === 0) {
    Toast.info('No draft reports to submit. Only draft reports can be submitted.')
    return
  }

  // Check if there are non-draft reports selected
  const nonDraftReports = selectedRows.value.filter((report) => report.status !== 'draft')
  if (nonDraftReports.length > 0) {
    const result = await Swal.fire({
      title: 'Some Reports Cannot Be Submitted',
      text: `${nonDraftReports.length} of the selected reports are not in draft status and cannot be submitted. Submit only the ${draftReports.length} draft reports?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: `Submit ${draftReports.length} Draft Reports`,
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#3b82f6'
    })

    if (!result.isConfirmed) {
      return
    }
  }

  // Show final confirmation
  const result = await Swal.fire({
    title: 'Submit Reports',
    text: `Are you sure you want to submit ${draftReports.length} draft report(s)? Submitted reports cannot be edited.`,
    icon: 'question',
    showCancelButton: true,
    confirmButtonColor: '#3b82f6',
    cancelButtonColor: '#6c757d',
    confirmButtonText: `Submit ${draftReports.length} Report(s)`,
    cancelButtonText: 'Cancel'
  })

  if (!result.isConfirmed) {
    return
  }

  isSubmitting.value = true

  try {
    let successCount = 0
    let failureCount = 0
    const errors = []

    // Submit reports one by one
    for (const report of draftReports) {
      try {
        const reportId = report.id || report._id
        const table = report.table || report.table_name

        await Reports().updateReportStatus(reportId, 'submitted', table)
        successCount++

        // Update the report status in the local data
        const reportIndex = reports.value.findIndex((r) => (r.id || r._id) === reportId)
        if (reportIndex !== -1) {
          reports.value[reportIndex].status = 'submitted'
        }
      } catch (error) {
        console.error(`Failed to submit report ${report.id}:`, error)
        failureCount++
        errors.push(`Report ID ${report.id}: ${error.message || 'Unknown error'}`)
      }
    }

    // Clear selection
    selectedRows.value = []
    if (gridApi) {
      gridApi.deselectAll()
    }

    // Show results
    if (successCount > 0) {
      Toast.success(`Successfully submitted ${successCount} report(s)`)
    }

    if (failureCount > 0) {
      console.error('Submit errors:', errors)
      Toast.error(`Failed to submit ${failureCount} report(s). Check console for details.`)
    }

    // Refresh the reports data
    await loadData()
  } catch (error) {
    console.error('Error during bulk submission:', error)
    Toast.error('Failed to submit reports: ' + (error.message || 'Unknown error'))
  } finally {
    isSubmitting.value = false
  }
}

// Add a message to inform users when they don't have any visible reports
const noVisibleReportsMessage = computed(() => {
  if (reports.value.length === 0 && !isLoading.value) {
    // Check if filtering might be the reason
    const userBranches = Auth().getUserBranches?.() || []
    if (Auth().isClientUser() && userBranches.length === 0) {
      return "You don't have any assigned branches. Please contact your administrator to get access to branches."
    }
    return 'No reports available. Reports may be filtered based on your branch access permissions.'
  }
  return ''
})

// Add computed properties for role-based UI
const isAdmin = computed(() => Auth().isAdmin())
const userRole = computed(() => Auth().getUserRole())

// Export to Excel
const exportSelectedReportsToExcel = async () => {
  try {
    console.log('exportSelectedReportsToExcel', reports)

    // Check if any reports are selected
    const reportsToExport =
      selectedRows.value.length > 0
        ? selectedRows.value
        : reports.value.length > 0
          ? reports.value
          : []
    console.log('reportsToExport', reportsToExport)

    if (reportsToExport.length === 0) {
      Toast.error('No reports available to export')
      return
    }

    Toast.info(`Generating Excel for ${reportsToExport.length} report(s)...`)

    // If only one report, export directly, otherwise create zip with multiple files
    if (reportsToExport.length === 1) {
      console.log('reportsToExport[0]', reportsToExport[0])
      await exportSingleReport(reportsToExport[0])
    } else {
      await exportMultipleReportsAsZip(reportsToExport)
    }

    Toast.success(`Excel export of ${reportsToExport.length} report(s) completed`)
  } catch (error) {
    console.error('Error exporting reports to Excel:', error)
    Toast.error('Failed to export reports to Excel')
  }
}

const exportSingleReport = async (report: any) => {
  try {
    const buffer = await ExcelExport().generateExcelBufferFromReport(report)

    console.log('report-tatt', report)
    // Generate filename
    let fileName = 'Mystery_Shopping_Report.xlsx'
    console.log('report.content.primaryField.value', report.content.primaryField.value)
    if (report.content.primaryField.value) {
      fileName = `${report.content.primaryField.value.replace(/[/.*?[\]]/g, '')}.xlsx`
    } else if (report.content?.selectedFieldValues?.branch_name?.name) {
      fileName = `${report.content.selectedFieldValues.branch_name.name.replace(
        /[/.*?[\]]/g,
        ''
      )}.xlsx`
    } else if (report.id) {
      fileName = `Report_${String(report.id).substring(0, 8)}.xlsx`
    }

    // Create blob and save file
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    })

    FileSaver.saveAs(blob, fileName)
    Toast.success('Report exported successfully')
  } catch (err) {
    console.error('Failed to export single report:', err)
    Toast.error('Failed to export report')
  }
}

// Function to export multiple reports as a zip file
const exportMultipleReportsAsZip = async (reportsArray) => {
  try {
    Toast.info(`Creating Excel files for ${reportsArray.length} reports...`)
    const zip = new JSZip()

    for (const [index, report] of reportsArray.entries()) {
      try {
        const buffer = await ExcelExport().generateExcelBufferFromReport(report)

        // Filename logic same as before
        let fileName = 'report.xlsx'
        if (report.content.primaryField.value) {
          fileName = `${report.content.primaryField.value.replace(/[/.*?[\]]/g, '')}.xlsx`
        } else if (report.content?.selectedFieldValues?.branch_name?.name) {
          fileName = `${report.content.selectedFieldValues.branch_name.name.replace(
            /[/.*?[\]]/g,
            ''
          )}.xlsx`
        } else if (report.id) {
          fileName = `Report_${String(report.id).substring(0, 8)}.xlsx`
        }

        zip.file(fileName, buffer)
        if (index % 5 === 0 || index === reportsArray.length - 1) {
          Toast.info(`Processed ${index + 1} of ${reportsArray.length} reports`)
        }
      } catch (innerErr) {
        console.error(`Failed to process report #${index + 1}`, innerErr)
        continue
      }
    }

    const zipBlob = await zip.generateAsync({ type: 'blob' })
    const fileName = `Mystery_Shopping_Reports_${new Date().toISOString().split('T')[0]}.zip`
    FileSaver.saveAs(zipBlob, fileName)

    Toast.success(`Exported ${reportsArray.length} reports to ${fileName}`)
  } catch (err) {
    console.error('Failed to export reports as zip:', err)
  }
}

// Function to export selected reports to PDF
const exportSelectedReportsToPDF = async () => {
  try {
    // Check if we have any selected rows
    if (!selectedRows.value || selectedRows.value.length === 0) {
      // Check if we have any reports
      if (!reports.value || reports.value.length === 0) {
        Toast.error('No reports available to export')
        return
      }

      // No selection, but we have reports - ask if they want to export all
      const { isConfirmed } = await Swal.fire({
        title: 'Export All Reports?',
        text: 'No reports selected. Would you like to export all reports?',
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Yes, export all',
        cancelButtonText: 'Cancel'
      })

      if (isConfirmed) {
        // Export all reports
        if (reports.value.length === 1) {
          // Only one report, export as a single PDF
          await pdfExport.exportSingleReportToPDF(reports.value[0])
        } else {
          // Multiple reports, export as a zip of PDFs
          await pdfExport.exportMultipleReportsToPDF(reports.value)
        }
      }
    } else {
      // We have selected rows to export
      if (selectedRows.value.length === 1) {
        // Only one report selected, export as a single PDF
        await pdfExport.exportSingleReportToPDF(selectedRows.value[0])
      } else {
        // Multiple reports, export as a zip of PDFs
        await pdfExport.exportMultipleReportsToPDF(selectedRows.value)
      }
    }
  } catch (error) {
    console.error('Error exporting to PDF:', error)
    Toast.error('Failed to export reports to PDF')
  }
}

// Functions for exporting media (add these near the other export functions)
const exportSelectedReportsImages = async () => {
  try {
    // Check if any reports are selected
    const reportsToExport = selectedRows.value.length > 0 ? selectedRows.value : reports.value

    if (reportsToExport.length === 0) {
      Toast.error('No reports available to export images from')
      return
    }

    // If only one report, export directly, otherwise create zip with multiple files
    if (reportsToExport.length === 1) {
      await mediaExport.exportImages(reportsToExport[0])
    } else {
      await mediaExport.exportMultipleImages(reportsToExport)
    }
  } catch (error) {
    console.error('Error exporting images:', error)
    Toast.error('Failed to export images: ' + error.message)
  }
}

const exportSelectedReportsVideos = async () => {
  try {
    // Check if any reports are selected
    const reportsToExport = selectedRows.value.length > 0 ? selectedRows.value : reports.value

    if (reportsToExport.length === 0) {
      Toast.error('No reports available to export videos from')
      return
    }

    console.log('Exporting videos from reports:', reportsToExport.length)

    // Check first report for media_links
    if (reportsToExport.length > 0) {
      const firstReport = reportsToExport[0]
      console.log('First report info:', {
        id: firstReport.id,
        has_media_links: !!firstReport.media_links,
        video_url: firstReport.media_links?.video_url || 'none',
        domain_name: firstReport.domain_name || 'none'
      })
    }

    // If only one report, export directly, otherwise create zip with multiple files
    if (reportsToExport.length === 1) {
      console.log('Exporting single video')
      mediaExport.exportVideos(reportsToExport[0])
    } else {
      console.log('Exporting multiple videos')
      await mediaExport.exportMultipleVideos(reportsToExport)
    }
  } catch (error) {
    console.error('Error exporting videos:', error)
    Toast.error(
      'Failed to export videos: ' + (error instanceof Error ? error.message : String(error))
    )
  }
}

const exportSelectedReportsAudios = async () => {
  try {
    // Check if any reports are selected
    const reportsToExport = selectedRows.value.length > 0 ? selectedRows.value : reports.value

    if (reportsToExport.length === 0) {
      Toast.error('No reports available to export audios from')
      return
    }

    // If only one report, export directly, otherwise create zip with multiple files
    if (reportsToExport.length === 1) {
      await mediaExport.exportAudios(reportsToExport[0])
    } else {
      await mediaExport.exportMultipleAudios(reportsToExport)
    }
  } catch (error) {
    console.error('Error exporting audios:', error)
    Toast.error('Failed to export audios: ' + error.message)
  }
}

const exportSelectedReportsPdfs = async () => {
  try {
    // Check if any reports are selected
    const reportsToExport = selectedRows.value.length > 0 ? selectedRows.value : reports.value

    if (reportsToExport.length === 0) {
      Toast.error('No reports available to export PDFs from')
      return
    }

    // If only one report, export directly, otherwise create zip with multiple files
    if (reportsToExport.length === 1) {
      await mediaExport.exportPdfs(reportsToExport[0])
    } else {
      await mediaExport.exportMultiplePdfs(reportsToExport)
    }
  } catch (error) {
    console.error('Error exporting PDFs:', error)
    Toast.error('Failed to export PDFs: ' + error.message)
  }
}

// Watch for changes in reports data to update dynamic columns
watch(
  reports,
  (newReports) => {
    if (newReports && newReports.length > 0) {
      console.log('Reports loaded, setting up dynamic columns')
      // Update allReports for backward compatibility
      allReports.value = newReports
      setupDynamicColumns()
    }
  },
  { immediate: true, deep: true }
)

// Add watch for client changes to refresh reports
watch(
  () => Client().selected_client,
  (newClient) => {
    if (newClient && Object.keys(newClient).length > 0) {
      console.log('Client changed, refreshing reports')
      fetchReports()
    }
  },
  { deep: true }
)

// Watch Reports data for changes and refresh the grid
watch(
  () => Reports().reports,
  (newReports) => {
    console.log('Reports data changed in store, refreshing grid...')
    // Make a deep copy to ensure reactivity
    reports.value = JSON.parse(JSON.stringify(newReports))

    if (gridApi.value) {
      try {
        // Check if setRowData method exists
        if (typeof gridApi.value.setRowData === 'function') {
          console.log('Updating grid with new data using setRowData')
          gridApi.value.setRowData(reports.value)
        } else if (typeof gridApi.value.applyTransaction === 'function') {
          // Fallback to applyTransaction if setRowData is not available
          console.log('Updating grid with new data using applyTransaction')
          gridApi.value.applyTransaction({ update: reports.value })
        } else {
          // Manual refresh as last resort
          console.warn('Neither setRowData nor applyTransaction method is available on gridApi')
          setTimeout(() => {
            if (gridApi.value && typeof gridApi.value.refreshCells === 'function') {
              gridApi.value.refreshCells({ force: true })
            }
          }, 100)
        }

        // Refresh cells regardless of which update method was used
        if (typeof gridApi.value.refreshCells === 'function') {
          gridApi.value.refreshCells({ force: true })
        }
      } catch (error) {
        console.error('Error updating grid data:', error)
      }
    }
  },
  { deep: true }
)

onMounted(async () => {
  await Ranges().init()
  try {
    // Initialize Client first to ensure we have the selected client
    if (!Client().selected_client) {
      console.log('Initializing client...')
      await Client().init()
    }

    // Fetch custom ranges if a client is - REMOVED: fetchReports() already calls Ranges().fetch()
    // if (Client().selected_client?.uuid) {
    //   await Ranges().fetch()
    // }

    // Fetch reports
    console.log('Fetching reports...')
    await fetchReports()

    // Direct update to the grid after component is fully mounted
    console.log('Component mounted, directly updating grid with reports data')
    setTimeout(() => {
      if (gridApi.value && typeof gridApi.value.setRowData === 'function') {
        console.log('Setting row data directly from onMounted', reports.value.length, 'rows')
        try {
          gridApi.value.setRowData(reports.value)
        } catch (err) {
          console.error('Error setting row data in onMounted:', err)
        }
      } else {
        console.warn('Grid API not available for direct update in onMounted')
      }
    }, 500)

    // If no reports were loaded in the first attempt, try once more
    if (reports.value.length === 0) {
      console.log('No reports loaded in first attempt, trying again...')
      setTimeout(async () => {
        await fetchReports()
      }, 1000)
    }
  } catch (error) {
    console.error('Error during initialization:', error)
    Toast.error('Failed to initialize: ' + (error.message || 'Unknown error'))
  }

  // Set up grid configuration for current user
  // configureGridForUser()

  // Set up visibility change handler to refresh data when returning to this tab
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      console.log('Tab became visible in reports view, refreshing data...')
      fetchReports()
    }
  })
})

// Helper function to get current user ID
const getCurrentUserId = () => {
  try {
    const userJson = getCookie('user')
    if (userJson) {
      const user = JSON.parse(userJson)
      return user.id
    }
    return null
  } catch (e) {
    console.error('Failed to parse user data from cookie:', e)
    return null
  }
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
      typeof reportData?.content === 'string' ? JSON.parse(reportData.content) : reportData?.content

    if (!content?.reports) return false

    // Check if there's any section with "Fatal Error" in the name
    // that has at least one question with "yes" response
    return content.reports.some((section: ReportSection) => checkSectionFatalError(section))
  } catch (error) {
    console.error('Error checking fatal error conditions:', error)
    return false
  }
}

// Function to check if a section is a fatal error section (has fatal error in name)
const isFatalErrorSection = (section: ReportSection): boolean => {
  const sectionName = section.heading?.toLowerCase() || ''
  return sectionName.includes('fatal error')
}
</script>

<template>
  <DefaultLayout>
    <h2 class="text-black font-medium mb-2">Search Filters</h2>
    <div class="flex items-center justify-between gap-4">
      <div class="flex items-center gap-4">
        <Button
          :type="'button'"
          @click="clearFilters"
          label="Clear Grid Filters"
          class="bg-gray-500 h-10 px-4"
        />
      </div>

      <div class="flex items-center gap-4">
        <Button @onClick="Reports().openTemplateModal" :type="'button'" label="Add New Report" />
        <!-- <router-link to="/client/report/upload">
          <Button :type="'button'" label="Upload Report" />
        </router-link> -->
      </div>
    </div>

    <h2 class="text-black font-medium mt-4 mb-2">Export Filters</h2>
    <div v-if="selectedRows.length > 0" class="flex items-center gap-3 mb-4">
      <Button
        @onClick="exportSelectedReportsToExcel"
        :type="'button'"
        label="Export Excel"
        class="bg-blue-600 hover:bg-blue-700 min-w-[140px] flex justify-center"
      />
      <Button
        @onClick="exportSelectedReportsToPDF"
        :type="'button'"
        label="Export PDF"
        class="bg-red-600 hover:bg-red-700 min-w-[140px] flex justify-center"
      />
      <Button
        @onClick="exportSelectedReportsVideos"
        :type="'button'"
        label="Export Videos"
        class="bg-purple-600 hover:bg-purple-700 min-w-[140px] flex justify-center"
      />
      <Button
        @onClick="exportSelectedReportsImages"
        :type="'button'"
        label="Export Pictures"
        class="bg-green-600 hover:bg-green-700 min-w-[140px] flex justify-center"
      />
      <Button
        @onClick="exportSelectedReportsAudios"
        :type="'button'"
        label="Export Audios"
        class="bg-orange-600 hover:bg-orange-700 min-w-[140px] flex justify-center"
      />
      <Button
        @onClick="exportSelectedReportsPdfs"
        :type="'button'"
        label="Export PDFs"
        class="bg-indigo-600 hover:bg-indigo-700 min-w-[140px] flex justify-center"
      />
    </div>
    <div v-else class="mb-4 text-sm text-gray-500">
      Select one or more reports to enable export options
    </div>

    <div class="mb-4 flex justify-between items-center">
      <div class="flex items-center gap-4">
        <h3 class="text-lg font-medium">
          {{ isAdmin ? 'All Reports' : 'My Reports' }} ({{ reports.length || 0 }})
        </h3>
        <span class="text-sm text-gray-500">
          {{
            isAdmin
              ? 'Showing all reports (Admin role)'
              : `Showing reports created by ${Reports().currentUser} (${userRole})`
          }}
        </span>

        <!-- Status action buttons -->
        <div v-if="selectedRows.length > 0" class="flex items-center gap-2">
          <!-- <Button
            v-if="selectedRows.length === 1"
            @onClick="editSelectedReport"
            :type="'button'"
            class="bg-blue-600 hover:bg-blue-700 flex items-center gap-1"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke-width="1.5"
              stroke="currentColor"
              class="w-4 h-4"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21h-10.5A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10"
              />
            </svg>
            Edit Report
          </Button> -->
          <!-- Only show approve/reject buttons for admin users -->
          <template v-if="isAdmin">
            <Button
              @onClick="approveSelectedReports"
              :type="'button'"
              class="bg-green-500 hover:bg-green-600"
              label="Approve"
            />
            <Button
              @onClick="rejectSelectedReports"
              :type="'button'"
              class="bg-red-500 hover:bg-red-600"
              label="Reject"
            />
          </template>

          <!-- Submit button for reporting users (non-admin) -->
          <template v-else>
            <Button
              @onClick="submitSelectedReports"
              :type="'button'"
              :label="
                isSubmitting
                  ? 'Submitting...'
                  : `Submit ${
                      selectedRows.filter((r) => r.status === 'draft').length
                    } Draft Report(s)`
              "
              :disabled="
                isSubmitting || selectedRows.filter((r) => r.status === 'draft').length === 0
              "
              class="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2"
            >
              <svg
                v-if="!isSubmitting"
                class="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                ></path>
              </svg>
              <svg v-else class="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                <circle
                  class="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  stroke-width="4"
                ></circle>
                <path
                  class="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
            </Button>
            <span v-if="selectedRows.length > 0" class="text-sm text-gray-600">
              {{ selectedRows.filter((r) => r.status === 'draft').length }} of
              {{ selectedRows.length }} selected can be submitted
              <span
                v-if="selectedRows.filter((r) => r.status === 'draft').length === 0"
                class="text-orange-600 font-medium"
              >
                (No draft reports selected)
              </span>
            </span>
          </template>
          <Button
            @onClick="deleteSelectedReports"
            :type="'button'"
            class="bg-gray-500 hover:bg-gray-600"
            label="Delete"
          />
        </div>
      </div>
      <div v-if="isLoading" class="flex items-center gap-2">
        <Loader size="sm" text="Loading reports..." />
      </div>
    </div>

    <ag-grid-vue
      :gridOptions="gridOptions"
      :rowData="reports"
      :columnDefs="colDefs"
      class="ag-theme-quartz"
      style="height: 500px"
      rowSelection="multiple"
      :pagination="true"
      :paginationPageSize="20"
      :enableCellTextSelection="true"
      :defaultColDef="gridOptions.defaultColDef"
      :suppressNoRowsOverlay="false"
      :getRowId="gridOptions.getRowId"
      :immutableData="false"
      @grid-ready="onGridReady"
      @row-clicked="onRowClicked"
      @selection-changed="onSelectionChanged"
    >
    </ag-grid-vue>

    <!-- Add this alert message after the grid -->
    <div
      v-if="reports.length === 0 && !isLoading"
      class="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-center"
    >
      <div class="flex flex-col items-center justify-center">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="h-8 w-8 text-yellow-500 mb-2"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <h3 class="text-lg font-medium text-yellow-800 mb-1">{{ noVisibleReportsMessage }}</h3>
        <p
          v-if="Auth().isClientUser() && Auth().getUserBranches().length === 0"
          class="text-sm text-yellow-600"
        >
          You need to be assigned to specific branches to view their reports. Please contact your
          administrator.
        </p>
      </div>
    </div>

    <!-- Fullscreen loader when app is initially loading -->
    <div
      v-if="isLoading && reports.length === 0"
      class="fixed inset-0 bg-white bg-opacity-90 z-50 flex items-center justify-center"
    >
      <Loader size="lg" text="Loading your reports..." />
    </div>

    <!-- Template Selection Modal -->
    <Modal
      v-model:visible="Reports().showTemplateModal"
      title="Select Template"
      :style="{ width: '50vw' }"
    >
      <div class="p-4">
        <h2 class="text-lg font-semibold mb-4">Choose a template for your new report</h2>

        <div v-if="Templates().loading" class="flex justify-center items-center py-8">
          <Loader size="lg" text="Loading templates..." />
        </div>

        <div v-else-if="Templates().templates.length === 0" class="py-8 text-center">
          <p class="text-gray-500 mb-4">No templates found</p>
          <p class="text-sm">
            Please create a template first.
            <router-link to="/client/reports-template/add" class="text-blue-500 underline">
              Create Template
            </router-link>
          </p>
        </div>

        <div v-else class="mb-6">
          <label class="block mb-2 font-medium">Template</label>
          <Dropdown
            v-model="selectedTemplate"
            :options="Templates().templates"
            optionLabel="template_name"
            placeholder="Select a template"
            class="w-full"
          />

          <div v-if="selectedTemplate" class="mt-4 p-4 bg-gray-50 rounded">
            <h3 class="font-medium">Template Details</h3>
            <div class="grid grid-cols-2 gap-2 mt-2">
              <div class="text-gray-600">Name:</div>
              <div>{{ selectedTemplate.template_name }}</div>

              <div class="text-gray-600">Branch Code:</div>
              <div>{{ selectedTemplate.branch_code || 'N/A' }}</div>

              <div class="text-gray-600">Created:</div>
              <div>{{ new Date(selectedTemplate.created_at).toLocaleDateString() }}</div>
            </div>
          </div>
        </div>

        <div class="flex justify-end gap-3 mt-6">
          <Button
            @onClick="closeTemplateModal"
            :type="'button'"
            label="Cancel"
            class="bg-gray-500"
          />
          <Button
            @onClick="createNewReport"
            :type="'button'"
            label="Create Report"
            class="bg-green-600"
            :disabled="!selectedTemplate"
          />
        </div>
      </div>
    </Modal>
  </DefaultLayout>
</template>
