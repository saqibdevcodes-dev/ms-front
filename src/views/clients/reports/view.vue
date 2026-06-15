<script setup lang="ts" name="ClientReportViewer">
import { onMounted, ref, computed, watch } from 'vue'
import DefaultLayout from '@/layouts/DefaultLayout.vue'
import { Reports } from '@/stores/reports'
import { useRoute, useRouter } from 'vue-router'
import { startCase } from 'lodash'
import { Toast } from '@/utils/toast'
import Button from '@/components/Buttons/Button.vue'
import { Client } from '@/stores/client'
import Swal from 'sweetalert2'
import { Auth } from '@/stores/auth'
import { useColorsScore } from '@/stores/colorsScore'
import { Ranges } from '@/stores/ranges'

// Rating functions matching the Echarts/pie.vue logic
const getPieChartRatingText = (percentage: number): string => {
  if (percentage >= 90) return 'Outstanding'
  if (percentage >= 80) return 'Good'
  if (percentage >= 70) return 'Average'
  return 'Below Average'
}

const getPieChartRatingColor = (percentage: number): string => {
  if (percentage >= 90) return '#10B981' // Outstanding - green
  if (percentage >= 80) return '#008000' // Good - darker green
  if (percentage >= 70) return '#F59E0B' // Average - yellow/amber
  return '#EF4444' // Below Average - red
}

// Define types for report and colors
interface ReportColors {
  titleBg: string
  headerBg: string
  kpiBg: string
  summaryBg: string
  scoreFontColor: string
}

interface ClientType {
  uuid?: string
  name?: string
  [key: string]: any
}

// Define types for report sections and questions
interface ReportQuestion {
  question: string
  sub_question?: string
  response?: string
  total_score: number
  applicable_score: number
  achieved_score: number
  comments?: string
}

interface ReportSection {
  heading: string
  weightage: string
  total_score: number
  total_applicable_score: number
  total_achieved_score: number
  achieved: number
  data?: ReportQuestion[]
}

const route = useRoute()
const router = useRouter()
const report = ref<any>(null)
const isLoading = ref(true)
const showOriginalForm = ref(false)

// Add these missing variables needed for report modification tracking
const reportModified = ref(false)
const reportModifiedContent = ref(null)

// Function to reset report modification state
const resetReportModifiedState = () => {
  reportModified.value = false
  reportModifiedContent.value = null
  console.log('Reset report modification state')
}

// Get the report ID and table from the route
const reportId = computed<string>(() => {
  return route.params.id as string
})

const tableParam = computed<string | null>(() => {
  return typeof route.query.table === 'string' ? route.query.table : null
})

// Define function to load report data
const loadReportData = async (force = false) => {
  try {
    isLoading.value = true
    console.log(
      `Loading report ID: ${reportId.value}, table: ${
        tableParam.value || 'default'
      }, force: ${force}`
    )

    // Get the report with the specified ID - always use a type cast for the table parameter
    const data = await Reports().getReportById(reportId.value, tableParam.value as any, {
      forceRefresh: force
    })

    if (!data) {
      Toast.error('Failed to load report data')
      return
    }

    console.log('Report data loaded successfully')
    report.value = data

    // Reset modification state when loading new data
    resetReportModifiedState()
  } catch (error: unknown) {
    console.error('Error loading report:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    Toast.error('Error loading report: ' + errorMessage)
  } finally {
    isLoading.value = false
  }
}

// Watch for route changes to reload report
watch([reportId, tableParam], () => {
  loadReportData()
})

// Initial load when component mounts
onMounted(async () => {
  await Ranges().fetch()
  console.log('Report viewer mounted')

  // Fetch ranges first to ensure they're available for score display
  if (Client().selected_client?.uuid) {
    console.log('Fetching ranges...')
    try {
      await Ranges().fetch({ forceRefresh: true })
      console.log('Ranges fetched successfully')
    } catch (err) {
      console.error('Error fetching ranges:', err)
    }
  }

  // Then load report data with forced refresh
  console.log('Loading report data with force refresh')
  loadReportData(true) // Force refresh on initial load
})

// Add route change handler to refresh data
watch(
  () => route.path,
  (newPath, oldPath) => {
    if (newPath !== oldPath && newPath.includes('/client/reports/view/')) {
      console.log('Route changed, reloading report data')
      loadReportData(true)
    }
  }
)

// Format date for display
const formatDate = (dateString: string | null | undefined): string => {
  if (!dateString) return 'N/A'
  return new Date(dateString).toLocaleString()
}

// Navigate back to the reports list
const goBack = () => {
  router.push('/client/reports')
}

// Navigate to edit page
const editReport = () => {
  if (!report.value?.id) {
    Toast.error('Cannot edit: Missing report ID')
    return
  }

  // Prevent editing if the report status is submitted or approved for non-admin users
  if (!canEditReport.value) {
    Toast.info('Submitted or approved reports cannot be edited.')
    return
  }

  // Construct the query parameter for the table if available
  const tableQuery = report.value.table ? `?table=${report.value.table}` : ''
  router.push(`/client/report/edit/${report.value.id}${tableQuery}`)
}

// Delete report
const deleteReport = async () => {
  if (!report.value?.id) {
    Toast.error('Cannot delete: Missing report ID')
    return
  }

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
      isLoading.value = true
      const success = await Reports().deleteReport(report.value.id, report.value.table)
      if (success) {
        Toast.success('Report deleted successfully')
        // Navigate back to reports list
        router.push('/client/reports')
      }
    } catch (error: any) {
      console.error('Error deleting report:', error)
      Toast.error('Failed to delete report: ' + (error.message || 'Unknown error'))
    } finally {
      isLoading.value = false
    }
  }
}

// Handle report status update with proper type casting
const updateStatus = async (newStatus: string) => {
  try {
    isLoading.value = true
    if (!report.value?.id) return

    console.log(`Updating report status from ${report.value.status} to ${newStatus}`)

    // Get the formatted client name for consistent table naming
    const formattedClientName = Client()
      .selected_client?.name?.replace(/\s+/g, '_')
      .replace(/[^a-zA-Z0-9_]/g, '')
      .toLowerCase()

    // Use explicit table name to avoid inconsistencies
    const clientTable = `${formattedClientName}_reports`
    console.log(`Using explicit table name: ${clientTable}`)

    // Initialize Reports store first to ensure it's ready
    await Reports().init()

    let success = false
    try {
      // Cast clientTable to any to bypass the type error
      success = await Reports().updateReportStatus(report.value.id, newStatus, clientTable as any)
    } catch (error) {
      console.error('Error calling updateReportStatus:', error)
      Toast.error('Failed to update report status: API error')
      return
    }

    if (success) {
      // Immediately update the status locally to ensure UI consistency
      report.value.status = newStatus
      Toast.success(`Report status changed to ${newStatus}`)

      // Set a flag to remember the status we just set
      localStorage.setItem(`report_${report.value.id}_status`, newStatus)

      // Reload the report to reflect all changes
      await loadReportData()

      // Double-check that the status matches what we set
      // If there's still a mismatch, force it
      if (report.value.status !== newStatus) {
        console.warn(`Status mismatch after reload - forcing status to ${newStatus}`)
        report.value.status = newStatus
      }
    }
  } catch (error: any) {
    console.error('Error updating report status:', error)
    Toast.error('Failed to update report status')
  } finally {
    isLoading.value = false
  }
}

// Add helper function to get current user ID
const getUserId = () => {
  try {
    const userJson = localStorage.getItem('user')
    if (userJson) {
      const user = JSON.parse(userJson)
      return user.id
    }
    return null
  } catch (e) {
    console.error('Failed to parse user data from localStorage:', e)
    return null
  }
}

// Add computed properties to determine user permissions
const isAdmin = computed(() => Auth().isAdmin())
const currentUserId = computed(() => getUserId())
const isReportCreator = computed(() => {
  if (!report.value) return false
  const reportCreatorId = report.value.creator?.id || report.value.created_by
  return currentUserId.value === reportCreatorId
})

// Determine if user can view this report
const canViewReport = computed(() => {
  if (!report.value) return false

  // Add detailed logging to help diagnose permission issues
  console.log('Checking view permissions:')
  console.log('- User role:', Auth().getUserRole())
  console.log('- Is Admin?', isAdmin.value)
  console.log('- Is Report Creator?', isReportCreator.value)
  console.log('- Is Reporting User?', Auth().isReportingUser())
  console.log('- Report status:', report.value.status)

  // Report creators can always view their own reports
  if (isReportCreator.value) {
    console.log('User is the report creator, granting view access')
    return true
  }

  // Reporting users can view all reports
  if (Auth().isReportingUser()) {
    console.log('User is a reporting_user, granting view access')
    return true
  }

  // Admins can view reports that are submitted, approved, or rejected (not drafts)
  if (isAdmin.value) {
    const hasAccess = ['submitted', 'approved', 'rejected'].includes(report.value.status)
    console.log(`User is admin, access: ${hasAccess ? 'granted' : 'denied'} based on report status`)
    return hasAccess
  }

  // Client users can view approved reports
  if (Auth().isClientUser() && report.value.status === 'approved') {
    console.log('User is client_user and report is approved, granting view access')
    return true
  }

  // Default: other users can't view reports they didn't create
  console.log('Default case: Denying view access')
  return false
})

// Check if report can be edited based on its status
const canEditReport = computed(() => {
  if (!report.value) return false

  // Admins can edit any report
  if (isAdmin.value) return true

  // Reporting users can edit reports in draft or rejected status
  if (Auth().isReportingUser()) {
    return ['draft', 'rejected'].includes(report.value.status)
  }

  // Non-admin users can only edit their own reports that are in draft or rejected status
  if (isReportCreator.value) {
    return ['draft', 'rejected'].includes(report.value.status)
  }

  return false
})

const canDeleteReport = computed(
  () => isAdmin.value || isReportCreator.value || Auth().isReportingUser()
)

// Only admins can approve/reject reports that are submitted by others
const canApproveReject = computed(() => {
  console.log('Checking canApproveReject:')
  console.log('- Current report status:', report.value?.status)
  console.log('- Is admin?', isAdmin.value)
  console.log('- Is report creator?', isReportCreator.value)

  // If not submitted yet, nobody can approve/reject
  if (report.value?.status !== 'submitted') {
    console.log('-> Cannot approve/reject: Report is not in submitted status')
    return false
  }

  // Admin can only approve/reject reports submitted by others
  if (isAdmin.value && !isReportCreator.value) {
    console.log('-> Can approve/reject: User is admin and not the report creator')
    return true
  }

  // Non-creators who are not admins don't get approve/reject permissions
  console.log('-> Cannot approve/reject: User lacks the required permissions')
  return false
})

// Helper function to ensure color has # prefix
const ensureColorFormat = (color: string | undefined | null): string => {
  if (!color) return '#284b8c'

  // If the color already has a # prefix, return it as is
  if (color.startsWith('#')) return color

  // If it's a valid hex without #, add the prefix
  const hexRegex = /^([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/
  if (hexRegex.test(color)) {
    return `#${color}`
  }

  // Return a default color if the format is invalid
  return '#284b8c'
}

// Helper function to determine text color based on background brightness
const getTextColorForBackground = (backgroundColor: string): string => {
  // If no background color, return black
  if (!backgroundColor) return '#000000'

  // Make sure the color has a # prefix
  const color = ensureColorFormat(backgroundColor)

  // Extract RGB values
  const r = parseInt(color.substring(1, 3), 16)
  const g = parseInt(color.substring(3, 5), 16)
  const b = parseInt(color.substring(5, 7), 16)

  // Calculate luminance - standard formula for perceived brightness
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255

  // Return white for dark backgrounds, black for light backgrounds
  return luminance > 0.5 ? '#000000' : '#ffffff'
}

// Get report colors
const reportColors = computed<ReportColors>(() => {
  if (!report.value?.colors) {
    return {
      titleBg: '#284b8c',
      headerBg: '#284b8c',
      kpiBg: '#e6f2ff',
      summaryBg: '#f2f2f2',
      scoreFontColor: '#000000'
    }
  }
  return {
    titleBg: ensureColorFormat(report.value.colors.titleBg),
    headerBg: ensureColorFormat(report.value.colors.headerBg),
    kpiBg: ensureColorFormat(report.value.colors.kpiBg),
    summaryBg: ensureColorFormat(report.value.colors.summaryBg),
    scoreFontColor: ensureColorFormat(report.value.colors.scoreFontColor)
  }
})

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
const checkFatalError = (): boolean => {
  if (!report.value?.content?.reports) return false

  // Check if there's any section with "Fatal Error" in the name
  // that has at least one question with "yes" response
  return report.value.content.reports.some((section) => checkSectionFatalError(section))
}

// Function to check if a section is a fatal error section (has fatal error in name)
const isFatalErrorSection = (section: ReportSection): boolean => {
  const sectionName = section.heading?.toLowerCase() || ''
  return sectionName.includes('fatal error')
}

// Function to check if there are any fatal error sections present
const hasFatalErrorSections = (): boolean => {
  if (!report.value?.content?.reports) return false
  return report.value.content.reports.some((section) => isFatalErrorSection(section))
}

// Calculate overall score
const overallScore = computed(() => {
  if (!report.value?.content?.reports || report.value.content.reports.length === 0) {
    return { percentage: 0, totalAchieved: 0, totalApplicable: 0 }
  }

  try {
    // Calculate overall score from all sections
    let totalAchieved = 0
    let totalApplicable = 0

    // Loop through all sections in the report to calculate the overall score
    report.value.content.reports.forEach((section: ReportSection) => {
      if (section.total_achieved_score !== undefined && section.total_applicable_score) {
        totalAchieved += parseFloat(section.total_achieved_score.toString() || '0')
        totalApplicable += parseFloat(section.total_applicable_score.toString() || '0')
      }
    })

    // Calculate percentage
    let percentage = 0
    if (totalApplicable > 0) {
      percentage = (totalAchieved / totalApplicable) * 100
    }

    return {
      percentage: Number(percentage.toFixed(2)),
      totalAchieved,
      totalApplicable
    }
  } catch (error) {
    console.error('Error calculating overall score:', error)
    return { percentage: 0, totalAchieved: 0, totalApplicable: 0 }
  }
})

// Computed property for non-fatal error sections totals
const nonFatalErrorTotals = computed(() => {
  if (!report.value?.content?.reports) {
    return {
      total_score: 0,
      total_applicable_score: 0,
      total_achieved_score: 0,
      performance_percentage: 0
    }
  }

  const totals = {
    total_score: 0,
    total_applicable_score: 0,
    total_achieved_score: 0,
    performance_percentage: 0
  }

  report.value.content.reports.forEach((section: ReportSection) => {
    if (!isFatalErrorSection(section)) {
      totals.total_score += Number(section.total_score) || 0
      totals.total_applicable_score += Number(section.total_applicable_score) || 0
      totals.total_achieved_score += Number(section.total_achieved_score) || 0
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
  if (!report.value?.content?.reports) {
    return {
      total_score: 0,
      total_applicable_score: 0,
      total_achieved_score: 0,
      performance_percentage: 0
    }
  }

  const totals = {
    total_score: 0,
    total_applicable_score: 0,
    total_achieved_score: 0,
    performance_percentage: 0
  }

  report.value.content.reports.forEach((section: ReportSection) => {
    if (isFatalErrorSection(section)) {
      const sectionTotalScore = Number(section.total_score) || 0
      const sectionAchievedScore = Number(section.total_achieved_score) || 0
      totals.total_score += sectionTotalScore
      // Fatal error section - applicable score always shows total score
      totals.total_applicable_score += sectionTotalScore

      // For fatal error sections, use the calculated achieved score from question responses
      // Don't override it based on YES/NO - let it be calculated naturally
      totals.total_achieved_score += sectionAchievedScore
    }
  })

  totals.performance_percentage =
    totals.total_applicable_score > 0
      ? Math.round((totals.total_achieved_score / totals.total_applicable_score) * 100)
      : 0

  return totals
})

// Add a new ref to track which sections are visible
const visibleSections = ref<Record<number, boolean>>({})

// Function to toggle section visibility
const toggleSection = (index: number): void => {
  visibleSections.value[index] = !visibleSections.value[index]
}

// Function to check if a section is visible
const isSectionVisible = (index: number): boolean => {
  return !!visibleSections.value[index]
}

// Add a watch to monitor report status changes
watch(
  () => report.value?.status,
  (newStatus, oldStatus) => {
    console.log(`Report status changed from ${oldStatus} to ${newStatus}`)
    console.log('Updated report data:', report.value)
    if (newStatus !== oldStatus) {
      console.log('Computed values after status change:')
      console.log('- canViewReport:', canViewReport.value)
      console.log('- canEditReport:', canEditReport.value)
      console.log('- canApproveReject:', canApproveReject.value)
      console.log('- isReportCreator:', isReportCreator.value)
    }
  },
  { immediate: true }
)

// Function to format file size
const formatFileSize = (bytes: number | null | undefined): string => {
  if (!bytes || isNaN(bytes)) return 'Unknown size'

  const units = ['B', 'KB', 'MB', 'GB']
  let size = parseInt(bytes.toString(), 10)
  let unitIndex = 0

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024
    unitIndex++
  }

  return `${size.toFixed(size < 10 && unitIndex > 0 ? 1 : 0)} ${units[unitIndex]}`
}

// Helper to check if original form data is available
const hasOriginalFormData = computed(() => {
  if (!report.value?.content) return false

  // Check for data in different possible locations
  const hasData =
    !!report.value.content.reports &&
    report.value.content.reports.length > 0 &&
    report.value.content.reports.some(
      (section: ReportSection) => section.data && section.data.length > 0
    )

  return hasData
})

// Add a computed property for status badge classes
const statusBadgeClass = computed(() => {
  if (!report.value) return 'bg-gray-100 text-gray-800'

  const status = report.value.status
  if (status === 'draft') return 'bg-yellow-100 text-yellow-800'
  if (status === 'submitted') return 'bg-blue-100 text-blue-800'
  if (status === 'approved') return 'bg-green-100 text-green-800'
  if (status === 'rejected') return 'bg-red-100 text-red-800'

  return 'bg-gray-100 text-gray-800'
})

// Add a ref for tracking the display state of buttons to ensure they update correctly
const buttonStates = ref({
  showSubmit: false,
  showApprove: false,
  showReject: false,
  showSubmitAgain: false
})

// Update the function that recalculates button states
const updateButtonStates = () => {
  if (!report.value) {
    buttonStates.value = {
      showSubmit: false,
      showApprove: false,
      showReject: false,
      showSubmitAgain: false
    }
    return
  }

  const isReportingUser = Auth().isReportingUser()

  // Calculate button visibility based on status
  buttonStates.value = {
    // Allow both creator and reporting_user to submit draft reports
    showSubmit: report.value.status === 'draft' && (isReportCreator.value || isReportingUser),
    showApprove: canApproveReject.value,
    showReject: canApproveReject.value,
    // Allow both creator and reporting_user to resubmit rejected reports
    showSubmitAgain:
      report.value.status === 'rejected' && (isReportCreator.value || isReportingUser)
  }

  console.log('Button states updated:', buttonStates.value)
  console.log('Is reporting user?', isReportingUser)
}

// Add a watcher to update button states whenever report status changes
watch(
  () => report.value?.status,
  () => {
    console.log('Status changed, updating button states')
    updateButtonStates()
  },
  { immediate: true }
)

// Fix the function calls that use navigator for clipboard
const copyToClipboard = (text: string) => {
  if (window.navigator && window.navigator.clipboard) {
    window.navigator.clipboard
      .writeText(text)
      .then(() => {
        Toast.success('Copied to clipboard')
      })
      .catch((err) => {
        console.error('Failed to copy text: ', err)
        Toast.error('Failed to copy to clipboard')
      })
  } else {
    // Fallback for browsers that don't support clipboard API
    const textarea = document.createElement('textarea')
    textarea.value = text
    textarea.style.position = 'fixed'
    document.body.appendChild(textarea)
    textarea.focus()
    textarea.select()
    try {
      document.execCommand('copy')
      Toast.success('Copied to clipboard')
    } catch (err) {
      console.error('Failed to copy text: ', err)
      Toast.error('Failed to copy to clipboard')
    }
    document.body.removeChild(textarea)
  }
}
</script>

<template>
  <DefaultLayout>
    <div class="container mx-auto px-4 py-6">
      <div class="flex justify-between mb-6">
        <Button @onClick="goBack" :type="'button'" label="Back to Reports" class="bg-gray-500" />
        <div class="space-x-2" v-if="report && !isLoading">
          <Button
            v-if="canEditReport"
            @onClick="editReport"
            :type="'button'"
            label="Edit Report"
            class="bg-green-500"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke-width="1.5"
              stroke="currentColor"
              class="w-4 h-4 mr-1"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21h-10.5A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10"
              />
            </svg>
          </Button>

          <Button
            v-if="canDeleteReport"
            @onClick="deleteReport"
            :type="'button'"
            label="Delete Report"
            class="bg-red-500"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke-width="1.5"
              stroke="currentColor"
              class="w-4 h-4 mr-1"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"
              />
            </svg>
          </Button>

          <Button
            v-if="buttonStates.showSubmit"
            @onClick="() => updateStatus('submitted')"
            :type="'button'"
            label="Submit Report"
            class="bg-blue-500"
            :data-status="report.status"
          />
          <Button
            v-if="buttonStates.showApprove"
            @onClick="() => updateStatus('approved')"
            :type="'button'"
            label="Approve Report"
            class="bg-green-500"
            :data-status="report.status"
          />
          <Button
            v-if="buttonStates.showReject"
            @onClick="() => updateStatus('rejected')"
            :type="'button'"
            label="Reject Report"
            class="bg-red-500"
            :data-status="report.status"
          />
          <Button
            v-if="buttonStates.showSubmitAgain"
            @onClick="() => updateStatus('submitted')"
            :type="'button'"
            label="Submit Again"
            class="bg-blue-500"
            :data-status="report.status"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke-width="1.5"
              stroke="currentColor"
              class="w-4 h-4 mr-1"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M12 9v6m3-3H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </Button>
        </div>
      </div>

      <div v-if="isLoading" class="flex justify-center items-center py-16">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>

      <div v-else-if="!report || !canViewReport" class="text-center py-16">
        <p class="text-xl text-gray-500">
          {{
            !report
              ? 'Report not found or failed to load'
              : "You don't have permission to view this report"
          }}
        </p>
        <Button
          @onClick="goBack"
          :type="'button'"
          label="Back to Reports"
          class="mt-4 bg-blue-500"
        />
      </div>

      <div v-else class="bg-white shadow-md rounded-lg overflow-hidden">
        <!-- Report Header -->
        <div class="bg-gray-50 px-6 py-4 border-b">
          <h1 class="text-2xl font-bold text-gray-800">{{ report.template_name }}</h1>
          <div class="flex items-center justify-between mt-2">
            <span class="px-3 py-1 text-sm rounded-full" :class="statusBadgeClass">
              {{ startCase(report.status) }}
            </span>

            <!-- Overall Score -->
            <!-- <div
              v-if="report.content?.reports && report.content.reports.length > 0"
              class="flex items-center"
            >
              <span class="mr-2 font-medium">Overall Score:</span>
              <span
                class="px-3 py-1 text-sm font-bold rounded-full"
                :class="getScoreColorClass(overallScore.percentage)"
              >
                {{ Math.round(overallScore.percentage) }}%
              </span>
            </div> -->

            <div class="mt-2">
              <Button
                @onClick="() => (showOriginalForm = !showOriginalForm)"
                :type="'button'"
                :label="showOriginalForm ? 'Hide Original Form' : 'View Original Form'"
                class="bg-blue-500"
                :disabled="!hasOriginalFormData"
                :class="{ 'opacity-50 cursor-not-allowed': !hasOriginalFormData }"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke-width="1.5"
                  stroke="currentColor"
                  class="w-4 h-4 mr-1"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z"
                  />
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
                  />
                </svg>
              </Button>
              <span v-if="!hasOriginalFormData" class="text-xs text-gray-500 ml-2">
                Original form data not available
              </span>
              <!-- Debug button for developers -->
              <button
                v-if="isAdmin"
                @click="() => console.log('Report data:', report)"
                class="ml-2 px-2 py-1 text-xs bg-gray-200 hover:bg-gray-300 rounded"
              >
                Debug
              </button>
            </div>
          </div>
        </div>

        <!-- Report Details -->
        <div class="px-6 py-4">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div class="border rounded-md p-4 bg-gray-50">
              <h2 class="text-lg font-semibold mb-3">Report Information</h2>

              <!-- Overall Performance Card -->
              <div
                v-if="report.content?.reports && report.content.reports.length > 0"
                class="mb-6 p-4 border rounded-md shadow-sm"
                :style="{
                  backgroundColor: checkFatalError()
                    ? '#dc2626'
                    : useColorsScore().getRangeBasedPerformance(overallScore.percentage).color,
                  color: checkFatalError()
                    ? '#ffffff'
                    : useColorsScore().isLightColor(
                          useColorsScore().getRangeBasedPerformance(overallScore.percentage).color
                        )
                      ? '#1f2937'
                      : '#ffffff'
                }"
              >
                <h3 class="font-bold text-lg mb-3">Overall Performance</h3>
                <div class="flex justify-between items-center">
                  <div class="flex items-center">
                    <div class="text-4xl font-bold">
                      {{ checkFatalError() ? '0%' : Math.round(overallScore.percentage) + '%' }}
                    </div>
                    <div v-if="checkFatalError()" class="ml-2 text-sm">⚠️ FATAL ERROR DETECTED</div>
                    <div v-else class="ml-2 text-sm">
                      ({{ overallScore.totalAchieved }} / {{ overallScore.totalApplicable }})
                    </div>
                  </div>
                  <div class="text-right">
                    <div class="text-sm font-medium">
                      {{
                        checkFatalError()
                          ? 'FATAL ERROR'
                          : getPieChartRatingText(overallScore.percentage)
                      }}
                    </div>
                  </div>
                </div>
              </div>

              <!-- Non-Fatal Error Sections Performance -->
              <div
                v-if="hasFatalErrorSections()"
                class="mb-4 p-4 border rounded-md shadow-sm"
                :style="{
                  backgroundColor: useColorsScore().getRangeBasedPerformance(
                    nonFatalErrorTotals.performance_percentage
                  ).color,
                  color: useColorsScore().isLightColor(
                    useColorsScore().getRangeBasedPerformance(
                      nonFatalErrorTotals.performance_percentage
                    ).color
                  )
                    ? '#1f2937'
                    : '#ffffff'
                }"
              >
                <h3 class="font-bold text-lg mb-3 flex items-center">
                  📊 Other Sections Performance
                </h3>
                <div class="flex justify-between items-center">
                  <div class="flex items-center">
                    <div class="text-3xl font-bold">
                      {{ nonFatalErrorTotals.performance_percentage }}%
                    </div>
                    <div class="ml-2 text-sm">
                      ({{ nonFatalErrorTotals.total_achieved_score }} /
                      {{ nonFatalErrorTotals.total_applicable_score }})
                    </div>
                  </div>
                  <div class="text-right">
                    <div class="text-sm font-medium">
                      {{ getPieChartRatingText(nonFatalErrorTotals.performance_percentage) }}
                    </div>
                  </div>
                </div>
              </div>

              <!-- Fatal Error Sections Performance -->
              <div
                v-if="hasFatalErrorSections()"
                class="mb-4 p-4 border rounded-md shadow-sm"
                :style="{
                  backgroundColor:
                    fatalErrorTotals.performance_percentage > 0
                      ? useColorsScore().getRangeBasedPerformance(
                          fatalErrorTotals.performance_percentage
                        ).color
                      : '#7f1d1d',
                  color: '#ffffff'
                }"
              >
                <h3 class="font-bold text-lg mb-3 flex items-center">
                  ⚠️ Fatal Error Sections Performance
                </h3>
                <div class="flex justify-between items-center">
                  <div class="flex items-center">
                    <div class="text-3xl font-bold">
                      {{ fatalErrorTotals.performance_percentage }}%
                    </div>
                    <div class="ml-2 text-sm">
                      <span v-if="fatalErrorTotals.total_applicable_score > 0">
                        ({{ fatalErrorTotals.total_achieved_score }} /
                        {{ fatalErrorTotals.total_applicable_score }})
                      </span>
                      <span v-else> All sections with "YES" responses </span>
                    </div>
                  </div>
                  <div class="text-right">
                    <div class="text-sm font-medium">
                      {{
                        fatalErrorTotals.performance_percentage > 0
                          ? getPieChartRatingText(fatalErrorTotals.performance_percentage)
                          : 'FATAL ERROR'
                      }}
                    </div>
                  </div>
                </div>
              </div>

              <div class="grid grid-cols-1 md:grid-cols-2 gap-4 p-1">
                <!-- Left column -->
                <div>
                  <div class="mb-3">
                    <span class="font-medium text-gray-600">Primary Field: </span>
                    <span class="text-gray-800"
                      >{{ report.primary_field_name || '-' }}:
                      {{ report.primary_field_value || '-' }}</span
                    >
                  </div>

                  <div class="mb-3" v-if="report.content?.primaryField">
                    <span class="font-medium text-gray-600"
                      >{{ startCase(String(report.content.primaryField.name)) || 'Primary Field' }}:
                    </span>
                    <span class="text-gray-800">{{
                      report.content.primaryField.value || '-'
                    }}</span>
                  </div>

                  <div class="mb-3" v-if="report.template_name">
                    <span class="font-medium text-gray-600">Template: </span>
                    <span class="text-gray-800">{{ report.template_name }}</span>
                  </div>

                  <div class="mb-3">
                    <span class="font-medium text-gray-600">Status: </span>
                    <span
                      class="px-2 py-1 text-xs rounded-full capitalize"
                      :class="statusBadgeClass"
                    >
                      {{ report.status || '-' }}
                    </span>
                  </div>
                </div>

                <!-- Right column -->
                <div>
                  <div class="mb-3">
                    <span class="font-medium text-gray-600">Created At: </span>
                    <span class="text-gray-800">{{ formatDate(report.created_at) }}</span>
                  </div>

                  <div class="mb-3">
                    <span class="font-medium text-gray-600">Created By: </span>
                    <span class="text-gray-800">{{ report.creator?.name || 'Unknown' }}</span>
                  </div>

                  <div class="mb-3" v-if="report.updated_at">
                    <span class="font-medium text-gray-600">Last Updated: </span>
                    <span class="text-gray-800">{{ formatDate(report.updated_at) }}</span>
                  </div>

                  <div class="mb-3" v-if="report.updater?.name">
                    <span class="font-medium text-gray-600">Updated By: </span>
                    <span class="text-gray-800">{{ report.updater?.name || 'Unknown' }}</span>
                  </div>
                </div>
              </div>
            </div>

            <div
              class="border rounded-md p-4 bg-gray-50 mt-4"
              v-if="report.content?.selectedFieldValues"
            >
              <h2 class="text-lg font-semibold mb-3">Field Values</h2>
              <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                <div
                  v-for="(value, key) in report.content.selectedFieldValues"
                  :key="key"
                  class="px-3 py-2 bg-white rounded border border-gray-100 shadow-sm"
                >
                  <div class="font-medium text-gray-600 text-sm">{{ startCase(String(key)) }}</div>
                  <div class="text-gray-800">
                    {{
                      typeof value === 'object'
                        ? value.name || value.value || JSON.stringify(value)
                        : value
                    }}
                  </div>
                </div>
              </div>
            </div>

            <!-- Display All Raw Report Content for Debugging -->
            <!-- <div class="border rounded-md p-4 bg-gray-50 mt-4" v-if="report.content">
              <h2 class="text-lg font-semibold mb-3 flex items-center">
                <span>Raw Report Data</span>
                <button
                  @click="document.querySelector('.content-data').classList.toggle('hidden')"
                  class="ml-2 px-2 py-1 text-xs bg-gray-200 hover:bg-gray-300 rounded"
                >
                  Toggle
                </button>
              </h2>
              <div class="content-data hidden overflow-auto max-h-96">
                <pre class="text-xs">{{ JSON.stringify(report.content, null, 2) }}</pre>
              </div>
            </div> -->
          </div>

          <!-- Report Sections -->
          <div class="mt-6" v-if="report.content?.reports && report.content.reports.length > 0">
            <h2 class="text-lg font-semibold mb-3">Report Sections</h2>

            <div class="overflow-x-auto">
              <table class="min-w-full border divide-y divide-gray-200 rounded-lg shadow-sm">
                <thead class="bg-gray-50">
                  <tr>
                    <th
                      class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Section
                    </th>
                    <th
                      class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Weightage
                    </th>
                    <th
                      class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Total Score
                    </th>
                    <th
                      class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Achieved Score
                    </th>
                    <th
                      class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Percentage
                    </th>
                    <th
                      class="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Details
                    </th>
                  </tr>
                </thead>
                <tbody class="bg-white divide-y divide-gray-200">
                  <template v-for="(section, index) in report.content.reports" :key="index">
                    <!-- Section Row -->
                    <tr class="hover:bg-gray-50">
                      <td class="px-4 py-3 whitespace-nowrap font-medium">{{ section.heading }}</td>
                      <td class="px-4 py-3 whitespace-nowrap">{{ section.weightage }}</td>
                      <td class="px-4 py-3 whitespace-nowrap">
                        {{ section.total_applicable_score }}
                      </td>
                      <td class="px-4 py-3 whitespace-nowrap">
                        {{ section.total_achieved_score }}
                      </td>
                      <td class="px-4 py-3 whitespace-nowrap">
                        <span
                          class="px-2 py-1 text-xs rounded-full font-medium text-white"
                          :style="{
                            backgroundColor: useColorsScore().getRangeBasedPerformance(
                              parseFloat(section.achieved)
                            ).color,
                            color: useColorsScore().isLightColor(
                              useColorsScore().getRangeBasedPerformance(
                                parseFloat(section.achieved)
                              ).color
                                ? '#1f2937'
                                : '#ffffff'
                            )
                          }"
                        >
                          {{
                            useColorsScore().getRangeBasedPerformance(parseFloat(section.achieved))
                              .rating
                          }}
                          - {{ section.achieved }}
                        </span>
                      </td>
                      <td class="px-4 py-3 text-center">
                        <button
                          @click="toggleSection(index)"
                          class="px-2 py-1 text-xs bg-gray-200 hover:bg-gray-300 rounded"
                        >
                          {{ isSectionVisible(index) ? 'Hide' : 'Show' }} Details
                        </button>
                      </td>
                    </tr>

                    <!-- Expanded Detail Row -->
                    <tr :class="{ hidden: !isSectionVisible(index) }">
                      <td colspan="6" class="px-4 py-4 bg-gray-50">
                        <div class="border-t border-gray-200 pt-3">
                          <h4 class="font-medium mb-2">
                            {{ section.data?.length || 0 }} Questions
                          </h4>

                          <!-- Questions Table -->
                          <table class="min-w-full border divide-y divide-gray-200 rounded text-sm">
                            <thead class="bg-gray-100">
                              <tr>
                                <th class="px-3 py-2 text-left text-xs font-medium text-gray-500">
                                  Question
                                </th>
                                <th class="px-3 py-2 text-left text-xs font-medium text-gray-500">
                                  Response
                                </th>
                                <th class="px-3 py-2 text-center text-xs font-medium text-gray-500">
                                  Total
                                </th>
                                <th class="px-3 py-2 text-center text-xs font-medium text-gray-500">
                                  Applicable
                                </th>
                                <th class="px-3 py-2 text-center text-xs font-medium text-gray-500">
                                  Achieved
                                </th>
                                <th class="px-3 py-2 text-left text-xs font-medium text-gray-500">
                                  Comments
                                </th>
                              </tr>
                            </thead>
                            <tbody class="bg-white divide-y divide-gray-200">
                              <tr
                                v-for="(question, qIndex) in section.data || []"
                                :key="qIndex"
                                class="hover:bg-gray-50"
                              >
                                <td class="px-3 py-2">
                                  <div>{{ question.question }}</div>
                                  <div
                                    v-if="question.sub_question"
                                    class="text-xs text-gray-500 mt-1"
                                  >
                                    {{ question.sub_question }}
                                  </div>
                                </td>
                                <td class="px-3 py-2">
                                  <span
                                    class="px-2 py-1 text-xs rounded font-medium"
                                    :class="{
                                      'bg-green-100 text-green-800': question.response === 'Yes',
                                      'bg-red-100 text-red-800': question.response === 'No',
                                      'bg-gray-100 text-gray-800': !['Yes', 'No'].includes(
                                        question.response || ''
                                      )
                                    }"
                                  >
                                    {{ question.response || 'N/A' }}
                                  </span>
                                </td>
                                <td class="px-3 py-2 text-center">{{ question.total_score }}</td>
                                <td class="px-3 py-2 text-center">
                                  {{ question.applicable_score }}
                                </td>
                                <td class="px-3 py-2 text-center">
                                  <span
                                    :class="{
                                      'text-green-600 font-medium':
                                        question.achieved_score === question.applicable_score,
                                      'text-red-600 font-medium':
                                        question.achieved_score < question.applicable_score,
                                      'text-gray-600':
                                        question.achieved_score === 0 ||
                                        question.achieved_score === undefined
                                    }"
                                  >
                                    {{
                                      question.achieved_score !== undefined
                                        ? question.achieved_score
                                        : 'N/A'
                                    }}
                                  </span>
                                </td>
                                <td class="px-3 py-2 text-sm text-gray-600">
                                  {{ question.comments || '-' }}
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </td>
                    </tr>
                  </template>
                </tbody>
              </table>
            </div>
          </div>

          <!-- No Report Data -->
          <div class="mt-6 text-center py-8" v-else>
            <p class="text-gray-500">No report section data available</p>
          </div>

          <!-- Original Form View -->
          <div v-if="showOriginalForm && report" class="mt-8 border-t-2 border-gray-200 pt-6">
            <h2 class="text-xl font-bold mb-4">Original Form View</h2>

            <div v-if="hasOriginalFormData" class="bg-white shadow-md rounded-lg p-6">
              <!-- Table Format Report -->
              <div class="overflow-x-auto">
                <table class="table w-full border-collapse border border-gray-300">
                  <thead>
                    <tr>
                      <th
                        colspan="8"
                        class="p-4 text-center"
                        :style="{
                          backgroundColor: reportColors.titleBg,
                          color: getTextColorForBackground(reportColors.titleBg)
                        }"
                      >
                        <h1 class="text-xl font-bold">
                          {{ Client().selected_client?.name || 'Client' }} - MYSTERY SHOPPING
                          Assessment
                          <span v-if="report.content?.primaryField?.value">
                            [{{ report.content.primaryField.value }}]
                          </span>
                        </h1>
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    <!-- Score Summary -->
                    <tr>
                      <td
                        colspan="8"
                        class="p-2 text-center font-bold"
                        :style="{
                          backgroundColor: reportColors.summaryBg,
                          color: getTextColorForBackground(reportColors.summaryBg)
                        }"
                      >
                        Score Summary
                      </td>
                    </tr>

                    <tr
                      class="text-center"
                      :style="{
                        backgroundColor: reportColors.headerBg,
                        color: getTextColorForBackground(reportColors.headerBg)
                      }"
                    >
                      <td colspan="2">KPI's</td>
                      <td>Applicable Score</td>
                      <td>Achieved Score</td>
                      <td>Performance %</td>
                      <td>Rating</td>
                    </tr>

                    <template v-for="(section, i) in report.content?.reports || []" :key="i">
                      <tr>
                        <td
                          colspan="2"
                          class="border p-2"
                          :style="{
                            backgroundColor: reportColors.kpiBg,
                            color: getTextColorForBackground(reportColors.kpiBg)
                          }"
                        >
                          {{ section.heading }}
                        </td>
                        <td class="border p-2 text-center">{{ section.total_applicable_score }}</td>
                        <td class="border p-2 text-center">{{ section.total_achieved_score }}</td>
                        <td class="border p-2 text-center">{{ section.achieved }}</td>
                        <td
                          class="border p-2 text-center text-white font-bold"
                          :style="{
                            backgroundColor: useColorsScore().getRangeBasedPerformance(
                              parseFloat(section.achieved)
                            ).color,
                            color: useColorsScore().isLightColor(
                              useColorsScore().getRangeBasedPerformance(
                                parseFloat(section.achieved)
                              ).color
                                ? '#1f2937'
                                : '#ffffff'
                            )
                          }"
                        >
                          {{
                            useColorsScore().getRangeBasedPerformance(parseFloat(section.achieved))
                              .rating
                          }}
                        </td>
                      </tr>
                    </template>

                    <!-- Overall Performance -->
                    <tr
                      class="text-center font-bold"
                      :style="{
                        backgroundColor: checkFatalError() ? '#dc2626' : reportColors.headerBg,
                        color: checkFatalError()
                          ? '#ffffff'
                          : getTextColorForBackground(reportColors.headerBg)
                      }"
                    >
                      <td colspan="2">
                        Overall Performance
                        <span v-if="checkFatalError()" class="text-sm ml-2">⚠️ FATAL ERROR</span>
                      </td>
                      <td>{{ checkFatalError() ? 0 : overallScore.totalApplicable }}</td>
                      <td>{{ checkFatalError() ? 0 : overallScore.totalAchieved }}</td>
                      <td>{{ checkFatalError() ? 0 : Math.round(overallScore.percentage) }}%</td>
                      <td
                        :style="{
                          backgroundColor: checkFatalError()
                            ? '#7f1d1d'
                            : useColorsScore().getRangeBasedPerformance(overallScore.percentage)
                                .color,
                          color: checkFatalError()
                            ? '#ffffff'
                            : useColorsScore().isLightColor(
                                useColorsScore().getRangeBasedPerformance(overallScore.percentage)
                                  .color
                              )
                        }"
                      >
                        {{
                          checkFatalError()
                            ? 'FATAL ERROR'
                            : useColorsScore().getRangeBasedPerformance(overallScore.percentage)
                                .rating
                        }}
                      </td>
                    </tr>

                    <!-- Non-Fatal Error Sections Performance (if fatal error sections exist) -->
                    <tr
                      v-if="hasFatalErrorSections()"
                      class="text-center font-bold"
                      :style="{
                        backgroundColor: reportColors.headerBg,
                        color: getTextColorForBackground(reportColors.headerBg)
                      }"
                    >
                      <td colspan="2">📊 Other Sections Performance</td>
                      <td>{{ nonFatalErrorTotals.total_applicable_score }}</td>
                      <td>{{ nonFatalErrorTotals.total_achieved_score }}</td>
                      <td>{{ nonFatalErrorTotals.performance_percentage }}%</td>
                      <td
                        :style="{
                          backgroundColor: useColorsScore().getRangeBasedPerformance(
                            nonFatalErrorTotals.performance_percentage
                          ).color,
                          color: useColorsScore().isLightColor(
                            useColorsScore().getRangeBasedPerformance(
                              nonFatalErrorTotals.performance_percentage
                            ).color
                          )
                        }"
                      >
                        {{
                          useColorsScore().getRangeBasedPerformance(
                            nonFatalErrorTotals.performance_percentage
                          ).rating
                        }}
                      </td>
                    </tr>

                    <!-- Fatal Error Sections Performance (if fatal error sections exist) -->
                    <tr
                      v-if="hasFatalErrorSections()"
                      class="text-center font-bold"
                      :style="{
                        backgroundColor: '#dc2626',
                        color: '#ffffff'
                      }"
                    >
                      <td colspan="2">⚠️ Fatal Error Sections Performance</td>
                      <td>{{ fatalErrorTotals.total_applicable_score }}</td>
                      <td>{{ fatalErrorTotals.total_achieved_score }}</td>
                      <td>{{ fatalErrorTotals.performance_percentage }}%</td>
                      <td
                        :style="{
                          backgroundColor:
                            fatalErrorTotals.performance_percentage > 0
                              ? useColorsScore().getRangeBasedPerformance(
                                  fatalErrorTotals.performance_percentage
                                ).color
                              : '#7f1d1d',
                          color:
                            fatalErrorTotals.performance_percentage > 0
                              ? useColorsScore().isLightColor(
                                  useColorsScore().getRangeBasedPerformance(
                                    fatalErrorTotals.performance_percentage
                                  ).color
                                )
                              : '#ffffff'
                        }"
                      >
                        {{
                          fatalErrorTotals.performance_percentage > 0
                            ? useColorsScore().getRangeBasedPerformance(
                                fatalErrorTotals.performance_percentage
                              ).rating
                            : 'FATAL ERROR'
                        }}
                      </td>
                    </tr>

                    <tr>
                      <td class="py-4 text-center text-black font-bold italic" colspan="8">
                        Scoring Methadology: Depending upon critically and nature of the
                        non-compliance. Scoring will be: Yes / No
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <!-- Sections with Questions -->
              <div class="mt-8">
                <template v-for="(section, i) in report.content?.reports || []" :key="i">
                  <div class="mb-8 border border-gray-300">
                    <div
                      class="p-3 border-b-4 border-black flex justify-between"
                      :style="{
                        backgroundColor: reportColors.kpiBg,
                        color: getTextColorForBackground(reportColors.kpiBg)
                      }"
                    >
                      <h3 class="font-bold">{{ section.heading }}</h3>
                      <div class="text-right">
                        <span class="font-italic mr-4"
                          >Weightage: {{ section.weightage || '0%' }}</span
                        >
                        <span class="font-italic">Achieved: {{ section.achieved }}</span>
                      </div>
                    </div>

                    <table class="w-full border-collapse">
                      <thead>
                        <tr
                          class="text-center"
                          :style="{
                            backgroundColor: reportColors.headerBg,
                            color: getTextColorForBackground(reportColors.headerBg)
                          }"
                        >
                          <th class="p-2 border">Question</th>
                          <th class="p-2 border">No.</th>
                          <th class="p-2 border">Sub-Question</th>
                          <th class="p-2 border">Response</th>
                          <th class="p-2 border">Total Score</th>
                          <th class="p-2 border">Applicable Score</th>
                          <th class="p-2 border">Achieved Score</th>
                          <th class="p-2 border">Comments</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr v-for="(question, j) in section.data || []" :key="j" class="border-b">
                          <td class="p-2 border">{{ question.question }}</td>
                          <td class="p-2 border text-center">{{ j + 1 }}</td>
                          <td class="p-2 border">{{ question.sub_question || '' }}</td>
                          <td class="p-2 border text-center">
                            <span
                              class="px-2 py-1 rounded-full text-sm"
                              :class="{
                                'bg-green-100 text-green-800': question.response === 'Yes',
                                'bg-red-100 text-red-800': question.response === 'No',
                                'bg-gray-100 text-gray-800': !['Yes', 'No'].includes(
                                  question.response || ''
                                )
                              }"
                            >
                              {{ question.response || 'N/A' }}
                            </span>
                          </td>
                          <td class="p-2 border text-center">{{ question.total_score }}</td>
                          <td class="p-2 border text-center">{{ question.applicable_score }}</td>
                          <td class="p-2 border text-center">{{ question.achieved_score }}</td>
                          <td class="p-2 border">{{ question.comments || '' }}</td>
                        </tr>

                        <!-- Section Total -->
                        <tr
                          :style="{
                            backgroundColor: reportColors.headerBg,
                            color: getTextColorForBackground(reportColors.headerBg)
                          }"
                        >
                          <td class="p-2 border font-bold">Section Total</td>
                          <td class="p-2 border"></td>
                          <td class="p-2 border"></td>
                          <td class="p-2 border"></td>
                          <td class="p-2 border text-center font-bold">
                            {{ section.total_score }}
                          </td>
                          <td class="p-2 border text-center font-bold">
                            {{ section.total_applicable_score }}
                          </td>
                          <td class="p-2 border text-center font-bold">
                            {{ section.total_achieved_score }}
                          </td>
                          <td class="p-2 border"></td>
                        </tr>

                        <!-- Section Comments -->
                        <tr>
                          <td
                            class="p-2 border font-bold"
                            :style="{
                              backgroundColor: reportColors.headerBg,
                              color: getTextColorForBackground(reportColors.headerBg)
                            }"
                          >
                            Comments
                          </td>
                          <td class="p-2 border" colspan="7"></td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </template>
              </div>

              <!-- Template Header -->
              <div class="mb-6 pb-4 border-b hidden">
                <h3 class="text-lg font-semibold">
                  {{ report.template_name || report.content?.templateData?.name || 'Report Form' }}
                </h3>
                <p class="text-sm text-gray-500" v-if="report.content?.templateData?.description">
                  {{ report.content.templateData.description }}
                </p>
              </div>
            </div>

            <div v-else class="bg-gray-50 p-6 text-center rounded-lg">
              <div class="flex flex-col items-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke-width="1.5"
                  stroke="currentColor"
                  class="w-12 h-12 text-gray-400 mb-4"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z"
                  />
                </svg>
                <p class="text-gray-700 font-medium mb-2">
                  Original form data is not available for this report
                </p>
                <p class="text-gray-500 max-w-md">
                  This may be because the report was created with an older version of the system or
                  the template structure has changed. You can still view the report data in the
                  standard format above.
                </p>
              </div>
            </div>

            <div
              v-if="report.content?.reports && report.content.reports.length === 0"
              class="py-6 text-center"
            >
              <p class="text-gray-500">No report sections found for this report.</p>
              <p class="text-sm text-gray-400 mt-2">
                This may be due to an older report format or incomplete data.
              </p>
            </div>
          </div>

          <!-- Add Media Links Section -->
          <div
            v-if="report?.media_links || report?.timestamp_url"
            class="mb-4 bg-white p-4 rounded-lg shadow"
          >
            <h2 class="text-lg font-semibold mb-2">Media Links</h2>
            <div class="grid grid-cols-1 gap-2">
              <div v-if="report.media_links?.video_url" class="border p-2 rounded">
                <p class="text-sm font-medium">Video Link:</p>
                <div class="flex items-center">
                  <a
                    :href="report.media_links.video_url"
                    target="_blank"
                    class="text-blue-500 text-sm break-all"
                  >
                    {{ report.media_links.video_url }}
                  </a>
                  <button
                    @click="copyToClipboard(report.media_links.video_url)"
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
                v-if="report.media_links?.image_url || report.media_links?.images_urls"
                class="border p-2 rounded"
              >
                <p class="text-sm font-medium">Images Link:</p>
                <div class="flex items-center">
                  <a
                    :href="
                      report.media_links?.image_url ||
                      (report.media_links?.images_urls && report.media_links.images_urls[0])
                    "
                    target="_blank"
                    class="text-blue-500 text-sm break-all"
                  >
                    {{
                      report.media_links?.image_url ||
                      (report.media_links?.images_urls && report.media_links.images_urls[0])
                    }}
                  </a>
                  <button
                    @click="
                      copyToClipboard(
                        report.media_links?.image_url ||
                          (report.media_links?.images_urls && report.media_links.images_urls[0])
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

              <div v-if="report.media_links?.audio_url" class="border p-2 rounded">
                <p class="text-sm font-medium">Audio Link:</p>
                <div class="flex items-center">
                  <a
                    :href="report.media_links.audio_url"
                    target="_blank"
                    class="text-blue-500 text-sm break-all"
                  >
                    {{ report.media_links.audio_url }}
                  </a>
                  <button
                    @click="copyToClipboard(report.media_links.audio_url)"
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

              <!-- Timestamp URL section -->
              <div
                v-if="report.timestamp_url || report.content?.timestamp_url"
                class="border p-2 rounded"
              >
                <p class="text-sm font-medium">Timestamp URL:</p>
                <div class="flex items-center">
                  <a
                    :href="report.timestamp_url || report.content?.timestamp_url"
                    target="_blank"
                    class="text-blue-500 text-sm break-all"
                  >
                    {{ report.timestamp_url || report.content?.timestamp_url }}
                  </a>
                  <button
                    @click="copyToClipboard(report.timestamp_url || report.content?.timestamp_url)"
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
                  <a
                    :href="`/client/report/${report.id}/timestamps`"
                    class="ml-2 p-1 rounded bg-blue-100 hover:bg-blue-200 text-xs"
                    title="View timestamps"
                  >
                    View Timestamps
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </DefaultLayout>
</template>
