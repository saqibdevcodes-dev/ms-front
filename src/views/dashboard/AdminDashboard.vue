<script setup lang="ts">
import BreadcrumbDefault from '@/components/Breadcrumbs/BreadcrumbDefault.vue'
import ChartOne from '@/components/Charts/ChartOne.vue'
import ChartThree from '@/components/Charts/ChartThree.vue'
import ChartTwo from '@/components/Charts/ChartTwo.vue'
import DefaultLayout from '@/layouts/DefaultLayout.vue'
import Radial from '@/components/Charts/radial.vue'
import Meter from '@/components/Charts/meter.vue'
import Area from '@/components/Charts/area.vue'
import FixedHeightTable from '@/components/Tables/FixedHeightTable.vue'

import { ref, onMounted, computed, inject, onActivated } from 'vue'
import axios, { AxiosRequestConfig } from 'axios'
import { Toast } from '@/utils/toast'
import { Auth } from '@/stores/auth'
import { log } from 'console'
import { useRouter } from 'vue-router'
import { TRIGGER_REFRESH_KEY } from '@/utils/refreshUtils'

const auth = Auth()
const pageTitle = ref('Admin Dashboard')
const router = useRouter()

// Inject the refresh function using the string key
const triggerManualRefresh = inject(TRIGGER_REFRESH_KEY) as (() => void) | undefined

// Define animation classes
const animations = {
  fadeIn: 'animate-fadeIn',
  fadeInUp: 'animate-fadeInUp',
  fadeInDown: 'animate-fadeInDown',
  fadeInLeft: 'animate-fadeInLeft',
  fadeInRight: 'animate-fadeInRight',
  slideIn: 'animate-slideIn',
  zoomIn: 'animate-zoomIn',
  bounce: 'animate-bounce',
  pulse: 'animate-pulse',
  spin: 'animate-spin'
}

// Function to test toast notifications
const testToasts = () => {
  console.log('Testing toast notifications')
  Toast.test()
}

// Animation delay utility
const getAnimationDelay = (index: number): string => {
  return `animation-delay-${index * 100}`
}

// Define color schemes for the dashboard
const colors = {
  primary: 'rgb(59, 130, 246)', // blue-500
  secondary: 'rgb(16, 185, 129)', // green-500
  warning: 'rgb(245, 158, 11)', // amber-500
  danger: 'rgb(239, 68, 68)', // red-500
  info: 'rgb(14, 165, 233)', // sky-500
  success: 'rgb(34, 197, 94)' // green-500
}

// Status indicator colors
const getStatusColor = (status: string) => {
  if (status === 'Success' || status === 'Healthy' || status === 'Completed') return colors.success
  if (status === 'Failed' || status === 'Unhealthy' || status === 'Error') return colors.danger
  if (status === 'Pending' || status === 'Warning') return colors.warning
  return colors.info
}

// Define interfaces for type safety
interface Stats {
  totalUsers: number | string
  activeClients: number | string
  reportsThisMonth: number | string
  systemUptime: string
}

interface Activity {
  id: number
  activity: string
  user: string
  time: string
}

interface SystemHealth {
  database: string
  emailService: string
  apiPerformance: string
  storage: string
}

interface ResetRequest {
  id: number
  email: string
  requestedAt: string
  status: string
}

interface LoginHistory {
  id: number
  userId: number
  username: string
  ipAddress: string
  macAddress: string | null
  loginTime: string
  status: string
}

// Type for table cell slot props
interface TableCellProps<T> {
  item: T
  column: { key: string; label: string; customRender?: boolean }
}

// Define an extended interface for the request config that includes bustCache
interface ExtendedRequestConfig extends AxiosRequestConfig {
  bustCache?: boolean
}

// Stats data
const stats = ref<Stats>({
  totalUsers: 0,
  activeClients: 0,
  reportsThisMonth: 0,
  systemUptime: '0%'
})

// Recent activities
const activities = ref<Activity[]>([])

// System health
const systemHealth = ref<SystemHealth>({
  database: 'Unknown',
  emailService: 'Unknown',
  apiPerformance: 'Unknown',
  storage: 'Unknown'
})

// Password reset requests
const resetRequests = ref<ResetRequest[]>([])
const isLoadingResetRequests = ref(false)
const isLoadingStats = ref(false)
const isLoadingActivities = ref(false)
const isLoadingSystemHealth = ref(false)

// Login history
const loginHistory = ref<LoginHistory[]>([])
const isLoadingLoginHistory = ref(false)

// Define column configurations for tables
const resetRequestsColumns = [
  { key: 'email', label: 'Email' },
  { key: 'requestedAt', label: 'Requested At' },
  { key: 'status', label: 'Status', customRender: true },
  { key: 'action', label: 'Action', customRender: true }
]

const loginHistoryColumns = [
  { key: 'username', label: 'User' },
  { key: 'ipAddress', label: 'IP Address' },
  { key: 'loginTime', label: 'Login Time' },
  { key: 'status', label: 'Status', customRender: true }
]

const activitiesColumns = [
  { key: 'activity', label: 'Activity' },
  { key: 'user', label: 'User' },
  { key: 'time', label: 'Time' }
]

// Current user info
const currentUserInfo = ref({
  name:
    auth.user?.first_name && auth.user?.last_name
      ? `${auth.user.first_name} ${auth.user.last_name}`
      : 'Unknown User',
  email: auth.user?.email || 'email@example.com',
  role: auth.user?.role || 'admin',
  lastLogin:
    new Date().toLocaleString('en-PK', {
      timeZone: 'Asia/Karachi',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    }) + ' (PKT)',
  ipAddress: 'Loading...'
})

// Add caching mechanism
type DataType = 'stats' | 'systemHealth' | 'activities' | 'resetRequests' | 'loginHistory'

const lastFetchTime = ref<Record<DataType, number>>({
  stats: 0,
  systemHealth: 0,
  activities: 0,
  resetRequests: 0,
  loginHistory: 0
})

// Minimum time between refreshes (5 minutes in milliseconds)
const CACHE_TTL = 5 * 60 * 1000

const shouldRefreshData = (dataType: DataType): boolean => {
  const now = Date.now()
  if (now - lastFetchTime.value[dataType] > CACHE_TTL) {
    lastFetchTime.value[dataType] = now
    return true
  }
  return false
}

// Initial load on first mount
onMounted(async () => {
  try {
    const ipResponse = await fetch('https://api.ipify.org?format=json')
    const ipData = await ipResponse.json()
    currentUserInfo.value.ipAddress = ipData.ip
  } catch (error) {
    console.error('Error fetching IP:', error)
    currentUserInfo.value.ipAddress = 'Not available'
  }

  fetchInitialData()
})

// Load when component is activated (with keep-alive)
onActivated(() => {
  // Only refresh data that needs refreshing based on cache time
  if (shouldRefreshData('stats')) fetchStats()
  if (shouldRefreshData('systemHealth')) fetchSystemHealth()
  if (shouldRefreshData('activities')) fetchActivities()
  if (shouldRefreshData('resetRequests')) fetchResetRequests()
  if (shouldRefreshData('loginHistory')) fetchLoginHistory()
})

// Fetch all data initially
const fetchInitialData = () => {
  const now = Date.now()
  const keys = Object.keys(lastFetchTime.value) as DataType[]
  keys.forEach((key) => {
    lastFetchTime.value[key] = now
  })

  fetchStats()
  fetchSystemHealth()
  fetchActivities()
  fetchResetRequests()
  fetchLoginHistory()
}

// Fetch stats from API
const fetchStats = async (forceBustCache = false) => {
  isLoadingStats.value = true
  try {
    const config: ExtendedRequestConfig = {
      bustCache: forceBustCache
    }
    const response = await Auth().authenticatedRequest('get', '/admin/stats', null, config)
    stats.value = response.data
  } catch (error) {
    console.error('Error fetching stats:', error)
    Toast.error('Failed to load system statistics. Using fallback data.')
    // Use fallback data on error
    stats.value = {
      totalUsers: 253,
      activeClients: 42,
      reportsThisMonth: 78,
      systemUptime: '99.9%'
    }
  } finally {
    isLoadingStats.value = false
  }
}

// Fetch system health from API
const fetchSystemHealth = async (forceBustCache = false) => {
  isLoadingSystemHealth.value = true
  try {
    const config: ExtendedRequestConfig = {
      bustCache: forceBustCache
    }
    const response = await Auth().authenticatedRequest('get', '/admin/system-health', null, config)
    systemHealth.value = response.data
  } catch (error) {
    console.error('Error fetching system health:', error)
    Toast.error('Failed to load system health. Using fallback data.')
    // Use fallback data on error
    systemHealth.value = {
      database: 'Healthy',
      emailService: 'Healthy',
      apiPerformance: 'Good',
      storage: 'Normal'
    }
  } finally {
    isLoadingSystemHealth.value = false
  }
}

// Fetch recent activities from API
const fetchActivities = async (forceBustCache = false) => {
  isLoadingActivities.value = true
  try {
    const config: ExtendedRequestConfig = {
      bustCache: forceBustCache
    }
    const response = await Auth().authenticatedRequest('get', '/admin/activities', null, config)
    activities.value = response.data
  } catch (error) {
    console.error('Error fetching activities:', error)
    Toast.error('Failed to load recent activities. Using fallback data.')
    // Use fallback data on error
    activities.value = [
      { id: 1, activity: 'New client added', user: 'Admin (John Doe)', time: '2 hours ago' },
      { id: 2, activity: 'User role updated', user: 'Admin (Jane Smith)', time: '5 hours ago' },
      { id: 3, activity: 'System settings changed', user: 'Admin (John Doe)', time: 'Yesterday' },
      { id: 4, activity: 'Password reset requested', user: 'Sarah Johnson', time: '1 day ago' },
      {
        id: 5,
        activity: 'New report submitted',
        user: 'Client User (Mike Brown)',
        time: '2 days ago'
      }
    ]
  } finally {
    isLoadingActivities.value = false
  }
}

// Fetch password reset requests from API
const fetchResetRequests = async (forceBustCache = false) => {
  isLoadingResetRequests.value = true
  try {
    // Use Auth store's authenticatedRequest to handle token refresh automatically
    const config: ExtendedRequestConfig = {
      bustCache: forceBustCache
    }
    const response = await Auth().authenticatedRequest(
      'get',
      '/admin/password-reset-requests',
      null,
      config
    )
    resetRequests.value = response.data
    console.log(response.data)
  } catch (error) {
    console.error('Error fetching reset requests:', error)
    Toast.error('Failed to load password reset requests. Using fallback data.')
    // Use fallback data on error
    resetRequests.value = [
      {
        id: 1,
        email: 'user@example.com',
        requestedAt: 'May 15, 2023 7:32 PM (PKT)',
        status: 'Pending'
      },
      {
        id: 2,
        email: 'client@example.com',
        requestedAt: 'May 14, 2023 2:15 PM (PKT)',
        status: 'Expired'
      },
      {
        id: 3,
        email: 'test@example.com',
        requestedAt: 'May 13, 2023 9:48 PM (PKT)',
        status: 'Completed'
      }
    ]
  } finally {
    isLoadingResetRequests.value = false
  }
}

// Fetch login history
const fetchLoginHistory = async (forceBustCache = false) => {
  isLoadingLoginHistory.value = true
  try {
    // Use Auth store's authenticatedRequest
    const config: ExtendedRequestConfig = {
      bustCache: forceBustCache
    }
    const response = await Auth().authenticatedRequest('get', '/admin/login-history', null, config)

    // Handle string response for "No Data Found"
    if (typeof response.data === 'string' && response.data === 'No Data Found') {
      loginHistory.value = []
    } else {
      loginHistory.value = response.data
    }
  } catch (error) {
    console.error('Error fetching login history:', error)
    Toast.error('Failed to load login history')
    loginHistory.value = []
  } finally {
    isLoadingLoginHistory.value = false
  }
}

// Handle resending password reset email
const resendResetEmail = async (email: string) => {
  try {
    Toast.info(`Sending reset email to ${email}...`)

    try {
      // Use Auth store's authenticatedRequest
      await Auth().authenticatedRequest('post', '/admin/resend-reset-email', { email })
      Toast.success(`Password reset link has been resent to ${email}`)
    } catch (apiError) {
      console.error('API error when resending email:', apiError)
      // Simulate success for development
      Toast.success(`Simulated: Password reset link has been resent to ${email}`)
    }

    // Refresh reset requests list
    fetchResetRequests()
  } catch (error: unknown) {
    console.error('Error resending reset email:', error)
    let errorMessage = 'Failed to resend reset email'

    if (
      error &&
      typeof error === 'object' &&
      'response' in error &&
      error.response &&
      typeof error.response === 'object' &&
      'data' in error.response &&
      error.response.data &&
      typeof error.response.data === 'object' &&
      'message' in error.response.data
    ) {
      errorMessage = error.response.data.message as string
    }

    Toast.error(errorMessage)
  }
}

// Manual cleanup function
const runManualCleanup = async () => {
  try {
    Toast.info('Running manual cleanup...')

    try {
      // Use Auth store's authenticatedRequest
      await Auth().authenticatedRequest('post', '/admin/run-cleanup')
      Toast.success('Cleanup completed successfully')
    } catch (apiError) {
      console.error('API error when running cleanup:', apiError)
      // Simulate success for development
      Toast.success('Simulated: Cleanup completed successfully')
    }

    // Refresh data after cleanup
    fetchStats()
    fetchSystemHealth()
    fetchActivities()
    fetchResetRequests()
  } catch (error) {
    console.error('Error running cleanup:', error)
    Toast.error('Failed to run cleanup process')
  }
}

// Function to refresh the reset requests data
const refreshResetRequests = () => {
  fetchResetRequests(true)
}

// Function to refresh all dashboard data
const refreshAllData = () => {
  console.log('Manual refresh requested by user')

  // Reset cache times to force refresh
  const now = Date.now()
  const keys = Object.keys(lastFetchTime.value) as DataType[]
  keys.forEach((key) => {
    lastFetchTime.value[key] = now
  })

  // Call the global refresh function if available
  if (typeof triggerManualRefresh === 'function') {
    triggerManualRefresh()
  }

  // Also refresh the dashboard-specific data with force refresh
  fetchStats(true)
  fetchSystemHealth(true)
  fetchActivities(true)
  fetchResetRequests(true)
  fetchLoginHistory(true)
}

// Button handlers that properly wrap the fetch functions
const handleRefreshStats = () => {
  lastFetchTime.value.stats = Date.now()
  fetchStats(true)
}
const handleRefreshSystemHealth = () => {
  lastFetchTime.value.systemHealth = Date.now()
  fetchSystemHealth(true)
}
const handleRefreshActivities = () => {
  lastFetchTime.value.activities = Date.now()
  fetchActivities(true)
}
const handleRefreshResetRequests = () => {
  lastFetchTime.value.resetRequests = Date.now()
  fetchResetRequests(true)
}
const handleRefreshLoginHistory = () => {
  lastFetchTime.value.loginHistory = Date.now()
  fetchLoginHistory(true)
}
</script>

<style>
/* Animation keyframes */
@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes fadeInDown {
  from {
    opacity: 0;
    transform: translateY(-20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes fadeInLeft {
  from {
    opacity: 0;
    transform: translateX(-20px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

@keyframes fadeInRight {
  from {
    opacity: 0;
    transform: translateX(20px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

@keyframes slideIn {
  from {
    transform: translateY(30px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

@keyframes zoomIn {
  from {
    opacity: 0;
    transform: scale(0.8);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

/* Animation utility classes */
.animate-fadeIn {
  animation: fadeIn 0.5s ease-in-out forwards;
}

.animate-fadeInUp {
  animation: fadeInUp 0.5s ease-out forwards;
}

.animate-fadeInDown {
  animation: fadeInDown 0.5s ease-out forwards;
}

.animate-fadeInLeft {
  animation: fadeInLeft 0.5s ease-out forwards;
}

.animate-fadeInRight {
  animation: fadeInRight 0.5s ease-out forwards;
}

.animate-slideIn {
  animation: slideIn 0.6s ease-out forwards;
}

.animate-zoomIn {
  animation: zoomIn 0.5s ease-out forwards;
}

/* Animation delay classes */
.animation-delay-100 {
  animation-delay: 0.1s;
}

.animation-delay-200 {
  animation-delay: 0.2s;
}

.animation-delay-300 {
  animation-delay: 0.3s;
}

.animation-delay-400 {
  animation-delay: 0.4s;
}

.animation-delay-500 {
  animation-delay: 0.5s;
}

.animation-delay-600 {
  animation-delay: 0.6s;
}

.animation-delay-700 {
  animation-delay: 0.7s;
}

.animation-delay-800 {
  animation-delay: 0.8s;
}

/* Custom Scrollbar Styles */
.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

.custom-scrollbar::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 3px;
}

.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #888;
  border-radius: 3px;
}

.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: #555;
}

/* For Firefox */
.custom-scrollbar {
  scrollbar-width: thin;
  scrollbar-color: #888 #f1f1f1;
}
</style>

<template>
  <DefaultLayout>
    <!-- Breadcrumb Start -->
    <BreadcrumbDefault :pageTitle="pageTitle" />
    <!-- Breadcrumb End -->

    <!-- Dashboard Header with Stats Summary -->
    <div
      class="relative mb-10 overflow-hidden rounded-lg bg-gradient-to-r from-blue-500 to-indigo-600 p-8 text-white shadow-lg animate-fadeIn"
    >
      <div
        class="absolute right-0 top-0 -mt-10 -mr-10 h-40 w-40 rounded-full bg-white bg-opacity-20 animate-pulse"
        style="animation-duration: 3s"
      ></div>
      <div
        class="absolute bottom-0 left-0 -mb-10 -ml-10 h-40 w-40 rounded-full bg-white bg-opacity-10 animate-pulse"
        style="animation-duration: 4s"
      ></div>

      <div class="z-10 relative">
        <div class="flex flex-wrap items-center justify-between">
          <div class="animate-fadeInLeft">
            <h2 class="text-3xl font-bold">Welcome, {{ currentUserInfo.name }}</h2>
            <p class="mt-2 text-blue-100">
              {{
                new Date().toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })
              }}
            </p>
          </div>

          <!-- Refresh button for all data -->
          <button
            @click="refreshAllData"
            class="flex items-center gap-2 rounded-full bg-white bg-opacity-20 px-4 py-2 text-white transition-all hover:bg-opacity-30 animate-fadeInRight"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-5 w-5"
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
            Refresh Dashboard
          </button>
        </div>

        <!-- Quick Stats Summary -->
        <div class="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4">
          <div
            class="rounded-lg bg-white bg-opacity-20 p-4 backdrop-blur-sm animate-fadeInUp animation-delay-100 hover:scale-105 transition-transform duration-300"
          >
            <div class="flex items-center">
              <div class="rounded-full bg-white bg-opacity-30 p-3">
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
                    d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                  />
                </svg>
              </div>
              <div class="ml-3">
                <p class="text-sm font-medium">Total Users</p>
                <p class="text-2xl font-bold">{{ stats.totalUsers }}</p>
              </div>
            </div>
          </div>

          <div
            class="rounded-lg bg-white bg-opacity-20 p-4 backdrop-blur-sm animate-fadeInUp animation-delay-200 hover:scale-105 transition-transform duration-300"
          >
            <div class="flex items-center">
              <div class="rounded-full bg-white bg-opacity-30 p-3">
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
                    d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                  />
                </svg>
              </div>
              <div class="ml-3">
                <p class="text-sm font-medium">Active Clients</p>
                <p class="text-2xl font-bold">{{ stats.activeClients }}</p>
              </div>
            </div>
          </div>

          <div
            class="rounded-lg bg-white bg-opacity-20 p-4 backdrop-blur-sm animate-fadeInUp animation-delay-300 hover:scale-105 transition-transform duration-300"
          >
            <div class="flex items-center">
              <div class="rounded-full bg-white bg-opacity-30 p-3">
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
                    d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </div>
              <div class="ml-3">
                <p class="text-sm font-medium">Reports (Month)</p>
                <p class="text-2xl font-bold">{{ stats.reportsThisMonth }}</p>
              </div>
            </div>
          </div>

          <div
            class="rounded-lg bg-white bg-opacity-20 p-4 backdrop-blur-sm animate-fadeInUp animation-delay-400 hover:scale-105 transition-transform duration-300"
          >
            <div class="flex items-center">
              <div class="rounded-full bg-white bg-opacity-30 p-3">
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
                    d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01"
                  />
                </svg>
              </div>
              <div class="ml-3">
                <p class="text-sm font-medium">System Status</p>
                <p class="text-2xl font-bold">
                  {{ systemHealth.database === 'Healthy' ? 'Online' : 'Warning' }}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="grid grid-cols-12 gap-5 md:gap-6 2xl:gap-7.5">
      <!-- User Profile Card -->
      <div class="col-span-12 md:col-span-4 lg:col-span-3">
        <div class="rounded-lg bg-white p-5 shadow-lg dark:bg-boxdark animate-zoomIn h-full">
          <div class="flex flex-col items-center justify-center">
            <!-- User Avatar -->
            <div
              class="mb-4 h-20 w-20 overflow-hidden rounded-full bg-blue-100 flex items-center justify-center animate-fadeIn animation-delay-200"
            >
              <span class="text-3xl font-semibold text-blue-500">{{
                currentUserInfo.name.charAt(0)
              }}</span>
            </div>

            <!-- User Details -->
            <h3
              class="mb-1 text-xl font-semibold text-black dark:text-white animate-fadeIn animation-delay-300"
            >
              {{ currentUserInfo.name }}
            </h3>
            <p
              class="mb-4 inline-flex items-center rounded-full bg-blue-50 px-3 py-1 text-sm font-medium text-blue-500 dark:bg-blue-900 dark:text-blue-300 animate-fadeIn animation-delay-400"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="mr-1 h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                />
              </svg>
              {{ currentUserInfo.role }}
            </p>

            <!-- User Connection Info -->
            <div class="w-full space-y-3 border-t border-gray-200 pt-4 dark:border-gray-700">
              <div class="flex items-center justify-between animate-fadeInLeft animation-delay-200">
                <span class="text-sm text-gray-500 dark:text-gray-400">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    class="mr-2 inline h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                    />
                  </svg>
                  Email
                </span>
                <span class="font-medium text-gray-900 dark:text-white">{{
                  currentUserInfo.email
                }}</span>
              </div>
              <div class="flex items-center justify-between animate-fadeInLeft animation-delay-400">
                <span class="text-sm text-gray-500 dark:text-gray-400">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    class="mr-2 inline h-4 w-4"
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
                  Last Login
                </span>
                <span class="font-medium text-gray-900 dark:text-white">{{
                  currentUserInfo.lastLogin
                }}</span>
              </div>
              <div class="flex items-center justify-between animate-fadeInLeft animation-delay-600">
                <span class="text-sm text-gray-500 dark:text-gray-400">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    class="mr-2 inline h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                    />
                  </svg>
                  IP Address
                </span>
                <span class="font-medium text-gray-900 dark:text-white">{{
                  currentUserInfo.ipAddress
                }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- System Health Card -->
      <div class="col-span-12 md:col-span-8 lg:col-span-5">
        <div
          class="h-full rounded-lg bg-white p-5 shadow-lg dark:bg-boxdark animate-fadeInUp animation-delay-300"
        >
          <div class="mb-5 flex items-center justify-between">
            <h3 class="text-xl font-semibold text-black dark:text-white">
              <span class="mr-2 inline-flex items-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  class="h-6 w-6 text-blue-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                  />
                </svg>
              </span>
              System Health
            </h3>

            <button
              @click="handleRefreshSystemHealth"
              class="inline-flex items-center rounded-full bg-blue-50 p-2 text-blue-500 transition-colors hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-300 dark:hover:bg-blue-800/50"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="h-5 w-5"
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
            </button>
          </div>

          <div v-if="isLoadingSystemHealth" class="flex h-40 items-center justify-center">
            <div
              class="h-12 w-12 animate-spin rounded-full border-4 border-blue-200 border-t-blue-500"
            ></div>
          </div>

          <div v-else class="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <!-- Database Status - animate each system health card with fadeIn up and delays -->
            <div
              class="rounded-lg bg-gray-50 p-4 dark:bg-gray-800 animate-fadeInUp animation-delay-100 hover:translate-y-[-5px] transition-transform duration-300"
            >
              <div class="flex items-center">
                <div
                  class="mr-4 flex h-12 w-12 items-center justify-center rounded-full"
                  :class="
                    systemHealth.database === 'Healthy'
                      ? 'bg-green-100 text-green-500 dark:bg-green-900/30 dark:text-green-300'
                      : 'bg-red-100 text-red-500 dark:bg-red-900/30 dark:text-red-300'
                  "
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
                      d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4"
                    />
                  </svg>
                </div>
                <div>
                  <h4 class="text-sm font-medium text-gray-600 dark:text-gray-300">Database</h4>
                  <p
                    class="text-lg font-bold"
                    :class="
                      systemHealth.database === 'Healthy'
                        ? 'text-green-500 dark:text-green-300'
                        : 'text-red-500 dark:text-red-300'
                    "
                  >
                    {{ systemHealth.database }}
                  </p>
                </div>
              </div>
            </div>

            <!-- Email Service -->
            <div
              class="rounded-lg bg-gray-50 p-4 dark:bg-gray-800 animate-fadeInUp animation-delay-200 hover:translate-y-[-5px] transition-transform duration-300"
            >
              <div class="flex items-center">
                <div
                  class="mr-4 flex h-12 w-12 items-center justify-center rounded-full"
                  :class="
                    systemHealth.emailService === 'Healthy'
                      ? 'bg-green-100 text-green-500 dark:bg-green-900/30 dark:text-green-300'
                      : 'bg-red-100 text-red-500 dark:bg-red-900/30 dark:text-red-300'
                  "
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
                      d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                    />
                  </svg>
                </div>
                <div>
                  <h4 class="text-sm font-medium text-gray-600 dark:text-gray-300">
                    Email Service
                  </h4>
                  <p
                    class="text-lg font-bold"
                    :class="
                      systemHealth.emailService === 'Healthy'
                        ? 'text-green-500 dark:text-green-300'
                        : 'text-red-500 dark:text-red-300'
                    "
                  >
                    {{ systemHealth.emailService }}
                  </p>
                </div>
              </div>
            </div>

            <!-- API Performance -->
            <div
              class="rounded-lg bg-gray-50 p-4 dark:bg-gray-800 animate-fadeInUp animation-delay-300 hover:translate-y-[-5px] transition-transform duration-300"
            >
              <div class="flex items-center">
                <div
                  class="mr-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-blue-500 dark:bg-blue-900/30 dark:text-blue-300"
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
                      d="M13 10V3L4 14h7v7l9-11h-7z"
                    />
                  </svg>
                </div>
                <div>
                  <h4 class="text-sm font-medium text-gray-600 dark:text-gray-300">
                    API Performance
                  </h4>
                  <p class="text-lg font-bold text-blue-500 dark:text-blue-300">
                    {{ systemHealth.apiPerformance }}
                  </p>
                </div>
              </div>
            </div>

            <!-- Backup Status -->
            <div
              class="rounded-lg bg-gray-50 p-4 dark:bg-gray-800 animate-fadeInUp animation-delay-400 hover:translate-y-[-5px] transition-transform duration-300"
            >
              <div class="flex items-center">
                <div
                  class="mr-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-green-500 dark:bg-green-900/30 dark:text-green-300"
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
                      d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"
                    />
                  </svg>
                </div>
                <div>
                  <h4 class="text-sm font-medium text-gray-600 dark:text-gray-300">
                    System Storage
                  </h4>
                  <p class="text-lg font-bold text-green-500 dark:text-green-300">
                    {{ systemHealth.storage }}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <!-- Quick Actions -->
          <div class="mt-5">
            <h4 class="mb-3 text-base font-semibold text-black dark:text-white">Quick Actions</h4>
            <div class="flex flex-wrap gap-2">
              <button
                @click="runManualCleanup"
                class="flex items-center rounded-lg bg-blue-50 px-3 py-2 text-sm font-medium text-blue-600 transition-colors hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-300 dark:hover:bg-blue-800/50 animate-fadeInRight animation-delay-200"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  class="mr-2 h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
                Run Cleanup
              </button>
              <!-- Add more quick actions here if needed -->
            </div>
          </div>
        </div>
      </div>

      <!-- Quick Actions Card -->
      <div class="col-span-12 md:col-span-12 lg:col-span-4">
        <div
          class="h-full rounded-lg bg-white p-5 shadow-lg dark:bg-boxdark animate-fadeInRight animation-delay-500"
        >
          <h3 class="mb-5 text-xl font-semibold text-black dark:text-white">
            <span class="mr-2 inline-flex items-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="h-6 w-6 text-blue-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
            </span>
            Quick Actions
          </h3>

          <!-- Action Cards -->
          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <!-- User Management -->
            <router-link
              to="/users"
              class="flex flex-col rounded-lg bg-gradient-to-br from-blue-50 to-blue-100 p-4 text-center transition-all hover:shadow-md dark:from-blue-900/30 dark:to-blue-800/30 dark:hover:from-blue-900/40 dark:hover:to-blue-800/40 animate-fadeInUp animation-delay-100 hover:-translate-y-1 duration-300"
            >
              <div
                class="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-full bg-blue-500/20 text-blue-500"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  class="h-7 w-7"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                  />
                </svg>
              </div>
              <h4 class="text-md font-semibold text-blue-700 dark:text-blue-300">
                User Management
              </h4>
              <p class="mt-1 text-xs text-blue-600/80 dark:text-blue-400/80">
                Manage system users and permissions
              </p>
            </router-link>

            <!-- Client Management -->
            <router-link
              to="/clients"
              class="flex flex-col rounded-lg bg-gradient-to-br from-green-50 to-green-100 p-4 text-center transition-all hover:shadow-md dark:from-green-900/30 dark:to-green-800/30 dark:hover:from-green-900/40 dark:hover:to-green-800/40 animate-fadeInUp animation-delay-200 hover:-translate-y-1 duration-300"
            >
              <div
                class="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-full bg-green-500/20 text-green-500"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  class="h-7 w-7"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                  />
                </svg>
              </div>
              <h4 class="text-md font-semibold text-green-700 dark:text-green-300">
                Client Management
              </h4>
              <p class="mt-1 text-xs text-green-600/80 dark:text-green-400/80">
                Manage clients and their settings
              </p>
            </router-link>

            <!-- Reports -->
            <router-link
              to="client/reports"
              class="flex flex-col rounded-lg bg-gradient-to-br from-amber-50 to-amber-100 p-4 text-center transition-all hover:shadow-md dark:from-amber-900/30 dark:to-amber-800/30 dark:hover:from-amber-900/40 dark:hover:to-amber-800/40 animate-fadeInUp animation-delay-300 hover:-translate-y-1 duration-300"
            >
              <div
                class="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-full bg-amber-500/20 text-amber-500"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  class="h-7 w-7"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </div>
              <h4 class="text-md font-semibold text-amber-700 dark:text-amber-300">Reports</h4>
              <p class="mt-1 text-xs text-amber-600/80 dark:text-amber-400/80">
                View and manage system reports
              </p>
            </router-link>

            <!-- System Settings -->
            <router-link
              to="/settings"
              class="flex flex-col rounded-lg bg-gradient-to-br from-purple-50 to-purple-100 p-4 text-center transition-all hover:shadow-md dark:from-purple-900/30 dark:to-purple-800/30 dark:hover:from-purple-900/40 dark:hover:to-purple-800/40 animate-fadeInUp animation-delay-400 hover:-translate-y-1 duration-300"
            >
              <div
                class="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-full bg-purple-500/20 text-purple-500"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  class="h-7 w-7"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                  />
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
              </div>
              <h4 class="text-md font-semibold text-purple-700 dark:text-purple-300">
                System Settings
              </h4>
              <p class="mt-1 text-xs text-purple-600/80 dark:text-purple-400/80">
                Configure system settings
              </p>
            </router-link>
          </div>
        </div>
      </div>

      <!-- System Stats -->
      <div
        class="col-span-12 md:col-span-3 rounded-sm border border-stroke bg-white p-5 shadow-default dark:border-strokedark dark:bg-boxdark"
      >
        <h4 class="mb-3 text-xl font-semibold text-black dark:text-white">System Stats</h4>
        <div v-if="isLoadingStats" class="py-4 text-center text-gray-500">Loading stats...</div>
        <div v-else class="space-y-3">
          <div class="flex justify-between">
            <span class="text-gray-600">Total Users</span>
            <span class="text-black font-semibold">{{ stats.totalUsers }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-600">Active Clients</span>
            <span class="text-black font-semibold">{{ stats.activeClients }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-600">Reports This Month</span>
            <span class="text-black font-semibold">{{ stats.reportsThisMonth }}</span>
          </div>
          <!-- <div class="flex justify-between">
            <span class="text-gray-600">System Uptime</span>
            <span class="text-black font-semibold">{{ stats.systemUptime }}</span>
          </div> -->
        </div>
      </div>

      <!-- Password Reset Requests Table -->
      <div class="col-span-12 lg:col-span-9">
        <div
          class="rounded-lg bg-white p-5 shadow-lg dark:bg-boxdark animate-fadeInUp animation-delay-300"
        >
          <div class="mb-5 flex items-center justify-between">
            <h3 class="text-xl font-semibold text-black dark:text-white">
              <span class="mr-2 inline-flex items-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  class="h-6 w-6 text-blue-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
                  />
                </svg>
              </span>
              Password Reset Requests
            </h3>

            <button
              @click="handleRefreshResetRequests"
              class="inline-flex items-center rounded-full bg-blue-50 p-2 text-blue-500 transition-colors hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-300 dark:hover:bg-blue-800/50"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="h-5 w-5"
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
            </button>
          </div>

          <div v-if="isLoadingResetRequests" class="flex h-40 items-center justify-center">
            <div
              class="h-12 w-12 animate-spin rounded-full border-4 border-blue-200 border-t-blue-500"
            ></div>
          </div>

          <div v-else-if="resetRequests.length === 0" class="flex h-40 items-center justify-center">
            <p class="text-gray-500 dark:text-gray-400">No password reset requests found</p>
          </div>

          <div v-else class="overflow-x-auto animate-fadeIn">
            <FixedHeightTable
              title="Password Reset Requests"
              :data="resetRequests"
              :columns="resetRequestsColumns"
              maxHeight="300px"
              :loading="isLoadingResetRequests"
              noDataMessage="No password reset requests found"
            >
              <!-- Status column custom rendering -->
              <template #cell-status="{ item }">
                <span
                  class="rounded-full px-2.5 py-1 text-xs font-medium"
                  :class="{
                    'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300':
                      item.status === 'Pending',
                    'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300':
                      item.status === 'Expired',
                    'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300':
                      item.status === 'Completed'
                  }"
                >
                  {{ item.status }}
                </span>
              </template>

              <!-- Action column custom rendering -->
              <template #cell-action="{ item }">
                <div class="text-right">
                  <button
                    v-if="item.status === 'Pending' || item.status === 'Expired'"
                    @click="resendResetEmail(item.email)"
                    class="rounded bg-blue-50 px-2 py-1 text-xs font-medium text-blue-600 transition-colors hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-300 dark:hover:bg-blue-800/50"
                  >
                    Resend
                  </button>
                </div>
              </template>
            </FixedHeightTable>
          </div>
        </div>
      </div>

      <!-- Recent Activity Feed -->
      <div class="col-span-12 lg:col-span-6">
        <div
          class="rounded-lg bg-white p-5 shadow-lg dark:bg-boxdark animate-fadeInRight animation-delay-400"
        >
          <div class="mb-5 flex items-center justify-between">
            <h3 class="text-xl font-semibold text-black dark:text-white">
              <span class="mr-2 inline-flex items-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  class="h-6 w-6 text-blue-500"
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
              </span>
              Recent Activity
            </h3>

            <button
              @click="handleRefreshActivities"
              class="inline-flex items-center rounded-full bg-blue-50 p-2 text-blue-500 transition-colors hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-300 dark:hover:bg-blue-800/50"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="h-5 w-5"
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
            </button>
          </div>

          <div v-if="isLoadingActivities" class="flex h-40 items-center justify-center">
            <div
              class="h-12 w-12 animate-spin rounded-full border-4 border-blue-200 border-t-blue-500"
            ></div>
          </div>

          <div v-else-if="activities.length === 0" class="flex h-40 items-center justify-center">
            <p class="text-gray-500 dark:text-gray-400">No recent activities found</p>
          </div>

          <div v-else class="animate-fadeIn">
            <!-- Custom activity feed with fixed height scroll -->
            <div :style="{ maxHeight: '440px' }" class="overflow-y-auto pr-2 custom-scrollbar">
              <div class="space-y-4">
                <div
                  v-for="(activity, index) in activities"
                  :key="activity.id"
                  class="relative flex animate-fadeInLeft"
                  :style="`animation-delay: ${index * 0.05}s`"
                >
                  <!-- Activity icon -->
                  <div
                    class="mr-4 flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 text-blue-500 dark:bg-blue-900/30 dark:text-blue-300"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      class="h-5 w-5"
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

                  <!-- Activity content -->
                  <div class="flex-1">
                    <h4 class="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {{ activity.activity }}
                    </h4>
                    <div class="flex justify-between">
                      <p class="text-xs text-gray-500 dark:text-gray-400">by {{ activity.user }}</p>
                      <p class="text-xs text-gray-500 dark:text-gray-400">
                        {{ activity.time }}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Login History Table -->
      <div class="col-span-12 lg:col-span-6">
        <div
          class="rounded-lg bg-white p-5 shadow-lg dark:bg-boxdark animate-fadeInUp animation-delay-500"
        >
          <div class="mb-5 flex items-center justify-between">
            <h3 class="text-xl font-semibold text-black dark:text-white">
              <span class="mr-2 inline-flex items-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  class="h-6 w-6 text-blue-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  />
                </svg>
              </span>
              Login History
            </h3>

            <button
              @click="handleRefreshLoginHistory"
              class="inline-flex items-center rounded-full bg-blue-50 p-2 text-blue-500 transition-colors hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-300 dark:hover:bg-blue-800/50"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="h-5 w-5"
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
            </button>
          </div>

          <div v-if="isLoadingLoginHistory" class="flex h-40 items-center justify-center">
            <div
              class="h-12 w-12 animate-spin rounded-full border-4 border-blue-200 border-t-blue-500"
            ></div>
          </div>

          <div v-else-if="loginHistory.length === 0" class="flex h-40 items-center justify-center">
            <p class="text-gray-500 dark:text-gray-400">No login history found</p>
          </div>

          <div v-else class="overflow-x-auto animate-fadeIn">
            <FixedHeightTable
              title="Login History"
              :data="loginHistory"
              :columns="loginHistoryColumns"
              maxHeight="300px"
              :loading="isLoadingLoginHistory"
              noDataMessage="No login history found"
            >
              <!-- Status column custom rendering -->
              <template #cell-status="{ item }">
                <span
                  class="rounded-full px-2.5 py-1 text-xs font-medium"
                  :class="{
                    'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300':
                      item.status === 'Success',
                    'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300':
                      item.status === 'Failed'
                  }"
                >
                  {{ item.status }}
                </span>
              </template>
            </FixedHeightTable>
          </div>
        </div>
      </div>
    </div>
  </DefaultLayout>
</template>
