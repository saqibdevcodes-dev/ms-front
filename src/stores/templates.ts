import { defineStore } from 'pinia'
import { ref } from 'vue'
import axios from 'axios'
import { Toast } from '@/utils/toast'
import { Client } from './client'
import { Auth } from './auth'
import { shouldRefresh } from '@/utils/syncProtection'

// Helper function to get ISO timestamp
function getCurrentTimestamp(): string {
  return new Date().toISOString()
}

// Helper to invalidate browser cache for templates data
function invalidateCache() {
  // Set timestamp in sessionStorage to track last update
  sessionStorage.setItem('templates_data_last_updated', getCurrentTimestamp())
  
  // Broadcast the change to other tabs via localStorage
  localStorage.setItem('templates_data_changed', getCurrentTimestamp())
}

// Listen for changes from other tabs
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (event.key === 'templates_data_changed') {
      // Trigger refresh in all tabs when data changes
      const templatesStore = Templates()
      if (templatesStore) {
        console.log('Detected templates data change in another tab, refreshing...')
        // Check if we should proceed with the refresh based on cooldown period
        if (!shouldRefresh('templates')) return;
        
        templatesStore.fetch(
          templatesStore.pagination.page, 
          templatesStore.pagination.limit,
          { forceRefresh: true }
        )
      }
    }
  })
}

export const Templates = defineStore('templates', () => {
  // State
  const loading = ref(false)
  const templates = ref([])
  const current_template = ref(null)
  const last_updated = ref('')
  
  // Pagination state
  const pagination = ref({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0
  })

  // Base URL
  const baseURL = import.meta.env.VITE_ENDPOINT_URL || 'http://localhost:8000/api'
  
  // Create axios instance with auth headers - this is no longer needed as we'll use Auth.authenticatedRequest
  const xios = axios.create({
    baseURL,
    headers: {
      'Content-Type': 'application/json'
    }
  })
  
  // Actions
  /**
   * Initialize the store
   */
  const init = () => {
    // Set loading
    loading.value = true
    
    // Check if Auth is initialized
    if (!Auth().token) {
      console.log('No authentication token available, skipping templates initialization')
      loading.value = false
      return
    }
    
    console.log('Initializing templates store')

    // Fetch templates if a client is selected
    if (Client().selected_client?.uuid) {
      // Use a shorter timeout to prevent long loading times on initialization
      setTimeout(() => {
        fetch()
      }, 100) // Short delay to prevent blocking the main UI thread
    } else {
      loading.value = false
    }
  }

  /**
   * Fetch templates for the current client
   * @param {Number} page - Page number (optional)
   * @param {Number} limit - Items per page (optional)
   * @param {Object} options - Additional options like forceRefresh
   */
  const fetch = async (page = 1, limit = 20, options = { forceRefresh: false }) => {
    // Add a sync protection check for direct fetch calls
    if (!options.forceRefresh && !shouldRefresh('templates')) {
      console.log('Fetch templates skipped due to cooldown')
      return
    }
    
    try {
      loading.value = true
      const client_id = Client().selected_client?.uuid
      
      if (!client_id) {
        throw new Error('No client selected')
      }

      // Check if we should use cached data
      const shouldRefreshData = options.forceRefresh || 
                           !last_updated.value || 
                           !sessionStorage.getItem('templates_data_last_updated');
      
      if (!shouldRefreshData && templates.value.length > 0) {
        console.log('Using cached templates data')
        loading.value = false
        return
      }

      // Update pagination state
      pagination.value.page = page
      pagination.value.limit = limit

      console.log(`Fetching templates for client ${client_id}, page ${page}, limit ${limit}`)

      // Use Auth store's authenticatedRequest method to handle token refresh automatically
      const response = await Auth().authenticatedRequest(
        'get',
        `/templates/client/${client_id}`,
        null,
        { 
          params: { page, limit }
        }
      )
      
      if (response.status === 200) {
        console.log(`Received ${response.data.data?.length || 0} templates`)
        templates.value = response.data.data || []
        last_updated.value = getCurrentTimestamp()
        invalidateCache()
      
      // Update pagination data if available
      if (response.data.pagination) {
        pagination.value = {
          ...pagination.value,
          ...response.data.pagination
        }
      }
      } else {
        console.warn('Unexpected response when fetching templates:', response.status)
        throw new Error('Failed to fetch templates: Unexpected response')
      }
    } catch (error: any) {
      console.error('Error fetching templates:', error)
      
      if (error.response) {
        // Handle specific error status codes
        if (error.response.status === 401) {
          
          Auth().signout()
        } else if (error.response.status === 403) {
          Toast.error('You do not have permission to view templates for this client.')
        } else {
          Toast.error(`Failed to fetch templates: ${error.response.status}`)
        }
      } else if (error.request) {
        Toast.error('Network error. Check your connection and try again.')
      } else {
        Toast.error(error.message || 'Failed to fetch templates')
      }
    } finally {
      loading.value = false
    }
  }

  /**
   * Navigate to the next page
   */
  const nextPage = () => {
    if (pagination.value.page < pagination.value.totalPages) {
      fetch(pagination.value.page + 1, pagination.value.limit)
    }
  }

  /**
   * Navigate to the previous page
   */
  const prevPage = () => {
    if (pagination.value.page > 1) {
      fetch(pagination.value.page - 1, pagination.value.limit)
    }
  }

  /**
   * Go to a specific page
   * @param {Number} page - Page number
   */
  const goToPage = (page: number) => {
    if (page >= 1 && page <= pagination.value.totalPages) {
      fetch(page, pagination.value.limit)
    }
  }

  /**
   * Change the number of items per page
   * @param {Number} newLimit - New limit value
   */
  const changeLimit = (newLimit: number) => {
    fetch(1, newLimit) // Reset to first page when changing limit
  }

  /**
   * Save a template
   * @param {Object} template - Template data
   */
  const save = async (template: any) => {
    try {
      loading.value = true
      
      const client_id = Client().selected_client?.uuid
      if (!client_id) {
        throw new Error('No client selected')
      }

      const templateData = {
        client_id,
        ...template
      }

      console.log('Saving template with data:', {
        ...templateData,
        // Truncate any large data fields for logging
        sections: templateData.sections ? `[${templateData.sections.length} sections]` : null
      })
      
      // Use Auth store's authenticatedRequest
      const response = await Auth().authenticatedRequest(
        'post',
        '/templates',
        templateData
      )
      
      if (response.data.success) {
        console.log('Template saved successfully')
        last_updated.value = getCurrentTimestamp()
        invalidateCache()
        
        Toast.success(response.data.message || 'Template saved successfully')
        // Refresh the templates list
        await fetch(pagination.value.page, pagination.value.limit, { forceRefresh: true })
        return true
      } else {
        throw new Error(response.data.error || 'Failed to save template')
      }
    } catch (error: any) {
      console.error('Error saving template:', error)
      
      if (error.response) {
        if (error.response.status === 401) {
        
          Auth().signout()
        } else if (error.response.status === 403) {
          Toast.error('You do not have permission to save templates for this client.')
        } else {
          Toast.error(`Failed to save template: ${error.response.status}`)
        }
      } else if (error.request) {
        Toast.error('Network error. Check your connection and try again.')
      } else {
      Toast.error(error.message || 'Failed to save template')
      }
      return false
    } finally {
      loading.value = false
    }
  }

  /**
   * Get a specific template by ID
   * @param {String} id - Template ID
   */
  const getById = async (id: string) => {
    try {
      loading.value = true
      console.log(`Fetching template with ID: ${id}`)
      
      // Use Auth store's authenticatedRequest
      const response = await Auth().authenticatedRequest(
        'get',
        `/templates/${id}`
      )
      
      if (response.data.success) {
        console.log('Template fetched successfully')
        current_template.value = response.data.data
        return response.data.data
      } else {
        throw new Error(response.data.error || 'Failed to fetch template')
      }
    } catch (error: any) {
      console.error('Error fetching template:', error)
      
      if (error.response) {
        if (error.response.status === 401) {
        
          Auth().signout()
        } else if (error.response.status === 403) {
          Toast.error('You do not have permission to view this template.')
        } else if (error.response.status === 404) {
          Toast.error('Template not found.')
        } else {
          Toast.error(`Failed to fetch template: ${error.response.status}`)
        }
      } else if (error.request) {
        Toast.error('Network error. Check your connection and try again.')
      } else {
      Toast.error(error.message || 'Failed to fetch template')
      }
      return null
    } finally {
      loading.value = false
    }
  }

  /**
   * Delete a specific template
   * @param {String} id - Template ID
   */
  const deleteTemplate = async (id: string) => {
    try {
      loading.value = true
      console.log(`Deleting template with ID: ${id}`)
      
      // Use Auth store's authenticatedRequest
      const response = await Auth().authenticatedRequest(
        'delete',
        `/templates/${id}`
      )
      
      if (response.data.success) {
        console.log('Template deleted successfully')
        last_updated.value = getCurrentTimestamp()
        invalidateCache()
        
        Toast.success(response.data.message || 'Template deleted successfully')
        // Refresh the templates list
        await fetch(pagination.value.page, pagination.value.limit, { forceRefresh: true })
        return true
      } else {
        throw new Error(response.data.error || 'Failed to delete template')
      }
    } catch (error: any) {
      console.error('Error deleting template:', error)
      
      if (error.response) {
        if (error.response.status === 401) {
         
          Auth().signout()
        } else if (error.response.status === 403) {
          Toast.error('You do not have permission to delete this template.')
        } else if (error.response.status === 404) {
          Toast.error('Template not found.')
        } else {
          Toast.error(`Failed to delete template: ${error.response.status}`)
        }
      } else if (error.request) {
        Toast.error('Network error. Check your connection and try again.')
      } else {
      Toast.error(error.message || 'Failed to delete template')
      }
      return false
    } finally {
      loading.value = false
    }
  }

  return {
    // State
    loading,
    templates,
    current_template,
    last_updated,
    pagination,

    // Actions
    init,
    fetch,
    nextPage,
    prevPage,
    goToPage,
    changeLimit,
    save,
    getById,
    deleteTemplate
  }
})
