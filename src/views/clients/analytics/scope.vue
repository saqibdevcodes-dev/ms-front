<script setup lang="ts">
import { onMounted, ref, computed, watch } from 'vue'
import DefaultLayout from '@/layouts/DefaultLayout.vue'
import ChartOne from '@/components/Charts/ChartOne.vue'
import Radial from '@/components/Charts/radial.vue'
import BreadcrumbDefault from '@/components/Breadcrumbs/BreadcrumbDefault.vue'
import Select from 'primevue/select'
import Dropdown from 'primevue/dropdown'
import Button from '@/components/Buttons/Button.vue'
import { Analytics } from '@/stores/analytics'
import { Client } from '@/stores/client'
import VueApexCharts from 'vue3-apexcharts'
import Card from 'primevue/card'
import SkeletonLoader from '@/components/Loaders/SkeletonLoader.vue'
import Table from 'primevue/datatable'
import Column from 'primevue/column'

// Page state
const pageTitle = ref('Scope Analytics')
const analytics = computed(() => Analytics())
const client = computed(() => Client())
const selectedScope = ref('')
const selectedYear = ref(new Date().getFullYear().toString())
const isLoading = ref(true)
const scopeData = ref({
  labels: [],
  datasets: [],
  tableData: []
})

// Chart options
const lineChartOptions = computed(() => ({
  chart: {
    height: 350,
    type: 'line',
    toolbar: {
      show: false
    }
  },
  colors: ['#4F46E5', '#EC4899', '#10B981'],
  stroke: {
    width: 3,
    curve: 'smooth'
  },
  xaxis: {
    categories: scopeData.value.labels,
    axisBorder: {
      show: false
    },
    axisTicks: {
      show: false
    }
  },
  yaxis: {
    title: {
      text: 'Score (%)'
    },
    min: 0,
    max: 100
  },
  tooltip: {
    y: {
      formatter: (val) => `${val}%`
    }
  },
  grid: {
    borderColor: '#f1f5f9',
    row: {
      colors: ['#ffffff', '#f8fafc'],
      opacity: 1
    }
  },
  markers: {
    size: 4,
    colors: ['#4F46E5', '#EC4899', '#10B981'],
    strokeColors: '#ffffff',
    strokeWidth: 2,
    hover: {
      size: 6
    }
  },
  legend: {
    position: 'top',
    horizontalAlign: 'right'
  }
}))

const radarChartOptions = computed(() => ({
  chart: {
    height: 350,
    type: 'radar',
    toolbar: {
      show: false
    }
  },
  series: [
    {
      name: 'Branch Level',
      data: [85, 75, 80, 92, 88, 70]
    },
    {
      name: 'Region Level',
      data: [80, 70, 75, 88, 84, 65]
    }
  ],
  colors: ['#4F46E5', '#EC4899'],
  labels: [
    'Customer Service',
    'Cleanliness',
    'Product Knowledge',
    'Staff Courtesy',
    'Issue Resolution',
    'Wait Time'
  ],
  plotOptions: {
    radar: {
      polygons: {
        strokeColors: '#e2e8f0',
        fill: {
          colors: ['#f8fafc', '#ffffff']
        }
      }
    }
  },
  markers: {
    size: 4,
    colors: ['#4F46E5', '#EC4899'],
    strokeColors: '#ffffff',
    strokeWidth: 2
  },
  tooltip: {
    y: {
      formatter: (val) => `${val}%`
    }
  }
}))

// Data loading and filtering
onMounted(async () => {
  await loadData()
})

const loadData = async () => {
  isLoading.value = true

  try {
    // In a real implementation, this would fetch data from the API
    // For now, use mock data
    // await analytics.value.fetchScopeAnalytics(selectedScope.value, selectedYear.value)

    // Simulate API call delay
    await new Promise((resolve) => setTimeout(resolve, 1000))

    // Mock data
    scopeData.value = {
      labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
      datasets: [
        {
          label: 'Branch Level',
          data: [65, 72, 68, 75, 80, 82, 78, 85, 88, 90, 87, 92],
          borderColor: '#4F46E5',
          backgroundColor: 'rgba(79, 70, 229, 0.1)'
        },
        {
          label: 'Region Level',
          data: [60, 65, 70, 72, 75, 78, 80, 82, 85, 87, 88, 90],
          borderColor: '#EC4899',
          backgroundColor: 'rgba(236, 72, 153, 0.1)'
        },
        {
          label: 'Country Level',
          data: [55, 60, 63, 68, 70, 72, 75, 78, 80, 82, 85, 88],
          borderColor: '#10B981',
          backgroundColor: 'rgba(16, 185, 129, 0.1)'
        }
      ],
      tableData: [
        { scope: 'Branch A', score: 92, change: '+3%', status: 'improved' },
        { scope: 'Branch B', score: 88, change: '+1%', status: 'stable' },
        { scope: 'Branch C', score: 65, change: '-5%', status: 'declined' },
        { scope: 'Region North', score: 85, change: '+2%', status: 'improved' },
        { scope: 'Region South', score: 78, change: '+0%', status: 'stable' }
      ]
    }
  } catch (error) {
    console.error('Error loading scope analytics data', error)
  } finally {
    isLoading.value = false
  }
}

// Watch for filter changes
watch([selectedScope, selectedYear], async () => {
  await loadData()
})

// Refresh data
const refreshData = async () => {
  await loadData()
}

// Custom styling for status badges
const getStatusClass = (status) => {
  switch (status) {
    case 'improved':
      return 'bg-green-100 text-green-800'
    case 'stable':
      return 'bg-blue-100 text-blue-800'
    case 'declined':
      return 'bg-red-100 text-red-800'
    default:
      return 'bg-gray-100 text-gray-800'
  }
}
</script>

<template>
  <DefaultLayout>
    <!-- Breadcrumb and Page Title -->
    <div class="mb-6">
      <BreadcrumbDefault :pageTitle="pageTitle" />
    </div>

    <!-- Client Info Header -->
    <div
      class="flex flex-wrap items-center justify-between gap-4 mb-6 bg-white p-4 rounded-lg shadow-sm"
    >
      <div class="flex items-center">
        <h2 class="text-lg font-medium text-gray-800">
          {{ client.selected_client?.name || 'Client' }} Scope Analytics
        </h2>
      </div>
    </div>

    <!-- Filters Section -->
    <div class="bg-white rounded-lg shadow-sm p-4 mb-6">
      <div class="flex flex-wrap gap-4 items-center">
        <div class="w-full md:w-56">
          <label class="block text-sm font-medium text-gray-700 mb-1">Year</label>
          <Dropdown
            v-model="selectedYear"
            :options="['2020', '2021', '2022', '2023', '2024']"
            placeholder="Select Year"
            class="w-full"
          />
        </div>
        <div class="w-full md:w-56">
          <label class="block text-sm font-medium text-gray-700 mb-1">Scope</label>
          <Dropdown
            v-model="selectedScope"
            :options="['All Scopes', 'Branch Level', 'Region Level', 'Country Level']"
            placeholder="Select Scope"
            class="w-full"
          />
        </div>
        <div class="flex-grow"></div>
        <div>
          <Button label="Refresh" icon="pi pi-refresh" @click="refreshData" />
        </div>
      </div>
    </div>

    <!-- Main Content Area -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
      <!-- Performance Trend Chart -->
      <div class="bg-white rounded-lg shadow-sm p-6">
        <h3 class="text-lg font-medium text-gray-800 mb-4">Performance Trend by Scope</h3>
        <div v-if="isLoading" class="h-80">
          <SkeletonLoader />
        </div>
        <div v-else class="h-80">
          <VueApexCharts
            type="line"
            :options="lineChartOptions"
            :series="scopeData.datasets"
            height="100%"
          />
        </div>
      </div>

      <!-- Scope Radar Comparison -->
      <div class="bg-white rounded-lg shadow-sm p-6">
        <h3 class="text-lg font-medium text-gray-800 mb-4">Scope Comparison by Category</h3>
        <div v-if="isLoading" class="h-80">
          <SkeletonLoader />
        </div>
        <div v-else class="h-80">
          <VueApexCharts type="radar" :options="radarChartOptions" height="100%" />
        </div>
      </div>
    </div>

    <!-- Scope Performance Table -->
    <div class="bg-white rounded-lg shadow-sm p-6">
      <h3 class="text-lg font-medium text-gray-800 mb-4">Scope Performance Detail</h3>
      <div v-if="isLoading">
        <SkeletonLoader />
      </div>
      <div v-else>
        <Table :value="scopeData.tableData" responsiveLayout="scroll" stripedRows class="w-full">
          <Column field="scope" header="Scope" sortable></Column>
          <Column field="score" header="Performance Score" sortable>
            <template #body="{ data }">
              <div class="flex items-center">
                <div class="font-medium">{{ data.score }}%</div>
                <div class="w-24 h-2 bg-gray-200 ml-3 rounded-full overflow-hidden">
                  <div
                    class="h-full rounded-full"
                    :class="{
                      'bg-green-500': data.score >= 80,
                      'bg-yellow-500': data.score >= 60 && data.score < 80,
                      'bg-red-500': data.score < 60
                    }"
                    :style="{ width: `${data.score}%` }"
                  ></div>
                </div>
              </div>
            </template>
          </Column>
          <Column field="change" header="Change" sortable></Column>
          <Column field="status" header="Status" sortable>
            <template #body="{ data }">
              <span
                class="px-2 py-1 text-xs font-medium rounded-full"
                :class="getStatusClass(data.status)"
              >
                {{ data.status.charAt(0).toUpperCase() + data.status.slice(1) }}
              </span>
            </template>
          </Column>
        </Table>
      </div>
    </div>
  </DefaultLayout>
</template>

<style scoped>
.p-dropdown {
  width: 100%;
}
</style>
