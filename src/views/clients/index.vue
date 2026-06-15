<script setup lang="ts" name="ClientsManagement">
import { computed, onMounted, ref, watch } from 'vue'
import DefaultLayout from '@/layouts/DefaultLayout.vue'
import { Client } from '@/stores/client'
import { Auth } from '@/stores/auth'
import router from '@/router'
import Swal from 'sweetalert2'
import { Toast } from '@/utils/toast'
import { DateFormatter } from '@/utils/date-formatter'

// AG Grid components
import 'ag-grid-community/styles/ag-grid.css'
import 'ag-grid-community/styles/ag-theme-quartz.css'
import { AgGridVue } from 'ag-grid-vue3'

// UI components
import Button from '@/components/Buttons/Button.vue'
import Modal from '@/components/modal/modal.vue'
import InputGroup from '@/components/Forms/InputGroup.vue'
import LoadingSpinner from '@/components/LoadingSpinner.vue'

// Types for TypeScript
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
}

// Data management state
const isLoading = ref<boolean>(true)
const searchQuery = ref<string>('')
const selectedClients = ref<ClientData[]>([])
const selectAll = ref<boolean>(false)
const gridApi = ref<any>(null)

// Client data with proper typing
const clients = computed<ClientData[]>(() => Client().clients || [])

// Modal and form state
const addClientModalVisible = ref<boolean>(false)
const first_name = ref<string>('')
const domain_name = ref<string>('')
const isCreatingClient = ref<boolean>(false)

// Custom label fields
const branch_label = ref<string>('Branch')
const visit_date_label = ref<string>('Date of Visit')
const branch_report_label = ref<string>('Branch Report')
const total_branches_label = ref<string>('Total Branches')
const completed_branches_label = ref<string>('Completed Branches')
const my_reports_label = ref<string>('My Branch Reports')
const na_score_value = ref<string>('0')

// Clear form fields
const clearForm = () => {
  first_name.value = ''
  domain_name.value = ''
  branch_label.value = 'Branch'
  visit_date_label.value = 'Date of Visit'
  branch_report_label.value = 'Branch Report'
  total_branches_label.value = 'Total Branches'
  completed_branches_label.value = 'Completed Branches'
  my_reports_label.value = 'My Branch Reports'
  na_score_value.value = '0'
}

// Filtered client data with search functionality
const rowData = computed<ClientData[]>(() => {
  if (!searchQuery.value) return clients.value

  const query = searchQuery.value.toLowerCase()
  return clients.value.filter((client) => {
    return (
      client.name?.toLowerCase().includes(query) ||
      client.first_name?.toLowerCase().includes(query) ||
      client.last_name?.toLowerCase().includes(query) ||
      client.domain_name?.toLowerCase().includes(query) ||
      client.email?.toLowerCase().includes(query) ||
      client.phone?.toLowerCase().includes(query)
    )
  })
})

// Statistics for the client dashboard
const clientStats = computed(() => {
  const now = new Date()
  const currentMonth = now.getMonth()
  const currentYear = now.getFullYear()

  const activeClientsCount =
    clients.value.filter((client) => client.status === 'active').length || clients.value.length

  const newThisMonth = clients.value.filter((client) => {
    if (!client.created_at) return false
    const createdDate = new Date(client.created_at)
    return createdDate.getMonth() === currentMonth && createdDate.getFullYear() === currentYear
  }).length

  return [
    {
      label: 'Total Clients',
      count: clients.value.length,
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-100',
      textColor: 'text-blue-800',
      labelColor: 'text-blue-600',
      icon: 'building'
    },
    {
      label: 'Active Clients',
      count: activeClientsCount,
      bgColor: 'bg-green-50',
      borderColor: 'border-green-100',
      textColor: 'text-green-800',
      labelColor: 'text-green-600',
      icon: 'check'
    },
    {
      label: 'New This Month',
      count: newThisMonth,
      bgColor: 'bg-amber-50',
      borderColor: 'border-amber-100',
      textColor: 'text-amber-800',
      labelColor: 'text-amber-600',
      icon: 'new'
    }
  ]
})

// Select a client and navigate
const selectClient = (data: ClientData) => {
  // Use the new store method to save selection to cookie
  Client().selectClient(data)

  // Check if the current user is a reporting user, then route to reports instead of branches
  if (Auth().isReportingUser()) {
    router.push('/client/reports')
  } else {
    router.push('/client/branches')
  }
}

// Handle row selection with proper typing
const onRowSelected = (event: any) => {
  selectedClients.value = event.api.getSelectedRows()
}

// Toggle select all clients
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

// Handle bulk deletion with better error handling
const deleteSelectedClients = () => {
  if (selectedClients.value.length === 0) {
    Swal.fire('Info', 'Please select clients to delete', 'info')
    return
  }

  Swal.fire({
    title: 'Delete Selected Clients?',
    html: `Are you sure you want to delete <strong>${selectedClients.value.length}</strong> clients? This action cannot be undone.`,
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
      const deletePromises = selectedClients.value.map((client) =>
        Client().delete(client.uuid || client.id || '')
      )

      // Execute all deletions and handle the results
      Promise.allSettled(deletePromises).then((results) => {
        const successful = results.filter((r) => r.status === 'fulfilled').length
        const failed = results.filter((r) => r.status === 'rejected').length

        // Refresh the client list after deletions
        Client()
          .fetch()
          .then(() => {
            isLoading.value = false

            // Show results message
            Swal.fire({
              title: 'Deletion Complete',
              html: `<p><strong>${successful}</strong> clients deleted successfully.</p>${
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

// Client name renderer (cell renderer function)
const clientNameRenderer = (params: any) => {
  const name =
    params.data.name ||
    `${params.data.first_name || ''} ${params.data.last_name || ''}`.trim() ||
    'Unnamed Client'
  const domain = params.data.domain_name

  const container = document.createElement('div')
  container.classList.add('flex', 'flex-col', 'gap-1')
  container.style.cursor = 'pointer'
  container.style.padding = '4px 0'

  // Name element with strong styling
  const nameElement = document.createElement('div')
  nameElement.classList.add('text-sm', 'font-medium', 'text-gray-900')
  nameElement.textContent = name
  nameElement.style.marginBottom = '4px'

  // Domain badge if available
  if (domain) {
    const domainBadge = document.createElement('div')
    domainBadge.classList.add(
      'text-xs',
      'px-2',
      'py-0.5',
      'rounded-full',
      'bg-blue-50',
      'text-blue-700',
      'inline-flex',
      'items-center',
      'gap-1',
      'max-w-fit'
    )

    // Globe icon for domain
    domainBadge.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-3 h-3">
        <path stroke-linecap="round" stroke-linejoin="round" d="M12 21a9.004 9.004 0 0 0 8.716-6.747M12 21a9.004 9.004 0 0 1-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 0 1 7.843 4.582M12 3a8.997 8.997 0 0 1-7.843 4.582m15.686 0A11.953 11.953 0 0 1 12 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0 1 21 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0 1 12 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 0 1 3 12c0-1.605.42-3.113 1.157-4.418" />
      </svg>
      <span>${domain}</span>
    `
    container.appendChild(nameElement)
    container.appendChild(domainBadge)
  } else {
    container.appendChild(nameElement)
  }

  container.addEventListener('click', () => selectClient(params.data))
  return container
}

// Date formatter with timeago-like display
const dateFormatter = (params: any) => {
  const dateString = params.value
  if (!dateString) return 'N/A'

  const date = new Date(dateString)
  if (isNaN(date.getTime())) return 'Invalid date'

  const now = new Date()
  const diffTime = Math.abs(now.getTime() - date.getTime())
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))

  const container = document.createElement('div')
  container.classList.add('flex', 'flex-col', 'gap-1')
  container.style.cursor = 'pointer'
  container.style.padding = '4px 0'

  // Format date
  const formattedDate = DateFormatter(dateString) || ''

  // Primary date text
  const dateText = document.createElement('span')
  dateText.classList.add('text-sm', 'font-medium', 'text-gray-700')
  dateText.textContent = formattedDate
  dateText.style.marginBottom = '2px'

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

  // Fix: Use a safer approach to get the client data
  container.addEventListener('click', () => {
    if (params.data) {
      selectClient(params.data)
    } else if (params.node && params.node.data) {
      selectClient(params.node.data)
    }
  })

  return container
}

// Actions cell renderer
const actionsRenderer = (params: any) => {
  const wrapper = document.createElement('div')
  wrapper.classList.add('flex', 'items-center', 'gap-2', 'h-full', 'justify-center')

  // Select button
  const selectButton = document.createElement('button')
  selectButton.type = 'button'
  selectButton.classList.add(
    'p-1.5',
    'rounded-lg',
    'transition-colors',
    'hover:bg-blue-50',
    'text-blue-600'
  )
  selectButton.title = 'Select client'
  selectButton.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-4">
      <path stroke-linecap="round" stroke-linejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
    </svg>
  `
  selectButton.onclick = () => selectClient(params.data)

  // Edit Button
  const editButton = document.createElement('button')
  editButton.type = 'button'
  editButton.classList.add(
    'p-1.5',
    'rounded-lg',
    'transition-colors',
    'hover:bg-green-50',
    'text-green-600'
  )
  editButton.title = 'Edit client'
  editButton.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-4">
      <path stroke-linecap="round" stroke-linejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
    </svg>
  `
  editButton.onclick = () => router.push(`/client/edit/${params.data.uuid || params.data.id}`)

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
  deleteButton.title = 'Delete client'
  deleteButton.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-4">
      <path stroke-linecap="round" stroke-linejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
    </svg>
  `
  deleteButton.onclick = (e) => {
    e.stopPropagation()
    // Confirm before deleting
    Swal.fire({
      title: 'Delete Client?',
      html: `Are you sure you want to delete <strong>${
        params.data.name || 'this client'
      }</strong>? This action cannot be undone.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, delete',
      cancelButtonText: 'Cancel',
      focusCancel: true
    }).then((result) => {
      if (result.isConfirmed) {
        Client().delete(params.data.uuid || params.data.id || '')
      }
    })
  }

  // Append buttons to wrapper
  wrapper.appendChild(selectButton)
  wrapper.appendChild(editButton)
  wrapper.appendChild(deleteButton)

  return wrapper
}

// AG Grid column definitions
const colDefs = ref([
  // {
  //   headerName: '',
  //   field: 'selection',
  //   width: 10,
  //   headerCheckboxSelection: true,
  //   checkboxSelection: true,
  //   // pinned: 'left',
  //   lockPosition: true,
  //   sortable: false,
  //   filter: false
  // },
  {
    field: 'name',
    headerName: 'Client',
    cellRenderer: clientNameRenderer,
    minWidth: 250,
    flex: 2,
    sortable: true,
    filter: 'agTextColumnFilter',
    filterParams: {
      filterOptions: ['contains', 'startsWith', 'equals'],
      buttons: ['reset', 'apply']
    },
    floatingFilter: true,
    cellStyle: { padding: '16px 8px' }
  },
  {
    field: 'created_at',
    headerName: 'Created At',
    cellRenderer: dateFormatter,
    minWidth: 180,
    flex: 1,
    sortable: true,
    sort: 'desc',
    filter: 'agDateColumnFilter',
    floatingFilter: true
  },
  {
    field: 'updated_at',
    headerName: 'Updated At',
    cellRenderer: dateFormatter,
    minWidth: 180,
    flex: 1,
    sortable: true,
    filter: 'agDateColumnFilter',
    floatingFilter: true
  },
  {
    field: 'actions',
    headerName: 'Actions',
    cellRenderer: actionsRenderer,
    // pinned: 'right',
    sortable: false,
    filter: false,
    minWidth: 140,
    maxWidth: 140
  }
])

// Grid ready handler
const onGridReady = (params: any) => {
  gridApi.value = params.api
  params.api.sizeColumnsToFit()
  isLoading.value = false
}

// Function to refresh the table data
const refreshTable = async () => {
  isLoading.value = true
  try {
    // Ensure the client store is properly initialized
    const clientStore = Client()
    if (!clientStore.xios?.get) {
      await clientStore.init()
    }

    // Fetch all clients with force refresh option
    await clientStore.fetch({ forceRefresh: true })

    // Force grid refresh
    if (gridApi.value) {
      gridApi.value.refreshCells({ force: true })
    }
  } catch (error) {
    console.error('Error refreshing data:', error)
    Toast.error('Failed to refresh client data')
  } finally {
    isLoading.value = false
  }
}

// Create client function
const createClient = async () => {
  // Validate required fields
  if (!first_name.value.trim() || !domain_name.value.trim()) {
    Toast.error('Client name and domain name are required')
    return
  }

  // Set loading state
  isCreatingClient.value = true

  const payload = {
    first_name: first_name.value.trim(),
    last_name: '',
    email: '',
    phone: '',
    domain_name: domain_name.value.trim(),
    branch_label: branch_label.value.trim(),
    visit_date_label: visit_date_label.value.trim(),
    branch_report_label: branch_report_label.value.trim(),
    total_branches_label: total_branches_label.value.trim(),
    completed_branches_label: completed_branches_label.value.trim(),
    my_reports_label: my_reports_label.value.trim(),
    na_score_value: na_score_value.value.trim() || '0'
  }

  try {
    // Ensure the client store is properly initialized
    const clientStore = Client()
    if (!clientStore.xios?.post) {
      await clientStore.init()
    }

    await clientStore.create(payload)
    Toast.success('Client added successfully')

    // Reset form and close modal
    clearForm()
    addClientModalVisible.value = false

    // Refresh the clients data with force option
    await clientStore.fetch({ forceRefresh: true })
  } catch (error) {
    console.error('Error creating client:', error)
    Toast.error('Failed to create client')
  } finally {
    // Clear loading state
    isCreatingClient.value = false
  }
}

// Initialize on component mount
onMounted(async () => {
  try {
    const clientStore = Client()

    // Ensure store is initialized with proper API client
    if (!clientStore.xios?.get) {
      await clientStore.init()
    }

    // Fetch all clients with force refresh to ensure latest data
    await clientStore.fetch({ forceRefresh: true })

    // Register a global event listener for browser visibility changes
    document.addEventListener('visibilitychange', () => {
      // Refresh when returning to the page (tab becomes visible again)
      if (document.visibilityState === 'visible') {
        console.log('Tab became visible, refreshing client data...')
        clientStore.fetch({ forceRefresh: true })
      }
    })

    // Watch for client store changes
    watch(
      () => clientStore.clients,
      () => {
        // Force refresh if grid is ready
        if (gridApi.value) {
          gridApi.value.refreshCells({ force: true })
        }
      },
      { deep: true }
    )
  } catch (error) {
    console.error('Error initializing clients view:', error)
    Toast.error('Failed to load clients')
  } finally {
    isLoading.value = false
  }
})
</script>

<template>
  <DefaultLayout>
    <!-- Page header with title and actions -->
    <div class="mb-6">
      <h1 class="text-2xl font-bold text-gray-900">Client Management</h1>
      <p class="text-gray-600 mt-1">View, manage, and create client accounts</p>
    </div>

    <!-- Statistics cards -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      <div
        v-for="(stat, index) in clientStats"
        :key="index"
        :class="['p-4 rounded-lg border shadow-sm', stat.bgColor, stat.borderColor]"
      >
        <div class="flex items-center justify-between">
          <div>
            <h3 :class="['text-sm font-medium', stat.labelColor]">{{ stat.label }}</h3>
            <p :class="['text-2xl font-semibold mt-1', stat.textColor]">{{ stat.count }}</p>
          </div>

          <!-- Icons based on stat type -->
          <div :class="['p-2 rounded-full', stat.bgColor]">
            <svg
              v-if="stat.icon === 'building'"
              xmlns="http://www.w3.org/2000/svg"
              class="h-6 w-6"
              :class="stat.textColor"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              stroke-width="2"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
              />
            </svg>
            <svg
              v-else-if="stat.icon === 'check'"
              xmlns="http://www.w3.org/2000/svg"
              class="h-6 w-6"
              :class="stat.textColor"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              stroke-width="2"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <svg
              v-else
              xmlns="http://www.w3.org/2000/svg"
              class="h-6 w-6"
              :class="stat.textColor"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              stroke-width="2"
            >
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
            </svg>
          </div>
        </div>
      </div>
    </div>

    <!-- Action bar -->
    <div class="flex flex-wrap items-center justify-between gap-4 mb-4">
      <div class="flex items-center gap-3">
        <Button
          type="button"
          label="Clear Filters"
          class="bg-gray-800 text-gray-800 hover:bg-gray-900 h-10 px-4"
          @click="clearFilters"
        />
        <Button
          type="button"
          label="Refresh"
          class="bg-blue-500 text-blue-700 hover:bg-blue-800 h-10 px-4"
          @click="refreshTable"
        />
        <div v-if="selectedClients.length > 0" class="flex items-center gap-3">
          <span class="text-sm text-gray-600">{{ selectedClients.length }} selected</span>
          <Button
            type="button"
            label="Delete Selected"
            class="bg-red-500 text-red-700 hover:bg-red-100 h-10 px-4"
            @click="deleteSelectedClients"
          />
        </div>
      </div>

      <Button
        type="button"
        label="Add New Client"
        class="bg-black text-white hover:bg-gray-800 h-10 px-4"
        @click="addClientModalVisible = true"
      />
    </div>

    <!-- Loading overlay -->
    <div v-if="isLoading" class="flex flex-col items-center justify-center py-12">
      <div class="mb-4">
        <LoadingSpinner size="large" color="primary" type="border" />
      </div>
      <p class="text-gray-600">Loading clients...</p>
    </div>

    <!-- Client data grid -->
    <div v-else class="">
      <div class="border-b border-gray-200 p-4">
        <div class="relative flex items-center">
          <div class="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
            <svg
              class="w-5 h-5 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              ></path>
            </svg>
          </div>
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Search clients by name, domain, email..."
            class="pl-10 pr-4 py-2 border border-gray-300 rounded-lg w-full md:w-96 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      <!-- Data grid -->
      <ag-grid-vue
        :rowData="rowData"
        :columnDefs="colDefs"
        class="ag-theme-quartz client-grid"
        style="height: 600px"
        :loading="isLoading"
        @grid-ready="onGridReady"
        @grid-size-changed="(params: { api: any }) => params.api.sizeColumnsToFit()"
        @row-selected="onRowSelected"
        :defaultColDef="{
          flex: 1,
          minWidth: 100,
          sortable: true,
          resizable: true,
          floatingFilter: true,
          filter: true,
          cellStyle: { padding: '12px 8px' }
        }"
        :rowSelection="'multiple'"
        :suppressRowClickSelection="true"
        :pagination="true"
        :paginationPageSize="20"
        :paginationAutoPageSize="false"
        :enableCellTextSelection="true"
        domLayout="autoHeight"
        rowHeight="70"
        animateRows="true"
        :getRowId="(params: { data: ClientData }) => params.data.uuid || params.data.id"
      />

      <!-- Empty state -->
      <div
        v-if="!isLoading && rowData.length === 0"
        class="flex flex-col items-center justify-center p-12 bg-gray-50"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="h-16 w-16 text-gray-400 mb-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="1.5"
            d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
          />
        </svg>
        <h3 class="text-lg font-medium text-gray-900 mb-2">No clients found</h3>
        <p class="text-gray-500 text-center max-w-md mb-4">
          No clients match your search criteria. Try adjusting your filters or create a new client
          to get started.
        </p>
        <Button
          type="button"
          label="Add Your First Client"
          class="bg-black text-white hover:bg-gray-800"
          @click="addClientModalVisible = true"
        />
      </div>
    </div>
  </DefaultLayout>

  <!-- Add Client Modal -->
  <Modal
    :visible="addClientModalVisible"
    @update:visible="addClientModalVisible = $event"
    title="Add New Client"
  >
    <form @submit.prevent="createClient" class="space-y-4 p-4">
      <InputGroup
        v-model="first_name"
        label="Client Name"
        type="text"
        placeholder="Enter client name"
        required
      />
      <InputGroup
        v-model="domain_name"
        label="Domain Name"
        type="text"
        placeholder="Enter domain name"
        required
      />
      
      <!-- Custom Labels Section -->
      <div class="border-t pt-4 mt-4">
        <h3 class="text-lg font-medium text-gray-900 mb-3">Dashboard Label Customization</h3>
        <p class="text-sm text-gray-600 mb-4">Customize the terminology used in the client dashboard to match your business (e.g., "Store" instead of "Branch")</p>
        
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <InputGroup
            v-model="branch_label"
            label="Branch Label"
            type="text"
            placeholder="e.g., Branch, Store, Location, Outlet"
          />
          <InputGroup
            v-model="visit_date_label"
            label="Visit Date Label"
            type="text"
            placeholder="e.g., Date of Visit, Visit Date, Inspection Date"
          />
          <InputGroup
            v-model="branch_report_label"
            label="Branch Report Label"
            type="text"
            placeholder="e.g., Branch Report, Store Report, Location Report"
          />
          <InputGroup
            v-model="total_branches_label"
            label="Total Branches Label"
            type="text"
            placeholder="e.g., Total Branches, Total Stores, Total Locations"
          />
          <InputGroup
            v-model="completed_branches_label"
            label="Completed Branches Label"
            type="text"
            placeholder="e.g., Completed Branches, Completed Stores"
          />
          <InputGroup
            v-model="my_reports_label"
            label="My Reports Label"
            type="text"
            placeholder="e.g., My Branch Reports, My Store Reports"
          />
        </div>
      </div>
      <div class="border-t pt-4 mt-4">
        <h3 class="text-lg font-medium text-gray-900 mb-3">N/A Score Display</h3>
        <p class="text-sm text-gray-600 mb-4">
          When a question response is N/A, this value is shown in Applicable Score and Achieved Score
          on reports and downloads (instead of 0). Use a number (e.g. 0) or text (e.g. N/A, Exempt).
        </p>
        <InputGroup
          v-model="na_score_value"
          label="N/A Score Value"
          type="text"
          placeholder="e.g., 0, N/A, Exempt"
        />
      </div>

      <div class="flex justify-end gap-2 mt-6">
        <Button
          type="button"
          label="Cancel"
          class="bg-gray-100 text-gray-800 hover:bg-gray-200"
          @click="addClientModalVisible = false"
        />
        <Button
          type="submit"
          :label="isCreatingClient ? 'Creating...' : 'Create Client'"
          class="bg-black text-white hover:bg-gray-800"
          :disabled="isCreatingClient"
          :class="{ 'opacity-70 cursor-not-allowed': isCreatingClient }"
        >
          <template #icon v-if="isCreatingClient">
            <LoadingSpinner size="small" color="white" type="border" />
          </template>
        </Button>
      </div>
    </form>
  </Modal>
</template>

<style scoped>
.client-grid :deep(.ag-cell) {
  display: flex;
  align-items: center;
}

.client-grid :deep(.ag-header-cell-label) {
  padding: 8px 0;
}

.client-grid :deep(.ag-header-cell) {
  padding: 0 8px;
}

.client-grid :deep(.ag-row) {
  border-bottom: 1px solid #f3f4f6;
}
</style>
