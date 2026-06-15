<script setup lang="ts" name="UserReportViewPage">
import { onMounted, ref, computed } from 'vue'
import DefaultLayout from '@/layouts/DefaultLayout.vue'
import { Reports } from '@/stores/reports'
import { useRoute, useRouter } from 'vue-router'
import { startCase } from 'lodash'
import { Toast } from '@/utils/toast'
import Button from '@/components/Buttons/Button.vue'
import { Client } from '@/stores/client'
import { Ranges } from '@/stores/ranges'
import FileSaver from 'file-saver'
import Loader from '@/components/ui/Loader.vue'
import { ExcelExport } from '@/stores/reports/excelExport'

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

// Helper function to get range-based colors and text for performance using Ranges store
const getRangeBasedPerformance = (score: number) => {
  const rangesStore = Ranges()
  let rating = 'Unknown'
  let color = '#9ca3af' // Default gray

  // Get client ranges if available
  if (rangesStore.ranges_data && rangesStore.ranges_data.length > 0) {
    // Sort ranges by start value (highest to lowest) to find the correct range
    const sortedRanges = [...rangesStore.ranges_data].sort((a, b) => b.start - a.start)

    // Find the first range that matches the score
    const matchingRange = sortedRanges.find((range) => {
      return score >= range.start && score <= range.end
    })

    if (matchingRange) {
      rating = matchingRange.rating
      color = matchingRange.color
    } else {
      // Fallback if no range matches
      rating = getSystemGeneratedRating(score)
      color = getSystemGeneratedColor(score)
    }
  } else {
    // System-generated fallback if no ranges available
    rating = getSystemGeneratedRating(score)
    color = getSystemGeneratedColor(score)
  }

  return { rating, color }
}

// System-generated fallback functions
const getSystemGeneratedRating = (score: number): string => {
  if (score >= 90) return 'Excellent'
  if (score >= 80) return 'Very Good'
  if (score >= 70) return 'Good'
  if (score >= 60) return 'Average'
  if (score >= 40) return 'Below Average'
  return 'Poor'
}

const getSystemGeneratedColor = (score: number): string => {
  if (score >= 90) return '#22c55e' // Green
  if (score >= 80) return '#10b981' // Emerald
  if (score >= 70) return '#84cc16' // Lime
  if (score >= 60) return '#eab308' // Yellow
  if (score >= 40) return '#f97316' // Orange
  return '#ef4444' // Red
}

// Range-based rating functions that replace the old hardcoded ones
const getRangeBasedRatingText = (percentage: number): string => {
  const { rating } = getRangeBasedPerformance(percentage)
  return rating
}

const getRangeBasedRatingColor = (percentage: number): string => {
  const { color } = getRangeBasedPerformance(percentage)
  return color
}

const route = useRoute()
const router = useRouter()
const report = ref<any>(null)
const isLoading = ref(true)

// Get the report ID and table from the route
const reportId = computed(() => {
  const id = route.params.id
  return id
})
const tableParam = computed(() => {
  const table = route.query.table
  return table
})

// Add new refs and computed properties for branch comparison
const isBranchDataLoading = ref(false)

// Function to load the report
const loadReport = async () => {
  isLoading.value = true
  try {
    if (!reportId.value || reportId.value === 'undefined' || reportId.value === 'null') {
      Toast.error('Report ID is missing or invalid')
      return
    }

    // Get the current client
    Client().init()
    const client = Client().selected_client as ClientType

    if (!client || !client.uuid) {
      console.error('No client selected or client missing UUID')
      Toast.error('No client is selected')
      return
    }

    // Format client name to match how tables are created in the database
    // This should match the same formatting used in the backend
    const formattedClientName = client.name
      ?.replace(/\s+/g, '_')
      .replace(/[^a-zA-Z0-9_]/g, '')
      .toLowerCase()

    // Make sure we have either a valid table param or a client_id
    // If table is provided in URL, use it, otherwise use client name table
    let tableParamToUse = tableParam.value

    if (!tableParamToUse || tableParamToUse === 'reports') {
      // If no specific table provided, we'll use the client_id approach
      // This will let the backend derive the table name from the client_id
      tableParamToUse = null
    } else {
      // add _reports to the table param
    }

    const reportData = await Reports().getReportById(reportId.value, tableParamToUse as any)

    if (reportData) {
      report.value = reportData
    } else {
      console.error(
        `Failed to load report. Check if report exists in table: ${formattedClientName}_reports`
      )
      Toast.error(`Failed to load report #${reportId.value}`)
    }
  } catch (error: any) {
    console.error('Error loading report:', error)
    Toast.error(`Error loading report: ${error.message || 'Unknown error'}`)
  } finally {
    isLoading.value = false
  }
}

// Navigate back to the reports list
const goBack = () => {
  router.push('/client/user-reports')
}

const exportSingleReport = async () => {
  try {
    const buffer = await ExcelExport().generateExcelBufferFromReport(report.value)

    // 1. Initialize a fallback name
    let fileNameString = 'Mystery_Shopping_Report'
    const content = report.value?.content

    // 2. Check the exact same paths your console log logic uses
    if (content?.primaryField?.value) {
      fileNameString = content.primaryField.value
    } else if (report.value?.primary_field?.value) {
      fileNameString = report.value.primary_field.value
    } else if (content?.selectedFieldValues?.name_of_branch) {
      // Fallback if it's saved under name_of_branch string directly
      fileNameString =
        content.selectedFieldValues.name_of_branch.value ||
        content.selectedFieldValues.name_of_branch
    } else if (report.value?.id) {
      fileNameString = `Report_${String(report.value.id).substring(0, 8)}`
    }

    // 3. Clean up any invalid file-system characters and append extension
    const cleanFileName = `${String(fileNameString)
      .replace(/[/\\?%*:|"<>]/g, '')
      .trim()}.xlsx`

    // Create blob and save file
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    })

    FileSaver.saveAs(blob, cleanFileName)
    Toast.success('Report exported successfully')
  } catch (err) {
    console.error('Failed to export single report:', err)
    Toast.error('Failed to export report')
  }
}

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

// Fatal Error Detection Functions
const isFatalErrorSection = (section: any): boolean => {
  const sectionName = section.heading?.toLowerCase() || section.title?.toLowerCase() || ''
  return sectionName.includes('fatal error') || sectionName.includes('fatal')
}

const checkSectionFatalError = (section: any): boolean => {
  const hasFatalErrorInName = isFatalErrorSection(section)
  if (!hasFatalErrorInName) return false

  // Check if any question in this section has a "yes" response
  return section.data?.some((question: any) => {
    const response = question.response?.toLowerCase() || ''
    return response === 'yes'
  })
}

const hasFatalError = computed(() => {
  if (!report.value?.content?.reports) return false

  // Check if there's any section with "Fatal Error" in the name
  // that has at least one question with "yes" response
  return report.value.content.reports.some((section: any) => checkSectionFatalError(section))
})

// Calculate overall score
const overallScore = computed(() => {
  console.log('report', report.value)
  if (!report.value?.content?.reports || report.value.content.reports.length === 0) {
    return { percentage: 0, totalAchieved: 0, totalApplicable: 0, hasFatalError: false }
  }

  try {
    // Check for fatal errors
    const fatalErrorDetected = hasFatalError.value

    // Calculate overall score from NON-FATAL sections only
    let totalAchieved = 0
    let totalApplicable = 0

    // Loop through all sections in the report to calculate the overall score
    report.value.content.reports.forEach((section: any) => {
      // Only include non-fatal sections in the calculation
      if (!isFatalErrorSection(section)) {
        const achieved = Number(section.total_achieved_score)
        const applicable = Number(section.total_applicable_score)

        if (!isNaN(achieved) && !isNaN(applicable)) {
          totalAchieved += achieved
          totalApplicable += applicable
        }
      }
    })

    // Calculate percentage
    let percentage = 0
    if (fatalErrorDetected) {
      // If fatal error detected, force percentage to 0
      percentage = 0
      totalAchieved = 0
    } else if (totalApplicable > 0) {
      percentage = (totalAchieved / totalApplicable) * 100
    }

    return {
      percentage: Number(percentage.toFixed(2)),
      totalAchieved,
      totalApplicable,
      hasFatalError: fatalErrorDetected
    }
  } catch (error) {
    console.error('Error calculating overall score:', error)
    return { percentage: 0, totalAchieved: 0, totalApplicable: 0, hasFatalError: false }
  }
})
// Helper to check if original form data is available
const hasOriginalFormData = computed(() => {
  if (!report.value?.content) return false

  // Only check if we have reports with questions - don't require templateData
  const hasReportData =
    !!report.value.content.reports &&
    report.value.content.reports.length > 0 &&
    report.value.content.reports.some((section: any) => section.data && section.data.length > 0)

  return hasReportData
})

onMounted(async () => {
  if (Client().selected_client?.uuid) {
    await Ranges().fetch()
  }
  await loadReport()
})
</script>

<template>
  <DefaultLayout>
    <div class="container mx-auto px-1 py-1">
      <!-- Header with action buttons -->
      <div class="flex justify-between mb-6">
        <Button @onClick="goBack" :type="'button'" label="Back to Reports" class="bg-gray-500" />
        <div class="space-x-2" v-if="report && !isLoading">
          <!-- Excel Export Button -->
          <Button
            @onClick="exportSingleReport"
            :type="'button'"
            label="Export Excel"
            class="bg-green-600"
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
                d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3"
              />
            </svg>
          </Button>
        </div>
      </div>

      <div v-if="isLoading" class="flex justify-center items-center py-16">
        <Loader size="lg" text="Loading report details..." />
      </div>

      <div v-else-if="!report" class="text-center py-16">
        <p class="text-xl text-gray-500">Report not found or failed to load</p>
        <Button
          @onClick="goBack"
          :type="'button'"
          label="Back to Reports"
          class="mt-4 bg-blue-500"
        />
      </div>

      <div v-else class="bg-white shadow-md rounded-lg overflow-hidden p-6">
        <!-- Report Header -->
        <div
          class="px-6 py-4 border-b mb-6"
          :style="{
            backgroundColor: reportColors.titleBg,
            color: getTextColorForBackground(reportColors.titleBg)
          }"
        >
          <div class="flex items-center justify-between">
            <h1 class="text-2xl font-bold">
              {{ report.template_name || 'Mystery Shopping Report' }}
            </h1>
          </div>
          <div class="flex items-center justify-between mt-2">
            <div></div>
            <!-- Overall Score -->
            <div
              v-if="report.content?.reports && report.content.reports.length > 0"
              class="flex items-center"
            >
              <span class="mr-2 font-medium">Overall Score:</span>
              <span
                v-if="hasFatalError"
                class="px-3 py-1 text-sm font-bold rounded-full bg-red-600 text-white"
              >
                ⚠️ FATAL ERROR
              </span>
              <span
                v-else
                class="px-3 py-1 text-sm font-bold rounded-full"
                :style="{
                  backgroundColor: getRangeBasedRatingColor(overallScore.percentage),
                  color: getTextColorForBackground(
                    getRangeBasedRatingColor(overallScore.percentage)
                  )
                }"
              >
                {{ Math.round(overallScore.percentage) }}%
              </span>
            </div>
          </div>
        </div>

        <!-- Original Form View -->
        <div class="mt-8 border-t-2 border-gray-200 pt-6">
          <div v-if="hasOriginalFormData" class="bg-white shadow-md rounded-lg p-6">
            <!-- Report Logo Section -->
            <div v-if="report.colors?.logo" class="mb-6 flex justify-center">
              <img
                :src="report.colors.logo"
                alt="Report Logo"
                class="max-h-32 max-w-full object-contain"
              />
            </div>

            <!-- Overall Performance Section -->
            <div v-if="report.content?.reports && report.content.reports.length > 0" class="mb-6">
              <h2 class="text-lg font-semibold mb-3">Overall Performance</h2>
              <div class="overflow-x-auto">
                <div v-if="isBranchDataLoading" class="flex justify-center py-4">
                  <Loader size="sm" text="Loading scores..." />
                </div>
                <table v-else class="w-full border-collapse border border-gray-300">
                  <thead>
                    <tr>
                      <th
                        colspan="3"
                        class="p-3 text-center"
                        :style="{
                          backgroundColor: reportColors.titleBg,
                          color: getTextColorForBackground(reportColors.titleBg)
                        }"
                      >
                        Overall Score
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td
                        class="border p-2 font-medium text-center"
                        :style="{
                          backgroundColor: reportColors.kpiBg,
                          color: getTextColorForBackground(reportColors.kpiBg)
                        }"
                      >
                        Total Applicable Score
                      </td>
                      <td
                        class="border p-2 font-medium text-center"
                        :style="{
                          backgroundColor: reportColors.kpiBg,
                          color: getTextColorForBackground(reportColors.kpiBg)
                        }"
                      >
                        Total Achieved Score
                      </td>
                      <td
                        class="border p-2 font-medium text-center"
                        :style="{
                          backgroundColor: reportColors.kpiBg,
                          color: getTextColorForBackground(reportColors.kpiBg)
                        }"
                      >
                        Percentage
                      </td>
                    </tr>
                    <tr>
                      <td class="border p-2 text-center font-medium">
                        {{ overallScore.totalApplicable }}
                      </td>
                      <td class="border p-2 text-center font-medium">
                        {{ overallScore.totalAchieved }}
                      </td>
                      <td class="border p-2 text-center">
                        <div class="flex justify-center items-center">
                          <span
                            v-if="hasFatalError"
                            class="px-3 py-1 text-sm font-bold rounded-full bg-red-600 text-white"
                          >
                            ⚠️ 0% - FATAL ERROR
                          </span>
                          <span
                            v-else
                            class="px-3 py-1 text-sm font-bold rounded-full"
                            :style="{
                              backgroundColor: getRangeBasedRatingColor(overallScore.percentage),
                              color: getTextColorForBackground(
                                getRangeBasedRatingColor(overallScore.percentage)
                              )
                            }"
                          >
                            {{ Math.round(overallScore.percentage) }}% -
                            {{ getRangeBasedRatingText(overallScore.percentage) }}
                          </span>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <!-- Report Metadata Section -->
            <div v-if="report.content?.selectedFieldValues" class="mb-6">
              <h2 class="text-lg font-semibold mb-3">Field Values</h2>
              <div class="overflow-x-auto">
                <div v-if="isBranchDataLoading" class="flex justify-center py-4">
                  <Loader size="sm" text="Loading field values..." />
                </div>
                <table v-else class="w-full border-collapse border border-gray-300">
                  <thead>
                    <tr>
                      <th
                        colspan="2"
                        class="p-3 text-center"
                        :style="{
                          backgroundColor: reportColors.titleBg,
                          color: getTextColorForBackground(reportColors.titleBg)
                        }"
                      >
                        Selected Field Values
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="(value, key) in report.content.selectedFieldValues" :key="key">
                      <td
                        class="border p-2 font-medium w-1/3"
                        :style="{
                          backgroundColor: reportColors.kpiBg,
                          color: getTextColorForBackground(reportColors.kpiBg)
                        }"
                      >
                        {{ startCase(String(key)) }}
                      </td>
                      <td class="border p-2">
                        {{
                          typeof value === 'object'
                            ? value.name || value.value || JSON.stringify(value)
                            : value
                        }}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <!-- Table Format Report -->
            <div class="overflow-x-auto">
              <div v-if="isBranchDataLoading" class="flex justify-center py-8">
                <Loader size="md" text="Loading report data..." />
              </div>
              <table v-else class="table w-full border-collapse border border-gray-300">
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
                      <div class="flex items-center justify-center">
                        <h1 class="text-xl font-bold">
                          {{ Client().selected_client?.name || 'Client' }} - MYSTERY SHOPPING
                          Assessment
                          <span v-if="report.content?.primaryField?.value">
                            [{{ report.content.primaryField.value }}]
                          </span>
                        </h1>
                        <div v-if="report.colors?.logo" class="ml-4">
                          <img
                            :src="report.colors.logo"
                            alt="Report Logo"
                            class="h-10 object-contain"
                          />
                        </div>
                      </div>
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
                      <td class="border p-2 text-center">
                        {{
                          (section.total_applicable_score === null ||
                            section.total_applicable_score === undefined ||
                            section.total_applicable_score === 0) &&
                          (section.total_achieved_score === null ||
                            section.total_achieved_score === undefined ||
                            section.total_achieved_score === 0)
                            ? 'N/A'
                            : section.total_applicable_score
                        }}
                      </td>
                      <td class="border p-2 text-center">
                        {{
                          (section.total_achieved_score === null ||
                            section.total_achieved_score === undefined ||
                            section.total_achieved_score === 0) &&
                          (section.total_applicable_score === null ||
                            section.total_applicable_score === undefined ||
                            section.total_applicable_score === 0)
                            ? 'N/A'
                            : section.total_achieved_score
                        }}
                      </td>
                      <td class="border p-2 text-center">
                        {{
                          (section.total_achieved_score === null ||
                            section.total_achieved_score === undefined ||
                            section.total_achieved_score === 0) &&
                          (section.total_applicable_score === null ||
                            section.total_applicable_score === undefined ||
                            section.total_applicable_score === 0)
                            ? 'N/A'
                            : section.achieved
                        }}
                      </td>
                      <td
                        class="border p-2 text-center text-white font-bold"
                        :style="{
                          backgroundColor: getRangeBasedRatingColor(parseFloat(section.achieved)),
                          color: getTextColorForBackground(
                            getRangeBasedRatingColor(parseFloat(section.achieved))
                          )
                        }"
                      >
                        {{
                          (section.total_achieved_score === null ||
                            section.total_achieved_score === undefined ||
                            section.total_achieved_score === 0) &&
                          (section.total_applicable_score === null ||
                            section.total_applicable_score === undefined ||
                            section.total_applicable_score === 0)
                            ? 'N/A'
                            : getRangeBasedRatingText(parseFloat(section.achieved))
                        }}
                      </td>
                    </tr>
                  </template>

                  <tr
                    class="text-center font-bold"
                    :style="{
                      backgroundColor: hasFatalError ? '#dc2626' : reportColors.headerBg,
                      color: hasFatalError
                        ? '#ffffff'
                        : getTextColorForBackground(reportColors.headerBg)
                    }"
                  >
                    <td colspan="2">
                      {{
                        hasFatalError
                          ? '⚠️ Overall Performance - FATAL ERROR'
                          : 'Overall Performance'
                      }}
                    </td>
                    <td>{{ overallScore.totalApplicable }}</td>
                    <td>{{ overallScore.totalAchieved }}</td>
                    <td>{{ hasFatalError ? '0' : Math.round(overallScore.percentage) }}%</td>
                    <td
                      :style="{
                        backgroundColor: hasFatalError
                          ? '#dc2626'
                          : getRangeBasedRatingColor(overallScore.percentage),
                        color: hasFatalError
                          ? '#ffffff'
                          : getTextColorForBackground(
                              getRangeBasedRatingColor(overallScore.percentage)
                            )
                      }"
                    >
                      {{
                        hasFatalError
                          ? 'FATAL ERROR'
                          : getRangeBasedRatingText(overallScore.percentage)
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
              <div v-if="isBranchDataLoading" class="flex justify-center py-8">
                <Loader size="md" text="Loading section details..." />
              </div>
              <template v-else v-for="(section, i) in report.content?.reports || []" :key="i">
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
                          backgroundColor: reportColors.headerBg || '#000000',
                          color: getTextColorForBackground(reportColors.headerBg || '#000000')
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
                          backgroundColor: reportColors.headerBg || '#000000',
                          color: getTextColorForBackground(reportColors.headerBg || '#000000')
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
                            backgroundColor: reportColors.headerBg || '#000000',
                            color: getTextColorForBackground(reportColors.headerBg || '#000000')
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
        </div>
      </div>
    </div>
  </DefaultLayout>
</template>
