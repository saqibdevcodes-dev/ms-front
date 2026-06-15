<script setup lang="ts" name="ReportsTemplateIndex">
import { onMounted, ref, watch, computed } from 'vue'
import DefaultLayout from '@/layouts/DefaultLayout.vue'

import 'ag-grid-community/styles/ag-grid.css'
import 'ag-grid-community/styles/ag-theme-quartz.css'

import { AgGridVue } from 'ag-grid-vue3'
import { Client } from '@/stores/client'
import { Templates } from '@/stores/templates'

import Button from '@/components/Buttons/Button.vue'
import Modal from '@/components/modal/modal.vue'
import RefreshButton from '@/components/RefreshButton.vue'
import LoadingIndicator from '@/components/LoadingIndicator.vue'

import DatePicker from 'primevue/datepicker'
import FloatLabel from 'primevue/floatlabel'

import InputText from 'primevue/inputtext'
import InputGroup from 'primevue/inputgroup'
import InputGroupAddon from 'primevue/inputgroupaddon'

import router from '@/router'
import { Auth } from '@/stores/auth'
import Swal from 'sweetalert2'
import { Toast } from '@/utils/toast'

const date = ref()

const pushMediaRouter = (uuid: any) => {
  router.push('/client/report/media/' + uuid)
}

// Define type for the grid API
interface GridApi {
  setFilterModel: (model: any) => void
  sizeColumnsToFit: () => void
}

// Fix type for templates
interface Template {
  id: string
  template_name: string
  branch_code: string
  created_at: string
  updated_at: string
}

// Grid API reference with proper typing
const gridApi = ref<GridApi | null>(null)

// Define row data with proper type
const rowData = ref<Template[]>([])

const dateFilterComparator = (filterLocalDateAtMidnight: Date, cellValue: string) => {
  const dateAsString = cellValue
  if (dateAsString == null) return -1

  // Parse the date
  const cellDate = new Date(dateAsString)

  if (filterLocalDateAtMidnight.getTime() === cellDate.getTime()) {
    return 0
  }
  if (cellDate < filterLocalDateAtMidnight) {
    return -1
  }
  if (cellDate > filterLocalDateAtMidnight) {
    return 1
  }
  return 0
}

const colDefs = ref([
  {
    field: 'template_name',
    headerName: 'Template Name',
    filter: 'agTextColumnFilter',
    filterParams: {
      buttons: ['reset', 'apply'],
      debounceMs: 200
    },
    cellStyle: { padding: '16px 8px' },
    cellRenderer: (params: any) => {
      const container = document.createElement('div')
      container.classList.add('flex', 'flex-col', 'gap-1')
      container.style.padding = '4px 0'

      const name = document.createElement('div')
      name.classList.add('text-sm', 'font-medium', 'text-gray-900')
      name.textContent = params.value || 'Unnamed Template'

      container.appendChild(name)
      return container
    }
  },

  {
    field: 'created_at',
    headerName: 'Created Date',
    filter: 'agDateColumnFilter',
    filterParams: {
      buttons: ['reset', 'apply'],
      comparator: dateFilterComparator
    },
    cellRenderer: (params: any) => {
      if (!params.value) return 'N/A'

      const container = document.createElement('div')
      container.classList.add('flex', 'flex-col', 'gap-1')
      container.style.padding = '4px 0'

      // Format date
      const formattedDate = new Date(params.value).toLocaleDateString()

      // Primary date text
      const dateText = document.createElement('span')
      dateText.classList.add('text-sm', 'font-medium', 'text-gray-700')
      dateText.textContent = formattedDate

      // Add relative time indicator
      const now = new Date()
      const date = new Date(params.value)
      const diffTime = Math.abs(now.getTime() - date.getTime())
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))

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
  },
  {
    field: 'updated_at',
    headerName: 'Last Updated',
    filter: 'agDateColumnFilter',
    filterParams: {
      buttons: ['reset', 'apply'],
      comparator: dateFilterComparator
    },
    cellRenderer: (params: any) => {
      if (!params.value) return 'N/A'

      const container = document.createElement('div')
      container.classList.add('flex', 'flex-col', 'gap-1')
      container.style.padding = '4px 0'

      // Format date
      const formattedDate = new Date(params.value).toLocaleDateString()

      // Primary date text
      const dateText = document.createElement('span')
      dateText.classList.add('text-sm', 'font-medium', 'text-gray-700')
      dateText.textContent = formattedDate

      // Add relative time indicator
      const now = new Date()
      const date = new Date(params.value)
      const diffTime = Math.abs(now.getTime() - date.getTime())
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))

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
  },
  {
    field: 'actions',
    headerName: 'Actions',
    filter: false,
    minWidth: 100,
    maxWidth: 120,
    cellRenderer: (params: { data: { id: string } }) => {
      const wrapper = document.createElement('div')
      wrapper.classList.add('flex', 'items-center', 'justify-center', 'gap-3', 'h-full')

      // Delete Button
      const deleteButton = document.createElement('button')
      deleteButton.type = 'button'
      deleteButton.classList.add(
        'bg-red-500',
        'text-white',
        'rounded',
        'px-3',
        'py-1.5',
        'flex',
        'items-center',
        'gap-1'
      )
      deleteButton.title = 'Delete template'
      deleteButton.setAttribute('data-action', 'delete')
      deleteButton.setAttribute('data-id', params.data.id)

      // Create SVG icon
      const iconSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
      iconSvg.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
      iconSvg.setAttribute('fill', 'none')
      iconSvg.setAttribute('viewBox', '0 0 24 24')
      iconSvg.setAttribute('stroke-width', '1.5')
      iconSvg.setAttribute('stroke', 'currentColor')
      iconSvg.setAttribute('class', 'w-4 h-4')

      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
      path.setAttribute('stroke-linecap', 'round')
      path.setAttribute('stroke-linejoin', 'round')
      path.setAttribute(
        'd',
        'm14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0'
      )

      iconSvg.appendChild(path)

      // Create text span
      const textSpan = document.createElement('span')
      textSpan.textContent = 'Delete'
      textSpan.classList.add('text-xs', 'font-medium')

      // Add icon and text to button
      deleteButton.appendChild(iconSvg)
      deleteButton.appendChild(textSpan)

      wrapper.appendChild(deleteButton)

      return wrapper
    }
  }
])

const toggleCrsModal = ref(false)
const crsName = ref('')
const search = ref('')
const start_date = ref(new Date())
const end_date = ref(new Date())

// Function to clear all filters
const clearFilters = () => {
  if (gridApi.value) {
    gridApi.value.setFilterModel(null)
  }
}

const createCRS = (e: any) => {
  e.preventDefault()
  console.log(crsName.value)
}

// Function to handle grid actions
const onGridReady = (params: { api: any }) => {
  // Store grid API reference
  gridApi.value = params.api

  params.api.sizeColumnsToFit()

  // Add event listener for action buttons
  const gridDiv = document.querySelector('.ag-theme-quartz')
  if (gridDiv) {
    gridDiv.addEventListener('click', (event: Event) => {
      const target = (event.target as HTMLElement)?.closest('button[data-action]')
      if (!target) return

      const action = target.getAttribute('data-action')
      const id = target.getAttribute('data-id')

      if (action === 'edit') {
        router.push(`/client/reports-template/add?template=${id}`)
      } else if (action === 'delete') {
        // Show a beautiful confirmation dialog
        Swal.fire({
          title: 'Delete Template',
          text: 'Are you sure you want to delete this template? This action cannot be undone.',
          icon: 'warning',
          showCancelButton: true,
          confirmButtonColor: '#d33',
          cancelButtonColor: '#3085d6',
          confirmButtonText: 'Yes, delete it!',
          cancelButtonText: 'Cancel'
        }).then((result) => {
          if (result.isConfirmed) {
            Templates()
              .deleteTemplate(id)
              .then(() => {
                // Refresh the grid data after deletion
                rowData.value = Templates().templates

                // Show success message
                Swal.fire('Deleted!', 'Template has been deleted successfully.', 'success')
              })
              .catch((error) => {
                // Show error message if deletion fails
                Swal.fire(
                  'Error!',
                  `Failed to delete template: ${error.message || 'Unknown error'}`,
                  'error'
                )
              })
          }
        })
      }
    })
  }
}

// Add pagination variables
const limit = ref(20)

// Update the mounted hook to better handle the response
onMounted(async () => {
  try {
    // Initialize stores
    await Client().init()

    // Initial templates fetch with force refresh
    await refreshTemplates()
  } catch (error) {
    console.error('Error loading templates:', error)
  }
})

// Update rowData when templates change
watch(
  () => Templates().templates,
  (newTemplates) => {
    rowData.value = newTemplates
  },
  { immediate: true }
)

// Function to handle limit change
const onLimitChange = () => {
  Templates().changeLimit(limit.value)
}

// Computed property to determine which page numbers to show
const pageNumbers = computed(() => {
  const totalPages = Templates().pagination.totalPages
  const currentPage = Templates().pagination.page

  // Always show at most 5 page numbers
  const pages = []

  if (totalPages <= 5) {
    // If 5 or fewer pages, show all
    for (let i = 1; i <= totalPages; i++) {
      pages.push(i)
    }
  } else {
    // Always include first and last page
    if (currentPage <= 3) {
      // Near the start
      for (let i = 1; i <= 5; i++) {
        pages.push(i)
      }
    } else if (currentPage >= totalPages - 2) {
      // Near the end
      for (let i = totalPages - 4; i <= totalPages; i++) {
        pages.push(i)
      }
    } else {
      // In the middle
      for (let i = currentPage - 2; i <= currentPage + 2; i++) {
        pages.push(i)
      }
    }
  }

  return pages
})

const isRefreshing = ref(false)

const refreshTemplates = async () => {
  try {
    isRefreshing.value = true
    // Force refresh templates data
    await Templates().fetch(Templates().pagination.page, Templates().pagination.limit, {
      forceRefresh: true
    })
    Toast.success('Templates refreshed successfully')
  } catch (error) {
    console.error('Error refreshing templates:', error)
    Toast.error('Failed to refresh templates')
  } finally {
    isRefreshing.value = false
  }
}

// Add template creation method
const create_template = () => {
  // Navigate to template creation page
  router.push('/client/reports-template/add')
}
</script>

<template>
  <DefaultLayout>
    <!-- Header Section with Background -->
    <div class="p-6 rounded-xl mb-6">
      <div class="flex flex-col md:flex-row md:items-center justify-between w-full">
        <div class="mb-4 md:mb-0">
          <h1 class="text-2xl font-bold text-gray-900 flex items-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-6 w-6 mr-2 text-blue-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              stroke-width="2"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            Reports Templates
          </h1>
          <p class="text-gray-600 mt-1">Manage your assessment report templates</p>
        </div>

        <div class="flex items-center gap-3">
          <!-- Refresh button with animated icon -->
          <RefreshButton
            :refreshFunction="refreshTemplates"
            buttonText="Refresh"
            successMessage="Templates refreshed successfully"
            errorMessage="Failed to refresh templates"
            class="bg-black-2 border border-gray-300 text-gray-700 hover:bg-gray-50"
          />

          <Button
            v-if="Auth().isAdmin() || Auth().isReportingUser()"
            :type="'button'"
            @click="create_template"
            class="bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-all duration-200 hover:shadow"
          >
            <span class="mr-1 font-bold text-xl">+</span> Add Template
          </Button>
        </div>
      </div>

      <!-- Stats Cards -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
        <div class="bg-white rounded-lg shadow-sm p-4 border border-gray-100 flex items-center">
          <div class="rounded-full bg-blue-100 p-3 mr-4">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-6 w-6 text-blue-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
          </div>
          <div>
            <p class="text-gray-500 text-sm">Total Templates</p>
            <p class="text-2xl font-bold text-gray-800">{{ Templates().pagination.total || 0 }}</p>
          </div>
        </div>

        <div class="bg-white rounded-lg shadow-sm p-4 border border-gray-100 flex items-center">
          <div class="rounded-full bg-green-100 p-3 mr-4">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-6 w-6 text-green-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </div>
          <div>
            <p class="text-gray-500 text-sm">Recent Templates</p>
            <p class="text-2xl font-bold text-gray-800">
              {{
                rowData.filter(
                  (t) => new Date(t.created_at) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
                ).length
              }}
            </p>
          </div>
        </div>

        <div class="bg-white rounded-lg shadow-sm p-4 border border-gray-100 flex items-center">
          <div class="rounded-full bg-purple-100 p-3 mr-4">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-6 w-6 text-purple-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M9 12h6m-6 4h6m-6-8h6M5 5h14a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2z"
              />
            </svg>
          </div>
          <div>
            <p class="text-gray-500 text-sm">Template Pages</p>
            <p class="text-2xl font-bold text-gray-800">
              {{ Templates().pagination.totalPages || 0 }}
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- Loading indicator -->
    <LoadingIndicator :loading="Templates().loading" text="Loading templates..." :overlay="true" />

    <!-- Show grid only when not loading or if there are templates to display -->
    <div
      v-if="!Templates().loading || rowData.length > 0"
      class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden"
    >
      <!-- Search and filter section -->
      <div class="p-4 border-b border-gray-100 bg-gray-50">
        <div class="flex flex-wrap items-center gap-4">
          <div class="relative flex-grow max-w-md">
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
            <input
              type="text"
              class="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="Search templates..."
              v-model="search"
            />
          </div>

          <button
            @click="clearFilters"
            class="px-4 py-2 border border-gray-300 rounded-md text-sm text-gray-700 bg-white hover:bg-gray-50"
          >
            Clear Filters
          </button>
        </div>
      </div>

      <ag-grid-vue
        :rowData="rowData"
        :columnDefs="colDefs"
        class="ag-theme-quartz template-grid"
        style="height: 500px"
        :loading="Templates().loading"
        @grid-ready="onGridReady"
        @grid-size-changed="(params: any) => params.api.sizeColumnsToFit()"
        :defaultColDef="{
          flex: 1,
          minWidth: 100,
          sortable: true,
          resizable: true,
          floatingFilter: true,
          filter: true,
          cellStyle: { padding: '12px 8px' }
        }"
        :pagination="false"
        :enableCellTextSelection="true"
        domLayout="autoHeight"
        rowHeight="70"
      >
      </ag-grid-vue>

      <!-- Custom Server-side Pagination -->
      <div
        class="p-4 flex flex-col sm:flex-row sm:items-center justify-between bg-gray-50 border-t border-gray-200"
      >
        <div class="flex items-center gap-2 mb-3 sm:mb-0">
          <span class="text-sm text-gray-600">
            Showing {{ rowData.length }} of {{ Templates().pagination.total }} templates
          </span>
          <select
            v-model="limit"
            @change="onLimitChange"
            class="border border-gray-300 rounded-md px-2 py-1 text-sm bg-white shadow-sm focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="10">10 per page</option>
            <option value="20">20 per page</option>
            <option value="50">50 per page</option>
            <option value="100">100 per page</option>
          </select>
        </div>

        <div class="flex items-center gap-1">
          <button
            @click="Templates().prevPage()"
            :disabled="Templates().pagination.page <= 1"
            :class="[
              'px-3 py-1 rounded-md border text-sm',
              Templates().pagination.page <= 1
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-white text-gray-700 hover:bg-gray-50 shadow-sm'
            ]"
          >
            <span class="flex items-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="h-4 w-4 mr-1"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M15 19l-7-7 7-7"
                />
              </svg>
              Previous
            </span>
          </button>

          <div class="hidden md:flex items-center">
            <template v-for="p in pageNumbers" :key="p">
              <button
                @click="Templates().goToPage(p)"
                :class="[
                  'w-8 h-8 rounded-md flex items-center justify-center text-sm mx-0.5',
                  Templates().pagination.page === p
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-gray-700 hover:bg-gray-100 border'
                ]"
              >
                {{ p }}
              </button>
            </template>
          </div>

          <div class="flex md:hidden items-center">
            <span class="text-sm text-gray-600 px-2">
              Page {{ Templates().pagination.page }} of {{ Templates().pagination.totalPages }}
            </span>
          </div>

          <button
            @click="Templates().nextPage()"
            :disabled="Templates().pagination.page >= Templates().pagination.totalPages"
            :class="[
              'px-3 py-1 rounded-md border text-sm',
              Templates().pagination.page >= Templates().pagination.totalPages
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-white text-gray-700 hover:bg-gray-50 shadow-sm'
            ]"
          >
            <span class="flex items-center">
              Next
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="h-4 w-4 ml-1"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </span>
          </button>
        </div>
      </div>
    </div>

    <!-- Empty state -->
    <div
      v-else-if="!Templates().loading && rowData.length === 0"
      class="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center"
    >
      <div class="mx-auto w-24 h-24 rounded-full bg-blue-50 flex items-center justify-center mb-4">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="h-12 w-12 text-blue-500"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
      </div>
      <h3 class="text-xl font-medium text-gray-900 mb-2">No templates found</h3>
      <p class="text-gray-500 mb-6">Get started by creating your first report template</p>
      <Button
        v-if="Auth().isAdmin() || Auth().isReportingUser()"
        :type="'button'"
        @click="create_template"
        class="bg-blue-600 hover:bg-blue-700 text-white"
      >
        <span class="mr-1 font-bold text-xl">+</span> Add Template
      </Button>
    </div>
  </DefaultLayout>
</template>

<style scoped>
.template-grid :deep(.ag-cell) {
  display: flex;
  align-items: center;
}

.template-grid :deep(.ag-header-cell-label) {
  padding: 8px 0;
}

.template-grid :deep(.ag-header-cell) {
  padding: 0 8px;
  font-weight: 600;
}

.template-grid :deep(.ag-header-row) {
  background-color: #f9fafb;
  border-bottom: 2px solid #e5e7eb;
}

.template-grid :deep(.ag-row) {
  border-bottom: 1px solid #f3f4f6;
  transition: background-color 0.2s;
}

.template-grid :deep(.ag-row:hover) {
  background-color: #f9fafb;
}

.template-grid :deep(.ag-row-selected) {
  background-color: rgba(59, 130, 246, 0.05);
}

.template-grid :deep(.ag-row-selected:hover) {
  background-color: rgba(59, 130, 246, 0.1);
}

/* Add some custom styling to the filters */
.template-grid :deep(.ag-floating-filter) {
  margin-top: 8px;
}

.template-grid :deep(.ag-floating-filter-input) {
  padding: 4px 8px;
  border-radius: 4px;
  border: 1px solid #e5e7eb;
}

.template-grid :deep(.ag-floating-filter-button) {
  margin-left: 4px;
}

/* Style the cell renderers for delete buttons */
.template-grid :deep(button[data-action='delete']) {
  transition: all 0.2s;
}

.template-grid :deep(button[data-action='delete']:hover) {
  background-color: #ef4444;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}
</style>
