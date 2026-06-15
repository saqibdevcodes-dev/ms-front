<script setup lang="ts">
// Rename the component to BranchesPage to fix the multi-word component name linter error
defineOptions({
  name: 'BranchesPage'
})

import { onMounted, ref, computed } from 'vue'
import DefaultLayout from '@/layouts/DefaultLayout.vue'

import 'ag-grid-community/styles/ag-grid.css'
import 'ag-grid-community/styles/ag-theme-quartz.css'
import { AgGridVue } from 'ag-grid-vue3'
import Button from '@/components/Buttons/Button.vue'

import Modal from '@/components/modal/modal.vue'
import InputGroup from '@/components/Forms/InputGroup.vue'

import { Client } from '@/stores/client'
import { Branches } from '@/stores/branches'
import { Toast } from '@/utils/toast'
import Swal from 'sweetalert2'

import FileUpload from 'primevue/fileupload'
import router from '@/router'
import ClientDebug from '@/components/Debug/ClientDebug.vue'
import LoadingSpinner from '@/components/LoadingSpinner.vue'

// Helper functions
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'

  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

const branches = computed(() => Branches())

// Reference to store grid API
const gridApi = ref<any>(null)

// Function to handle grid ready event
const onGridReady = (params: any) => {
  gridApi.value = params.api
  params.api.sizeColumnsToFit()
}

// Branch name renderer with better styling
const branchNameRenderer = (params: any) => {
  const container = document.createElement('div')
  container.classList.add('flex', 'items-center', 'gap-3', 'py-2')

  // Create avatar/icon for the branch
  const avatar = document.createElement('div')
  avatar.classList.add(
    'flex',
    'items-center',
    'justify-center',
    'w-10',
    'h-10',
    'rounded-full',
    'bg-sky-100',
    'text-sky-600',
    'flex-shrink-0'
  )

  // Add the first letter of branch name as avatar text
  const nameInitial = (params.value || 'B').charAt(0).toUpperCase()
  avatar.textContent = nameInitial

  // Content wrapper
  const content = document.createElement('div')
  content.classList.add('flex', 'flex-col')

  // Branch name with better styling
  const name = document.createElement('div')
  name.classList.add('text-sm', 'font-semibold', 'text-gray-900', 'leading-tight')
  name.textContent = params.value || 'Unnamed Branch'

  // Add metadata if available (example: address or description)
  if (params.data.address) {
    const meta = document.createElement('div')
    meta.classList.add('text-xs', 'text-gray-500', 'mt-0.5')
    meta.textContent = params.data.address
    content.appendChild(name)
    content.appendChild(meta)
  } else {
    content.appendChild(name)
  }

  container.appendChild(avatar)
  container.appendChild(content)
  return container
}

// Branch code renderer
const branchCodeRenderer = (params: any) => {
  const container = document.createElement('div')

  if (!params.value) {
    const emptyState = document.createElement('span')
    emptyState.classList.add('text-xs', 'text-gray-400', 'italic')
    emptyState.textContent = 'No code'
    container.appendChild(emptyState)
    return container
  }

  const code = document.createElement('span')
  code.classList.add(
    'text-xs',
    'font-medium',
    'inline-flex',
    'items-center',
    'justify-center',
    'px-2.5',
    'py-1',
    'rounded-full',
    'bg-sky-50',
    'text-sky-700',
    'border',
    'border-sky-100'
  )

  // Add code icon
  const svgWrapper = document.createElement('span')
  svgWrapper.classList.add('mr-1')
  svgWrapper.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
      <path fill-rule="evenodd" d="M6.672 1.911a1 1 0 10-1.932.518l.259.966a1 1 0 001.932-.518l-.26-.966zM2.429 4.74a1 1 0 10-.517 1.932l.966.259a1 1 0 00.517-1.932l-.966-.26zm8.814-.569a1 1 0 00-1.415-1.414l-.707.707a1 1 0 101.415 1.415l.707-.708zm-7.071 7.072l.707-.707A1 1 0 003.465 9.12l-.708.707a1 1 0 001.415 1.415zm3.2-5.171a1 1 0 00-1.3 1.3l4 10a1 1 0 001.823.075l1.38-2.759 3.018 3.02a1 1 0 001.414-1.415l-3.019-3.02 2.76-1.379a1 1 0 00-.076-1.822l-10-4z" clip-rule="evenodd" />
    </svg>
  `

  const textSpan = document.createElement('span')
  textSpan.textContent = params.value

  code.appendChild(svgWrapper)
  code.appendChild(textSpan)
  container.appendChild(code)
  return container
}

// Date renderer with relative time
const dateRenderer = (params: any) => {
  if (!params.value) {
    const emptyState = document.createElement('div')
    emptyState.classList.add('text-xs', 'text-gray-400', 'italic')
    emptyState.textContent = 'Not available'
    return emptyState
  }

  const container = document.createElement('div')
  container.classList.add('flex', 'flex-col', 'gap-1')
  container.style.padding = '4px 0'

  // Format date
  const formattedDate = new Date(params.value).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })

  // Primary date text
  const dateText = document.createElement('span')
  dateText.classList.add('text-sm', 'font-medium', 'text-gray-700')
  dateText.textContent = formattedDate

  // Add relative time indicator
  const now = new Date()
  const date = new Date(params.value)
  const diffTime = Math.abs(now.getTime() - date.getTime())
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))

  const relativeTime = document.createElement('div')
  relativeTime.classList.add('text-xs', 'text-gray-500', 'flex', 'items-center', 'gap-1')

  // Add clock icon
  relativeTime.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  `

  const textSpan = document.createElement('span')
  if (diffDays === 0) {
    textSpan.textContent = 'Today'
  } else if (diffDays === 1) {
    textSpan.textContent = 'Yesterday'
  } else if (diffDays < 30) {
    textSpan.textContent = `${diffDays} days ago`
  } else if (diffDays < 365) {
    const months = Math.floor(diffDays / 30)
    textSpan.textContent = `${months} ${months === 1 ? 'month' : 'months'} ago`
  } else {
    const years = Math.floor(diffDays / 365)
    textSpan.textContent = `${years} ${years === 1 ? 'year' : 'years'} ago`
  }

  relativeTime.appendChild(textSpan)
  container.appendChild(dateText)
  container.appendChild(relativeTime)

  return container
}

// Actions cell renderer with better styling
const actionsRenderer = (params: any) => {
  const wrapper = document.createElement('div')
  wrapper.classList.add('flex', 'items-center', 'justify-center', 'h-full')

  // Delete Button with improved styling
  const deleteButton = document.createElement('button')
  deleteButton.type = 'button'
  deleteButton.classList.add(
    'p-2',
    'rounded-full',
    'transition-all',
    'hover:bg-red-50',
    'text-red-600',
    'focus:outline-none',
    'focus:ring-2',
    'focus:ring-red-500',
    'focus:ring-offset-1'
  )
  deleteButton.title = 'Delete branch'
  deleteButton.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" class="size-4">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  `
  deleteButton.onclick = async (e) => {
    e.stopPropagation()
    try {
      // Get the appropriate id to use for deletion
      const branchId = params.data.id || params.data.uuid || params.data.branch_id

      if (!branchId) {
        Toast.error('Cannot delete branch: Missing branch ID')
        return
      }

      // Show confirmation dialog
      const result = await Swal.fire({
        title: 'Delete Branch?',
        html: `Are you sure you want to delete <strong>${
          params.data.branch_name || 'this branch'
        }</strong>?`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#ef4444',
        cancelButtonColor: '#64748b',
        confirmButtonText: 'Yes, delete',
        cancelButtonText: 'Cancel',
        focusCancel: true,
        customClass: {
          container: 'branch-delete-dialog',
          popup: 'rounded-xl shadow-xl border border-gray-200',
          title: 'text-gray-800 text-xl',
          htmlContainer: 'text-gray-600',
          confirmButton: 'rounded-lg font-medium',
          cancelButton: 'rounded-lg font-medium'
        }
      })

      if (result.isConfirmed) {
        await Branches().delete_branch(branchId)

        Toast.success('Branch deleted successfully')

        // Refresh branches data
        await Branches().fetch({ forceRefresh: true })
      }
    } catch (error) {
      console.error('Error in delete button click handler:', error)
      Toast.error('Failed to delete branch')
    }
  }

  // Add only the delete button
  wrapper.appendChild(deleteButton)

  return wrapper
}

// Default columns for the branches grid with improved renderers
const defaultColDefs = [
  {
    field: 'branch_name',
    headerName: 'Branch Name',
    cellStyle: { padding: '16px 8px' },
    cellRenderer: branchNameRenderer,
    flex: 2,
    minWidth: 220,
    filter: 'agTextColumnFilter',
    filterParams: {
      filterOptions: ['contains', 'startsWith', 'endsWith'],
      buttons: ['reset', 'apply']
    }
  },
  {
    field: 'branch_code',
    headerName: 'Branch Code',
    cellStyle: { padding: '12px 8px' },
    cellRenderer: branchCodeRenderer,
    flex: 1,
    minWidth: 150,
    filter: 'agTextColumnFilter'
  },
  {
    field: 'user',
    headerName: 'User',
    cellStyle: { padding: '12px 8px' },
    flex: 1,
    minWidth: 140,
    filter: 'agTextColumnFilter'
  },
  {
    field: 'city',
    headerName: 'City',
    cellStyle: { padding: '12px 8px' },
    flex: 1,
    minWidth: 140,
    filter: 'agTextColumnFilter'
  },
  {
    field: 'country',
    headerName: 'Country',
    cellStyle: { padding: '12px 8px' },
    flex: 1,
    minWidth: 140,
    filter: 'agTextColumnFilter'
  },
  {
    field: 'actions',
    headerName: 'Actions',
    minWidth: 80,
    maxWidth: 80,
    cellRenderer: actionsRenderer,
    sortable: false,
    filter: false
  }
]

// Dynamic column definitions that can be updated
const colDefs = ref([...defaultColDefs])

// Updating branch headers when available
if (branches.value.branch_headers.length > 0) {
  // Add the actions column to the headers
  const headersList = branches.value.branch_headers as Array<{ field: string; headerName: string }>
  const headers = [
    ...headersList.map((header) => ({
      field: header.field,
      headerName: header.headerName,
      cellStyle: { padding: '12px 8px' },
      flex: 1,
      minWidth: 140,
      filter: 'agTextColumnFilter'
    })),
    {
      field: 'actions',
      headerName: 'Actions',
      minWidth: 80,
      maxWidth: 80,
      cellRenderer: actionsRenderer,
      sortable: false,
      filter: false
    }
  ]
  colDefs.value = headers
  console.log('Setting column definitions from stored headers:', headers)
}

// Show/hide the branches grid based on data existence
const showBranchesGrid = computed(() => rowData.value.length > 0)

// Branches grid data with proper dynamic field access
const rowData = computed(() => {
  const data = [...Branches().branches]
  console.log('Branch data for table:', data)
  return data || []
})

const toggleUploadModal = ref(false)
const uploadFile = ref<any>(null)
const isUploading = ref(false)

// Handle file selection before upload
const onFileSelect = (event: any) => {
  console.log('File selected:', event.files[0])
  uploadFile.value = event.files[0]
}

// For manual upload button
const handleManualUpload = async () => {
  if (!uploadFile.value) {
    Toast.error('Please select a file to upload')
    return
  }

  isUploading.value = true
  Toast.info('Uploading and processing file... This may take a moment for large files.')

  try {
    const formData = new FormData()
    formData.append('file', uploadFile.value)

    // Make sure we have a valid client ID
    const clientId = Client().selected_client?.uuid
    if (!clientId) {
      throw new Error('No client selected. Please select a client first.')
    }

    formData.append('client_id', clientId)
    console.log('Client ID being sent for upload:', clientId)
    console.log('File size:', uploadFile.value.size, 'bytes')

    // Upload the branch data
    const response = await Branches().upload_branch_data(formData)
    console.log('Upload response:', response)

    // Show success message with row count if available
    let successMessage = 'File uploaded successfully. Branch data has been updated.'
    if (response.totalRows) {
      successMessage = `File uploaded successfully! ${response.totalRows} rows processed and inserted.`
    }

    // Force refresh branches with cache busting to get the latest data
    await Branches().fetch({ forceRefresh: true })
    console.log('Branches after upload:', Branches().branches)

    toggleUploadModal.value = false
    uploadFile.value = null
    Toast.success(successMessage)
  } catch (error: any) {
    console.error('Error uploading file:', error)

    // Provide more specific error messages
    let errorMessage = 'Failed to upload file: ' + (error.message || 'Unknown error')

    if (error.message?.includes('File too large')) {
      errorMessage = 'File is too large. Please ensure the file is under 50MB.'
    } else if (error.message?.includes('No headers')) {
      errorMessage =
        'Invalid Excel file format. Please ensure the file has headers in the first row.'
    } else if (error.message?.includes('timeout')) {
      errorMessage =
        'Upload timed out. The file may be too large or the server is busy. Please try again.'
    }

    Toast.error(errorMessage)
  } finally {
    isUploading.value = false
  }
}

const downloadBranchData = async () => {
  try {
    Toast.info('Downloading branch data...')
    await branches.value.download_branch_data()
  } catch (error) {
    console.error('Error downloading branch data:', error)
    Toast.error('Failed to download branch data')
  }
}

onMounted(async () => {
  try {
    // Initialize the branches store
    await Branches().init()
    console.log('Branches store initialized')

    // Create a direct reference to the branch store
    const branchStore = Branches()

    // Check if client is properly selected
    if (!branchStore.client?.uuid) {
      console.error('No client selected or client UUID missing')
      console.log('Current client in branch store:', branchStore.client)
      console.log('Client from store:', Client().selected_client)

      // Try to fix by ensuring client is properly set
      if (Client().selected_client?.uuid) {
        console.log('Setting client from Client store:', Client().selected_client.uuid)
        // Wait a moment to ensure stores are properly initialized
        setTimeout(async () => {
          await branchStore.fetch({ forceRefresh: true })
        }, 500)
      } else {
        Toast.error('Please select a client first')
        return
      }
    } else {
      console.log('Client ID for fetching branches:', branchStore.client.uuid)
    }

    // Force refresh branches data with cache-busting
    console.log('Forcing refresh of branches data...')
    await branchStore.fetch({ forceRefresh: true })
    console.log('Branches data after fetch:', branchStore.branches)

    // Update column definitions if headers are available from the backend
    if (branchStore.branch_headers.length > 0) {
      // Add the actions column to the headers
      const headersList = branchStore.branch_headers as Array<{ field: string; headerName: string }>
      const headers = [
        ...headersList.map((header) => ({
          field: header.field,
          headerName: header.headerName,
          cellStyle: { padding: '12px 8px' },
          flex: 1,
          minWidth: 140,
          filter: 'agTextColumnFilter'
        })),
        {
          field: 'actions',
          headerName: 'Actions',
          minWidth: 80,
          maxWidth: 80,
          cellRenderer: actionsRenderer,
          sortable: false,
          filter: false
        }
      ]
      colDefs.value = headers
      console.log('Setting column definitions from stored headers:', headers)
    }
  } catch (error: any) {
    console.error('Error initializing page:', error)
    Toast.error(error.message || 'Failed to load branch data')
  }
})
</script>

<template>
  <DefaultLayout>
    <!-- Debug component - can be removed once issue is resolved -->
    <!-- <ClientDebug class="mb-6" /> -->

    <div class="flex items-center justify-between gap-4 mb-4">
      <!-- Action buttons moved to the right -->
      <div class="text-xl font-bold text-gray-800">Branch Locations</div>
      <div class="flex items-center gap-4 ml-auto">
        <Button
          :type="'button'"
          @click="
            async () => {
              Toast.info('Refreshing branches data...')
              await Branches().fetch({ forceRefresh: true })
            }
          "
          class="bg-green-600 hover:bg-green-700 text-white mr-2"
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
          Refresh Data
        </Button>
        <Button :type="'button'" label="Upload Data" @click="toggleUploadModal = true" />
        <Button
          v-if="showBranchesGrid"
          :type="'button'"
          @click="async () => await Branches().wipeAllBranches()"
          class="bg-red-600 hover:bg-red-700 text-white"
          :disabled="branches.loading"
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
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
            />
          </svg>
          Wipe Data
        </Button>
      </div>
    </div>

    <div class="grid lg:grid-cols-1 gap-4">
      <div class="w-full">
        <!-- Improved empty state -->
        <div
          v-if="!showBranchesGrid"
          class="bg-white p-8 rounded-xl text-center shadow-sm border border-gray-100"
        >
          <div class="max-w-md mx-auto">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-16 w-16 mx-auto text-gray-300 mb-4"
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
            <h3 class="text-xl font-bold text-gray-800 mb-2">No Branch Data Available</h3>
            <p class="text-gray-600 mb-6">
              Upload a spreadsheet to create and manage branch locations for this client.
            </p>
            <Button
              :type="'button'"
              label="Upload Branch Data"
              @click="toggleUploadModal = true"
              class="inline-flex items-center justify-center"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="h-5 w-5 mr-2"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                />
              </svg>
              Upload Spreadsheet
            </Button>
          </div>
        </div>

        <!-- Grid with improved container -->
        <div
          v-else
          class="rounded-xl overflow-hidden shadow-sm border border-gray-100 grid-container"
        >
          <!-- Search and filter bar -->
          <div class="bg-gray-50 border-b border-gray-100 p-4 flex items-center">
            <div class="relative flex-grow max-w-md">
              <input
                type="text"
                placeholder="Search branches..."
                class="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-colors"
              />
              <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg
                  class="h-5 w-5 text-gray-400"
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
            </div>
          </div>

          <!-- Loading overlay -->
          <div v-if="branches.loading" class="flex items-center justify-center p-12">
            <LoadingSpinner size="large" color="primary" type="border" />
            <span class="ml-3 text-gray-600">Loading branch data...</span>
          </div>

          <!-- AG Grid -->
          <div v-else class="grid-wrapper">
            <ag-grid-vue
              :rowData="rowData"
              :columnDefs="colDefs"
              class="ag-theme-quartz"
              domLayout="normal"
              style="height: 600px; width: 100%"
              :loading="branches.loading"
              @grid-ready="onGridReady"
              rowSelection="none"
              @grid-size-changed="(params: any) => params.api.sizeColumnsToFit()"
              :rowHeight="70"
              :defaultColDef="{
                resizable: true,
                sortable: true,
                filter: true,
                floatingFilter: true
              }"
              :pagination="false"
            >
            </ag-grid-vue>
          </div>
        </div>
      </div>
    </div>

    <!-- Upload Data Modal -->
    <Modal v-model:visible="toggleUploadModal" title="Upload Branch Data">
      <div>
        <div class="flex flex-col gap-4">
          <div class="bg-blue-50 p-4 rounded-md text-sm text-blue-800 mb-2">
            <p class="font-medium">Upload Instructions:</p>
            <ol class="list-decimal ml-5 mt-1 space-y-1">
              <li>Prepare an Excel spreadsheet with your branch data</li>
              <li>Make sure it includes columns for branch name, code, and other details</li>
              <li>Upload your file using the form below</li>
              <li>The table will automatically update to show your data</li>
            </ol>
          </div>

          <div class="border rounded-md p-4">
            <!-- Simplified upload component -->
            <FileUpload
              mode="basic"
              name="file"
              accept=".xlsx,.xls"
              :maxFileSize="50000000"
              @select="onFileSelect"
              @upload="handleManualUpload"
              :auto="true"
              chooseLabel="Choose Excel File (Max 50MB)"
              class="w-full"
              :disabled="branches.loading"
            />

            <!-- Loading indicator -->
            <div v-if="isUploading" class="flex items-center justify-center py-4 mt-2">
              <svg
                class="animate-spin h-6 w-6 text-blue-600 mr-2"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  class="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  stroke-width="4"
                ></circle>
                <path
                  class="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              <span>Processing your data...</span>
            </div>

            <!-- File details when selected -->
            <div v-if="uploadFile" class="mt-2 p-3 border rounded-md">
              <div class="flex items-center">
                <span class="text-sm font-medium">{{ uploadFile?.name }}</span>
                <span v-if="uploadFile?.size" class="text-xs text-gray-500 ml-2">
                  ({{ formatFileSize(uploadFile.size) }})
                </span>
              </div>
            </div>
          </div>

          <div class="flex items-center justify-end gap-2 mt-4">
            <Button
              type="button"
              label="Cancel"
              @click="toggleUploadModal = false"
              :outline="true"
            />
            <Button
              type="button"
              label="Upload"
              @click="handleManualUpload"
              :disabled="!uploadFile || branches.loading"
            />
          </div>
        </div>
      </div>
    </Modal>
  </DefaultLayout>
</template>

<!-- Add CSS for better grid styling -->
<style scoped>
.ag-theme-quartz {
  --ag-header-height: 60px;
  --ag-header-foreground-color: #1f2937;
  --ag-header-background-color: #f8fafc;
  --ag-header-column-separator-display: block;
  --ag-header-column-separator-color: #e2e8f0;
  --ag-row-border-color: #f1f5f9;
  --ag-font-size: 14px;
  --ag-font-family: system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial,
    sans-serif;
  --ag-cell-horizontal-padding: 16px;
  --ag-row-hover-color: #f1f5f9;
  --ag-selected-row-background-color: rgba(56, 189, 248, 0.08);
  --ag-range-selection-border-color: #38bdf8;
  --ag-range-selection-background-color: rgba(56, 189, 248, 0.1);
  --ag-checkbox-checked-color: #0ea5e9;
  --ag-checkbox-unchecked-color: #94a3b8;
  --ag-checkbox-indeterminate-color: #64748b;

  /* Animation and transitions */
  --ag-row-animation-duration: 0.3s;
  --ag-cell-animation-duration: 0.2s;

  border-radius: 12px;
  overflow: hidden;
  box-shadow:
    0 1px 3px 0 rgba(0, 0, 0, 0.1),
    0 1px 2px 0 rgba(0, 0, 0, 0.06);
}

.ag-theme-quartz .ag-header {
  font-weight: 600;
  border-bottom: 1px solid #e2e8f0;
}

.ag-theme-quartz .ag-header-cell-label {
  font-size: 13px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.ag-theme-quartz .ag-row {
  border-bottom-style: solid;
  border-bottom-width: 1px;
  border-bottom-color: #f1f5f9;
  transition: background-color 0.15s ease;
}

.ag-theme-quartz .ag-row:hover {
  background-color: #f1f5f9;
}

.ag-theme-quartz .ag-row-selected {
  background-color: rgba(56, 189, 248, 0.08);
  border-left: 3px solid #0ea5e9;
}

.ag-theme-quartz .ag-checkbox-input-wrapper {
  border: 2px solid #cbd5e1;
  border-radius: 4px;
  width: 18px;
  height: 18px;
  transition:
    border-color 0.2s ease,
    background-color 0.2s ease;
}

.ag-theme-quartz .ag-checkbox-input-wrapper:hover {
  border-color: #0ea5e9;
}

.ag-theme-quartz .ag-checkbox-input-wrapper.ag-checked {
  background-color: #0ea5e9;
  border-color: #0ea5e9;
}

.ag-theme-quartz .ag-checkbox-input-wrapper.ag-checked::after {
  color: white;
  font-weight: bold;
  font-size: 12px;
}

/* Empty state styling */
.ag-theme-quartz .ag-overlay-no-rows-wrapper {
  background-color: #f8fafc;
  padding: 40px 20px;
  border-radius: 12px;
  text-align: center;
}

.ag-theme-quartz .ag-overlay-no-rows-wrapper .ag-overlay-no-rows-center {
  font-size: 15px;
  color: #64748b;
}

/* Loading overlay */
.ag-theme-quartz .ag-overlay-loading-wrapper {
  background-color: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(4px);
}

/* Animation for row additions/removals */
@keyframes rowFadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.ag-theme-quartz .ag-row-animation {
  animation: rowFadeIn 0.3s ease-out;
}

/* Add this at the beginning of your styles */
.grid-container {
  display: flex;
  flex-direction: column;
  height: 80vh;
  max-height: 800px;
}

.grid-wrapper {
  flex: 1;
  position: relative;
  overflow: hidden;
}

.ag-theme-quartz {
  width: 100%;
  height: 100%;
}
</style>
