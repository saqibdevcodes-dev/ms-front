<script setup lang="ts">
import { defineComponent, onMounted, ref, computed, watch } from 'vue'
import DefaultLayout from '@/layouts/DefaultLayout.vue'

// Define component with multi-word name
defineComponent({
  name: 'UserPerformanceAnalytics'
})
import ChartOne from '@/components/Charts/ChartOne.vue'
import BreadcrumbDefault from '@/components/Breadcrumbs/BreadcrumbDefault.vue'
import Dropdown from 'primevue/dropdown'
import Button from '@/components/Buttons/Button.vue'
import { Analytics } from '@/stores/analytics'
import { Client } from '@/stores/client'
import VueApexCharts from 'vue3-apexcharts'
import Card from 'primevue/card'
import SkeletonLoader from '@/components/Loaders/SkeletonLoader.vue'
import Table from 'primevue/datatable'
import Column from 'primevue/column'
import Badge from 'primevue/badge'
import TabView from 'primevue/tabview'
import TabPanel from 'primevue/tabpanel'

// Page state
const pageTitle = ref('Reporting User Performance')
const analytics = computed(() => Analytics())
const client = computed(() => Client())
const selectedYear = ref(new Date().getFullYear().toString())
const isLoading = ref(true)
const selectedUser = ref(null)
const singleUserView = ref(false)
const userData = ref({
  performance: {
    labels: [],
    datasets: []
  },
  userPerformance: [],
  summary: {},
  usersByStatus: [],
  timeAnalysis: {
    labels: [],
    datasets: []
  },
  dailyReports: {
    labels: [],
    datasets: []
  }
})

// Selected user data
const selectedUserData = ref({
  name: '',
  email: '',
  reportCount: 0,
  avgScore: 0,
  avgCompletionTime: 0,
  completedTasks: 0,
  pendingTasks: 0,
  status: '',
  reportsPerDay: 0,
  onTime: 0,
  draftReports: 0,
  submittedReports: 0,
  rejectedReports: 0,
  recentReports: [],
  avgCompletionTimeFormatted: ''
})

// Chart options
const lineChartOptions = computed(() => ({
  chart: {
    height: 350,
    type: 'line',
    toolbar: {
      show: false
    }
  },
  colors: ['#4F46E5'],
  stroke: {
    width: 3,
    curve: 'smooth'
  },
  xaxis: {
    categories: userData.value.performance.labels,
    axisBorder: {
      show: false
    },
    axisTicks: {
      show: false
    }
  },
  yaxis: {
    title: {
      text: 'Score (%)'
    },
    min: 0,
    max: 100
  },
  tooltip: {
    y: {
      formatter: (val) => `${val}%`
    }
  },
  grid: {
    borderColor: '#f1f5f9',
    row: {
      colors: ['#ffffff', '#f8fafc'],
      opacity: 1
    }
  },
  markers: {
    size: 4,
    colors: ['#4F46E5'],
    strokeColors: '#ffffff',
    strokeWidth: 2,
    hover: {
      size: 6
    }
  },
  legend: {
    position: 'top',
    horizontalAlign: 'right'
  }
}))

const userStatusOptions = computed(() => ({
  chart: {
    type: 'donut',
    height: 300
  },
  colors: ['#10B981', '#3B82F6', '#F59E0B', '#EF4444'],
  labels: userData.value.usersByStatus.map((item) => item.status),
  series: userData.value.usersByStatus.map((item) => item.count),
  legend: {
    position: 'bottom'
  },
  dataLabels: {
    enabled: false
  },
  plotOptions: {
    pie: {
      donut: {
        size: '70%',
        labels: {
          show: true,
          name: {
            show: true
          },
          value: {
            show: true,
            formatter: (val) => `${val}`
          },
          total: {
            show: true,
            label: 'Total',
            formatter: () => userData.value.summary?.totalUsers || 0
          }
        }
      }
    }
  }
}))

const timeDistributionOptions = computed(() => ({
  chart: {
    type: 'bar',
    height: 350,
    toolbar: {
      show: false
    }
  },
  colors: ['#10B981', '#3B82F6', '#F59E0B', '#EF4444'],
  plotOptions: {
    bar: {
      columnWidth: '60%',
      distributed: true,
      borderRadius: 5,
      dataLabels: {
        position: 'top'
      }
    }
  },
  dataLabels: {
    enabled: true,
    formatter: (val) => `${val}`,
    offsetY: -20,
    style: {
      fontSize: '12px',
      colors: ['#304758']
    }
  },
  legend: {
    show: false
  },
  grid: {
    borderColor: '#f1f5f9',
    row: {
      colors: ['#ffffff', '#f8fafc'],
      opacity: 1
    }
  },
  xaxis: {
    categories: userData.value.timeAnalysis.labels,
    axisBorder: {
      show: false
    },
    axisTicks: {
      show: false
    },
    title: {
      text: 'Report Completion Time'
    }
  },
  yaxis: {
    title: {
      text: 'Number of Reports'
    }
  }
}))

const dailyReportsOptions = computed(() => ({
  chart: {
    type: 'bar',
    height: 350,
    stacked: false,
    toolbar: {
      show: false
    }
  },
  colors: ['#4F46E5', '#10B981'],
  plotOptions: {
    bar: {
      horizontal: false,
      columnWidth: '55%',
      borderRadius: 5
    }
  },
  dataLabels: {
    enabled: false
  },
  stroke: {
    show: true,
    width: 2,
    colors: ['transparent']
  },
  xaxis: {
    categories: userData.value.dailyReports.labels,
    axisBorder: {
      show: false
    },
    axisTicks: {
      show: false
    }
  },
  yaxis: [
    {
      title: {
        text: 'Reports Created'
      }
    },
    {
      opposite: true,
      title: {
        text: 'Time Spent (hours)'
      }
    }
  ],
  tooltip: {
    y: {
      formatter: (val, { seriesIndex }) => {
        return seriesIndex === 0 ? `${val} reports` : `${val} hours`
      }
    }
  },
  legend: {
    position: 'top',
    horizontalAlign: 'right'
  },
  fill: {
    opacity: 1
  }
}))

// Data loading and filtering
onMounted(async () => {
  await loadData()
})

const loadData = async () => {
  isLoading.value = true

  try {
    // Update the selectedYear in the analytics store
    analytics.value.selectedYear = selectedYear.value

    // Add a timestamp to ensure we don't get cached data
    const timestamp = new Date().getTime()
    console.log('Loading data with timestamp:', timestamp)

    // Call the API through the analytics store
    await analytics.value.fetchUserPerformanceAnalytics()

    // Use the data from the store
    userData.value = analytics.value.userPerformanceData
    console.log('userData.value', userData.value)

    // Log total reporting users to debug
    console.log('Total reporting users:', analytics.value.totalReportingUsers)
  } catch (error) {
    console.error('Error loading user performance data', error)
  } finally {
    isLoading.value = false
  }
}

// Watch for filter changes
watch([selectedYear], async () => {
  await loadData()
})

// Refresh data
const refreshData = async () => {
  isLoading.value = true

  try {
    // First clear the current data to ensure we don't see old data
    userData.value = {
      performance: { labels: [], datasets: [] },
      userPerformance: [],
      summary: {},
      usersByStatus: [],
      timeAnalysis: { labels: [], datasets: [] },
      dailyReports: { labels: [], datasets: [] }
    }

    // Reset any stored data in the analytics store
    analytics.value._setDefaultUserPerformanceData()

    // Force a new data fetch with a unique timestamp
    analytics.value.selectedYear = selectedYear.value

    // Wait a bit to ensure any pending requests are completed
    await new Promise((resolve) => setTimeout(resolve, 100))

    // Now fetch fresh data
    await analytics.value.fetchUserPerformanceAnalytics()

    // Update local data from store
    userData.value = analytics.value.userPerformanceData

    console.log('Data refreshed with timestamp:', new Date().getTime())
  } catch (error) {
    console.error('Error refreshing data:', error)
  } finally {
    isLoading.value = false
  }
}

// Select a specific user
const selectUser = async (user) => {
  try {
    isLoading.value = true
    selectedUser.value = user
    singleUserView.value = true

    // Copy user data to selectedUserData
    selectedUserData.value = {
      ...user,
      draftReports: user.draftReports || 0,
      submittedReports: user.submittedReports || 0,
      rejectedReports: user.rejectedReports || 0
    }
    console.log('selectedUserData.value', selectedUserData.value)

    // Call the API to get detailed user performance if we have a user ID
    if (user.id || user.uuid) {
      const userId = user.id || user.uuid
      const userDetails = await analytics.value.fetchUserPerformanceDetails(userId)

      if (userDetails) {
        // Merge the detailed data with our selected user data
        console.log('Received detailed user data:', userDetails)

        // Update the user's monthly performance data if available
        if (userDetails.monthlyScores && selectedUser.value) {
          selectedUser.value.monthlyScores = userDetails.monthlyScores
        }

        // Update report status counts if available
        if (userDetails.reportStatus && selectedUser.value) {
          selectedUser.value.draftReports = userDetails.reportStatus.draft || 0
          selectedUser.value.submittedReports = userDetails.reportStatus.submitted || 0
          selectedUser.value.rejectedReports = userDetails.reportStatus.rejected || 0
        }

        // Update any other detailed information
        if (userDetails.recentReports && selectedUser.value) {
          console.log('userDetails.recentReports', userDetails.recentReports)

          selectedUser.value.recentReports = userDetails.recentReports
          console.log('selectedUser.value.recentReports', selectedUser.value.recentReports)
        }

        // Log the property names we receive from userDetails
        console.log('userDetails properties:', Object.keys(userDetails))

        // Priority 1: Use today's average time from currentDayPerformance if available
        if (
          userDetails.currentDayPerformance &&
          userDetails.currentDayPerformance.avgTimeFormatted
        ) {
          selectedUser.value.avgCompletionTimeFormatted =
            userDetails.currentDayPerformance.avgTimeFormatted
          console.log(
            'Setting from currentDayPerformance.avgTimeFormatted:',
            userDetails.currentDayPerformance.avgTimeFormatted
          )
        }
        // Priority 2: Check both naming conventions for the direct property
        else if (userDetails.averageCompletionTimeFormatted) {
          selectedUser.value.avgCompletionTimeFormatted = userDetails.averageCompletionTimeFormatted
          console.log(
            'Setting from averageCompletionTimeFormatted:',
            userDetails.averageCompletionTimeFormatted
          )
        } else if (userDetails.avgCompletionTimeFormatted) {
          selectedUser.value.avgCompletionTimeFormatted = userDetails.avgCompletionTimeFormatted
          console.log(
            'Setting from avgCompletionTimeFormatted:',
            userDetails.avgCompletionTimeFormatted
          )
        }
        // Priority 3: Check summary property if direct property not available
        else if (userDetails.summary && userDetails.summary.avgCompletionTimeFormatted) {
          selectedUser.value.avgCompletionTimeFormatted =
            userDetails.summary.avgCompletionTimeFormatted
          console.log(
            'Setting from summary.avgCompletionTimeFormatted:',
            userDetails.summary.avgCompletionTimeFormatted
          )
        } else if (userDetails.summary && userDetails.summary.averageCompletionTimeFormatted) {
          selectedUser.value.avgCompletionTimeFormatted =
            userDetails.summary.averageCompletionTimeFormatted
          console.log(
            'Setting from summary.averageCompletionTimeFormatted:',
            userDetails.summary.averageCompletionTimeFormatted
          )
        }

        console.log('selectedUser after assignment:', selectedUser.value.avgCompletionTimeFormatted)
      }
    }
  } catch (error) {
    console.error('Error selecting user:', error)
  } finally {
    isLoading.value = false
  }
}

// Clear user selection
const clearUserSelection = () => {
  selectedUser.value = null
  singleUserView.value = false
}

// Custom styling for status badges
const getStatusClass = (status) => {
  switch (status) {
    case 'excellent':
      return 'bg-green-100 text-green-800'
    case 'good':
      return 'bg-blue-100 text-blue-800'
    case 'average':
      return 'bg-yellow-100 text-yellow-800'
    case 'poor':
      return 'bg-red-100 text-red-800'
    default:
      return 'bg-gray-100 text-gray-800'
  }
}

// Trend icon rendering
const getTrendIcon = (trend) => {
  switch (trend) {
    case 'up':
      return `<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-green-500" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M12 7a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414 0L8 10.414l-4.293 4.293a1 1 0 01-1.414-1.414l5-5a1 1 0 011.414 0L11 10.586 14.586 7H12z" clip-rule="evenodd" />
             </svg>`
    case 'down':
      return `<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M12 13a1 1 0 100 2h5a1 1 0 001-1v-5a1 1 0 10-2 0v2.586l-4.293-4.293a1 1 0 00-1.414 0L8 9.586l-4.293-4.293a1 1 0 00-1.414 1.414l5 5a1 1 0 001.414 0L11 9.414 14.586 13H12z" clip-rule="evenodd" />
             </svg>`
    case 'stable':
      return `<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-blue-500" viewBox="0 0 20 20" fill="currentColor">
              <path d="M8 5a1 1 0 100 2h8a1 1 0 100-2H8z" />
              <path d="M8 9a1 1 0 100 2h8a1 1 0 100-2H8z" />
              <path d="M8 13a1 1 0 100 2h8a1 1 0 100-2H8z" />
             </svg>`
    default:
      return ''
  }
}

// Format time for display
const formatTime = (minutes, formattedTime) => {
  // If the formatted time is provided, use it
  if (formattedTime) {
    return formattedTime
  }

  // Fallback to the original formatting logic
  if (!minutes || isNaN(minutes)) {
    return '0m'
  }

  if (minutes < 60) {
    return `${minutes}m`
  }

  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return `${hours}h ${mins}m`
}

// Format seconds into a readable time format (mm:ss)
const formatSeconds = (seconds) => {
  if (!seconds || isNaN(seconds)) {
    return '0m 0s'
  }

  const mins = Math.floor(seconds / 60)
  const secs = Math.round(seconds % 60)
  return `${mins}m ${secs}s`
}

// Format elapsed time
const formatElapsedTime = (seconds) => {
  if (!seconds || isNaN(seconds)) {
    return 'N/A'
  }

  // If seconds seems to be in milliseconds, convert to seconds
  if (seconds > 10000000) {
    seconds = seconds / 1000
  }

  const hours = Math.floor(seconds / 3600)
  const mins = Math.floor((seconds % 3600) / 60)
  const secs = Math.round(seconds % 60)

  if (hours > 0) {
    return `${hours}h ${mins}m ${secs}s`
  } else if (mins > 0) {
    return `${mins}m ${secs}s`
  } else {
    return `${secs}s`
  }
}

// Helper function to get elapsed seconds from report data
const getElapsedSeconds = (data) => {
  // Debug: log the first report data object to see available fields
  if (!window.hasLoggedReportData && data) {
    console.log('Report data object:', data)
    console.log('Available time fields:', {
      elapsed_seconds: data.elapsed_seconds,
      elapsed_time_seconds: data.elapsed_time_seconds,
      completion_time: data.completion_time,
      time_fields: Object.keys(data).filter(
        (key) => key.includes('time') || key.includes('elapsed')
      )
    })
    window.hasLoggedReportData = true
  }

  const seconds = data.elapsed_seconds || data.elapsed_time_seconds || data.completion_time || 0

  // If it seems like the time is in milliseconds, convert to seconds
  if (seconds > 10000000) {
    return seconds / 1000
  }

  return seconds
}
</script>

<template>
  <DefaultLayout>
    <!-- Breadcrumb and Page Title -->

    <div class="mb-6">
      <BreadcrumbDefault :pageTitle="pageTitle" />
    </div>

    <!-- Page Header -->
    <div
      class="flex flex-wrap items-center justify-between gap-4 mb-6 bg-white p-4 rounded-lg shadow-sm"
    >
      <div class="flex items-center">
        <h2 class="text-lg font-medium text-gray-800">Reporting User Performance Analytics</h2>
      </div>
    </div>

    <!-- Total Reporting Users Header -->
    <div class="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6 rounded shadow-sm">
      <div class="flex items-center">
        <div
          class="flex items-center justify-center w-10 h-10 rounded-full bg-blue-100 text-blue-700 mr-3"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
            />
          </svg>
        </div>
        <div>
          <h3 class="text-lg font-medium text-blue-800">
            Total Reporting Users:
            <span class="font-bold text-xl">{{ analytics.totalReportingUsers }}</span>
          </h3>
          <p class="text-sm text-blue-600">Active reporting users contributing to analytics data</p>
        </div>
      </div>
    </div>

    <!-- Filters Section -->
    <div class="bg-white rounded-lg shadow-sm p-4 mb-6">
      <div class="flex flex-wrap gap-4 items-center justify-between">
        <div class="flex gap-4 items-center">
          <div class="w-48">
            <label class="block text-sm font-medium text-gray-700 mb-1">Year</label>
            <Dropdown
              v-model="selectedYear"
              :options="['2020', '2021', '2022', '2023', '2024']"
              placeholder="Select Year"
              class="w-full"
            />
          </div>
        </div>
        <div>
          <Button
            label="Refresh Data"
            icon="pi pi-refresh"
            iconPos="left"
            severity="secondary"
            @click="refreshData"
          />
        </div>
      </div>
    </div>

    <!-- User Selection and Content Layout -->
    <div class="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-6">
      <!-- User List Sidebar -->
      <div class="lg:col-span-1">
        <div class="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-lg font-medium text-gray-800">Reporting Users</h3>
          </div>
          <div v-if="isLoading" class="p-4">
            <SkeletonLoader class="h-80" />
          </div>
          <div v-else class="overflow-y-auto max-h-[70vh]">
            <div class="divide-y divide-gray-200">
              <div
                v-for="user in userData.userPerformance"
                :key="user.uuid || user.id"
                @click="selectUser(user)"
                class="p-3 hover:bg-gray-50 cursor-pointer transition-colors duration-100"
                :class="{ 'bg-blue-50': selectedUser && selectedUser.uuid === user.uuid }"
              >
                <div class="flex items-center">
                  <div
                    class="w-10 h-10 flex items-center justify-center rounded-full bg-blue-100 text-blue-600 mr-3"
                  >
                    {{ user.name.charAt(0).toUpperCase() }}
                  </div>
                  <div class="flex-1 min-w-0">
                    <p class="text-sm font-medium text-gray-900 truncate">
                      {{ user.name }}
                    </p>
                    <div class="flex items-center mt-1">
                      <span
                        :class="[
                          'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium mr-2',
                          getStatusClass(user.status)
                        ]"
                      >
                        {{ user.status.charAt(0).toUpperCase() + user.status.slice(1) }}
                      </span>
                      <span class="text-xs text-gray-500">{{ user.avgScore }}%</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Main Content Area -->
      <div class="lg:col-span-3">
        <!-- Single User View -->
        <div v-if="singleUserView && selectedUser" class="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div class="flex items-center justify-between mb-4">
            <div class="flex items-center">
              <div
                class="w-12 h-12 flex items-center justify-center rounded-full bg-blue-100 text-blue-600 mr-4"
              >
                {{ selectedUser.name.charAt(0).toUpperCase() }}
              </div>
              <div>
                <h3 class="text-xl font-medium text-gray-800">{{ selectedUser.name }}</h3>
                <p class="text-sm text-gray-500">Performance Details</p>
              </div>
            </div>
            <Button
              icon="pi pi-times"
              class="p-button-rounded p-button-text"
              @click="clearUserSelection"
              aria-label="Close"
            />
          </div>

          <!-- Today's Performance -->
          <div
            v-if="selectedUser.todayReportCount"
            class="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6 rounded shadow-sm"
          >
            <div class="flex items-center">
              <div
                class="flex items-center justify-center w-10 h-10 rounded-full bg-blue-100 text-blue-700 mr-3"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  class="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <div>
                <h3 class="text-md font-medium text-blue-800">Today's Performance</h3>
                <div class="flex flex-wrap gap-4 mt-1">
                  <p class="text-sm text-blue-700">
                    <span class="font-bold">{{ selectedUser.todayReportCount }}</span> reports
                  </p>
                  <p class="text-sm text-blue-700">
                    <span class="font-bold">{{ selectedUser.todayAvgTimeFormatted }}</span> avg.
                    time
                  </p>
                </div>
              </div>
            </div>
          </div>

          <!-- User Performance Summary Cards -->
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div class="bg-gray-50 rounded-lg p-4">
              <h4 class="text-sm font-medium text-gray-500 mb-1">Reports Completed</h4>
              <p class="text-2xl font-semibold text-gray-900">{{ selectedUser.reportCount }}</p>
              <p class="text-sm text-gray-500 mt-2">
                {{ selectedUser.completedTasks }} completed /
                {{ selectedUser.pendingTasks }} pending
              </p>
            </div>

            <div class="bg-gray-50 rounded-lg p-4">
              <h4 class="text-sm font-medium text-gray-500 mb-1">Report Status</h4>
              <div class="flex flex-col gap-1 mt-2">
                <div class="flex justify-between">
                  <span class="text-sm text-gray-500">Draft:</span>
                  <span class="text-sm font-medium">{{ selectedUser.draftReports || 0 }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-sm text-gray-500">Submitted:</span>
                  <span class="text-sm font-medium">{{ selectedUser.submittedReports || 0 }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-sm text-gray-500">Rejected:</span>
                  <span class="text-sm font-medium">{{ selectedUser.rejectedReports || 0 }}</span>
                </div>
              </div>
            </div>

            <div class="bg-gray-50 rounded-lg p-4">
              <h4 class="text-sm font-medium text-gray-500 mb-1">Avg Completion Time</h4>
              <p class="text-2xl font-semibold text-gray-900">
                {{ selectedUser.avgCompletionTimeFormatted || 'Not available' }}
              </p>
              <div v-if="false" class="mt-2 hidden">
                <span class="text-xs font-medium bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                  Today: {{ selectedUser.todayAvgTimeFormatted }}
                </span>
              </div>
              <p class="text-sm text-gray-500 mt-2">{{ selectedUser.onTime }}% on time</p>
            </div>

            <div class="bg-gray-50 rounded-lg p-4">
              <h4 class="text-sm font-medium text-gray-500 mb-1">Total Reports</h4>
              <p class="text-2xl font-semibold text-gray-900">
                {{ selectedUser.reportCount }}
              </p>
              <p class="text-sm text-gray-500 mt-2">Completed reports</p>
            </div>
          </div>

          <!-- User Recent Reports -->
          <div class="mb-6">
            <h4 class="text-lg font-medium text-gray-800 mb-4">Recent Reports</h4>
            <Table
              :value="selectedUser.recentReports || []"
              :paginator="true"
              :rows="5"
              stripedRows
              class="p-datatable-sm"
            >
              <Column field="title" header="Report Title">
                <template #body="{ data }">
                  {{ data.title }}
                </template>
              </Column>
              <Column field="date" header="Date">
                <template #body="{ data }">
                  {{ new Date(data.date).toLocaleDateString() }}
                </template>
              </Column>
              <Column field="completionTime" header="Time">
                <template #body="{ data }">
                  {{
                    formatElapsedTime(
                      data.elapsed_seconds || data.elapsed_time_seconds || data.completion_time || 0
                    )
                  }}
                </template>
              </Column>
              <Column field="score" header="Score">
                <template #body="{ data }"> {{ data.score }}% </template>
              </Column>
            </Table>
          </div>

          <!-- User Reports Status -->
          <div class="mb-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
            <!-- User Performance Chart -->
            <div>
              <h4 class="text-lg font-medium text-gray-800 mb-4">Performance Trend</h4>
              <VueApexCharts
                type="line"
                height="300"
                :options="{
                  chart: {
                    type: 'line',
                    toolbar: { show: false }
                  },
                  colors: ['#4F46E5'],
                  stroke: { width: 3, curve: 'smooth' },
                  xaxis: {
                    categories: [
                      'Jan',
                      'Feb',
                      'Mar',
                      'Apr',
                      'May',
                      'Jun',
                      'Jul',
                      'Aug',
                      'Sep',
                      'Oct',
                      'Nov',
                      'Dec'
                    ]
                  },
                  yaxis: {
                    title: { text: 'Score (%)' },
                    min: 0,
                    max: 100
                  }
                }"
                :series="[
                  {
                    name: 'Monthly Score',
                    data:
                      selectedUser.monthlyScores ||
                      Array(12)
                        .fill(0)
                        .map(() => Math.floor(Math.random() * 30) + 60)
                  }
                ]"
              />
            </div>

            <!-- Report Status Distribution -->
            <div>
              <h4 class="text-lg font-medium text-gray-800 mb-4">Report Status Distribution</h4>
              <VueApexCharts
                type="bar"
                height="300"
                :options="{
                  chart: {
                    type: 'bar',
                    toolbar: { show: false }
                  },
                  colors: ['#60A5FA', '#34D399', '#F87171'],
                  plotOptions: {
                    bar: {
                      distributed: true,
                      columnWidth: '50%',
                      borderRadius: 5
                    }
                  },
                  dataLabels: { enabled: false },
                  xaxis: {
                    categories: ['Draft', 'Submitted', 'Rejected']
                  },
                  legend: { show: false }
                }"
                :series="[
                  {
                    name: 'Reports',
                    data: [
                      selectedUser.draftReports || 0,
                      selectedUser.submittedReports || 0,
                      selectedUser.rejectedReports || 0
                    ]
                  }
                ]"
              />
            </div>
          </div>
        </div>

        <!-- Overview Dashboard (shown when no user is selected) -->
        <template v-if="!singleUserView">
          <!-- Performance Summary Section -->
          <div class="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-6">
            <SkeletonLoader v-if="isLoading" class="h-28" />
            <div v-else class="col-span-1 bg-white rounded-lg shadow-sm p-4">
              <div class="flex items-center justify-between mb-2">
                <h3 class="text-sm font-medium text-gray-700">Total Reporting Users</h3>
                <div
                  class="flex items-center justify-center w-10 h-10 rounded-full bg-blue-50 text-blue-700"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    class="h-5 w-5"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z"
                    />
                  </svg>
                </div>
              </div>
              <div class="mt-4">
                <h2 class="text-3xl font-bold text-gray-900">{{ userData.summary.totalUsers }}</h2>
              </div>
            </div>

            <SkeletonLoader v-if="isLoading" class="h-28" />
            <div v-else class="col-span-1 bg-white rounded-lg shadow-sm p-4">
              <div class="flex items-center justify-between mb-2">
                <h3 class="text-sm font-medium text-gray-700">Report Status</h3>
                <div
                  class="flex items-center justify-center w-10 h-10 rounded-full bg-green-50 text-green-700"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    class="h-5 w-5"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fill-rule="evenodd"
                      d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V7.414A2 2 0 0015.414 6L12 2.586A2 2 0 0010.586 2H6zm2 10a1 1 0 10-2 0v3a1 1 0 102 0v-3zm4-1a1 1 0 011 1v3a1 1 0 11-2 0v-3a1 1 0 011-1zm-2-5a1 1 0 00-1 1v3a1 1 0 102 0V7a1 1 0 00-1-1z"
                      clip-rule="evenodd"
                    />
                  </svg>
                </div>
              </div>
              <div class="mt-2">
                <div class="flex justify-between items-center mb-1">
                  <span class="text-sm text-gray-500">Draft:</span>
                  <span class="text-sm font-medium">{{ userData.summary.draftReports || 0 }}</span>
                </div>
                <div class="flex justify-between items-center mb-1">
                  <span class="text-sm text-gray-500">Submitted:</span>
                  <span class="text-sm font-medium">{{
                    userData.summary.submittedReports || 0
                  }}</span>
                </div>
                <div class="flex justify-between items-center">
                  <span class="text-sm text-gray-500">Rejected:</span>
                  <span class="text-sm font-medium">{{
                    userData.summary.rejectedReports || 0
                  }}</span>
                </div>
              </div>
            </div>

            <SkeletonLoader v-if="isLoading" class="h-28" />
            <div v-else class="col-span-1 bg-white rounded-lg shadow-sm p-4">
              <div class="flex items-center justify-between mb-2">
                <h3 class="text-sm font-medium text-gray-700">Avg Completion Time</h3>
                <div
                  class="flex items-center justify-center w-10 h-10 rounded-full bg-yellow-50 text-yellow-700"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    class="h-5 w-5"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fill-rule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
                      clip-rule="evenodd"
                    />
                  </svg>
                </div>
              </div>
              <div class="mt-4">
                <h2 class="text-3xl font-bold text-gray-900">
                  {{
                    formatTime(
                      userData.summary.averageCompletionTime,
                      userData.summary.averageCompletionTimeFormatted
                    )
                  }}
                </h2>
              </div>
            </div>

            <SkeletonLoader v-if="isLoading" class="h-28" />
            <div v-else class="col-span-1 bg-white rounded-lg shadow-sm p-4">
              <div class="flex items-center justify-between mb-2">
                <h3 class="text-sm font-medium text-gray-700">Total Reports</h3>
                <div
                  class="flex items-center justify-center w-10 h-10 rounded-full bg-purple-50 text-purple-700"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    class="h-5 w-5"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fill-rule="evenodd"
                      d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z"
                      clip-rule="evenodd"
                    />
                  </svg>
                </div>
              </div>
              <div class="mt-4">
                <h2 class="text-3xl font-bold text-gray-900">
                  {{
                    userData.userPerformance.reduce((sum, user) => sum + (user.reportCount || 0), 0)
                  }}
                </h2>
                <p class="text-sm text-gray-500 mt-1">Total Reports</p>
              </div>
            </div>
          </div>

          <!-- Time Performance Metrics -->
          <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            <SkeletonLoader v-if="isLoading" class="h-28" />
            <div v-else class="col-span-1 bg-white rounded-lg shadow-sm p-4">
              <div class="flex items-center justify-between mb-2">
                <h3 class="text-sm font-medium text-gray-700">Fastest User</h3>
                <div
                  class="flex items-center justify-center w-10 h-10 rounded-full bg-green-50 text-green-700"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    class="h-5 w-5"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fill-rule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z"
                      clip-rule="evenodd"
                    />
                  </svg>
                </div>
              </div>
              <div class="mt-4">
                <h2 class="text-lg font-bold text-gray-900">{{ userData.summary.fastestUser }}</h2>
              </div>
            </div>

            <SkeletonLoader v-if="isLoading" class="h-28" />
            <div v-else class="col-span-1 bg-white rounded-lg shadow-sm p-4">
              <div class="flex items-center justify-between mb-2">
                <h3 class="text-sm font-medium text-gray-700">Slowest User</h3>
                <div
                  class="flex items-center justify-center w-10 h-10 rounded-full bg-red-50 text-red-700"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    class="h-5 w-5"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fill-rule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z"
                      clip-rule="evenodd"
                    />
                  </svg>
                </div>
              </div>
              <div class="mt-4">
                <h2 class="text-lg font-bold text-gray-900">{{ userData.summary.slowestUser }}</h2>
              </div>
            </div>

            <SkeletonLoader v-if="isLoading" class="h-28" />
            <div v-else class="col-span-1 bg-white rounded-lg shadow-sm p-4">
              <div class="flex items-center justify-between mb-2">
                <h3 class="text-sm font-medium text-gray-700">Most Reports</h3>
                <div
                  class="flex items-center justify-center w-10 h-10 rounded-full bg-blue-50 text-blue-700"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    class="h-5 w-5"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                    <path
                      fill-rule="evenodd"
                      d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z"
                      clip-rule="evenodd"
                    />
                  </svg>
                </div>
              </div>
              <div class="mt-4">
                <h2 class="text-lg font-bold text-gray-900">{{ userData.summary.mostReports }}</h2>
              </div>
            </div>
          </div>

          <!-- TabView for different analytics perspectives -->
          <div class="bg-white rounded-lg shadow-sm p-4 mb-6">
            <TabView>
              <!-- Performance Overview Tab -->
              <TabPanel header="Performance Overview">
                <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-4">
                  <!-- Monthly Performance Trend -->
                  <div class="lg:col-span-2 bg-white rounded-lg p-4">
                    <h3 class="text-lg font-medium text-gray-800 mb-4">
                      Monthly Performance Trend
                    </h3>
                    <SkeletonLoader v-if="isLoading" class="h-80" />
                    <div v-else>
                      <VueApexCharts
                        type="line"
                        height="350"
                        :options="{
                          chart: {
                            type: 'line',
                            toolbar: {
                              show: false
                            }
                          },
                          colors: ['#4F46E5', '#EC4899'],
                          stroke: {
                            width: 3,
                            curve: 'smooth'
                          },
                          xaxis: {
                            categories: userData.performance.labels,
                            axisBorder: {
                              show: false
                            },
                            axisTicks: {
                              show: false
                            }
                          },
                          yaxis: [
                            {
                              title: {
                                text: 'Score (%)'
                              },
                              min: 0,
                              max: 100
                            },
                            {
                              opposite: true,
                              title: {
                                text: 'Report Count'
                              }
                            }
                          ],
                          tooltip: {
                            y: {
                              formatter: (val, { seriesIndex }) => {
                                return seriesIndex === 0 ? `${val}%` : `${val} reports`
                              }
                            }
                          },
                          legend: {
                            position: 'top',
                            horizontalAlign: 'right'
                          }
                        }"
                        :series="userData.performance.datasets"
                      />
                    </div>
                  </div>

                  <!-- User Status Distribution -->
                  <div class="col-span-1 bg-white rounded-lg p-4">
                    <h3 class="text-lg font-medium text-gray-800 mb-4">User Status Distribution</h3>
                    <SkeletonLoader v-if="isLoading" class="h-80" />
                    <div v-else>
                      <VueApexCharts
                        type="donut"
                        height="300"
                        :options="userStatusOptions"
                        :series="userData.usersByStatus.map((item) => item.count)"
                      />
                    </div>
                  </div>

                  <!-- Reports Per Day Trend -->
                  <div class="lg:col-span-3 bg-white rounded-lg p-4 mt-4">
                    <h3 class="text-lg font-medium text-gray-800 mb-4">
                      Monthly Report Count Trend
                    </h3>
                    <SkeletonLoader v-if="isLoading" class="h-60" />
                    <div v-else>
                      <VueApexCharts
                        type="line"
                        height="250"
                        :options="{
                          chart: {
                            type: 'line',
                            toolbar: { show: false }
                          },
                          colors: ['#F59E0B'],
                          stroke: { width: 3, curve: 'smooth' },
                          xaxis: {
                            categories: userData.reportsPerDayTrend?.labels || []
                          },
                          yaxis: {
                            title: { text: 'Total Reports' }
                          }
                        }"
                        :series="userData.reportsPerDayTrend?.datasets || []"
                      />
                    </div>
                  </div>

                  <!-- Report Status Distribution -->
                  <div class="lg:col-span-3 bg-white rounded-lg p-4 mt-4">
                    <h3 class="text-lg font-medium text-gray-800 mb-4">
                      Report Status Distribution
                    </h3>
                    <SkeletonLoader v-if="isLoading" class="h-60" />
                    <div v-else>
                      <VueApexCharts
                        v-if="userData.reportStatusChart"
                        type="bar"
                        height="250"
                        :options="{
                          chart: {
                            type: 'bar',
                            toolbar: { show: false }
                          },
                          colors: ['#10B981', '#F59E0B', '#EF4444', '#6B7280'],
                          plotOptions: {
                            bar: {
                              distributed: true,
                              columnWidth: '50%',
                              borderRadius: 5
                            }
                          },
                          dataLabels: { enabled: false },
                          xaxis: {
                            categories: userData.reportStatusChart.labels
                          },
                          legend: { show: false }
                        }"
                        :series="[
                          { name: 'Reports', data: userData.reportStatusChart.datasets[0].data }
                        ]"
                      />
                      <VueApexCharts
                        v-else
                        type="bar"
                        height="250"
                        :options="{
                          chart: {
                            type: 'bar',
                            toolbar: { show: false }
                          },
                          colors: ['#60A5FA', '#34D399', '#F87171'],
                          plotOptions: {
                            bar: {
                              distributed: true,
                              columnWidth: '50%',
                              borderRadius: 5
                            }
                          },
                          dataLabels: { enabled: false },
                          xaxis: {
                            categories: ['Draft', 'Submitted', 'Rejected']
                          },
                          legend: { show: false }
                        }"
                        :series="[
                          {
                            name: 'Reports',
                            data: [
                              userData.summary.draftReports || 0,
                              userData.summary.submittedReports || 0,
                              userData.summary.rejectedReports || 0
                            ]
                          }
                        ]"
                      />
                    </div>
                  </div>
                </div>
              </TabPanel>

              <!-- Time Analysis Tab -->
              <TabPanel header="Time Analysis">
                <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-4">
                  <!-- Report Completion Time Distribution -->
                  <div class="lg:col-span-2 bg-white rounded-lg p-4">
                    <h3 class="text-lg font-medium text-gray-800 mb-4">
                      Report Completion Time Distribution
                    </h3>
                    <SkeletonLoader v-if="isLoading" class="h-80" />
                    <div v-else>
                      <VueApexCharts
                        type="bar"
                        height="350"
                        :options="timeDistributionOptions"
                        :series="[{ data: userData.timeAnalysis?.datasets?.[0]?.data || [] }]"
                      />
                    </div>
                  </div>

                  <!-- Daily Report Activity -->
                  <div class="col-span-1 bg-white rounded-lg p-4">
                    <h3 class="text-lg font-medium text-gray-800 mb-4">Daily Activity</h3>
                    <SkeletonLoader v-if="isLoading" class="h-80" />
                    <div v-else>
                      <VueApexCharts
                        type="bar"
                        height="350"
                        :options="dailyReportsOptions"
                        :series="userData.dailyReports?.datasets || []"
                      />
                    </div>
                  </div>

                  <!-- Completion Time Trend -->
                  <div class="lg:col-span-3 bg-white rounded-lg p-4 mt-4">
                    <h3 class="text-lg font-medium text-gray-800 mb-4">
                      Monthly Completion Time Trend
                    </h3>
                    <SkeletonLoader v-if="isLoading" class="h-60" />
                    <div v-else>
                      <VueApexCharts
                        type="line"
                        height="250"
                        :options="{
                          chart: {
                            type: 'line',
                            toolbar: { show: false }
                          },
                          colors: ['#10B981'],
                          stroke: { width: 3, curve: 'smooth' },
                          xaxis: {
                            categories: userData.completionTimeTrend?.labels || []
                          },
                          yaxis: {
                            title: { text: 'Minutes' }
                          },
                          tooltip: {
                            y: {
                              formatter: function (value) {
                                const formattedTime =
                                  userData.completionTimeTrend?.formattedData?.[
                                    userData.completionTimeTrend.labels.indexOf(
                                      this.w.globals.categoryLabels[this.dataPointIndex]
                                    )
                                  ]
                                return formattedTime || `${value} min`
                              }
                            }
                          }
                        }"
                        :series="userData.completionTimeTrend?.datasets || []"
                      />
                    </div>
                  </div>
                </div>
              </TabPanel>
            </TabView>
          </div>

          <!-- User Performance Table -->
          <div class="bg-white rounded-lg shadow-sm p-4 mb-6">
            <h3 class="text-lg font-medium text-gray-800 mb-4">
              Reporting User Performance Details
            </h3>
            <SkeletonLoader v-if="isLoading" class="h-80" />
            <div v-else>
              <Table
                :value="userData.userPerformance"
                :paginator="true"
                :rows="15"
                :rowsPerPageOptions="[10, 15, 20, 50, 100]"
                class="p-datatable-sm"
                stripedRows
                responsiveLayout="scroll"
                paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink RowsPerPageDropdown"
              >
                <Column field="name" header="Name" sortable></Column>
                <Column field="reportCount" header="Reports" sortable>
                  <template #body="{ data }">
                    <div class="flex items-center">
                      <span class="font-medium">{{ data.reportCount }}</span>
                      <span class="text-sm text-gray-500 ml-2"
                        >({{ data.completedTasks }}/{{
                          data.completedTasks + data.pendingTasks
                        }})</span
                      >
                    </div>
                  </template>
                </Column>
                <Column field="avgScore" header="Avg Score" sortable>
                  <template #body="{ data }">
                    <div class="flex items-center">
                      <span class="font-medium">{{ data.avgScore }}%</span>
                      <span v-if="data.trend === 'up'" class="ml-2 text-green-500">
                        <i class="pi pi-arrow-up"></i>
                      </span>
                      <span v-else-if="data.trend === 'down'" class="ml-2 text-red-500">
                        <i class="pi pi-arrow-down"></i>
                      </span>
                      <span v-else class="ml-2 text-blue-500">
                        <i class="pi pi-minus"></i>
                      </span>
                    </div>
                  </template>
                </Column>
                <Column field="avgCompletionTime" header="Avg Time" sortable>
                  <template #body="{ data }">
                    <span class="font-medium">{{
                      formatTime(data.avgCompletionTime, data.avgCompletionTimeFormatted)
                    }}</span>
                  </template>
                </Column>
                <Column field="reportsPerDay" header="Reports/Day" sortable>
                  <template #body="{ data }">
                    <span class="font-medium">{{ data.reportsPerDay.toFixed(1) }}</span>
                  </template>
                </Column>
                <Column field="onTime" header="On-Time" sortable></Column>
                <Column field="status" header="Status" sortable>
                  <template #body="{ data }">
                    <span
                      :class="[
                        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
                        getStatusClass(data.status)
                      ]"
                    >
                      {{ data.status.charAt(0).toUpperCase() + data.status.slice(1) }}
                    </span>
                  </template>
                </Column>
                <Column header="Actions">
                  <template #body="{ data }">
                    <div class="flex gap-2">
                      <button
                        class="p-1.5 bg-blue-50 text-blue-700 rounded-md hover:bg-blue-100 transition-colors"
                        title="View Details"
                        @click="selectUser(data)"
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
                            d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"
                          />
                          <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                          />
                        </svg>
                      </button>
                    </div>
                  </template>
                </Column>
              </Table>
            </div>
          </div>

          <!-- Recent Reports with Completion Times -->
          <div class="bg-white rounded-lg shadow-sm p-4 mb-6">
            <h3 class="text-lg font-medium text-gray-800 mb-4">Recent Reports Completion Times</h3>
            <SkeletonLoader v-if="isLoading" class="h-80" />
            <div v-else class="overflow-x-auto">
              <Table
                :value="
                  (userData.userPerformance || [])
                    .flatMap((user) =>
                      (user?.recentReports || []).map((report) => ({
                        ...report,
                        userName: user?.name || '',
                        userStatus: user?.status || ''
                      }))
                    )
                    .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))
                "
                :paginator="true"
                :rows="10"
                :rowsPerPageOptions="[5, 10, 15, 20, 50]"
                class="p-datatable-sm"
                stripedRows
                responsiveLayout="scroll"
                paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink RowsPerPageDropdown"
              >
                <Column field="date" header="Date" sortable>
                  <template #body="{ data }">
                    {{ new Date(data.date).toLocaleDateString() }}
                  </template>
                </Column>
                <Column field="userName" header="User" sortable></Column>
                <Column field="title" header="Report Title" sortable></Column>
                <Column field="completionTime" header="Completion Time" sortable>
                  <template #body="{ data }">
                    <div class="flex items-center">
                      <span class="font-medium">{{
                        formatElapsedTime(
                          data.elapsed_seconds ||
                            data.elapsed_time_seconds ||
                            data.completion_time ||
                            0
                        )
                      }}</span>
                      <span
                        :class="[
                          'ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
                          getElapsedSeconds(data) < 1800
                            ? 'bg-green-100 text-green-800'
                            : getElapsedSeconds(data) < 3000
                              ? 'bg-blue-100 text-blue-800'
                              : getElapsedSeconds(data) < 3600
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-red-100 text-red-800'
                        ]"
                      >
                        {{
                          getElapsedSeconds(data) < 1800
                            ? 'Fast'
                            : getElapsedSeconds(data) < 3000
                              ? 'Average'
                              : getElapsedSeconds(data) < 3600
                                ? 'Slow'
                                : 'Very Slow'
                        }}
                      </span>
                    </div>
                  </template>
                </Column>
                <Column field="userStatus" header="User Status" sortable>
                  <template #body="{ data }">
                    <span
                      :class="[
                        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
                        getStatusClass(data.userStatus)
                      ]"
                    >
                      {{ data.userStatus.charAt(0).toUpperCase() + data.userStatus.slice(1) }}
                    </span>
                  </template>
                </Column>
              </Table>
            </div>
          </div>

          <!-- Analytics Insights Section -->
          <div class="bg-white rounded-lg shadow-sm p-6 mb-6">
            <h3 class="text-lg font-medium text-gray-800 mb-4">
              Reporting User Time Performance Insights
            </h3>
            <div class="prose max-w-none">
              <p class="text-gray-600">
                This dashboard provides detailed analytics on reporting user performance across the
                organization, with a focus on time metrics for report completion. Track key
                time-based metrics such as average completion time per report, reports created per
                day, and identify trends in reporting efficiency.
              </p>
              <div class="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div class="p-4 bg-blue-50 rounded-lg">
                  <h4 class="text-base font-medium text-blue-800 mb-2">Time Efficiency</h4>
                  <p class="text-sm text-blue-700">
                    The average time to complete a report is
                    {{
                      formatTime(
                        userData.summary?.averageCompletionTime || 0,
                        userData.summary?.averageCompletionTimeFormatted
                      )
                    }}. Most reports ({{ userData.timeAnalysis?.datasets?.[0]?.data?.[1] || 0 }})
                    take between 20-40 minutes to complete.
                  </p>
                </div>
                <div class="p-4 bg-green-50 rounded-lg">
                  <h4 class="text-base font-medium text-green-800 mb-2">Daily Productivity</h4>
                  <p class="text-sm text-green-700">
                    Reporting users are most productive on Tuesdays with an average of
                    {{ userData.dailyReports?.datasets?.[0]?.data?.[1] || 0 }} reports created,
                    spending around {{ userData.dailyReports?.datasets?.[1]?.data?.[1] || 0 }} hours
                    on reporting activities.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </template>
      </div>
    </div>
  </DefaultLayout>
</template>
