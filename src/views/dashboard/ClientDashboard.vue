<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import BreadcrumbDefault from '@/components/Breadcrumbs/BreadcrumbDefault.vue'
import ChartFour from '@/components/Charts/pie.vue'
import DefaultLayout from '@/layouts/DefaultLayout.vue'
import { ClientFilter } from '@/stores/clientFilter'
import { Client } from '@/stores/client'
import { Branches } from '@/stores/branches'
import { Ranges } from '@/stores/ranges'
import { useColorsScore } from '@/stores/colorsScore'
import { Auth } from '@/stores/auth'
import VueApexCharts from 'vue3-apexcharts'
import Loader from '@/components/ui/Loader.vue'
import router from '@/router'
import { useClientLabels } from '@/composables/useClientLabels'

// import { api } from '@/services/api'

const pageTitle = ref('Client Dashboard')
const clientFilter = ClientFilter()
const isLoading = ref(false)

// Use custom labels composable
const {
  branchLabel,
  visitDateLabel,
  totalBranchesLabel,
  completedBranchesLabel,
  getBranchComparisonLabel
} = useClientLabels()

// Add specific loading states for different sections
const isChartsLoading = ref(false)
const isStatsLoading = ref(false)
const isFiltersLoading = ref(false)

// Dynamic filter data
const dynamicFilters = ref<any[]>([])
const filterValues = ref<Record<string, string>>({})
const selectedFilters = ref<Record<string, string>>({})
const lockedFilters = ref<Record<string, boolean>>({}) // Track manually selected filters

// Branch data
const branchData = ref<any[]>([])
const branchHeaders = ref<any[]>([])
const uniqueFilterValues = ref<Record<string, string[]>>({})
const serverFilterCounts = ref<Record<string, number>>({})

// Mock data for demonstration - will be replaced with API data
const allReports = ref<any[]>([])
const reportData = ref<any[]>([])
// Reports loading state
const isReportsLoading = ref(true)

// Flag to track if we're in cascading mode to prevent filter reset
const isCascadingMode = ref(false)

// Define branch type for better type safety
interface Branch {
  id?: string | number
  uuid?: string
  branch_id?: string | number
  branch_name?: string
  branch_code?: string
  br__code?: string
  code?: string
  name?: string
  [key: string]: any // Allow other dynamic properties
}

// Load branch assignments
const assignedBranches = ref<Branch[]>([])

// Server-provided unique branches count (populated from backend)
const uniqueBranchesCount = ref(0)

// Fetch reports from API
const fetchReports = async (forceRefresh = true) => {
  isReportsLoading.value = true
  isStatsLoading.value = true
  isChartsLoading.value = true

  // Clear existing data to prevent stale cache issues
  if (forceRefresh) {
    reportData.value = []
    allReports.value = []
    // console.log('🔄 Force refresh: Cleared cached report data')
  }

  try {
    // Initialize client store first
    const clientStore = Client()

    // Check if client store needs initialization
    if (!clientStore.selected_client || Object.keys(clientStore.selected_client).length === 0) {
      // console.log('Client not initialized, waiting for client data...')
      await clientStore.init()

      // Wait briefly for initialization to complete
      await new Promise((resolve) => setTimeout(resolve, 500))
    }

    // Get client ID from Client store again after initialization
    const clientId = clientStore.selected_client?.uuid || clientStore.selected_client?.id

    if (!clientId) {
      console.error(
        'No client ID available for fetching reports, even after initialization attempt'
      )
      // console.log('Client store state:', clientStore.selected_client)

      // Try to fetch the authenticated user to see if they have a client_id
      try {
        const authStore = Auth()
        if (authStore.user?.client_id) {
          // console.log('Found client ID from auth user:', authStore.user.client_id)
          // Use the client ID from the authenticated user
          const userEmail = authStore.user?.email || null
          const userRole = authStore.getUserRole() || null
          // console.log('User role:', userRole, 'User email:', userEmail)

          // For client_user role, ensure they have access
          if (userRole === 'client_user') {
            // console.log('Client user detected, ensuring access permissions')
          }

          // First load branch assignments for user-based filtering
          await loadAssignedBranches(String(userEmail))

          // Build dynamic params for API call
          const apiParams: any = {
            client_id: authStore.user.client_id,
            user_email: userEmail,
            user_role: userRole,
            forceRefresh: forceRefresh,
            timestamp: Date.now() // Cache busting
          }

          // Add any active filters to the API request
          if (hasActiveFilters.value) {
            Object.assign(apiParams, { filters: selectedFilters.value })
          }

          const response = await Auth().authenticatedRequest(
            'post',
            '/reports/client-dashboard-data',
            apiParams
          )

          if (response.status === 200 && response.data) {
            const payload = response.data

            // When backend returns success but no data, show message and exit early
            if (payload.status === 'success' && (!payload.data || payload.data.length === 0)) {
              allReports.value = []
              if (payload.message) {
                const dashboardMessage = document.getElementById('dashboard-message')
                if (dashboardMessage) {
                  dashboardMessage.innerText = payload.message
                  dashboardMessage.style.display = 'block'
                }
              }
              isReportsLoading.value = false
              return
            }

            // Use server-filtered and enriched reports directly
            allReports.value = payload.data || []

            // Consume server-computed metrics if available
            if (payload.metrics) {
              totalReports.value = payload.metrics.totalReports ?? allReports.value.length
              averageScore.value = payload.metrics.averageScore ?? 0
              completionRate.value = payload.metrics.completionRate ?? 0
              uniqueBranchesCount.value = payload.metrics.uniqueBranchesCount ?? 0
            } else {
              totalReports.value = allReports.value.length
              averageScore.value = 0
              completionRate.value = 0
              uniqueBranchesCount.value = 0
            }

            // Consume server-provided filter options (if present)
            if (payload.filters && payload.filters.options) {
              uniqueFilterValues.value = payload.filters.options
              serverFilterCounts.value = payload.filters.counts || {}
            }
            // Consume server-provided rankings
            if (payload.ranking) {
              serverTopReports.value = payload.ranking.topReports || []
              serverBottomReports.value = payload.ranking.bottomReports || []
            }
            return
          }
        }
      } catch (authError) {
        // console.error('Error trying to use auth user client ID:', authError)
      }

      // Provide fallback data for testing
      // console.log('Using fallback mock data')
      provideMockData()
      isReportsLoading.value = false
      return
    }

    // console.log('Fetching reports with client ID:', clientId)

    // Get user information for filtering (if client user)
    const authStore = Auth()
    const userEmail = authStore.user?.email || null
    const userRole = authStore.getUserRole() || null
    // console.log('User role:', userRole, 'User email:', userEmail)

    // First load branch assignments for this user
    await loadAssignedBranches(String(userEmail))

    // Build dynamic request parameters
    const requestParams: any = {
      client_id: clientId,
      user_email: userEmail,
      user_role: userRole,
      forceRefresh: forceRefresh,
      timestamp: Date.now() // Cache busting
    }

    // Add any active UI filters to the API request
    if (hasActiveFilters.value) {
      Object.assign(requestParams, { filters: selectedFilters.value })
    }

    // If we have branch assignments and primaryFieldValues, send those as hints to the backend
    if (assignedBranches.value.length > 0) {
      const branchIds = assignedBranches.value
        .map((branch: any) => branch.id || branch.uuid)
        .filter(Boolean)

      if (branchIds.length > 0) {
        Object.assign(requestParams, { branch_ids: branchIds })
      }
    }

    // Use a different endpoint that doesn't require the video_url column
    const response = await Auth().authenticatedRequest(
      'post',
      '/reports/client-dashboard-data',
      requestParams
    )

    // Process API response
    if (response.status === 200 && response.data) {
      const payload = response.data

      // When backend returns success but no data, show message and exit early
      if (payload.status === 'success' && (!payload.data || payload.data.length === 0)) {
        allReports.value = []
        if (payload.message) {
          const dashboardMessage = document.getElementById('dashboard-message')
          if (dashboardMessage) {
            dashboardMessage.innerText = payload.message
            dashboardMessage.style.display = 'block'
          }
        }
        isReportsLoading.value = false
        return
      }

      // Use server-filtered and enriched reports directly
      allReports.value = payload.data || []

      // Consume server-computed metrics if available
      if (payload.metrics) {
        totalReports.value = payload.metrics.totalReports ?? allReports.value.length
        averageScore.value = payload.metrics.averageScore ?? 0
        completionRate.value = payload.metrics.completionRate ?? 0
        uniqueBranchesCount.value = payload.metrics.uniqueBranchesCount ?? 0
      } else {
        totalReports.value = allReports.value.length
        averageScore.value = 0
        completionRate.value = 0
        uniqueBranchesCount.value = 0
      }

      // Consume server-provided filter options (if present)
      if (payload.filters && payload.filters.options) {
        uniqueFilterValues.value = payload.filters.options
        serverFilterCounts.value = payload.filters.counts || {}
      }
      // Consume server-provided rankings
      if (payload.ranking) {
        serverTopReports.value = payload.ranking.topReports || []
        serverBottomReports.value = payload.ranking.bottomReports || []
      }
    }
  } catch (error) {
    // console.error('Error fetching reports:', error)
    // If there's an error, provide mock data
    provideMockData()
  } finally {
    isReportsLoading.value = false
    isStatsLoading.value = false
    isChartsLoading.value = false
  }
}

// (Removed) Client-side processReports now handled by backend response

// Flag to track if branches have been loaded
const branchesLoaded = ref(false)

// Load branches assigned to the current user (only once)
const loadAssignedBranches = async (userEmail: string | null) => {
  // Skip if already loaded
  if (branchesLoaded.value) {
    return
  }

  // console.log('Loading branch assignments for:', userEmail)
  if (!userEmail) {
    console.error('No user email provided for branch assignments')
    assignedBranches.value = []
    branchesLoaded.value = true // Mark as attempted
    return
  }

  try {
    // Initialize the Branches store
    const branchStore = Branches()

    // Fetch the branches
    await branchStore.init()
    await branchStore.fetch()
    const branches = branchStore.branches || []

    if (!Array.isArray(branches)) {
      console.error('Branches data is not an array:', branches)
      assignedBranches.value = []
      return
    }

    // console.log(`Loaded ${branches.length} total branches`)

    // Get current user role
    const authStore = Auth()
    const userRole = authStore.getUserRole()

    // Define roles with full access
    const rolesWithFullAccess: string[] = ['admin', 'client_admin', 'super_admin']
    const userHasAdminRole = userRole ? rolesWithFullAccess.includes(String(userRole)) : false

    // If user has admin role, grant access to all branches
    if (userHasAdminRole) {
      // console.log(`User has full branch access due to admin role: ${userRole}`)
      assignedBranches.value = branches as Branch[]
      branchesLoaded.value = true
      return
    }

    // For client_user role, filter based on email assignment
    if (userRole === 'client_user' && userEmail) {
      // console.log('Filtering branches for client_user role')
      const userLowerEmail = String(userEmail).toLowerCase()
      // console.log(`User email (lowercase): "${userLowerEmail}"`)

      // Find fields that might contain email addresses
      const emailFields: string[] = []

      // Identify email-related fields in the branches
      if (branches.length > 0) {
        const sampleBranch = branches[0]
        Object.keys(sampleBranch).forEach((field) => {
          if (
            field.toLowerCase().includes('email') ||
            field.toLowerCase().includes('manager') ||
            field.toLowerCase().includes('head') ||
            field === 'emails'
          ) {
            emailFields.push(field)
          }
        })
      }

      // console.log(`Checking these fields for email matches: ${emailFields.join(', ')}`)

      // Find branches where user's email appears in any email-related field
      const matchedBranches = branches.filter((branch) => {
        for (const field of emailFields) {
          if (!branch[field]) continue

          const fieldValue = String(branch[field]).toLowerCase()
          // console.log(
          // `Branch ${
          //   branch.branch_name || branch.branch_code || branch.id
          // }, field ${field}: "${fieldValue}"`
          // )

          // Check exact match
          if (fieldValue === userLowerEmail) {
            // console.log(
            //   `✅ Found exact email match in field ${field} for branch:`,
            //   branch.branch_name || branch.br__code || branch.id
            // )
            return true
          }

          // Check comma/semicolon separated list
          if (fieldValue.includes(',') || fieldValue.includes(';')) {
            const emails = fieldValue.split(/[,;]/).map((e) => e.trim().toLowerCase())
            // console.log(`Email list in ${field}: [${emails.join(', ')}]`)

            if (emails.includes(userLowerEmail)) {
              // console.log(
              //   `✅ Found email in list in field ${field} for branch:`,
              //   branch.branch_name || branch.br__code || branch.id
              // )
              return true
            }
          }

          // Check substring match only if properly formatted emails
          if (
            userLowerEmail.includes('@') &&
            fieldValue.includes('@') &&
            (fieldValue.includes(userLowerEmail) || userLowerEmail.includes(fieldValue))
          ) {
            // console.log(
            //   `✅ Found partial email match in field ${field} for branch:`,
            //   branch.branch_name || branch.br__code || branch.id
            // )
            return true
          }
        }

        return false
      })

      // console.log(`Found ${matchedBranches.length} branches assigned to ${String(userEmail)}`)
      assignedBranches.value = matchedBranches as Branch[]
      branchesLoaded.value = true
      return
    }

    // Default fallback - provide all branches if no specific filtering applied
    // console.log('No specific branch filtering applied, showing all branches')
    assignedBranches.value = branches as Branch[]
  } catch (error) {
    // console.error('Error loading branch assignments:', error)
    assignedBranches.value = []
  } finally {
    // Mark as loaded to prevent redundant calls
    branchesLoaded.value = true
  }
}

// (Removed) extractBranchIdentifiers; backend handles branch access filtering

// (Removed) filterReportsByBranchAccess; backend handles branch access filtering

// Helper function to provide mock data for testing
const provideMockData = () => {
  allReports.value = [
    {
      id: 1,
      branch_name: 'Downtown',
      date: '2023-07-12',
      score: 92,
      report_type: 'Mystery Shopping',
      status: 'approved'
    },
    {
      id: 2,
      branch_name: 'Westside',
      date: '2023-07-10',
      score: 78,
      report_type: 'Mystery Shopping',
      status: 'approved'
    },
    {
      id: 4,
      branch_name: 'Downtown',
      date: '2023-07-05',
      score: 95,
      report_type: 'Branch Audit',
      status: 'approved'
    }
  ]
}

// Fetch branch data and headers
const fetchBranchData = async () => {
  isLoading.value = true
  isFiltersLoading.value = true

  try {
    // Initialize client store first
    const clientStore = Client()

    // Check if client store needs initialization
    if (!clientStore.selected_client || Object.keys(clientStore.selected_client).length === 0) {
      await clientStore.init()
    }

    // Get client ID from Client store
    const clientId = clientStore.selected_client?.uuid || clientStore.selected_client?.id

    if (!clientId) {
      console.error('❌ No client ID available for fetching branch data')
      // console.log('Client store state:', {
      //   selected_client: clientStore.selected_client,
      //   clients: clientStore.clients?.length || 0,
      //   isInitialized: !!clientStore.selected_client
      // })

      // For demonstration purposes, use mock data
      setTimeout(() => {
        // Create some demo filters
        dynamicFilters.value = [
          { field: 'branch_code', label: 'Branch Code' },
          { field: 'branch_name', label: 'Branch Name' },
          { field: 'city', label: 'City' },
          { field: 'region', label: 'Region' },
          { field: 'branch_type', label: 'Branch Type' }
        ]

        // Add mock values for each filter
        uniqueFilterValues.value = {
          branch_code: ['BR001', 'BR002', 'BR003', 'BR004', 'BR005'],
          branch_name: ['Downtown', 'Westside', 'Northgate', 'Eastside', 'Southgate'],
          city: ['New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix'],
          region: ['East', 'West', 'North', 'South', 'Central'],
          branch_type: ['Standard', 'Premium', 'Express']
        }

        // Initialize filter values
        dynamicFilters.value.forEach((filter) => {
          filterValues.value[filter.field] = ''
        })

        isLoading.value = false
        isFiltersLoading.value = false
      }, 500)

      return
    }

    // Fetch branch data from Branches store
    const branchStore = Branches()
    await branchStore.fetch()

    // Store branch data and headers
    branchData.value = branchStore.branches || []
    branchHeaders.value = branchStore.branch_headers || []

    // Process headers to create dynamic filters
    createDynamicFilters()

    // console.log('Branch data loaded:', branchData.value)
    // console.log('Branch headers:', branchHeaders.value)
  } catch (error) {
    console.error('Error fetching branch data:', error)

    // Handle error by providing fallback mock data
    setTimeout(() => {
      // Create some demo filters
      dynamicFilters.value = [
        { field: 'branch_code', label: 'Branch Code' },
        { field: 'branch_name', label: 'Branch Name' },
        { field: 'city', label: 'City' },
        { field: 'region', label: 'Region' },
        { field: 'branch_type', label: 'Branch Type' }
      ]

      // Add mock values for each filter
      uniqueFilterValues.value = {
        branch_code: ['BR001', 'BR002', 'BR003', 'BR004', 'BR005'],
        branch_name: ['Downtown', 'Westside', 'Northgate', 'Eastside', 'Southgate'],
        city: ['New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix'],
        region: ['East', 'West', 'North', 'South', 'Central'],
        branch_type: ['Standard', 'Premium', 'Express']
      }

      // Initialize filter values
      dynamicFilters.value.forEach((filter) => {
        filterValues.value[filter.field] = ''
      })

      isLoading.value = false
      isFiltersLoading.value = false
    }, 500)
  } finally {
    // In case we didn't set a timeout above, make sure to clear the loading state
    if (isLoading.value) {
      setTimeout(() => {
        isLoading.value = false
        isFiltersLoading.value = false
      }, 500)
    }
  }
}

// Create dynamic filters from branch headers
const createDynamicFilters = () => {
  if (!branchHeaders.value.length) return

  // Convert headers to filters, excluding technical fields, emails and sr_number related fields
  const excludedFields = [
    'id',
    'uuid',
    'client_id',
    'created_at',
    'updated_at',
    'emails',
    'sr_number',
    'sr___',
    'branch_manager_email',
    'branch_manager',
    'area_manager_email',
    'region_manager_email',
    'email',
    'manager_email',
    'email_address'
  ]

  console.log('Excluding these fields from filters:', excludedFields)
  console.log(
    'Available headers:',
    branchHeaders.value.map((h) => h.field || 'unknown')
  )

  // Filter out the excluded headers and create filter options
  dynamicFilters.value = branchHeaders.value
    .filter((header) => {
      console.log('header', header)
      // Check if header has field property
      if (!header || !header.field) {
        console.log('Invalid header object:', header)
        return false
      }

      // Check for email-related fields using partial match
      const isEmailField = header.field.toLowerCase().includes('email')
      const isSerialNumberField =
        header.field.toLowerCase().includes('sr_') || header.field.toLowerCase().includes('serial')

      const shouldExclude =
        excludedFields.includes(header.field) || isEmailField || isSerialNumberField

      if (shouldExclude) {
        console.log('Excluding field from filters:', header.field)
      }
      return !shouldExclude
    })
    .map((header) => ({
      field: header.field,
      label: header.headerName || header.field
    }))

  // Initialize filter values for each field
  dynamicFilters.value.forEach((filter) => {
    // Initialize filter state
    filterValues.value[filter.field] = ''
    lockedFilters.value[filter.field] = false // Initialize as unlocked
  })

  // Server provides filter options, no need to extract from local data

  console.log('Dynamic filters created:', dynamicFilters.value)
  console.log('Unique filter values:', uniqueFilterValues.value)
  console.log('Available filters (after filtering):', availableFilters.value)

  // Debug: Check for similar field names that might cause confusion
  const branchRelatedFilters = dynamicFilters.value.filter(
    (f) =>
      f.field.toLowerCase().includes('branch') ||
      f.field.toLowerCase().includes('name') ||
      f.field.toLowerCase().includes('code')
  )
  if (branchRelatedFilters.length > 0) {
    console.log(
      '🔍 Branch-related filters found:',
      branchRelatedFilters.map((f) => `${f.field} (${f.label})`)
    )
  }
}

// Computed: Show all dynamic filters (even without server options)
const availableFilters = computed(() => {
  if (!dynamicFilters.value || dynamicFilters.value.length === 0) return []

  const filtersWithOptions = [] as string[]
  const filtersWithoutOptions = [] as string[]

  dynamicFilters.value.forEach((filter) => {
    const hasOptions =
      uniqueFilterValues.value &&
      uniqueFilterValues.value[filter.field] &&
      uniqueFilterValues.value[filter.field].length > 0
    if (hasOptions) {
      filtersWithOptions.push(filter.field)
    } else {
      filtersWithoutOptions.push(filter.field)
    }
  })

  console.log('🟢 Filters WITH options from server:', filtersWithOptions)
  console.log('🔴 Filters WITHOUT options from server:', filtersWithoutOptions)

  // Return ALL dynamic filters, regardless of whether they have server options
  return dynamicFilters.value
})

// Stats - Convert to reactive refs to ensure proper updates
const totalReports = ref(0)
const averageScore = ref(0)
const completionRate = ref(0)

// Debounce timer for filter changes
let filterDebounceTimer: ReturnType<typeof setTimeout> | null = null

// Server-provided top/bottom reports (populated from backend ranking)
const serverTopReports = ref<any[]>([])
const serverBottomReports = ref<any[]>([])

const topReportsByScore = computed(() => serverTopReports.value || [])
const bottomReportsByScore = computed(() => serverBottomReports.value || [])

// (Removed) Calculate functions - now using server-provided metrics

// Apply a filter with cascading functionality (debounced)
const applyFilter = (field: string, value: string) => {
  // Immediate synchronous updates for instant UI feedback
  const timestamp = performance.now()
  console.log(`⚡ [${timestamp.toFixed(0)}ms] Filter change START: ${field} = ${value}`)

  // Handle the empty value case for "Select any" option
  selectedFilters.value[field] = value === '' ? '' : value

  // Update locked state immediately
  if (value !== '') {
    lockedFilters.value[field] = true
    console.log(`🔒 [${(performance.now() - timestamp).toFixed(0)}ms] Filter ${field} locked`)
  } else {
    lockedFilters.value[field] = false
    console.log(`🔓 [${(performance.now() - timestamp).toFixed(0)}ms] Filter ${field} unlocked`)
  }

  // Clear any existing debounce timer
  if (filterDebounceTimer) {
    clearTimeout(filterDebounceTimer)
    console.log(`⏱️  Cancelled previous filter request`)
  }

  // Debounce the actual API call (200ms - optimized)
  filterDebounceTimer = setTimeout(async () => {
    console.log(
      `🔄 [${(performance.now() - timestamp).toFixed(0)}ms] Fetching data with filters:`,
      selectedFilters.value
    )

    // Set loading states only when we're about to make the actual call
    isLoading.value = true
    isStatsLoading.value = true
    isChartsLoading.value = true

    try {
      await fetchReports(false)
      console.log(
        `✅ [${(performance.now() - timestamp).toFixed(0)}ms] Filter applied successfully`
      )
    } catch (error) {
      console.error('Error applying filter:', error)
    } finally {
      isLoading.value = false
      isStatsLoading.value = false
      isChartsLoading.value = false
    }
  }, 200)
}

// (Removed) Client-side cascading filters now handled by backend round-trip

// (Removed) Client-side clearing of cascading filters; server returns options

// Month helpers to avoid browser-specific Date parsing differences
// (Removed) MONTH_NAMES, buildMonthYear, deriveMonthYearFromAny, deriveMonthYearFromReport, getReportFieldValue - server provides all normalized fields

// Clear filters
const clearFilters = async () => {
  // Clear all filter selections and unlock all filters
  selectedFilters.value = {}

  // Reset all filter value selections and unlock all filters
  Object.keys(filterValues.value).forEach((key) => {
    filterValues.value[key] = ''
    lockedFilters.value[key] = false // Unlock all filters
  })

  console.log('🔓 All filters unlocked and cleared')

  // Server provides filter options on fetch, no need to update locally

  // Set loading state
  isLoading.value = true
  isStatsLoading.value = true
  isChartsLoading.value = true

  try {
    // Refresh reports with cleared filters and force refresh
    await fetchReports(true)
  } catch (error) {
    console.error('Error clearing filters:', error)
  } finally {
    isLoading.value = false
    isStatsLoading.value = false
    isChartsLoading.value = false
  }
}

// Check if a filter was auto-selected (has value but user didn't manually select it)
const isAutoSelected = (field: string): boolean => {
  // A filter is auto-selected if it has a value and is NOT locked (manually selected)
  const hasValue = Boolean(filterValues.value[field] && filterValues.value[field] !== '')
  const isNotLocked = !lockedFilters.value[field]
  const otherFiltersWithValues = Object.keys(filterValues.value).filter(
    (key) => key !== field && Boolean(filterValues.value[key] && filterValues.value[key] !== '')
  )
  return hasValue && isNotLocked && otherFiltersWithValues.length > 0
}

// Check if a filter is locked (manually selected by user)
const isLockedFilter = (field: string): boolean => {
  return Boolean(
    lockedFilters.value[field] && filterValues.value[field] && filterValues.value[field] !== ''
  )
}

// Check if current user is a call center user (username/email contains "call")
const isCallCenterUser = computed(() => {
  const authStore = Auth()

  // Ensure user data is loaded before checking
  if (!authStore.user) {
    console.log('🔍 User data not yet loaded in isCallCenterUser')
    return false
  }

  const userEmail = authStore.user?.email || ''
  const isCallUser = userEmail.toLowerCase().includes('call')
  console.log(`🔍 isCallCenterUser check: email="${userEmail}", isCallUser=${isCallUser}`)
  return isCallUser
})

// Function to get call number from report
const getCallNumber = (report: any): string => {
  try {
    // Try direct field first
    // if (report.call_number) return report.call_number

    // Try from content
    if (report.content) {
      const content =
        typeof report.content === 'string' ? JSON.parse(report.content) : report.content

      // Check selectedFieldValues
      if (content.selectedFieldValues?.call_number) {
        const callValue = content.selectedFieldValues.call_number
        if (typeof callValue === 'object') {
          return callValue.value || callValue.name || callValue.label || callValue
        }
        return callValue
      }

      console.log('content_live', content)

      // Check direct content fields
      if (content.call_number) return content.call_number
      if (content.data?.call_number) return content.data.call_number
      if (content.form_data?.call_number) return content.form_data.call_number
    } else if (report.call_number) return report.call_number
  } catch (error) {
    console.error('Error getting call number:', error)
  }
  return ''
}

// Server-driven: filteredReports is what server returned
const filteredReports = computed(() => {
  if (!allReports.value || allReports.value.length === 0) return []
  return allReports.value
})

// Check if any filters are applied
const hasActiveFilters = computed(() => {
  return Object.values(selectedFilters.value).some((value) => !!value)
})

// Server-provided filter counts
const filteredFilterCounts = computed(() => {
  return serverFilterCounts.value || {}
})

// Extract unique branches and report types
const branches = computed(() => {
  if (!allReports.value || allReports.value.length === 0) return []
  const branchValues = allReports.value
    .map((report) => report.branch || report.branch_name)
    .filter(Boolean)
  return [...new Set(branchValues)]
})

// Add these variables to the script section:
const timeframeFilter = ref('month')
const categoryFilter = ref('All Reports')

// Add these methods to handle filter changes
const handleTimeframeChange = () => {
  isLoading.value = true
  setTimeout(() => {
    isLoading.value = false
  }, 300)
}
// (Removed) Stats watcher - now using server-provided metrics

// Watch for changes to branch_name filter values for debugging
watch(
  () => uniqueFilterValues.value.branch_name,
  (newValues, oldValues) => {
    if (newValues && newValues.length > 0) {
      console.log('🔄 BRANCH_NAME FILTER VALUES CHANGED:')
      console.log('  Old values:', oldValues)
      console.log('  New values:', newValues)
      console.log('  New values length:', newValues.length)
      console.log('  First 5 new values:', newValues.slice(0, 5))
      console.trace('Stack trace for branch_name change:')
    }
  },
  { deep: true }
)

// Watch for auth state changes to ensure call center user detection works after page refresh
watch(
  () => Auth().user,
  (newUser, oldUser) => {
    console.log('🔄 Auth user changed:', { oldUser: oldUser?.email, newUser: newUser?.email })
    console.log(`🎯 Updated call center user status: ${isCallCenterUser.value}`)
  },
  { immediate: true }
)

onMounted(async () => {
  console.log('🚀 ClientDashboard mounted - initializing...')

  // Clear filter state first to prevent stale data
  clearFilterState()

  // Initialize auth store first to ensure user data is available
  const authStore = Auth()
  await authStore.init()

  // CRITICAL: Construct axios instance after auth initialization
  if (!authStore.xios?.get) {
    console.log('🔧 Constructing auth axios instance after init...')
    await authStore.construct_xios()
    console.log('✅ Auth axios instance constructed')
  }

  console.log('🔍 Initial auth state:', authStore.user)

  // If user data is not loaded, try to initialize it
  if (!authStore.user) {
    console.log('🔄 User data not found, attempting to initialize auth...')
    try {
      await authStore.init()
      console.log('✅ Auth initialized, user:', authStore.user)

      // Construct axios instance after auth initialization
      if (!authStore.xios?.get) {
        console.log('🔧 Constructing initial auth axios instance...')
        await authStore.construct_xios()
        console.log('✅ Initial auth axios instance ready')
      }
    } catch (error) {
      console.error('❌ Auth initialization failed:', error)
    }
  } else {
    // Even if user exists, ensure axios is available
    if (!authStore.xios?.get) {
      console.log('🔧 User exists but axios missing, constructing...')
      try {
        await authStore.construct_xios()
        console.log('✅ Auth axios instance constructed')
      } catch (error) {
        console.error('❌ Failed to construct auth axios:', error)
      }
    }
  }

  // Log call center user status after auth is ready
  console.log(`🎯 Call center user status: ${isCallCenterUser.value}`)

  // Initialize client store with robust error handling and timing
  const clientStore = Client()
  console.log('🔄 Initializing client store...')

  let clientInitialized = false
  let retryCount = 0
  const maxRetries = 3

  const initializeClientWithRetry = async () => {
    while (!clientInitialized && retryCount < maxRetries) {
      try {
        console.log(`🔄 Client store initialization attempt ${retryCount + 1}/${maxRetries}`)

        // Ensure auth store is fully ready before client initialization
        const authStore = Auth()

        // First ensure auth is initialized
        if (!authStore.user || !authStore.token) {
          console.log('⏳ Auth not ready, initializing...')
          await authStore.init()
        }

        // Then ensure axios instance is constructed
        if (!authStore.xios?.get) {
          console.log('⏳ Constructing auth store axios instance...')
          await authStore.construct_xios()
          console.log('✅ Auth axios instance ready')
        }

        // Always call init first to restore from cookies or load fresh data
        await clientStore.init()

        const hasClient = !!(clientStore.selected_client?.uuid || clientStore.selected_client?.id)
        console.log('✅ Client store initialized:', {
          hasClient,
          clientId: clientStore.selected_client?.uuid || clientStore.selected_client?.id,
          clientName: clientStore.selected_client?.name || clientStore.selected_client?.domain_name
        })

        if (hasClient) {
          clientInitialized = true
        } else {
          retryCount++
          if (retryCount < maxRetries) {
            console.log(`⏳ No client found, retrying in ${retryCount}s...`)
            await new Promise((resolve) => setTimeout(resolve, retryCount * 1000))
          }
        }
      } catch (error) {
        console.error(`❌ Client store initialization attempt ${retryCount + 1} failed:`, error)
        retryCount++
        if (retryCount < maxRetries) {
          console.log(`⏳ Retrying in ${retryCount}s...`)
          await new Promise((resolve) => setTimeout(resolve, retryCount * 1000))
        }
      }
    }
    return clientInitialized
  }

  try {
    const success = await initializeClientWithRetry()

    if (!success) {
      console.error('❌ Client store initialization failed after all retries')
      // Still try to continue with fallback behavior
    }

    // Then refresh to get the latest custom labels if we have a client
    if (
      clientInitialized &&
      (clientStore.selected_client?.uuid || clientStore.selected_client?.id)
    ) {
      console.log('🔄 Refreshing client data for latest custom labels...')
      await clientStore.refreshSelectedClient()
      console.log('✅ Client data refreshed with custom labels')
    }
  } catch (error) {
    console.error('❌ Client store initialization wrapper failed:', error)
  }

  // Initialize ranges store for performance colors
  console.log('🎨 Initializing ranges store for performance colors...')
  try {
    const rangesStore = Ranges()
    await rangesStore.init()
    await rangesStore.fetch()
    console.log('✅ Ranges store initialized with', rangesStore.ranges_data?.length || 0, 'ranges')
  } catch (error) {
    console.error('❌ Ranges store initialization failed:', error)
    console.log('🔄 Will use system-generated colors as fallback')
  }

  // Initialize the filter with all branches and report types
  clientFilter.setBranches(branches.value)

  // Only fetch branch data if we have a valid client
  const clientId = clientStore.selected_client?.uuid || clientStore.selected_client?.id
  if (clientId) {
    console.log(`✅ Client available (${clientId}), fetching branch data...`)
    await fetchBranchData()
  } else {
    console.error('❌ No client available after all initialization attempts')
    console.error('This may require manual client selection or indicates a deeper auth issue')
  }

  // Fetch approved reports for this client with force refresh
  // Server provides filter options, no need to update from reports
  fetchReports(true)
})

// Clear filter state to prevent stale data
const clearFilterState = () => {
  console.log('🧹 Clearing filter state to prevent stale data...')
  selectedFilters.value = {}
  lockedFilters.value = {}
  filterValues.value = {}
  uniqueFilterValues.value = {}
  isCascadingMode.value = false
  console.log('✅ Filter state cleared')
}

// Add manual refresh function for debugging
const refreshFilters = async () => {
  console.log('Manually refreshing from server...')

  // Re-fetch from server to get latest filter options
  isLoading.value = true
  try {
    await fetchReports(true)
    console.log('✅ Data refreshed from server with latest filter options')
  } catch (error) {
    console.error('Error refreshing filters:', error)
  } finally {
    isLoading.value = false
  }
}
// NEW: Function to get month from date
const getReportMonth = (report: any): string => {
  try {
    // First try to get date from content
    if (report.content) {
      let content = report.content
      if (typeof content === 'string') {
        content = JSON.parse(content)
      }

      if (content.date) {
        const date = new Date(content.date)
        if (!isNaN(date.getTime())) {
          return date.toLocaleString('default', { month: 'long' })
        }
      }

      // Try selectedFieldValues for date
      if (content.selectedFieldValues) {
        for (const key of ['date', 'visit_date', 'audit_date', 'inspection_date']) {
          if (content.selectedFieldValues[key]) {
            const dateValue =
              content.selectedFieldValues[key].value || content.selectedFieldValues[key]
            if (dateValue) {
              const date = new Date(dateValue)
              if (!isNaN(date.getTime())) {
                return date.toLocaleString('default', { month: 'long' })
              }
            }
          }
        }
      }
    }

    // Fallback to report date or created_at
    const date = new Date(report.date || report.created_at)
    if (!isNaN(date.getTime())) {
      return date.toLocaleString('default', { month: 'long' })
    }
  } catch (error) {
    console.error('Error getting month:', error)
  }
  return 'N/A'
}

// NEW: Function to get formatted date
const getReportDate = (report: any): string => {
  try {
    // First try to get date from content
    if (report.content) {
      let content = report.content
      if (typeof content === 'string') {
        content = JSON.parse(content)
      }

      if (content.date) {
        const date = new Date(content.date)
        if (!isNaN(date.getTime())) {
          const day = date.getDate().toString().padStart(2, '0')
          const month = (date.getMonth() + 1).toString().padStart(2, '0')
          const year = date.getFullYear()
          return `${day}/${month}/${year}`
        }
      }

      // Try selectedFieldValues for date
      if (content.selectedFieldValues) {
        for (const key of ['date', 'visit_date', 'audit_date', 'inspection_date']) {
          if (content.selectedFieldValues[key]) {
            const dateValue =
              content.selectedFieldValues[key].value || content.selectedFieldValues[key]
            if (dateValue) {
              // If already formatted, return as is
              if (typeof dateValue === 'string' && dateValue.includes('/')) {
                return dateValue
              }

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
    }

    // Fallback to report date or created_at
    const date = new Date(report.date || report.created_at)
    if (!isNaN(date.getTime())) {
      const day = date.getDate().toString().padStart(2, '0')
      const month = (date.getMonth() + 1).toString().padStart(2, '0')
      const year = date.getFullYear()
      return `${day}/${month}/${year}`
    }
  } catch (error) {
    console.error('Error getting date:', error)
  }
  return 'N/A'
}

// NEW: Function to get branch name
const getBranchName = (report: any): string => {
  // Backend now normalizes branch_name; avoid heavy parsing
  return report.branch_name || report.primary_field_value || report.branch || 'Unknown Branch'
}

// NEW: Function to get report type
const getReportType = (report: any): string => {
  return report.type || report.report_type || report.template_name || 'Unknown Type'
}

// Fatal Error Detection Functions
const isFatalErrorSection = (section: any): boolean => {
  const sectionName =
    section?.heading?.toLowerCase() ||
    section?.name?.toLowerCase() ||
    section?.title?.toLowerCase() ||
    ''
  return sectionName.includes('fatal error')
}

const checkSectionFatalError = (section: any): boolean => {
  const hasFatalErrorInName = isFatalErrorSection(section)
  if (!hasFatalErrorInName) return false

  // Check if any question in this section has a "yes" response
  const questions = section.data || section.questions || []
  return questions.some((question: any) => {
    // Check various possible answer field names and formats
    const answer = (question.answer || question.response || question.value || '')
      .toString()
      .toLowerCase()
      .trim()
    return answer === 'yes' || answer === 'true' || answer === '1'
  })
}

const checkReportHasFatalError = (report: any): boolean => {
  if (!report || !report.content) return false

  try {
    // Parse content if it's a string
    const content = typeof report.content === 'string' ? JSON.parse(report.content) : report.content
    // Check report content for fatal error sections with "yes" responses
    const sections = content?.reports || content?.sections || []
    return sections.some((section: any) => checkSectionFatalError(section))
  } catch (error) {
    console.error('Error parsing report content for fatal error check:', error)
    return false
  }
}
// NEW: Function to view report - navigate to report view page
const viewReport = (report: any) => {
  if (report?.id) {
    const reportId = report.id
    const tableId = report.table
    const tableQuery = tableId ? `?table=${tableId}` : ''

    // Use router to navigate to the report view page
    router.push(`/client/user-reports/view/${reportId}${tableQuery}`)
  }
}

// NEW: Function to view media - navigate to media pages
const viewMedia = (reportId: string | number, mediaType: string, report?: any) => {
  if (reportId) {
    console.log('viewMedia', reportId, mediaType, window.location.href)

    // Get current client ID to pass to the new tab
    const clientId = Client().selected_client?.uuid || Client().selected_client?.id

    // Use router to navigate to the appropriate media page based on type
    if (mediaType === 'video') {
      // Open video in new tab with client_id parameter
      const videoUrl = router.resolve({
        path: `/client/report/${reportId}/video`,
        query: clientId ? { client_id: clientId } : {}
      }).href
      window.open(videoUrl, '_blank')
    } else if (mediaType === 'picture') {
      router.push(`/client/report/${reportId}/pictures`)
    } else if (mediaType === 'audio') {
      router.push(`/client/report/${reportId}/audio`)
    } else if (mediaType === 'pdf') {
      // Debug logging
      console.log('=== PDF Button Clicked (Dashboard) ===')
      console.log('Full report data:', report)
      console.log('media_links:', report?.media_links)
      console.log('pdf_url from media_links:', report?.media_links?.pdf_url)
      console.log('pdf_url direct:', report?.pdf_url)
      
      // Download PDF if available
      const pdfUrl = report?.media_links?.pdf_url || report?.pdf_url
      
      console.log('Final PDF URL:', pdfUrl)
      
      if (pdfUrl) {
        console.log('Downloading PDF:', pdfUrl)
        
        // Create a temporary link element to trigger download
        const link = document.createElement('a')
        link.href = pdfUrl
        link.download = `Report_${reportId || 'download'}.pdf`
        link.target = '_blank'
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
      } else {
        console.warn('No PDF URL available for this report')
        console.warn('Available keys in report:', Object.keys(report || {}))
      }
    }
  }
}

// (Removed) getParsedContent, cleanFilterValue - server provides all parsed/normalized fields

const gridColsClass = computed(() => {
  const len = availableFilters.value.length
  const cols = len >= 12 ? 12 : len || 1 // fallback to 1 if empty
  return [`md:grid-cols-${cols}`, `lg:grid-cols-${cols}`]
})
</script>

<template>
  <DefaultLayout>
    <!-- Initial loading state -->
    <div
      v-if="isReportsLoading && allReports.length === 0"
      class="fixed inset-0 bg-gradient-to-r from-blue-50 to-indigo-50 flex items-center justify-center z-50"
    >
      <Loader size="lg" text="Loading dashboard data..." />
    </div>

    <!-- Breadcrumb Start -->
    <BreadcrumbDefault :pageTitle="pageTitle" />
    <!-- Breadcrumb End -->

    <div class="mt-4 mb-6">
      <div class="flex justify-between items-center">
        <h2 class="text-xl font-bold text-gray-800">
          Performance Overview --
          <span class="text-xs text-gray-600">Check your performance here</span>
        </h2>
        <!-- Clear Filters Button -->
        <div class="flex justify-end mt-2">
          <Transition name="bounce">
            <button
              v-if="hasActiveFilters"
              @click="clearFilters"
              class="dark:bg-[#008ffb] text-[#455984] dark:text-white py-2 px-5 rounded-md block transition-all duration-300 hover:bg-[#455984] dark:hover:bg-white dark:hover:text-[#008ffb] hover:text-white border-2 border-[#455984] mr-2"
            >
              Clear Filters
            </button>
          </Transition>
          <!-- Debug button for refreshing filters -->
          <button
            @click="refreshFilters"
            class="bg-gray-200 text-gray-700 py-2 px-4 rounded-md transition-all duration-300 hover:bg-gray-300 text-sm mr-2"
            title="Debug: Refresh filter values from approved reports"
          >
            🔄 Refresh Filters
          </button>
          <!-- Force refresh button to clear cache -->
          <button
            @click="() => fetchReports(true)"
            class="bg-blue-200 text-blue-700 py-2 px-4 rounded-md transition-all duration-300 hover:bg-blue-300 text-sm mr-2"
            title="Force refresh: Clear cache and reload all data"
          >
            🔄 Force Refresh
          </button>
          <!-- Debug button for showing raw data -->
          <!-- <button
        @click="debugReportData"
        class="bg-yellow-200 text-yellow-800 py-2 px-4 rounded-md transition-all duration-300 hover:bg-yellow-300 text-sm"
        title="Debug: Show raw report data in console"
      >
        🔍 Debug Data
      </button> -->
        </div>
      </div>
    </div>

    <!-- Message display for API responses -->
    <div
      id="dashboard-message"
      class="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6 hidden"
      role="alert"
    >
      <p class="font-medium">Notice</p>
      <p>
        No reports found for your branch assignments. Please contact your administrator if this is
        unexpected.
      </p>
    </div>

    <!-- Dynamic Filters Section -->
    <div
      class="grid md:grid-cols-3 sm:grid-cols-2 grid-cols-1 justify-between gap-4 flex-wrap"
      :class="gridColsClass"
    >
      <!-- Loading state for filters -->
      <template v-if="isFiltersLoading"> </template>

      <!-- Actual filters -->
      <template v-else>
        <div v-for="filter in availableFilters" :key="filter.field" class="mb-4">
          <label
            :for="`filter-${filter.field}`"
            class="block text-base font-bold text-gray-900 dark:text-white ml-2 mb-1"
          >
            {{ filter.label }}
            <!-- Locked filter indicator -->
            <span
              v-if="isLockedFilter(filter.field)"
              class="ml-2 text-xs bg-green-100 text-green-600 px-2 py-1 rounded-full"
              title="Manually selected and locked"
            >
              🔒 Locked
            </span>
            <!-- Auto-selected indicator -->
            <span
              v-else-if="isAutoSelected(filter.field)"
              class="ml-2 text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded-full"
              title="Auto-selected based on other filters"
            >
              🔗 Auto
            </span>
          </label>
          <select
            :id="`filter-${filter.field}`"
            :value="filterValues[filter.field]"
            @change="
              (e: Event) => {
                const target = e.target as HTMLSelectElement
                const newValue = target.value
                filterValues[filter.field] = newValue
                applyFilter(filter.field, newValue)
              }
            "
            :class="[
              'mt-1 block w-full rounded-md shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50 p-2 transition-all duration-200',
              isLockedFilter(filter.field)
                ? 'border-green-400 bg-green-50 font-semibold'
                : isAutoSelected(filter.field)
                  ? 'border-blue-300 bg-blue-50'
                  : 'border-gray-300 bg-white'
            ]"
          >
            <option value="">Select any {{ filter.label }}</option>
            <option
              v-for="value in (uniqueFilterValues[filter.field] || []).slice(0, 500)"
              :key="value"
              :value="value"
            >
              {{ value }}
            </option>
            <option v-if="(uniqueFilterValues[filter.field] || []).length > 500" disabled>
              ... and {{ (uniqueFilterValues[filter.field] || []).length - 500 }} more (use search
              to find)
            </option>
          </select>
          <!-- Show count of available options -->
          <div class="text-xs text-gray-500 mt-1 ml-2">
            {{ filteredFilterCounts[filter.field] || 0 }} unique values in current results
          </div>
        </div>
      </template>
    </div>

    <!-- Additional Metrics Cards - Rearranged with Average in the last card -->
    <div class="grid grid-cols-1 gap-4 mt-4 mb-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
      <!-- Loading state for metrics cards -->
      <template v-if="isStatsLoading">
        <div
          v-for="n in 5"
          :key="n"
          class="p-5 bg-white border border-gray-100 rounded-xl shadow-md animate-pulse"
        >
          <div class="flex items-center">
            <div class="flex-shrink-0 w-12 h-12 bg-gray-200 rounded-lg"></div>
            <div class="ml-4 flex-1">
              <div class="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div class="h-6 bg-gray-200 rounded w-1/2"></div>
            </div>
          </div>
        </div>
      </template>

      <!-- Actual metrics cards -->
      <template v-else>
        <!-- Completed Branches Card -->
        <div
          class="p-5 bg-white border border-gray-100 rounded-xl shadow-md hover:shadow-lg transition-all"
        >
          <div class="flex items-center">
            <div
              class="flex items-center justify-center flex-shrink-0 w-12 h-12 text-green-500 bg-green-100 rounded-lg"
            >
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                ></path>
              </svg>
            </div>
            <div class="ml-4">
              <h2 class="text-sm font-medium text-gray-600">{{ completedBranchesLabel }}</h2>
              <p class="text-2xl font-semibold text-gray-900">{{ totalReports }}</p>
            </div>
          </div>
        </div>

        <!-- Total Branches Card -->
        <div
          class="p-5 bg-white border border-gray-100 rounded-xl shadow-md hover:shadow-lg transition-all"
        >
          <div class="flex items-center">
            <div
              class="flex items-center justify-center flex-shrink-0 w-12 h-12 text-blue-500 bg-blue-100 rounded-lg"
            >
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                ></path>
              </svg>
            </div>
            <div class="ml-4">
              <h2 class="text-sm font-medium text-gray-600">{{ totalBranchesLabel }}</h2>
              <p class="text-2xl font-semibold text-gray-900">{{ totalReports }}</p>
            </div>
          </div>
        </div>

        <!-- Progress Card -->
        <div
          class="p-5 bg-white border border-gray-100 rounded-xl shadow-md hover:shadow-lg transition-all"
        >
          <div class="flex items-center">
            <div
              class="flex items-center justify-center flex-shrink-0 w-12 h-12 text-purple-500 bg-purple-100 rounded-lg"
            >
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                ></path>
              </svg>
            </div>
            <div class="ml-4">
              <h2 class="text-sm font-medium text-gray-600">Progress</h2>
              <p class="text-2xl font-semibold text-gray-900">
                {{ totalReports }} / {{ totalReports }}
              </p>
            </div>
          </div>
        </div>

        <!-- Completion Percentage Card -->
        <div
          class="p-5 bg-white border border-gray-100 rounded-xl shadow-md hover:shadow-lg transition-all"
        >
          <div class="flex items-center">
            <div
              class="flex items-center justify-center flex-shrink-0 w-12 h-12 text-indigo-500 bg-indigo-100 rounded-lg"
            >
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                ></path>
              </svg>
            </div>
            <div class="ml-4">
              <h2 class="text-sm font-medium text-gray-600">Completion Rate</h2>
              <p class="text-2xl font-semibold text-gray-900">
                {{
                  uniqueBranchesCount > 0 ? ((totalReports / totalReports) * 100).toFixed(1) : 0
                }}%
              </p>
            </div>
          </div>
        </div>

        <!-- Average Score Card (Last Card) -->
        <div
          class="p-5 bg-white border border-gray-100 rounded-xl shadow-md hover:shadow-lg transition-all"
        >
          <div class="flex items-center">
            <div
              class="flex items-center justify-center flex-shrink-0 w-12 h-12 rounded-lg"
              :style="{
                color: useColorsScore().getRangeBasedPerformance(averageScore).color,
                backgroundColor:
                  useColorsScore().getRangeBasedPerformance(averageScore).color + '20'
              }"
            >
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
                ></path>
              </svg>
            </div>
            <div class="ml-4">
              <h2 class="text-sm font-medium text-gray-600">Average Score</h2>
              <p
                class="text-2xl font-semibold"
                :style="{
                  color:
                    averageScore === 0
                      ? '#6b7280'
                      : useColorsScore().getRangeBasedPerformance(averageScore).color
                }"
              >
                {{ averageScore }}%
              </p>
            </div>
          </div>
        </div>
      </template>
    </div>

    <!-- Top Reports by Score - Enhanced with comprehensive table -->
    <div
      class="rounded-sm border border-stroke bg-white p-5 shadow-default dark:border-strokedark dark:bg-boxdark mb-6"
    >
      <div class="mb-4 flex justify-between items-center">
        <h4 class="text-xl font-semibold text-black dark:text-white">Top Reports by Score</h4>
        <span class="text-xs text-gray-500"
          >Showing top {{ Math.min(topReportsByScore.length, 5) }} of
          {{ allReports.length }} reports</span
        >
      </div>

      <!-- Enhanced Table with same structure as user-reports -->
      <div class="overflow-x-auto">
        <table class="w-full table-auto">
          <thead>
            <tr class="bg-gray-50 text-left dark:bg-meta-4">
              <th class="py-3 px-4 font-medium text-black dark:text-white text-center">Sr.</th>
              <th class="py-3 px-4 font-medium text-black dark:text-white">Month</th>
              <th class="py-3 px-4 font-medium text-black dark:text-white">{{ visitDateLabel }}</th>
              <th class="py-3 px-4 font-medium text-black dark:text-white">{{ branchLabel }}</th>
              <th class="py-3 px-4 font-medium text-black dark:text-white">Overall Performance</th>
              <th class="py-3 px-4 font-medium text-black dark:text-white text-center">Media</th>
              <th class="py-3 px-4 font-medium text-black dark:text-white text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            <!-- Loading state -->
            <tr v-if="isReportsLoading && allReports.length > 0">
              <td colspan="7" class="py-8 px-4 text-center">
                <div class="flex flex-col items-center justify-center">
                  <Loader size="md" text="Loading reports..." />
                </div>
              </td>
            </tr>

            <!-- Reports data -->
            <tr
              v-for="(report, index) in topReportsByScore"
              :key="report.id"
              class="hover:bg-gray-50 dark:hover:bg-meta-4 transition-colors cursor-pointer"
              @click="viewReport(report)"
            >
              <!-- Sr. Number -->
              <td class="py-3 px-4 border-b border-[#eee] text-center">
                <span class="font-medium text-gray-900 dark:text-white">{{ index + 1 }}</span>
              </td>

              <!-- Month -->
              <td class="py-3 px-4 border-b border-[#eee]">
                <span class="text-sm text-gray-700 dark:text-gray-300">
                  {{ getReportMonth(report) }}
                </span>
              </td>

              <!-- Date of Visit -->
              <td class="py-3 px-4 border-b border-[#eee]">
                <div
                  class="px-2 py-1 bg-blue-50 text-blue-800 rounded text-center text-xs font-medium inline-block"
                >
                  {{ getReportDate(report) }}
                </div>
              </td>

              <!-- Branch -->
              <td class="py-3 px-4 border-b border-[#eee]">
                <!-- Show call number for call center users -->
                <div v-if="isCallCenterUser" class="font-medium text-gray-900 dark:text-white">
                  📞 {{ getCallNumber(report) }}
                </div>
                <div v-else class="font-medium text-gray-900 dark:text-white">
                  {{ getBranchName(report) }}
                </div>
                <div class="text-xs text-gray-500 dark:text-gray-400">
                  {{ getReportType(report) }}
                </div>
              </td>

              <!-- Overall Performance -->
              <td class="py-3 px-4 border-b border-[#eee]">
                <div
                  v-if="checkReportHasFatalError(report)"
                  class="px-3 py-2 rounded text-center font-medium text-sm flex items-center justify-center text-white bg-red-600"
                >
                  <span>⚠️ FATAL ERROR</span>
                </div>
                <div
                  v-else
                  class="px-3 py-2 rounded text-center font-medium text-sm flex items-center justify-center text-white"
                  :style="{
                    backgroundColor: useColorsScore().getRangeBasedPerformance(report.score).color,
                    color: useColorsScore().isLightColor(
                      useColorsScore().getRangeBasedPerformance(report.score).color
                    )
                      ? '#1f2937'
                      : '#ffffff'
                  }"
                >
                  <span
                    >{{ useColorsScore().getPerformanceEmoji(report.score) }}
                    {{ report.score }}%</span
                  >
                </div>
              </td>

              <!-- Media -->
              <td class="py-3 px-4 border-b border-[#eee]">
                <div class="flex justify-center gap-2">
                  <!-- Video Button -->
                  <button
                    @click.stop="viewMedia(report.id, 'video')"
                    class="flex items-center justify-center p-1.5 rounded bg-blue-50 hover:bg-blue-100 transition-all cursor-pointer shadow-sm"
                    title="View video records for this report (opens in new tab)"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke-width="1.5"
                      stroke="currentColor"
                      class="w-5 h-5 text-blue-500"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M12 18.75H4.5a2.25 2.25 0 0 1-2.25-2.25V9m12.841 9.091L16.5 19.5m-1.409-1.409c.407-.407.659-.97.659-1.591v-9a2.25 2.25 0 0 0-2.25-2.25h-9c-.621 0-1.184.252-1.591.659m12.182 12.182L2.909 5.909M1.5 4.5l1.409 1.409"
                      />
                    </svg>
                  </button>

                  <!-- Picture Button -->
                  <button
                    @click.stop="viewMedia(report.id, 'picture')"
                    class="flex items-center justify-center p-1.5 rounded bg-blue-50 hover:bg-blue-100 transition-all cursor-pointer shadow-sm"
                    title="View pictures for this report"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke-width="1.5"
                      stroke="currentColor"
                      class="w-5 h-5 text-blue-500"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z"
                      />
                    </svg>
                  </button>

                  <!-- Audio Button -->
                  <button
                    @click.stop="viewMedia(report.id, 'audio')"
                    class="flex items-center justify-center p-1.5 rounded bg-blue-50 hover:bg-blue-100 transition-all cursor-pointer shadow-sm"
                    title="Listen to audio recordings for this report"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke-width="1.5"
                      stroke="currentColor"
                      class="w-5 h-5 text-blue-500"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        d="M19.114 5.636a9 9 0 0 1 0 12.728M16.463 8.288a5.25 5.25 0 0 1 0 7.424M6.75 8.25l4.72-4.72a.75.75 0 0 1 1.28.53v15.88a.75.75 0 0 1-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.009 9.009 0 0 1 2.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75Z"
                      />
                    </svg>
                  </button>

                  <!-- PDF Button -->
                  <button
                    @click.stop="viewMedia(report.id, 'pdf', report)"
                    class="flex items-center justify-center p-1.5 rounded bg-blue-50 hover:bg-blue-100 transition-all cursor-pointer shadow-sm"
                    title="Download PDF"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke-width="1.5"
                      stroke="currentColor"
                      class="w-5 h-5 text-blue-500"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
                      />
                    </svg>
                  </button>
                </div>
              </td>

              <!-- Actions -->
              <td class="py-3 px-4 border-b border-[#eee]">
                <div class="flex justify-center gap-2">
                  <button
                    @click.stop="viewReport(report)"
                    class="bg-black hover:bg-gray-800 text-white rounded py-1.5 px-3 flex items-center justify-center gap-1.5 transition-all shadow-sm text-xs"
                    title="View Full Report"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      class="w-4 h-4"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"
                      />
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                    </svg>
                    View
                  </button>
                </div>
              </td>
            </tr>

            <!-- Empty state -->
            <tr v-if="!isReportsLoading && topReportsByScore.length === 0">
              <td colspan="7" class="py-8 px-4 text-center text-gray-500">
                <div class="flex flex-col items-center justify-center">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    class="h-12 w-12 text-gray-300 mb-2"
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
                  <p>No approved reports found.</p>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Empty state for reports (only when not loading) -->
    <div v-if="allReports.length === 0 && !isReportsLoading" class="mb-6">
      <div
        class="rounded-sm border border-stroke bg-white p-8 shadow-default dark:border-strokedark dark:bg-boxdark text-center"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="h-16 w-16 mx-auto text-gray-300 mb-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="1.5"
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
        <h3 class="text-xl font-semibold text-black dark:text-white mb-1">No Reports Available</h3>
        <p class="text-gray-500 mb-4">
          No reports are available for your branch assignments.
          <br />Contact your administrator if you believe this is incorrect.
        </p>
      </div>
    </div>

    <!-- Charts Section - First Row - Enhanced with more details -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
      <!-- Score Distribution Chart - Enhanced with more details -->
      <div
        class="rounded-sm border border-stroke bg-white p-5 shadow-default dark:border-strokedark dark:bg-boxdark h-full"
      >
        <div class="mb-3 flex justify-between">
          <h4 class="text-xl font-semibold text-black dark:text-white">Score Distribution</h4>
          <div>
            <span
              class="rounded-full bg-primary bg-opacity-10 px-3 py-1 text-xs font-medium text-primary"
            >
              {{ filteredReports.length }} Reports
            </span>
          </div>
        </div>

        <!-- Loading state for chart -->
        <div v-if="isChartsLoading" class="h-[300px] flex items-center justify-center">
          <div class="text-center">
            <div
              class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"
            ></div>
            <p class="text-gray-500">Loading chart data...</p>
          </div>
        </div>

        <!-- Actual chart -->
        <div v-else class="h-[400px] flex items-center justify-center">
          <ChartFour :reports="filteredReports" />
        </div>
      </div>

      <!-- Score Trends Chart -->
      <div
        class="rounded-sm border border-stroke bg-white p-5 shadow-default dark:border-strokedark dark:bg-boxdark h-full"
      >
        <div class="mb-3 flex justify-between">
          <h4 class="text-xl font-semibold text-black dark:text-white">Score Trends</h4>
          <div>
            <select
              v-model="timeframeFilter"
              class="rounded border-[1.5px] border-stroke bg-transparent px-2 py-1 text-sm outline-none transition focus:border-primary active:border-primary dark:border-form-strokedark dark:bg-form-input dark:focus:border-primary"
              @change="handleTimeframeChange"
            >
              <option value="month">Last 30 days</option>
              <option value="90days">Last 90 days</option>
              <option value="year">This year</option>
              <option value="all">All time</option>
            </select>
          </div>
        </div>

        <!-- Chart wrapper with explicit styles -->
        <div
          v-if="isChartsLoading"
          class="flex items-center justify-center"
          style="width: 100%; min-height: 380px; margin: 0 auto"
        >
          <div class="text-center">
            <div
              class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"
            ></div>
            <p class="text-gray-500">Loading trends data...</p>
          </div>
        </div>

        <!-- Actual chart -->
        <div v-else style="width: 100%; min-height: 380px; margin: 0 auto">
          <VueApexCharts
            :options="{
              chart: {
                height: 350,
                type: 'area',
                toolbar: {
                  show: true,
                  tools: {
                    download: true,
                    selection: true,
                    zoom: true,
                    zoomin: true,
                    zoomout: true,
                    pan: true,
                    reset: true
                  }
                },
                fontFamily: 'Satoshi, sans-serif',
                background: '#fff',
                animations: {
                  enabled: totalReports <= 100, // Disable animations for large datasets
                  easing: 'easeinout',
                  speed: 600,
                  animateGradually: {
                    enabled: totalReports <= 100,
                    delay: 100
                  },
                  dynamicAnimation: {
                    enabled: true,
                    speed: 300
                  }
                }
              },
              stroke: {
                curve: 'smooth',
                width: 3,
                colors: ['#3056D3']
              },
              fill: {
                type: 'gradient',
                gradient: {
                  shade: 'light',
                  type: 'vertical',
                  shadeIntensity: 0.25,
                  gradientToColors: ['#8FD0EF'],
                  inverseColors: false,
                  opacityFrom: 0.8,
                  opacityTo: 0.1,
                  stops: [0, 100],
                  colorStops: []
                }
              },
              xaxis: {
                type: 'datetime',
                labels: {
                  show: true,
                  rotate: -45,
                  rotateAlways: false,
                  hideOverlappingLabels: true,
                  showDuplicates: false,
                  trim: false,
                  style: {
                    colors: ['#64748b'],
                    fontSize: '12px',
                    fontFamily: 'Satoshi, sans-serif',
                    fontWeight: 400,
                    cssClass: 'apexcharts-xaxis-label'
                  },
                  offsetX: 0,
                  offsetY: 0,
                  format: 'dd MMM',
                  datetimeUTC: false,
                  datetimeFormatter: {
                    year: 'yyyy',
                    month: 'MMM yyyy',
                    day: 'dd MMM',
                    hour: 'HH:mm'
                  }
                },
                title: {
                  text: 'Date',
                  offsetX: 0,
                  offsetY: 0,
                  style: {
                    color: '#374151',
                    fontSize: '14px',
                    fontFamily: 'Satoshi, sans-serif',
                    fontWeight: 600
                  }
                },
                tickAmount: 6
              },
              yaxis: {
                labels: {
                  show: true,
                  align: 'right',
                  minWidth: 0,
                  maxWidth: 160,
                  style: {
                    colors: ['#64748b'],
                    fontSize: '12px',
                    fontFamily: 'Satoshi, sans-serif',
                    fontWeight: 400,
                    cssClass: 'apexcharts-yaxis-label'
                  },
                  offsetX: 0,
                  offsetY: 0,
                  formatter: function (value: number) {
                    return value ? Math.round(value) + '%' : '0%'
                  }
                },
                title: {
                  text: 'Score (%)',
                  rotate: -90,
                  offsetX: -5,
                  offsetY: 0,
                  style: {
                    color: '#374151',
                    fontSize: '14px',
                    fontFamily: 'Satoshi, sans-serif',
                    fontWeight: 600
                  }
                },
                min: 0,
                max: 100,
                tickAmount: 5,
                forceNiceScale: true
              },
              tooltip: {
                enabled: true,
                shared: false,
                followCursor: false,
                intersect: false,
                inverseOrder: false,
                fillSeriesColor: false,
                theme: 'light',
                style: {
                  fontSize: '12px',
                  fontFamily: 'Satoshi, sans-serif'
                },
                x: {
                  show: true,
                  format: 'dd MMM yyyy'
                },
                y: {
                  formatter: function (value: number) {
                    return value ? value.toFixed(1) + '%' : '0%'
                  },
                  title: {
                    formatter: function () {
                      return 'Score'
                    }
                  }
                }
              },
              grid: {
                show: true,
                borderColor: '#e5e7eb',
                strokeDashArray: 1,
                position: 'back',
                xaxis: {
                  lines: {
                    show: true
                  }
                },
                yaxis: {
                  lines: {
                    show: true
                  }
                },
                padding: {
                  top: 0,
                  right: 30,
                  bottom: 0,
                  left: 10
                }
              },
              markers: {
                size: 6,
                colors: ['#3056D3'],
                strokeColors: '#fff',
                strokeWidth: 2,
                strokeOpacity: 0.9,
                strokeDashArray: 0,
                fillOpacity: 1,
                discrete: [],
                shape: 'circle',
                radius: 2,
                offsetX: 0,
                offsetY: 0,
                hover: {
                  size: 8,
                  sizeOffset: 3
                }
              },
              colors: ['#3056D3'],
              legend: {
                show: false
              },
              dataLabels: {
                enabled: false
              },
              responsive: [
                {
                  breakpoint: 768,
                  options: {
                    xaxis: {
                      labels: {
                        rotate: -45,
                        style: {
                          fontSize: '10px'
                        }
                      }
                    },
                    yaxis: {
                      labels: {
                        style: {
                          fontSize: '10px'
                        }
                      }
                    },
                    markers: {
                      size: 4
                    }
                  }
                }
              ]
            }"
            :series="[
              {
                name: 'Score',
                data:
                  filteredReports && filteredReports.length > 0
                    ? filteredReports
                        .filter((report) => report.score && (report.date || report.created_at))
                        .sort(
                          (a, b) =>
                            new Date(a.date || a.created_at).getTime() -
                            new Date(b.date || b.created_at).getTime()
                        )
                        .map((report) => ({
                          x: new Date(report.date || report.created_at).getTime(),
                          y: Number(report.score) || 0
                        }))
                    : []
              }
            ]"
            width="100%"
            height="350"
            type="area"
          />
        </div>

        <div class="mt-4">
          <div class="flex justify-between text-xs text-gray-500">
            <span>Each point represents one report</span>
            <span v-if="filteredReports.length > 0">
              {{ filteredReports.length }} individual reports shown
            </span>
          </div>
          <div class="mt-2 text-center text-xs text-gray-500">
            Showing all individual report scores chronologically
          </div>
        </div>
      </div>
    </div>

    <!-- Charts Section - Second Row - Enhanced with more details -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
      <!-- Branch Comparison Chart - Enhanced with more details -->
      <div
        class="rounded-sm border border-stroke bg-white p-5 shadow-default dark:border-strokedark dark:bg-boxdark h-full"
      >
        <div class="mb-3 flex justify-between">
          <h4 class="text-xl font-semibold text-black dark:text-white">
            {{ getBranchComparisonLabel }}
          </h4>
          <!-- <div>
            <span
              class="rounded-full bg-primary bg-opacity-10 px-3 py-1 text-xs font-medium text-primary"
            >
              {{ branches.length }} Branches
            </span>
          </div> -->
        </div>

        <!-- Enhanced Branch Comparison Chart -->
        <div style="width: 100%; min-height: 400px; margin: 0 auto">
          <VueApexCharts
            :options="{
              chart: {
                type: 'bar',
                height: 380,
                toolbar: {
                  show: true,
                  tools: {
                    download: true,
                    selection: false,
                    zoom: true,
                    zoomin: true,
                    zoomout: true,
                    pan: true,
                    reset: true
                  }
                },
                fontFamily: 'Satoshi, sans-serif',
                background: '#fff',
                animations: {
                  enabled: uniqueBranchesCount <= 50, // Disable animations for large datasets
                  easing: 'easeinout',
                  speed: 800,
                  animateGradually: {
                    enabled: uniqueBranchesCount <= 50,
                    delay: 100
                  },
                  dynamicAnimation: {
                    enabled: true,
                    speed: 350
                  }
                }
              },
              plotOptions: {
                bar: {
                  horizontal: false,
                  columnWidth: '70%',
                  borderRadius: 8,
                  borderRadiusApplication: 'end',
                  borderRadiusWhenStacked: 'last',
                  dataLabels: {
                    position: 'top'
                  }
                }
              },
              dataLabels: {
                enabled: uniqueBranchesCount <= 20, // Only show labels if 20 or fewer branches
                offsetY: -20,
                style: {
                  fontSize: '11px',
                  fontFamily: 'Satoshi, sans-serif',
                  fontWeight: 600,
                  colors: ['#374151']
                },
                formatter: function (val: number) {
                  return val + '%'
                }
              },
              stroke: {
                show: true,
                width: 2,
                colors: ['transparent']
              },
              fill: {
                type: 'gradient',
                gradient: {
                  shade: 'light',
                  type: 'vertical',
                  shadeIntensity: 0.25,
                  gradientToColors: ['#8FD0EF'],
                  inverseColors: false,
                  opacityFrom: 0.9,
                  opacityTo: 0.6,
                  stops: [0, 100]
                }
              },
              xaxis: {
                categories:
                  filteredReports && filteredReports.length > 0
                    ? (() => {
                        const branchScores = new Map()
                        filteredReports.forEach((report: any) => {
                          const branchName = report.branch_name || report.branch || 'Unknown'
                          if (!branchScores.has(branchName)) {
                            branchScores.set(branchName, { total: 0, count: 0 })
                          }
                          const data = branchScores.get(branchName)
                          data.total += report.score || 0
                          data.count++
                        })
                        return [...branchScores.entries()]
                          .map(([branch, data]: [string, any]) => ({
                            branch,
                            avgScore:
                              data.count > 0 ? Math.round((data.total / data.count) * 10) / 10 : 0
                          }))
                          .sort((a, b) => b.avgScore - a.avgScore)
                          .map((item) => item.branch)
                      })()
                    : [],
                axisBorder: {
                  show: false
                },
                axisTicks: {
                  show: false
                },
                labels: {
                  style: {
                    colors: ['#64748b'],
                    fontSize: '10px',
                    fontFamily: 'Satoshi, sans-serif',
                    fontWeight: 500
                  },
                  rotate: -45,
                  rotateAlways: true,
                  hideOverlappingLabels: false,
                  trim: true,
                  maxHeight: 120
                },
                title: {
                  text: '(Highest to Lowest)',
                  style: {
                    color: '#374151',
                    fontSize: '14px',
                    fontFamily: 'Satoshi, sans-serif',
                    fontWeight: 600
                  }
                }
              },
              yaxis: {
                title: {
                  text: 'Average Score (%)',
                  style: {
                    color: '#374151',
                    fontSize: '14px',
                    fontFamily: 'Satoshi, sans-serif',
                    fontWeight: 600
                  }
                },
                labels: {
                  style: {
                    colors: ['#64748b'],
                    fontSize: '12px',
                    fontFamily: 'Satoshi, sans-serif',
                    fontWeight: 400
                  },
                  formatter: function (value: number) {
                    return Math.round(value) + '%'
                  }
                },
                min: 0,
                max: 100,
                tickAmount: 5
              },
              grid: {
                show: true,
                borderColor: '#e5e7eb',
                strokeDashArray: 1,
                position: 'back',
                xaxis: {
                  lines: {
                    show: false
                  }
                },
                yaxis: {
                  lines: {
                    show: true
                  }
                },
                padding: {
                  top: 0,
                  right: 30,
                  bottom: 0,
                  left: 10
                }
              },
              tooltip: {
                enabled: true,
                theme: 'light',
                style: {
                  fontSize: '12px',
                  fontFamily: 'Satoshi, sans-serif'
                },
                y: {
                  formatter: function (val: number) {
                    return val.toFixed(1) + '%'
                  },
                  title: {
                    formatter: function () {
                      return 'Average Score: '
                    }
                  }
                }
              },
              colors: ['#3056D3'],
              legend: {
                show: false
              },
              responsive: [
                {
                  breakpoint: 768,
                  options: {
                    chart: {
                      height: 320
                    },
                    plotOptions: {
                      bar: {
                        columnWidth: '80%'
                      }
                    },
                    dataLabels: {
                      enabled: false
                    },
                    xaxis: {
                      labels: {
                        rotate: -45,
                        style: {
                          fontSize: '9px'
                        }
                      }
                    }
                  }
                }
              ]
            }"
            :series="[
              {
                name: 'Average Score',
                data:
                  filteredReports && filteredReports.length > 0
                    ? (() => {
                        const branchScores = new Map()
                        filteredReports.forEach((report: any) => {
                          const branchName = report.branch_name || report.branch || 'Unknown'
                          if (!branchScores.has(branchName)) {
                            branchScores.set(branchName, { total: 0, count: 0 })
                          }
                          const data = branchScores.get(branchName)
                          data.total += report.score || 0
                          data.count++
                        })
                        return [...branchScores.entries()]
                          .map(([branch, data]: [string, any]) => ({
                            branch,
                            avgScore:
                              data.count > 0 ? Math.round((data.total / data.count) * 10) / 10 : 0
                          }))
                          .sort((a, b) => b.avgScore - a.avgScore)
                          .map((item) => item.avgScore)
                      })()
                    : []
              }
            ]"
            width="100%"
            height="380"
            type="bar"
          />
        </div>

        <div class="mt-4" v-if="branches.length > 0">
          <div class="text-xs text-gray-500 mb-2">Performance Summary:</div>
          <div class="grid grid-cols-2 gap-3 md:grid-cols-4">
            <div class="flex items-center justify-between p-2 bg-green-50 rounded-lg">
              <span class="text-xs font-medium text-green-700">{{ totalBranchesLabel }}</span>
              <span class="text-xs font-bold text-green-800">{{
                filteredReports && filteredReports.length > 0
                  ? (() => {
                      const branchScores = new Map()
                      filteredReports.forEach((report: any) => {
                        const branchName = report.branch_name || report.branch || 'Unknown'
                        branchScores.set(branchName, true)
                      })
                      return branchScores.size
                    })()
                  : 0
              }}</span>
            </div>
            <div class="flex items-center justify-between p-2 bg-blue-50 rounded-lg">
              <span class="text-xs font-medium text-blue-700">Avg Score</span>
              <span class="text-xs font-bold text-blue-800">{{ averageScore }}%</span>
            </div>
            <div
              class="flex items-center justify-between p-2 rounded-lg"
              :style="{
                backgroundColor:
                  filteredReports && filteredReports.length > 0
                    ? useColorsScore().getRangeBasedPerformance(
                        Math.max(...filteredReports.map((r: any) => r.score || 0))
                      ).color + '20'
                    : '#22c55e20'
              }"
            >
              <div class="flex flex-col">
                <span
                  class="text-xs font-medium"
                  :style="{
                    color:
                      filteredReports && filteredReports.length > 0
                        ? useColorsScore().getRangeBasedPerformance(
                            Math.max(...filteredReports.map((r: any) => r.score || 0))
                          ).color
                        : '#22c55e'
                  }"
                  >Best Score</span
                >
                <span
                  class="text-xs"
                  :style="{
                    color:
                      filteredReports && filteredReports.length > 0
                        ? useColorsScore().getRangeBasedPerformance(
                            Math.max(...filteredReports.map((r: any) => r.score || 0))
                          ).color
                        : '#22c55e'
                  }"
                  >{{
                    filteredReports && filteredReports.length > 0
                      ? (() => {
                          const bestReport = filteredReports.reduce((best: any, current: any) =>
                            (current.score || 0) > (best.score || 0) ? current : best
                          )
                          return (
                            bestReport.branch_name ||
                            bestReport.branch ||
                            bestReport.primary_field_value ||
                            'Unknown'
                          )
                        })()
                      : 'N/A'
                  }}</span
                >
              </div>
              <span
                class="text-xs font-bold"
                :style="{
                  color:
                    filteredReports && filteredReports.length > 0
                      ? useColorsScore().getRangeBasedPerformance(
                          Math.max(...filteredReports.map((r: any) => r.score || 0))
                        ).color
                      : '#22c55e'
                }"
                >{{
                  filteredReports && filteredReports.length > 0
                    ? Math.max(...filteredReports.map((r: any) => r.score || 0))
                    : 0
                }}%</span
              >
            </div>
            <div
              class="flex items-center justify-between p-2 rounded-lg"
              :style="{
                backgroundColor:
                  filteredReports && filteredReports.length > 0
                    ? useColorsScore().getRangeBasedPerformance(
                        Math.min(...filteredReports.map((r: any) => r.score || 0))
                      ).color + '20'
                    : '#ef444420'
              }"
            >
              <div class="flex flex-col">
                <span
                  class="text-xs font-medium"
                  :style="{
                    color:
                      filteredReports && filteredReports.length > 0
                        ? useColorsScore().getRangeBasedPerformance(
                            Math.min(...filteredReports.map((r: any) => r.score || 0))
                          ).color
                        : '#ef4444'
                  }"
                  >Least Score</span
                >
                <span
                  class="text-xs"
                  :style="{
                    color:
                      filteredReports && filteredReports.length > 0
                        ? useColorsScore().getRangeBasedPerformance(
                            Math.min(...filteredReports.map((r: any) => r.score || 0))
                          ).color
                        : '#ef4444'
                  }"
                  >{{
                    filteredReports && filteredReports.length > 0
                      ? (() => {
                          const worstReport = filteredReports.reduce((worst: any, current: any) =>
                            (current.score || 0) < (worst.score || 0) ? current : worst
                          )
                          return (
                            worstReport.branch_name ||
                            worstReport.branch ||
                            worstReport.primary_field_value ||
                            'Unknown'
                          )
                        })()
                      : 'N/A'
                  }}</span
                >
              </div>
              <span
                class="text-xs font-bold"
                :style="{
                  color:
                    filteredReports && filteredReports.length > 0
                      ? useColorsScore().getRangeBasedPerformance(
                          Math.min(...filteredReports.map((r: any) => r.score || 0))
                        ).color
                      : '#ef4444'
                }"
                >{{
                  filteredReports && filteredReports.length > 0
                    ? Math.min(...filteredReports.map((r: any) => r.score || 0))
                    : 0
                }}%</span
              >
            </div>
          </div>
        </div>
      </div>

      <!-- Category Performance Chart - Enhanced with more details -->
      <div
        class="rounded-sm border border-stroke bg-white p-5 shadow-default dark:border-strokedark dark:bg-boxdark h-full"
      >
        <div class="mb-3 flex justify-between">
          <h4 class="text-xl font-semibold text-black dark:text-white">Performance</h4>
        </div>

        <!-- Enhanced Category Performance Chart -->
        <div style="width: 100%; min-height: 350px; margin: 0 auto">
          <VueApexCharts
            :options="{
              chart: {
                height: 500,
                type: 'radialBar',
                fontFamily: 'Satoshi, sans-serif',
                background: 'transparent',
                animations: {
                  enabled: true,
                  easing: 'easeinout',
                  speed: 800, // Reduced from 1500ms
                  animateGradually: {
                    enabled: true,
                    delay: 150 // Reduced from 300ms
                  },
                  dynamicAnimation: {
                    enabled: true,
                    speed: 350 // Reduced from 600ms
                  }
                },
                toolbar: {
                  show: true,
                  offsetX: 0,
                  offsetY: 0,
                  tools: {
                    download: true,
                    selection: false,
                    zoom: false,
                    zoomin: false,
                    zoomout: false,
                    pan: false,
                    reset: false
                  },
                  export: {
                    csv: {
                      filename: 'performance-data'
                    },
                    svg: {
                      filename: 'performance-chart'
                    },
                    png: {
                      filename: 'performance-chart'
                    }
                  }
                },
                dropShadow: {
                  enabled: false, // Disabled for better performance
                  top: 0,
                  left: 0,
                  blur: 20,
                  opacity: 0.15,
                  color: '#3056D3'
                }
              },
              plotOptions: {
                radialBar: {
                  startAngle: -90,
                  endAngle: 90,
                  hollow: {
                    margin: 20,
                    size: '65%',
                    background: 'transparent',
                    image: undefined,
                    imageWidth: 64,
                    imageHeight: 64,
                    imageOffsetX: 0,
                    imageOffsetY: 0,
                    imageClipped: false,
                    position: 'front',
                    dropShadow: {
                      enabled: true,
                      top: 5,
                      left: 0,
                      blur: 15,
                      opacity: 0.3,
                      color: '#000'
                    }
                  },
                  track: {
                    background: 'rgba(241, 245, 249, 0.8)',
                    strokeWidth: '100%',
                    margin: 8,
                    dropShadow: {
                      enabled: true,
                      top: -2,
                      left: 0,
                      blur: 8,
                      opacity: 0.2,
                      color: '#64748b'
                    }
                  },
                  dataLabels: {
                    show: true,
                    name: {
                      fontSize: '24px',
                      fontFamily: 'Satoshi, sans-serif',
                      fontWeight: 700,
                      color: '#1e293b',
                      offsetY: -15,
                      show: true
                    },
                    value: {
                      fontSize: '64px',
                      fontFamily: 'Satoshi, sans-serif',
                      fontWeight: 800,
                      color: '#0f172a',
                      offsetY: 25,
                      show: true,
                      formatter: function (val: number) {
                        return Math.round(val) + '%'
                      }
                    },
                    total: {
                      show: true,
                      showAlways: true,
                      label: 'Overall Performance',
                      fontSize: '20px',
                      fontFamily: 'Satoshi, sans-serif',
                      fontWeight: 600,
                      color: '#475569',
                      formatter: function (w: any) {
                        return Math.round(w.globals.seriesTotals[0]) + '%'
                      }
                    }
                  }
                }
              },
              fill: {
                type: 'gradient',
                gradient: {
                  shade: 'dark',
                  type: 'radial',
                  shadeIntensity: 0.8,
                  gradientToColors: ['#60A5FA', '#34D399', '#A78BFA'],
                  inverseColors: false,
                  opacityFrom: 1,
                  opacityTo: 0.8,
                  stops: [0, 50, 100],
                  colorStops: [
                    {
                      offset: 0,
                      color: '#3056D3',
                      opacity: 1
                    },
                    {
                      offset: 50,
                      color: '#60A5FA',
                      opacity: 0.9
                    },
                    {
                      offset: 100,
                      color: '#8FD0EF',
                      opacity: 0.8
                    }
                  ]
                }
              },
              stroke: {
                lineCap: 'round',
                dashArray: 0
              },
              labels: ['Overall Performance'],
              colors: ['#3056D3'],
              legend: {
                show: false
              },
              tooltip: {
                enabled: true,
                theme: 'dark',
                style: {
                  fontSize: '14px',
                  fontFamily: 'Satoshi, sans-serif'
                },
                fillSeriesColor: false,
                custom: function ({ series, seriesIndex, dataPointIndex, w }: any) {
                  const score = series[seriesIndex][dataPointIndex]
                  const { rating, color } = useColorsScore().getRangeBasedPerformance(score)

                  return `
                    <div style='padding: 12px; background: linear-gradient(135deg, #1e293b 0%, #334155 100%); border-radius: 8px; box-shadow: 0 10px 25px rgba(0,0,0,0.3);'>
                      <div style='color: white; font-weight: 600; margin-bottom: 4px;'>Performance Score</div>
                      <div style='color: ${color}; font-size: 18px; font-weight: 700;'>${score}%</div>
                      <div style='color: #94a3b8; font-size: 12px; margin-top: 4px;'>${rating}</div>
                    </div>
                  `
                }
              },
              responsive: [
                {
                  breakpoint: 1024,
                  options: {
                    chart: {
                      height: 450
                    },
                    plotOptions: {
                      radialBar: {
                        dataLabels: {
                          value: {
                            fontSize: '52px'
                          },
                          name: {
                            fontSize: '20px'
                          },
                          total: {
                            fontSize: '18px'
                          }
                        }
                      }
                    }
                  }
                },
                {
                  breakpoint: 768,
                  options: {
                    chart: {
                      height: 400
                    },
                    plotOptions: {
                      radialBar: {
                        dataLabels: {
                          value: {
                            fontSize: '44px'
                          },
                          name: {
                            fontSize: '18px'
                          },
                          total: {
                            fontSize: '16px'
                          }
                        }
                      }
                    }
                  }
                },
                {
                  breakpoint: 480,
                  options: {
                    chart: {
                      height: 350
                    },
                    plotOptions: {
                      radialBar: {
                        dataLabels: {
                          value: {
                            fontSize: '36px'
                          },
                          name: {
                            fontSize: '16px'
                          },
                          total: {
                            fontSize: '14px'
                          }
                        }
                      }
                    }
                  }
                }
              ]
            }"
            :series="[
              filteredReports && filteredReports.length > 0
                ? (() => {
                    // Filter reports based on selected type
                    let reportsToProcess = filteredReports
                    if (categoryFilter !== 'All Reports') {
                      reportsToProcess = filteredReports.filter(
                        (report: any) => (report.type || report.report_type) === categoryFilter
                      )
                    }

                    if (reportsToProcess.length === 0) {
                      return 0
                    }

                    // Calculate overall average
                    const overallTotal = reportsToProcess.reduce(
                      (sum: number, report: any) => sum + (report.score || 0),
                      0
                    )
                    return Math.round(overallTotal / reportsToProcess.length)
                  })()
                : 0
            ]"
            width="100%"
            height="500"
            type="radialBar"
          />
        </div>

        <!-- Enhanced Performance Summary -->
        <div class="mt-4">
          <div class="text-xs text-gray-500 mb-3">Performance Summary:</div>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
            <!-- Total Reports Card -->
            <div
              class="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-100"
            >
              <div class="flex items-center">
                <div class="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
                <div class="flex flex-col">
                  <span class="text-xs font-medium text-blue-700">Total Reports</span>
                  <span class="text-xs text-blue-600"
                    >{{
                      categoryFilter === 'All Reports'
                        ? filteredReports.length
                        : filteredReports.filter(
                            (r: any) => (r.type || r.report_type) === categoryFilter
                          ).length
                    }}
                    reports</span
                  >
                </div>
              </div>
              <span class="text-sm font-bold text-blue-800">{{
                categoryFilter === 'All Reports'
                  ? filteredReports.length
                  : filteredReports.filter((r: any) => (r.type || r.report_type) === categoryFilter)
                      .length
              }}</span>
            </div>

            <!-- Average Score Card -->
            <div
              class="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-100"
            >
              <div class="flex items-center">
                <div class="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                <div class="flex flex-col">
                  <span class="text-xs font-medium text-green-700">Average Score</span>
                  <span class="text-xs text-green-600">{{ categoryFilter }} category</span>
                </div>
              </div>
              <span class="text-sm font-bold text-green-800">{{ averageScore }}%</span>
            </div>

            <!-- Performance Rating Card -->
            <div
              class="flex items-center justify-between p-3 rounded-lg border border-gray-200"
              :style="{
                backgroundColor:
                  useColorsScore().getRangeBasedPerformance(averageScore).color + '10',
                borderColor: useColorsScore().getRangeBasedPerformance(averageScore).color + '30'
              }"
            >
              <div class="flex items-center">
                <div
                  class="w-3 h-3 rounded-full mr-2"
                  :style="{
                    backgroundColor: useColorsScore().getRangeBasedPerformance(averageScore).color
                  }"
                ></div>
                <div class="flex flex-col">
                  <span
                    class="text-xs font-medium"
                    :style="{
                      color: useColorsScore().getRangeBasedPerformance(averageScore).color
                    }"
                    >Performance Rating</span
                  >
                  <span
                    class="text-xs"
                    :style="{
                      color: useColorsScore().getRangeBasedPerformance(averageScore).color
                    }"
                    >{{ useColorsScore().getRangeBasedPerformance(averageScore).rating }}</span
                  >
                </div>
              </div>
              <span
                class="text-sm font-bold"
                :style="{
                  color: useColorsScore().getRangeBasedPerformance(averageScore).color
                }"
                >{{ averageScore }}%</span
              >
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Bottom Reports by Score - Enhanced with comprehensive table -->
    <div
      class="rounded-sm border border-stroke bg-white p-5 shadow-default dark:border-strokedark dark:bg-boxdark mb-6"
    >
      <div class="mb-4 flex justify-between items-center">
        <h4 class="text-xl font-semibold text-black dark:text-white">Bottom Reports by Score</h4>
        <span class="text-xs text-gray-500"
          >Showing bottom {{ Math.min(bottomReportsByScore.length, 5) }} of
          {{ allReports.length }} reports</span
        >
      </div>

      <!-- Enhanced Table with same structure as user-reports -->
      <div class="overflow-x-auto">
        <table class="w-full table-auto">
          <thead>
            <tr class="bg-gray-50 text-left dark:bg-meta-4">
              <th class="py-3 px-4 font-medium text-black dark:text-white text-center">Sr.</th>
              <th class="py-3 px-4 font-medium text-black dark:text-white">Month</th>
              <th class="py-3 px-4 font-medium text-black dark:text-white">{{ visitDateLabel }}</th>
              <th class="py-3 px-4 font-medium text-black dark:text-white">{{ branchLabel }}</th>
              <th class="py-3 px-4 font-medium text-black dark:text-white">Overall Performance</th>
              <th class="py-3 px-4 font-medium text-black dark:text-white text-center">Media</th>
              <th class="py-3 px-4 font-medium text-black dark:text-white text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            <!-- Loading state -->
            <tr v-if="isReportsLoading && allReports.length > 0">
              <td colspan="7" class="py-8 px-4 text-center">
                <div class="flex flex-col items-center justify-center">
                  <Loader size="md" text="Loading reports..." />
                </div>
              </td>
            </tr>

            <!-- Reports data -->
            <tr
              v-for="(report, index) in bottomReportsByScore"
              :key="report.id"
              class="hover:bg-gray-50 dark:hover:bg-meta-4 transition-colors cursor-pointer"
              @click="viewReport(report)"
            >
              <!-- Sr. Number -->
              <td class="py-3 px-4 border-b border-[#eee] text-center">
                <span class="font-medium text-gray-900 dark:text-white">{{ index + 1 }}</span>
              </td>

              <!-- Month -->
              <td class="py-3 px-4 border-b border-[#eee]">
                <span class="text-sm text-gray-700 dark:text-gray-300">
                  {{ getReportMonth(report) }}
                </span>
              </td>

              <!-- Date of Visit -->
              <td class="py-3 px-4 border-b border-[#eee]">
                <div
                  class="px-2 py-1 bg-blue-50 text-blue-800 rounded text-center text-xs font-medium inline-block"
                >
                  {{ getReportDate(report) }}
                </div>
              </td>

              <!-- Branch -->
              <td class="py-3 px-4 border-b border-[#eee]">
                <div v-if="isCallCenterUser" class="font-medium text-gray-900 dark:text-white">
                  📞 {{ getCallNumber(report) }}
                </div>
                <div v-else class="font-medium text-gray-900 dark:text-white">
                  {{ getBranchName(report) }}
                </div>
                <div class="text-xs text-gray-500 dark:text-gray-400">
                  {{ getReportType(report) }}
                </div>
              </td>

              <!-- Overall Performance -->
              <td class="py-3 px-4 border-b border-[#eee]">
                <div
                  v-if="checkReportHasFatalError(report)"
                  class="px-3 py-2 rounded text-center font-medium text-sm flex items-center justify-center text-white bg-red-600"
                >
                  <span>⚠️ FATAL ERROR</span>
                </div>
                <div
                  v-else
                  class="px-3 py-2 rounded text-center font-medium text-sm flex items-center justify-center"
                  :style="{
                    backgroundColor: useColorsScore().getRangeBasedPerformance(report.score).color,
                    color: useColorsScore().isLightColor(
                      useColorsScore().getRangeBasedPerformance(report.score).color
                    )
                      ? '#1f2937'
                      : '#ffffff'
                  }"
                >
                  <span
                    >{{ useColorsScore().getPerformanceEmoji(report.score) }}
                    {{ report.score }}%</span
                  >
                </div>
              </td>

              <!-- Media -->
              <td class="py-3 px-4 border-b border-[#eee]">
                <div class="flex justify-center gap-2">
                  <!-- Video Button -->
                  <button
                    @click.stop="viewMedia(report.id, 'video')"
                    class="flex items-center justify-center p-1.5 rounded bg-blue-50 hover:bg-blue-100 transition-all cursor-pointer shadow-sm"
                    title="View video records for this report (opens in new tab)"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke-width="1.5"
                      stroke="currentColor"
                      class="w-5 h-5 text-blue-500"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M12 18.75H4.5a2.25 2.25 0 0 1-2.25-2.25V9m12.841 9.091L16.5 19.5m-1.409-1.409c.407-.407.659-.97.659-1.591v-9a2.25 2.25 0 0 0-2.25-2.25h-9c-.621 0-1.184.252-1.591.659m12.182 12.182L2.909 5.909M1.5 4.5l1.409 1.409"
                      />
                    </svg>
                  </button>

                  <!-- Picture Button -->
                  <button
                    @click.stop="viewMedia(report.id, 'picture')"
                    class="flex items-center justify-center p-1.5 rounded bg-blue-50 hover:bg-blue-100 transition-all cursor-pointer shadow-sm"
                    title="View pictures for this report"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke-width="1.5"
                      stroke="currentColor"
                      class="w-5 h-5 text-blue-500"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z"
                      />
                    </svg>
                  </button>

                  <!-- Audio Button -->
                  <button
                    @click.stop="viewMedia(report.id, 'audio')"
                    class="flex items-center justify-center p-1.5 rounded bg-blue-50 hover:bg-blue-100 transition-all cursor-pointer shadow-sm"
                    title="Listen to audio recordings for this report"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke-width="1.5"
                      stroke="currentColor"
                      class="w-5 h-5 text-blue-500"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        d="M19.114 5.636a9 9 0 0 1 0 12.728M16.463 8.288a5.25 5.25 0 0 1 0 7.424M6.75 8.25l4.72-4.72a.75.75 0 0 1 1.28.53v15.88a.75.75 0 0 1-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.009 9.009 0 0 1 2.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75Z"
                      />
                    </svg>
                  </button>

                  <!-- PDF Button -->
                  <button
                    @click.stop="viewMedia(report.id, 'pdf', report)"
                    class="flex items-center justify-center p-1.5 rounded bg-blue-50 hover:bg-blue-100 transition-all cursor-pointer shadow-sm"
                    title="Download PDF"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke-width="1.5"
                      stroke="currentColor"
                      class="w-5 h-5 text-blue-500"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
                      />
                    </svg>
                  </button>
                </div>
              </td>

              <!-- Actions -->
              <td class="py-3 px-4 border-b border-[#eee]">
                <div class="flex justify-center gap-2">
                  <button
                    @click.stop="viewReport(report)"
                    class="bg-black hover:bg-gray-800 text-white rounded py-1.5 px-3 flex items-center justify-center gap-1.5 transition-all shadow-sm text-xs"
                    title="View Full Report"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      class="w-4 h-4"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"
                      />
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                    </svg>
                    View
                  </button>
                </div>
              </td>
            </tr>

            <!-- Empty state -->
            <tr v-if="!isReportsLoading && bottomReportsByScore.length === 0">
              <td colspan="7" class="py-8 px-4 text-center text-gray-500">
                <div class="flex flex-col items-center justify-center">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    class="h-12 w-12 text-gray-300 mb-2"
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
                  <p>No approved reports found.</p>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Footer with summary and navigation -->
    </div>

    <!-- Loading overlay -->
    <div v-if="isLoading" class="backdrop-blur-sm z-50 flex items-center justify-center">
      <div class="bg-white p-8 rounded-xl shadow-2xl">
        <Loader size="lg" text="Loading dashboard data..." />
      </div>
    </div>
  </DefaultLayout>
</template>

<style scoped>
.bounce-enter-active {
  animation: bounce-in 0.5s;
}

.bounce-leave-active {
  animation: bounce-in 0.5s reverse;
}

@keyframes bounce-in {
  0% {
    transform: scale(0);
  }

  50% {
    transform: scale(1.25);
  }

  100% {
    transform: scale(1);
  }
}
</style>
