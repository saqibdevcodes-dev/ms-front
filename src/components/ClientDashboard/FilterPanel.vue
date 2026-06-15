<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { ClientFilter } from '@/stores/clientFilter'

const props = defineProps({
  branches: {
    type: Array as () => string[],
    default: () => []
  },
  reportTypes: {
    type: Array as () => string[],
    default: () => []
  }
})

const emit = defineEmits(['filter-applied'])

const clientFilter = ClientFilter()

// Show/hide filter panel
const isExpanded = ref(true)

// Date range picker values
const dateRange = ref({
  startDate: clientFilter.dateRange.startDate,
  endDate: clientFilter.dateRange.endDate
})

// Branch filter values
const selectedBranches = ref<string[]>(clientFilter.selectedBranches)

// Score range slider values
const scoreRange = ref<[number, number]>(clientFilter.scoreRange)

// Report type filter values
const selectedReportTypes = ref<string[]>(clientFilter.selectedReportTypes)

// Search query
const searchQuery = ref<string>(clientFilter.searchQuery)

// Active filters count for badge
const activeFiltersCount = computed((): number => {
  let count = 0
  if (selectedBranches.value.length > 0) count++
  if (selectedReportTypes.value.length > 0) count++
  if (scoreRange.value[0] > 0 || scoreRange.value[1] < 100) count++
  if (searchQuery.value.trim() !== '') count++

  // Check if date range is different from default (last 30 days)
  const defaultStart = new Date()
  defaultStart.setMonth(defaultStart.getMonth() - 1)
  defaultStart.setHours(0, 0, 0, 0)

  const currentStart = new Date(dateRange.value.startDate)
  currentStart.setHours(0, 0, 0, 0)

  const defaultEnd = new Date()
  defaultEnd.setHours(23, 59, 59, 999)

  const currentEnd = new Date(dateRange.value.endDate)
  currentEnd.setHours(23, 59, 59, 999)

  if (
    Math.abs(currentStart.getTime() - defaultStart.getTime()) > 86400000 ||
    Math.abs(currentEnd.getTime() - defaultEnd.getTime()) > 86400000
  ) {
    count++
  }

  return count
})

// Apply filters
const applyFilters = (): void => {
  clientFilter.setDateRange(dateRange.value.startDate, dateRange.value.endDate)
  clientFilter.setSelectedBranches(selectedBranches.value)
  clientFilter.setScoreRange(scoreRange.value[0], scoreRange.value[1])
  clientFilter.setSelectedReportTypes(selectedReportTypes.value)
  clientFilter.setSearchQuery(searchQuery.value)
  emit('filter-applied')
}

// Auto-apply filters on changes
watch(
  [selectedBranches, selectedReportTypes, scoreRange],
  () => {
    applyFilters()
  },
  { deep: true }
)

// Debounced search for better performance
let searchTimeout: number | null = null
watch(searchQuery, () => {
  if (searchTimeout) {
    clearTimeout(searchTimeout)
  }
  searchTimeout = window.setTimeout(() => {
    applyFilters()
  }, 300) as unknown as number
})

// Reset filters
const resetFilters = (): void => {
  clientFilter.resetFilters()
  dateRange.value = {
    startDate: clientFilter.dateRange.startDate,
    endDate: clientFilter.dateRange.endDate
  }
  selectedBranches.value = []
  scoreRange.value = [0, 100]
  selectedReportTypes.value = []
  searchQuery.value = ''
}

// Format date for input
const formatDateForInput = (date: Date): string => {
  if (!date) return ''
  return date.toISOString().split('T')[0]
}

// Update date
const updateStartDate = (e: Event): void => {
  const target = e.target as HTMLInputElement
  dateRange.value.startDate = new Date(target.value)
}

const updateEndDate = (e: Event): void => {
  const target = e.target as HTMLInputElement
  dateRange.value.endDate = new Date(target.value)
}

// Toggle filter panel visibility
const toggleFilterPanel = (): void => {
  isExpanded.value = !isExpanded.value
}

onMounted(() => {
  // Set branches in store
  clientFilter.setBranches(props.branches)
})
</script>

<template>
  <div
    class="bg-white rounded-sm border border-stroke shadow-default dark:border-strokedark dark:bg-boxdark mb-4 transition-all duration-300"
  >
    <!-- Filter Header -->
    <div
      class="p-4 border-b border-stroke dark:border-strokedark flex items-center justify-between cursor-pointer"
      @click="toggleFilterPanel"
    >
      <div class="flex items-center">
        <h4 class="text-xl font-semibold text-black dark:text-white">Filter Reports</h4>
        <div
          v-if="activeFiltersCount > 0"
          class="ml-3 bg-primary text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-medium"
        >
          {{ activeFiltersCount }}
        </div>
      </div>
      <button class="text-gray-500 hover:text-primary transition-colors">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="h-5 w-5 transform transition-transform"
          :class="{ 'rotate-180': !isExpanded }"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>
    </div>

    <!-- Filter Body -->
    <div v-show="isExpanded" class="p-5">
      <div class="grid grid-cols-12 gap-4">
        <!-- Date Range Filter -->
        <div class="col-span-12 md:col-span-6 lg:col-span-3">
          <label class="mb-2.5 block text-sm font-medium text-black dark:text-white"
            >Date Range</label
          >
          <div class="flex flex-col space-y-2">
            <div class="relative">
              <span class="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  class="h-4 w-4"
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
              </span>
              <input
                type="date"
                :value="formatDateForInput(dateRange.startDate)"
                @change="updateStartDate"
                class="w-full rounded border-[1.5px] border-stroke bg-transparent pl-10 px-3 py-2 text-sm text-black outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
              />
            </div>
            <div class="relative">
              <span class="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  class="h-4 w-4"
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
              </span>
              <input
                type="date"
                :value="formatDateForInput(dateRange.endDate)"
                @change="updateEndDate"
                class="w-full rounded border-[1.5px] border-stroke bg-transparent pl-10 px-3 py-2 text-sm text-black outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
              />
            </div>
          </div>
        </div>

        <!-- Branch Filter -->
        <div class="col-span-12 md:col-span-6 lg:col-span-3">
          <label class="mb-2.5 block text-sm font-medium text-black dark:text-white">
            Branch
            <span class="text-xs text-gray-500">({{ selectedBranches.length || 'All' }})</span>
          </label>
          <div class="relative">
            <select
              v-model="selectedBranches"
              multiple
              class="w-full rounded border-[1.5px] border-stroke bg-transparent px-3 py-2 text-sm text-black outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
              size="3"
            >
              <option v-for="branch in props.branches" :key="branch" :value="branch">
                {{ branch }}
              </option>
            </select>
          </div>
        </div>

        <!-- Score Range Filter -->
        <div class="col-span-12 md:col-span-6 lg:col-span-3">
          <label class="mb-2.5 block text-sm font-medium text-black dark:text-white">
            Score Range
            <span class="text-xs text-gray-500">({{ scoreRange[0] }}% - {{ scoreRange[1] }}%)</span>
          </label>
          <div class="px-2 pt-2">
            <div class="relative h-2 rounded-full bg-gray-200 dark:bg-gray-700 mb-4">
              <!-- Track for first slider -->
              <div
                class="absolute h-2 bg-primary rounded-full"
                :style="{ left: scoreRange[0] + '%', width: scoreRange[1] - scoreRange[0] + '%' }"
              ></div>
              <!-- Thumb for min slider -->
              <input
                type="range"
                v-model="scoreRange[0]"
                min="0"
                max="100"
                class="absolute w-full h-2 appearance-none bg-transparent pointer-events-auto cursor-pointer z-10"
                :max="scoreRange[1]"
              />
              <!-- Thumb for max slider -->
              <input
                type="range"
                v-model="scoreRange[1]"
                min="0"
                max="100"
                class="absolute w-full h-2 appearance-none bg-transparent pointer-events-auto cursor-pointer z-10"
                :min="scoreRange[0]"
              />
            </div>
            <div class="flex justify-between text-xs text-gray-500">
              <span>0%</span>
              <span>50%</span>
              <span>100%</span>
            </div>
          </div>
        </div>

        <!-- Report Type Filter -->
        <div class="col-span-12 md:col-span-6 lg:col-span-3">
          <label class="mb-2.5 block text-sm font-medium text-black dark:text-white">
            Report Type
            <span class="text-xs text-gray-500">({{ selectedReportTypes.length || 'All' }})</span>
          </label>
          <div class="space-y-1.5 max-h-24 overflow-y-auto px-1 py-1">
            <div v-for="type in props.reportTypes" :key="type" class="flex items-center">
              <input
                type="checkbox"
                :id="'type-' + type"
                :value="type"
                v-model="selectedReportTypes"
                class="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary focus:ring-1"
              />
              <label :for="'type-' + type" class="ml-2 text-sm text-gray-700 dark:text-gray-300">{{
                type
              }}</label>
            </div>
          </div>
        </div>

        <!-- Search Query -->
        <div class="col-span-12 md:col-span-9">
          <label class="mb-2.5 block text-sm font-medium text-black dark:text-white">Search</label>
          <div class="relative">
            <span class="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="h-4 w-4"
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
            </span>
            <input
              type="text"
              v-model="searchQuery"
              placeholder="Search by branch name or notes..."
              class="w-full rounded border-[1.5px] border-stroke bg-transparent pl-10 px-3 py-2 text-sm text-black outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
            />
            <button
              v-if="searchQuery"
              @click="searchQuery = ''"
              class="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500 hover:text-primary"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>

        <!-- Actions -->
        <div class="col-span-12 md:col-span-3 flex items-end justify-end">
          <button
            @click="resetFilters"
            class="flex items-center justify-center rounded border border-stroke py-2 px-4 text-sm font-medium text-black hover:bg-gray-50 dark:border-strokedark dark:text-white dark:hover:bg-meta-4"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-4 w-4 mr-1.5"
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
            Reset Filters
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Custom slider styling */
input[type='range'] {
  -webkit-appearance: none;
  height: 2px;
  background: transparent;
}

input[type='range']::-webkit-slider-thumb {
  -webkit-appearance: none;
  height: 16px;
  width: 16px;
  border-radius: 50%;
  background: #3b82f6;
  cursor: pointer;
  border: 2px solid white;
  box-shadow: 0 0 0 1px #3b82f6;
}

input[type='range']::-moz-range-thumb {
  height: 16px;
  width: 16px;
  border-radius: 50%;
  background: #3b82f6;
  cursor: pointer;
  border: 2px solid white;
  box-shadow: 0 0 0 1px #3b82f6;
}

/* For checkboxes */
input[type='checkbox'] {
  color-adjust: exact;
  --tw-ring-offset-shadow: 0 0 #0000;
  --tw-ring-shadow: 0 0 #0000;
  border-color: #d1d5db;
}

input[type='checkbox']:checked {
  background-color: #3b82f6;
  border-color: #3b82f6;
}
</style>
