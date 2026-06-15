import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import axios from 'axios'
import { Toast } from '@/utils/toast'
import { Client } from './client'
import { Auth } from './auth'
import router from '@/router'
import { Templates } from '@/stores/templates'
import { extractMediaUrls, generateMediaLinksForApi } from '@/utils/mediaLinks'
import Cookies from 'js-cookie'
import { shouldRefresh } from '@/utils/syncProtection'

// Helper function to get ISO timestamp
function getCurrentTimestamp(): string {
  return new Date().toISOString()
}

// Helper to invalidate browser cache for reports data
function invalidateCache() {
  // Set timestamp in sessionStorage to track last update
  sessionStorage.setItem('reports_data_last_updated', getCurrentTimestamp())

  // Broadcast the change to other tabs via localStorage
  localStorage.setItem('reports_data_changed', getCurrentTimestamp())
}

// Listen for changes from other tabs
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (event.key === 'reports_data_changed') {
      // Trigger refresh in all tabs when data changes
      const reportsStore = Reports()
      if (reportsStore) {
        // Check if we should proceed with the refresh based on cooldown period
        if (!shouldRefresh('reports')) return

        reportsStore.fetchReports({ forceRefresh: true })
      }
    }
  })
}

interface Report {
  id: number
  client_id: string
  template_name: string
  primary_field: {
    name: string
    value: string
  }
  colors: any
  content: any
  status: string
  created_at: string
  updated_at: string
  table?: string
  creator?: {
    id: number
    name: string
    uuid: string
  }
  updater?: {
    id: number
    name: string
    uuid: string
  }
}

export const Reports = defineStore('reports', () => {
  // State
  const loading = ref(false)
  const reports = ref([])
  const reports_data = ref([])
  const current_report = ref(null)
  const last_updated = ref('')
  const id = ref(0)
  const showTemplateModal = ref(false)

  // Base URL with environment variable
  const baseURL = import.meta.env.VITE_ENDPOINT_URL || 'http://localhost:8000/api'

  // Helper function to create a fresh axios instance with the current token
  const getFreshApiInstance = () => {
    // Get token from Auth store instead of localStorage
    const token = Auth().token
    return axios.create({
      baseURL,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      }
    })
  }

  // Actions
  /**
   * Initialize the store
   */
  const init = () => {
    loading.value = true

    // Initialize reports_data if it's empty
    if (!reports_data.value.length) {
      reports_data.value = []
    }

    // Fetch reports for the current client
    if (Client().selected_client?.uuid) {
      fetchReports()
    } else {
      loading.value = false
    }
  }

  /**
   * Get the current user ID from store
   * @returns {number|null} The current user ID or null if not found
   */
  const getCurrentUserId = () => {
    return Auth().user?.id || null
  }

  /**
   * Fetch reports based on user role - all reports for admins, own reports for reporting users
   * @param {Object} options - Options object
   * @param {boolean} options.forceRefresh - Whether to force a refresh of data even if cached
   */
  const fetchReports = async (options = { forceRefresh: false }) => {
    // Add a sync protection check for direct fetch calls
    if (!options.forceRefresh && !shouldRefresh('reports')) {
      return
    }

    try {
      loading.value = true
      const client_id = Client().selected_client?.uuid

      if (!client_id) {
        throw new Error('No client selected')
      }

      // Check if we need to refresh the data
      const shouldRefreshData =
        options.forceRefresh ||
        !last_updated.value ||
        !sessionStorage.getItem('reports_data_last_updated')

      if (!shouldRefreshData) {
        loading.value = false
        return
      }

      // Check user role to determine filtering
      const isAdmin = Auth().isAdmin()
      const user_id = isAdmin ? null : getCurrentUserId()

      // Include user_id as query parameter only for non-admin users
      const url = user_id
        ? `/reports/client/${client_id}?user_id=${user_id}`
        : `/reports/client/${client_id}`

      try {
        // Get a fresh API instance with the latest token
        const api = getFreshApiInstance()

        // Make the request
        const response = await api.get(url)

        // Process the response
        reports.value = response.data.data || []
        last_updated.value = getCurrentTimestamp()
        invalidateCache() // Notify other tabs about data change

        // Add client name to each report for better display and standardize media links format
        if (Client().selected_client?.name) {
          reports.value.forEach((report) => {
            report.client_name = Client().selected_client?.name

            // Standardize media links format for frontend
            if (report.media_links?.video_link && !report.media_links?.video_url) {
              report.media_links = {
                video_url: report.media_links.video_link,
                audio_url: report.media_links.audio_link,
                images_urls: report.media_links.image_link ? [report.media_links.image_link] : null
              }
            }
          })
        }
      } catch (apiError) {
        console.error('API request failed:', apiError)

        // If unauthorized, attempt to refresh the Auth store
        if (apiError.response?.status === 401) {
          const isAuthed = await Auth().current()
          if (isAuthed) {
            // Try again with refreshed authentication
            const api = getFreshApiInstance()
            const retryResponse = await api.get(url)

            reports.value = retryResponse.data.data || []
            last_updated.value = getCurrentTimestamp()
            invalidateCache() // Notify other tabs about data change
          } else {
            // Redirect to login if retry fails
            router.push('/')
          }
        } else {
          throw apiError // Re-throw for general error handling
        }
      }
    } catch (error) {
      console.error('Error fetching reports:', error)
      Toast.error('Failed to fetch reports')
      reports.value = [] // Ensure reports is at least an empty array on error
    } finally {
      loading.value = false
    }
  }

  /**
   * Generates media links for a report to be stored in the database
   */
  const generateMediaLinks = (report, clientId) => {
    // Use the utility function that handles the API format
    return generateMediaLinksForApi({
      ...report,
      domain_name: Client().selected_client?.domain_name,
      client_name: Client().selected_client?.name
    })
  }

  /**
   * Save a report
   * @param {Object} report - Report data
   */
  const saveReport = async (reportData: any) => {
    try {
      loading.value = true

      // Get client ID
      const client_id = Client().selected_client?.uuid || Client().selected_client?.id
      if (!client_id) {
        throw new Error('No client selected')
      }

      // Refresh authentication before making the request
      const token = Auth().token || Cookies.get('token')
      if (!token) {
        // Try to refresh auth status
        const isAuthed = await Auth().current()
        if (!isAuthed) {
          throw new Error('Authentication token is missing. Please log in again.')
        }
      }

      // Get current user data to ensure correct created_by/updated_by
      let user_id = Auth().user?.id || null
      if (!user_id) {
        const userJson = Cookies.get('user')
        if (userJson) {
          try {
            const user = JSON.parse(userJson)
            user_id = user.id
          } catch (e) {
            console.error('Failed to parse user data from cookie:', e)
          }
        }
      }

      // Generate media links
      // const mediaLinks = generateMediaLinks(reportData, client_id)

      // Prepare report data
      const data = {
        client_id,
        user_id, // Explicitly include user ID in the request
        ...reportData,
        media_links: null // Add media links to the report data
      }

      // Create a fresh instance for this request with the latest token
      const api = getFreshApiInstance()

      // Determine if this is a new report or an update
      let response
      if (data.id) {
        // For update, we need the table name
        const tableParam = data.table ? `table=${data.table}` : `client_id=${client_id}`
        // Update existing report
        response = await api.put(`/reports/${data.id}?${tableParam}`, data)
      } else {
        // Create new report
        response = await api.post(`/reports`, data)
      }

      if (response.data.success) {
        Toast.success(response.data.message || 'Report saved successfully')

        id.value = response.data.data.id

        // Update last_updated and invalidate cache
        last_updated.value = getCurrentTimestamp()
        invalidateCache()

        // Refresh the reports list
        await fetchReports()
        return response.data.data
      } else {
        // Check if this is a duplicate error
        if (response.data.duplicate_detected) {
          throw new Error(response.data.message || 'Duplicate report detected')
        }
        throw new Error(response.data.error || 'Failed to save report')
      }
    } catch (error) {
      console.error('Error saving report:', error)

      // Handle different types of errors
      if (error.response) {
        // Server responded with error status
        if (error.response.status === 401) {
          // Try to refresh authentication
          const refreshed = await Auth().refreshToken()
          if (!refreshed) {
            // If refresh fails, redirect to login
            router.push('/')
            return null
          }

          // If we successfully refreshed, try the operation again
          return saveReport(reportData)
        } else if (error.response.status === 409) {
          // Duplicate detected
          Toast.error(error.response.data.message || 'Duplicate report detected')
          return null
        }
      }

      Toast.error(error.message || 'Failed to save report')
      return null
    } finally {
      loading.value = false
    }
  }

  const updateReport = async (reportData) => {
    try {
      loading.value = true
      if (id.value === 0 || !id.value) {
        id.value = reportData.id
      }

      // Get client ID
      const client_id = Client().selected_client?.uuid || Client().selected_client?.id
      if (!client_id) {
        throw new Error('No client selected')
      }

      // Refresh authentication before making the request
      const token = Auth().token || Cookies.get('token')
      if (!token) {
        // Try to refresh auth status
        const isAuthed = await Auth().current()
        if (!isAuthed) {
          throw new Error('Authentication token is missing. Please log in again.')
        }
      }

      // Get current user data to ensure correct created_by/updated_by
      let user_id = Auth().user?.id || null
      if (!user_id) {
        const userJson = Cookies.get('user')
        if (userJson) {
          try {
            const user = JSON.parse(userJson)
            user_id = user.id
          } catch (e) {
            console.error('Failed to parse user data from cookie:', e)
          }
        }
      }

      // Prepare report data
      const data = {
        client_id,
        user_id, // Explicitly include user ID in the request
        ...reportData
      }

      // Create a fresh instance for this request with the latest token
      const api = getFreshApiInstance()

      const response = await api.put(`/reports/${id.value}`, data) // ?table=my_client_reports

      if (response.data.success) {
        Toast.success(response.data.message || 'Report updated successfully')

        // Update last_updated and invalidate cache
        last_updated.value = getCurrentTimestamp()
        invalidateCache()

        // Refresh the reports list
        await fetchReports()
        return response.data.data
      } else {
        throw new Error(response.data.error || 'Failed to update report')
      }
    } catch (error: unknown) {
      console.error('Error saving report:', error)

      // Handle authentication errors
      if (error?.response && error.response?.status === 401) {
        // Try to refresh authentication
        const refreshed = await Auth().refreshToken()
        if (!refreshed) {
          // If refresh fails, redirect to login
          router.push('/')
          return null
        }

        // If we successfully refreshed, try the operation again
        return saveReport(reportData)
      }

      Toast.error(error?.message || 'Failed to save report')
      return null
    } finally {
      loading.value = false
    }
  }

  /**
   * Get a specific report by ID
   * @param {String|Number} id - Report ID
   * @param {String} table - Optional table name for the client-specific table
   * @param {Object} options - Options object
   * @param {boolean} options.forceRefresh - Whether to force a refresh of data even if cached
   */
  const getReportById = async (id, table = null, options = { forceRefresh: false }) => {
    try {
      loading.value = true

      // Basic validation of ID
      if (!id || id === 'undefined' || id === 'null' || id === undefined || id === null) {
        console.error('Invalid report ID:', id)
        throw new Error('Report ID is invalid or missing')
      }

      // Refresh authentication before making the request
      const token = Auth().token || Cookies.get('token')
      if (!token) {
        // Try to refresh auth status
        const isAuthed = await Auth().current()
        if (!isAuthed) {
          throw new Error('Authentication token is missing. Please log in again.')
        }
      }

      const client_id = Client().selected_client?.uuid
      if (!client_id && !table) {
        throw new Error('Either client_id or table name is required')
      }

      // Get current user data for client_user role check
      let userEmail = null
      let userRole = null

      // Try to get user data from Auth store first, then cookie
      if (Auth().user && Auth().user.email) {
        userEmail = Auth().user.email
        userRole = Auth().user.system_role
      } else {
        const userJson = Cookies.get('user')
        if (userJson) {
          try {
            const userData = JSON.parse(userJson)
            userEmail = userData.email
            userRole = userData.role || userData.system_role
          } catch (e) {
            console.error('Failed to parse user data from cookie:', e)
          }
        }
      }

      // Construct the query parameter for the client-specific table
      const queryParams = new URLSearchParams()

      if (table) {
        queryParams.append('table', table)
      } else if (client_id) {
        queryParams.append('client_id', client_id)
      }

      // Add user email and role for client_user access control
      if (userEmail && userRole === 'client_user') {
        queryParams.append('user_email', userEmail)
        queryParams.append('user_role', userRole)
      }

      const queryString = queryParams.toString()
      const url = `/reports/${id}${queryString ? `?${queryString}` : ''}`

      // Create a fresh instance for this request with the latest token
      const api = getFreshApiInstance()

      const response = await api.get(url)

      if (response.data.success) {
        // Ensure the media links have a consistent structure
        const reportData = response.data.data

        // If the backend returns a legacy format, convert it to our frontend format
        if (reportData.media_links?.video_link && !reportData.media_links?.video_url) {
          reportData.media_links = {
            video_url: reportData.media_links.video_link,
            audio_url: reportData.media_links.audio_link,
            images_urls: reportData.media_links.image_link
              ? [reportData.media_links.image_link]
              : null
          }
        }

        current_report.value = reportData

        // If report has content with reports_data, update the store
        if (reportData.content && reportData.content.reports) {
          reports_data.value = reportData.content.reports
        }

        // Update last_updated
        last_updated.value = getCurrentTimestamp()

        return reportData
      } else {
        throw new Error(response.data.error || 'Failed to fetch report')
      }
    } catch (error) {
      console.error('Error fetching report:', error)

      // Check for auth errors and handle them
      if (error.response && error.response.status === 401) {
        // Trigger a refresh of the auth token or redirect to login
        const refreshed = await Auth().refreshToken()
        if (!refreshed) {
          router.push('/')
          return null
        }
        return getReportById(id, table, options)
      }

      Toast.error(error.message || 'Failed to fetch report')
      return null
    } finally {
      loading.value = false
    }
  }

  /**
   * Delete a specific report
   * @param {String|Number} id - Report ID
   * @param {String} table - Optional table name for the client-specific table
   */
  const deleteReport = async (id, table = null) => {
    try {
      loading.value = true

      // Refresh authentication before making the request
      const token = Auth().token || Cookies.get('token')
      if (!token) {
        // Try to refresh auth status
        const isAuthed = await Auth().current()
        if (!isAuthed) {
          throw new Error('Authentication token is missing. Please log in again.')
        }
      }

      // Determine client_id and construct query parameters
      const client_id = Client().selected_client?.uuid || Client().selected_client?.id

      // Construct the query parameter for the client-specific table
      const queryParams = new URLSearchParams()

      if (table) {
        queryParams.append('table', table)
      } else if (client_id) {
        queryParams.append('client_id', client_id)
      }

      const queryString = queryParams.toString()
      const url = `/reports/${id}${queryString ? `?${queryString}` : ''}`

      // Create a fresh instance for this request with the latest token
      const api = getFreshApiInstance()

      const response = await api.delete(url)

      if (response.data.success) {
        Toast.success(response.data.message || 'Report deleted successfully')

        // Update last_updated and invalidate cache
        last_updated.value = getCurrentTimestamp()
        invalidateCache()

        // Refresh the reports list
        await fetchReports()
        return true
      } else {
        throw new Error(response.data.error || 'Failed to delete report')
      }
    } catch (error) {
      console.error('Error deleting report:', error)

      // Check for auth errors and handle them
      if (error.response && error.response.status === 401) {
        // Trigger a refresh of the auth token or redirect to login
        const refreshed = await Auth().refreshToken()
        if (!refreshed) {
          router.push('/')
          return false
        }
        return deleteReport(id, table)
      }

      Toast.error(error.message || 'Failed to delete report')
      return false
    } finally {
      loading.value = false
    }
  }

  /**
   * Update a report's status (draft, published, etc.)
   * @param {String|Number} id - Report ID
   * @param {String} status - New status
   * @param {String} table - Optional table name for the client-specific table
   */
  const updateReportStatus = async (id, status, table = null) => {
    try {
      loading.value = true

      if (!id || !status) {
        throw new Error('Report ID and status are required')
      }

      // Refresh authentication before making the request
      const token = Auth().token || Cookies.get('token')
      if (!token) {
        // Try to refresh auth status
        const isAuthed = await Auth().current()
        if (!isAuthed) {
          throw new Error('Authentication token is missing. Please log in again.')
        }
      }

      // Determine client_id and construct query parameters
      const client_id = Client().selected_client?.uuid || Client().selected_client?.id

      // Construct the query parameter for the client-specific table
      const queryParams = new URLSearchParams()

      if (table) {
        queryParams.append('table', table)
      } else if (client_id) {
        queryParams.append('client_id', client_id)
      }

      const queryString = queryParams.toString()
      const url = `/reports/${id}/status${queryString ? `?${queryString}` : ''}`

      // Create a fresh instance for this request with the latest token
      const api = getFreshApiInstance()

      const response = await api.patch(url, { status })

      if (response.data.success) {
        Toast.success(response.data.message || 'Report status updated successfully')

        // Update last_updated and invalidate cache
        last_updated.value = getCurrentTimestamp()
        invalidateCache()

        // Refresh the reports list
        await fetchReports()
        return true
      } else {
        throw new Error(response.data.error || 'Failed to update report status')
      }
    } catch (error) {
      console.error('Error updating report status:', error)

      // Check for auth errors and handle them
      if (error.response && error.response.status === 401) {
        // Trigger a refresh of the auth token or redirect to login
        const refreshed = await Auth().refreshToken()
        if (!refreshed) {
          router.push('/')
          return false
        }
        return updateReportStatus(id, status, table)
      }

      Toast.error(error.message || 'Failed to update report status')
      return false
    } finally {
      loading.value = false
    }
  }

  /**
   * Format and normalize report data
   * @param {any} report - Raw report data
   * @returns {Report} Formatted report
   */
  const formatReportData = (report: any): Report => {
    // Add client name if it's missing
    if (Client().selected_client?.name && !report.client_name) {
      report.client_name = Client().selected_client?.name
    }

    // More formatting logic if needed

    return report as Report
  }

  /**
   * Get consolidated reports from multiple sources (templates, etc.)
   */
  const getConsolidatedReports = async () => {
    try {
      // Get client ID
      const client_id = Client().selected_client?.uuid || Client().selected_client?.id
      if (!client_id) {
        throw new Error('No client selected')
      }

      // Directly fetch client reports
      const url = `/reports/client/${client_id}`
      const api = getFreshApiInstance()
      const response = await api.get(url)

      const clientReports = response.data.data || []

      // Also get templates that can be used to create reports
      await Templates().fetch(Templates().pagination.page, Templates().pagination.limit)
      const templates = Templates().templates

      // Format templates as "potential reports" with a "template" flag
      const templateReports = templates.map((template) => ({
        ...template,
        is_template: true,
        status: 'template',
        created_at: template.created_at || new Date().toISOString()
      }))

      // Combine and sort by created_at (newest first)
      const combined = [...clientReports, ...templateReports]
      combined.sort((a, b) => {
        const dateA = new Date(a.created_at).getTime()
        const dateB = new Date(b.created_at).getTime()
        return dateB - dateA // Newest first
      })

      return combined
    } catch (error) {
      console.error('Error getting consolidated reports:', error)
      return reports.value
    }
  }
  // Media functions
  const pushMediaRouter = (uuid: string) => {
    // Extract media type from uuid (format: "reportId/mediaType")
    const parts = uuid.split('/')
    if (parts.length === 2) {
      const reportId = parts[0]
      const mediaType = parts[1]

      // Route to the appropriate media page based on type
      if (mediaType === 'video') {
        router.push(`/client/report/${reportId}/video`)
      } else if (mediaType === 'picture' || mediaType === 'pictures') {
        router.push(`/client/report/${reportId}/pictures`)
      } else if (mediaType === 'audio') {
        router.push(`/client/report/${reportId}/audio`)
      } else {
        // Legacy fallback for other media types
        router.push('/client/report/media/' + uuid)
      }
    } else {
      // If format is not as expected, use the legacy route
      router.push('/client/report/media/' + uuid)
    }
  }
  // Function to open template selection modal
  const openTemplateModal = async () => {
    // Initialize the Templates store if not already done
    if (Templates().templates.length === 0) {
      // Templates().init() // REMOVED: Duplicate call, fetch() will handle the data
      await Templates().fetch(1, 20)
    } else {
      // Refresh templates when opening the modal
      await Templates().fetch(Templates().pagination.page, Templates().pagination.limit)
    }
    showTemplateModal.value = true
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
  // Add a computed property to get current user's name
  const currentUser = computed(() => {
    const userJson = getCookie('user')
    if (userJson) {
      try {
        const user = JSON.parse(userJson)
        return user.name || 'Current User'
      } catch (e) {
        console.error('Failed to parse user data from cookie:', e)
        return 'Current User'
      }
    }
    return 'Current User'
  })

  const debugRecievedReports = (response: any, userRole: string) => {
    if (response.length > 0) {
      console.log(
        'Reports received from backend - statuses:',
        response.map((report: any) => report.status)
      )
      if (userRole === 'client_user') {
        // Check if backend is correctly filtering
        const nonApprovedCount = response.filter(
          (report: any) => report.status !== 'approved'
        ).length
        if (nonApprovedCount > 0) {
          console.warn(
            `Backend returned ${nonApprovedCount} non-approved reports despite client_user role!`
          )
        }
      }
    }
  }

  // // Helper function to get current user ID
  // const getCurrentUserId = () => {
  //   try {
  //     const userJson = getCookie('user')
  //     if (userJson) {
  //       const user = JSON.parse(userJson)
  //       return user.id
  //     }
  //     return null
  //   } catch (e) {
  //     console.error('Failed to parse user data from cookie:', e)
  //     return null
  //   }
  // }

  async function checkVideoExists(url) {
    try {
      const res = await fetch(url, { method: 'HEAD' })
      return res.ok
    } catch (e) {
      return false
    }
  }

  return {
    // State
    loading,
    reports,
    reports_data,
    current_report,
    last_updated,
    showTemplateModal,
    // Actions
    init,
    fetchReports,
    saveReport,
    updateReport,
    getReportById,
    deleteReport,
    updateReportStatus,
    formatReportData,
    getConsolidatedReports,
    pushMediaRouter,
    openTemplateModal,
    currentUser,
    getCurrentUserId,
    checkVideoExists,
    debugRecievedReports,
    /**
     * Get reports for a specific client, bypassing other filters
     * @param {String} clientId - Client ID to fetch reports for
     * @param {Number|null} userId - User ID to filter reports for (optional)
     * @param {String|null} userEmail - User email to filter reports for client_user role (optional)
     * @param {String|null} userRole - User role to determine filtering logic (optional)
     * @returns {Array} Array of client reports
     */
    getClientReports: async (clientId, userId = null, userEmail = null, userRole = null) => {
      try {
        loading.value = true

        if (!clientId) {
          throw new Error('Client ID is required')
        }

        // Build query parameters
        const queryParams = new URLSearchParams()

        if (userId) {
          queryParams.append('user_id', userId)
        }

        if (userEmail && userRole === 'client_user') {
          queryParams.append('user_email', userEmail)
          queryParams.append('user_role', userRole)
        }

        const queryString = queryParams.toString()
        const url = `/reports/client/${clientId}${queryString ? `?${queryString}` : ''}`

        // Create a fresh instance for this request with the latest token
        const api = getFreshApiInstance()

        const response = await api.get(url)

        if (response.data.success !== false) {
          const clientReports = response.data.data || []

          // Update last_updated
          last_updated.value = getCurrentTimestamp()

          return clientReports
        } else {
          console.error('API returned error:', response.data.error)
          return []
        }
      } catch (error) {
        console.error('Error fetching client reports:', error)
        return []
      } finally {
        loading.value = false
      }
    }
  }
})
