import { defineStore } from 'pinia'
import { type AxiosInstance } from 'axios'
import { Client } from '../client'
import { Auth } from '../auth'
import { Toast } from '@/utils/toast'
import router from '@/router'
import Swal from 'sweetalert2'
import { shouldRefresh } from '@/utils/syncProtection'

// Define type for client object
interface ClientType {
  uuid?: string;
  [key: string]: any;
}

// Define Range type
interface Range {
  uuid: string;
  rating: string;
  start: number;
  end: number;
  color: string;
  [key: string]: any;
}

// Helper function to get ISO timestamp
function getCurrentTimestamp(): string {
  return new Date().toISOString()
}

// Helper to invalidate browser cache for ranges data
function invalidateCache() {
  // Set timestamp in sessionStorage to track last update
  sessionStorage.setItem('ranges_data_last_updated', getCurrentTimestamp())
  
  // Broadcast the change to other tabs via localStorage
  localStorage.setItem('ranges_data_changed', getCurrentTimestamp())
}

// Listen for changes from other tabs
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (event.key === 'ranges_data_changed') {
      // Trigger refresh in all tabs when data changes
      const rangesStore = Ranges()
      if (rangesStore && rangesStore.fetch) {
        console.log('Detected ranges data change in another tab, refreshing...')
        // Check if we should proceed with the refresh based on cooldown period
        if (!shouldRefresh('ranges')) return;
        
        rangesStore.fetch({ forceRefresh: true })
      }
    }
  })
}

export const Ranges = defineStore('Ranges', {
  state: () => ({
    loading: false,
    data: [],
    ranges: [
      {
        rating: '',
        start: 0,
        end: 0,
        color: ''
      }
    ],
    ranges_data: [] as Range[],
    xios: <AxiosInstance>{},
    last_updated: ''
  }),
  getters: {},
  actions: {
    async init() {
      try {
        const authStore = Auth()
        
        // Ensure auth store is properly initialized
        if (!authStore.xios || !authStore.xios.post) {
          console.log('Auth store axios not available, constructing...')
          await authStore.construct_xios()
        }
        
        // Assign the axios instance
        this.xios = authStore.xios
        
        // Verify the axios instance has the required methods
        if (!this.xios || !this.xios.post) {
          throw new Error('Failed to get valid axios instance from Auth store')
        }
        
        console.log('Ranges store initialized successfully with axios instance')
      } catch (error) {
        console.error('Error initializing Ranges store:', error)
        throw error
      }
    },

    async fetch(options = { forceRefresh: false }) {
      // Add a sync protection check for direct fetch calls
      if (!options.forceRefresh && !shouldRefresh('ranges')) {
        console.log('Fetch ranges skipped due to cooldown')
        return
      }
    
      this.loading = true
      try {
        // Ensure xios is initialized before proceeding
        if (!this.xios || !this.xios.get) {
          console.log('Axios instance not initialized for fetch, initializing now...')
          await this.init()
          
          if (!this.xios || !this.xios.get) {
            console.error('Failed to initialize axios instance for fetch')
            Toast.error('Failed to initialize connection. Please try again.')
            return
          }
        }
        
        const selectedClient: ClientType = Client().selected_client as ClientType
        const client_id = selectedClient?.uuid
        
        // Check if client is selected
        if (!client_id) {
          console.error('No client selected')
          Toast.error('Please select a client first')
          return
        }
        
        // Check if we should use cached data
        const shouldRefreshData = options.forceRefresh || 
                              !this.last_updated || 
                              !sessionStorage.getItem('ranges_data_last_updated');
        
        if (!shouldRefreshData && this.ranges_data.length > 0) {
          console.log('Using cached ranges data')
          this.loading = false
          return
        }
        
        console.log('Fetching ranges for client:', client_id, options.forceRefresh ? '(force refresh)' : '')
        
        const response = await this.xios.get(`/range/fetch`, {
          params: {
            client_id
          }
        })

        if (response.status == 200) {
          const { data, message } = response.data
          this.ranges_data =
            data && data.length > 0
              ? data
              : [
                  {
                    rating: '',
                    start: 0,
                    end: 0,
                    color: ''
                  }
                ]

          this.last_updated = getCurrentTimestamp()
          invalidateCache()
          // Toast.success(message)
        }
      } catch (error) {
        console.log('Error fetching ranges:', error)
        // Toast.error('Failed to fetch percentage ranges')
      } finally {
        this.loading = false
      }
    },

    async create() {
      try {
        this.loading = true
        
        // Ensure xios is initialized before proceeding
        if (!this.xios || !this.xios.post) {
          console.log('Axios instance not initialized, initializing now...')
          await this.init()
          
          // Double-check initialization
          if (!this.xios || !this.xios.post) {
            console.error('Failed to initialize axios instance')
            Toast.error('Failed to initialize connection. Please try again.')
            return
          }
        }
        
        const selectedClient: ClientType = Client().selected_client as ClientType
        
        // Make sure we have a valid client ID
        if (!selectedClient?.uuid) {
          Toast.error('No client selected')
          console.error('No client selected when trying to create ranges')
          return
        }
        
        // Validate range data before sending
        if (!this.ranges || this.ranges.length === 0) {
          Toast.error('No ranges to save')
          console.error('No ranges to save')
          return
        }
        
        // Ensure all ranges have proper data types
        const processedRanges = this.ranges.map(range => ({
          ...range,
          rating: String(range.rating),
          start: parseFloat(range.start as any),
          end: parseFloat(range.end as any),
          color: String(range.color)
        }))
        
        const payload = {
          client_id: selectedClient?.uuid,
          ranges: processedRanges
        }
        
        console.log('Client ID:', selectedClient?.uuid);
        console.log('Ranges payload:', JSON.stringify(payload));

        const response = await this.xios.post(`/range/create`, payload)
        console.log('Range creation response:', response);
        
        if (response.status == 200) {
          const { message } = response.data
          Toast.success(message)
          router.push('/client/percentage-ranges')
        }
      } catch (error: any) {
        console.log('Error creating ranges:', error)
        if (error.response) {
          console.log('Error response data:', error.response.data)
          const { data } = error.response
          Toast.error(data.message)
        } else {
          Toast.error('Failed to connect to the server')
        }
      } finally {
        this.loading = false
      }
    },

    async delete_range(id: any) {
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
            
            // Ensure xios is initialized before proceeding
            if (!this.xios || !this.xios.delete) {
              console.log('Axios instance not initialized for delete, initializing now...')
              await this.init()
              
              if (!this.xios || !this.xios.delete) {
                console.error('Failed to initialize axios instance for delete')
                Toast.error('Failed to initialize connection. Please try again.')
                return
              }
            }
            
            const response = await this.xios.delete(`/range/delete/?range_id=${id}`)

            if (response.status == 200) {
              const { message } = response.data
              
              // Update cache and timestamp
              invalidateCache()
              this.last_updated = getCurrentTimestamp()
              
              Toast.success(message)
              this.fetch({ forceRefresh: true })
            }
          } catch (error: any) {
            console.log(error)
            const { data } = error.response
            Toast.error(data.message)
          } finally {
            this.loading = false
          }
        }
      })
    },

    async update_range(client_index: ClientType, range: Range): Promise<boolean> {
      try {
        console.log('Updating range:', range)
        
        this.loading = true

        // Ensure xios is initialized before proceeding
        if (!this.xios || !this.xios.put) {
          console.log('Axios instance not initialized for update, initializing now...')
          await this.init()
          
          if (!this.xios || !this.xios.put) {
            console.error('Failed to initialize axios instance for update')
            Toast.error('Failed to initialize connection. Please try again.')
            return false
          }
        }

        // Basic validation
        if (!client_index?.uuid || !range) {
          Toast.error('Missing client or range data')
          return false
        }

        // Generate a new uuid if there isn't one for this range
        if (!range.uuid) { range.uuid = crypto.randomUUID() }

        // Find existing range and check for changes
        let index = -1
        const existingRange = this.ranges_data.find((r: Range, i: number) => {
          if (r.uuid === range.uuid) {
            index = i
            return true
          }
          return false
        })

        // Check if anything actually changed
        if (existingRange) {
          const hasChanges = 
            existingRange.rating !== range.rating || 
            existingRange.start !== Number(range.start) || 
            existingRange.end !== Number(range.end) || 
            existingRange.color !== range.color
          
          if (!hasChanges) {
            Toast.info('No changes detected')
            return true
          }
        }
        
        // Process the range data to ensure proper types
        const processedRange = {
          uuid: String(range.uuid),
          rating: String(range.rating),
          start: Number(range.start),
          end: Number(range.end),
          color: String(range.color)
        }
        
        const payload = {
          client_id: client_index.uuid,
          range: processedRange
        }
        
        const response = await this.xios.put(`/range/update`, payload)
        
        if (response.status == 200) {
          const { message } = response.data
          
          // Update cache and timestamp
          invalidateCache()
          this.last_updated = getCurrentTimestamp()
          
          // Update local data if it exists in the cache
          if (index !== -1) {
            this.ranges_data[index] = { ...processedRange };
          }
          
          Toast.success(message)
          return true
        } else {
          console.error('Update failed with status:', response.status)
          Toast.error('Failed to update range')
          return false
        }
      } catch (error: any) {
        console.log('Error updating range:', error)
        if (error.response) {
          console.log('Error response data:', error.response.data)
          const { data } = error.response
          Toast.error(data.message || 'Failed to update range')
        } else {
          Toast.error('Failed to connect to the server')
        }
        return false
      } finally {
        this.loading = false
      }
    }
  }
})
