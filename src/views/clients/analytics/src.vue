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
const pageTitle = ref('Source Analytics')
const analytics = computed(() => Analytics())
const client = computed(() => Client())
const selectedScope = ref('')
const selectedYear = ref(new Date().getFullYear().toString())
const isLoading = ref(true)
const sourceData = ref({
  comparison: {
    labels: [],
    datasets: []
  },
  heatmap: {
    xLabels: [],
    yLabels: [],
    data: []
  },
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
    categories: sourceData.value.comparison.labels,
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
      name: 'Mystery Shopping',
      data: [85, 90, 78, 82, 88, 92]
    },
    {
      name: 'Customer Reviews',
      data: [78, 85, 75, 80, 82, 87]
    },
    {
      name: 'Employee Feedback',
      data: [80, 88, 82, 75, 85, 90]
    }
  ],
  colors: ['#4F46E5', '#EC4899', '#10B981'],
  labels: [
    'Customer Service',
    'Cleanliness',
    'Product Knowledge',
    'Wait Time',
    'Issue Resolution',
    'Staff Courtesy'
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
    colors: ['#4F46E5', '#EC4899', '#10B981'],
    strokeColors: '#ffffff',
    strokeWidth: 2
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
  plotOptions: {
    heatmap: {
      colorScale: {
        ranges: [
          {
            from: 0,
            to: 70,
            color: '#F3B4A4',
            name: 'Low'
          },
          {
            from: 71,
            to: 80,
            color: '#FFD59E',
            name: 'Medium'
          },
          {
            from: 81,
            to: 90,
            color: '#A7DCB2',
            name: 'Good'
          },
          {
            from: 91,
            to: 100,
            color: '#68B984',
            name: 'Excellent'
          }
        ]
      }
    }
  },
  series: [
    {
      name: 'Mystery Shopping',
      data: sourceData.value.heatmap.data[0] || [
        { x: 'Customer Service', y: 85 },
        { x: 'Cleanliness', y: 90 },
        { x: 'Product Knowledge', y: 78 },
        { x: 'Wait Time', y: 82 },
        { x: 'Issue Resolution', y: 88 },
        { x: 'Staff Courtesy', y: 92 }
      ]
    },
    {
      name: 'Customer Reviews',
      data: sourceData.value.heatmap.data[1] || [
        { x: 'Customer Service', y: 78 },
        { x: 'Cleanliness', y: 85 },
        { x: 'Product Knowledge', y: 75 },
        { x: 'Wait Time', y: 80 },
        { x: 'Issue Resolution', y: 82 },
        { x: 'Staff Courtesy', y: 87 }
      ]
    },
    {
      name: 'Employee Feedback',
      data: sourceData.value.heatmap.data[2] || [
        { x: 'Customer Service', y: 80 },
        { x: 'Cleanliness', y: 88 },
        { x: 'Product Knowledge', y: 82 },
        { x: 'Wait Time', y: 75 },
        { x: 'Issue Resolution', y: 85 },
        { x: 'Staff Courtesy', y: 90 }
      ]
    }
  ]
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
    // await analytics.value.fetchSourceAnalytics(selectedScope.value, selectedYear.value)

    // Simulate API call delay
    await new Promise((resolve) => setTimeout(resolve, 1000))

    // Mock data
    sourceData.value = {
      comparison: {
        labels: [
          'Jan',
          'Feb',
          'Mar',
          'Apr',
          'May',
          'Jun',
          'Jul',
          'Aug',
          'Sep',
          'Oct',
          'Nov',
          'Dec'
        ],
        datasets: [
          {
            label: 'Mystery Shopping',
            data: [85, 82, 88, 90, 87, 92, 89, 91, 93, 92, 94, 95],
            borderColor: '#4F46E5',
            backgroundColor: 'rgba(79, 70, 229, 0.1)'
          },
          {
            label: 'Customer Reviews',
            data: [78, 80, 82, 85, 83, 87, 89, 86, 90, 88, 91, 92],
            borderColor: '#EC4899',
            backgroundColor: 'rgba(236, 72, 153, 0.1)'
          },
          {
            label: 'Employee Feedback',
            data: [80, 82, 85, 87, 86, 89, 90, 92, 91, 93, 92, 94],
            borderColor: '#10B981',
            backgroundColor: 'rgba(16, 185, 129, 0.1)'
          }
        ]
      },
      heatmap: {
        xLabels: [
          'Customer Service',
          'Cleanliness',
          'Product Knowledge',
          'Wait Time',
          'Issue Resolution',
          'Staff Courtesy'
        ],
        yLabels: ['Mystery Shopping', 'Customer Reviews', 'Employee Feedback'],
        data: [
          [
            { x: 'Customer Service', y: 85 },
            { x: 'Cleanliness', y: 90 },
            { x: 'Product Knowledge', y: 78 },
            { x: 'Wait Time', y: 82 },
            { x: 'Issue Resolution', y: 88 },
            { x: 'Staff Courtesy', y: 92 }
          ],
          [
            { x: 'Customer Service', y: 78 },
            { x: 'Cleanliness', y: 85 },
            { x: 'Product Knowledge', y: 75 },
            { x: 'Wait Time', y: 80 },
            { x: 'Issue Resolution', y: 82 },
            { x: 'Staff Courtesy', y: 87 }
          ],
          [
            { x: 'Customer Service', y: 80 },
            { x: 'Cleanliness', y: 88 },
            { x: 'Product Knowledge', y: 82 },
            { x: 'Wait Time', y: 75 },
            { x: 'Issue Resolution', y: 85 },
            { x: 'Staff Courtesy', y: 90 }
          ]
        ]
      },
      tableData: [
        {
          source: 'Mystery Shopping',
          average: 88,
          highest: 'Staff Courtesy (92%)',
          lowest: 'Product Knowledge (78%)'
        },
        {
          source: 'Customer Reviews',
          average: 81,
          highest: 'Staff Courtesy (87%)',
          lowest: 'Product Knowledge (75%)'
        },
        {
          source: 'Employee Feedback',
          average: 83,
          highest: 'Staff Courtesy (90%)',
          lowest: 'Wait Time (75%)'
        }
      ]
    }
  } catch (error) {
    console.error('Error loading source analytics data', error)
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
          {{ client.selected_client?.name || 'Client' }} Source Analytics (CRS)
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
    <div class="grid grid-cols-1 gap-6 mb-6">
      <!-- Source Comparison Line Chart -->
      <div class="bg-white rounded-lg shadow-sm p-6">
        <h3 class="text-lg font-medium text-gray-800 mb-4">Monthly Performance by Source</h3>
        <div v-if="isLoading">
          <SkeletonLoader />
        </div>
        <div v-else>
          <VueApexCharts
            type="line"
            :options="lineChartOptions"
            :series="sourceData.comparison.datasets"
            height="350"
          />
        </div>
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
      <!-- Category Radar Comparison -->
      <div class="bg-white rounded-lg shadow-sm p-6">
        <h3 class="text-lg font-medium text-gray-800 mb-4">Category Comparison by Source</h3>
        <div v-if="isLoading">
          <SkeletonLoader />
        </div>
        <div v-else>
          <VueApexCharts type="radar" :options="radarChartOptions" height="350" />
        </div>
      </div>

      <!-- Source Performance Table -->
      <div class="bg-white rounded-lg shadow-sm p-6">
        <h3 class="text-lg font-medium text-gray-800 mb-4">Source Performance Summary</h3>
        <div v-if="isLoading">
          <SkeletonLoader />
        </div>
        <div v-else>
          <Table :value="sourceData.tableData" responsiveLayout="scroll" stripedRows class="w-full">
            <Column field="source" header="Data Source" sortable></Column>
            <Column field="average" header="Average Score" sortable>
              <template #body="{ data }">
                <div class="flex items-center">
                  <div class="font-medium">{{ data.average }}%</div>
                  <div class="w-24 h-2 bg-gray-200 ml-3 rounded-full overflow-hidden">
                    <div
                      class="h-full rounded-full"
                      :class="{
                        'bg-green-500': data.average >= 80,
                        'bg-yellow-500': data.average >= 60 && data.average < 80,
                        'bg-red-500': data.average < 60
                      }"
                      :style="{ width: `${data.average}%` }"
                    ></div>
                  </div>
                </div>
              </template>
            </Column>
            <Column field="highest" header="Highest KPI" sortable></Column>
            <Column field="lowest" header="Lowest KPI" sortable></Column>
          </Table>
        </div>
      </div>
    </div>

    <!-- Source-KPI Heatmap -->
    <div class="bg-white rounded-lg shadow-sm p-6 mb-6">
      <h3 class="text-lg font-medium text-gray-800 mb-4">Source-KPI Performance Heatmap</h3>
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
      <div class="mt-4 text-sm text-gray-500">
        <p>
          This heatmap shows the performance scores of each data source across different KPIs.
          Darker colors indicate higher scores.
        </p>
      </div>
    </div>
  </DefaultLayout>
</template>

<style scoped>
.p-dropdown {
  width: 100%;
}
</style>
