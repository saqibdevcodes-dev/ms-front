<script setup lang="ts" name="ReportEditPage">
import { onMounted, ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import DefaultLayout from '@/layouts/DefaultLayout.vue'
import { Client } from '@/stores/client'
import { Reports } from '@/stores/reports'
import { Branches } from '@/stores/branches'
import { Responses } from '@/stores/responses'
import Button from '@/components/Buttons/Button.vue'
import { Toast } from '@/utils/toast'
import Swal from 'sweetalert2'
import { Auth } from '@/stores/auth'
import { copyToClipboard } from '@/utils/clipboard'
import { Ranges } from '@/stores/ranges'
import { getRatingText, getRatingColor } from '@/utils/ratings'
import Cookies from 'js-cookie'
import DatePicker from 'primevue/datepicker'
import InputText from 'primevue/inputtext'
import Dropdown from 'primevue/dropdown'
import toastService from '@/utils/toast'
import { formatDateYMD } from '@/utils/dates'
import {
  applyNaScores,
  finalizeSectionTotals,
  getClientNaScoreValue,
  isNaResponse,
  naScoreToNumber
} from '@/utils/naScore'
import type { Response } from '@/interfaces/response'
import {
  generateVideoUrl,
  generateAudioUrl,
  generatePictureUrls,
  generateTimestampUrl,
  generatePdfUrl
} from '@/utils/mediaLinks'

export interface ReportMediaLinks {
  video_url: string | null
  audio_url: string | null
  images_urls: string[] | null
  timestamp_url: string | null
  pdf_url: string | null
}

export interface ReportCreatorOrUpdater {
  id: number
  name: string
  uuid: string
}

export interface ReportContent {
  reports: any[]
  customFields: any[]
  selectedFieldValues: Record<string, any>
  primaryIdentifierField: string
  date: string
  time?: string
  sectionLevelSubtraction?: boolean
  visits_add?: boolean
  timerInfo?: {
    startTime: string | null
    elapsedTimeSeconds: number
    formattedTime: string
  }
  timestamp_url?: string
  primaryField?: {
    name: string
    value: string
  }
}

export interface ReportColors {
  titleBg: string
  summaryBg: string
  headerBg: string
  kpiBg: string
  ratingBg: string
  scoreFontColor: string
}

export interface ReportData {
  id: number
  table: string
  template_name: string
  colors: ReportColors
  content: ReportContent
  status: string
  created_at: string
  updated_at: string
  created_by: number
  updated_by: number
  client_id: string
  client_name: string
  client_domain_name: string
  domain_name: string
  primary_field_name: string
  primary_field_value: string

  // Media
  media_links: ReportMediaLinks
  video_url?: string
  audio_url?: string
  images_urls?: string[] | string // sometimes comes as JSON string
  timestamp_url?: string

  // Optional user metadata
  creator?: ReportCreatorOrUpdater
  updater?: ReportCreatorOrUpdater
}

// Define variables at the top
const route = useRoute()
const router = useRouter()
const isLoading = ref(true)
const isLoadingRanges = ref(false)
const isLoadingBranches = ref(false)
const isLoadingResponses = ref(false)
const isLoadingReport = ref(false)
const isSaving = ref(false)
const hasSaved = ref(false) // Prevent duplicate saves
const isDeleting = ref(false)
const date = ref(new Date())
const value = ref('')
const reportData = ref(null)
const primaryIdentifierField = ref('')
const sectionLevelSubtraction = ref<Record<number, boolean>>({})

// Colors for the report
const colors = ref({
  titleBg: '#7030A0',
  summaryBg: '#FFC000',
  headerBg: '#808080',
  kpiBg: '#C5D9F1',
  ratingBg: '#4F6228',
  scoreFontColor: '#0000FF'
})

// Custom fields for form
const customFields = ref([])

// Selected field values (branch, region, etc.)
const selectedFieldValues: any = ref({})

// Client responses with proper typing
const clientResponses = ref<Response[]>([
  {
    id: 1,
    uuid: '1',
    client_id: '',
    response: 'Yes',
    total_score: 0,
    operation: '+',
    applicable_score: 0,
    achieved_score: 0,
    created_at: '',
    updated_at: ''
  },
  {
    id: 2,
    uuid: '2',
    client_id: '',
    response: 'No',
    total_score: 0,
    operation: '+',
    applicable_score: 0,
    achieved_score: 0,
    created_at: '',
    updated_at: ''
  },
  {
    id: 3,
    uuid: '3',
    client_id: '',
    response: 'N/A',
    total_score: 0,
    operation: '+',
    applicable_score: 0,
    achieved_score: 0,
    created_at: '',
    updated_at: ''
  }
])

// Development mode flag
const isDev = computed(() => import.meta.env.DEV || false)

// Debug info for responses (useful in development)
const responseDebugInfo = computed(() => {
  return {
    storeCount: Responses().responses_data?.length || 0,
    selectCount: clientResponses.value?.length || 0
  }
})

// Function to load client responses from the database
const loadClientResponses = async () => {
  try {
    isLoadingResponses.value = true
    await Responses().init()

    // Check if client is selected before making API call
    if (!Client().selected_client?.uuid) {
      console.warn('No client selected, cannot load responses')
      return
    }

    const clientId = Client().selected_client.uuid
    console.log('Loading responses for client:', clientId)

    // Always fetch to ensure we have the latest data
    await Responses().fetch({ forceRefresh: true })

    // Get responses from the Responses store
    const responses = Responses().responses_data || []

    console.log('Responses fetched:', responses)

    if (responses.length > 0) {
      clientResponses.value = responses
      console.log('Loaded client responses:', clientResponses.value.length, clientResponses.value)
    } else {
      console.warn('No responses found for client, using defaults. Client ID:', clientId)
      console.warn('Make sure responses are configured for this client in the Responses section.')
    }
  } catch (error) {
    console.error('Error loading responses:', error)
    Toast.error('Failed to load responses')
  } finally {
    isLoadingResponses.value = false
  }
}

// Get the report ID and table from the route
const reportId = computed(() => {
  const id = route.params.id
  console.log('Route params:', route.params, 'ID from route:', id)
  return id
})

const tableParam = computed(() => {
  const table = route.query.table
  console.log('Route query:', route.query, 'Table from route:', table)
  return table
})

// Function to load the report
const loadReport = async () => {
  try {
    isLoadingReport.value = true

    // Check if we even have a report ID
    if (!reportId.value) {
      console.warn('No report ID specified, cannot load report')
      Toast.error('No report ID specified')
      return
    }

    // Check if we already have report data loaded
    if (reportData.value && reportData.value.id === reportId.value) {
      console.log('Report already loaded, using cached data')
      return
    }

    console.log(`Loading report ${reportId.value} from API...`)

    // Get the report data with table param
    const report = await Reports().getReportById(reportId.value, tableParam.value as any)

    if (!report) {
      Toast.error('Failed to load report')
      router.push('/client/reports')
      return
    }

    // Set the report data
    reportData.value = report

    // Check if the user has permission to edit this report
    const isAdmin = Auth().isAdmin()
    const isReportingUser = Auth().isReportingUser()
    const currentUserId = getUserId()

    // Safely get properties from report to avoid TypeScript errors
    const reportCreatorId = report.creator?.id || report.created_by
    const reportStatus = report.status || 'draft'

    // Debug logging to trace user IDs and roles
    console.log('Permission check debug:')
    console.log('- Auth store user ID:', Auth().user?.id)
    console.log(
      '- Cookie user ID:',
      (() => {
        try {
          const userJson = Cookies.get('user')
          return userJson ? JSON.parse(userJson).id : 'Not found'
        } catch (e) {
          return 'Error parsing'
        }
      })()
    )
    console.log(
      '- localStorage user ID:',
      (() => {
        try {
          const userJson = localStorage.getItem('user')
          return userJson ? JSON.parse(userJson).id : 'Not found'
        } catch (e) {
          return 'Error parsing'
        }
      })()
    )
    console.log('- Current user ID (used for check):', currentUserId)
    console.log('- Report creator ID:', reportCreatorId, report.created_by, report.creator?.id)
    console.log('- User role:', Auth().getUserRole())
    console.log('- Is admin?', isAdmin)
    console.log('- Is reporting user?', isReportingUser)
    console.log('- Report status:', reportStatus)

    // Allow editing if:
    // 1. User is an admin, OR
    // 2. User is the creator of the report, OR
    // 3. User is a reporting user AND report is in draft/rejected status
    const canEdit =
      isAdmin ||
      String(currentUserId) === String(reportCreatorId) ||
      (isReportingUser && ['draft', 'rejected'].includes(reportStatus))

    if (!canEdit) {
      Toast.error('You do not have permission to edit this report')
      router.push('/client/reports')
      return
    }
    console.log('Report content:', report)

    // Load report content
    if (report.content) {
      // Set reports data if available
      if (report.content.reports) {
        Reports().reports_data = JSON.parse(JSON.stringify(report.content.reports))
      }

      // Load custom fields
      if (report.content.customFields) {
        customFields.value = JSON.parse(JSON.stringify(report.content.customFields))
      }

      // Load field values
      if (report.content.selectedFieldValues) {
        selectedFieldValues.value = JSON.parse(JSON.stringify(report.content.selectedFieldValues))
      }

      // Set primary identifier field
      if (report.content.primaryIdentifierField) {
        primaryIdentifierField.value = report.content.primaryIdentifierField
      }

      // Set section-level subtraction
      if (report.content.sectionLevelSubtraction !== undefined) {
        sectionLevelSubtraction.value = report.content.sectionLevelSubtraction
      }

      // Set date and time
      if (report.content.date) {
        date.value = new Date(report.content.date)
      }

      if (report.content.time) {
        value.value = report.content.time
      }
    }

    // Load colors
    if (report.colors) {
      colors.value = JSON.parse(JSON.stringify(report.colors))
    }

    // Calculate section totals
    calculateSectionTotals()

    Toast.success('Report loaded successfully')
  } catch (error) {
    console.error('Error loading report:', error)
    Toast.error(`Error loading report: ${error.message || 'Unknown error'}`)
  } finally {
    isLoadingReport.value = false
    isLoading.value = false // Main loading state turns off when report is loaded
  }
}

// Add helper function to get current user ID
const getUserId = () => {
  // First try to get user ID from Auth store
  if (Auth().user?.id) {
    return Auth().user.id
  }

  // Fall back to Cookies if needed
  try {
    const userJson = Cookies.get('user')
    if (userJson) {
      const user = JSON.parse(userJson)
      return user.id
    }
    return null
  } catch (e) {
    console.error('Failed to parse user data from cookie:', e)

    // Last resort: try localStorage
    try {
      const localUserJson = localStorage.getItem('user')
      if (localUserJson) {
        const localUser = JSON.parse(localUserJson)
        return localUser.id
      }
    } catch (localErr) {
      console.error('Failed to get user from localStorage too:', localErr)
    }

    return null
  }
}

// Automatically set scores based on response
const calculateScores = (data: any, sectionIndex: number) => {
  // If no response, exit early
  if (!data.response) return

  // Find the selected response in clientResponses
  const selectedResponse = clientResponses.value.find((r) => r.response === data.response)
  const totalScore = Number(data.total_score) || 0

  // Get operation and value from the response if available, otherwise use defaults
  const operation = selectedResponse?.operation || '+'
  const responseValue = selectedResponse ? Number(selectedResponse.total_score) || 0 : 0

  // Normalize response to handle case insensitivity
  const responseText = data.response.toLowerCase()

  // Default: set applicable score to total score
  data.applicable_score = totalScore
  // Initialize subtraction_value
  data.subtraction_value = 0

  // Handle based on response text and operation
  if (responseText === 'yes' || responseText === 'na' || responseText === 'n/a') {
    if (responseText === 'yes') {
      // For Yes: achieved = applicable
      data.achieved_score = totalScore
    } else if (isNaResponse(data.response)) {
      applyNaScores(data, getClientNaScoreValue(Client().selected_client))
    } else {
      data.applicable_score = 0
      data.achieved_score = 0
    }
  } else if (responseText === 'no') {
    // For No: achieved = 0
    data.achieved_score = 0
  } else if (operation === '-') {
    // Store the subtraction value for section-level calculations
    data.subtraction_value = responseValue

    // If section-level subtraction is enabled for this specific section, don't subtract here
    if (sectionLevelSubtraction.value[sectionIndex]) {
      // For section-level, we keep achieved = applicable for now
      // (the subtraction will be applied at the section level)
      data.achieved_score = totalScore
    } else {
      // For question-level subtraction: apply immediately
      data.achieved_score = Math.max(0, totalScore - responseValue)
    }
  } else if (operation === '*') {
    // For multiplication: achieved = applicable * value
    data.achieved_score = totalScore * responseValue
  } else if (operation === '/') {
    // For division: achieved = applicable / value (avoid division by zero)
    data.achieved_score = responseValue !== 0 ? totalScore / responseValue : 0
  } else if (operation === '+') {
    // For addition: achieved = applicable + responseValue
    data.achieved_score = totalScore + responseValue
  } else {
    // Default (unknown operation): achieved = applicable
    data.achieved_score = data.applicable_score
  }

  // Always recalculate totals after changing scores
  calculateSectionTotals()
}

// Function to apply a selected response to all questions in a section
const applyResponseToAllQuestions = (section: any, selectedResponse: string) => {
  if (!selectedResponse || !section || !section.data) return

  // Apply the selected response to all questions in the section
  section.data.forEach((question: any) => {
    question.response = selectedResponse
    // Calculate scores for each question
    // Find the section index
    const sectionIndex = Reports().reports_data.findIndex((s) => s === section)
    calculateScores(question, sectionIndex)
  })

  // Recalculate section totals after applying to all questions
  calculateSectionTotals()

  // Show success message
  Toast.success(`Applied "${selectedResponse}" to all questions in section`)
}

// Function to initialize a new report row
const initializeReportRow = () => {
  return {
    question: 'Add your question here',
    sub_question: '',
    response: '',
    total_score: 2,
    applicable_score: 2,
    achieved_score: 0,
    comments: ''
  }
}

// Function to calculate section totals
const calculateSectionTotals = () => {
  // Calculate totals for each section
  Reports().reports_data.forEach((section, sectionIndex) => {
    // Initialize totals
    let totalScore = 0
    let applicableScore = 0
    let achievedScore = 0
    let sectionSubtractions = 0

    // First pass: calculate base totals and collect subtraction values
    section.data.forEach((row) => {
      const rowTotalScore = Number(row.total_score) || 0
      const rowApplicableScore = naScoreToNumber(row.applicable_score)

      totalScore += rowTotalScore
      applicableScore += rowApplicableScore

      // If section-level subtraction is enabled for this specific section, collect subtraction values separately
      if (sectionLevelSubtraction.value[sectionIndex] && row.subtraction_value > 0) {
        sectionSubtractions += Number(row.subtraction_value) || 0
        // For items with subtraction, still add their full applicable score to achieved
        // (we'll subtract the total later)
        achievedScore += rowApplicableScore
      } else {
        // For all other rows, or when section-level subtraction is disabled,
        // just use the achieved score directly
        achievedScore += naScoreToNumber(row.achieved_score)
      }
    })

    // Apply section-level subtraction if enabled for this specific section
    if (sectionLevelSubtraction.value[sectionIndex] && sectionSubtractions > 0) {
      // Subtract the total subtraction value from the section's achieved score
      achievedScore = Math.max(0, achievedScore - sectionSubtractions)
    }

    // Update section totals
    section.total_score = totalScore
    section.total_applicable_score = applicableScore
    section.total_achieved_score = achievedScore

    // Calculate performance percentage
    const performance =
      applicableScore > 0 ? Math.round((achievedScore / applicableScore) * 100) : 0

    section.achieved = `${performance}%`
    finalizeSectionTotals(section, Client().selected_client)
  })

  // Calculate overall totals
  const totalScores = {
    total_score: 0,
    total_applicable_score: 0,
    total_achieved_score: 0,
    performance_percentage: 0
  }

  Reports().reports_data.forEach((section) => {
    totalScores.total_score += Number(section.total_score) || 0
    totalScores.total_applicable_score += naScoreToNumber(section.total_applicable_score)
    totalScores.total_achieved_score += naScoreToNumber(section.total_achieved_score)
  })

  totalScores.performance_percentage =
    totalScores.total_applicable_score > 0
      ? Math.round((totalScores.total_achieved_score / totalScores.total_applicable_score) * 100)
      : 0

  return totalScores
}

// Computed property for total scores
const totalScores = computed(() => calculateSectionTotals())

// Function to get options for a specific branch field
const getBranchFieldOptions = (headerField) => {
  if (!headerField) return []

  // Get unique values for this field from branch data
  const uniqueValues = Branches()
    .branches.filter((branch) => branch[headerField] !== undefined)
    .map((branch) => branch[headerField])
    .filter((value, index, self) => self.indexOf(value) === index)

  // Convert to the format expected by the dropdown
  return uniqueValues.map((value) => ({
    name: String(value),
    value: String(value)
  }))
}

// Function to get the display value for a primary field (for table headings)
const getPrimaryFieldDisplayValue = () => {
  if (!primaryIdentifierField.value) return 'Branch Code' // Default fallback

  // If it's in the branches headers, get the nice display name
  const headers = Branches().branch_headers || []
  const header = headers.find((h) => h.field === primaryIdentifierField.value)

  if (header && header.headerName) {
    return header.headerName
  }

  // Otherwise use a formatted version of the field name
  return primaryIdentifierField.value
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

// Function to save the updated report
// const saveReport = async () => {
//   try {
//     isSaving.value = true

//     if (!reportData.value) {
//       Toast.error('No report data to save')
//       return
//     }

//     // Get client name for naming convention
//     const clientName = Client().selected_client?.name || 'Client'

//     // Get the primary field value for the report name
//     let primaryFieldValue = ''
//     if (primaryIdentifierField.value && selectedFieldValues.value[primaryIdentifierField.value]) {
//       primaryFieldValue =
//         selectedFieldValues.value[primaryIdentifierField.value].name ||
//         selectedFieldValues.value[primaryIdentifierField.value].value ||
//         ''
//     }

//     // We'll keep the original template name, but make sure the primary field value is updated
//     const templateName = reportData.value.template_name

//     console.log(`Updating report with name: ${templateName}`)

//     // Ensure the content object has all required fields
//     const contentObject = {
//       reports: Reports().reports_data,
//       customFields: customFields.value,
//       selectedFieldValues: selectedFieldValues.value,
//       primaryIdentifierField: primaryIdentifierField.value,
//       date: date.value,
//       time: value.value,
//       sectionLevelSubtraction: sectionLevelSubtraction.value
//     }

//     // If we have a selected primary field and a value, add it directly to the content for easier backend access
//     if (primaryIdentifierField.value && selectedFieldValues.value[primaryIdentifierField.value]) {
//       const primaryField = selectedFieldValues.value[primaryIdentifierField.value]

//       // Add the primary field information directly to the content object
//       contentObject.primaryField = {
//         name: primaryIdentifierField.value,
//         value: primaryField.name || primaryField.value || ''
//       }
//     }

//     // Create report data object, preserving the original ID and table
//     const updatedReportData = {
//       id: reportData.value.id,
//       table: reportData.value.table,
//       template_name: templateName,
//       colors: colors.value,
//       content: contentObject,
//       status: reportData.value.status || 'draft'
//     }

//     console.log('Saving updated report with primary field:', primaryIdentifierField.value)
//     console.log('Primary field value:', primaryFieldValue)
//     console.log('Section-level subtraction enabled:', sectionLevelSubtraction.value)

//     // Save report using the store method
//     const savedReport = await Reports().saveReport(updatedReportData)

//     if (savedReport) {
//       Toast.success(`Report "${templateName}" updated successfully`)

//       // Navigate back to the reports list
//       router.push('/client/reports')
//     }
//   } catch (error) {
//     console.error('Error saving report:', error)
//     Toast.error('Failed to save report: ' + (error.message || 'Unknown error'))
//   } finally {
//     isSaving.value = false
//   }
// }
const timestampLink = ref('')
const loadingMessage = ref<string>('Loading...')
const visitsAdd = ref(false)
const elapsedTimeSeconds = ref<number>(0)
const startTime = ref<Date | null>(null)
const formattedTime = computed(() => {
  const hours = Math.floor(elapsedTimeSeconds.value / 3600)
  const minutes = Math.floor((elapsedTimeSeconds.value % 3600) / 60)
  const seconds = elapsedTimeSeconds.value % 60
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds
    .toString()
    .padStart(2, '0')}`
})

// Function to regenerate media links when date changes
const regenerateMediaLinks = () => {
  if (
    !reportData.value ||
    !primaryIdentifierField.value ||
    !selectedFieldValues.value[primaryIdentifierField.value]
  ) {
    console.log('Cannot regenerate media links: missing required data')
    return
  }

  const d = date.value || new Date()
  const formattedDate = formatDateYMD(d)
  const field = selectedFieldValues.value[primaryIdentifierField.value]

  const reportForMediaUrls = {
    domain_name: Client().selected_client?.domain_name || window.location.hostname,
    client_name: Client().selected_client?.name || 'unknown',
    created_at: new Date(),
    date: formattedDate,
    id: reportData.value.id,
    content: {
      primaryField: {
        name: primaryIdentifierField.value,
        value: field.name || field.value || ''
      }
    }
  }

  console.log('Preview: Regenerating media links with date:', formattedDate)

  // Generate new media URLs
  const newMediaLinks = {
    video_url: generateVideoUrl(reportForMediaUrls),
    audio_url: generateAudioUrl(reportForMediaUrls),
    images_urls: generatePictureUrls(reportForMediaUrls, 10),
    timestamp_url: generateTimestampUrl(reportForMediaUrls),
    pdf_url: generatePdfUrl(reportForMediaUrls)
  }

  // Update local display immediately
  reportData.value.media_links = newMediaLinks
  reportData.value.video_url = newMediaLinks.video_url
  reportData.value.audio_url = newMediaLinks.audio_url
  reportData.value.images_urls = newMediaLinks.images_urls
  reportData.value.timestamp_url = newMediaLinks.timestamp_url
  reportData.value.pdf_url = newMediaLinks.pdf_url

  // Update the timestamp link for the inline display
  timestampLink.value = newMediaLinks.timestamp_url || ''

  console.log('Preview: Updated media links in UI:', newMediaLinks)
}

const saveReport = async () => {
  try {
    // Prevent duplicate saves
    if (isSaving.value || hasSaved.value) {
      console.warn('Save already in progress or completed')
      return
    }

    // Validation: check for unselected responses
    let hasUnselected = false
    let missingSection = ''
    let missingQuestion = ''

    Reports().reports_data.forEach((section) => {
      section.data.forEach((item: any) => {
        if (!item.response?.trim()) {
          hasUnselected = true
          missingSection = section.heading
          missingQuestion = item.question || 'Unnamed question'
        }
      })
    })

    if (hasUnselected) {
      toastService.error(
        `Please select responses. Missing in: "${missingSection}" → "${missingQuestion}"`
      )
      document.getElementById(missingSection)?.scrollIntoView({ behavior: 'smooth' })
      return
    }

    // Validation: ensure 'No' has comments
    let hasMissingComments = false
    let commentSection = ''
    Reports().reports_data.forEach((section) => {
      section.data.forEach((item: any) => {
        if (item.response?.toLowerCase() === 'no' && !item.comments?.trim()) {
          hasMissingComments = true
          commentSection = section.heading
        }
      })
    })

    if (hasMissingComments) {
      toastService.error(`Please add comments for 'No' responses in: "${commentSection}"`)
      document.getElementById(commentSection)?.scrollIntoView({ behavior: 'smooth' })
      return
    }

    isSaving.value = true
    isLoading.value = true
    loadingMessage.value = 'Updating report...'

    // Mark as saving to prevent duplicates
    hasSaved.value = true

    const d = date.value || new Date()
    const formattedDate = formatDateYMD(d)

    const updatedContent = {
      reports: Reports().reports_data,
      customFields: customFields.value,
      selectedFieldValues: selectedFieldValues.value,
      primaryIdentifierField: primaryIdentifierField.value,
      date: formattedDate,
      time: value.value,
      sectionLevelSubtraction: sectionLevelSubtraction.value,
      visits_add: visitsAdd.value,
      timerInfo: {
        startTime: startTime.value?.toISOString() || null,
        elapsedTimeSeconds: elapsedTimeSeconds.value,
        formattedTime: formattedTime.value
      },
      timestamp_url: timestampLink.value
    }

    if (primaryIdentifierField.value && selectedFieldValues.value[primaryIdentifierField.value]) {
      const field = selectedFieldValues.value[primaryIdentifierField.value]
      updatedContent.primaryField = {
        name: primaryIdentifierField.value,
        value: field.name || field.value || ''
      }
    }

    // 🚀 REGENERATE media links with updated date and primary field
    let regeneratedMediaLinks = {
      video_url: null,
      audio_url: null,
      images_urls: null,
      timestamp_url: null,
      pdf_url: null
    }

    // Generate new media URLs if we have the required data
    if (updatedContent.primaryField && updatedContent.primaryField.value) {
      const reportForMediaUrls = {
        domain_name: Client().selected_client?.domain_name || window.location.hostname,
        client_name: Client().selected_client?.name || 'unknown',
        created_at: new Date(),
        date: formattedDate, // Use the NEW date from the form
        id: reportData.value.id,
        content: {
          primaryField: {
            name: updatedContent.primaryField.name,
            value: updatedContent.primaryField.value
          }
        }
      }

      console.log('Regenerating media links with updated date:', formattedDate)
      console.log('Report data for media generation:', reportForMediaUrls)

      // Generate all media URLs with new date
      regeneratedMediaLinks.video_url = generateVideoUrl(reportForMediaUrls)
      regeneratedMediaLinks.audio_url = generateAudioUrl(reportForMediaUrls)
      regeneratedMediaLinks.images_urls = generatePictureUrls(reportForMediaUrls, 10)
      regeneratedMediaLinks.timestamp_url = generateTimestampUrl(reportForMediaUrls)
      regeneratedMediaLinks.pdf_url = generatePdfUrl(reportForMediaUrls)

      console.log('Regenerated media links:', regeneratedMediaLinks)
    }

    // Final updated report object
    console.log(reportData.value)

    const updatedReport = {
      id: reportData.value.id,
      table: reportData.value.table,
      template_name: reportData.value.template_name,
      colors: colors.value,
      content: updatedContent,
      status: reportData.value.status || 'draft',

      // 🟢 Use REGENERATED media links with updated date
      media_links: regeneratedMediaLinks,

      // 🟢 Also add them as top-level props for backend compatibility
      video_url: regeneratedMediaLinks.video_url,
      audio_url: regeneratedMediaLinks.audio_url,
      images_urls: regeneratedMediaLinks.images_urls,
      timestamp_url: regeneratedMediaLinks.timestamp_url,
      pdf_url: regeneratedMediaLinks.pdf_url
    }

    const saved = await Reports().updateReport(updatedReport)

    // Update the local reportData with new media links for UI display
    if (reportData.value && regeneratedMediaLinks.video_url) {
      reportData.value.media_links = regeneratedMediaLinks
      reportData.value.video_url = regeneratedMediaLinks.video_url
      reportData.value.audio_url = regeneratedMediaLinks.audio_url
      reportData.value.images_urls = regeneratedMediaLinks.images_urls
      reportData.value.timestamp_url = regeneratedMediaLinks.timestamp_url

      console.log('Updated local reportData with new media links')
    }

    // If we reach here without throwing an error, the save was successful
    toastService.success(
      `Report "${updatedReport.template_name}" updated successfully with updated media links`
    )

    // Redirect back to reports list after a short delay to ensure the success message is seen
    setTimeout(() => {
      router.push('/client/reports')
    }, 1000)
  } catch (error) {
    console.error('Update failed:', error)

    // Handle duplicate detection specifically
    if (error.message && error.message.includes('already exists')) {
      toastService.error('Cannot Update - Duplicate Report: ' + error.message)
    } else {
      toastService.error('Failed to update report: ' + (error.message || 'Unknown error'))
    }

    // Reset hasSaved on error to allow retry
    hasSaved.value = false
  } finally {
    isSaving.value = false
    isLoading.value = false
  }
}

// Function to delete a section with confirmation
const deleteSection = async (index) => {
  // Only allow deletion if there's more than one section
  if (Reports().reports_data.length <= 1) {
    Toast.warning('Cannot delete the last section. At least one section is required.')
    return
  }

  // Enhanced confirmation dialog with SweetAlert2
  const result = await Swal.fire({
    title: 'Delete Section?',
    html: `Are you sure you want to delete the <strong>"${
      Reports().reports_data[index].heading
    }"</strong> section?<br><br>This action cannot be undone.`,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#d33',
    cancelButtonColor: '#3085d6',
    confirmButtonText: 'Yes, delete it!',
    cancelButtonText: 'Cancel',
    focusCancel: true
  })

  // If confirmed, delete the section
  if (result.isConfirmed) {
    // Delete the section
    Reports().reports_data.splice(index, 1)

    // Recalculate section totals
    calculateSectionTotals()

    // Show success toast
    Toast.success('Section deleted successfully')
  }
}

// Function to delete report
const deleteReport = async () => {
  // Confirmation dialog
  const result = await Swal.fire({
    title: 'Delete Report?',
    text: 'Are you sure you want to delete this report? This action cannot be undone.',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#d33',
    cancelButtonColor: '#3085d6',
    confirmButtonText: 'Yes, delete it!',
    cancelButtonText: 'Cancel',
    focusCancel: true
  })

  if (result.isConfirmed) {
    try {
      isDeleting.value = true
      const success = await Reports().deleteReport(reportData.value.id, reportData.value.table)
      if (success) {
        Toast.success('Report deleted successfully')
        // Navigate back to reports list
        router.push('/client/reports')
      }
    } catch (error) {
      console.error('Error deleting report:', error)
      Toast.error('Failed to delete report: ' + (error.message || 'Unknown error'))
    } finally {
      isDeleting.value = false
    }
  }
}

// Function to cancel and go back to reports list
const cancelEdit = () => {
  router.push('/client/reports')
}

// Load ranges on component mount to ensure we have the latest client ranges
onMounted(async () => {
  try {
    // Add flags to track what's already initialized
    let isAuthInitialized = !!Auth().token
    let isClientInitialized = !!Client().selected_client?.uuid

    console.log('Edit report component mounted, checking initialization state:')
    console.log('- Auth initialized:', isAuthInitialized)
    console.log('- Client initialized:', isClientInitialized)

    // Step 1: Initialize Auth if needed
    if (!isAuthInitialized) {
      console.log('Initializing Auth...')
      await Auth().init()

      // Only call current() if we have a token but no user data
      if (Auth().token && !Auth().user?.id) {
        console.log('Fetching current user data...')
        await Auth().current()
      }
    }

    // Small delay to ensure auth processes complete
    await new Promise((resolve) => setTimeout(resolve, 100))

    // Step 2: Initialize Client if needed
    if (!isClientInitialized) {
      console.log('Initializing Client...')
      await Client().init()
    }

    // Step 3: Verify we have a selected client
    if (!Client().selected_client?.uuid) {
      console.warn('No client selected, cannot load report data')
      Toast.warning('Please select a client first')
      isLoading.value = false
      return
    }

    // Step 4: Initialize dependent data only if not already loaded
    const loadSequence = async () => {
      // Check if ranges data already exists
      if (!Ranges().ranges || Ranges().ranges.length === 0) {
        console.log('Fetching ranges data...')
        isLoadingRanges.value = true
        await Ranges().fetch()
        isLoadingRanges.value = false
      }

      // Check if branches data already exists
      if (!Branches().branches || Branches().branches.length === 0) {
        console.log('Fetching branches data...')
        isLoadingBranches.value = true
        await Branches().fetch()
        isLoadingBranches.value = false
      }

      // Load client responses
      // Always call loadClientResponses to ensure clientResponses.value is updated from store
      console.log('Loading client responses...')
      await loadClientResponses()

      // Load the report data last
      console.log('Loading report data...')
      await loadReport()
    }

    // Execute the load sequence
    await loadSequence()
  } catch (error) {
    console.error('Error in component initialization:', error)
    Toast.error('Failed to initialize report editor')
    isLoading.value = false
  }
})
</script>

<style scoped>
textarea {
  resize: auto;
  width: 200px;
  height: 100px;
}
</style>

<template>
  <DefaultLayout>
    <div class="bg-white p-4 rounded">
      <div class="flex justify-between items-center mb-4">
        <h1 class="text-xl font-bold">Edit Assessment Report</h1>
        <div class="flex gap-2">
          <Button
            @onClick="saveReport"
            :type="'button'"
            :label="isSaving ? 'Saving...' : 'Save Changes'"
            class="bg-blue-500"
            :disabled="isSaving || hasSaved"
          >
            <span v-if="isSaving" class="inline-block mr-2">
              <svg
                class="animate-spin h-5 w-5 text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
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
            </span>
            <svg
              v-else
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke-width="1.5"
              stroke="currentColor"
              class="w-5 h-5 mr-2"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0 1 11.186 0z"
              />
            </svg>
          </Button>
          <Button
            @onClick="deleteReport"
            :type="'button'"
            :label="isDeleting ? 'Deleting...' : 'Delete Report'"
            class="bg-red-500"
            :disabled="isDeleting"
          >
            <span v-if="isDeleting" class="inline-block mr-2">
              <svg
                class="animate-spin h-5 w-5 text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
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
            </span>
            <svg
              v-else
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke-width="1.5"
              stroke="currentColor"
              class="w-5 h-5 mr-2"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"
              />
            </svg>
          </Button>
          <Button @onClick="cancelEdit" :type="'button'" label="Cancel" class="bg-gray-500">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke-width="1.5"
              stroke="currentColor"
              class="w-5 h-5 mr-2"
            >
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </Button>
        </div>
      </div>

      <!-- Main loading spinner with enhanced design -->
      <div
        v-if="isLoading"
        class="fixed top-[20rem] inset-0 flex flex-col justify-center items-center bg-gradient-to-br from-blue-50 to-indigo-100 z-[999]"
      >
        <div class="bg-white rounded-2xl shadow-2xl p-8 mx-4 max-w-sm w-full">
          <div class="flex flex-col items-center">
            <!-- Enhanced spinner with multiple rings -->
            <div class="relative w-20 h-20 mb-6">
              <div class="absolute top-0 left-0 w-full h-full">
                <div class="animate-spin rounded-full h-20 w-20 border-4 border-gray-200"></div>
                <div
                  class="animate-spin rounded-full h-20 w-20 border-4 border-blue-500 border-t-transparent absolute top-0 left-0"
                ></div>
              </div>
              <div class="absolute top-2 left-2 w-16 h-16">
                <div class="animate-ping rounded-full h-16 w-16 bg-blue-400 opacity-20"></div>
              </div>
              <!-- Report icon in center -->
              <div class="absolute inset-0 flex items-center justify-center">
                <svg
                  class="w-8 h-8 text-blue-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </div>
            </div>

            <!-- Loading text with animation -->
            <div class="text-center">
              <h3 class="text-lg font-semibold text-gray-800 mb-2">{{ loadingMessage }}</h3>
              <div class="flex items-center justify-center space-x-1">
                <div
                  class="animate-bounce w-2 h-2 bg-blue-500 rounded-full"
                  style="animation-delay: 0ms"
                ></div>
                <div
                  class="animate-bounce w-2 h-2 bg-blue-500 rounded-full"
                  style="animation-delay: 150ms"
                ></div>
                <div
                  class="animate-bounce w-2 h-2 bg-blue-500 rounded-full"
                  style="animation-delay: 300ms"
                ></div>
              </div>
              <p class="text-sm text-gray-500 mt-3">Please wait while we prepare your report</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Granular loading indicators with enhanced design -->
      <div
        v-else-if="isLoadingReport || isLoadingBranches || isLoadingRanges || isLoadingResponses"
        class="fixed inset-0 flex justify-center items-center bg-gradient-to-br from-slate-50 to-gray-100 z-50"
      >
        <div class="bg-white shadow-2xl rounded-2xl p-8 mx-4 max-w-lg w-full">
          <div class="text-center mb-8">
            <div class="relative w-16 h-16 mx-auto mb-4">
              <div
                class="absolute inset-0 animate-spin rounded-full border-4 border-gray-200"
              ></div>
              <div
                class="absolute inset-0 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"
                style="animation-duration: 1.5s"
              ></div>
              <div
                class="absolute inset-2 animate-spin rounded-full border-2 border-indigo-300 border-t-transparent"
                style="animation-duration: 2s; animation-direction: reverse"
              ></div>
            </div>
            <h2 class="text-2xl font-bold text-gray-800 mb-2">Loading Report Data</h2>
            <p class="text-gray-500">Setting up your editing environment...</p>
          </div>

          <div class="space-y-4">
            <div
              class="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-blue-50 to-blue-100"
              v-if="isLoadingRanges"
            >
              <div class="flex items-center">
                <div class="relative w-6 h-6 mr-4">
                  <div
                    class="animate-spin rounded-full h-6 w-6 border-2 border-blue-500 border-t-transparent"
                  ></div>
                </div>
                <div>
                  <p class="font-medium text-gray-800">Rating Ranges</p>
                  <p class="text-xs text-gray-500">Loading scoring system...</p>
                </div>
              </div>
              <div class="flex space-x-1">
                <div class="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                <div
                  class="w-2 h-2 bg-blue-500 rounded-full animate-pulse"
                  style="animation-delay: 0.1s"
                ></div>
                <div
                  class="w-2 h-2 bg-blue-500 rounded-full animate-pulse"
                  style="animation-delay: 0.2s"
                ></div>
              </div>
            </div>

            <div
              class="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-green-50 to-green-100"
              v-if="isLoadingBranches"
            >
              <div class="flex items-center">
                <div class="relative w-6 h-6 mr-4">
                  <div
                    class="animate-spin rounded-full h-6 w-6 border-2 border-green-500 border-t-transparent"
                  ></div>
                </div>
                <div>
                  <p class="font-medium text-gray-800">Branches Data</p>
                  <p class="text-xs text-gray-500">Loading location information...</p>
                </div>
              </div>
              <div class="flex space-x-1">
                <div class="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <div
                  class="w-2 h-2 bg-green-500 rounded-full animate-pulse"
                  style="animation-delay: 0.1s"
                ></div>
                <div
                  class="w-2 h-2 bg-green-500 rounded-full animate-pulse"
                  style="animation-delay: 0.2s"
                ></div>
              </div>
            </div>

            <div
              class="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-yellow-50 to-yellow-100"
              v-if="isLoadingResponses"
            >
              <div class="flex items-center">
                <div class="relative w-6 h-6 mr-4">
                  <div
                    class="animate-spin rounded-full h-6 w-6 border-2 border-yellow-500 border-t-transparent"
                  ></div>
                </div>
                <div>
                  <p class="font-medium text-gray-800">Response Options</p>
                  <p class="text-xs text-gray-500">Loading evaluation choices...</p>
                </div>
              </div>
              <div class="flex space-x-1">
                <div class="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
                <div
                  class="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"
                  style="animation-delay: 0.1s"
                ></div>
                <div
                  class="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"
                  style="animation-delay: 0.2s"
                ></div>
              </div>
            </div>

            <div
              class="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-purple-50 to-purple-100"
              v-if="isLoadingReport"
            >
              <div class="flex items-center">
                <div class="relative w-6 h-6 mr-4">
                  <div
                    class="animate-spin rounded-full h-6 w-6 border-2 border-purple-500 border-t-transparent"
                  ></div>
                </div>
                <div>
                  <p class="font-medium text-gray-800">Report Content</p>
                  <p class="text-xs text-gray-500">Loading existing data...</p>
                </div>
              </div>
              <div class="flex space-x-1">
                <div class="w-2 h-2 bg-purple-500 rounded-full animate-pulse"></div>
                <div
                  class="w-2 h-2 bg-purple-500 rounded-full animate-pulse"
                  style="animation-delay: 0.1s"
                ></div>
                <div
                  class="w-2 h-2 bg-purple-500 rounded-full animate-pulse"
                  style="animation-delay: 0.2s"
                ></div>
              </div>
            </div>
          </div>

          <div class="mt-6 text-center">
            <div class="flex justify-center space-x-1">
              <div
                class="animate-bounce w-2 h-2 bg-gray-400 rounded-full"
                style="animation-delay: 0ms"
              ></div>
              <div
                class="animate-bounce w-2 h-2 bg-gray-400 rounded-full"
                style="animation-delay: 150ms"
              ></div>
              <div
                class="animate-bounce w-2 h-2 bg-gray-400 rounded-full"
                style="animation-delay: 300ms"
              ></div>
            </div>
          </div>
        </div>
      </div>

      <div v-else-if="!reportData" class="text-center py-16">
        <p class="text-xl text-gray-500">Report not found or failed to load</p>
        <Button
          @onClick="cancelEdit"
          :type="'button'"
          label="Back to Reports"
          class="mt-4 bg-blue-500"
        />
      </div>

      <div v-else>
        <!-- Rest of the report editing interface -->
        <p class="mb-4 text-gray-600">
          Editing report: <strong>{{ reportData.template_name }}</strong>
          <span
            class="ml-2 px-2 py-1 text-xs rounded-full"
            :class="{
              'bg-yellow-100 text-yellow-800': reportData.status === 'draft',
              'bg-blue-100 text-blue-800': reportData.status === 'submitted',
              'bg-green-100 text-green-800': reportData.status === 'approved',
              'bg-red-100 text-red-800': reportData.status === 'rejected'
            }"
          >
            {{ reportData.status }}
          </span>
        </p>

        <!-- Add Media Links Section -->
        <div v-if="reportData?.media_links" class="mb-4 bg-white p-4 rounded-lg shadow">
          <div class="flex items-center mb-2">
            <h2 class="text-lg font-semibold">Media Links</h2>
            <span class="ml-2 text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
              Updates automatically with date changes
            </span>
          </div>
          <div class="grid grid-cols-1 gap-2">
            <div
              v-if="reportData.media_links.video_url || reportData.media_links.video_link"
              class="border p-2 rounded"
            >
              <p class="text-sm font-medium">Video Link:</p>
              <div class="flex items-center">
                <a
                  :href="reportData.media_links.video_url || reportData.media_links.video_link"
                  target="_blank"
                  class="text-blue-500 text-sm break-all"
                >
                  {{ reportData.media_links.video_url || reportData.media_links.video_link }}
                </a>
                <button
                  @click="
                    copyToClipboard(
                      reportData.media_links.video_url || reportData.media_links.video_link
                    )
                  "
                  class="ml-2 p-1 rounded bg-gray-100 hover:bg-gray-200"
                  title="Copy to clipboard"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    class="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                    />
                  </svg>
                </button>
              </div>
            </div>

            <div
              v-if="reportData.media_links.images_urls || reportData.media_links.image_link"
              class="border p-2 rounded"
            >
              <p class="text-sm font-medium">Images Links:</p>
              <!-- Show multiple image URLs if available -->
              <div
                v-if="
                  reportData.media_links.images_urls &&
                  Array.isArray(reportData.media_links.images_urls)
                "
                class="space-y-1"
              >
                <div
                  v-for="(imageUrl, index) in reportData.media_links.images_urls"
                  :key="index"
                  class="flex items-center"
                >
                  <a :href="imageUrl" target="_blank" class="text-blue-500 text-sm break-all">
                    {{ imageUrl }}
                  </a>
                  <button
                    @click="copyToClipboard(imageUrl)"
                    class="ml-2 p-1 rounded bg-gray-100 hover:bg-gray-200"
                    title="Copy to clipboard"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      class="h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                      />
                    </svg>
                  </button>
                </div>
              </div>
              <!-- Fallback for single image link -->
              <div v-else-if="reportData.media_links.image_link" class="flex items-center">
                <a
                  :href="reportData.media_links.image_link"
                  target="_blank"
                  class="text-blue-500 text-sm break-all"
                >
                  {{ reportData.media_links.image_link }}
                </a>
                <button
                  @click="copyToClipboard(reportData.media_links.image_link)"
                  class="ml-2 p-1 rounded bg-gray-100 hover:bg-gray-200"
                  title="Copy to clipboard"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    class="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                    />
                  </svg>
                </button>
              </div>
            </div>

            <div
              v-if="reportData.media_links.audio_url || reportData.media_links.audio_link"
              class="border p-2 rounded"
            >
              <p class="text-sm font-medium">Audio Link:</p>
              <div class="flex items-center">
                <a
                  :href="reportData.media_links.audio_url || reportData.media_links.audio_link"
                  target="_blank"
                  class="text-blue-500 text-sm break-all"
                >
                  {{ reportData.media_links.audio_url || reportData.media_links.audio_link }}
                </a>
                <button
                  @click="
                    copyToClipboard(
                      reportData.media_links.audio_url || reportData.media_links.audio_link
                    )
                  "
                  class="ml-2 p-1 rounded bg-gray-100 hover:bg-gray-200"
                  title="Copy to clipboard"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    class="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                    />
                  </svg>
                </button>
              </div>
            </div>

            <div
              v-if="reportData.media_links.timestamp_url || reportData.timestamp_url"
              class="border p-2 rounded"
            >
              <p class="text-sm font-medium">Timestamp URL:</p>
              <div class="flex items-center">
                <a
                  :href="reportData.media_links.timestamp_url || reportData.timestamp_url"
                  target="_blank"
                  class="text-blue-500 text-sm break-all"
                >
                  {{ reportData.media_links.timestamp_url || reportData.timestamp_url }}
                </a>
                <button
                  @click="
                    copyToClipboard(
                      reportData.media_links.timestamp_url || reportData.timestamp_url
                    )
                  "
                  class="ml-2 p-1 rounded bg-gray-100 hover:bg-gray-200"
                  title="Copy to clipboard"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    class="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                    />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- The rest of your template would go here -->

        <table class="report-table mx-auto">
          <thead>
            <tr>
              <th
                colspan="24"
                :style="{ backgroundColor: colors.titleBg, color: 'white', padding: '10px' }"
              >
                <div class="flex flex-col items-center justify-center">
                  <div v-if="colors.logo" class="mb-2">
                    <img :src="colors.logo" alt="Report Logo" class="h-16 object-contain" />
                  </div>
                  <h1 class="text-center">
                    {{ Client().selected_client?.name || 'Client' }} - MYSTERY SHOPPING Assessment
                    {{
                      primaryIdentifierField && selectedFieldValues[primaryIdentifierField]?.name
                        ? '[' + selectedFieldValues[primaryIdentifierField].name + ']'
                        : ''
                    }}
                  </h1>
                </div>
              </th>
            </tr>
          </thead>

          <tbody class="text-sm">
            <!-- Dynamic Branch Information Fields -->
            <template v-for="field in customFields" :key="field.label">
              <tr v-if="field.headerField">
                <td class="no-border">&nbsp;</td>
                <td class="border border-black p-2" colspan="2">
                  <div class="flex items-center gap-2">
                    {{ field.label }}
                    <span
                      v-if="primaryIdentifierField === field.headerField"
                      class="bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded-full"
                    >
                      Primary ({{ getPrimaryFieldDisplayValue() }})
                    </span>
                  </div>
                </td>
                <td class="border border-black p-2" colspan="4">
                  <Dropdown
                    v-model="selectedFieldValues[field.headerField]"
                    :options="getBranchFieldOptions(field.headerField)"
                    optionLabel="name"
                    placeholder="Select Value"
                    class="w-full"
                    @change="(e) => onDropdownChange(e, field)"
                    :class="{
                      'border-2 border-blue-500': primaryIdentifierField === field.headerField
                    }"
                    filter
                    :filterPlaceholder="'Search values...'"
                  />
                </td>
                <td class="no-border">&nbsp;</td>
              </tr>
            </template>

            <tr>
              <td class="no-border">&nbsp;</td>
              <td class="border border-black p-2" colspan="2">Date</td>
              <td class="border border-black p-2" colspan="3">
                <DatePicker
                  class="w-32"
                  v-model="date"
                  showIcon
                  fluid
                  iconDisplay="input"
                  @update:modelValue="regenerateMediaLinks"
                />
              </td>
              <td
                :style="{
                  textAlign: 'center',
                  backgroundColor: colors.titleBg,
                  color: '#fcf3f3',
                  border: 'solid blue'
                }"
              >
                <h4><b>Total Score</b></h4>
              </td>
            </tr>
            <tr>
              <td class="no-border">&nbsp;</td>
              <td class="border border-black p-2" colspan="2">Time</td>
              <td class="border border-black p-2" colspan="3">
                <InputText type="time" v-model="value" />
              </td>
              <td
                :style="{
                  textAlign: 'center',
                  color: colors.scoreFontColor,
                  border: 'solid'
                }"
              >
                <span style="font-size: 20px; font-weight: bold">
                  {{ totalScores.performance_percentage }}%
                </span>
              </td>
            </tr>

            <!-- Time tracking row -->
            <!-- <tr>
            <td class="no-border">&nbsp;</td>
            <td class="border border-black p-2" colspan="2">Report Creation Time</td>
            <td class="border border-black p-2" colspan="4">
              <div class="flex items-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke-width="1.5"
                  stroke="currentColor"
                  class="w-5 h-5 mr-2 text-primary"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span class="font-mono">{{ formattedTime }}</span>
              </div>
            </td>
          </tr>

          <tr>
            <td class="no-border">&nbsp;</td>
            <td class="border border-black p-2" colspan="2">Timestamp URL</td>
            <td class="border border-black p-2" colspan="4">
              <div class="flex items-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke-width="1.5"
                  stroke="currentColor"
                  class="w-5 h-5 mr-2 text-primary"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244"
                  />
                </svg>
                <span class="font-mono">{{ reportData?.media_links?.timestamp_url || timestampLink }}</span>
                <button
                  @click="copyToClipboard(reportData?.media_links?.timestamp_url || timestampLink)"
                  class="text-gray-500 hover:text-gray-700 ml-2 p-1 rounded hover:bg-gray-200"
                  title="Copy timestamp URL"
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
                      d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184"
                    />
                  </svg>
                </button>
              </div>
            </td>
          </tr>

          <tr>
            <td class="no-border">&nbsp;</td>
            <td class="border border-black p-2" colspan="2">Time In</td>
            <td class="border border-black p-2" colspan="4">
              <InputText type="time" v-model="value" />
            </td>
          </tr> -->

            <!-- 1st info section done here  End-->
            <!-- <tr>
            <td colspan="8" class="no-border">&nbsp;</td>
          </tr> -->

            <!-- Start of non KE CRS -->
            <tr>
              <td class="no-border">&nbsp;</td>
              <td
                colspan="6"
                :style="{
                  textAlign: 'center',
                  backgroundColor: colors.summaryBg
                }"
              >
                <b>Score Summary</b>
              </td>
            </tr>
            <tr>
              <td class="no-border">&nbsp;</td>
              <td
                colspan="2"
                :style="{
                  textAlign: 'center',
                  backgroundColor: colors.headerBg,
                  color: 'white'
                }"
              >
                KPI's
              </td>
              <td
                :style="{
                  textAlign: 'center',
                  backgroundColor: colors.headerBg,
                  color: 'white'
                }"
              >
                Applicable Score
              </td>
              <td
                :style="{
                  textAlign: 'center',
                  backgroundColor: colors.headerBg,
                  color: 'white'
                }"
              >
                Achieved Score
              </td>
              <td
                :style="{
                  textAlign: 'center',
                  backgroundColor: colors.headerBg,
                  color: 'white'
                }"
              >
                Performance %
              </td>
              <td
                :style="{
                  textAlign: 'center',
                  backgroundColor: colors.headerBg,
                  color: 'white'
                }"
              >
                Rating
              </td>
            </tr>

            <tr v-for="(report, i) in Reports().reports_data" :key="i">
              <td class="no-border">&nbsp;</td>
              <td
                colspan="2"
                :style="{
                  fontSize: '13px',
                  backgroundColor: colors.kpiBg,
                  border: 'solid',
                  borderWidth: 'thin'
                }"
              >
                {{ report.heading }}
              </td>
              <td style="font-size: 13px; text-align: center; border: solid; border-width: thin">
                {{ report.total_applicable_score }}
              </td>
              <td style="font-size: 13px; text-align: center; border: solid; border-width: thin">
                {{ report.total_achieved_score }}
              </td>
              <td style="font-size: 13px; text-align: center; border: solid; border-width: thin">
                {{ report.achieved }}
              </td>

              <td
                :style="{
                  border: '1px solid #f4f4f4',
                  textAlign: 'center',
                  color: 'white',
                  backgroundColor: getRatingColor(report.achieved)
                }"
              >
                <b>{{ getRatingText(report.achieved) }}</b>
              </td>
            </tr>

            <tr>
              <td class="no-border">&nbsp;</td>
              <td
                colspan="2"
                :style="{
                  textAlign: 'center',
                  backgroundColor: colors.headerBg,
                  color: 'white'
                }"
              >
                Overall Performance
              </td>
              <td
                :style="{
                  textAlign: 'center',
                  backgroundColor: colors.headerBg,
                  color: 'white'
                }"
              >
                <b>{{ totalScores.total_applicable_score }}</b>
              </td>
              <td
                :style="{
                  textAlign: 'center',
                  backgroundColor: colors.headerBg,
                  color: 'white'
                }"
              >
                <b>{{ totalScores.total_achieved_score }}</b>
              </td>
              <td
                :style="{
                  textAlign: 'center',
                  backgroundColor: colors.headerBg,
                  color: 'white'
                }"
              >
                <b>{{ totalScores.performance_percentage }}%</b>
              </td>
              <td
                :style="{
                  border: '1px solid #f4f4f4',
                  backgroundColor: getRatingColor(totalScores.performance_percentage),
                  textAlign: 'center',
                  color: 'white'
                }"
              >
                <b>{{ getRatingText(totalScores.performance_percentage) }}</b>
              </td>
            </tr>
            <!-- End of non KE CRS -->

            <tr>
              <td class="py-4 text-center text-black font-bold italic" colspan="12">
                Scoring Methadology: Depending upon critically and nature of the non-compliance.
                Scoring will be: Yes / No
              </td>
            </tr>

            <!-- section loop -->
            <template
              v-for="(report, index) in Reports().reports_data"
              :key="report.heading + index"
            >
              <tr class="text-black section-header section-header-animation">
                <th
                  class="border-0 rounded-tl-lg relative overflow-hidden shadow-md"
                  colspan="3"
                  :style="{
                    backgroundColor: colors.kpiBg,
                    backgroundImage:
                      'linear-gradient(to right, rgba(255,255,255,0.1), rgba(255,255,255,0.3), rgba(255,255,255,0.1))'
                  }"
                  :id="report.heading"
                >
                  <div class="flex items-center justify-between gap-2">
                    <div class="flex-1">
                      <input
                        type="text"
                        @blur="(e: any) => e.target.setAttribute('disabled', true)"
                        @focus="(e: any) => e.target.removeAttribute('disabled')"
                        v-model="report.heading"
                        class="p-3 w-full text-lg font-bold bg-transparent border border-transparent hover:border-gray-300 focus:border-gray-400 focus:bg-white/50 rounded-md transition-all"
                        placeholder="Section Heading"
                      />
                      <div
                        class="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity"
                        style="animation: shimmer 2s infinite linear"
                      ></div>
                    </div>
                    <!-- Delete Section Button -->
                    <Button
                      v-if="Reports().reports_data.length > 1"
                      @click="() => deleteSection(index)"
                      :type="'button'"
                      label=""
                      class="bg-red-500 hover:bg-red-600 !p-2 text-white rounded-full shadow-md hover:shadow-lg transition-all transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-red-300"
                      title="Delete Section"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke-width="2"
                        stroke="currentColor"
                        class="size-5"
                      >
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"
                        />
                      </svg>
                    </Button>
                  </div>
                </th>
                <th class="border-0 px-3 py-2 shadow-md" :style="{ backgroundColor: colors.kpiBg }">
                  <div class="flex flex-col">
                    <label class="font-semibold text-xs mb-1 opacity-75 text-center">
                      Weightage:
                    </label>
                  </div>
                </th>

                <th class="border-0 shadow-md" :style="{ backgroundColor: colors.kpiBg }">
                  <input
                    type="text"
                    v-model="report.weightage"
                    class="bg-white/40 backdrop-blur-sm px-4 py-2 rounded-full shadow-inner border border-transparent font-bold text-center min-w-16"
                    placeholder="0%"
                  />
                </th>
                <th class="border-0 px-3 py-2 shadow-md" :style="{ backgroundColor: colors.kpiBg }">
                  <div class="flex flex-col">
                    <label class="font-semibold text-xs mb-1 opacity-75 text-center">
                      Achieved:
                    </label>
                  </div>
                </th>
                <th
                  class="border-0 rounded-tr-lg relative px-3 py-2 shadow-md"
                  :style="{ backgroundColor: colors.kpiBg }"
                >
                  <div class="flex justify-center items-center">
                    <div
                      class="bg-white/40 backdrop-blur-sm px-4 py-2 rounded-full shadow-inner border border-transparent font-bold text-center min-w-16"
                    >
                      {{ report.achieved }}
                    </div>
                  </div>
                </th>
              </tr>

              <tr class="text-center">
                <th class="border border-black !text-center">Questions</th>
                <th class="border border-black !text-center">Sr. No.</th>
                <th class="border border-black !text-center">Sub Questions</th>
                <th
                  class="border border-black text-center flex flex-col justify-center items-center"
                  :style="{ backgroundColor: colors.headerBg, color: 'white' }"
                >
                  Responses
                  <div class="text-xs flex items-center mt-1 justify-center">
                    <div
                      class="bg-blue-50 text-gray-800 px-2 py-1 rounded-md border border-blue-200 w-full"
                    >
                      <div class="flex items-center">
                        <input
                          type="checkbox"
                          :id="`sectionSubtraction-${index}`"
                          v-model="sectionLevelSubtraction[index]"
                          @change="calculateSectionTotals"
                          class="mr-1 h-4 w-4 accent-blue-600"
                        />
                        <label
                          :for="`sectionSubtraction-${index}`"
                          class="cursor-pointer text-xs"
                          title="When checked, each response's value (e.g., 1 for 'Below Average', 2 for 'Very Bad') will be subtracted from the section's total achieved score"
                        >
                          <span
                            :class="{ 'font-bold text-blue-800': sectionLevelSubtraction[index] }"
                            >Subtract values from section</span
                          >
                        </label>
                      </div>
                    </div>
                  </div>
                </th>
                <th
                  class="border border-black !text-center"
                  :style="{ backgroundColor: colors.headerBg, color: 'white' }"
                >
                  Total Score
                </th>
                <th
                  class="border border-black !text-center"
                  :style="{ backgroundColor: colors.headerBg, color: 'white' }"
                >
                  Applicable Score
                </th>
                <th
                  class="border border-black !text-center"
                  :style="{ backgroundColor: colors.headerBg, color: 'white' }"
                >
                  Achieved Score
                </th>
                <th
                  class="border border-black !text-center"
                  :style="{ backgroundColor: colors.headerBg, color: 'white' }"
                >
                  Comments
                </th>
                <th
                  class="border border-black !text-center"
                  :style="{ backgroundColor: colors.headerBg, color: 'white' }"
                >
                  Actions
                </th>
              </tr>

              <tr>
                <td colspan="3" class="border border-black p-2 bg-blue-50">
                  <div class="flex items-center gap-2">
                    <span class="text-sm font-semibold">Apply response to all questions:</span>
                    <select
                      @change="(e) => applyResponseToAllQuestions(report, e.target.value)"
                      class="text-sm p-1 border border-gray-300 rounded"
                    >
                      <option value="">Select response</option>
                      <option
                        v-for="resp in clientResponses"
                        :key="resp.uuid"
                        :value="resp.response"
                      >
                        {{ resp.response }}
                      </option>
                    </select>
                  </div>
                </td>
                <td colspan="5" class="border border-black p-1"></td>
              </tr>

              <template v-for="(data, j) in report.data" :key="j">
                <tr
                  :class="{
                    'bg-red-50':
                      (data.response === 'No' || data.response === 'no') &&
                      (!data.comments || data.comments.trim() === '')
                  }"
                >
                  <td
                    class="border border-black p-2"
                    :class="{
                      'border-2 border-red-500':
                        (data.response === 'No' || data.response === 'no') &&
                        (!data.comments || data.comments.trim() === '')
                    }"
                  >
                    <textarea
                      type="text"
                      placeholder="Enter question here"
                      v-model="data.question"
                      class="w-full rounded-md"
                      cols="10"
                    ></textarea>
                  </td>
                  <td
                    class="border border-black text-center w-12 p-2"
                    :class="{
                      'border-2 border-red-500':
                        (data.response === 'No' || data.response === 'no') &&
                        (!data.comments || data.comments.trim() === '')
                    }"
                  >
                    {{ j + 1 }}
                  </td>
                  <td
                    class="border border-black p-2"
                    :class="{
                      'border-2 border-red-500':
                        (data.response === 'No' || data.response === 'no') &&
                        (!data.comments || data.comments.trim() === '')
                    }"
                  >
                    <textarea
                      type="text"
                      placeholder="Enter sub-question here"
                      v-model="data.sub_question"
                      class="w-full rounded-md"
                      cols="10"
                    ></textarea>
                  </td>
                  <td
                    class="border border-black text-center p-2"
                    :class="{
                      'border-2 border-red-500':
                        (data.response === 'No' || data.response === 'no') &&
                        (!data.comments || data.comments.trim() === '')
                    }"
                  >
                    <div class="flex flex-col gap-2">
                      <div class="flex items-center justify-center gap-1">
                        <select
                          v-model="data.response"
                          @change="calculateScores(data, index)"
                          :class="{
                            'border-2 border-red-500':
                              data.response === 'No' || data.response === 'no'
                          }"
                        >
                          <option v-if="isDev" disabled value="">
                            Debug: {{ responseDebugInfo.storeCount }} stored /
                            {{ responseDebugInfo.selectCount }} select
                          </option>
                          <option
                            v-for="resp in clientResponses"
                            :key="resp.uuid"
                            :value="resp.response"
                          >
                            {{ resp.response }}
                            {{
                              resp.operation ? '(' + resp.operation + resp.total_score + ')' : ''
                            }}
                          </option>
                        </select>

                        <!-- Response buttons moved to top toolbar -->
                      </div>
                    </div>
                  </td>
                  <td
                    class="border border-black text-center p-2"
                    :class="{
                      'border-2 border-red-500':
                        (data.response === 'No' || data.response === 'no') &&
                        (!data.comments || data.comments.trim() === '')
                    }"
                  >
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      @input="calculateScores(data, index)"
                      v-model="data.total_score"
                      class="text-center"
                    />
                  </td>
                  <td
                    class="border border-black text-center p-2"
                    :class="{
                      'border-2 border-red-500':
                        (data.response === 'No' || data.response === 'no') &&
                        (!data.comments || data.comments.trim() === '')
                    }"
                  >
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      disabled
                      v-model="data.applicable_score"
                      class="text-center"
                    />
                  </td>
                  <td
                    class="border border-black text-center p-2"
                    :class="{
                      'border-2 border-red-500':
                        (data.response === 'No' || data.response === 'no') &&
                        (!data.comments || data.comments.trim() === '')
                    }"
                  >
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      disabled
                      v-model="data.achieved_score"
                      class="text-center"
                    />
                  </td>
                  <td
                    class="border border-black p-2"
                    :class="{
                      'border-2 border-red-500':
                        (data.response === 'No' || data.response === 'no') &&
                        (!data.comments || data.comments.trim() === '')
                    }"
                  >
                    <textarea
                      v-model="data.comments"
                      class="text-left w-full rounded-md"
                      :class="{
                        'border-2 border-red-500 focus:ring-red-300':
                          (data.response === 'No' || data.response === 'no') &&
                          (!data.comments || data.comments.trim() === ''),
                        'focus:ring-blue-300 focus:border-blue-400': !(
                          (data.response === 'No' || data.response === 'no') &&
                          (!data.comments || data.comments.trim() === '')
                        )
                      }"
                      :placeholder="
                        data.response === 'No' || data.response === 'no'
                          ? 'Comment is required for No responses'
                          : 'Add comments here'
                      "
                    ></textarea>
                    <p
                      v-if="
                        (data.response === 'No' || data.response === 'no') &&
                        (!data.comments || data.comments.trim() === '')
                      "
                      class="text-red-500 font-bold block"
                    >
                      Reason is required
                    </p>
                  </td>
                  <td class="border border-black p-2 text-center">
                    <div class="flex flex-col items-center gap-2">
                      <button
                        @click="
                          () => {
                            report.data.push(initializeReportRow())
                            calculateSectionTotals()
                          }
                        "
                        type="button"
                        class="action-button bg-green-500 text-white hover:bg-green-600 w-full p-6"
                        title="Add row"
                      >
                        Add
                      </button>

                      <button
                        v-if="report.data.length > 1"
                        @click="
                          () => {
                            report.data.splice(j, 1)
                          }
                        "
                        type="button"
                        class="action-button bg-red-500 text-white hover:bg-red-600 w-full p-6"
                        title="Delete row"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>

                <template v-if="j === report.data.length - 1">
                  <tr>
                    <td
                      :style="{
                        textAlign: 'center',
                        borderTopStyle: 'solid',
                        borderTopWidth: 'thick',
                        borderTopColor: 'black',
                        backgroundColor: colors.headerBg,
                        color: 'white'
                      }"
                      class="font-bold py-3 px-4 border-t-2 border-black text-center"
                    >
                      Section Total
                    </td>
                    <td
                      :style="{
                        textAlign: 'center',
                        borderTopStyle: 'solid',
                        borderTopWidth: 'thick',
                        borderTopColor: 'black',
                        backgroundColor: colors.headerBg,
                        color: 'white'
                      }"
                      class="border-t-2 border-black py-3"
                    ></td>
                    <td
                      :style="{
                        textAlign: 'left',
                        borderTopStyle: 'solid',
                        borderTopWidth: 'thick',
                        borderTopColor: 'black',
                        backgroundColor: colors.headerBg,
                        color: 'white'
                      }"
                    ></td>
                    <td
                      :style="{
                        textAlign: 'center',
                        borderTopStyle: 'solid',
                        borderTopWidth: 'thick',
                        borderTopColor: 'black',
                        backgroundColor: colors.headerBg,
                        color: 'white'
                      }"
                    ></td>
                    <td
                      :style="{
                        textAlign: 'center',
                        borderTopStyle: 'solid',
                        borderTopWidth: 'thick',
                        borderTopColor: 'black',
                        backgroundColor: colors.headerBg,
                        color: 'white'
                      }"
                      class="border-t-2 border-black py-3 px-4 text-center font-medium"
                    >
                      {{ report.total_score }}
                    </td>
                    <td
                      :style="{
                        textAlign: 'center',
                        borderTopStyle: 'solid',
                        borderTopWidth: 'thick',
                        borderTopColor: 'black',
                        backgroundColor: colors.headerBg,
                        color: 'white'
                      }"
                    >
                      <b> {{ report.total_applicable_score }} </b>
                    </td>
                    <td
                      :style="{
                        textAlign: 'center',
                        borderTopStyle: 'solid',
                        borderTopWidth: 'thick',
                        borderTopColor: 'black',
                        backgroundColor: colors.headerBg,
                        color: 'white'
                      }"
                    >
                      <b> {{ report.total_achieved_score }} </b>
                    </td>
                    <td
                      :style="{
                        borderTopStyle: 'solid',
                        borderTopWidth: 'thick',
                        borderTopColor: 'black',
                        backgroundColor: colors.headerBg,
                        color: 'white'
                      }"
                    ></td>
                    <td
                      :style="{
                        borderTopStyle: 'solid',
                        borderTopWidth: 'thick',
                        borderTopColor: 'black',
                        backgroundColor: colors.headerBg,
                        color: 'white'
                      }"
                    ></td>
                  </tr>

                  <!-- <tr>
                  <td
                    :style="{
                      textAlign: 'center',
                      borderTopStyle: 'solid',
                      borderTopWidth: 'thick',
                      borderTopColor: 'black',
                      borderBottomStyle: 'solid',
                      borderBottomWidth: 'thick',
                      borderBottomColor: 'black',
                      borderRightStyle: 'solid',
                      borderRightWidth: 'thin',
                      borderRightColor: 'black',
                      backgroundColor: colors.headerBg,
                      color: 'white'
                    }"
                  >
                    <b> Comments </b>
                  </td>
                  <td
                    :style="{
                      textAlign: 'left',
                      borderTopStyle: 'solid',
                      borderTopWidth: 'thick',
                      borderTopColor: 'black',
                      borderBottomStyle: 'solid',
                      borderBottomWidth: 'thick',
                      borderBottomColor: 'black'
                    }"
                    colspan="7"
                  >
                    <textarea
                      name=""
                      id=""
                      class="w-full rounded-md"
                      placeholder="Add comments here"
                      rows="2"
                      cols="300"
                    ></textarea>
                  </td>
                </tr> -->

                  <tr style="color: white">
                    <td>&nbsp;</td>
                    <td>&nbsp;</td>
                    <td>&nbsp;</td>
                    <td>&nbsp;</td>
                    <td>&nbsp;</td>
                    <td>&nbsp;</td>
                    <td>&nbsp;</td>
                    <td>&nbsp;</td>
                  </tr>
                </template>
              </template>
            </template>

            <tr>
              <td colspan="8" class="py-6">
                <div class="flex justify-center items-center gap-6 my-10">
                  <button
                    @click="
                      () => {
                        Reports().reports_data.push({
                          heading: 'Heading',
                          weightage: '0%',
                          achieved: '0%',
                          data: [
                            {
                              question: 'Add question',
                              sub_question: 'Add sub question',
                              response: '',
                              total_score: 0,
                              applicable_score: 0,
                              achieved_score: 0,
                              comments: ''
                            }
                          ],
                          total_score: 0,
                          total_applicable_score: 0,
                          total_achieved_score: 0
                        })
                        calculateSectionTotals()
                      }
                    "
                    type="button"
                    class="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-full shadow-md transition-all transform hover:scale-105"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke-width="1.5"
                      stroke="currentColor"
                      class="size-6"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 0 1-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 0 1 1.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 0 0-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 0 1-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 0 0-3.375-3.375h-1.5a1.125 1.125 0 0 1-1.125-1.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H9.75"
                      />
                    </svg>
                    <span class="font-medium">Add New Section</span>
                  </button>
                  <Button
                    @onClick="saveReport"
                    :type="'button'"
                    :label="isSaving ? 'Saving...' : 'Save Report'"
                    class="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-full shadow-md transition-all transform hover:scale-105"
                    :disabled="isSaving"
                  >
                    <span v-if="isSaving" class="inline-block mr-2">
                      <svg
                        class="animate-spin h-5 w-5 text-white"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
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
                    </span>
                    <svg
                      v-else
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke-width="1.5"
                      stroke="currentColor"
                      class="w-5 h-5 mr-2"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0 1 11.186 0z"
                      />
                    </svg>
                  </Button>
                </div>
              </td>
            </tr>
            <!-- section loop -->
          </tbody>
        </table>
      </div>
    </div>
  </DefaultLayout>
</template>

<style>
/* Enhanced UI Design for Mystery Shopping Report */
.report-table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  box-shadow:
    0 4px 6px -1px rgba(0, 0, 0, 0.1),
    0 2px 4px -1px rgba(0, 0, 0, 0.06);
  border-radius: 8px;
  overflow: hidden;
}

.report-table th {
  padding: 12px;
  text-align: left;
  font-weight: 600;
}

.report-table td {
  padding: 4px;
  vertical-align: middle;
}

.report-table textarea {
  resize: auto;
  width: 100%;
  min-height: 100px;
  padding: 8px;
  border-radius: 4px;

  font-size: 14px;
  transition: all 0.2s ease;
}

.report-table textarea:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.3);
}

.report-table input[type='number'],
.report-table input[type='text'] {
  width: 50%;
  padding: 8px;
  border-radius: 4px;
  border: 1px solid #e2e8f0;
  transition: all 0.2s ease;
}

.report-table input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.3);
}

.report-table select {
  width: 90%;
  padding: 8px;
  border-radius: 4px;
  border: 1px solid #e2e8f0;
  transition: all 0.2s ease;
  background-color: white;
}

.report-table select:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.3);
}

.section-header {
  background-color: #f8fafc;
  border-bottom: 2px solid #e2e8f0;
}

.action-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  transition: all 0.2s ease;
}

.action-button:hover {
  transform: scale(1.05);
}

.action-button svg {
  width: 16px;
  height: 16px;
}

/* Animation for section headers */
.section-header-animation {
  position: relative;
  overflow: hidden;
}

.section-header-animation::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 2px;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
  animation: shimmer 2s infinite;
  transform: translateX(-100%);
}

@keyframes shimmer {
  100% {
    transform: translateX(100%);
  }
}

/* Reduce width of response column td */
.report-table td:nth-child(4) {
  width: 150px; /* Set narrow width for response column */
  max-width: 150px;
  padding: 2px;
}

/* Reduce width of score columns */
.report-table td:nth-child(5),
.report-table td:nth-child(6),
.report-table td:nth-child(7) {
  width: 150px;
  max-width: 150px;
  padding: 2px;
}

/* Match the headers too */
.report-table th:nth-child(4),
.report-table th:nth-child(5),
.report-table th:nth-child(6),
.report-table th:nth-child(7) {
  width: 150px;
  max-width: 150px;
}
</style>
