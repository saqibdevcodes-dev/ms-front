import { defineStore } from 'pinia'
import axios, { type AxiosInstance } from 'axios'
import type { AxiosRequestConfig, AxiosResponse } from 'axios'
import router from '@/router'
import { Toast } from '@/utils/toast'
import type { User, Branch } from '@/interfaces/user'
import { getDeviceFingerprint } from '@/utils/deviceInfo'
import Cookies from 'js-cookie'
import Swal from 'sweetalert2'

// Cookie options
const cookieOptions = {
  expires: 1, // 1 day (reduced from 7 days since "Remember me" option was removed)
  path: '/',
  secure: window.location.protocol === 'https:'
}

// Add a custom interface to extend AxiosRequestConfig
interface CustomAxiosRequestConfig extends AxiosRequestConfig {
  _retryAfterRefresh?: boolean
  _retry?: boolean
  _maxRetries?: number
  _retryCount?: number
}

export const Auth = defineStore('Auth', {
  state: () => ({
    loading: false,
    resetPasswordLoading: false,
    user: <User>{},
    session: <any>{},
    token: '',
    refreshing: false, // Track when a token refresh is in progress
    user_roles: [],
    xios: <AxiosInstance>{}, //axios copy with defined headers,
    lastAuthCheck: 0, // Timestamp of last successful auth check
    tokenExpiryTimer: null as NodeJS.Timeout | null, // Timer for token expiry checks
    isLoggedOut: false // Track if user has been logged out due to token expiry
  }),
  getters: {},
  actions: {
    /**
     * Initialize the auth store and set up token monitoring
     */
    async init() {
      try {
        // Try to restore session from cookies
        const token = Cookies.get('token')
        const userCookie = Cookies.get('user')

        if (token && userCookie) {
          this.token = token
          try {
            this.user = JSON.parse(userCookie)
          } catch (e) {
            console.error('Failed to parse user cookie:', e)
            this._clearAuthData()
            return false
          }

          // Validate the token
          const isValid = await this.current()
          if (isValid) {
            await this.construct_xios()
            // this._startTokenMonitoring() // DISABLED: Stop automatic token monitoring
            return true
          }
        }

        return false
      } catch (error) {
        console.error('Auth initialization error:', error)
        this._clearAuthData()
        return false
      }
    },

    /**
     * Start periodic token validation monitoring
     * @private
     */
    _startTokenMonitoring() {
      // Clear any existing timer
      if (this.tokenExpiryTimer) {
        clearInterval(this.tokenExpiryTimer)
      }

      // Check token validity every 30 seconds
      this.tokenExpiryTimer = setInterval(async () => {
        if (this.token && !this.isLoggedOut) {
          const isValid = await this._validateTokenSilently()
          if (!isValid) {
            console.log('Token validation failed during monitoring - logging out')
            this._handleTokenExpiry()
          }
        }
      }, 30000) // 30 seconds
    },

    /**
     * Stop token monitoring
     * @private
     */
    _stopTokenMonitoring() {
      if (this.tokenExpiryTimer) {
        clearInterval(this.tokenExpiryTimer)
        this.tokenExpiryTimer = null
      }
    },

    /**
     * Validate token silently without showing errors to user
     * @private
     */
    async _validateTokenSilently(): Promise<boolean> {
      try {
        if (!this.token) return false

        const response = await axios.get(`${import.meta.env.VITE_ENDPOINT_URL}/auth/current`, {
          headers: {
            Authorization: `Bearer ${this.token}`
          },
          timeout: 5000
        })

        if (response.status === 200 && response.data?.data?.user) {
          this.lastAuthCheck = Date.now()
          return true
        }

        return false
      } catch (error: any) {
        if (error.response?.status === 401) {
          // Try token refresh one time
          const refreshed = await this.refreshToken()
          return refreshed
        }
        return false
      }
    },

    /**
     * Handle token expiry by logging out the user
     * @private
     */
    _handleTokenExpiry() {
      if (this.isLoggedOut) return // Prevent multiple logout calls

      this.isLoggedOut = true
      console.log('Token expired - logging out user')

      // Show user-friendly message
      // Toast.error('Your session has expired. Please sign in again.')

      // Clear auth data and redirect
      this._clearAuthData()
      this._stopTokenMonitoring()

      // Redirect to login page
      if (router.currentRoute.value.path !== '/') {
        router.push('/')
      }
    },

    /**
     * Construct axios instance with authorization headers
     */
    async construct_xios() {
      const instance = axios.create({
        baseURL: import.meta.env.VITE_ENDPOINT_URL,
        headers: {
          Authorization: `Bearer ${this.token}`
        }
      })

      // Add response interceptor to handle 401 errors
      instance.interceptors.response.use(
        (response) => response,
        async (error) => {
          const originalRequest = error.config as CustomAxiosRequestConfig

          // If the error is 401 and we haven't tried refreshing the token yet
          if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true

            // Try to refresh the token
            const refreshed = await this.refreshToken()
            if (refreshed) {
              // Update the authorization header with the new token
              if (originalRequest.headers) {
                originalRequest.headers.Authorization = `Bearer ${this.token}`
              } else {
                originalRequest.headers = {
                  Authorization: `Bearer ${this.token}`
                }
              }
              // Retry the original request
              return instance(originalRequest)
            } else {
              // Token refresh failed - handle expiry
              this._handleTokenExpiry()
            }
          }

          return Promise.reject(error)
        }
      )

      this.xios = instance
    },

    /**
     * Make an authenticated API request that handles token refresh
     * @param {string} method - The HTTP method (get, post, put, delete)
     * @param {string} url - The URL to request
     * @param {any} data - The request payload (for POST/PUT)
     * @param {CustomAxiosRequestConfig} config - Additional axios config
     * @returns {Promise<AxiosResponse>} - The axios response
     */
    async authenticatedRequest(
      method: 'get' | 'post' | 'put' | 'delete',
      url: string,
      data: any = null,
      config: CustomAxiosRequestConfig = {}
    ): Promise<AxiosResponse> {
      // Make sure we have an initialized xios instance
      if (!this.xios || !this.xios.request) {
        await this.construct_xios()
      }

      // Set default timeout if not provided
      if (!config.timeout) {
        config.timeout = 30000 // 30 seconds default timeout
      }

      // Add request performance tracking
      const startTime = Date.now()

      try {
        // Add additional headers
        const headers = {
          ...(config.headers || {})
        }
        config.headers = headers

        // Make the request with proper method
        let response

        if (method === 'get' || method === 'delete') {
          response = await this.xios[method](url, config)
        } else {
          response = await this.xios[method](url, data, config)
        }

        // Log request performance for slow requests (>1s)
        const requestTime = Date.now() - startTime
        if (requestTime > 1000) {
          console.warn(`Slow API request: ${method.toUpperCase()} ${url} took ${requestTime}ms`)
        }

        return response
      } catch (error: any) {
        // Log request performance for failed requests
        const requestTime = Date.now() - startTime
        console.error(`Failed API request: ${method.toUpperCase()} ${url} after ${requestTime}ms`)

        // If it's a 401 error, try to refresh the token and retry
        if (error.response?.status === 401 && !config._retryAfterRefresh) {
          console.log('Received 401 response, attempting token refresh')
          const refreshed = await this.refreshToken()

          if (refreshed) {
            console.log('Token refreshed successfully, retrying request')
            // Create new config with retry flag
            const newConfig = { ...config, _retryAfterRefresh: true }

            // Retry with the new token
            return this.authenticatedRequest(method, url, data, newConfig)
          } else {
            console.error('Token refresh failed, cannot retry request')
            this._handleTokenExpiry()
          }
        }

        // Handle timeout errors specially
        if (error.code === 'ECONNABORTED') {
          console.error(
            `Request timeout: ${method.toUpperCase()} ${url} timed out after ${config.timeout}ms`
          )
          error.message = `Request timed out. Please try again.`
        }

        return Promise.reject(error)
      }
    },

    async signin(payload: any) {
      this.loading = true
      this.isLoggedOut = false // Reset logout flag

      try {
        console.log('Attempting to sign in...')

        // Get device info for session tracking
        const deviceFingerprint = await getDeviceFingerprint()

        // Include device info in login request
        const requestData = {
          ...payload,
          macAddress: deviceFingerprint
        }

        console.log('Checking client access before sign-in')
        const checkResponse = await axios.post(
          `${import.meta.env.VITE_ENDPOINT_URL}/auth/check-client-access`,
          requestData,
          {
            withCredentials: true
          }
        )

        let selectedClientId: string | null = null
        const checkData = checkResponse.data || {}

        if (checkData.is_client_user) {
          const assignedClients = Array.isArray(checkData.assigned_clients)
            ? checkData.assigned_clients
            : []

          if (checkData.requires_client_selection && assignedClients.length > 1) {
            const clientOptions: Record<string, string> = {}
            assignedClients.forEach((client: any) => {
              if (client?.uuid) {
                clientOptions[client.uuid] = client.name || client.domain_name || client.uuid
              }
            })

            const selectionResult = await Swal.fire({
              title: 'Select Client Dashboard',
              html: `
                <div style="text-align:left; color:#334155; font-size:14px; line-height:1.5;">
                  <p style="margin:0 0 8px 0; color:#ffffff;">This user is assigned to multiple clients.</p>
                  <p style="margin:0; color:#ffffff;">Choose which client dashboard you want to open.</p>
                </div>
              `,
              input: 'select',
              inputOptions: clientOptions,
              inputPlaceholder: 'Choose a client',
              showCancelButton: true,
              confirmButtonText: 'Continue',
              cancelButtonText: 'Cancel',
              width: 560,
              background: '#ffffff',
              color: '#0f172a',
              confirmButtonColor: '#2563eb',
              cancelButtonColor: '#64748b',
              allowOutsideClick: false,
              allowEscapeKey: true,
              reverseButtons: true,
              customClass: {
                popup: 'rounded-2xl shadow-2xl',
                title: 'text-slate-900',
                confirmButton: 'px-5 py-2 font-semibold',
                cancelButton: 'px-5 py-2 font-semibold'
              },
              didOpen: () => {
                const selectElement = document.querySelector(
                  '.swal2-select'
                ) as HTMLSelectElement | null
                if (selectElement) {
                  selectElement.style.backgroundColor = '#f8fafc'
                  selectElement.style.color = '#0f172a'
                  selectElement.style.border = '1px solid #cbd5e1'
                  selectElement.style.borderRadius = '10px'
                  selectElement.style.padding = '10px 12px'
                  selectElement.style.fontSize = '14px'

                  Array.from(selectElement.options).forEach((option) => {
                    option.style.color = '#0f172a'
                    option.style.backgroundColor = '#ffffff'
                  })
                }
              },
              inputValidator: (value) => {
                if (!value) {
                  return 'Please select a client'
                }
                return null
              }
            })

            if (!selectionResult.isConfirmed || !selectionResult.value) {
              this.loading = false
              return
            }

            selectedClientId = selectionResult.value
          } else if (checkData.selected_client_id) {
            selectedClientId = checkData.selected_client_id
          }
        }

        console.log('Making sign-in request with device info')
        const response = await axios.post(
          `${import.meta.env.VITE_ENDPOINT_URL}/auth/login`,
          {
            ...requestData,
            selected_client_id: selectedClientId
          },
          {
            withCredentials: true
          }
        )

        if (response.status === 200) {
          if (response.data?.requires_client_selection) {
            Toast.error('Please select a client to continue.')
            this._clearAuthData()
            return
          }

          console.log('Authentication successful')
          Toast.success(response.data.message)

          // Validate the user data from the response
          if (response.data.user && response.data.user.email) {
            console.log('Setting authenticated user:', response.data.user.email)
            this.user = response.data.user

            // Store in cookies
            Cookies.set('user', JSON.stringify(response.data.user), cookieOptions)
          } else {
            console.error('Invalid user data in authentication response')
            Toast.error('Invalid user data received from server')
            this._clearAuthData()
            return
          }

          // Store the token
          if (response.data.token) {
            this.token = response.data.token

            // Store token in cookie
            Cookies.set('token', response.data.token, cookieOptions)

            // Set up the axios instance with the token
            await this.construct_xios()

            // Start token monitoring
            // this._startTokenMonitoring() // DISABLED: Stop automatic token monitoring
          } else {
            console.error('No token received from server')
            Toast.error('Authentication failed: No token received')
            this._clearAuthData()
            return
          }

          // Redirect based on user role
          router.push('/dashboard')
        }
      } catch (error: any) {
        console.log('Authentication error:', error)
        this._clearAuthData()

        if (error?.response?.data?.message) {
          Toast.error(error.response.data.message)
        } else {
          Toast.error('Invalid credentials')
        }
      } finally {
        this.loading = false
      }
    },

    async signup(payload: any) {
      this.loading = true

      try {
        const response = await axios.post(
          `${import.meta.env.VITE_ENDPOINT_URL}/auth/signup`,
          payload
        )

        if (response.status === 200) {
          Toast.success(response.data.message)

          setTimeout(() => {
            router.push('/signin')
          }, 1500)
        }
      } catch (error: any) {
        console.log(error)

        if (error?.response?.data?.message) {
          Toast.error(error.response.data.message)
        } else {
          Toast.error('An error occurred during sign up')
        }
      } finally {
        this.loading = false
      }
    },

    async signout() {
      try {
        console.log('Signing out user')
        this.loading = true
        this.isLoggedOut = true

        // Stop token monitoring
        this._stopTokenMonitoring()

        // If we have a token, notify the server about logout
        if (this.token) {
          try {
            await axios.get(`${import.meta.env.VITE_ENDPOINT_URL}/auth/logout`, {
              headers: {
                Authorization: `Bearer ${this.token}`
              },
              timeout: 5000 // Don't wait too long for logout
            })
          } catch (error) {
            console.warn('Failed to notify server about logout:', error)
            // Continue with logout even if server notification fails
          }
        }

        // Clear authentication data
        this._clearAuthData()

        // Show success message
        // Toast.success('You have been signed out successfully')

        // Redirect to sign-in page
        if (router.currentRoute.value.path !== '/sign-in') {
          router.push('/')
        }
      } catch (error: any) {
        console.error('Error during sign out:', error)
        // Force clear auth data even if logout fails
        this._clearAuthData()
        router.push('/')
      } finally {
        this.loading = false
      }
    },

    async fetch_user_roles() {
      try {
        console.log('Fetching user roles...')
        const response = await this.authenticatedRequest('get', '/user/roles')

        if (response.status === 200 && response.data) {
          this.user_roles = response.data.roles || []
          console.log('User roles fetched successfully:', this.user_roles)
          return true
        }

        return false
      } catch (error: any) {
        console.error('Error fetching user roles:', error)
        this.user_roles = []
        return false
      }
    },

    async current() {
      console.log('Checking current authentication status')

      // Check if we have a valid user and recent auth check (less than 5 minutes ago)
      // This prevents excessive API calls during navigation
      const now = Date.now()
      const fiveMinutesAgo = now - 5 * 60 * 1000 // 5 minutes in milliseconds

      if (this.user?.id && this.token && this.lastAuthCheck > fiveMinutesAgo && !this.isLoggedOut) {
        console.log('Using cached authentication status')
        return true
      }

      // Try to get token from cookie first, then fallback to memory
      const token = Cookies.get('token') || this.token

      if (!token) {
        console.log('No token found, clearing auth data')
        this._clearAuthData()
        return false
      }

      // Set token to memory if it's only in cookie
      if (!this.token && token) {
        this.token = token
      }

      try {
        console.log('Validating token with API')
        // Validate the token by making an API request
        const response = await axios.get(`${import.meta.env.VITE_ENDPOINT_URL}/auth/current`, {
          headers: {
            Authorization: `Bearer ${token}`
          },
          // Add timeout to prevent hanging
          timeout: 5000
        })

        // Extract user data from the response
        const { data } = response.data
        if (data && data.user && data.user.email) {
          console.log('Valid user authenticated:', data.user.email)

          // Update user data in store and cookie
          this.user = data.user
          Cookies.set('user', JSON.stringify(data.user), cookieOptions)

          // If a new token is provided, update it
          if (data.token) {
            console.log('Updating token')
            this.token = data.token
            Cookies.set('token', data.token, cookieOptions)
          }

          // Update last auth check timestamp
          this.lastAuthCheck = now
          this.isLoggedOut = false // Reset logout flag

          // Construct xios instance with the latest token
          await this.construct_xios()

          // Start token monitoring if not already running
          if (!this.tokenExpiryTimer) {
            // this._startTokenMonitoring() // DISABLED: Stop automatic token monitoring
          }

          return true
        } else {
          console.warn('Invalid or incomplete user data received from API')
          this._clearAuthData()
          return false
        }
      } catch (error: any) {
        console.error('Error validating token:', error.message)

        if (error.response?.status === 401) {
          console.warn('Unauthorized access - token expired or invalid')
          // Try token refresh if this was an expired token error
          const refreshed = await this.refreshToken()
          if (!refreshed) {
            this._handleTokenExpiry()
          }
          return refreshed
        } else {
          console.warn('Server error or network issue')
          this._clearAuthData()
          return false
        }
      }
    },

    /**
     * Clear all authentication data
     * @private
     */
    _clearAuthData() {
      // Stop token monitoring
      this._stopTokenMonitoring()

      // Reset store state
      this.user = <User>{}
      this.token = ''
      this.session = <any>{}
      this.lastAuthCheck = 0

      // Clear cookies
      Cookies.remove('token', { path: '/' })
      Cookies.remove('user', { path: '/' })
      Cookies.remove('selected_client', { path: '/' })
    },

    /**
     * Attempt to refresh the authentication token
     * @returns {Promise<boolean>} True if token was successfully refreshed
     */
    async refreshToken() {
      // If already refreshing, wait for that to complete
      if (this.refreshing) {
        await new Promise((resolve) => {
          const checkRefresh = () => {
            if (!this.refreshing) {
              resolve(true)
            } else {
              setTimeout(checkRefresh, 100)
            }
          }
          checkRefresh()
        })

        // Return success if we have a token after waiting
        return !!this.token && !this.isLoggedOut
      }

      try {
        this.refreshing = true
        this.loading = true
        console.log('Attempting to refresh authentication token')

        // Make sure there's a token to refresh
        if (!this.token) {
          console.error('Cannot refresh token: No existing token found')
          this._handleTokenExpiry()
          return false
        }

        console.log('Making refresh token request with existing token')

        // Make a call to the refresh token endpoint
        const response = await axios.post(
          `${import.meta.env.VITE_ENDPOINT_URL}/auth/refresh-token`,
          {},
          {
            headers: {
              Authorization: `Bearer ${this.token}`
            },
            withCredentials: true,
            timeout: 10000 // 10 second timeout for refresh
          }
        )

        if (response.status === 200 && response.data.token) {
          console.log('Token refresh successful')

          // Update token and user data
          this.token = response.data.token
          Cookies.set('token', response.data.token, cookieOptions)

          if (response.data.user && response.data.user.email) {
            console.log('Setting refreshed user:', response.data.user.email)
            this.user = response.data.user
            Cookies.set('user', JSON.stringify(response.data.user), cookieOptions)
          } else {
            console.warn('Token refresh successful but no valid user data')
          }

          // Update last auth check
          this.lastAuthCheck = Date.now()
          this.isLoggedOut = false

          // Reconstruct axios instance with new token
          await this.construct_xios()
          return true
        }

        // If we didn't get a 200 or no token was provided
        console.warn('Token refresh failed: Invalid response', response)
        this._handleTokenExpiry()
        return false
      } catch (error: any) {
        console.error('Token refresh failed:', error)

        // Log more detailed error information
        if (error.response) {
          console.error('Error response:', {
            status: error.response.status,
            data: error.response.data
          })

          // If token is explicitly rejected (invalid/expired), handle expiry
          if (error.response.status === 401 || error.response.status === 403) {
            console.log('Token explicitly rejected during refresh')
            this._handleTokenExpiry()
          }
        } else if (error.request) {
          console.error('No response received during token refresh:', error.request)
        } else {
          console.error('Error setting up refresh request:', error.message)
        }

        // Handle token expiry on refresh failure
        this._handleTokenExpiry()
        return false
      } finally {
        this.refreshing = false
        this.loading = false
      }
    },

    // Check if the current user is an admin
    isAdmin() {
      return this.user?.system_role === 'admin'
    },

    // Check if the current user is a reporting user
    isReportingUser() {
      return this.user?.system_role === 'reporting_user'
    },

    // Check if the current user is a client user
    isClientUser() {
      return this.user?.system_role === 'client_user'
    },

    // Get the current user's system role
    getUserRole() {
      return this.user?.system_role || 'Unknown'
    },

    /**
     * Get the branches a user has access to
     * @returns {Array} Array of branch IDs or branch codes the user has access to
     */
    getUserBranches() {
      // Return the user's branch assignments if they exist
      if (this.user?.branches && Array.isArray(this.user.branches)) {
        return this.user.branches
      }

      // If the user has a branches_access field, use that
      if (this.user?.branches_access && Array.isArray(this.user.branches_access)) {
        return this.user.branches_access
      }

      // If no branch restrictions are found, return empty array
      return []
    },

    /**
     * Check if the user has access to a specific branch
     * @param {string} branchId The branch ID or code to check access for
     * @returns {boolean} True if the user has access to the branch
     */
    hasBranchAccess(branchId: string) {
      // If user is admin, they have access to all branches
      if (this.isAdmin()) {
        return true
      }

      // Get user's branch assignments
      const userBranches = this.getUserBranches()

      // If no branch restrictions are defined, user has access to all branches
      if (!userBranches.length) {
        return true
      }

      // Check if the branchId is in the user's allowed branches
      return userBranches.some((branch: string | Branch) => {
        // Handle different branch data structures
        if (typeof branch === 'string') {
          return branch === branchId
        }

        // If branch is an object, check id, uuid, or branch_code fields
        if (typeof branch === 'object' && branch !== null) {
          return (
            branch.id === branchId ||
            branch.uuid === branchId ||
            branch.branch_id === branchId ||
            branch.branch_code === branchId
          )
        }

        return false
      })
    },

    /**
     * Request a password reset for the provided email
     * @param {string} email The email address to send the reset link to
     * @returns {Promise<boolean>} True if the request was successful
     */
    async forgotPassword(email: string) {
      try {
        this.resetPasswordLoading = true

        const response = await axios.post(
          `${import.meta.env.VITE_ENDPOINT_URL}/auth/forgot-password`,
          { email },
          {
            headers: {
              'Content-Type': 'application/json'
            }
          }
        )

        if (response.status === 200) {
          Toast.success(response.data.message || 'Password reset link has been sent to your email')
          return true
        }

        return false
      } catch (error: any) {
        if (error.response && error.response.data && error.response.data.message) {
          Toast.error(error.response.data.message)
        } else {
          Toast.error('Unable to process your request. Please try again later.')
        }
        return false
      } finally {
        this.resetPasswordLoading = false
      }
    },

    /**
     * Construct minimal axios instance without authentication for public routes
     */
    async construct_minimal_xios() {
      const instance = axios.create({
        baseURL: import.meta.env.VITE_ENDPOINT_URL
      })

      // Add basic error handling
      instance.interceptors.response.use(
        (response) => response,
        async (error) => {
          console.error('API error in minimal instance:', error)
          return Promise.reject(error)
        }
      )

      this.xios = instance
      console.log('Created minimal unauthenticated API client')
    },

    /**
     * Make an authenticated API request with a longer timeout for critical operations
     * This is used for important operations like password reset that shouldn't time out easily
     */
    async authenticatedRequestCritical(
      method: 'get' | 'post' | 'put' | 'delete',
      url: string,
      data: any = null,
      config: CustomAxiosRequestConfig = {}
    ): Promise<AxiosResponse> {
      // Set a much longer timeout for critical operations
      const criticalConfig = {
        ...config,
        timeout: config.timeout || 60000, // 60 seconds default for critical operations

        // Add retry capability
        _maxRetries: 2,
        _retryCount: 0
      }

      const executeRequest = async (retryCount: number): Promise<AxiosResponse> => {
        try {
          // Increase timeout for each retry
          if (retryCount > 0) {
            criticalConfig.timeout = 60000 + retryCount * 30000 // 60s, then 90s, then 120s
            console.log(
              `Retry ${retryCount} for critical request with ${
                criticalConfig.timeout / 1000
              }s timeout`
            )
          }

          // Execute the standard authenticated request with our config
          return await this.authenticatedRequest(method, url, data, criticalConfig)
        } catch (error: any) {
          // Only retry on timeout or network errors, not on 4xx or 5xx responses
          if (
            (error.code === 'ECONNABORTED' || !error.response) &&
            criticalConfig._retryCount < criticalConfig._maxRetries
          ) {
            criticalConfig._retryCount++
            console.log(
              `Critical request failed, attempting retry ${criticalConfig._retryCount}/${criticalConfig._maxRetries}`
            )

            // Wait with increasing backoff before retrying
            const backoffMs = 2000 * criticalConfig._retryCount
            await new Promise((resolve) => setTimeout(resolve, backoffMs))

            // Retry the request
            return executeRequest(criticalConfig._retryCount)
          }

          // For other errors or if we've exceeded max retries, propagate the error
          throw error
        }
      }

      // Start the request with retry capabilities
      return executeRequest(0)
    }
  }
})
