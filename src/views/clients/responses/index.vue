<script setup lang="ts">
import { onMounted, ref, computed, watch } from 'vue'
import DefaultLayout from '@/layouts/DefaultLayout.vue'
import Button from '@/components/Buttons/Button.vue'
import 'ag-grid-community/styles/ag-grid.css'
import 'ag-grid-community/styles/ag-theme-quartz.css'
import { AgGridVue } from 'ag-grid-vue3'
import { useRouter } from 'vue-router'
import { Responses } from '@/stores/responses'
import { Client } from '@/stores/client'
import { Toast } from '@/utils/toast'
import Swal from 'sweetalert2'

const router = useRouter()
const emit = defineEmits(['toggle'])

const rowData: any = computed(() => Responses().responses_data)
const isLoading = computed(() => Responses().loading)
const selectedClient = computed(() => Client().selected_client)

// Check if client is selected
const hasClientSelected = computed(() => {
  return !!selectedClient.value?.uuid
})

// State for row selection
const selectedResponses = ref<any[]>([])
const selectAll = ref(false)

// Reference to store grid API for selection operations
const gridApi = ref<any>(null)

// Function to handle grid ready event to store reference to the API
const onGridReady = (params: any) => {
  gridApi.value = params.api
  params.api.sizeColumnsToFit()
}

// Handle row selection events
const onRowSelected = () => {
  if (gridApi.value) {
    selectedResponses.value = gridApi.value.getSelectedRows()
  }
}

// Toggle select all responses
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

// Bulk delete selected responses
const deleteSelectedResponses = async () => {
  if (selectedResponses.value.length === 0) {
    Toast.warn('No responses selected')
    return
  }

  // Store the count before deletion
  const selectedCount = selectedResponses.value.length

  // Show confirmation dialog
  await Swal.fire({
    title: 'Delete Selected Responses',
    html: `Are you sure you want to delete <strong>${selectedCount}</strong> selected responses? This action cannot be undone.`,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#d33',
    cancelButtonColor: '#3085d6',
    confirmButtonText: 'Yes, delete them',
    cancelButtonText: 'Cancel'
  }).then(async (result) => {
    if (result.isConfirmed) {
      try {
        // Delete each selected response
        for (const response of selectedResponses.value) {
          await Responses().delete_Response(response.uuid)
        }

        // Clear selection
        selectedResponses.value = []
        selectAll.value = false

        // Show success message
        Toast.success(`${selectedCount} responses deleted successfully`)
      } catch (error) {
        console.error('Error deleting responses:', error)
        Toast.error('Failed to delete some responses')
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
    field: 'response',
    headerName: 'Response Name',
    cellStyle: { padding: '16px 8px' },
    cellRenderer: (params: any) => {
      const container = document.createElement('div')
      container.classList.add('flex', 'flex-col', 'gap-1')
      container.style.padding = '4px 0'

      const name = document.createElement('div')
      name.classList.add('text-sm', 'font-medium', 'text-gray-900')
      name.textContent = params.value || 'Unnamed Response'

      container.appendChild(name)
      return container
    }
  },
  {
    field: 'total_score',
    headerName: 'Total Score',
    cellStyle: { padding: '12px 8px' },
    cellRenderer: (params: any) => {
      const container = document.createElement('div')

      const score = document.createElement('span')
      score.classList.add(
        'text-sm',
        'font-medium',
        'inline-flex',
        'items-center',
        'justify-center',
        'px-2.5',
        'py-0.5',
        'rounded-full',
        'bg-blue-100',
        'text-blue-800'
      )
      score.textContent = params.value || '0'

      container.appendChild(score)
      return container
    }
  },
  {
    field: 'operation',
    headerName: 'Operation',
    cellStyle: { padding: '12px 8px' },
    cellRenderer: (params: any) => {
      const operations = {
        '+': 'Add (+)',
        '-': 'Subtract (-)',
        '*': 'Multiply (*)',
        '/': 'Divide (/)'
      }

      const container = document.createElement('div')

      const operation = document.createElement('span')
      operation.classList.add('text-sm', 'font-medium')
      operation.textContent = operations[params.data.operation] || params.data.operation || '+'

      container.appendChild(operation)
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
      editButton.title = 'Edit response'
      editButton.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-4">
          <path stroke-linecap="round" stroke-linejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
        </svg>
      `
      editButton.onclick = () => {
        router.push(`/client/response/edit/${params?.data?.uuid}`)
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
      deleteButton.title = 'Delete response'
      deleteButton.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-4">
          <path stroke-linecap="round" stroke-linejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
        </svg>
      `
      deleteButton.onclick = () => {
        Responses().delete_Response(params?.data?.uuid)
      }

      wrapper.appendChild(editButton)
      wrapper.appendChild(deleteButton)
      return wrapper
    }
  }
])

// Function to fetch responses
const fetchResponses = async () => {
  if (hasClientSelected.value) {
    await Responses().fetch({ forceRefresh: true })
  } else {
    Toast.warn('Please select a client to view responses')
  }
}

// Watch for changes in selected client
watch(
  () => Client().selected_client,
  async (newClient) => {
    if (newClient?.uuid) {
      await fetchResponses()
    }
  },
  { deep: true }
)

// Watch for changes in responses data to refresh the grid
watch(
  () => Responses().responses_data,
  () => {
    if (gridApi.value) {
      gridApi.value.refreshCells({ force: true })
    }
  },
  { deep: true }
)

onMounted(async () => {
  // Initialize the Responses store
  Responses().init()

  // Fetch responses if client is already selected
  await fetchResponses()

  // Set up visibility change handler to refresh data when returning to this tab
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      console.log('Tab became visible in responses view, refreshing data...')
      fetchResponses()
    }
  })
})
</script>

<template>
  <DefaultLayout>
    <div class="flex items-center gap-4 justify-between mb-4">
      <h1 class="text-2xl font-bold">Response Management</h1>

      <!-- Conditional buttons based on selection state -->
      <div v-if="selectedResponses.length > 0" class="flex items-center gap-2">
        <Button
          :type="'button'"
          @onClick="deleteSelectedResponses"
          label="Delete Selected"
          class="bg-red-500 h-10"
          :disabled="!hasClientSelected"
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

      <!-- Default add button when no selection -->
      <Button
        v-else
        @onClick="router.push('/client/response/add')"
        :type="'button'"
        label="Add Response"
        :disabled="!hasClientSelected"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke-width="1.5"
          stroke="currentColor"
          class="size-5 mr-1"
        >
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
      </Button>
    </div>

    <div class="bg-white rounded-lg p-4">
      <div v-if="!hasClientSelected" class="p-4 bg-yellow-100 text-yellow-700 rounded mb-4">
        Please select a client from the dropdown to view and manage responses.
      </div>

      <p class="mb-4 text-gray-700">
        Configure response options and their associated scores. These responses will be available
        for selection in the assessment forms.
      </p>

      <!-- Select All Controls -->
      <div class="flex items-center justify-between mb-4">
        <div class="flex items-center gap-2 ml-2">
          <input
            type="checkbox"
            id="selectAll"
            :checked="selectAll"
            @change="toggleSelectAll"
            class="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
            :disabled="!hasClientSelected"
          />
          <label for="selectAll" class="text-sm font-medium text-gray-700"
            >Select All Responses</label
          >

          <!-- Selection count indicator -->
          <div
            v-if="selectedResponses.length > 0"
            class="bg-blue-50 rounded-md px-3 py-1 text-blue-800 text-xs font-semibold border border-blue-200 inline-flex items-center ml-2"
          >
            {{ selectedResponses.length }} responses selected
          </div>
        </div>
      </div>

      <ag-grid-vue
        :rowData="rowData"
        :columnDefs="colDefs"
        class="ag-theme-quartz response-grid"
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

      <div
        v-if="hasClientSelected && rowData.length === 0 && !isLoading"
        class="text-center py-4 text-gray-500"
      >
        No responses found for this client. Click "Add Response" to create one.
      </div>
    </div>
  </DefaultLayout>
</template>

<style scoped>
.response-grid :deep(.ag-cell) {
  display: flex;
  align-items: center;
}

.response-grid :deep(.ag-header-cell-label) {
  padding: 8px 0;
}

.response-grid :deep(.ag-header-cell) {
  padding: 0 8px;
}

.response-grid :deep(.ag-row) {
  border-bottom: 1px solid #f3f4f6;
}
</style>
