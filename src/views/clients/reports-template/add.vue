<script setup lang="ts" name="ReportTemplateAdd">
import { ref, reactive, computed, watch, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { Ref } from 'vue'

import DefaultLayout from '@/layouts/DefaultLayout.vue'
import { Client } from '@/stores/client'
import { Branches } from '@/stores/branches'
import { Toast } from '@/utils/toast'
import { Responses } from '@/stores/responses'
import { Templates } from '@/stores/templates'

import Select from 'primevue/select'
import DatePicker from 'primevue/datepicker'
import Dropdown from 'primevue/dropdown'
import ColorPicker from 'primevue/colorpicker'
import FileUpload from 'primevue/fileupload'
import ProgressBar from 'primevue/progressbar'

import InputText from 'primevue/inputtext'
import { Reports } from '@/stores/reports'

import Button from '@/components/Buttons/Button.vue'
import {
  applyNaScores,
  finalizeSectionTotals,
  getClientNaScoreValue,
  isNaResponse,
  naScoreToNumber
} from '@/utils/naScore'

// Import Excel library
import * as XLSX from 'xlsx'
import ExcelJS from 'exceljs'
import FileSaver from 'file-saver'

// Initialize router for navigation
const router = useRouter()
const route = useRoute()

// Add interfaces for client and other types
interface ClientType {
  selected_client?: {
    uuid?: string
    name?: string
  }
}

interface HeadersType {
  uuid?: string
  headerName?: string
  field?: string
  [key: string]: any
}

const date = ref()
const value = ref()

// Color customization
// Define color variables with default values
const colors = ref({
  titleBg: '#7030A0', // Purple header for "Total Score"
  summaryBg: '#FFC000', // Yellow header for "Score Summary"
  headerBg: '#808080', // Gray header for column headers
  kpiBg: '#C5D9F1', // Light blue for KPI rows
  ratingBg: '#4F6228', // Green for rating
  scoreFontColor: '#0000FF', // Blue for the score percentage
  logo: null // Store the logo image data
})

// Convert hex to ARGB format for Excel
const hexToARGB = (hex: string) => {
  // Ensure hex starts with #
  if (!hex.startsWith('#')) {
    hex = '#' + hex
  }
  // Remove # if present
  hex = hex.replace('#', '')
  // Ensure hex is 6 characters (add alpha channel if needed)
  return hex.length === 6 ? 'FF' + hex : hex
}

// Ensure hex color has # prefix
const ensureHashPrefix = (color: string) => {
  if (!color) return ''
  return color.startsWith('#') ? color : '#' + color
}

// Field labels that can be customized
const fieldLabels = ref({
  branch_name: 'Branch Name',
  region: 'Region',
  city: 'City',
  visit_type: 'Visit Type'
})

// For storing which header field to use for each form field
const selectedHeaderFields = ref({
  branch_name: '',
  region: '',
  city: '',
  visit_type: ''
})

interface CustomField {
  label: string
  headerField: string
  displayOrder: number
  // Add these to make CustomField compatible with Field
  headerName?: string
  dataField?: string
  required?: boolean
}

// Custom field selections
const customFields: Ref<CustomField[]> = ref([])

interface Field {
  headerField: string
  headerName: string
  dataField: string
  required: boolean
  label?: string
}

interface BranchData {
  [key: string]: any
  branch_code?: string
  branch_name?: string | { name: string; value: string }
  city?: string | { name: string; value: string }
  visit_type?: string | { name: string; value: string }
  uuid?: string
  region?: string | { name: string; value: string }
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

interface ReportData {
  question: string
  sub_question: string
  response: string
  total_score: number
  applicable_score: number
  achieved_score: number
  comments: string
  subtraction_value: number
}

interface FieldOption {
  name: string
  value: string
}

interface ColumnDef {
  headerName: string
  field: string
}

// Selected field values
const selectedFieldValues: Ref<Record<string, any>> = ref({})

// Primary identifier field - used to auto-fill other fields
const primaryIdentifierField = ref('')

// For responses from the responses table
const clientResponses = ref<ResponseData[]>([])

// Overall performance totals
const totalScores = ref({
  total_score: 0,
  total_applicable_score: 0,
  total_achieved_score: 0,
  performance_percentage: 0
})

// Flag to control whether subtractions should be applied at section level (true) or question level (false)
const sectionLevelSubtraction = ref(false)

// Add the visitsAdd ref variable within the script setup section, near the other refs
const visitsAdd = ref(false)

// Load client responses
const loadClientResponses = async () => {
  if (Client().selected_client?.uuid) {
    await Responses().fetch()
    // Add type assertion to ensure each response has the correct type
    clientResponses.value = (Responses().responses_data || []) as ResponseData[]
    console.log('Loaded client responses:', clientResponses.value)
  }
}

// Calculated fields based on response selection
const calculateScores = (data: ReportData) => {
  // If response is not set, don't calculate
  if (!data.response) return

  // Find the selected response in clientResponses
  const selectedResponse = clientResponses.value.find((r) => r.response === data.response)
  const totalScore = parseFloat(String(data.total_score)) || 0
  const responseValue = selectedResponse ? parseFloat(String(selectedResponse.total_score)) || 0 : 0
  const operation = selectedResponse ? selectedResponse.operation || '+' : '+'

  // Normalize response to handle case insensitivity
  const responseText = data.response ? data.response.toLowerCase() : ''

  // Set default applicable score to total score
  data.applicable_score = totalScore

  // First check: if response value is 0
  if (responseValue === 0) {
    // Check response text for yes/no/n/a
    if (responseText === 'yes') {
      // For Yes with 0 value: applicable = total, achieved = total (full score)
      data.applicable_score = totalScore
      data.achieved_score = totalScore
      // No subtraction for Yes responses
      data.subtraction_value = 0
    } else if (responseText === 'no') {
      // For No with 0 value: applicable = total, achieved = 0
      data.applicable_score = totalScore
      data.achieved_score = 0
      // No subtraction for No responses (already zero)
      data.subtraction_value = 0
    } else if (isNaResponse(data.response)) {
      applyNaScores(data, getClientNaScoreValue(Client().selected_client))
      data.subtraction_value = 0
    } else {
      // Default for other responses with 0 value
      data.applicable_score = totalScore
      data.achieved_score = totalScore
      data.subtraction_value = 0
    }
  }
  // Second check: if operation is subtraction, always store the subtraction value
  // (will be used in section-level subtraction if enabled)
  else if (operation === '-') {
    data.applicable_score = totalScore

    // Store the actual response value as subtraction value
    // This ensures we use the specific value of each response (1 for "Below Average", 2 for "Very Bad", etc.)
    data.subtraction_value = responseValue

    // If section level subtraction is enabled, don't modify the achieved score here
    // (it will be handled at section level)
    if (!sectionLevelSubtraction.value) {
      // For question-level subtraction: directly subtract from this question's score
      // Allow negative values (don't clamp at zero)
      data.achieved_score = totalScore - responseValue
    } else {
      // For section level, we keep the achieved score equal to applicable for now
      // (will be adjusted at section level using the stored subtraction_value)
      data.achieved_score = totalScore
    }
  }
  // Default case: apply standard operation
  else {
    applyStandardOperation(data, operation, responseValue)
    // No subtraction for other operations
    data.subtraction_value = 0
  }

  // After updating this item's scores, recalculate section totals
  calculateSectionTotals()
}

// Apply standard arithmetic operations
const applyStandardOperation = (data: ReportData, operation: string, operationValue: number) => {
  const totalScore = parseFloat(String(data.total_score)) || 0

  // Normalize response to handle case insensitivity
  const responseText = data.response ? data.response.toLowerCase() : ''

  // For "No" responses, always set achieved to 0 regardless of operation
  if (responseText === 'no') {
    data.achieved_score = 0
    return
  }

  switch (operation) {
    case '+':
      // Addition: achieved = applicable
      data.achieved_score = data.applicable_score
      break
    case '-':
      // Subtraction: achieved = applicable - value
      data.achieved_score = Math.max(0, data.applicable_score - operationValue)
      break
    case '*':
      // Multiplication: achieved = applicable * value
      data.achieved_score = data.applicable_score * operationValue
      break
    case '/':
      // Division: achieved = applicable / value
      data.achieved_score = operationValue !== 0 ? data.applicable_score / operationValue : 0
      break
    default:
      // Default behavior: achieved = applicable
      data.achieved_score = data.applicable_score
      break
  }
}

// Function to calculate totals for each section
const calculateSectionTotals = () => {
  // Reset overall totals
  let overallTotalScore = 0
  let overallApplicableScore = 0
  let overallAchievedScore = 0

  Reports().reports_data.forEach((section) => {
    // Reset section totals
    let totalScore = 0
    let totalApplicableScore = 0
    let totalAchievedScore = 0
    let sectionSubtractions = 0
    let hasSubtractionResponses = false

    // First pass: calculate base totals
    section.data.forEach((item) => {
      // Add up the totals
      const itemTotalScore = parseFloat(String(item.total_score)) || 0
      const itemApplicableScore = naScoreToNumber(item.applicable_score)

      totalScore += itemTotalScore
      totalApplicableScore += itemApplicableScore

      // Always collect subtraction values for any responses with that operation
      if (item.subtraction_value) {
        const subtractionValue = parseFloat(String(item.subtraction_value)) || 0
        if (subtractionValue > 0) {
          sectionSubtractions += subtractionValue
          hasSubtractionResponses = true
        }
      }

      // For regular calculation (without section-level subtraction):
      // Use the already calculated achieved scores directly
      if (!sectionLevelSubtraction.value || !hasSubtractionResponses) {
        totalAchievedScore += naScoreToNumber(item.achieved_score)
      } else {
        // For section-level subtraction:
        // We'll calculate the total achieved score differently below
        const itemAchievedScore = naScoreToNumber(item.achieved_score)
        // For responses with no subtraction, add their achieved score as normal
        if (!item.subtraction_value || parseFloat(String(item.subtraction_value)) <= 0) {
          totalAchievedScore += itemAchievedScore
        } else {
          // For items with subtraction values, use their applicable score instead
          // (as if they got full score, before deductions are applied)
          totalAchievedScore += itemApplicableScore
        }
      }
    })

    // Apply section-level subtractions if enabled and there are subtraction values
    if (sectionLevelSubtraction.value && sectionSubtractions > 0) {
      // Subtract the total of all subtraction values from the section's achieved score
      // Allow negative values (don't clamp at zero)
      totalAchievedScore = totalAchievedScore - sectionSubtractions
    }

    // Update section totals
    section.total_score = totalScore
    section.total_applicable_score = totalApplicableScore
    section.total_achieved_score = totalAchievedScore

    // Calculate achieved percentage for display
    // When achieved score is negative, percentage will be negative too
    const achievedPercentage =
      totalApplicableScore > 0 ? Math.round((totalAchievedScore / totalApplicableScore) * 100) : 0
    section.achieved = `${achievedPercentage}%`
    finalizeSectionTotals(section, Client().selected_client)

    // Add to overall totals
    overallTotalScore += totalScore
    overallApplicableScore += naScoreToNumber(section.total_applicable_score)
    overallAchievedScore += naScoreToNumber(section.total_achieved_score)
  })

  // Store the overall totals in refs for use in the template
  totalScores.value = {
    total_score: overallTotalScore,
    total_applicable_score: overallApplicableScore,
    total_achieved_score: overallAchievedScore,
    performance_percentage:
      overallApplicableScore > 0
        ? Math.round((overallAchievedScore / overallApplicableScore) * 100)
        : 0
  }
}

// Function to set a field as the primary identifier for auto-filling
const setPrimaryIdentifier = (headerField: string) => {
  primaryIdentifierField.value = headerField
  const branches = Branches().branches as BranchData[]
  selectedFieldValues.value = branches
    .filter((record) => headerField && record[headerField] !== undefined)
    .reduce((acc, record) => ({ ...acc, [headerField]: record[headerField] }), {})
}

// Function to handle selection of primary identifier value
const handlePrimarySelection = (value: string, field: CustomField) => {
  console.log('Auto-fill triggered with value:', value)

  // Check if this is from a primary field
  if (!primaryIdentifierField.value) {
    console.log('No primary identifier set yet')
    return
  }

  // If this field is not the primary identifier, don't auto-fill
  if (primaryIdentifierField.value !== field.headerField) {
    console.log('This is not the primary field')
    return
  }

  // Get the branch with this value
  const branches = Branches().branches || []
  console.log('Looking for branch with', field.headerField, '=', value)
  console.log('Available branches:', branches.length)

  // Extract the actual value if it's an object with name/value properties (from dropdown)
  const searchValue = value && typeof value === 'object' && value.value ? value.value : value

  // Find the branch with this value
  const selectedBranch = branches.find((branch) => {
    const branchValue = branch[field.headerField]
    return String(branchValue) === String(searchValue)
  })

  if (!selectedBranch) {
    console.log('No matching branch found')
    return
  }

  console.log('Found matching branch:', selectedBranch)

  // Reset all field values
  selectedFieldValues.value = {}

  // Set selected value for the primary field
  selectedFieldValues.value[field.headerField] = {
    name: String(selectedBranch[field.headerField]),
    value: String(selectedBranch[field.headerField])
  }

  // Auto-fill all other fields from this branch
  customFields.value.forEach((otherField) => {
    if (otherField.headerField && otherField.headerField !== field.headerField) {
      const fieldValue = selectedBranch[otherField.headerField]
      console.log(`Auto-filling ${otherField.label} with value:`, fieldValue)

      // Set the value in the selectedFieldValues object in the format expected by the dropdown
      selectedFieldValues.value[otherField.headerField] = {
        name: String(fieldValue),
        value: String(fieldValue)
      }
    }
  })

  // Force reactivity update
  selectedFieldValues.value = { ...selectedFieldValues.value }
}

// Add a better log to help debugging
const onDropdownChange = (e: any, field: CustomField) => {
  console.log('Dropdown changed:', field.label, e)

  // Handle all possible event formats
  let selectedValue: any

  // If it's a direct primitive value
  if (typeof e !== 'object' || e === null) {
    selectedValue = e
  }
  // If it's an object with value property (PrimeVue dropdown format)
  else if (e.value !== undefined) {
    selectedValue = e.value
  }
  // If it's an event object with target.value (DOM event)
  else if (e.target && e.target.value !== undefined) {
    selectedValue = e.target.value
  }
  // If it's the object itself (might be the case sometimes)
  else {
    selectedValue = e
  }

  console.log('Selected branch value (processed):', selectedValue)
  console.log('primaryIdentifierField:', primaryIdentifierField.value)
  console.log('currentField.headerField:', field.headerField)

  // Pass the selected value to the handler
  handlePrimarySelection(selectedValue, field)
}

// Add a new custom field
const addCustomField = () => {
  const newOrder =
    customFields.value.length > 0
      ? Math.max(...customFields.value.map((f) => f.displayOrder)) + 1
      : 1

  // Generate appropriate field name based on existing fields
  let fieldName = 'New Field'
  if (customFields.value.length === 0) {
    fieldName = 'Branch Code'
  } else if (customFields.value.length === 1) {
    fieldName = 'City'
  } else if (customFields.value.length === 2) {
    fieldName = 'Visit Type'
  }

  customFields.value.push({
    label: fieldName,
    headerField: '',
    displayOrder: newOrder
  })
}

// Remove a custom field
const removeCustomField = (index: number) => {
  customFields.value.splice(index, 1)
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

// Automatically set the first field as primary identifier if none is set
onMounted(async () => {
  if (Client().selected_client?.uuid) {
    await Branches().fetch()
    await loadClientResponses()

    // Initialize templates store and force refresh
    Templates().init()
    await Templates().fetch(1, 20, { forceRefresh: true })

    // Set up visibility change handler to refresh data when returning to this tab
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        console.log('Tab became visible in template add view, refreshing data...')
        Templates().fetch(1, 20, { forceRefresh: true })
      }
    })

    // Add the first field if there are none
    if (customFields.value.length === 0) {
      addCustomField()
    }

    // After data is fetched, set the first field as primary if none is set
    setTimeout(() => {
      if (
        !primaryIdentifierField.value &&
        customFields.value.length > 0 &&
        customFields.value[0].headerField
      ) {
        primaryIdentifierField.value = customFields.value[0].headerField
        console.log('Auto-set primary identifier to first field:', primaryIdentifierField.value)
      }
    }, 500)

    // Calculate initial section totals
    calculateSectionTotals()
  }
})

// Get all available headers from branches data
const availableHeaders = computed(() => {
  const headers = Branches().branch_headers || []
  return headers.map((header) => ({
    name: header.headerName || header.field || '',
    value: header.field || ''
  }))
})

// Extract unique values for dropdowns from branch headers and data
const branchFields = computed(() => {
  const headers = Branches().branch_headers || []
  const branches = Branches().branches || []

  // Create a mapping of field options for each dropdown
  const fields = {
    branch_name: [],
    region: [],
    city: [],
    visit_type: []
  }

  // Extract field names from headers
  const headerMap = {}

  // First check if we have user-selected header fields
  if (selectedHeaderFields.value.branch_name) {
    headerMap.branch_name = selectedHeaderFields.value.branch_name
  }
  if (selectedHeaderFields.value.region) {
    headerMap.region = selectedHeaderFields.value.region
  }
  if (selectedHeaderFields.value.city) {
    headerMap.city = selectedHeaderFields.value.city
  }
  if (selectedHeaderFields.value.visit_type) {
    headerMap.visit_type = selectedHeaderFields.value.visit_type
  }

  // If no user selections, use auto-detection
  if (!Object.keys(headerMap).length) {
    headers.forEach((header) => {
      const field = header.field ? header.field.toLowerCase() : ''
      if (field.includes('branch') && field.includes('name')) {
        headerMap.branch_name = header.field
      } else if (field.includes('region')) {
        headerMap.region = header.field
      } else if (field.includes('city')) {
        headerMap.city = header.field
      } else if (field.includes('visit') && field.includes('type')) {
        headerMap.visit_type = header.field
      }
    })
  }

  // Extract unique values from branch data
  branches.forEach((branch) => {
    // Branch name
    if (
      headerMap.branch_name &&
      branch[headerMap.branch_name] &&
      !fields.branch_name.includes(branch[headerMap.branch_name])
    ) {
      fields.branch_name.push(branch[headerMap.branch_name])
    }

    // Region
    if (
      headerMap.region &&
      branch[headerMap.region] &&
      !fields.region.includes(branch[headerMap.region])
    ) {
      fields.region.push(branch[headerMap.region])
    }

    // City
    if (headerMap.city && branch[headerMap.city] && !fields.city.includes(branch[headerMap.city])) {
      fields.city.push(branch[headerMap.city])
    }

    // Visit Type
    if (
      headerMap.visit_type &&
      branch[headerMap.visit_type] &&
      !fields.visit_type.includes(branch[headerMap.visit_type])
    ) {
      fields.visit_type.push(branch[headerMap.visit_type])
    }
  })

  // Format values for dropdown use
  return {
    branch_name: fields.branch_name.map((val) => ({ name: val, value: val })),
    region: fields.region.map((val) => ({ name: val, value: val })),
    city: fields.city.map((val) => ({ name: val, value: val })),
    visit_type: fields.visit_type.map((val) => ({ name: val, value: val }))
  }
})

// Selected values
const selectedBranch = ref(null)
const selectedRegion = ref(null)
const selectedCity = ref(null)
const selectedVisitType = ref(null)

// Function to update field label when header selection changes
const updateFieldLabel = (fieldType: string) => {
  if (selectedHeaderFields.value[fieldType]) {
    const header = availableHeaders.value.find(
      (h) => h.value === selectedHeaderFields.value[fieldType]
    )
    if (header && header.name) {
      fieldLabels.value[fieldType] = header.name
    }
  }
}

// For column definitions
const columns = computed((): ColumnDef[] => {
  return customFields.value
    .filter((field) => field.headerField !== primaryIdentifierField.value)
    .map((field) => {
      return {
        headerName: field.label || field.headerField,
        field: field.headerField
      } as ColumnDef
    })
})

// When accessing record properties in the template section
const generateFields = () => {
  const record = selectedFieldValues.value as BranchData

  // Now TypeScript knows record has these properties
  customFields.value.forEach((field) => {
    if (field.headerField === 'branch_name') {
      field.label = record.branch_name
    } else if (field.headerField === 'region') {
      field.label = record.region as string
    } else if (field.headerField === 'city') {
      field.label = record.city
    } else if (field.headerField === 'visit_type') {
      field.label = record.visit_type as string
    }
  })
}

// When field selection changes in the customization section
const onFieldSelectionChange = (e: any, field: CustomField) => {
  console.log('Field selection changed:', field.label, e.value)
  field.headerField = e.value

  // If this is a branch code field, make it the primary identifier
  const fieldLower = e.value.toLowerCase()
  if (fieldLower.includes('branch') && (fieldLower.includes('code') || fieldLower.includes('id'))) {
    console.log('Auto-setting primary identifier to branch code field:', e.value)
    setPrimaryIdentifier(e.value)
    // Show success message using toast
    try {
      Toast.success('Branch Code field will be used for auto-filling other fields')
    } catch (e) {
      console.error('Toast not available')
    }
  }
}

// Initialize a new row in the report with default values
const initializeReportRow = () => {
  return {
    question: '',
    sub_question: '',
    response: '',
    total_score: 0,
    applicable_score: 0,
    achieved_score: 0,
    comments: '',
    subtraction_value: 0
  }
}

// Function to download report as Excel
const downloadAsExcel = async () => {
  try {
    console.log('Exporting to Excel...')
    const workbook = new ExcelJS.Workbook()
    const worksheet = workbook.addWorksheet('Assessment Report')

    // Setup basic worksheet formatting
    worksheet.properties.defaultRowHeight = 20
    worksheet.properties.defaultColWidth = 15

    // Set column widths
    worksheet.columns = [
      { width: 30 }, // A - First column (labels, questions)
      { width: 5 }, // B - Index column
      { width: 30 }, // C - Sub-questions
      { width: 15 }, // D - Responses column
      { width: 12 }, // E - Total Score column
      { width: 15 }, // F - Applicable Score column
      { width: 15 }, // G - Achieved Score column
      { width: 30 } // H - Comments column
    ]

    // Setting up title, client, and branch information
    const title = `${
      Client().selected_client?.name || 'Client'
    } - MYSTERY SHOPPING Assessment Report`

    // Title row
    const titleRow = worksheet.addRow([title])
    worksheet.mergeCells('A1:H1')
    titleRow.getCell(1).font = { bold: true, size: 16 }
    titleRow.getCell(1).alignment = { horizontal: 'center' }
    titleRow.height = 30

    // Add logo if available
    if (colors.value.logo) {
      try {
        // Extract the base64 data (remove the data:image/xxx;base64, part)
        const base64Data = colors.value.logo.split(',')[1]
        if (base64Data) {
          // Get the extension from the data URL
          const extension = colors.value.logo.split(';')[0].split('/')[1]

          // Add a logo image
          const logoId = workbook.addImage({
            base64: base64Data,
            extension: extension
          })

          // Insert the logo centered above the title
          // Position it in the center columns (approximately columns C-F)
          worksheet.addImage(logoId, {
            tl: { col: 2, row: 0 },
            br: { col: 6, row: 1 },
            editAs: 'oneCell'
          })

          // Add some spacing for the logo - add an empty row at the top
          worksheet.getRow(1).height = 60

          // Move the title down one row to make space for the logo
          titleRow.height = 30
        }
      } catch (error) {
        console.error('Error adding logo to Excel:', error)
      }
    }

    // Empty row
    worksheet.addRow([])

    // Branch information rows
    const addInfoRow = (label, value) => {
      const row = worksheet.addRow([label, value])
      row.getCell(1).border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      }
      row.getCell(1).font = { bold: true }

      // Style value cell
      row.getCell(2).border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      }

      // Merge cells B-H for the value
      worksheet.mergeCells(`B${row.number}:H${row.number}`)

      return row
    }

    // Add dynamic fields based on customFields
    customFields.value
      .sort((a, b) => a.displayOrder - b.displayOrder)
      .forEach((field) => {
        if (field.headerField && selectedFieldValues.value[field.headerField]) {
          const value =
            selectedFieldValues.value[field.headerField]?.name ||
            selectedFieldValues.value[field.headerField]?.value ||
            ''
          addInfoRow(field.label, value)
        }
      })

    // Date row
    const dateRow = addInfoRow(
      'Date',
      date.value ? new Date(date.value).toLocaleDateString() : new Date().toLocaleDateString()
    )

    // Set total score label and style
    const totalScoreCell = dateRow.getCell(8)
    totalScoreCell.value = 'Total Score'
    totalScoreCell.font = { bold: true, color: { argb: 'FFFFFF' } }
    totalScoreCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: hexToARGB(colors.value.titleBg) }
    }
    totalScoreCell.alignment = { horizontal: 'center' }
    totalScoreCell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' }
    }

    // Time row
    const timeRow = addInfoRow('Time', (value.value as string) || '15:44')

    // Use the already calculated performance percentage from totalScores
    const totalScorePercent = totalScores.value.performance_percentage || 0

    // Set total score value and style
    const scoreCell = timeRow.getCell(8)
    scoreCell.value = `${totalScorePercent}%`
    scoreCell.font = {
      bold: true,
      size: 20,
      color: { argb: hexToARGB(colors.value.scoreFontColor) }
    }
    scoreCell.alignment = { horizontal: 'center' }
    scoreCell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' }
    }

    // Empty row
    worksheet.addRow([])

    // Score Summary Section
    const summaryRow = worksheet.addRow(['Score Summary'])
    worksheet.mergeCells(`A${summaryRow.number}:H${summaryRow.number}`)
    summaryRow.getCell(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: hexToARGB(colors.value.summaryBg) }
    }
    summaryRow.getCell(1).font = { bold: true }
    summaryRow.getCell(1).alignment = { horizontal: 'center' }
    summaryRow.getCell(1).border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' }
    }

    // KPI Headers
    const kpiHeaderRow = worksheet.addRow([
      "KPI's",
      '',
      'Applicable Score',
      'Achieved Score',
      'Performance %',
      'Rating'
    ])
    worksheet.mergeCells(`A${kpiHeaderRow.number}:B${kpiHeaderRow.number}`)

    // Style KPI header cells
    for (let i = 1; i <= 6; i++) {
      const cell = kpiHeaderRow.getCell(i)
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: hexToARGB(colors.value.headerBg) }
      }
      cell.font = { bold: true, color: { argb: 'FFFFFF' } }
      cell.alignment = { horizontal: 'center' }
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      }
    }

    // Add data for each report section
    Reports().reports_data.forEach((report) => {
      // Calculate performance percentage for this section
      const performance = report.total_applicable_score
        ? Math.round((report.total_achieved_score / report.total_applicable_score) * 100)
        : 0

      const kpiRow = worksheet.addRow([
        report.heading || 'Section',
        '',
        report.total_applicable_score || 0,
        report.total_achieved_score || 0,
        `${performance}%`,
        getRatingText(performance)
      ])

      // Merge the first two columns for KPI name
      worksheet.mergeCells(`A${kpiRow.number}:B${kpiRow.number}`)

      // Style the KPI row
      kpiRow.getCell(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: hexToARGB(colors.value.kpiBg) }
      }
      kpiRow.getCell(1).font = { bold: true }
      kpiRow.getCell(1).border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      }

      // Style numeric cells
      for (let i = 3; i <= 5; i++) {
        const cell = kpiRow.getCell(i)
        cell.alignment = { horizontal: 'center' }
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        }
      }

      // Style rating cell (green background)
      const ratingCell = kpiRow.getCell(6)
      ratingCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: hexToARGB(colors.value.ratingBg) }
      }
      ratingCell.font = { bold: true, color: { argb: 'FFFFFF' } }
      ratingCell.alignment = { horizontal: 'center' }
      ratingCell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      }
    })

    // Overall Performance row
    const overallRow = worksheet.addRow([
      'Overall Performance',
      '',
      totalScores.value.total_applicable_score,
      totalScores.value.total_achieved_score,
      `${totalScores.value.performance_percentage}%`,
      getRatingText(totalScores.value.performance_percentage)
    ])

    // Merge the first two columns for Overall Performance
    worksheet.mergeCells(`A${overallRow.number}:B${overallRow.number}`)

    // Style the Overall Performance row
    for (let i = 1; i <= 5; i++) {
      const cell = overallRow.getCell(i)
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: hexToARGB(colors.value.headerBg) }
      }
      cell.font = { bold: true, color: { argb: 'FFFFFF' } }
      cell.alignment = { horizontal: 'center' }
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      }
    }

    // Style the rating cell with green background
    const overallRatingCell = overallRow.getCell(6)
    overallRatingCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: hexToARGB(colors.value.ratingBg) }
    }
    overallRatingCell.font = { bold: true, color: { argb: 'FFFFFF' } }
    overallRatingCell.alignment = { horizontal: 'center' }
    overallRatingCell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' }
    }

    // Empty row before detailed sections
    worksheet.addRow([])
    worksheet.addRow([])

    // Sections with question details will go here (omitted for brevity)
    // ... Add individual sections with questions ...

    // Generate the Excel file
    const buffer = await workbook.xlsx.writeBuffer()
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    })
    FileSaver.saveAs(
      blob,
      `mystery_shopping_report_${new Date().toISOString().substring(0, 10)}.xlsx`
    )

    Toast.success('Report downloaded successfully')
  } catch (error) {
    console.error('Error generating Excel file:', error)
    Toast.error('Failed to download report template')
  }
}

// Function to save the template
const isSaving = ref(false)

const saveTemplate = async () => {
  try {
    isSaving.value = true
    // Ensure client selected
    if (!Client().selected_client?.uuid) {
      Toast.error('Please select a client to save template')
      isSaving.value = false
      return
    }

    // Determine the template name:
    // 1. If editing existing template, use its name
    // 2. Otherwise, generate a name based on client and date
    let name = ''

    if (selectedTemplateId.value) {
      // If editing an existing template, use the original name
      const existingTemplate = Templates().templates.find((t) => t.id === selectedTemplateId.value)
      if (existingTemplate) {
        name = existingTemplate.template_name
      }
    }

    // If no name determined yet (new template), generate one
    if (!name) {
      // Get the client name for naming convention
      const clientName = Client().selected_client?.name || 'Client'

      // Get current date for naming convention
      const currentDate = new Date().toISOString().split('T')[0]

      // Base template name format
      const baseTemplateName = `${clientName}-${currentDate}`

      // Find existing templates with similar name pattern to determine the next number
      const existingTemplates = Templates().templates.filter((t) =>
        t.template_name.startsWith(baseTemplateName)
      )

      let templateNumber = 1

      // If there are existing templates with the same base name, find the highest number
      if (existingTemplates.length > 0) {
        const numbers = existingTemplates
          .map((t) => {
            // Extract the number suffix if it exists
            const match = t.template_name.match(new RegExp(`${baseTemplateName}-(\\d+)$`))
            return match ? parseInt(match[1]) : 0
          })
          .filter((n) => !isNaN(n))

        // Get the highest number and increment by 1
        if (numbers.length > 0) {
          templateNumber = Math.max(...numbers) + 1
        }
      }

      // Generate template name with incremented number suffix
      name = `${baseTemplateName}-${templateNumber}`
    }

    // Ensure selected branch (optional)
    let selectedBranchCode = null
    if (primaryIdentifierField.value && selectedFieldValues.value[primaryIdentifierField.value]) {
      selectedBranchCode =
        selectedFieldValues.value[primaryIdentifierField.value].code ||
        selectedFieldValues.value[primaryIdentifierField.value].value
    }

    const contentObject = {
      reports: Reports().reports_data,
      customFields: customFields.value,
      selectedFieldValues: selectedFieldValues.value,
      primaryIdentifierField: primaryIdentifierField.value,
      date: date.value,
      time: value.value,
      sectionLevelSubtraction: sectionLevelSubtraction.value,
      visits_add: visitsAdd.value // Store the visits setting
    }

    // Create template data with the right property names for the backend API
    const templateData = {
      template_name: name,
      client_id: Client().selected_client?.uuid,
      branch_code: selectedBranchCode,
      colors: colors.value, // This now includes the logo data
      content: contentObject
    }

    console.log('Saving template with data:', templateData)

    // Use the Templates store to save the template
    const success = await Templates().save(templateData)

    if (success) {
      Toast.success(`Template "${name}" saved successfully`)

      // Update selectedTemplateId if this was a new template
      if (!selectedTemplateId.value) {
        // Refresh templates list to get the new template
        await Templates().fetch()

        // Find the newly created template
        const newTemplate = Templates().templates.find((t) => t.template_name === name)
        if (newTemplate) {
          selectedTemplateId.value = newTemplate.id
        }
      }

      // Navigate back to the template list page
      router.push('/client/reports-template')
    } else {
      Toast.error('Failed to save template')
    }
  } catch (error) {
    console.error('Error saving template:', error)
    Toast.error('Failed to save template. Please try again.')
  } finally {
    isSaving.value = false
  }
}

// Function to load a saved template
const loadTemplate = async (id) => {
  try {
    // Fetch the template by ID
    const template = await Templates().getById(id)

    if (!template) {
      throw new Error('Template not found')
    }

    // Load template data
    colors.value = template.colors || colors.value

    if (template.content) {
      // Load reports data if available
      if (template.content.reports) {
        Reports().reports_data = template.content.reports
      }

      // Load custom fields if available
      if (template.content.customFields) {
        customFields.value = template.content.customFields
      }

      // Load field values if available
      if (template.content.selectedFieldValues) {
        selectedFieldValues.value = template.content.selectedFieldValues
      }

      // Load date and time if available
      if (template.content.date) {
        date.value = new Date(template.content.date)
      }

      if (template.content.time) {
        value.value = template.content.time
      }
    }

    Toast.success('Template loaded successfully')
  } catch (error) {
    console.error('Error loading template:', error)
    Toast.error('Failed to load template')
  }
}

// Function to delete a section from the report
const deleteSection = (sectionIndex) => {
  if (Reports().reports_data.length > 1) {
    Reports().reports_data.splice(sectionIndex, 1)
    calculateSectionTotals()
    Toast.success('Section deleted successfully')
  } else {
    Toast.warning('Cannot delete the last section. At least one section is required.')
  }
}

const createEmptySection = () => ({
  heading: 'Heading',
  weightage: '0%',
  achieved: '0%',
  data: [
    {
      question: '',
      sub_question: '',
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

const addSectionAtBottom = () => {
  Reports().reports_data.push(createEmptySection())
  calculateSectionTotals()
}

const addSectionAtTop = () => {
  Reports().reports_data.unshift(createEmptySection())
  calculateSectionTotals()
}

// Selected template ID
const selectedTemplateId = ref('')

// Function to get rating text based on percentage
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

// For handling logo uploads
const handleLogoUpload = (event) => {
  const file = event.files[0]
  if (file) {
    // Check if file is too large (> 5MB), then compress it
    if (file.size > 5 * 1024 * 1024) {
      compressImage(file, (compressedFile) => {
        readImageAsDataURL(compressedFile)
      })
    } else {
      readImageAsDataURL(file)
    }
  }
}

// Function to compress an image
const compressImage = (file, callback) => {
  const reader = new FileReader()
  reader.onload = (event) => {
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

      // Determine the image format from the file type
      // Keep PNG format to preserve transparency and colors
      const imageType = file.type === 'image/png' ? 'image/png' : 'image/jpeg'
      const quality = imageType === 'image/png' ? 0.9 : 0.7 // Higher quality for PNG

      // Convert to blob with reduced quality
      canvas.toBlob(
        (blob) => {
          if (blob) {
            // Create a new File object from the blob
            const compressedFile = new File([blob], file.name, {
              type: imageType,
              lastModified: Date.now()
            })
            callback(compressedFile)
          }
        },
        imageType,
        quality
      )
    }
    img.src = event.target.result
  }
  reader.readAsDataURL(file)
}

// Read image as data URL and update the colors.logo property
const readImageAsDataURL = (file) => {
  const reader = new FileReader()
  reader.onload = (e) => {
    // Store the base64 encoded image data
    colors.value.logo = e.target.result
  }
  reader.readAsDataURL(file)
}

// Function to remove the logo
const removeLogo = () => {
  colors.value.logo = null
}

// Function to validate and format hex color
const validateAndFormatHex = (event, field) => {
  const input = event.target
  let value = input.value

  // Remove any non-hex characters
  value = value.replace(/[^0-9a-fA-F]/g, '')

  // Add # if it's missing
  if (!value.startsWith('#')) {
    value = '#' + value
  }

  // Ensure it's a valid hex color
  if (!/^#?([0-9a-fA-F]{6})$/.test(value)) {
    input.setCustomValidity('Invalid hex color format')
  } else {
    input.setCustomValidity('')
    colors.value[field] = value
  }
}
</script>

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
  border: 1px solid #e2e8f0;
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
  width: 50%;
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
</style>

<template>
  <DefaultLayout>
    <div class="bg-white p-4 rounded">
      <div class="flex justify-between items-center mb-4">
        <h1 class="text-xl font-bold">Assessment Report Template</h1>
        <div class="flex gap-2">
          <Button
            @onClick="() => router.push('/client/reports-template')"
            :type="'button'"
            label="Cancel"
            class="bg-gray-500"
          />
          <Button
            @onClick="saveTemplate"
            :type="'button'"
            :label="isSaving ? 'Saving...' : 'Save Template'"
            class="bg-blue-500"
            :loading="isSaving"
            :disabled="isSaving"
          >
            <svg
              v-if="!isSaving"
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
          <!-- <Button
            @onClick="downloadAsExcel"
            :type="'button'"
            label="Download as Excel"
            class="bg-green-500"
          >
            <svg
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
                d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3"
              />
            </svg>
          </Button> -->
        </div>
      </div>

      <!-- Color Customization Section -->
      <div class="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-6 mb-6 shadow-md">
        <div class="flex items-center justify-between mb-4 border-b border-gray-200 pb-3">
          <h2 class="text-xl font-bold text-gray-800 flex items-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-6 w-6 mr-2 text-indigo-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
              />
            </svg>
            Report Customization
          </h2>
          <div class="flex space-x-2">
            <button
              class="text-sm bg-white hover:bg-gray-50 text-gray-600 px-4 py-2 rounded-lg border border-gray-200 shadow-sm transition-all"
              @click="
                () => {
                  colors.titleBg = '#7030A0'
                  colors.summaryBg = '#FFC000'
                  colors.headerBg = '#808080'
                  colors.kpiBg = '#C5D9F1'
                  colors.ratingBg = '#4F6228'
                  colors.scoreFontColor = '#0000FF'
                }
              "
            >
              <span class="flex items-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  class="h-4 w-4 mr-1"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                Reset to Default
              </span>
            </button>
          </div>
        </div>

        <!-- Two column layout for design sections -->
        <div class="grid grid-cols-1 lg:grid-cols-5 gap-8">
          <!-- Left column for Logo and Preview -->
          <div class="lg:col-span-2 space-y-6">
            <!-- Logo upload section -->
            <div class="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
              <h3 class="font-semibold text-gray-700 mb-3 flex items-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  class="h-5 w-5 mr-1 text-indigo-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
                Report Logo
              </h3>
              <div
                class="border-2 border-dashed border-gray-200 bg-gray-50 rounded-lg p-4 flex flex-col items-center justify-center mb-4 hover:bg-gray-100 transition-colors"
              >
                <div
                  class="w-full h-32 flex items-center justify-center bg-white rounded-md overflow-hidden shadow-inner"
                >
                  <img
                    v-if="colors.logo"
                    :src="colors.logo"
                    alt="Report Logo"
                    class="max-w-full max-h-full object-contain"
                  />
                  <div v-else class="text-gray-400 flex flex-col items-center">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      class="h-10 w-10 mb-1"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="1.5"
                        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                    <span>No logo uploaded</span>
                  </div>
                </div>
              </div>

              <div class="space-y-3">
                <FileUpload
                  mode="basic"
                  name="logo"
                  accept="image/*"
                  :maxFileSize="5000000"
                  @select="handleLogoUpload"
                  chooseLabel="Choose Logo (Max 5MB)"
                  class="w-full"
                />
                <p class="text-xs text-gray-500 italic">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    class="h-3 w-3 inline mr-1"
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
                  Recommended: Square transparent PNG (600x600px)
                </p>
                <p class="text-xs text-gray-500">Large images will be automatically compressed</p>

                <button
                  v-if="colors.logo"
                  @click="removeLogo"
                  class="mt-2 text-red-500 hover:text-red-700 text-sm flex items-center"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke-width="1.5"
                    stroke="currentColor"
                    class="w-4 h-4 mr-1"
                  >
                    <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Remove Logo
                </button>
              </div>
            </div>

            <!-- Report Preview -->
            <div class="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
              <h3 class="font-semibold text-gray-700 mb-3 flex items-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  class="h-5 w-5 mr-1 text-indigo-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                Report Preview
              </h3>
              <!-- Mini preview of how the report will look -->
              <div class="border border-gray-200 rounded-md overflow-hidden">
                <!-- Header area -->
                <div
                  :style="{ backgroundColor: ensureHashPrefix(colors.titleBg) }"
                  class="p-3 text-white text-center"
                >
                  <div class="text-sm font-bold">Report Header</div>
                </div>
                <!-- Summary section -->
                <div
                  :style="{ backgroundColor: ensureHashPrefix(colors.summaryBg) }"
                  class="p-2 text-center text-xs font-medium"
                >
                  Score Summary
                </div>
                <!-- Table headers -->
                <div class="flex">
                  <div
                    :style="{ backgroundColor: ensureHashPrefix(colors.headerBg) }"
                    class="p-2 text-white text-xs flex-1 text-center"
                  >
                    KPIs
                  </div>
                  <div
                    :style="{ backgroundColor: ensureHashPrefix(colors.headerBg) }"
                    class="p-2 text-white text-xs flex-1 text-center"
                  >
                    Scores
                  </div>
                </div>
                <!-- KPI row -->
                <div class="flex">
                  <div
                    :style="{ backgroundColor: ensureHashPrefix(colors.kpiBg) }"
                    class="p-2 text-xs flex-1"
                  >
                    Section Title
                  </div>
                  <div class="p-2 text-xs flex-1 text-center">85%</div>
                </div>
                <!-- Rating -->
                <div class="flex items-center justify-center p-2">
                  <span
                    :style="{ backgroundColor: ensureHashPrefix(colors.ratingBg), color: 'white' }"
                    class="text-xs py-1 px-2 rounded-full"
                    >Good</span
                  >
                </div>
                <!-- Total score -->
                <div class="border-t border-gray-200 p-2 text-center">
                  <span
                    :style="{ color: ensureHashPrefix(colors.scoreFontColor) }"
                    class="font-bold"
                    >92%</span
                  >
                </div>
              </div>
            </div>
          </div>

          <!-- Right column for Color customization -->
          <div class="lg:col-span-3">
            <div class="bg-white rounded-xl shadow-sm border border-gray-100">
              <div class="p-5 border-b border-gray-100">
                <h3 class="font-semibold text-gray-700 flex items-center">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    class="h-5 w-5 mr-1 text-indigo-500"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"
                    />
                  </svg>
                  Color Scheme
                </h3>
              </div>

              <div class="p-5 space-y-5">
                <!-- Color customization grid -->
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <!-- Title Background -->
                  <div class="bg-gray-50 rounded-lg p-4 hover:shadow-sm transition-shadow">
                    <label class="block text-sm font-medium text-gray-700 mb-2"
                      >Title Background</label
                    >
                    <div class="flex items-center gap-3">
                      <ColorPicker v-model="colors.titleBg" format="hex" />
                      <div class="flex-1 space-y-2">
                        <div
                          class="w-full h-8 rounded-md"
                          :style="{ backgroundColor: ensureHashPrefix(colors.titleBg) }"
                        ></div>
                        <div class="flex items-center">
                          <input
                            type="text"
                            v-model="colors.titleBg"
                            class="flex-1 p-1.5 border border-gray-300 rounded w-24 text-sm"
                            pattern="^#?([0-9a-fA-F]{6})$"
                            @input="(e) => validateAndFormatHex(e, 'titleBg')"
                          />
                        </div>
                      </div>
                    </div>
                    <p class="text-xs text-gray-500 mt-2">Used for main report header area</p>
                  </div>

                  <!-- Summary Background -->
                  <div class="bg-gray-50 rounded-lg p-4 hover:shadow-sm transition-shadow">
                    <label class="block text-sm font-medium text-gray-700 mb-2"
                      >Summary Background</label
                    >
                    <div class="flex items-center gap-3">
                      <ColorPicker v-model="colors.summaryBg" format="hex" />
                      <div class="flex-1 space-y-2">
                        <div
                          class="w-full h-8 rounded-md"
                          :style="{ backgroundColor: ensureHashPrefix(colors.summaryBg) }"
                        ></div>
                        <div class="flex items-center">
                          <input
                            type="text"
                            v-model="colors.summaryBg"
                            class="flex-1 p-1.5 border border-gray-300 rounded w-24 text-sm"
                            pattern="^#?([0-9a-fA-F]{6})$"
                            @input="(e) => validateAndFormatHex(e, 'summaryBg')"
                          />
                        </div>
                      </div>
                    </div>
                    <p class="text-xs text-gray-500 mt-2">Used for section header rows</p>
                  </div>

                  <!-- Header Background -->
                  <div class="bg-gray-50 rounded-lg p-4 hover:shadow-sm transition-shadow">
                    <label class="block text-sm font-medium text-gray-700 mb-2"
                      >Header Background</label
                    >
                    <div class="flex items-center gap-3">
                      <ColorPicker v-model="colors.headerBg" format="hex" />
                      <div class="flex-1 space-y-2">
                        <div
                          class="w-full h-8 rounded-md"
                          :style="{ backgroundColor: ensureHashPrefix(colors.headerBg) }"
                        ></div>
                        <div class="flex items-center">
                          <input
                            type="text"
                            v-model="colors.headerBg"
                            class="flex-1 p-1.5 border border-gray-300 rounded w-24 text-sm"
                            pattern="^#?([0-9a-fA-F]{6})$"
                            @input="(e) => validateAndFormatHex(e, 'headerBg')"
                          />
                        </div>
                      </div>
                    </div>
                    <p class="text-xs text-gray-500 mt-2">Used for table column headers</p>
                  </div>

                  <!-- KPI Row Background -->
                  <div class="bg-gray-50 rounded-lg p-4 hover:shadow-sm transition-shadow">
                    <label class="block text-sm font-medium text-gray-700 mb-2"
                      >KPI Row Background</label
                    >
                    <div class="flex items-center gap-3">
                      <ColorPicker v-model="colors.kpiBg" format="hex" />
                      <div class="flex-1 space-y-2">
                        <div
                          class="w-full h-8 rounded-md"
                          :style="{ backgroundColor: ensureHashPrefix(colors.kpiBg) }"
                        ></div>
                        <div class="flex items-center">
                          <input
                            type="text"
                            v-model="colors.kpiBg"
                            class="flex-1 p-1.5 border border-gray-300 rounded w-24 text-sm"
                            pattern="^#?([0-9a-fA-F]{6})$"
                            @input="(e) => validateAndFormatHex(e, 'kpiBg')"
                          />
                        </div>
                      </div>
                    </div>
                    <p class="text-xs text-gray-500 mt-2">Used for KPI rows and section headers</p>
                  </div>

                  <!-- Rating Background -->
                  <div class="bg-gray-50 rounded-lg p-4 hover:shadow-sm transition-shadow">
                    <label class="block text-sm font-medium text-gray-700 mb-2"
                      >Rating Background</label
                    >
                    <div class="flex items-center gap-3">
                      <ColorPicker v-model="colors.ratingBg" format="hex" />
                      <div class="flex-1 space-y-2">
                        <div
                          class="w-full h-8 rounded-md"
                          :style="{ backgroundColor: ensureHashPrefix(colors.ratingBg) }"
                        ></div>
                        <div class="flex items-center">
                          <input
                            type="text"
                            v-model="colors.ratingBg"
                            class="flex-1 p-1.5 border border-gray-300 rounded w-24 text-sm"
                            pattern="^#?([0-9a-fA-F]{6})$"
                            @input="(e) => validateAndFormatHex(e, 'ratingBg')"
                          />
                        </div>
                      </div>
                    </div>
                    <p class="text-xs text-gray-500 mt-2">
                      Used for rating labels (Good, Excellent, etc.)
                    </p>
                  </div>

                  <!-- Score Font Color -->
                  <div class="bg-gray-50 rounded-lg p-4 hover:shadow-sm transition-shadow">
                    <label class="block text-sm font-medium text-gray-700 mb-2"
                      >Score Font Color</label
                    >
                    <div class="flex items-center gap-3">
                      <ColorPicker v-model="colors.scoreFontColor" format="hex" />
                      <div class="flex-1 space-y-2">
                        <div
                          class="w-full h-8 rounded-md flex items-center justify-center"
                          :style="{
                            backgroundColor: '#ffffff',
                            color: ensureHashPrefix(colors.scoreFontColor)
                          }"
                        >
                          <span class="font-bold text-lg">92%</span>
                        </div>
                        <div class="flex items-center">
                          <input
                            type="text"
                            v-model="colors.scoreFontColor"
                            class="flex-1 p-1.5 border border-gray-300 rounded w-24 text-sm"
                            pattern="^#?([0-9a-fA-F]{6})$"
                            @input="(e) => validateAndFormatHex(e, 'scoreFontColor')"
                          />
                        </div>
                      </div>
                    </div>
                    <p class="text-xs text-gray-500 mt-2">Used for the total score percentage</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Saved Templates Section -->
      <div class="mb-8 border rounded p-4" v-if="Templates().templates.length > 0">
        <h2 class="text-lg font-bold mb-4">Saved Templates</h2>
        <div class="flex flex-col md:flex-row gap-4 items-start md:items-center">
          <div class="flex-grow">
            <select
              class="w-full p-2 border rounded"
              v-model="selectedTemplateId"
              @change="selectedTemplateId && loadTemplate(selectedTemplateId)"
            >
              <option value="">Select a template</option>
              <option
                v-for="template in Templates().templates"
                :key="template.id"
                :value="template.id"
              >
                {{ template.template_name }}
                {{ template.branch_code ? `(${template.branch_code})` : '' }} -
                {{ new Date(template.created_at).toLocaleDateString() }}
              </option>
            </select>
          </div>
          <Button
            v-if="selectedTemplateId"
            @onClick="selectedTemplateId = ''"
            :type="'button'"
            label="Clear Selection"
            class="bg-gray-500"
          />
          <Button
            v-if="selectedTemplateId"
            @onClick="
              () => {
                if (confirm('Are you sure you want to delete this template?')) {
                  Templates().deleteTemplate(selectedTemplateId)
                  selectedTemplateId = ''
                }
              }
            "
            :type="'button'"
            label="Delete Template"
            class="bg-red-500"
          />
        </div>
      </div>

      <!-- Report header section with centered logo -->
      <table class="report-table mx-auto shadow-lg rounded-lg overflow-hidden">
        <thead>
          <tr>
            <th
              colspan="24"
              :style="{
                backgroundColor: ensureHashPrefix(colors.titleBg),
                color: 'white',
                padding: '16px'
              }"
              class="rounded-t-lg"
            >
              <div class="flex flex-col items-center justify-center">
                <div v-if="colors.logo" class="mb-4">
                  <img :src="colors.logo" alt="Report Logo" class="h-20 object-contain" />
                </div>
                <h1 class="text-center text-2xl font-bold">
                  {{ Client().selected_client?.name || 'Client' }} - MYSTERY SHOPPING Assessment
                  Report
                </h1>
              </div>
            </th>
          </tr>
        </thead>

        <tbody class="text-sm">
          <!-- Field Header Customization -->
          <tr>
            <td class="no-border">&nbsp;</td>
            <td
              colspan="6"
              :style="{ textAlign: 'center', backgroundColor: ensureHashPrefix(colors.summaryBg) }"
            >
              <b>Customize Form Fields</b>
            </td>
          </tr>
          <tr>
            <td class="no-border">&nbsp;</td>
            <td class="border border-black p-2" colspan="2">Form Field</td>
            <td class="border border-black p-2" colspan="4">Branch Data Field</td>
          </tr>

          <tr v-for="(field, index) in customFields" :key="index">
            <td class="no-border">&nbsp;</td>
            <td class="border border-black p-2" colspan="2">
              <div class="flex items-center gap-2">
                <InputText v-model="field.label" placeholder="Field Label" class="w-full" />
                <div class="flex flex-col">
                  <button
                    @click="() => field.displayOrder > 1 && field.displayOrder--"
                    class="text-blue-500"
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
                        d="M4.5 15.75l7.5-7.5 7.5 7.5"
                      />
                    </svg>
                  </button>
                  <button @click="() => field.displayOrder++" class="text-blue-500">
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
                        d="M19.5 8.25l-7.5 7.5-7.5-7.5"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            </td>
            <td class="border border-black p-2" colspan="3">
              <div class="flex flex-col gap-1">
                <Dropdown
                  v-model="field.headerField"
                  :options="availableHeaders"
                  optionLabel="name"
                  optionValue="value"
                  placeholder="Select Data Field"
                  class="w-full"
                  @change="(e) => onFieldSelectionChange(e, field)"
                  filter
                  :filterPlaceholder="'Search fields...'"
                />
                <div v-if="field.headerField" class="flex items-center gap-1 text-xs">
                  <input
                    type="checkbox"
                    :id="'primary-' + index"
                    :checked="primaryIdentifierField === field.headerField"
                    @change="
                      () =>
                        setPrimaryIdentifier(
                          primaryIdentifierField === field.headerField ? '' : field.headerField
                        )
                    "
                    class="w-3 h-3"
                  />
                  <label :for="'primary-' + index" class="text-gray-700">
                    Use as primary field for auto-fill
                  </label>
                </div>
              </div>
            </td>
            <td class="border border-black p-2" colspan="1">
              <button
                @click="() => removeCustomField(index)"
                class="p-1 bg-red-500 text-white rounded"
                v-if="customFields.length > 1"
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
            </td>
          </tr>

          <tr>
            <td class="no-border">&nbsp;</td>
            <td colspan="6" class="py-4">
              <div
                v-if="customFields.length === 0"
                class="text-center py-8 border border-dashed border-gray-300 rounded mb-4"
              >
                <p class="text-gray-500 mb-4">
                  No fields added yet. Create your first field below.
                </p>
              </div>
              <button
                @click="addCustomField"
                class="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded w-full justify-center"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke-width="1.5"
                  stroke="currentColor"
                  class="w-5 h-5"
                >
                  <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                Add New Field
              </button>
            </td>
          </tr>

          <tr>
            <td colspan="8" class="no-border py-4">&nbsp;</td>
          </tr>

          <!-- Dynamic Branch Information Fields -->
          <template
            v-for="field in [...customFields].sort((a, b) => a.displayOrder - b.displayOrder)"
            :key="field.label"
          >
            <tr v-if="field.headerField">
              <td class="no-border">&nbsp;</td>
              <td class="border border-black p-2" colspan="2">
                <div class="flex items-center gap-2">
                  {{ field.label }}
                  <span
                    v-if="primaryIdentifierField === field.headerField"
                    class="bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded-full"
                  >
                    Primary
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
            </td>
            <td
              :style="{
                textAlign: 'center',
                backgroundColor: ensureHashPrefix(colors.titleBg),
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
                color: ensureHashPrefix(colors.scoreFontColor),
                border: 'solid'
              }"
            >
              <h2>
                <b>{{ totalScores.performance_percentage }}%</b>
              </h2>
            </td>
          </tr>
          <tr>
            <td class="no-border">&nbsp;</td>
            <td class="border border-black p-2" colspan="2">Time In</td>
            <td class="border border-black p-2" colspan="4">
              <InputText type="time" v-model="value" />
            </td>
          </tr>

          <!-- 1st info section done here  End-->
          <tr>
            <td colspan="8" class="no-border">&nbsp;</td>
          </tr>

          <!-- Start of non KE CRS -->
          <tr>
            <td class="no-border">&nbsp;</td>
            <td
              colspan="6"
              :style="{
                textAlign: 'center',
                backgroundColor: ensureHashPrefix(colors.summaryBg)
              }"
              class="py-3 text-lg font-bold rounded-t-lg"
            >
              Score Summary
            </td>
          </tr>
          <tr>
            <td class="no-border">&nbsp;</td>
            <td
              colspan="2"
              :style="{
                textAlign: 'center',
                backgroundColor: ensureHashPrefix(colors.headerBg),
                color: 'white'
              }"
            >
              KPI's
            </td>
            <td
              :style="{
                textAlign: 'center',
                backgroundColor: ensureHashPrefix(colors.headerBg),
                color: 'white'
              }"
            >
              Applicable Score
            </td>
            <td
              :style="{
                textAlign: 'center',
                backgroundColor: ensureHashPrefix(colors.headerBg),
                color: 'white'
              }"
            >
              Achieved Score
            </td>
            <td
              :style="{
                textAlign: 'center',
                backgroundColor: ensureHashPrefix(colors.headerBg),
                color: 'white'
              }"
            >
              Performance %
            </td>
            <td
              :style="{
                textAlign: 'center',
                backgroundColor: ensureHashPrefix(colors.headerBg),
                color: 'white'
              }"
            >
              Rating
            </td>
          </tr>

          <tr v-for="(report, index) in Reports().reports_data" :key="report.heading + index">
            <td class="no-border">&nbsp;</td>
            <td
              colspan="2"
              :style="{
                fontSize: '13px',
                backgroundColor: ensureHashPrefix(colors.kpiBg),
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
                backgroundColor: ensureHashPrefix(colors.ratingBg)
              }"
            >
              <b>{{ getRatingText(parseInt(report.achieved)) }}</b>
            </td>
          </tr>

          <tr>
            <td class="no-border">&nbsp;</td>
            <td
              colspan="2"
              :style="{
                textAlign: 'center',
                backgroundColor: ensureHashPrefix(colors.headerBg),
                color: 'white'
              }"
            >
              Overall Performance
            </td>
            <td
              :style="{
                textAlign: 'center',
                backgroundColor: ensureHashPrefix(colors.headerBg),
                color: 'white'
              }"
            >
              <b>{{ totalScores.total_applicable_score }}</b>
            </td>
            <td
              :style="{
                textAlign: 'center',
                backgroundColor: ensureHashPrefix(colors.headerBg),
                color: 'white'
              }"
            >
              <b>{{ totalScores.total_achieved_score }}</b>
            </td>
            <td
              :style="{
                textAlign: 'center',
                backgroundColor: ensureHashPrefix(colors.headerBg),
                color: 'white'
              }"
            >
              <b>{{ totalScores.performance_percentage }}%</b>
            </td>
            <td
              :style="{
                border: '1px solid #f4f4f4',
                backgroundColor: ensureHashPrefix(colors.ratingBg),
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

          <tr>
            <td colspan="8" class="pt-4 pb-2">
              <div class="mx-auto flex items-center justify-center">
                <button
                  @click="addSectionAtTop"
                  type="button"
                  class="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-full shadow-md transition-all transform hover:scale-105"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke-width="1.5"
                    stroke="currentColor"
                    class="size-6"
                  >
                    <path stroke-linecap="round" stroke-linejoin="round" d="M12 19.5V4.5m0 0l-6 6m6-6l6 6" />
                  </svg>
                  <span class="font-medium">Add Section at Top</span>
                </button>
              </div>
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
                    :disabled="false"
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
                    :disabled="false"
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
                  <select
                    v-model="data.response"
                    @change="calculateScores(data)"
                    :class="{
                      'border-2 border-red-500': data.response === 'No' || data.response === 'no'
                    }"
                  >
                    <option v-for="resp in clientResponses" :key="resp.uuid" :value="resp.response">
                      {{ resp.response }}
                    </option>
                  </select>
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
                    @input="calculateScores(data)"
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
                    :disabled="false"
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
                    v-if="data.response === 'No' || data.response === 'no'"
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
              <div class="mx-auto flex items-center justify-center">
                <button
                  @click="addSectionAtBottom"
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
                    <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                  <span class="font-medium">Add New Section</span>
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
