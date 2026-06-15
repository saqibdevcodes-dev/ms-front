<script setup lang="ts">
import { ref, computed, watch } from 'vue'

// Define column interface
interface TableColumn {
  key: string | ((item: any) => any)
  label: string
  formatter?: (item: any) => string
  class?: string
  tdClass?: string
  width?: string
  customRender?: boolean
}

// Define props for the component
const props = defineProps({
  data: {
    type: Array,
    required: true,
    default: () => []
  },
  columns: {
    type: Array as () => TableColumn[],
    required: true,
    default: () => []
  },
  title: {
    type: String,
    default: 'Table'
  },
  maxHeight: {
    type: String,
    default: '400px'
  },
  itemsPerPage: {
    type: Number,
    default: 10
  },
  loading: {
    type: Boolean,
    default: false
  },
  noDataMessage: {
    type: String,
    default: 'No data available'
  }
})

// Pagination state
const currentPage = ref(1)
const totalPages = computed(() => Math.ceil(props.data.length / props.itemsPerPage))

// Paginated data
const paginatedData = computed(() => {
  const start = (currentPage.value - 1) * props.itemsPerPage
  const end = start + props.itemsPerPage
  return props.data.slice(start, end)
})

// Method to get cell value based on column key
const getCellValue = (item: any, column: TableColumn) => {
  if (column.formatter) {
    return column.formatter(item)
  }

  if (typeof column.key === 'function') {
    return column.key(item)
  }

  // Use index access with a type assertion
  return item[column.key as keyof typeof item]
}

// Reset pagination when data changes
watch(
  () => props.data.length,
  () => {
    currentPage.value = 1
  }
)

// Methods for pagination
const goToPage = (page: number) => {
  if (page >= 1 && page <= totalPages.value) {
    currentPage.value = page
  }
}

const nextPage = () => {
  if (currentPage.value < totalPages.value) {
    currentPage.value++
  }
}

const prevPage = () => {
  if (currentPage.value > 1) {
    currentPage.value--
  }
}

// Computed property for pages to display in pagination
const paginationPages = computed(() => {
  if (totalPages.value <= 7 || currentPage.value <= 4) {
    // Return numbers from 1 to min(totalPages, 7)
    return Array.from({ length: Math.min(totalPages.value, 7) }, (_, i) => i + 1)
  } else {
    // Return custom array for when we're deep into pagination
    const result = [1] // Always include first page

    // Add ellipsis indicator (using 0 as a marker)
    if (currentPage.value > 5) {
      result.push(0) // 0 is used as an ellipsis marker
    }

    // Add pages around current page
    for (
      let i = Math.max(2, currentPage.value - 1);
      i <= Math.min(totalPages.value - 1, currentPage.value + 1);
      i++
    ) {
      result.push(i)
    }

    // Add ellipsis indicator at the end if needed
    if (currentPage.value < totalPages.value - 4) {
      result.push(0) // 0 is used as an ellipsis marker
    }

    // Always include last page
    result.push(totalPages.value)

    return result
  }
})

// Helper to check if a pagination page is an ellipsis
const isEllipsis = (page: number) => page === 0
</script>

<template>
  <div
    class="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark"
  >
    <!-- Table Header -->
    <div class="py-6 px-4 md:px-6 xl:px-7.5 flex justify-between items-center">
      <h4 class="text-xl font-bold text-black dark:text-white">{{ title }}</h4>

      <!-- Pagination Controls - Top -->
      <div class="flex items-center space-x-2" v-if="totalPages > 1">
        <span class="text-sm text-gray-500 dark:text-gray-400">
          Page {{ currentPage }} of {{ totalPages }}
        </span>
        <div class="flex space-x-1">
          <button
            @click="prevPage"
            :disabled="currentPage === 1"
            class="p-1 rounded hover:bg-gray-100 dark:hover:bg-meta-4 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-5 w-5"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fill-rule="evenodd"
                d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z"
                clip-rule="evenodd"
              />
            </svg>
          </button>
          <button
            @click="nextPage"
            :disabled="currentPage === totalPages"
            class="p-1 rounded hover:bg-gray-100 dark:hover:bg-meta-4 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-5 w-5"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fill-rule="evenodd"
                d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                clip-rule="evenodd"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>

    <!-- Table Container with Fixed Height and Scrolling -->
    <div class="overflow-hidden">
      <div class="overflow-x-auto">
        <div :style="{ maxHeight: maxHeight }" class="overflow-y-auto">
          <table class="w-full table-auto">
            <!-- Table Head -->
            <thead class="bg-gray-2 text-left dark:bg-meta-4 sticky top-0 z-10">
              <tr>
                <th
                  v-for="column in columns"
                  :key="column.key"
                  :class="[
                    'py-4.5 px-4 font-medium text-black dark:text-white',
                    column.class || '',
                    column.width ? `w-${column.width}` : ''
                  ]"
                >
                  {{ column.label }}
                </th>
              </tr>
            </thead>

            <!-- Table Body -->
            <tbody v-if="!loading && paginatedData.length > 0">
              <tr
                v-for="(item, index) in paginatedData"
                :key="index"
                class="border-t border-stroke dark:border-strokedark hover:bg-gray-1 dark:hover:bg-meta-4/30"
              >
                <td
                  v-for="column in columns"
                  :key="`${index}-${column.key}`"
                  :class="[
                    'py-5 px-4 dark:border-strokedark',
                    column.class || '',
                    column.tdClass || ''
                  ]"
                >
                  <!-- Custom Cell Render Function -->
                  <slot
                    v-if="column.customRender"
                    :name="`cell-${column.key}`"
                    :item="item"
                    :column="column"
                    :index="index"
                  ></slot>

                  <!-- Standard Cell Value -->
                  <template v-else>
                    {{ getCellValue(item, column) }}
                  </template>
                </td>
              </tr>
            </tbody>

            <!-- Loading State -->
            <tbody v-else-if="loading">
              <tr>
                <td :colspan="columns.length" class="py-10 text-center">
                  <div class="flex justify-center items-center">
                    <svg
                      class="animate-spin h-6 w-6 text-primary"
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
                    <span class="ml-2">Loading...</span>
                  </div>
                </td>
              </tr>
            </tbody>

            <!-- No Data State -->
            <tbody v-else>
              <tr>
                <td
                  :colspan="columns.length"
                  class="py-10 text-center text-gray-500 dark:text-gray-400"
                >
                  {{ noDataMessage }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Pagination Controls - Bottom -->
    <div
      class="py-4 px-4 md:px-6 xl:px-7.5 flex justify-between items-center border-t border-stroke dark:border-strokedark"
      v-if="totalPages > 1"
    >
      <div class="text-sm text-gray-500 dark:text-gray-400">
        Showing {{ Math.min((currentPage - 1) * itemsPerPage + 1, props.data.length) }} to
        {{ Math.min(currentPage * itemsPerPage, props.data.length) }} of
        {{ props.data.length }} entries
      </div>

      <div class="flex items-center space-x-2">
        <!-- Page Numbers -->
        <div class="flex space-x-1">
          <button
            v-for="page in paginationPages"
            :key="page"
            @click="isEllipsis(page) ? null : goToPage(page)"
            :class="[
              'px-3 py-1 rounded text-sm',
              isEllipsis(page) ? 'cursor-default' : '',
              currentPage === page
                ? 'bg-primary text-white'
                : !isEllipsis(page)
                  ? 'hover:bg-gray-100 dark:hover:bg-meta-4 text-gray-700 dark:text-gray-300'
                  : 'text-gray-700 dark:text-gray-300'
            ]"
            :disabled="isEllipsis(page)"
          >
            {{ isEllipsis(page) ? '...' : page }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Custom scrollbar for webkit browsers */
::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 3px;
}

::-webkit-scrollbar-thumb {
  background: #888;
  border-radius: 3px;
}

::-webkit-scrollbar-thumb:hover {
  background: #555;
}

/* For Firefox */
.overflow-y-auto {
  scrollbar-width: thin;
  scrollbar-color: #888 #f1f1f1;
}

/* Ensure sticky header works correctly */
thead {
  position: sticky;
  top: 0;
  z-index: 10;
}
</style>
