<script setup lang="ts">
import { onMounted, ref, computed, h, reactive } from 'vue'
import DefaultLayout from '@/layouts/DefaultLayout.vue'
import Button from '@/components/Buttons/Button.vue'
import MultiSelect from 'primevue/multiselect'
import Select from 'primevue/select'
import FileUpload from 'primevue/fileupload'
import Modal from '@/components/modal/modal.vue'
import InputText from 'primevue/inputtext'
import Badge from 'primevue/badge'
import Tooltip from 'primevue/tooltip'
import Swal from 'sweetalert2'

import { Scopes } from '@/stores/scopes'
import { Client } from '@/stores/client'
import { Essentials } from '@/stores/essentials'
import { Roles } from '@/stores/roles'

import 'ag-grid-community/styles/ag-grid.css'
import 'ag-grid-community/styles/ag-theme-quartz.css'
import { AgGridVue } from 'ag-grid-vue3'
import { useRoute, useRouter } from 'vue-router'

const router = useRouter()
const loading = ref(false)
const isLoading = ref(true)
const searchQuery = ref('')
const selectedRoles = ref([])
const selectAll = ref(false)
const gridApi = ref(null)

// Role data
const roles = computed(() => Roles().roles || [])

// Filtered role data
const rowData = computed(() => {
  let filteredRoles = [...roles.value]

  // Apply text search
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    filteredRoles = filteredRoles.filter((role: any) => role.role?.toLowerCase().includes(query))
  }

  return filteredRoles
})

// Stats data
const roleStats = computed(() => {
  return [
    {
      label: 'Total Roles',
      count: roles.value.length,
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-100',
      textColor: 'text-blue-800',
      labelColor: 'text-blue-600',
      icon: 'key'
    },
    {
      label: 'Admin Roles',
      count: roles.value.filter((role: any) => role.role?.toLowerCase().includes('admin')).length,
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-100',
      textColor: 'text-purple-800',
      labelColor: 'text-purple-600',
      icon: 'shield'
    },
    {
      label: 'Manager Roles',
      count: roles.value.filter((role: any) => role.role?.toLowerCase().includes('manager')).length,
      bgColor: 'bg-amber-50',
      borderColor: 'border-amber-100',
      textColor: 'text-amber-800',
      labelColor: 'text-amber-600',
      icon: 'users'
    }
  ]
})

// Handle row selection
const onRowSelected = (event) => {
  selectedRoles.value = event.api.getSelectedRows()
}

// Toggle select all roles
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
  }
}

// Handle bulk deletion
const deleteSelectedRoles = () => {
  if (selectedRoles.value.length === 0) {
    Swal.fire('Info', 'Please select roles to delete', 'info')
    return
  }

  Swal.fire({
    title: 'Delete Selected Roles?',
    html: `Are you sure you want to delete <strong>${selectedRoles.value.length}</strong> roles? This action cannot be undone.`,
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
      const deletePromises = selectedRoles.value.map((role: any) => Roles().delete_role(role.id))

      // Execute all deletions and handle the results
      Promise.allSettled(deletePromises).then((results) => {
        const successful = results.filter((r) => r.status === 'fulfilled').length
        const failed = results.filter((r) => r.status === 'rejected').length

        // Refresh the role list after deletions
        Roles()
          .fetch()
          .then(() => {
            isLoading.value = false

            // Show results message
            Swal.fire({
              title: 'Deletion Complete',
              html: `<p><strong>${successful}</strong> roles deleted successfully.</p>${
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

// Role badge renderer
const roleBadgeRenderer = (params) => {
  const roleName = params.data.role || 'Unknown Role'
  const badge = document.createElement('div')

  badge.classList.add(
    'px-2.5',
    'py-1.5',
    'text-sm',
    'font-medium',
    'rounded-md',
    'capitalize',
    'inline-flex',
    'items-center',
    'gap-2'
  )

  // Assign badge color based on role name
  if (roleName.toLowerCase().includes('admin')) {
    badge.classList.add('bg-purple-100', 'text-purple-800')
  } else if (roleName.toLowerCase().includes('manager')) {
    badge.classList.add('bg-amber-100', 'text-amber-800')
  } else if (roleName.toLowerCase().includes('head')) {
    badge.classList.add('bg-blue-100', 'text-blue-800')
  } else {
    badge.classList.add('bg-gray-100', 'text-gray-800')
  }

  // Add icon to badge
  if (roleName.toLowerCase().includes('admin')) {
    badge.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4">
        <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
      </svg>
    `
  } else if (roleName.toLowerCase().includes('manager')) {
    badge.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4">
        <path stroke-linecap="round" stroke-linejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
      </svg>
    `
  } else {
    badge.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4">
        <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
      </svg>
    `
  }

  // Add role name
  const textSpan = document.createElement('span')
  textSpan.textContent = roleName
  badge.appendChild(textSpan)

  return badge
}

// Date formatter with timeago-like display
const dateFormatter = (params) => {
  const dateString = params.data.created_at
  if (!dateString) return 'N/A'

  const date = new Date(dateString)
  if (isNaN(date.getTime())) return 'Invalid date'

  const now = new Date()
  const diffTime = Math.abs(now.getTime() - date.getTime())
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))

  const container = document.createElement('div')
  container.classList.add('flex', 'flex-col', 'gap-1')

  // Format date
  const formattedDate = date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })

  // Primary date text
  const dateText = document.createElement('span')
  dateText.classList.add('text-sm', 'font-medium', 'text-gray-700')
  dateText.textContent = formattedDate

  // Relative time indicator
  const relativeTime = document.createElement('span')
  relativeTime.classList.add('text-xs', 'text-gray-500')

  if (diffDays === 0) {
    relativeTime.textContent = 'Today'
  } else if (diffDays === 1) {
    relativeTime.textContent = 'Yesterday'
  } else if (diffDays < 30) {
    relativeTime.textContent = `${diffDays} days ago`
  } else if (diffDays < 365) {
    const months = Math.floor(diffDays / 30)
    relativeTime.textContent = `${months} ${months === 1 ? 'month' : 'months'} ago`
  } else {
    const years = Math.floor(diffDays / 365)
    relativeTime.textContent = `${years} ${years === 1 ? 'year' : 'years'} ago`
  }

  container.appendChild(dateText)
  container.appendChild(relativeTime)

  return container
}

const colDefs = ref([
  {
    headerName: '',
    field: 'selection',
    width: 50,
    headerCheckboxSelection: true,
    checkboxSelection: true,
    pinned: 'left',
    lockPosition: true,
    sortable: false,
    filter: false
  },
  {
    field: 'role',
    headerName: 'Role',
    cellRenderer: roleBadgeRenderer,
    flex: 2,
    minWidth: 200,
    sortable: true,
    filter: 'agTextColumnFilter',
    floatingFilter: true
  },
  {
    field: 'created_at',
    headerName: 'Created Date',
    cellRenderer: dateFormatter,
    flex: 1,
    minWidth: 180,
    sortable: true,
    sort: 'desc',
    filter: 'agDateColumnFilter',
    floatingFilter: true
  },
  {
    field: 'actions',
    headerName: 'Actions',
    pinned: 'right',
    sortable: false,
    filter: false,
    minWidth: 100,
    maxWidth: 120,
    cellRenderer: (params) => {
      const wrapper = document.createElement('div')
      wrapper.classList.add('flex', 'items-center', 'gap-2', 'h-full', 'justify-center')

      const deleteButton = document.createElement('button')
      deleteButton.type = 'button'
      deleteButton.classList.add(
        'p-1.5',
        'rounded-lg',
        'transition-colors',
        'hover:bg-red-50',
        'text-red-600'
      )
      deleteButton.title = 'Delete role'
      deleteButton.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-4">
                    <path stroke-linecap="round" stroke-linejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                </svg>
            `
      deleteButton.onclick = () => {
        // Confirm before deleting
        Swal.fire({
          title: 'Delete Role?',
          html: `Are you sure you want to delete <strong>${params.data.role}</strong>? This action cannot be undone.`,
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
            Roles()
              .delete_role(params.data.id)
              .then(() => {
                // Show success message
                Swal.fire({
                  title: 'Deleted!',
                  text: 'Role has been deleted successfully',
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
                  text: 'Failed to delete role',
                  icon: 'error',
                  confirmButtonText: 'OK'
                })
              })
          }
        })
      }

      wrapper.appendChild(deleteButton)
      return wrapper
    }
  }
])

// Default column definition
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
      fileName: `Roles_${new Date().toISOString().split('T')[0]}.csv`,
      columnKeys: ['role', 'created_at']
    })
  }
}

// Function to refresh the table data
const refreshTable = async () => {
  isLoading.value = true
  try {
    await Roles().fetch()
  } finally {
    isLoading.value = false
  }
}

// For add role functionality
const toggleAddRoleModal = ref(false)
const newRoleName = ref('')

const addRole = async () => {
  if (!newRoleName.value.trim()) {
    Swal.fire('Error', 'Role name is required', 'error')
    return
  }

  loading.value = true

  try {
    await Roles().add_role(newRoleName.value.trim())

    // Show success message
    Swal.fire({
      title: 'Success!',
      text: 'Role added successfully',
      icon: 'success',
      toast: true,
      position: 'top-end',
      showConfirmButton: false,
      timer: 3000
    })

    // Reset and close modal
    newRoleName.value = ''
    toggleAddRoleModal.value = false
  } catch (error) {
    console.error('Error adding role:', error)
    Swal.fire('Error', 'Failed to add role', 'error')
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  isLoading.value = true
  try {
    await Roles().init()
    await Roles().fetch()
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
          <h1 class="text-xl font-semibold text-gray-800">Role Management</h1>
          <p class="text-sm text-gray-500 mt-1">Manage user roles and permissions for the system</p>
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

          <Button
            @onClick="() => (toggleAddRoleModal = true)"
            :type="'button'"
            label="Add Role"
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
    </div>
      </div>

      <!-- Stats Cards -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <div
          v-for="(stat, index) in roleStats"
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
            <!-- Key icon -->
            <svg
              v-if="stat.icon === 'key'"
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
                d="M15.75 5.25a3 3 0 0 1 3 3m3 0a6 6 0 0 1-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1 1 21.75 8.25Z"
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
            <!-- Users/managers icon -->
            <svg
              v-else-if="stat.icon === 'users'"
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
          </div>
          <div>
            <h3 :class="['text-sm font-medium', stat.labelColor]">{{ stat.label }}</h3>
            <p :class="['text-2xl font-bold', stat.textColor]">{{ stat.count }}</p>
          </div>
        </div>
      </div>

      <!-- Search Section -->
      <div class="mb-6">
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
            placeholder="Search roles by name..."
          />
        </div>
      </div>

      <!-- Bulk actions section -->
      <div
        v-if="selectedRoles.length > 0"
        class="mb-4 p-3 bg-blue-50 border border-blue-100 rounded-lg flex flex-wrap items-center justify-between gap-3"
      >
        <div class="flex items-center gap-2">
          <span class="text-sm font-medium text-blue-700"
            >{{ selectedRoles.length }} roles selected</span
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
            @click="deleteSelectedRoles"
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
            <p class="mt-2 text-sm text-gray-500">Loading roles...</p>
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

          <div class="text-sm text-gray-500">{{ rowData.length }} roles found</div>
    </div>

        <div class="ag-theme-quartz w-full" style="height: 500px">
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
            :rowHeight="60"
            :headerHeight="50"
            rowSelection="multiple"
            suppressRowClickSelection
            :loading="isLoading"
            :overlayNoRowsTemplate="'<span class=\'p-4\'>No roles found. Try adjusting your filters or add a new role.</span>'"
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

    <!-- Add Role Modal -->
    <Modal v-model:visible="toggleAddRoleModal" title="Add New Role">
      <div>
        <form @submit.prevent="addRole">
          <div class="bg-gray-50 p-6 border-b border-gray-100">
            <label class="block text-sm font-medium text-gray-700 mb-2">Role Name</label>
            <input
              v-model="newRoleName"
              type="text"
              placeholder="Enter role name (e.g. Store Manager)"
              class="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-all duration-200"
              required
            />
            <p class="mt-2 text-xs text-gray-500">
              Role names should be descriptive of the responsibilities and permissions for this user
              type.
            </p>
          </div>

          <div class="flex items-center gap-4 justify-end bg-white p-4">
            <Button
              :type="'button'"
              @onClick="() => (toggleAddRoleModal = false)"
              label="Cancel"
              customClasses="bg-gray-100 text-gray-700 hover:bg-gray-200"
            ></Button>
            <Button
              :type="'submit'"
              :loading="loading"
              label="Save Role"
              customClasses="bg-blue-600 hover:bg-blue-700"
            ></Button>
          </div>
        </form>
      </div>
    </Modal>
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
