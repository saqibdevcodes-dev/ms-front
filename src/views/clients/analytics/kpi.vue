<script setup lang="ts">
import { onMounted, ref, computed, watch } from 'vue'
import DefaultLayout from '@/layouts/DefaultLayout.vue'
import BreadcrumbDefault from '@/components/Breadcrumbs/BreadcrumbDefault.vue'
import Dropdown from 'primevue/dropdown'
import Button from '@/components/Buttons/Button.vue'
import Card from 'primevue/card'
import { Analytics } from '@/stores/analytics'
import { Client } from '@/stores/client'
import VueApexCharts from 'vue3-apexcharts'
import SkeletonLoader from '@/components/Loaders/SkeletonLoader.vue'
import Table from 'primevue/datatable'
import Column from 'primevue/column'

// Page state
const pageTitle = ref('KPI Analytics')
const analytics = computed(() => Analytics())
const client = computed(() => Client())
const selectedScope = ref('')
const selectedYear = ref(new Date().getFullYear().toString())
const isLoading = ref(true)
const kpiData = ref({
  radar: {
    labels: [],
    datasets: []
  },
  bar: {
    labels: [],
    datasets: []
  },
  tableData: []
})

// KPI categories for demo
const kpiCategories = ref([
  'Customer Service',
  'Store Cleanliness',
  'Product Knowledge',
  'Wait Time',
  'Checkout Experience',
  'Staff Friendliness',
  'Problem Resolution',
  'Product Availability'
])

// Mock KPI scores
const kpiScores = ref([85, 76, 92, 68, 79, 88, 72, 81])

// Chart options
const radarChartOptions = computed(() => ({
  chart: {
    height: 350,
    type: 'radar',
    toolbar: {
      show: false
    }
  },
  colors: ['#4F46E5', '#EC4899'],
  labels: kpiData.value.radar.labels,
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

const barChartOptions = computed(() => ({
  chart: {
    height: 350,
    type: 'bar',
    toolbar: {
      show: false
    }
  },
  colors: [
    'rgba(79, 70, 229, 0.7)',
    'rgba(236, 72, 153, 0.7)',
    'rgba(16, 185, 129, 0.7)',
    'rgba(245, 158, 11, 0.7)',
    'rgba(99, 102, 241, 0.7)',
    'rgba(239, 68, 68, 0.7)'
  ],
  plotOptions: {
    bar: {
      borderRadius: 4,
      horizontal: false,
      columnWidth: '55%',
      distributed: true
    }
  },
  dataLabels: {
    enabled: false
  },
  legend: {
    show: false
  },
  xaxis: {
    categories: kpiData.value.bar.labels,
    labels: {
      style: {
        fontSize: '12px'
      }
    }
  },
  yaxis: {
    title: {
      text: 'Score (%)'
    },
    min: 0,
    max: 100
  },
  grid: {
    borderColor: '#f1f5f9'
  },
  tooltip: {
    y: {
      formatter: (val) => `${val}%`
    }
  }
}))

const heatmapChartOptions = computed(() => ({
  chart: {
    height: 350,
    type: 'heatmap',
    toolbar: {
      show: false
    }
  },
  dataLabels: {
    enabled: false
  },
  colors: ['#4F46E5'],
  series: [
    {
      name: 'Branch A',
      data: generateHeatmapData(6, 85, 95)
    },
    {
      name: 'Branch B',
      data: generateHeatmapData(6, 75, 90)
    },
    {
      name: 'Branch C',
      data: generateHeatmapData(6, 65, 85)
    },
    {
      name: 'Branch D',
      data: generateHeatmapData(6, 70, 90)
    }
  ],
  xaxis: {
    categories: [
      'Customer Service',
      'Cleanliness',
      'Product Knowledge',
      'Wait Time',
      'Issue Resolution',
      'Staff Courtesy'
    ]
  }
}))

// Helper function to generate heatmap data
function generateHeatmapData(count, min, max) {
  const data = []
  for (let i = 0; i < count; i++) {
    const value = Math.floor(Math.random() * (max - min + 1)) + min
    data.push({
      x: i,
      y: value
    })
  }
  return data
}

// Data loading and filtering
onMounted(async () => {
  await loadData()
})

const loadData = async () => {
  isLoading.value = true

  try {
    // In a real implementation, this would fetch data from the API
    // For now, use mock data
    // await analytics.value.fetchKpiAnalytics(selectedScope.value, selectedYear.value)

    // Simulate API call delay
    await new Promise((resolve) => setTimeout(resolve, 1000))

    // Mock data
    kpiData.value = {
      radar: {
        labels: [
          'Customer Service',
          'Cleanliness',
          'Product Knowledge',
          'Wait Time',
          'Issue Resolution',
          'Staff Courtesy'
        ],
        datasets: [
          {
            name: 'Current Year',
            data: [85, 90, 78, 82, 88, 92]
          },
          {
            name: 'Previous Year',
            data: [80, 85, 75, 78, 82, 87]
          }
        ]
      },
      bar: {
        labels: [
          'Customer Service',
          'Cleanliness',
          'Product Knowledge',
          'Wait Time',
          'Issue Resolution',
          'Staff Courtesy'
        ],
        datasets: [
          {
            name: 'Performance Score',
            data: [85, 90, 78, 82, 88, 92]
          }
        ]
      },
      tableData: [
        { kpi: 'Customer Service', score: 85, target: 80, variance: '+5', status: 'above_target' },
        { kpi: 'Cleanliness', score: 90, target: 85, variance: '+5', status: 'above_target' },
        { kpi: 'Product Knowledge', score: 78, target: 80, variance: '-2', status: 'below_target' },
        { kpi: 'Wait Time', score: 82, target: 75, variance: '+7', status: 'above_target' },
        { kpi: 'Issue Resolution', score: 88, target: 85, variance: '+3', status: 'above_target' },
        { kpi: 'Staff Courtesy', score: 92, target: 90, variance: '+2', status: 'above_target' }
      ]
    }
  } catch (error) {
    console.error('Error loading KPI analytics data', error)
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
    case 'above_target':
      return 'bg-green-100 text-green-800'
    case 'at_target':
      return 'bg-blue-100 text-blue-800'
    case 'below_target':
      return 'bg-red-100 text-red-800'
    default:
      return 'bg-gray-100 text-gray-800'
  }
}

// Format status text for display
const formatStatus = (status) => {
  return status
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
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
          {{ client.selected_client?.name || 'Client' }} KPI Analytics
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
      <!-- KPI Score Comparison Bar Chart -->
      <div class="bg-white rounded-lg shadow-sm p-6">
        <h3 class="text-lg font-medium text-gray-800 mb-4">KPI Performance Overview</h3>
        <div v-if="isLoading" class="h-80">
          <SkeletonLoader />
        </div>
        <div v-else class="h-80">
          <VueApexCharts
            type="bar"
            :options="barChartOptions"
            :series="[{ data: kpiData.bar.datasets[0].data }]"
            height="100%"
          />
        </div>
      </div>

      <!-- KPI Radar Comparison -->
      <div class="bg-white rounded-lg shadow-sm p-6">
        <h3 class="text-lg font-medium text-gray-800 mb-4">Year-over-Year Comparison</h3>
        <div v-if="isLoading" class="h-80">
          <SkeletonLoader />
        </div>
        <div v-else class="h-80">
          <VueApexCharts
            type="radar"
            :options="radarChartOptions"
            :series="kpiData.radar.datasets"
            height="100%"
          />
        </div>
      </div>
    </div>

    <!-- Branch KPI Heatmap -->
    <div class="bg-white rounded-lg shadow-sm p-6 mb-6">
      <h3 class="text-lg font-medium text-gray-800 mb-4">Branch Performance by KPI (Heatmap)</h3>
      <div v-if="isLoading">
        <SkeletonLoader />
      </div>
      <div v-else>
        <VueApexCharts
          type="heatmap"
          :options="heatmapChartOptions"
          :series="heatmapChartOptions.series"
          height="350"
        />
      </div>
    </div>

    <!-- KPI Table -->
    <div class="bg-white rounded-lg shadow-sm p-6">
      <h3 class="text-lg font-medium text-gray-800 mb-4">KPI Performance Detail</h3>
      <div v-if="isLoading">
        <SkeletonLoader />
      </div>
      <div v-else>
        <Table :value="kpiData.tableData" responsiveLayout="scroll" stripedRows class="w-full">
          <Column field="kpi" header="KPI" sortable></Column>
          <Column field="score" header="Current Score" sortable>
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
          <Column field="target" header="Target" sortable>
            <template #body="{ data }"> {{ data.target }}% </template>
          </Column>
          <Column field="variance" header="Variance" sortable>
            <template #body="{ data }">
              <span
                :class="{
                  'text-green-600': data.variance.startsWith('+'),
                  'text-red-600': data.variance.startsWith('-')
                }"
              >
                {{ data.variance }}%
              </span>
            </template>
          </Column>
          <Column field="status" header="Status" sortable>
            <template #body="{ data }">
              <span
                class="px-2 py-1 text-xs font-medium rounded-full"
                :class="getStatusClass(data.status)"
              >
                {{ formatStatus(data.status) }}
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
