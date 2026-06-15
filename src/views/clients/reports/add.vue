<script setup lang="ts" name="ReportAdd">
import { ref, onMounted, computed, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import DefaultLayout from '@/layouts/DefaultLayout.vue'
import { Client } from '@/stores/client'
import { Templates } from '@/stores/templates'
import { Branches } from '@/stores/branches'
import { Responses } from '@/stores/responses'
import { shouldRefresh } from '@/utils/syncProtection'
import DatePicker from 'primevue/datepicker'
import InputText from 'primevue/inputtext'
import Dropdown from 'primevue/dropdown'

import { Reports } from '@/stores/reports'
import toastService from '@/utils/toast'
import Swal from 'sweetalert2'

import Button from '@/components/Buttons/Button.vue'
import { Auth } from '@/stores/auth'
import { Ranges } from '@/stores/ranges'
import { getRatingText, getRatingColor } from '@/utils/ratings'
import {
  generateVideoUrl,
  generateAudioUrl,
  generatePictureUrls,
  generateTimestampUrl,
  generatePdfUrl
} from '@/utils/mediaLinks'
import { formatDateYMD } from '@/utils/dates'
import {
  applyNaScores,
  finalizeSectionTotals,
  getClientNaScoreValue,
  isNaResponse,
  naScoreToNumber
} from '@/utils/naScore'

// Define interfaces for type safety
interface FieldOption {
  name: string
  value: string
}

interface ReportData {
  [key: string]: any
}

interface ResponseData {
  uuid: string
  response: string
  operation?: string
  total_score?: number
  client_id?: string
  created_at?: string
  updated_at?: string
  score_type?: string
  status?: string
}

const route = useRoute()
const router = useRouter()
const date = ref<Date | null>(null)
const value = ref<string>('')
const templateData = ref<any>(null)
const isLoading = ref<boolean>(false)
const loadingMessage = ref<string>('Loading...')
const isSaving = ref<boolean>(false)
const hasSaved = ref<boolean>(false) // Prevent duplicate saves
const sectionLevelSubtraction = ref<Record<number, boolean>>({})
const clientResponses = ref<ResponseData[]>([
  { uuid: '1', response: 'Yes' },
  { uuid: '2', response: 'No' },
  { uuid: '3', response: 'N/A' }
])

// Timer related state
const startTime = ref<Date | null>(null)
const currentTime = ref<Date>(new Date())
const elapsedTimeSeconds = ref<number>(0)
const timerInterval = ref<number | null>(null)
const showTimer = ref<boolean>(true)
const formattedTime = computed(() => {
  const hours = Math.floor(elapsedTimeSeconds.value / 3600)
  const minutes = Math.floor((elapsedTimeSeconds.value % 3600) / 60)
  const seconds = elapsedTimeSeconds.value % 60
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds
    .toString()
    .padStart(2, '0')}`
})

// Add a reference to the visits_add flag
const visitsAdd = ref(false)

// Primary identifier field for auto-filling and field values
const primaryIdentifierField = ref<string>('')
const selectedFieldValues = ref<Record<string, any>>({})

// Initialize timestamp link with a basic value
const timestampLink = ref('')

// Generate a timestamp link in the same format as media links
const generateTimestampLink = () => {
  // Get the primary field value
  const primaryValue = getPrimaryFieldValue()

  // Only proceed if we have a valid primary value
  if (!primaryValue || primaryValue === 'report') {
    console.warn('No valid primary field value for timestamp link')
    return ''
  }

  const reportData = {
    domain_name: Client().selected_client?.domain_name || window.location.hostname,
    client_name: Client().selected_client?.name || 'unknown',
    created_at: new Date(),
    id: Date.now().toString(),
    content: {
      primaryField: {
        name: primaryIdentifierField.value,
        value: primaryValue
      }
    }
  }

  // Generate timestamp URL using the utility function
  const link = generateTimestampUrl(reportData)

  return link
}

// Helper function to get primary field value safely
const getPrimaryFieldValue = () => {
  if (
    primaryIdentifierField.value &&
    selectedFieldValues.value &&
    selectedFieldValues.value[primaryIdentifierField.value]
  ) {
    return (
      selectedFieldValues.value[primaryIdentifierField.value].name ||
      selectedFieldValues.value[primaryIdentifierField.value].value ||
      'report'
    )
  }
  return 'report'
}

// Now initialize the timestamp link after the function declarations
onMounted(async () => {
  // Set loading state while initializing
  isLoading.value = true

  try {
    // We'll set the timestamp link in the initializeTimestampLink function
    Ranges().init()
    await Ranges().fetch()
    Responses().init()
    await Responses().fetch()
    // Make sure to call loadClientResponses to populate clientResponses.value
    await loadClientResponses()
    initializeTimestampLink()

    // Check if there's a template parameter in the URL
    const templateId = route.query.template

    if (templateId) {
      await loadTemplate(templateId as string)
    } else {
      // Start the timer even if no template is loaded
      startTimer()
      // Initialize timestamp link
      initializeTimestampLink()
    }

    // Initialize with default data if no template
    if (!Reports().reports_data || Reports().reports_data.length === 0) {
      Reports().reports_data = [
        {
          heading: 'Branch Experience',
          weightage: '10%',
          achieved: '0%',
          data: [initializeReportRow()],
          total_score: 0,
          total_applicable_score: 0,
          total_achieved_score: 0
        }
      ]
    }
  } catch (error) {
    console.error('Error initializing report:', error)
    toastService.error('Failed to initialize report')
  } finally {
    // Hide loading state when done
    isLoading.value = false
  }
})

// Function to load client responses from the database
const loadClientResponses = async () => {
  if (Client().selected_client?.uuid) {
    try {
      // Check if we should proceed with fetching responses based on cooldown period
      if (!shouldRefresh('responses')) {
        // Even if we're skipping the fetch, we should still get the data from the store
        const storedResponses = Responses().responses_data || []
        if (storedResponses.length > 0) {
          clientResponses.value = storedResponses as ResponseData[]
          return
        }
      }

      await Responses().fetch()
      // Get responses from the Responses store
      const responses = Responses().responses_data || []

      if (responses.length > 0) {
        clientResponses.value = responses as ResponseData[]
      } else {
        console.log('No responses found for client, using defaults')
      }
    } catch (error) {
      console.error('Error loading responses:', error)
      toastService.error('Failed to load responses')
    }
  }
}

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
const customFields = ref<any[]>([])

// Function to calculate scores based on response
const calculateScores = (data: ReportData, sectionIndex: number): void => {
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

  // Check if this section is a Fatal Error section
  const isFatalError = isFatalErrorSection(Reports().reports_data[sectionIndex])

  // ---------------- YES / NO / N/A ----------------
  if (responseText === 'yes' || responseText === 'na' || responseText === 'n/a') {
    if (responseText === 'yes') {
      if (isFatalError) {
        // Fatal Error: Yes → applicable = total, achieved = 0
        data.applicable_score = totalScore
        data.achieved_score = 0
      } else {
        // Normal: Yes → achieved = applicable
        data.achieved_score = totalScore
      }
    } else if (isNaResponse(data.response)) {
      applyNaScores(data, getClientNaScoreValue(Client().selected_client))
    } else {
      data.applicable_score = 0
      data.achieved_score = 0
    }
  } else if (responseText === 'no') {
    if (isFatalError) {
      // Fatal Error: No → applicable = total, achieved = total
      data.applicable_score = totalScore
      data.achieved_score = totalScore
    } else {
      // Normal: No → achieved = 0
      data.achieved_score = 0
    }
  }

  // ---------------- OPERATIONS (+, -, *, /) ----------------
  else if (operation === '-') {
    // Store the subtraction value for section-level calculations
    data.subtraction_value = responseValue

    if (sectionLevelSubtraction.value[sectionIndex]) {
      // Section-level subtraction will be applied later
      data.achieved_score = totalScore
    } else {
      // Question-level subtraction
      data.achieved_score = Math.max(0, totalScore - responseValue)
    }
  } else if (operation === '*') {
    data.achieved_score = totalScore * responseValue
  } else if (operation === '/') {
    data.achieved_score = responseValue !== 0 ? totalScore / responseValue : 0
  } else if (operation === '+') {
    data.achieved_score = totalScore + responseValue
  } else {
    // Default (unknown operation): achieved = applicable
    data.achieved_score = data.applicable_score
  }

  // Always recalculate totals after changing scores
  calculateSectionTotals()
}

// Function to calculate section totals
const calculateSectionTotals = () => {
  // Calculate totals for each section
  Reports().reports_data.forEach((section, sectionIndex) => {
    // Check if this is a fatal error section
    const isFatalSection = isFatalErrorSection(section)
    const hasFatalErrorCondition = checkSectionFatalError(section)

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

      // Handle question-wise scoring for fatal error sections
      if (isFatalSection) {
        // For fatal error sections, applicable score is always the total score
        applicableScore += rowTotalScore

        // Check if this fatal error section has "yes" or "no" response
        if (hasFatalErrorCondition) {
          // Fatal error with "yes" response - achieved score is 0 for all questions
          achievedScore += 0
        } else {
          // Fatal error with "no" response - achieved score is full score for all questions
          if (sectionLevelSubtraction.value[sectionIndex] && row.subtraction_value > 0) {
            sectionSubtractions += Number(row.subtraction_value) || 0
            // For items with subtraction, add the full total score (we'll subtract later)
            achievedScore += rowTotalScore
          } else {
            // For normal questions, add the full total score
            achievedScore += rowTotalScore
          }
        }
      } else {
        // Normal calculation for non-fatal sections
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
      }
    })

    // Apply section-level subtraction if enabled for this specific section
    if (sectionLevelSubtraction.value[sectionIndex] && sectionSubtractions > 0) {
      // Subtract the total subtraction value from the section's achieved score
      achievedScore = Math.max(0, achievedScore - sectionSubtractions)
    }

    // Handle fatal error section scoring
    if (isFatalSection) {
      // Fatal error section - applicable score always shows total score
      section.total_score = totalScore
      section.total_applicable_score = totalScore // Show total score as applicable

      // For fatal error sections, calculate achieved score normally from question responses
      // Don't override it to 0 or total - let it be calculated naturally
      section.total_achieved_score = achievedScore

      // Calculate performance percentage normally
      const performance = totalScore > 0 ? Math.round((achievedScore / totalScore) * 100) : 0
      section.achieved = `${performance}%`
      finalizeSectionTotals(section, Client().selected_client)
    } else {
      // Normal calculation for non-fatal sections
      section.total_score = totalScore
      section.total_applicable_score = applicableScore
      section.total_achieved_score = achievedScore

      // Calculate performance percentage
      const performance =
        applicableScore > 0 ? Math.round((achievedScore / applicableScore) * 100) : 0

      section.achieved = `${performance}%`
      finalizeSectionTotals(section, Client().selected_client)
    }
  })

  // Calculate overall totals
  const totalScores = {
    total_score: 0,
    total_applicable_score: 0,
    total_achieved_score: 0,
    performance_percentage: 0
  }

  // Only include non-fatal error sections in overall calculation
  Reports().reports_data.forEach((section) => {
    // Skip fatal error sections - they don't contribute to overall score
    if (!isFatalErrorSection(section)) {
      totalScores.total_score += Number(section.total_score) || 0
      totalScores.total_applicable_score += naScoreToNumber(section.total_applicable_score)
      totalScores.total_achieved_score += naScoreToNumber(section.total_achieved_score)
    }
  })

  // Check if there's any fatal error with "yes" response
  const hasFatalError = checkFatalError()

  if (hasFatalError) {
    // If fatal error detected, force overall score to 0
    totalScores.total_achieved_score = 0
    totalScores.performance_percentage = 0
  } else {
    // Calculate overall performance percentage from non-fatal sections only
    totalScores.performance_percentage =
      totalScores.total_applicable_score > 0
        ? Math.round((totalScores.total_achieved_score / totalScores.total_applicable_score) * 100)
        : 0
  }

  return totalScores
}

// Function to check if a specific section has fatal error conditions
const checkSectionFatalError = (section: any): boolean => {
  const sectionName = section.heading?.toLowerCase() || ''
  const hasFatalErrorInName = sectionName.includes('fatal error') || sectionName.includes('fatal')

  if (!hasFatalErrorInName) return false

  // Check if any question in this section has a "yes" response
  return section.data?.some((question: any) => {
    const response = question.response?.toLowerCase() || ''
    return response === 'yes'
  })
}

// Function to check for fatal error conditions (any section with fatal error and yes response)
const checkFatalError = (): boolean => {
  // Check if there's any section with "Fatal Error" in the name
  // that has at least one question with "yes" response
  return Reports().reports_data.some((section) => checkSectionFatalError(section))
}

// Function to check if a section is a fatal error section (has fatal error in name)
const isFatalErrorSection = (section: any): boolean => {
  const sectionName = section.heading?.toLowerCase() || ''
  return sectionName.includes('fatal error')
}

// Computed property for total scores
const totalScores = computed(() => calculateSectionTotals())

// Function to check if there are any fatal error sections present
const hasFatalErrorSections = (): boolean => {
  return Reports().reports_data.some((section) => isFatalErrorSection(section))
}

// Computed property for non-fatal error sections totals
const nonFatalErrorTotals = computed(() => {
  const totals = {
    total_score: 0,
    total_applicable_score: 0,
    total_achieved_score: 0,
    performance_percentage: 0
  }

  Reports().reports_data.forEach((section) => {
    if (!isFatalErrorSection(section)) {
      totals.total_score += Number(section.total_score) || 0
      totals.total_applicable_score += naScoreToNumber(section.total_applicable_score)
      totals.total_achieved_score += naScoreToNumber(section.total_achieved_score)
    }
  })

  totals.performance_percentage =
    totals.total_applicable_score > 0
      ? Math.round((totals.total_achieved_score / totals.total_applicable_score) * 100)
      : 0

  return totals
})

// Computed property for fatal error sections totals
const fatalErrorTotals = computed(() => {
  const totals = {
    total_score: 0,
    total_applicable_score: 0,
    total_achieved_score: 0,
    performance_percentage: 0
  }

  Reports().reports_data.forEach((section) => {
    if (isFatalErrorSection(section)) {
      const sectionTotalScore = Number(section.total_score) || 0
      totals.total_score += sectionTotalScore
      // Fatal error section - applicable score always shows total score
      totals.total_applicable_score += naScoreToNumber(section.total_applicable_score)
      totals.total_achieved_score += naScoreToNumber(section.total_achieved_score)
    }
  })

  totals.performance_percentage =
    totals.total_applicable_score > 0
      ? Math.round((totals.total_achieved_score / totals.total_applicable_score) * 100)
      : 0

  return totals
})

// Function to initialize a new report row
const initializeReportRow = () => {
  return {
    question: '',
    sub_question: '',
    response: '',
    total_score: 2,
    applicable_score: 2,
    achieved_score: 0,
    comments: '',
    isDisabled: false
  }
}

// Function to get options for a specific branch field
const getBranchFieldOptions = (headerField: string): FieldOption[] => {
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

// Function to handle dropdown change
const onDropdownChange = (e: any, field: any) => {
  // If this is the primary identifier field, auto-fill other fields
  if (field.headerField === primaryIdentifierField.value) {
    autoFillFields(e.value)
    timestampLink.value = generateTimestampLink()
  }
}

// Automatically fill in other fields based on the primary field selection
const autoFillFields = (selectedValue: any) => {
  if (!primaryIdentifierField.value || !selectedValue) return

  // Find the branch that matches the selected value
  const selectedBranch = Branches().branches.find(
    (branch) => String(branch[primaryIdentifierField.value]) === String(selectedValue.value)
  )

  if (!selectedBranch) return

  // Auto-fill other fields from this branch
  customFields.value.forEach((field) => {
    if (field.headerField && field.headerField !== primaryIdentifierField.value) {
      const fieldValue = selectedBranch[field.headerField]
      if (fieldValue !== undefined) {
        selectedFieldValues.value[field.headerField] = {
          name: String(fieldValue),
          value: String(fieldValue)
        }
      }
    }
  })
}

// Add image compression functions for handling logos
const compressImage = (dataUrl, callback) => {
  const img = new Image()
  img.onload = () => {
    // Create canvas for image compression
    const canvas = document.createElement('canvas')

    // Calculate new dimensions (max 1200px width/height)
    let width = img.width
    let height = img.height
    const MAX_SIZE = 1200

    if (width > height) {
      if (width > MAX_SIZE) {
        height = Math.round((height * MAX_SIZE) / width)
        width = MAX_SIZE
      }
    } else {
      if (height > MAX_SIZE) {
        width = Math.round((width * MAX_SIZE) / height)
        height = MAX_SIZE
      }
    }

    canvas.width = width
    canvas.height = height

    // Draw resized image on canvas
    const ctx = canvas.getContext('2d')
    ctx.drawImage(img, 0, 0, width, height)

    // Determine image format from the data URL
    // Keep PNG format to preserve transparency and colors
    const isPNG = dataUrl.startsWith('data:image/png')
    const imageType = isPNG ? 'image/png' : 'image/jpeg'
    const quality = isPNG ? 0.9 : 0.7 // Higher quality for PNG

    // Get the compressed data URL
    const compressedDataUrl = canvas.toDataURL(imageType, quality)
    callback(compressedDataUrl)
  }
  img.src = dataUrl
}

// Function to start the timer
const startTimer = () => {
  // Initialize or reset timer state
  startTime.value = new Date()
  elapsedTimeSeconds.value = 0
  currentTime.value = new Date()

  // Clear any existing interval
  if (timerInterval.value) {
    clearInterval(timerInterval.value)
  }

  // Start a new interval that updates every second
  timerInterval.value = window.setInterval(() => {
    currentTime.value = new Date()
    if (startTime.value) {
      elapsedTimeSeconds.value = Math.floor(
        (currentTime.value.getTime() - startTime.value.getTime()) / 1000
      )
    }
  }, 1000)
}

// Function to load template, update to handle per-section subtraction settings
const loadTemplate = async (templateId: string) => {
  try {
    isLoading.value = true
    loadingMessage.value = 'Loading template...'
    const template = await Templates().getById(templateId)
    // Initialize Templates store if needed
    // if (Templates().templates.length === 0) {
    //   await Templates().init()
    // }

    // Get template by ID with cache-busting
    // const template = await Templates().getById(templateId)

    if (template) {
      templateData.value = template

      // Apply template data to the report
      if (template.content) {
        // Load reports data if available - this contains all the sections and questions
        if (template.content.reports) {
          Reports().reports_data = JSON.parse(JSON.stringify(template.content.reports))
        }

        // Load custom fields if available
        if (template.content.customFields) {
          customFields.value = JSON.parse(JSON.stringify(template.content.customFields))
        }

        // Load selected field values (branch, region, etc.)
        if (template.content.selectedFieldValues) {
          selectedFieldValues.value = JSON.parse(
            JSON.stringify(template.content.selectedFieldValues)
          )
        }

        // Set primary identifier field if available
        if (template.content.primaryIdentifierField) {
          primaryIdentifierField.value = template.content.primaryIdentifierField
        } else if (customFields.value.length > 0) {
          // Default to first field as primary
          primaryIdentifierField.value = customFields.value[0].headerField || ''
        }

        // Load section-level subtraction settings if available
        if (template.content.sectionLevelSubtraction !== undefined) {
          // Handle both old boolean format and new object format
          if (typeof template.content.sectionLevelSubtraction === 'boolean') {
            // Convert old format to new format
            const value = template.content.sectionLevelSubtraction
            Reports().reports_data.forEach((_, index) => {
              sectionLevelSubtraction.value[index] = value
            })
          } else {
            // Use the object format directly
            sectionLevelSubtraction.value = template.content.sectionLevelSubtraction
          }
        }

        // Load date and time if available
        if (template.content.date) {
          date.value = new Date(template.content.date)
        }

        if (template.content.time) {
          value.value = template.content.time
        }

        // Load colors if available
        if (template.colors) {
          colors.value = JSON.parse(JSON.stringify(template.colors))

          // Handle logo compression if it exists
          if (
            colors.value.logo &&
            typeof colors.value.logo === 'string' &&
            colors.value.logo.length > 100000
          ) {
            // Logo is large, compress it
            compressImage(colors.value.logo, (compressedDataUrl) => {
              colors.value.logo = compressedDataUrl
            })
          }
        }

        // Load visits_add flag if available
        if (template.content.visits_add !== undefined) {
          visitsAdd.value = template.content.visits_add
        }

        // Calculate section totals
        calculateSectionTotals()

        // Start the timer when template is loaded
        startTimer()

        // toastService.success(`Template "${template.template_name}" loaded successfully`)
      }
    }
  } catch (error) {
    console.error('Error loading template:', error)
    toastService.error('Failed to load template')
  } finally {
    isLoading.value = false
  }
}

// Function to save the report, update to handle per-section subtraction settings
const saveReport = async () => {
  try {
    // Prevent duplicate saves
    if (isSaving.value || hasSaved.value) {
      console.warn('Save already in progress or completed')
      return
    }

    // Check if any response is not selected (empty)
    let hasUnselectedResponses = false
    let sectionWithUnselectedResponse = ''
    let questionWithUnselectedResponse = ''

    Reports().reports_data.forEach((section) => {
      section?.data?.forEach((item: any) => {
        if (!item.response || item.response.trim() === '') {
          hasUnselectedResponses = true
          sectionWithUnselectedResponse = section?.heading
          questionWithUnselectedResponse = item.question || item.name || 'Unknown question'
        }
      })
    })

    if (hasUnselectedResponses) {
      toastService.error(
        `Please select a response for all questions. Missing response in section: "${sectionWithUnselectedResponse}" for question: "${questionWithUnselectedResponse}"`
      )
      // Scroll to the section with unselected response
      const sectionElement = document.getElementById(sectionWithUnselectedResponse)
      if (sectionElement) {
        sectionElement.scrollIntoView({ behavior: 'smooth' })
      }
      return
    }

    // Check if any "No" response has an empty comment
    let missingComments = false
    let sectionWithMissingComment = ''

    Reports().reports_data.forEach((section) => {
      section.data.forEach((item: any) => {
        if (
          (item.response === 'No' || item.response === 'no') &&
          (!item.comments || item.comments.trim() === '')
        ) {
          missingComments = true
          sectionWithMissingComment = section.heading
        }
      })
    })

    if (missingComments) {
      toastService.error(
        `Comments required for "No" responses in section: ${sectionWithMissingComment}`
      )
      // Scroll to the section with missing comments
      const sectionElement = document.getElementById(sectionWithMissingComment)
      if (sectionElement) {
        sectionElement.scrollIntoView({ behavior: 'smooth' })
      }
      return
    }

    // Set loading state
    isSaving.value = true
    isLoading.value = true
    loadingMessage.value = 'Saving report...'

    // Mark as saving to prevent duplicates
    hasSaved.value = true

    // Get client name for naming convention
    const clientName = Client().selected_client?.name || 'Client'

    // Get the primary field value for the report name
    let primaryFieldValue = ''
    if (primaryIdentifierField.value && selectedFieldValues.value[primaryIdentifierField.value]) {
      primaryFieldValue =
        selectedFieldValues.value[primaryIdentifierField.value].name ||
        selectedFieldValues.value[primaryIdentifierField.value].value ||
        ''
    }

    // Format template name according to the specified format
    const templateName = `${clientName} - MYSTERY SHOPPING Assessment - [${primaryFieldValue}]`

    const d = date.value || new Date()
    const formattedDate = formatDateYMD(d)

    // Ensure the content object has all required fields
    const contentObject = {
      reports: Reports().reports_data,
      customFields: customFields.value,
      selectedFieldValues: selectedFieldValues.value,
      primaryIdentifierField: primaryIdentifierField.value,
      date: formattedDate,
      time: value.value,
      sectionLevelSubtraction: sectionLevelSubtraction.value,
      visits_add: visitsAdd.value, // Store the visits setting
      // Add timer information to the report
      timerInfo: {
        startTime: startTime.value ? startTime.value.toISOString() : null,
        elapsedTimeSeconds: elapsedTimeSeconds.value,
        formattedTime: formattedTime.value
      },
      // Add timestamp link
      timestamp_url: timestampLink.value
    }

    // If we have a selected primary field and a value, add it directly to the content for easier backend access
    if (primaryIdentifierField.value && selectedFieldValues.value[primaryIdentifierField.value]) {
      const primaryField = selectedFieldValues.value[primaryIdentifierField.value]

      // Add the primary field information directly to the content object
      contentObject.primaryField = {
        name: primaryIdentifierField.value,
        value: primaryField.name || primaryField.value || ''
      }
    }

    // Check if there are any fatal errors
    const hasFatalError = checkFatalError()

    // Create report data object (without media URLs initially)
    const reportData = {
      template_name: templateName,
      colors: colors.value,
      content: contentObject,
      // Keep status as draft regardless of fatal error (goes through normal approval flow)
      status: 'draft',
      // Add flag to indicate if this report should use visit counting
      visits_add: visitsAdd.value,
      // Also include elapsed time at the top level for easier querying
      elapsed_time_seconds: elapsedTimeSeconds.value,
      // Add fatal error flag for backend reference (displayed as "FATAL ERROR" but status stays draft)
      has_fatal_error: hasFatalError
    }
    // Save report using the store method
    const savedReport = await Reports().saveReport(reportData)

    // Generate all media URLs using the saved report's primary field value
    let allMediaUrls: {
      video_url: string | null
      audio_url: string | null
      images_urls: string[] | null
      timestamp_url: string | null
      pdf_url: string | null
    } = {
      video_url: null,
      audio_url: null,
      images_urls: null,
      timestamp_url: null,
      pdf_url: null
    }

    if (savedReport && savedReport.primary_field && savedReport.primary_field.value) {
      const d = date.value || new Date()
      const formattedDate = formatDateYMD(d)
      // Create a report object with the necessary data for media URL generation
      const reportForMediaUrls = {
        domain_name: Client().selected_client?.domain_name || window.location.hostname,
        client_name: Client().selected_client?.name || 'unknown',
        created_at: new Date(),
        date: formattedDate,
        id: savedReport.id || Date.now().toString(),
        content: {
          primaryField: {
            name: savedReport.primary_field.name,
            value: savedReport.primary_field.value
          }
        }
      }

      // Generate all media URLs
      allMediaUrls.video_url = generateVideoUrl(reportForMediaUrls)
      allMediaUrls.audio_url = generateAudioUrl(reportForMediaUrls)
      allMediaUrls.images_urls = generatePictureUrls(reportForMediaUrls, 10) // Generate up to 10 image URLs
      allMediaUrls.timestamp_url = generateTimestampUrl(reportForMediaUrls)
      allMediaUrls.pdf_url = generatePdfUrl(reportForMediaUrls)

      // Update the local timestamp link for UI display
      timestampLink.value = allMediaUrls.timestamp_url || ''

      // Now update the saved report with media URLs using saveReport with the ID
      const updateData = {
        ...reportData, // Include all original report data
        reportId: savedReport.id, // Add the ID to trigger update mode
        video_url: allMediaUrls.video_url,
        audio_url: allMediaUrls.audio_url,
        images_urls: allMediaUrls.images_urls,
        timestamp_url: allMediaUrls.timestamp_url,
        pdf_url: allMediaUrls.pdf_url,
        media_links: {
          video_url: allMediaUrls.video_url,
          audio_url: allMediaUrls.audio_url,
          images_urls: allMediaUrls.images_urls,
          timestamp_url: allMediaUrls.timestamp_url,
          pdf_url: allMediaUrls.pdf_url
        }
      }

      // Update the report with media URLs using the same saveReport method
      try {
        const updatedReport = await Reports().updateReport(updateData)

        // Update the saved report reference with the updated data
        Object.assign(savedReport, updatedReport)
      } catch (updateError) {
        console.error('Failed to update report with media URLs:', updateError)
        // Don't fail the entire save operation if media URL update fails
        toastService.warning(
          'Report saved but failed to update media URLs. Please try saving again.'
        )
      }
    }

    if (savedReport) {
      toastService.success(`Report "${templateName}" saved successfully to client-specific table`)

      // Redirect to the reports page after successful save
      router.push('/client/reports')
    }
  } catch (error) {
    console.error('Error saving report:', error)

    // Handle duplicate detection specifically
    if (error.message && error.message.includes('already exists')) {
      toastService.error('Duplicate Report: ' + error.message)
    } else {
      toastService.error('Failed to save report: ' + (error.message || 'Unknown error'))
    }

    // Reset hasSaved on error to allow retry
    hasSaved.value = false
  } finally {
    isSaving.value = false
    isLoading.value = false
  }
}

// Function to delete a section with confirmation
const deleteSection = async (index: number) => {
  // Only allow deletion if there's more than one section
  if (Reports().reports_data.length <= 1) {
    toastService.warning('Cannot delete the last section. At least one section is required.')
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
    toastService.success('Section deleted successfully')
  }
}

// Load ranges on component mount to ensure we have the latest client ranges
onMounted(async () => {
  // Set loading state
  isLoading.value = true
  loadingMessage.value = 'Initializing report...'

  try {
    // Load the client's custom ranges if available
    if (Client().selected_client?.uuid) {
      loadingMessage.value = 'Loading client ranges...'
      await Ranges().fetch()
    }

    // Check if user has permission to create reports
    if (!Auth().isAdmin() && !Auth().isReportingUser()) {
      toastService.error('You do not have permission to create reports')
      router.push('/dashboard')
      return
    }

    // Initialize branches data
    await Branches().fetch()

    // Load client responses
    await loadClientResponses()

    // Check if there's a template parameter in the URL
    const templateId = route.query.template

    if (templateId) {
      loadingMessage.value = 'Loading template...'
      await loadTemplate(templateId as string)
    } else {
      // Start the timer even if no template is loaded
      startTimer()
      // Initialize timestamp link
      initializeTimestampLink()
    }

    // Initialize with default data if no template
    if (!Reports().reports_data || Reports().reports_data.length === 0) {
      loadingMessage.value = 'Creating default report structure...'
      Reports().reports_data = [
        {
          heading: 'Branch Experience',
          weightage: '10%',
          achieved: '0%',
          data: [initializeReportRow()],
          total_score: 0,
          total_applicable_score: 0,
          total_achieved_score: 0
        }
      ]
    }
  } catch (error) {
    console.error('Error initializing report:', error)
    toastService.error('Failed to initialize report')
  } finally {
    // Hide loading state when done
    isLoading.value = false
  }
})

// Function to apply the same response to all questions in a section
const applyResponseToAllQuestions = (section: any, selectedResponse: string): void => {
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
}

// Clean up the interval when the component is unmounted
onBeforeUnmount(() => {
  if (timerInterval.value) {
    clearInterval(timerInterval.value)
    timerInterval.value = null
  }
})

const initializeTimestampLink = () => {
  // Make sure the primary field value is defined before generating a link
  // Wait until we have a primary field value before setting the timestamp link
  if (
    selectedFieldValues.value &&
    primaryIdentifierField.value &&
    selectedFieldValues.value[primaryIdentifierField.value]
  ) {
    timestampLink.value = generateTimestampLink()
  } else {
    // We'll update this when the primary field is selected
    timestampLink.value = ''
  }
}

// Add a new computed property for checking development mode
const isDev = computed(() => {
  // Check if we're in dev mode using any available method in the project
  // Since we can't use import.meta.env.DEV directly in templates
  return process.env.NODE_ENV === 'development'
})
// Add a function to handle closing the report with confirmation
const closeReportWithConfirmation = async () => {
  // Show confirmation dialog
  const result = await Swal.fire({
    title: 'Close Report?',
    text: 'Are you sure you want to close this report? Any unsaved changes will be lost.',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#d33',
    cancelButtonColor: '#3085d6',
    confirmButtonText: 'Yes, close it',
    cancelButtonText: 'Cancel'
  })

  // If confirmed, navigate back to reports list
  if (result.isConfirmed) {
    router.push('/client/reports')
  }
}
</script>

<template>
  <DefaultLayout :hideSidebar="true">
    <!-- Add loading overlay -->
    <div v-if="isLoading" class="loading-overlay">
      <div class="loading-content">
        <svg
          class="animate-spin h-10 w-10 text-primary"
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
        <p class="mt-4 text-lg font-semibold">{{ loadingMessage }}</p>
      </div>
    </div>

    <div class="bg-white p-4 rounded">
      <div class="flex justify-between items-center mb-4">
        <h1 class="text-xl font-bold">Assessment Report</h1>
        <div class="flex items-center gap-4">
          <!-- Timer display -->
          <div
            v-if="showTimer"
            class="flex items-center gap-2 bg-gray-100 rounded-lg px-3 py-2 text-gray-700"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke-width="1.5"
              stroke="currentColor"
              class="w-5 h-5 text-primary"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span class="font-mono">{{ formattedTime }}</span>
            <button
              @click="showTimer = false"
              class="text-gray-500 hover:text-gray-700 ml-1"
              title="Hide timer"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke-width="1.5"
                stroke="currentColor"
                class="w-4 h-4"
              >
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <button
            v-else
            @click="showTimer = true"
            class="flex items-center gap-1 text-primary hover:text-primary-dark"
            title="Show timer"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke-width="1.5"
              stroke="currentColor"
              class="w-5 h-5"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span class="text-sm">Show Timer</span>
          </button>

          <!-- Admin Tools Section -->
          <div v-if="Auth().isAdmin()" class="flex items-center gap-2">
            <router-link
              to="/client/responses"
              class="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-md flex items-center gap-1 text-sm"
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
                  d="M10.5 6h9.75M10.5 6a1.5 1.5 0 1 1-3 0m3 0a1.5 1.5 0 1 0-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-9.75 0h9.75"
                />
              </svg>
              Manage Responses
            </router-link>
          </div>

          <button
            @click="closeReportWithConfirmation"
            class="bg-red-500 text-white p-[0.4rem] rounded-md hover:bg-red-700"
          >
            Close
          </button>
        </div>
      </div>

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
              <DatePicker class="w-32" v-model="date" showIcon fluid iconDisplay="input" />
              {{ date }}
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
              <div class="flex flex-col items-center">
                <span style="font-size: 20px; font-weight: bold">
                  {{ totalScores.performance_percentage }}%
                </span>
                <!-- Fatal Error Warning -->
                <div v-if="checkFatalError()" class="mt-1">
                  <div
                    class="bg-red-100 border border-red-400 text-red-700 px-2 py-1 rounded text-xs font-semibold"
                  >
                    ⚠️ FATAL ERROR DETECTED
                  </div>
                </div>
              </div>
            </td>
          </tr>

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

          <!-- Non-Fatal Error Sections -->
          <tr
            v-for="(report, i) in Reports().reports_data.filter((r) => !isFatalErrorSection(r))"
            :key="`non-fatal-${i}`"
          >
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
              <div class="flex items-center justify-between">
                <span>{{ report.heading }}</span>
              </div>
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

          <!-- Non-Fatal Error Sections Overall Performance -->
          <tr v-if="hasFatalErrorSections()">
            <td class="no-border">&nbsp;</td>
            <td
              colspan="2"
              :style="{
                textAlign: 'center',
                backgroundColor: colors.headerBg,
                color: 'white',
                fontWeight: 'bold'
              }"
            >
              📊 Other Sections Performance
            </td>
            <td
              :style="{
                textAlign: 'center',
                backgroundColor: colors.headerBg,
                color: 'white'
              }"
            >
              <b>{{ nonFatalErrorTotals.total_applicable_score }}</b>
            </td>
            <td
              :style="{
                textAlign: 'center',
                backgroundColor: colors.headerBg,
                color: 'white'
              }"
            >
              <b>{{ nonFatalErrorTotals.total_achieved_score }}</b>
            </td>
            <td
              :style="{
                textAlign: 'center',
                backgroundColor: colors.headerBg,
                color: 'white'
              }"
            >
              <b>{{ nonFatalErrorTotals.performance_percentage }}%</b>
            </td>
            <td
              :style="{
                border: '1px solid #f4f4f4',
                backgroundColor: getRatingColor(nonFatalErrorTotals.performance_percentage),
                textAlign: 'center',
                color: 'white'
              }"
            >
              <b>{{ getRatingText(nonFatalErrorTotals.performance_percentage) }}</b>
            </td>
          </tr>

          <!-- Fatal Error Sections -->
          <tr
            v-for="(report, i) in Reports().reports_data.filter((r) => isFatalErrorSection(r))"
            :key="`fatal-${i}`"
          >
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
              <div class="flex items-center justify-between">
                <span>{{ report.heading }}</span>
                <!-- Show fatal error indicators -->
                <div class="flex items-center gap-1">
                  <span class="text-red-600 font-semibold text-xs bg-red-100 px-2 py-1 rounded">
                    ⚠️ FATAL ERROR
                  </span>
                  <span
                    v-if="checkSectionFatalError(report)"
                    class="text-red-800 font-bold text-xs bg-red-200 px-2 py-1 rounded"
                  >
                    (YES - 0%)
                  </span>
                  <span
                    v-else
                    class="text-green-600 font-semibold text-xs bg-green-100 px-2 py-1 rounded"
                  >
                    (NO - 100%)
                  </span>
                </div>
              </div>
            </td>
            <td
              style="font-size: 13px; text-align: center; border: solid; border-width: thin"
              :class="{
                'bg-red-100 text-red-800 font-bold':
                  isFatalErrorSection(report) && checkSectionFatalError(report)
              }"
            >
              {{ report.total_applicable_score }}
            </td>
            <td
              style="font-size: 13px; text-align: center; border: solid; border-width: thin"
              :class="{
                'bg-red-100 text-red-800 font-bold':
                  isFatalErrorSection(report) && checkSectionFatalError(report)
              }"
            >
              {{ report.total_achieved_score }}
            </td>
            <td
              style="font-size: 13px; text-align: center; border: solid; border-width: thin"
              :class="{
                'bg-red-100 text-red-800 font-bold':
                  isFatalErrorSection(report) && checkSectionFatalError(report)
              }"
            >
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

          <tr v-if="!hasFatalErrorSections()">
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
                backgroundColor: checkFatalError() ? '#dc2626' : colors.headerBg,
                color: 'white'
              }"
            >
              <b>{{ checkFatalError() ? 0 : totalScores.total_achieved_score }}</b>
            </td>
            <td
              :style="{
                textAlign: 'center',
                backgroundColor: checkFatalError() ? '#dc2626' : colors.headerBg,
                color: 'white'
              }"
            >
              <b>{{ checkFatalError() ? 0 : totalScores.performance_percentage }}%</b>
            </td>
            <td
              :style="{
                border: '1px solid #f4f4f4',
                backgroundColor: checkFatalError()
                  ? '#dc2626'
                  : getRatingColor(totalScores.performance_percentage),
                textAlign: 'center',
                color: 'white'
              }"
            >
              <div class="flex flex-col items-center">
                <b>{{
                  checkFatalError()
                    ? 'FATAL ERROR'
                    : getRatingText(totalScores.performance_percentage)
                }}</b>
                <div v-if="checkFatalError()" class="text-xs mt-1 opacity-90">Total Score: 0%</div>
              </div>
            </td>
          </tr>

          <!-- Fatal Error Sections Overall Performance -->
          <tr v-if="hasFatalErrorSections()">
            <td class="no-border">&nbsp;</td>
            <td
              colspan="2"
              :style="{
                textAlign: 'center',
                backgroundColor: '#dc2626',
                color: 'white',
                fontWeight: 'bold'
              }"
            >
              ⚠️ Fatal Error Sections (Not Included in Overall Score)
            </td>
            <td
              :style="{
                textAlign: 'center',
                backgroundColor: '#dc2626',
                color: 'white'
              }"
            >
              <b>{{ fatalErrorTotals.total_applicable_score }}</b>
            </td>
            <td
              :style="{
                textAlign: 'center',
                backgroundColor: '#dc2626',
                color: 'white'
              }"
            >
              <b>{{ fatalErrorTotals.total_achieved_score }}</b>
            </td>
            <td
              :style="{
                textAlign: 'center',
                backgroundColor: '#dc2626',
                color: 'white'
              }"
            >
              <b>{{ fatalErrorTotals.performance_percentage }}%</b>
            </td>
            <td
              :style="{
                border: '1px solid #f4f4f4',
                backgroundColor:
                  fatalErrorTotals.performance_percentage > 0
                    ? getRatingColor(fatalErrorTotals.performance_percentage)
                    : '#7f1d1d',
                textAlign: 'center',
                color: 'white'
              }"
            >
              <div class="flex flex-col items-center">
                <b>{{
                  fatalErrorTotals.performance_percentage > 0
                    ? getRatingText(fatalErrorTotals.performance_percentage)
                    : 'FATAL ERROR'
                }}</b>
                <div
                  v-if="
                    fatalErrorTotals.total_score > 0 &&
                    fatalErrorTotals.performance_percentage === 0
                  "
                  class="text-xs mt-1 opacity-90"
                >
                  All sections with "YES" responses
                </div>
              </div>
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
          <template v-for="(report, index) in Reports().reports_data" :key="report.heading + index">
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
                      v-model="report.heading"
                      disabled
                      class="p-3 w-full text-lg font-bold bg-transparent border border-transparent hover:border-gray-300 focus:border-gray-400 focus:bg-white/50 rounded-md transition-all"
                      placeholder="Section Heading"
                    />
                    <div
                      class="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity"
                      style="animation: shimmer 2s infinite linear"
                    ></div>
                  </div>
                  <!-- Delete Section Button -->
                  <!-- <Button
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
                  </Button> -->
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
                  disabled
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
                        <span :class="{ 'font-bold text-blue-800': sectionLevelSubtraction[index] }"
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
                    <option v-for="resp in clientResponses" :key="resp.uuid" :value="resp.response">
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
                    cols="300"
                    disabled
                    @blur="(e) => e.target.removeAttribute('disabled')"
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
                    cols="300"
                    disabled
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
                  <div class="flex flex-col gap-2">
                    <div class="flex items-center justify-center gap-1">
                      <select
                        v-model="data.response"
                        required
                        @change="calculateScores(data, index)"
                        :class="{
                          'border-2 border-red-500':
                            data.response === 'No' || data.response === 'no'
                        }"
                      >
                        <option v-if="isDev" disabled value="">Select Response</option>
                        <option
                          v-for="resp in clientResponses"
                          :key="resp.uuid"
                          :value="resp.response"
                        >
                          {{ resp.response }}
                          {{ resp.operation ? '(' + resp.operation + resp.total_score + ')' : '' }}
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
                    @blur="(e) => e.target.removeAttribute('disabled')"
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
                  <!-- <div class="flex flex-col items-center gap-2">
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
                  </div> -->
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
                <Button
                  @onClick="saveReport"
                  :type="'button'"
                  :label="isSaving ? 'Saving...' : 'Save Report'"
                  class="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-full shadow-md transition-all transform hover:scale-105"
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
                <button
                  @click="closeReportWithConfirmation"
                  type="button"
                  class="flex items-center gap-2 bg-gray-500 hover:bg-gray-600 text-white px-6 py-3 rounded-full shadow-md transition-all transform hover:scale-105"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke-width="1.5"
                    stroke="currentColor"
                    class="size-6"
                  >
                    <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  <span class="font-medium">Close</span>
                </button>
              </div>
            </td>
          </tr>
          <!-- section loop -->
        </tbody>
      </table>

      <!-- Visits Add Option -->
      <div class="form-control mb-4 mt-4">
        <div class="flex items-center">
          <input
            type="checkbox"
            id="visitsAdd"
            v-model="visitsAdd"
            disabled
            class="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          />
          <label for="visitsAdd" class="ml-2 text-sm font-medium text-gray-700">
            Enable Visits Add (will allow numbering reports for the same branch, e.g.
            branch-visit-1, branch-visit-2)
          </label>
        </div>
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
.report-table td:nth-child(1) {
  width: 1500px; /* Set narrow width for response column */
  max-width: 20rem;
  padding: 2px;
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
  max-width: 100px;
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

/* Loading overlay styles */
.loading-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(255, 255, 255, 0.85);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 9999;
  backdrop-filter: blur(2px);
}

.loading-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  background-color: white;
  padding: 2rem;
  border-radius: 1rem;
  box-shadow:
    0 10px 25px -5px rgba(0, 0, 0, 0.1),
    0 10px 10px -5px rgba(0, 0, 0, 0.04);
}
</style>
