<script setup lang="ts">
import { onMounted, ref, computed, watch } from 'vue'

import DefaultLayout from '@/layouts/DefaultLayout.vue'
import Button from '@/components/Buttons/Button.vue'

import 'ag-grid-community/styles/ag-grid.css'
import 'ag-grid-community/styles/ag-theme-quartz.css'

import { AgGridVue } from 'ag-grid-vue3'
import { useRoute, useRouter } from 'vue-router'

import { Ranges } from '@/stores/ranges'
import { Client } from '@/stores/client'
import { Toast } from '@/utils/toast'
import Swal from 'sweetalert2'

const router = useRouter()
const emit = defineEmits(['toggle'])

const rowData = computed(() => Ranges().ranges_data)
const selectedClient = computed(() => Client().selected_client)
const isLoading = computed(() => Ranges().loading)

// Check if client is selected
const hasClientSelected = computed(() => {
  return !!selectedClient.value?.uuid
})

// State for row selection
const selectedRanges = ref<any[]>([])
const selectAll = ref(false)

// Reference to store grid API
const gridApi = ref<any>(null)

// Function to handle grid ready event
const onGridReady = (params: any) => {
  gridApi.value = params.api
  params.api.sizeColumnsToFit()
}

// Handle row selection events
const onRowSelected = () => {
  if (gridApi.value) {
    selectedRanges.value = gridApi.value.getSelectedRows()
  }
}

// Toggle select all ranges
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

// Bulk delete selected ranges
const deleteSelectedRanges = async () => {
  if (selectedRanges.value.length === 0) {
    Toast.warn('No percentage ranges selected')
    return
  }

  // Store the count before deletion
  const selectedCount = selectedRanges.value.length

  // Show confirmation dialog
  await Swal.fire({
    title: 'Delete Selected Ranges',
    html: `Are you sure you want to delete <strong>${selectedCount}</strong> selected percentage ranges? This action cannot be undone.`,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#d33',
    cancelButtonColor: '#3085d6',
    confirmButtonText: 'Yes, delete them',
    cancelButtonText: 'Cancel'
  }).then(async (result) => {
    if (result.isConfirmed) {
      try {
        // Delete each selected range
        for (const range of selectedRanges.value) {
          await Ranges().delete_range(range.uuid)
        }

        // Clear selection
        selectedRanges.value = []
        selectAll.value = false

        // Show success message
        Toast.success(`${selectedCount} percentage ranges deleted successfully`)
      } catch (error) {
        console.error('Error deleting ranges:', error)
        Toast.error('Failed to delete some percentage ranges')
      }
    }
  })
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
    field: 'rating',
    headerName: 'Rating',
    cellStyle: { padding: '16px 8px' },
    cellRenderer: (params: any) => {
      const container = document.createElement('div')
      container.classList.add('flex', 'flex-col', 'gap-1')
      container.style.padding = '4px 0'

      const rating = document.createElement('div')
      rating.classList.add('text-sm', 'font-medium', 'text-gray-900')
      rating.textContent = params.value || 'Unnamed Rating'

      container.appendChild(rating)
      return container
    }
  },
  {
    field: 'start',
    headerName: 'Start Range',
    cellStyle: { padding: '12px 8px' },
    cellRenderer: (params: any) => {
      const container = document.createElement('div')

      const value = document.createElement('span')
      value.classList.add(
        'text-sm',
        'font-medium',
        'inline-flex',
        'items-center',
        'justify-center',
        'px-2.5',
        'py-0.5',
        'rounded-full',
        'bg-gray-100',
        'text-gray-800'
      )
      value.textContent = params.value || '0'

      container.appendChild(value)
      return container
    }
  },
  {
    field: 'end',
    headerName: 'End Range',
    cellStyle: { padding: '12px 8px' },
    cellRenderer: (params: any) => {
      const container = document.createElement('div')

      const value = document.createElement('span')
      value.classList.add(
        'text-sm',
        'font-medium',
        'inline-flex',
        'items-center',
        'justify-center',
        'px-2.5',
        'py-0.5',
        'rounded-full',
        'bg-gray-100',
        'text-gray-800'
      )
      value.textContent = params.value || '0'

      container.appendChild(value)
      return container
    }
  },
  {
    field: 'color',
    headerName: 'Color',
    cellStyle: { padding: '12px 8px' },
    cellRenderer: (params: any) => {
      const container = document.createElement('div')
      container.classList.add('flex', 'items-center', 'gap-2')

      const colorBox = document.createElement('div')
      colorBox.classList.add('w-6', 'h-6', 'rounded', 'border', 'border-gray-200')
      colorBox.style.backgroundColor = params.value || '#FFFFFF'

      container.appendChild(colorBox)
      return container
    }
  },
  {
    field: 'color',
    headerName: 'Color Code',
    cellStyle: { padding: '12px 8px' },
    cellRenderer: (params: any) => {
      const container = document.createElement('div')

      const code = document.createElement('span')
      code.classList.add('text-sm', 'font-mono', 'bg-gray-100', 'px-2', 'py-1', 'rounded')
      code.textContent = params.value || '#FFFFFF'

      container.appendChild(code)
      return container
    }
  },
  {
    field: 'created_at',
    headerName: 'Created Date',
    cellStyle: { padding: '12px 8px' },
    cellRenderer: (params: any) => {
      if (!params.data?.created_at) return 'N/A'

      const container = document.createElement('div')
      container.classList.add('flex', 'flex-col', 'gap-1')
      container.style.padding = '4px 0'

      // Format date
      const formattedDate = new Date(params.data.created_at).toLocaleDateString()

      // Primary date text
      const dateText = document.createElement('span')
      dateText.classList.add('text-sm', 'font-medium', 'text-gray-700')
      dateText.textContent = formattedDate

      // Add relative time indicator
      const now = new Date()
      const date = new Date(params.data.created_at)
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
    minWidth: 120,
    maxWidth: 120,
    cellRenderer: (params: any) => {
      const wrapper = document.createElement('div')
      wrapper.classList.add('flex', 'items-center', 'justify-center', 'gap-3', 'h-full')

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
      editButton.title = 'Edit range'
      editButton.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-4">
          <path stroke-linecap="round" stroke-linejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
        </svg>
      `
      editButton.onclick = () => {
        router.push(`/client/percentage-range/edit/${params.data.uuid}`)
      }

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
      deleteButton.title = 'Delete range'
      deleteButton.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-4">
          <path stroke-linecap="round" stroke-linejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
        </svg>
      `
      deleteButton.onclick = () => {
        Ranges().delete_range(params.data.uuid)
      }

      wrapper.appendChild(editButton)
      wrapper.appendChild(deleteButton)
      return wrapper
    }
  }
])

// Watch for client selection changes
watch(
  () => Client().selected_client,
  async (newClient, oldClient) => {
    if (newClient?.uuid && (!oldClient || newClient.uuid !== oldClient.uuid)) {
      // Ensure store is initialized before fetching
      if (!Ranges().xios || !Ranges().xios.get) {
        await Ranges().init()
      }
      await Ranges().fetch({ forceRefresh: true })
    }
  },
  { deep: true }
)

// Watch for changes in ranges data to refresh the grid
watch(
  () => Ranges().ranges_data,
  () => {
    if (gridApi.value) {
      gridApi.value.refreshCells({ force: true })
    }
  },
  { deep: true }
)

onMounted(async () => {
  // Only fetch if client is selected
  if (hasClientSelected.value) {
    // Initialize ranges store first
    await Ranges().init()
    await Ranges().fetch({ forceRefresh: true })
  }

  // Set up visibility change handler to refresh data when returning to this tab
  document.addEventListener('visibilitychange', async () => {
    if (document.visibilityState === 'visible' && hasClientSelected.value) {
      console.log('Tab became visible in ranges view, refreshing data...')
      // Ensure store is initialized before fetching
      if (!Ranges().xios || !Ranges().xios.get) {
        await Ranges().init()
      }
      await Ranges().fetch({ forceRefresh: true })
    }
  })
})
</script>

<template>
  <DefaultLayout>
    <div
      v-if="!hasClientSelected"
      class="flex flex-col items-center justify-center my-12 text-center"
    >
      <div class="text-gray-500 mb-4">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke-width="1.5"
          stroke="currentColor"
          class="w-16 h-16 mx-auto mb-4"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z"
          />
        </svg>
      </div>
      <h3 class="text-xl font-medium text-gray-700">No Client Selected</h3>
      <p class="text-gray-500 mt-2">Please select a client to view and manage percentage ranges.</p>
    </div>

    <div v-else>
      <div class="flex items-center gap-4 justify-between mb-4">
        <!-- Conditional buttons based on selection state -->
        <div v-if="selectedRanges.length > 0" class="flex items-center gap-2">
          <Button
            :type="'button'"
            @onClick="deleteSelectedRanges"
            label="Delete Selected"
            class="bg-red-500 h-10"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke-width="1.5"
              stroke="currentColor"
              class="size-5 mr-1"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"
              />
            </svg>
          </Button>
        </div>

        <Button
          v-if="selectedRanges.length === 0"
          @onClick="router.push('/client/percentage-range/add')"
          :type="'button'"
          label="Add Ranges"
        >
        </Button>
      </div>

      <!-- Select All Controls -->
      <div class="flex items-center justify-between mb-4">
        <div class="flex items-center gap-2 ml-2">
          <input
            type="checkbox"
            id="selectAll"
            :checked="selectAll"
            @change="toggleSelectAll"
            class="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
          />
          <label for="selectAll" class="text-sm font-medium text-gray-700">Select All Ranges</label>

          <!-- Selection count indicator -->
          <div
            v-if="selectedRanges.length > 0"
            class="bg-blue-50 rounded-md px-3 py-1 text-blue-800 text-xs font-semibold border border-blue-200 inline-flex items-center ml-2"
          >
            {{ selectedRanges.length }} ranges selected
          </div>
        </div>
      </div>

      <div class="">
        <ag-grid-vue
          :rowData="rowData"
          :columnDefs="colDefs"
          class="ag-theme-quartz ranges-grid"
          style="height: 50vh; width: 100%"
          :loading="isLoading"
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
          :pagination="true"
          :paginationPageSize="10"
          domLayout="autoHeight"
          rowHeight="70"
          @row-selected="onRowSelected"
          rowSelection="multiple"
          suppressRowClickSelection="true"
        >
        </ag-grid-vue>

        <!-- Empty state message -->
        <div v-if="rowData.length === 0 && !isLoading" class="text-center py-4 text-gray-500">
          No percentage ranges found. Click "Add Ranges" to create some.
        </div>
      </div>
    </div>
  </DefaultLayout>
</template>

<style scoped>
.ranges-grid :deep(.ag-cell) {
  display: flex;
  align-items: center;
}

.ranges-grid :deep(.ag-header-cell-label) {
  padding: 8px 0;
}

.ranges-grid :deep(.ag-header-cell) {
  padding: 0 8px;
}

.ranges-grid :deep(.ag-row) {
  border-bottom: 1px solid #f3f4f6;
}
</style>
