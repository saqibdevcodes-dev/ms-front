import { defineStore } from 'pinia'
import axios, { type AxiosInstance } from 'axios'
import { Toast } from '@/utils/toast'
import { Auth } from '../auth'
import router from '@/router'
import Swal from 'sweetalert2'
import Cookies from 'js-cookie'
import { shouldRefresh } from '@/utils/syncProtection'

// Define proper types for client data
interface ClientData {
  id?: string
  uuid?: string
  name?: string
  first_name?: string
  last_name?: string
  email?: string
  phone?: string
  domain_name?: string
  created_at?: string
  updated_at?: string
  status?: string
  client_id?: string
  branch_label?: string
  visit_date_label?: string
  branch_report_label?: string
  total_branches_label?: string
  completed_branches_label?: string
  my_reports_label?: string
  na_score_value?: string
}

// Cookie options
const cookieOptions = {
  expires: 7, // 7 days
  path: '/',
  secure: window.location.protocol === 'https:'
}

// Helper function to get ISO timestamp
function getCurrentTimestamp(): string {
  return new Date().toISOString()
}

// Helper to invalidate browser cache for client data
function invalidateCache() {
  // Set timestamp in sessionStorage to track last update
  sessionStorage.setItem('client_data_last_updated', getCurrentTimestamp())

  // Broadcast the change to other tabs via localStorage
  localStorage.setItem('client_data_changed', getCurrentTimestamp())
}

// Listen for changes from other tabs
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (event.key === 'client_data_changed') {
      // Trigger refresh in all tabs when data changes
      const clientStore = Client()
      if (clientStore && clientStore.fetch) {
        console.log('Detected client data change in another tab, refreshing...')
        // Check if we should proceed with the refresh based on cooldown period
        if (!shouldRefresh('client')) return

        clientStore.fetch({ forceRefresh: true })
      }
    }
  })
}

export const Client = defineStore('Client', {
  state: () => ({
    loading: false,
    data: [] as ClientData[],
    clients: [] as ClientData[],
    selected_client: {} as ClientData,
    xios: {} as AxiosInstance,
    last_updated: '',

    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    domain_name: '',

    // Custom label fields
    branch_label: '',
    visit_date_label: '',
    branch_report_label: '',
    total_branches_label: '',
    completed_branches_label: '',
    my_reports_label: '',
    na_score_value: '0'
  }),
  getters: {},
  actions: {
    async init() {
      try {
        // Check if we're on a reset password route before proceeding
        const currentPath = window.location.pathname
        const currentSearch = window.location.search
        const isResetPasswordRoute =
          currentPath.includes('/reset-password') ||
          currentPath.includes('/auth/reset-password') ||
          (currentSearch.includes('token=') && currentSearch.includes('email='))

        if (isResetPasswordRoute) {
          console.log('🔒 Reset password route detected - skipping client initialization')
          // For reset password routes, we don't need client data
          this.xios = Auth().xios // Use the minimal axios instance
          return
        }

        // First try to initialize the axios instance
        const authStore = Auth()

        // Ensure Auth store has constructed its axios instance
        if (!authStore.xios?.get) {
          console.log('Auth store axios not ready, constructing it now...')
          await authStore.construct_xios()
        }

        this.xios = authStore.xios
        if (!this.xios?.get) {
          console.error('Failed to initialize Axios instance from Auth store')
          console.log('Auth store state:', {
            hasToken: !!authStore.token,
            hasUser: !!authStore.user,
            xiosExists: !!authStore.xios
          })
          throw new Error('API client initialization failed')
        }

        // First try to get client data from cookie
        const savedClientStr = Cookies.get('selected_client')
        if (savedClientStr) {
          try {
            const savedClient = JSON.parse(savedClientStr) as ClientData
            if (savedClient && (savedClient.uuid || savedClient.id)) {
              this.selected_client = savedClient
              this.last_updated = getCurrentTimestamp()
              console.log(
                'Loaded selected client from cookie:',
                this.selected_client.name || this.selected_client.domain_name
              )
              return
            }
          } catch (e) {
            console.error('Error parsing saved client data:', e)
            Cookies.remove('selected_client', { path: '/' })
          }
        }

        // If client_user, load their assigned client
        if (Auth().isClientUser() && Auth().user?.client_id) {
          await this.loadClientUserData(Auth().user.client_id)
          return
        }

        // Last resort: load first client for system users
        await this.loadFirstClientForSystemUser()

        // Force refresh to ensure we have latest data including custom labels
        if (this.selected_client?.uuid) {
          await this.refreshSelectedClient()
        }
      } catch (error) {
        console.error('Error in Client store initialization:', error)
      }
    },

    // Helper method to load client data for client_user
    async loadClientUserData(clientId: string | null) {
      if (!clientId) {
        console.error('No client ID provided for client user')
        return
      }

      try {
        const response = await this.xios.get(`/client/view/?client_id=${clientId}`)
        if (response.status === 200) {
          const { data } = response.data
          this.selected_client = data
          this.last_updated = getCurrentTimestamp()
          Cookies.set('selected_client', JSON.stringify(this.selected_client), cookieOptions)
          console.log('Client user - assigned client loaded:', this.selected_client)
        }
      } catch (error) {
        console.error('Error loading client data for client user:', error)
      }
    },

    // Helper method to load first client for system user
    async loadFirstClientForSystemUser() {
      try {
        const response = await this.xios.get(`/client/fetch`)
        if (response.status === 200) {
          const { data } = response.data
          if (data && data.length > 0) {
            this.selected_client = data[0]
            this.last_updated = getCurrentTimestamp()
            Cookies.set('selected_client', JSON.stringify(this.selected_client), cookieOptions)
            console.log('System user - first client loaded:', this.selected_client)
          }
        }
      } catch (error) {
        console.error('Error loading client data for system user:', error)
      }
    },

    async fetch(options = { forceRefresh: false }) {
      // Add a sync protection check for direct fetch calls
      if (!options.forceRefresh && !shouldRefresh('client')) {
        console.log('Fetch client data skipped due to cooldown')
        return
      }

      try {
        this.loading = true
        console.log(
          'Fetching all clients (no pagination)',
          options.forceRefresh ? '- force refresh' : ''
        )

        if (!this.xios?.get) {
          console.log('Axios instance not initialized, initializing now')
          const authStore = Auth()

          // Ensure Auth store has constructed its axios instance
          if (!authStore.xios?.get) {
            console.log('Auth store axios not ready, constructing it now...')
            await authStore.construct_xios()
          }

          this.xios = authStore.xios
          if (!this.xios?.get) {
            throw new Error('Failed to initialize Axios instance')
          }
        }

        const response = await this.xios.get(`/client/fetch`)

        if (response.status === 200) {
          const { data, message } = response.data
          const processedClients = JSON.parse(JSON.stringify(data || []))
          this.clients = processedClients.map((client: ClientData) => {
            if (client.id && !client.uuid) {
              client.uuid = client.id
            }
            return client
          })

          this.last_updated = getCurrentTimestamp()
          invalidateCache()
          Toast.success(message)
        }
      } catch (error) {
        console.error('Error fetching clients:', error)
        Toast.error('Failed to fetch clients')
      } finally {
        this.loading = false
      }
    },

    async create(payload: ClientData) {
      try {
        this.loading = true
        if (!this.xios?.post) {
          const authStore = Auth()
          if (!authStore.xios?.post) {
            await authStore.construct_xios()
          }
          this.xios = authStore.xios
        }

        const response = await this.xios.post(`/client/create`, payload)
        if (response.status == 200) {
          const { message } = response.data
          invalidateCache()
          await this.fetch({ forceRefresh: true })
          this.last_updated = getCurrentTimestamp()
          Toast.success(message)
        }
      } catch (error) {
        console.log(error)
        Toast.error(error instanceof Error ? error.message : 'Error creating client')
      } finally {
        this.loading = false
      }
    },

    async update() {
      try {
        this.loading = true
        const payload = {
          client_id: router?.currentRoute?.value?.params?.id,
          first_name: this.first_name ?? '',
          last_name: this.last_name ?? '',
          domain_name: this.domain_name ?? '',
          branch_label: this.branch_label ?? 'Branch',
          visit_date_label: this.visit_date_label ?? 'Date of Visit',
          branch_report_label: this.branch_report_label ?? 'Branch Report',
          total_branches_label: this.total_branches_label ?? 'Total Branches',
          completed_branches_label: this.completed_branches_label ?? 'Completed Branches',
          my_reports_label: this.my_reports_label ?? 'My Branch Reports',
          na_score_value: this.na_score_value ?? '0'
        }

        if (!this.xios?.post) {
          const authStore = Auth()
          if (!authStore.xios?.post) {
            await authStore.construct_xios()
          }
          this.xios = authStore.xios
        }

        const response = await this.xios.post(`/client/update`, payload)
        if (response.status == 200) {
          const { message } = response.data
          invalidateCache()
          this.last_updated = getCurrentTimestamp()
          router.push('/clients')
          Toast.success(message)
        }
      } catch (error) {
        console.log(error)
        Toast.error(error instanceof Error ? error.message : 'Error updating client')
      } finally {
        this.loading = false
      }
    },

    async view() {
      try {
        const client_id = router?.currentRoute?.value?.params?.id
        this.loading = true

        if (!this.xios?.get) {
          const authStore = Auth()
          if (!authStore.xios?.get) {
            await authStore.construct_xios()
          }
          this.xios = authStore.xios
        }

        const response = await this.xios.get(`/client/view/?client_id=${client_id}`)
        if (response.status == 200) {
          const { data, message } = response.data

          if ((!data.first_name || !data.last_name) && data.name) {
            const nameParts = data.name.split(' ')
            this.first_name = nameParts[0] || ''
            this.last_name = nameParts.slice(1).join(' ') || ''
          } else {
            this.first_name = data.first_name || ''
            this.last_name = data.last_name || ''
          }

          this.email = data.email || ''
          this.phone = data.phone || ''
          this.domain_name = data.domain_name || ''

          // Load custom label fields
          this.branch_label = data.branch_label || 'Branch'
          this.visit_date_label = data.visit_date_label || 'Date of Visit'
          this.branch_report_label = data.branch_report_label || 'Branch Report'
          this.total_branches_label = data.total_branches_label || 'Total Branches'
          this.completed_branches_label = data.completed_branches_label || 'Completed Branches'
          this.my_reports_label = data.my_reports_label || 'My Branch Reports'
          this.na_score_value = data.na_score_value ?? '0'

          this.last_updated = getCurrentTimestamp()
          Toast.success(message)
        }
      } catch (error) {
        console.log('Error in view function:', error)
        Toast.error(error instanceof Error ? error.message : 'Error viewing client')
      } finally {
        this.loading = false
      }
    },

    async delete(uuid: string) {
      Swal.fire({
        title: 'Are you sure?',
        text: "You won't be able to revert this!",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Yes, delete it!'
      }).then(async (result) => {
        if (result.isConfirmed) {
          try {
            this.loading = true
            if (!this.xios?.delete) {
              const authStore = Auth()
              if (!authStore.xios?.delete) {
                await authStore.construct_xios()
              }
              this.xios = authStore.xios
            }

            const response = await this.xios.delete(`/client/delete/?client_id=${uuid}`)
            if (response.status == 200) {
              const { message } = response.data

              if (this.selected_client.uuid === uuid || this.selected_client.id === uuid) {
                this.selected_client = {} as ClientData
                Cookies.remove('selected_client', { path: '/' })
              }

              invalidateCache()
              this.last_updated = getCurrentTimestamp()
              await this.fetch({ forceRefresh: true })
              Swal.fire('Deleted!', 'Client has been deleted.', 'success')
              Toast.success(message)
            }
          } catch (error) {
            console.log(error)
            Toast.error(error instanceof Error ? error.message : 'Error deleting client')
          } finally {
            this.loading = false
          }
        }
      })
    },

    selectClient(clientData: ClientData) {
      const currentUser = Auth().user
      const clientWithMeta = {
        ...clientData,
        last_selected_by: currentUser?.uuid || currentUser?.id || undefined
      }

      this.selected_client = clientWithMeta
      Cookies.set('selected_client', JSON.stringify(clientWithMeta), cookieOptions)
      this.last_updated = getCurrentTimestamp()
      return this.selected_client
    },

    async refreshSelectedClient() {
      try {
        if (!this.selected_client?.uuid) {
          console.log('No selected client to refresh')
          return
        }

        console.log('Refreshing selected client data to get latest custom labels...')
        const response = await this.xios.get(`/client/view/?client_id=${this.selected_client.uuid}`)

        if (response.status === 200) {
          const { data } = response.data
          this.selected_client = data
          this.last_updated = getCurrentTimestamp()
          // Update cookie with fresh data including custom labels
          Cookies.set('selected_client', JSON.stringify(this.selected_client), cookieOptions)
          console.log('Selected client refreshed with custom labels:', {
            branchLabel: data.branch_label,
            visitDateLabel: data.visit_date_label,
            totalBranchesLabel: data.total_branches_label
          })
        }
      } catch (error) {
        console.error('Error refreshing selected client:', error)
      }
    },

    clearSelectedClient() {
      this.selected_client = {} as ClientData
      Cookies.remove('selected_client', { path: '/' })
      this.last_updated = getCurrentTimestamp()
    }
  }
})
