<script setup lang="ts">
import { onMounted, ref, computed, watch } from 'vue'
import DefaultLayout from '@/layouts/DefaultLayout.vue'
import ChartOne from '@/components/Charts/ChartOne.vue'
import Radial from '@/components/Charts/radial.vue'
import Meter from '@/components/Charts/meter.vue'
import BreadcrumbDefault from '@/components/Breadcrumbs/BreadcrumbDefault.vue'
import Select from 'primevue/select'
import Dropdown from 'primevue/dropdown'
import Button from '@/components/Buttons/Button.vue'
import { Analytics } from '@/stores/analytics'
import { Client } from '@/stores/client'
import VueApexCharts from 'vue3-apexcharts'
import Card from 'primevue/card'
import SkeletonLoader from '@/components/Loaders/SkeletonLoader.vue'
import { useRouter } from 'vue-router'

// Page state
const pageTitle = ref('Analytics Dashboard')
const analytics = computed(() => Analytics())
const client = computed(() => Client())
const router = useRouter()
const selectedScope = ref('')
const selectedYear = ref(new Date().getFullYear().toString())
const isLoading = computed(() => analytics.value.loading)

// Chart state
const monthlyChartOptions = computed(() => ({
  chart: {
    height: 350,
    type: 'bar',
    toolbar: {
      show: false
    }
  },
  colors: ['#3b82f6'],
  plotOptions: {
    bar: {
      horizontal: false,
      columnWidth: '55%',
      borderRadius: 5
    }
  },
  dataLabels: {
    enabled: false
  },
  stroke: {
    show: true,
    width: 2,
    colors: ['transparent']
  },
  xaxis: {
    categories: analytics.value.monthlyChartData.categories,
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
  fill: {
    opacity: 1
  },
  tooltip: {
    y: {
      formatter: (val) => `${val}%`
    }
  }
}))

const branchComparisonOptions = computed(() => ({
  chart: {
    height: 350,
    type: 'bar',
    toolbar: {
      show: false
    }
  },
  colors: ['#10b981'],
  plotOptions: {
    bar: {
      horizontal: true,
      barHeight: '70%',
      borderRadius: 5
    }
  },
  dataLabels: {
    enabled: false
  },
  xaxis: {
    categories: analytics.value.branchComparisonData.categories,
    min: 0,
    max: 100
  },
  grid: {
    show: true,
    borderColor: '#f1f5f9',
    strokeDashArray: 4
  },
  tooltip: {
    y: {
      formatter: (val) => `${val}%`
    }
  }
}))

const scopeRadialOptions = computed(() => ({
  chart: {
    height: 350,
    type: 'radialBar'
  },
  plotOptions: {
    radialBar: {
      dataLabels: {
        name: {
          fontSize: '16px',
          color: '#718096',
          offsetY: -10
        },
        value: {
          fontSize: '20px',
          color: '#1a202c',
          formatter: function (val) {
            return val + '%'
          }
        },
        total: {
          show: true,
          label: 'Average',
          fontSize: '14px',
          color: '#718096',
          formatter: function () {
            const avg = analytics.value.annualAverage || 0
            return avg + '%'
          }
        }
      },
      track: {
        background: '#f1f5f9'
      }
    }
  },
  colors: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'],
  labels: analytics.value.scopePerformanceData.labels,
  stroke: {
    lineCap: 'round'
  }
}))

const yearlyAverageMeterOptions = computed(() => ({
  chart: {
    height: 380,
    type: 'radialBar'
  },
  series: [analytics.value.annualAverage],
  colors: ['#3b82f6'],
  plotOptions: {
    radialBar: {
      startAngle: -90,
      endAngle: 90,
      track: {
        dropShadow: {
          enabled: true,
          top: 2,
          left: 0,
          blur: 4,
          opacity: 0.15
        },
        background: '#f1f5f9',
        startAngle: -90,
        endAngle: 90
      },
      dataLabels: {
        name: {
          show: true,
          fontSize: '14px',
          color: '#718096',
          offsetY: -10
        },
        value: {
          color: '#1a202c',
          fontSize: '30px',
          show: true
        }
      }
    }
  },
  fill: {
    type: 'gradient',
    gradient: {
      shade: 'dark',
      type: 'horizontal',
      gradientToColors: ['#60a5fa'],
      stops: [0, 100]
    }
  },
  stroke: {
    lineCap: 'round'
  },
  labels: ['Overall Score']
}))

// Navigate to specific analytics page
const navigateTo = (route) => {
  router.push(route)
}

// Initialize data on component mount
onMounted(async () => {
  // Initialize the analytics store
  await Analytics().init()

  // Set up the selected filters from store
  selectedScope.value = analytics.value.selectedScope
  selectedYear.value = analytics.value.selectedYear
})

// Watch for filter changes
watch(selectedScope, async (newValue) => {
  if (newValue !== analytics.value.selectedScope) {
    await Analytics().updateFilters(newValue, selectedYear.value)
  }
})

watch(selectedYear, async (newValue) => {
  if (newValue !== analytics.value.selectedYear) {
    await Analytics().updateFilters(selectedScope.value, newValue)
  }
})

// Handle refresh button click
const refreshData = async () => {
  await Analytics().fetchAnalyticsData()
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
          {{ client.selected_client?.name || 'Client' }} Performance Analytics
        </h2>
      </div>
    </div>

    <!-- Analytics Navigation Cards -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
      <!-- Scope Analytics Card -->
      <div
        @click="navigateTo('/client/analytics/scope')"
        class="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow duration-300 cursor-pointer overflow-hidden"
      >
        <div class="h-2 bg-blue-500"></div>
        <div class="p-6">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-xl font-semibold text-gray-800">Scope Analytics</h3>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke-width="1.5"
              stroke="currentColor"
              class="w-10 h-10 text-blue-500"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M3.75 3v11.25A2.25 2.25 0 0 0 6 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0 1 18 16.5h-2.25m-7.5 0h7.5m-7.5 0-1 3m8.5-3 1 3m0 0 .5 1.5m-.5-1.5h-9.5m0 0-.5 1.5m.75-9 3-3 2.148 2.148A12.061 12.061 0 0 1 16.5 7.605"
              />
            </svg>
          </div>
          <p class="text-gray-600 mb-6">
            Detailed analysis of performance metrics broken down by different scopes and their
            comparative results.
          </p>
          <ul class="text-sm text-gray-600 mb-6">
            <li class="flex items-center mb-2">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="h-4 w-4 mr-2 text-blue-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M5 13l4 4L19 7"
                />
              </svg>
              Scope comparisons
            </li>
            <li class="flex items-center mb-2">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="h-4 w-4 mr-2 text-blue-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M5 13l4 4L19 7"
                />
              </svg>
              Trend analysis
            </li>
            <li class="flex items-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="h-4 w-4 mr-2 text-blue-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M5 13l4 4L19 7"
                />
              </svg>
              Performance radar
            </li>
          </ul>
          <div class="flex justify-end">
            <button class="text-blue-500 font-medium flex items-center">
              View Analytics
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="h-5 w-5 ml-1"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M14 5l7 7m0 0l-7 7m7-7H3"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <!-- KPI Analytics Card -->
      <div
        @click="navigateTo('/client/analytics/kpi')"
        class="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow duration-300 cursor-pointer overflow-hidden"
      >
        <div class="h-2 bg-purple-500"></div>
        <div class="p-6">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-xl font-semibold text-gray-800">KPI Analytics</h3>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke-width="1.5"
              stroke="currentColor"
              class="w-10 h-10 text-purple-500"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M3.75 3v11.25A2.25 2.25 0 0 0 6 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0 1 18 16.5h-2.25m-7.5 0h7.5m-7.5 0-1 3m8.5-3 1 3m0 0 .5 1.5m-.5-1.5h-9.5m0 0-.5 1.5M9 11.25v1.5M12 9v3.75m3-6v6"
              />
            </svg>
          </div>
          <p class="text-gray-600 mb-6">
            Track key performance indicators across multiple branches and time periods with advanced
            visualizations.
          </p>
          <ul class="text-sm text-gray-600 mb-6">
            <li class="flex items-center mb-2">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="h-4 w-4 mr-2 text-purple-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M5 13l4 4L19 7"
                />
              </svg>
              KPI performance gauge
            </li>
            <li class="flex items-center mb-2">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="h-4 w-4 mr-2 text-purple-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M5 13l4 4L19 7"
                />
              </svg>
              Branch heatmap analysis
            </li>
            <li class="flex items-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="h-4 w-4 mr-2 text-purple-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M5 13l4 4L19 7"
                />
              </svg>
              Detailed KPI breakdowns
            </li>
          </ul>
          <div class="flex justify-end">
            <button class="text-purple-500 font-medium flex items-center">
              View Analytics
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="h-5 w-5 ml-1"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M14 5l7 7m0 0l-7 7m7-7H3"
                />
              </svg>
            </button>
          </div>
        </div>
        </div>

      <!-- Source Analytics Card -->
      <div
        class="col-span-1 bg-white rounded-lg shadow hover:shadow-md transition-shadow duration-300"
      >
        <div class="cursor-pointer" @click="navigateTo('/client/analytics/src')">
          <div class="p-6">
            <div class="flex items-center justify-center w-14 h-14 rounded-lg bg-blue-50 mb-6">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke-width="1.5"
                stroke="currentColor"
                class="w-8 h-8 text-blue-600"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M7.5 14.25v2.25m3-4.5v4.5m3-6.75v6.75m3-9v9M6 20.25h12A2.25 2.25 0 0 0 20.25 18V6A2.25 2.25 0 0 0 18 3.75H6A2.25 2.25 0 0 0 3.75 6v12A2.25 2.25 0 0 0 6 20.25Z"
                />
              </svg>
            </div>

            <h3 class="text-xl font-semibold text-gray-800">Source Analytics</h3>
            <p class="my-4 text-gray-600">
              Compare data from multiple sources (Mystery Shopping, Customer Reviews, etc.) to get a
              comprehensive view of your business's performance across different channels.
            </p>

            <div class="flex flex-col space-y-4">
              <div class="flex items-center">
                <span
                  class="flex items-center justify-center w-8 h-8 mr-4 rounded-full bg-green-100 text-green-600"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke-width="1.5"
                    stroke="currentColor"
                    class="w-5 h-5"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z"
                    />
                  </svg>
                </span>
                <span class="text-gray-700">Source comparison charts</span>
              </div>
              <div class="flex items-center">
                <span
                  class="flex items-center justify-center w-8 h-8 mr-4 rounded-full bg-blue-100 text-blue-600"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke-width="1.5"
                    stroke="currentColor"
                    class="w-5 h-5"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25H12"
                    />
                  </svg>
                </span>
                <span class="text-gray-700">Performance heatmaps</span>
              </div>
              <div class="flex items-center">
                <span
                  class="flex items-center justify-center w-8 h-8 mr-4 rounded-full bg-purple-100 text-purple-600"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke-width="1.5"
                    stroke="currentColor"
                    class="w-5 h-5"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25Z"
                    />
                  </svg>
                </span>
                <span class="text-gray-700">Source reliability analysis</span>
              </div>
            </div>
        </div>

          <div
            class="py-4 px-6 bg-gray-50 flex items-center justify-between rounded-b-lg border-t border-gray-100"
          >
            <span class="text-sm font-medium text-blue-600">View Analytics</span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke-width="1.5"
              stroke="currentColor"
              class="w-5 h-5 text-blue-600"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M17.25 8.25 21 12m0 0-3.75 3.75M21 12H3"
              />
            </svg>
          </div>
        </div>
      </div>

      <!-- User Performance Analytics Card -->
      <div
        class="col-span-1 bg-white rounded-lg shadow hover:shadow-md transition-shadow duration-300"
      >
        <div class="cursor-pointer" @click="navigateTo('/client/analytics/users')">
          <div class="p-6">
            <div class="flex items-center justify-center w-14 h-14 rounded-lg bg-purple-50 mb-6">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke-width="1.5"
                stroke="currentColor"
                class="w-8 h-8 text-purple-600"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z"
                />
              </svg>
            </div>

            <h3 class="text-xl font-semibold text-gray-800">User Performance Analytics</h3>
            <p class="my-4 text-gray-600">
              Track and analyze the performance of individual users, including mystery shoppers and
              supervisors, to identify top performers and areas for improvement.
            </p>

            <div class="flex flex-col space-y-4">
              <div class="flex items-center">
                <span
                  class="flex items-center justify-center w-8 h-8 mr-4 rounded-full bg-green-100 text-green-600"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke-width="1.5"
                    stroke="currentColor"
                    class="w-5 h-5"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z"
                    />
                  </svg>
                </span>
                <span class="text-gray-700">Monthly performance trends</span>
              </div>
              <div class="flex items-center">
                <span
                  class="flex items-center justify-center w-8 h-8 mr-4 rounded-full bg-blue-100 text-blue-600"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke-width="1.5"
                    stroke="currentColor"
                    class="w-5 h-5"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25H12"
                    />
                  </svg>
                </span>
                <span class="text-gray-700">User status distribution</span>
              </div>
              <div class="flex items-center">
                <span
                  class="flex items-center justify-center w-8 h-8 mr-4 rounded-full bg-purple-100 text-purple-600"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke-width="1.5"
                    stroke="currentColor"
                    class="w-5 h-5"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25Z"
                    />
                  </svg>
                </span>
                <span class="text-gray-700">Individual performance metrics</span>
              </div>
            </div>
        </div>

          <div
            class="py-4 px-6 bg-gray-50 flex items-center justify-between rounded-b-lg border-t border-gray-100"
          >
            <span class="text-sm font-medium text-blue-600">View Analytics</span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke-width="1.5"
              stroke="currentColor"
              class="w-5 h-5 text-blue-600"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M17.25 8.25 21 12m0 0-3.75 3.75M21 12H3"
              />
            </svg>
          </div>
        </div>
      </div>
    </div>

    <!-- Analytics Overview -->
    <div class="mt-12 bg-white rounded-lg shadow-sm p-6">
      <h3 class="text-lg font-medium text-gray-800 mb-4">Analytics Overview</h3>
      <p class="text-gray-600 mb-4">
        This analytics dashboard provides comprehensive insights into your mystery shopping
        performance. Select one of the specialized analytics views above to explore detailed metrics
        and visualizations.
      </p>

      <p class="text-gray-600 mb-4">
        Each analytics page offers different perspectives on your data:
      </p>

      <ul class="space-y-2 text-gray-600 mb-4">
        <li class="flex items-center">
          <span class="text-blue-500 mr-2">•</span>
          <span class="font-medium">Scope Analytics</span> – Analyze performance by different scopes
          (branches, regions, countries).
        </li>
        <li class="flex items-center">
          <span class="text-blue-500 mr-2">•</span>
          <span class="font-medium">KPI Analytics</span> – Track key performance indicators across
          your organization.
        </li>
        <li class="flex items-center">
          <span class="text-blue-500 mr-2">•</span>
          <span class="font-medium">Source Analytics</span> – Compare data from different sources to
          get a comprehensive view.
        </li>
        <li class="flex items-center">
          <span class="text-blue-500 mr-2">•</span>
          <span class="font-medium">User Performance Analytics</span> – Track individual user
          performance and identify top performers.
        </li>
      </ul>
        </div>
    </DefaultLayout>
</template>

<style scoped>
.p-dropdown {
  width: 100%;
}
</style>
