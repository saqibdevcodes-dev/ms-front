<script setup lang="ts">
import { computed, onMounted, ref, h, reactive, watch } from 'vue'
import DefaultLayout from '@/layouts/DefaultLayout.vue'

import 'ag-grid-community/styles/ag-grid.css'
import 'ag-grid-community/styles/ag-theme-quartz.css'
import { AgGridVue } from 'ag-grid-vue3'
import Button from '@/components/Buttons/Button.vue'

import Modal from '@/components/modal/modal.vue'
import InputGroup from '@/components/Forms/InputGroup.vue'
import Select from 'primevue/select'
import { Users } from '@/stores/users'
import { Client } from '@/stores/client'
import InputText from 'primevue/inputtext'
import Tooltip from 'primevue/tooltip'
import Badge from 'primevue/badge'
import Dropdown from 'primevue/dropdown'
import ProgressBar from 'primevue/progressbar'

import router from '@/router'
import { RouterLink } from 'vue-router'
import Swal from 'sweetalert2'

// State for data loading and filtering
const isLoading = ref(true)
const searchQuery = ref('')
const selectedRole = ref(null)
const selectedClient = ref(null)
const selectedUsers = ref([])
const selectAll = ref(false)

// Filter options
const roles = ref([
  { name: 'All Roles', code: '' },
  { name: 'Admin', code: 'admin' },
  { name: 'Reporting User', code: 'reporting_user' },
  { name: 'Client User', code: 'client_user' }
])

// Stats data
const userStats = computed(() => {
  return [
    {
      label: 'Total Users',
      count: rowData.value.length,
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-100',
      textColor: 'text-blue-800',
      labelColor: 'text-blue-600',
      icon: 'users'
    },
    {
      label: 'Admin Users',
      count: rowData.value.filter((user) => user.system_role === 'admin').length,
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-100',
      textColor: 'text-purple-800',
      labelColor: 'text-purple-600',
      icon: 'shield'
    },
    {
      label: 'Client Users',
      count: rowData.value.filter((user) => user.system_role === 'client_user').length,
      bgColor: 'bg-teal-50',
      borderColor: 'border-teal-100',
      textColor: 'text-teal-800',
      labelColor: 'text-teal-600',
      icon: 'building'
    },
    {
      label: 'Reporting Users',
      count: rowData.value.filter((user) => user.system_role === 'reporting_user').length,
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-100',
      textColor: 'text-blue-800',
      labelColor: 'text-blue-600',
      icon: 'chart-bar'
    }
  ]
})

// AG Grid reference to allow programmatic control
const gridApi = ref(null)

// User data with filtering applied
const rowData = computed(() => {
  let filteredUsers = [...Users().users]

  // Apply role filter
  if (selectedRole.value && selectedRole.value.code) {
    filteredUsers = filteredUsers.filter((user) => user.system_role === selectedRole.value.code)
  }

  // Apply text search
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    filteredUsers = filteredUsers.filter(
      (user) =>
        user.first_name?.toLowerCase().includes(query) ||
        user.last_name?.toLowerCase().includes(query) ||
        user.email?.toLowerCase().includes(query) ||
        user.phone?.toLowerCase().includes(query)
    )
  }

  return filteredUsers
})

// Handle row selection
const onRowSelected = (event) => {
  selectedUsers.value = event.api.getSelectedRows()
}

// Toggle select all rows
const toggleSelectAll = () => {
  selectAll.value = !selectAll.value
  if (gridApi.value) {
    if (selectAll.value) {
      gridApi.value.selectAll()
    } else {
      gridApi.value.deselectAll()
    }
  }
}

// Clear all filters
const clearFilters = () => {
  if (gridApi.value) {
    gridApi.value.setFilterModel(null)
    searchQuery.value = ''
    selectedRole.value = null
  }
}

// Handle bulk deletion
const deleteSelectedUsers = () => {
  if (selectedUsers.value.length === 0) {
    Swal.fire('Info', 'Please select users to delete', 'info')
    return
  }

  Swal.fire({
    title: 'Delete Selected Users?',
    html: `Are you sure you want to delete <strong>${selectedUsers.value.length}</strong> users? This action cannot be undone.`,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#d33',
    cancelButtonColor: '#3085d6',
    confirmButtonText: 'Yes, delete all',
    cancelButtonText: 'Cancel',
    focusCancel: true
  }).then((result) => {
    if (result.isConfirmed) {
      // Show loading state
      isLoading.value = true

      // Create an array of promises for each deletion
      const deletePromises = selectedUsers.value.map((user) => Users().delete_user(user.uuid))

      // Execute all deletions and handle the results
      Promise.allSettled(deletePromises).then((results) => {
        const successful = results.filter((r) => r.status === 'fulfilled').length
        const failed = results.filter((r) => r.status === 'rejected').length

        // Refresh the user list after deletions
        Users()
          .fetch()
          .then(() => {
            isLoading.value = false

            // Show results message
            Swal.fire({
              title: 'Deletion Complete',
              html: `<p><strong>${successful}</strong> users deleted successfully.</p>${
                failed > 0 ? `<p><strong>${failed}</strong> deletions failed.</p>` : ''
              }`,
              icon: successful > 0 && failed === 0 ? 'success' : 'info',
              confirmButtonText: 'OK'
            })
          })
      })
    }
  })
}

// Status badge custom renderer
const statusBadgeRenderer = (params) => {
  const isActive = params.data.status === 'active'

  const badge = document.createElement('div')

  badge.classList.add(
    'px-2.5',
    'py-0.5',
    'text-xs',
    'font-medium',
    'rounded-full',
    'text-center',
    'inline-flex',
    'items-center',
    'justify-center'
  )

  if (isActive) {
    badge.classList.add(
      'bg-green-100',
      'text-green-800',
      'dark:bg-green-900',
      'dark:text-green-300'
    )
    badge.innerHTML = `
      <span class="w-2 h-2 me-1 bg-green-500 rounded-full"></span>
      Active
    `
  } else {
    badge.classList.add('bg-gray-100', 'text-gray-800', 'dark:bg-gray-700', 'dark:text-gray-300')
    badge.innerHTML = `
      <span class="w-2 h-2 me-1 bg-gray-500 rounded-full"></span>
      Inactive
    `
  }

  return badge
}

// Role badge custom renderer
const roleBadgeRenderer = (params) => {
  const systemRole = params.data.system_role || 'admin'
  const badge = document.createElement('div')

  badge.classList.add(
    'px-2.5',
    'py-1',
    'text-xs',
    'font-medium',
    'rounded-md',
    'capitalize',
    'inline-flex',
    'items-center'
  )

  // Customize badge color based on role type
  if (systemRole === 'admin') {
    badge.classList.add(
      'bg-purple-100',
      'text-purple-800',
      'dark:bg-purple-900',
      'dark:text-purple-300'
    )
  } else if (systemRole === 'reporting_user') {
    badge.classList.add('bg-blue-100', 'text-blue-800', 'dark:bg-blue-900', 'dark:text-blue-300')
  } else if (systemRole === 'client_user') {
    badge.classList.add('bg-teal-100', 'text-teal-800', 'dark:bg-teal-900', 'dark:text-teal-300')
  } else {
    badge.classList.add('bg-gray-100', 'text-gray-800', 'dark:bg-gray-700', 'dark:text-gray-300')
  }

  badge.textContent = systemRole.replace('_', ' ')
  return badge
}

// Date formatter
const formatDate = (dateString) => {
  if (!dateString) return 'N/A'

  const date = new Date(dateString)
  if (isNaN(date.getTime())) return 'Invalid date'

  // Format: Jan 15, 2023
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

// Last activity indicator
const lastActivityRenderer = (params) => {
  const lastLogin = params.data.last_login_at

  if (!lastLogin) {
    const badge = document.createElement('div')
    badge.classList.add('text-xs', 'text-gray-500')
    badge.textContent = 'Never logged in'
    return badge
  }

  const date = new Date(lastLogin)
  if (isNaN(date.getTime())) return 'Invalid date'

  const now = new Date()
  const diffTime = Math.abs(now - date)
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

  const container = document.createElement('div')
  container.classList.add('flex', 'items-center', 'gap-2')

  // Activity indicator
  const indicator = document.createElement('div')
  indicator.classList.add('flex', 'flex-col', 'gap-1')

  // Date text
  const dateText = document.createElement('span')
  dateText.classList.add('text-xs', 'font-medium')
  dateText.textContent = formatDate(lastLogin)

  // Activity bar
  const activityBar = document.createElement('div')
  activityBar.classList.add('w-full', 'h-1', 'rounded-full')

  // Activity level based on days since last login
  if (diffDays <= 7) {
    // Recent activity (within a week)
    activityBar.classList.add('bg-green-500')
    dateText.classList.add('text-green-700')
  } else if (diffDays <= 30) {
    // Medium activity (within a month)
    activityBar.classList.add('bg-yellow-500')
    dateText.classList.add('text-yellow-700')
  } else {
    // Inactive
    activityBar.classList.add('bg-red-300')
    dateText.classList.add('text-red-700')
  }

  indicator.appendChild(dateText)
  indicator.appendChild(activityBar)

  container.appendChild(indicator)

  return container
}

// Column definitions with modern styling
const colDefs = ref([
  // {
  //   headerName: '',
  //   field: 'selection',
  //   width: 50,
  //   headerCheckboxSelection: true,
  //   checkboxSelection: true,
  //   pinned: 'left',
  //   lockPosition: true,
  //   sortable: false,
  //   filter: false
  // },
  {
    headerName: 'Name',
    field: 'first_name',
    valueGetter: (params) => {
      return `${params.data.first_name || ''} ${params.data.last_name || ''}`.trim() || 'N/A'
    },
    cellRenderer: (params) => {
      const container = document.createElement('div')
      container.classList.add('flex', 'items-center', 'gap-3')

      // Avatar element
      const avatar = document.createElement('div')
      avatar.classList.add(
        'w-9',
        'h-9',
        'rounded-full',
        'flex',
        'items-center',
        'justify-center',
        'bg-blue-600',
        'text-white',
        'font-medium',
        'text-sm'
      )

      // Get initials from name
      const firstName = params.data.first_name || ''
      const lastName = params.data.last_name || ''
      const initials = (firstName.charAt(0) + (lastName.charAt(0) || '')).toUpperCase()
      avatar.textContent = initials

      // Text container
      const textContainer = document.createElement('div')
      textContainer.classList.add('flex', 'flex-col')

      // Name
      const nameElement = document.createElement('span')
      nameElement.classList.add('text-sm', 'font-medium', 'text-gray-900')
      nameElement.textContent = `${firstName} ${lastName}`.trim() || 'N/A'

      // Email as subtitle
      const emailElement = document.createElement('span')
      emailElement.classList.add('text-xs', 'text-gray-500')
      emailElement.textContent = params.data.email || 'No email'

      textContainer.appendChild(nameElement)
      textContainer.appendChild(emailElement)

      container.appendChild(avatar)
      container.appendChild(textContainer)

      return container
    },
    flex: 2,
    minWidth: 350,
    filter: 'agTextColumnFilter',
    floatingFilter: true
  },
  {
    field: 'phone',
    headerName: 'Phone',
    minWidth: 150,
    filter: 'agTextColumnFilter',
    floatingFilter: true
  },
  {
    field: 'system_role',
    headerName: 'Role',
    cellRenderer: roleBadgeRenderer,
    minWidth: 150,
    filter: 'agTextColumnFilter',
    floatingFilter: true
  },
  {
    field: 'status',
    headerName: 'Status',
    cellRenderer: statusBadgeRenderer,
    minWidth: 120,
    filter: 'agTextColumnFilter',
    floatingFilter: true
  },
  {
    field: 'last_login_at',
    headerName: 'Last Activity',
    cellRenderer: lastActivityRenderer,
    minWidth: 150,
    sortable: true,
    filter: 'agDateColumnFilter',
    floatingFilter: true
  },
  {
    field: 'created_at',
    headerName: 'Joined',
    valueGetter: (params) => {
      return formatDate(params.data.created_at)
    },
    minWidth: 140,
    sortable: true,
    filter: 'agDateColumnFilter',
    floatingFilter: true
  },
  {
    headerName: 'Actions',
    pinned: 'right',
    filter: false,
    sortable: false,
    minWidth: 120,
    maxWidth: 120,
    cellRenderer: (params) => {
      const wrapper = document.createElement('div')
      wrapper.classList.add('flex', 'items-center', 'gap-2', 'h-full', 'justify-center')

      // Edit Button
      const editButton = document.createElement('button')
      editButton.type = 'button'
      editButton.classList.add(
        'p-1.5',
        'rounded-lg',
        'transition-colors',
        'hover:bg-blue-50',
        'text-blue-600'
      )
      editButton.title = 'Edit user'
      editButton.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-4">
                    <path stroke-linecap="round" stroke-linejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
                </svg>
            `
      editButton.onclick = () => router.push(`user/edit/${params.data.uuid}`)

      // Delete Button
      const deleteButton = document.createElement('button')
      deleteButton.type = 'button'
      deleteButton.classList.add(
        'p-1.5',
        'rounded-lg',
        'transition-colors',
        'hover:bg-red-50',
        'text-red-600'
      )
      deleteButton.title = 'Delete user'
      deleteButton.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-4">
                    <path stroke-linecap="round" stroke-linejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                </svg>
            `
      // Add delete functionality
      deleteButton.onclick = () => {
        // Confirm before deleting
        Swal.fire({
          title: 'Delete User?',
          html: `Are you sure you want to delete <strong>${params.data.first_name} ${params.data.last_name}</strong>? This action cannot be undone.`,
          icon: 'warning',
          showCancelButton: true,
          confirmButtonColor: '#d33',
          cancelButtonColor: '#3085d6',
          confirmButtonText: 'Yes, delete',
          cancelButtonText: 'Cancel',
          focusCancel: true
        }).then((result) => {
          if (result.isConfirmed) {
            // Call the delete function from the store
            Users()
              .delete_user(params.data.uuid)
              .then(() => {
                // Refresh the user list after deletion
                Users().fetch()
                // Show success message
                Swal.fire({
                  title: 'Deleted!',
                  text: 'User has been deleted successfully',
                  icon: 'success',
                  toast: true,
                  position: 'top-end',
                  showConfirmButton: false,
                  timer: 3000
                })
              })
              .catch((error) => {
                // Show error message
                Swal.fire({
                  title: 'Error!',
                  text: 'Failed to delete user',
                  icon: 'error',
                  confirmButtonText: 'OK'
                })
              })
          }
        })
      }

      // Append buttons to wrapper
      wrapper.appendChild(editButton)
      wrapper.appendChild(deleteButton)

      return wrapper
    }
  }
])

// AG-Grid Default Column Definition
const defaultColDef = {
  sortable: true,
  resizable: true,
  filter: true
}

// Grid ready handler to store reference to the grid API
const onGridReady = (params) => {
  gridApi.value = params.api
  params.api.sizeColumnsToFit()
  isLoading.value = false
}

// Function to export table to CSV
const exportToCsv = () => {
  if (gridApi.value) {
    gridApi.value.exportDataAsCsv({
      fileName: `Users_${new Date().toISOString().split('T')[0]}.csv`,
      columnKeys: ['first_name', 'email', 'phone', 'system_role', 'created_at']
    })
  }
}

// Function to refresh the table data
const refreshTable = async () => {
  isLoading.value = true
  try {
    await Users().fetch()
  } finally {
    isLoading.value = false
  }
}

// Load data when component mounts
onMounted(async () => {
  await refreshTable()
  await Users().init()
  isLoading.value = true
  try {
    await Users().fetch()
  } finally {
    isLoading.value = false
  }
})
</script>

<template>
  <DefaultLayout>
    <div class="">
      <!-- Header Section -->
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 class="text-xl font-semibold text-gray-800">User Management</h1>
          <p class="text-sm text-gray-500 mt-1">Manage system users, roles, and permissions</p>
        </div>

        <div class="flex flex-col sm:flex-row gap-3">
          <button
            @click="refreshTable"
            class="inline-flex items-center px-3 py-2 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
            :disabled="isLoading"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-4 w-4 mr-2"
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
            Refresh
          </button>

          <button
            @click="exportToCsv"
            class="inline-flex items-center px-3 py-2 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-4 w-4 mr-2"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
              />
            </svg>
            Export
          </button>

          <RouterLink to="/user/add">
            <Button
              :type="'button'"
              label="Add New User"
              class="w-full sm:w-auto"
              customClasses="bg-blue-600 hover:bg-blue-700"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="h-4 w-4 mr-2"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                />
              </svg>
            </Button>
          </RouterLink>
        </div>
      </div>

      <!-- Stats Cards -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div
          v-for="(stat, index) in userStats"
          :key="index"
          :class="['p-4 border rounded-lg flex items-center gap-4', stat.bgColor, stat.borderColor]"
        >
          <div
            :class="[
              'w-10 h-10 rounded-lg flex items-center justify-center',
              stat.bgColor,
              stat.borderColor,
              'bg-opacity-50'
            ]"
          >
            <!-- User icon -->
            <svg
              v-if="stat.icon === 'users'"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke-width="1.5"
              stroke="currentColor"
              class="w-5 h-5"
              :class="stat.labelColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z"
              />
            </svg>
            <!-- Shield/admin icon -->
            <svg
              v-else-if="stat.icon === 'shield'"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke-width="1.5"
              stroke="currentColor"
              class="w-5 h-5"
              :class="stat.labelColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z"
              />
            </svg>
            <!-- Building/client icon -->
            <svg
              v-else-if="stat.icon === 'building'"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke-width="1.5"
              stroke="currentColor"
              class="w-5 h-5"
              :class="stat.labelColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008v-.008Zm0 3h.008v.008h-.008v-.008Zm0 3h.008v.008h-.008v-.008Z"
              />
            </svg>
            <!-- Chart icon -->
            <svg
              v-else-if="stat.icon === 'chart-bar'"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke-width="1.5"
              stroke="currentColor"
              class="w-5 h-5"
              :class="stat.labelColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z"
              />
            </svg>
          </div>
          <div>
            <h3 :class="['text-sm font-medium', stat.labelColor]">{{ stat.label }}</h3>
            <p :class="['text-2xl font-bold', stat.textColor]">{{ stat.count }}</p>
          </div>
        </div>
      </div>

      <!-- Filters Section -->
      <div class="mb-6 flex flex-col lg:flex-row gap-4">
        <div class="relative flex-1">
          <div class="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
            <svg
              class="w-4 h-4 text-gray-500"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
          <input
            v-model="searchQuery"
            type="search"
            class="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-all duration-200"
            placeholder="Search users by name, email or phone..."
          />
        </div>

        <div class="w-full lg:w-64">
          <Select
            v-model="selectedRole"
            :options="roles"
            optionLabel="name"
            placeholder="Filter by role"
            class="w-full"
          />
        </div>
      </div>

      <!-- Bulk actions section -->
      <div
        v-if="selectedUsers.length > 0"
        class="mb-4 p-3 bg-blue-50 border border-blue-100 rounded-lg flex flex-wrap items-center justify-between gap-3"
      >
        <div class="flex items-center gap-2">
          <span class="text-sm font-medium text-blue-700"
            >{{ selectedUsers.length }} users selected</span
          >
          <button
            @click="toggleSelectAll"
            class="text-xs text-blue-600 hover:text-blue-800 underline"
          >
            {{ selectAll ? 'Deselect all' : 'Select all' }}
          </button>
        </div>

        <div class="flex items-center gap-2">
          <button
            @click="deleteSelectedUsers"
            class="inline-flex items-center px-3 py-1.5 border border-red-300 bg-white text-red-700 rounded text-sm font-medium hover:bg-red-50 transition-colors"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke-width="1.5"
              stroke="currentColor"
              class="w-4 h-4 mr-1.5"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"
              />
            </svg>
            Delete Selected
          </button>

          <button
            @click="clearFilters"
            class="inline-flex items-center px-3 py-1.5 border border-gray-300 bg-white text-gray-700 rounded text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke-width="1.5"
              stroke="currentColor"
              class="w-4 h-4 mr-1.5"
            >
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
            Clear Filters
          </button>
        </div>
      </div>

      <!-- Table Section -->
      <div class="relative overflow-hidden rounded-lg border border-gray-200">
        <!-- Loading overlay -->
        <div
          v-if="isLoading"
          class="absolute inset-0 bg-white/80 flex items-center justify-center z-10"
        >
          <div class="flex flex-col items-center">
            <div
              class="w-12 h-12 border-4 border-t-blue-600 border-r-transparent border-b-blue-600 border-l-transparent rounded-full animate-spin"
            ></div>
            <p class="mt-2 text-sm text-gray-500">Loading users...</p>
          </div>
        </div>

        <!-- Selection controls -->
        <div class="flex items-center justify-between p-3 bg-gray-50 border-b border-gray-200">
          <div class="flex items-center gap-2">
            <input
              type="checkbox"
              id="selectAll"
              :checked="selectAll"
              @change="toggleSelectAll"
              class="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
            />
            <label for="selectAll" class="text-sm font-medium text-gray-700">Select All</label>
          </div>

          <div class="text-sm text-gray-500">{{ rowData.length }} users found</div>
        </div>

        <div class="ag-theme-quartz w-full" style="height: 600px">
          <ag-grid-vue
            :rowData="rowData"
            :columnDefs="colDefs"
            :defaultColDef="defaultColDef"
            @grid-ready="onGridReady"
            @row-selected="onRowSelected"
            class="w-full h-full"
            animateRows
            pagination
            paginationAutoPageSize
            :rowHeight="70"
            :headerHeight="50"
            rowSelection="multiple"
            suppressRowClickSelection
            :overlayNoRowsTemplate="'<span class=\'p-4\'>No users found. Try adjusting your filters or add a new user.</span>'"
          />
        </div>
      </div>

      <!-- Pagination help text -->
      <div class="mt-4 text-sm text-gray-500">
        <p class="flex items-center gap-2">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke-width="1.5"
            stroke="currentColor"
            class="w-4 h-4"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z"
            />
          </svg>
          Use table headers to sort and filter data. Click column headers to sort or use the filter
          icons.
        </p>
      </div>
    </div>
  </DefaultLayout>
</template>

<style scoped>
/* Custom styling for AG Grid */
:deep(.ag-theme-quartz) {
  --ag-font-family: inherit;
  --ag-font-size: 14px;
  --ag-border-color: theme('colors.gray.200');
  --ag-row-border-color: theme('colors.gray.100');
  --ag-header-background-color: theme('colors.gray.50');
  --ag-odd-row-background-color: theme('colors.gray.50/30');
  --ag-row-hover-color: theme('colors.gray.50');
  --ag-selected-row-background-color: theme('colors.blue.50');
  --ag-checkbox-checked-color: theme('colors.blue.600');
  --ag-checkbox-indeterminate-color: theme('colors.blue.600');
  --ag-input-focus-border-color: theme('colors.blue.600');
}

:deep(.ag-header-cell) {
  @apply text-gray-600 text-sm font-medium;
}

:deep(.ag-row-hover) {
  @apply bg-gray-50;
}

/* Custom scrollbar */
:deep(.ag-body-viewport::-webkit-scrollbar) {
  @apply w-2 h-2;
}

:deep(.ag-body-viewport::-webkit-scrollbar-track) {
  @apply bg-gray-100 rounded-full;
}

:deep(.ag-body-viewport::-webkit-scrollbar-thumb) {
  @apply bg-gray-300 rounded-full hover:bg-gray-400;
}

/* Responsive adjustments */
@media (max-width: 768px) {
  :deep(.ag-header-cell-label) {
    @apply justify-start;
  }
}
</style>
