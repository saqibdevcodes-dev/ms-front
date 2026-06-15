import { defineStore } from 'pinia'
import { ref } from 'vue'
import axios from 'axios'
import { Toast } from '@/utils/toast'

export const Metadata = defineStore('metadata', () => {
  // State
  const loading = ref(false)
  const categories = ref([])
  const tags = ref([])
  const countries = ref([])
  const regions = ref([])
  const cities = ref([])

  // Base URL
  const baseURL = import.meta.env.VITE_ENDPOINT_URL || 'http://localhost:8000/api'
  
  // Create axios instance with auth headers
  const xios = axios.create({
    baseURL,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${localStorage.getItem('token')}`
    }
  })
  
  // Actions
  /**
   * Initialize the store
   */
  const init = async () => {
    // Set loading
    loading.value = true
    
    // Update authorization header with current token
    xios.defaults.headers.common['Authorization'] = `Bearer ${localStorage.getItem('token')}`

    try {
      await Promise.all([
        fetchCategories(),
        fetchTags(),
        fetchLocations()
      ])
    } catch (error) {
      console.error('Error initializing metadata:', error)
    } finally {
      loading.value = false
    }
  }

  /**
   * Fetch categories
   */
  const fetchCategories = async () => {
    try {
      loading.value = true
      
      // Update authorization header before request
      xios.defaults.headers.common['Authorization'] = `Bearer ${localStorage.getItem('token')}`
      
      const response = await xios.get('/metadata/categories')
      if (response.data.success) {
        categories.value = response.data.data || []
      }
    } catch (error) {
      console.error('Error fetching categories:', error)
      Toast.error('Failed to fetch categories')
    } finally {
      loading.value = false
    }
  }

  /**
   * Fetch tags
   */
  const fetchTags = async () => {
    try {
      loading.value = true
      
      // Update authorization header before request
      xios.defaults.headers.common['Authorization'] = `Bearer ${localStorage.getItem('token')}`
      
      const response = await xios.get('/metadata/tags')
      if (response.data.success) {
        tags.value = response.data.data || []
      }
    } catch (error) {
      console.error('Error fetching tags:', error)
      Toast.error('Failed to fetch tags')
    } finally {
      loading.value = false
    }
  }

  /**
   * Fetch locations (countries, regions, cities)
   */
  const fetchLocations = async () => {
    try {
      loading.value = true
      
      // Update authorization header before request
      xios.defaults.headers.common['Authorization'] = `Bearer ${localStorage.getItem('token')}`
      
      const response = await xios.get('/metadata/locations')
      if (response.data.success) {
        countries.value = response.data.data?.countries || []
        regions.value = response.data.data?.regions || []
        cities.value = response.data.data?.cities || []
      }
    } catch (error) {
      console.error('Error fetching locations:', error)
      Toast.error('Failed to fetch locations')
    } finally {
      loading.value = false
    }
  }

  return {
    // State
    loading,
    categories,
    tags,
    countries,
    regions,
    cities,

    // Actions
    init,
    fetchCategories,
    fetchTags,
    fetchLocations
  }
}) 