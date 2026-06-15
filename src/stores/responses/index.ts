import { defineStore } from 'pinia'
import axios, { type AxiosInstance } from 'axios'
import { Client } from '../client'
import { Auth } from '../auth'
import { Toast } from '@/utils/toast'
import router from '@/router'
import type { Response } from '@/interfaces/response'
import Swal from 'sweetalert2'
import { shouldRefresh } from '@/utils/syncProtection'

// Helper function to get ISO timestamp
function getCurrentTimestamp(): string {
  return new Date().toISOString()
}

// Helper to invalidate browser cache for responses data
function invalidateCache() {
  // Set timestamp in sessionStorage to track last update
  sessionStorage.setItem('responses_data_last_updated', getCurrentTimestamp())
  
  // Broadcast the change to other tabs via localStorage
  localStorage.setItem('responses_data_changed', getCurrentTimestamp())
}

// Listen for changes from other tabs
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (event.key === 'responses_data_changed') {
      // Trigger refresh in all tabs when data changes
      const responsesStore = Responses()
      if (responsesStore && responsesStore.fetch) {
        console.log('Detected responses data change in another tab, refreshing...')
        // Check if we should proceed with the refresh based on cooldown period
        if (!shouldRefresh('responses')) return;
        
        responsesStore.fetch({ forceRefresh: true })
      }
    }
  })
}

export const Responses = defineStore('Responses', {
  state: () => ({
    loading: false,
    data: [],
    responses: [
      {
        response: '',
        total_score: 0,
        operation: '+'
      }
    ],
    responses_data:[],
    selected_essentials: [],
    template_download_url: '',
    xios: <AxiosInstance>{},
    last_updated: ''
  }),
  getters: {},
  actions: {
    async init() {
      this.xios = Auth().xios
    },

    async fetch(options = { forceRefresh: false }) {
      // Add a sync protection check for direct fetch calls
      if (!options.forceRefresh && !shouldRefresh('responses')) {
        console.log('Fetch responses skipped due to cooldown')
        return
      }
      
      this.loading = true
      try {
        // Make sure we have a selected client
        if (!Client().selected_client?.uuid) {
          console.warn('No client selected, cannot fetch responses')
          this.responses_data = []
          return
        }
        
        // Check if we should use cached data
        const shouldRefresh = options.forceRefresh || 
                              !this.last_updated || 
                              !sessionStorage.getItem('responses_data_last_updated');
        
        if (!shouldRefresh && this.responses_data.length > 0) {
          console.log('Using cached responses data')
          this.loading = false
          return
        }
        
        const client_id = Client().selected_client.uuid
        console.log('Fetching responses for client:', client_id, options.forceRefresh ? '(force refresh)' : '')
        
        // Fetch responses
        const response = await this.xios.get(`/response/fetch`, {
          params: { 
            client_id
          }
        })
        
        console.log('Fetched responses for client:', client_id, response)

        if (response.status == 200) {
          const { data, message } = response.data
          this.responses_data = data
          // Only update responses if we're on the edit page
          if (window.location.pathname.includes('/response/edit/')) {
            this.responses = data.length > 0 ? data : this.responses
          }
          this.last_updated = getCurrentTimestamp()
          invalidateCache()
          // Toast.success(message)
        }
      } catch (error) {
        console.log('Error fetching responses:', error)
        Toast.error('Failed to fetch responses')
        this.responses_data = []
      } finally {
        this.loading = false
      }
    },

    async create() {
      try {
        this.loading = true
        
        if (!Client().selected_client?.uuid) {
          throw new Error('No client selected. Please select a client first.')
        }
        
        // Deep clone the responses to avoid reference issues
        const responsesToSave = JSON.parse(JSON.stringify(this.responses))
        
        // Validate and clean responses data
        const cleanedResponses = responsesToSave.map(resp => {
          // Log each response for debugging
          console.log('Processing response:', resp)
          
          return {
            response: resp.response || '',
            total_score: Number(resp.total_score) || 0,
            operation: resp.operation || '+',
            uuid: resp.uuid || undefined // Include UUID only if it exists
          }
        })
        
        // Validate no empty response names
        const emptyResponses = cleanedResponses.filter(r => !r.response || r.response.trim() === '')
        if (emptyResponses.length > 0) {
          Toast.error('Response name is required for all responses')
          return false
        }
        
        const payload = {
          client_id: Client().selected_client?.uuid,
          responses: cleanedResponses
        }
        
        console.log('Creating responses with payload:', JSON.stringify(payload, null, 2))

        const response = await this.xios.post(`/response/create`, payload)
        console.log('Create response result:', response)
        
        if (response.status == 200) {
          const { message, data } = response.data
          
          // Update cache and timestamp
          invalidateCache()
          this.last_updated = getCurrentTimestamp()
          
          // After successful save, fetch updated responses 
          // instead of replacing them to ensure we have all responses
          await this.fetch({ forceRefresh: true })
          
          Toast.success(message)
          router.push('/client/responses')
          return true
        }
        return false
      } catch (error: any) {
        console.error('Error creating responses:', error)
        
        if (error.response && error.response.data) {
          const { data } = error.response
          Toast.error(data.message || 'Failed to save responses')
        } else {
          Toast.error(error.message || 'Failed to save responses')
        }
        return false
      } finally {
        this.loading = false
      }
    },
    
    async update_response(responseData) {
      try {
        this.loading = true
        
        // Validate data before sending
        if (!responseData || !responseData.uuid) {
          Toast.error('Invalid response data')
          return false
        }
        
        const payload = {
          client_id: Client().selected_client?.uuid,
          response: responseData
        }

        const response = await this.xios.post(`/response/update`, payload)
        if (response.status == 200) {
          const { message } = response.data
          
          // Update cache and timestamp
          invalidateCache()
          this.last_updated = getCurrentTimestamp()
          
          Toast.success(message)
          
          // Update local data efficiently
          const index = this.responses_data.findIndex(r => r.uuid === responseData.uuid);
          if (index !== -1) {
            // Replace just the item that changed
            this.responses_data[index] = { ...responseData };
          }
          
          return true;
        }
        return false;
      } catch (error: any) {
        console.log(error)
        const { data } = error.response || {}
        Toast.error(data?.message || 'Failed to update response')
        return false;
      } finally {
        this.loading = false
      }
    },

    async delete_Response(id: any) {
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
            const response = await this.xios.delete(`/response/delete/?response_id=${id}`)

            if (response.status == 200) {
              const { message } = response.data
              
              // Update cache and timestamp
              invalidateCache()
              this.last_updated = getCurrentTimestamp()
              
              Toast.success(message)
              this.fetch({ forceRefresh: true });
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
    
    // Reset responses to initial state
    reset() {
      this.responses = [
        {
          response: '',
          total_score: 0,
          operation: '+',
          // Keep these for backwards compatibility
          applicable_score: 0,
          achieved_score: 0
        }
      ]
    }
  }
})
