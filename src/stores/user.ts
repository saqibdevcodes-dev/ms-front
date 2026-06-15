import { defineStore } from 'pinia'
import { ref } from 'vue'
import axios from 'axios'
import { Toast } from '@/utils/toast'

export const User = defineStore('user', () => {
  // State
  const loading = ref(false)
  const users = ref([])
  const current_user = ref(null)
  const roles = ref([])
  
  // Pagination state
  const pagination = ref({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0
  })

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
  const init = () => {
    // Set loading
    loading.value = true
    
    // Update authorization header with current token
    xios.defaults.headers.common['Authorization'] = `Bearer ${localStorage.getItem('token')}`

    // Fetch users
    fetchUsers()
    
    // Fetch roles
    fetchRoles()
  }

  /**
   * Fetch users
   * @param {Number} page - Page number (optional)
   * @param {Number} limit - Items per page (optional)
   */
  const fetchUsers = async (page = 1, limit = 20) => {
    try {
      loading.value = true
      
      // Update pagination state
      pagination.value.page = page
      pagination.value.limit = limit

      // Update authorization header before request
      xios.defaults.headers.common['Authorization'] = `Bearer ${localStorage.getItem('token')}`
      
      const response = await xios.get('/users', {
        params: { page, limit }
      })
      
      users.value = response.data.data || []
      
      // Update pagination data if available
      if (response.data.pagination) {
        pagination.value = {
          ...pagination.value,
          ...response.data.pagination
        }
      }
    } catch (error) {
      console.error('Error fetching users:', error)
      Toast.error('Failed to fetch users')
    } finally {
      loading.value = false
    }
  }

  /**
   * Fetch roles
   */
  const fetchRoles = async () => {
    try {
      loading.value = true
      
      // Update authorization header before request
      xios.defaults.headers.common['Authorization'] = `Bearer ${localStorage.getItem('token')}`
      
      const response = await xios.get('/roles')
      roles.value = response.data.data || []
    } catch (error) {
      console.error('Error fetching roles:', error)
      Toast.error('Failed to fetch roles')
    } finally {
      loading.value = false
    }
  }

  /**
   * Get a specific user by ID
   * @param {String} id - User ID
   */
  const getUserById = async (id) => {
    try {
      loading.value = true
      
      // Update authorization header before request
      xios.defaults.headers.common['Authorization'] = `Bearer ${localStorage.getItem('token')}`
      
      const response = await xios.get(`/users/${id}`)
      
      if (response.data.success) {
        current_user.value = response.data.data
        return response.data.data
      } else {
        throw new Error(response.data.error || 'Failed to fetch user')
      }
    } catch (error) {
      console.error('Error fetching user:', error)
      Toast.error(error.message || 'Failed to fetch user')
      return null
    } finally {
      loading.value = false
    }
  }

  /**
   * Save a user
   * @param {Object} user - User data
   */
  const saveUser = async (user) => {
    try {
      loading.value = true
      
      // Update authorization header before request
      xios.defaults.headers.common['Authorization'] = `Bearer ${localStorage.getItem('token')}`
      
      let response
      
      if (user.id) {
        // Update existing user
        response = await xios.put(`/users/${user.id}`, user)
      } else {
        // Create new user
        response = await xios.post('/users', user)
      }
      
      if (response.data.success) {
        Toast.success(response.data.message || 'User saved successfully')
        // Refresh the users list
        await fetchUsers(pagination.value.page, pagination.value.limit)
        return true
      } else {
        throw new Error(response.data.error || 'Failed to save user')
      }
    } catch (error) {
      console.error('Error saving user:', error)
      Toast.error(error.message || 'Failed to save user')
      return false
    } finally {
      loading.value = false
    }
  }

  /**
   * Delete a user
   * @param {String} id - User ID
   */
  const deleteUser = async (id) => {
    try {
      loading.value = true
      
      // Update authorization header before request
      xios.defaults.headers.common['Authorization'] = `Bearer ${localStorage.getItem('token')}`
      
      const response = await xios.delete(`/users/${id}`)
      
      if (response.data.success) {
        Toast.success(response.data.message || 'User deleted successfully')
        // Refresh the users list
        await fetchUsers(pagination.value.page, pagination.value.limit)
        return true
      } else {
        throw new Error(response.data.error || 'Failed to delete user')
      }
    } catch (error) {
      console.error('Error deleting user:', error)
      Toast.error(error.message || 'Failed to delete user')
      return false
    } finally {
      loading.value = false
    }
  }

  /**
   * Navigate to the next page
   */
  const nextPage = () => {
    if (pagination.value.page < pagination.value.totalPages) {
      fetchUsers(pagination.value.page + 1, pagination.value.limit)
    }
  }

  /**
   * Navigate to the previous page
   */
  const prevPage = () => {
    if (pagination.value.page > 1) {
      fetchUsers(pagination.value.page - 1, pagination.value.limit)
    }
  }

  /**
   * Go to a specific page
   * @param {Number} page - Page number
   */
  const goToPage = (page) => {
    if (page >= 1 && page <= pagination.value.totalPages) {
      fetchUsers(page, pagination.value.limit)
    }
  }

  /**
   * Change the number of items per page
   * @param {Number} newLimit - New limit value
   */
  const changeLimit = (newLimit) => {
    fetchUsers(1, newLimit) // Reset to first page when changing limit
  }

  return {
    // State
    loading,
    users,
    current_user,
    roles,
    pagination,

    // Actions
    init,
    fetchUsers,
    fetchRoles,
    getUserById,
    saveUser,
    deleteUser,
    // Pagination actions
    nextPage,
    prevPage,
    goToPage,
    changeLimit
  }
}) 