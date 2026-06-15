<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
// @ts-ignore
import VueApexCharts from 'vue3-apexcharts'
import { Ranges } from '@/stores/ranges'

// Define interface for report type
interface Report {
  score: number
  [key: string]: any
}

// Define props to receive data from parent component
const props = defineProps<{
  reports: Report[]
}>()

// Helper function to get range-based categories and colors from Ranges store
const getRangeBasedCategories = () => {
  const rangesStore = Ranges()

  // Default fallback categories if no ranges are configured
  const defaultCategories = [
    { start: 90, end: 100, rating: 'Outstanding', color: '#10B981' },
    { start: 80, end: 89, rating: 'Good', color: '#008000' },
    { start: 70, end: 79, rating: 'Average', color: '#F59E0B' },
    { start: 0, end: 69, rating: 'Below Average', color: '#EF4444' }
  ]

  // Use client ranges if available, otherwise use defaults
  if (rangesStore.ranges_data && rangesStore.ranges_data.length > 0) {
    // Sort ranges by start value (highest to lowest) for proper categorization
    return [...rangesStore.ranges_data].sort((a, b) => b.start - a.start)
  }

  return defaultCategories
}

// Helper function to categorize a score based on ranges
const categorizeScore = (score: number, categories: any[]) => {
  for (const category of categories) {
    if (score >= category.start && score <= category.end) {
      return category
    }
  }
  // Fallback to the last category if no match
  return categories[categories.length - 1]
}

// Computed property to calculate score distribution using dynamic ranges
const scoreDistribution = computed(() => {
  if (!props.reports || props.reports.length === 0) {
    const categories = getRangeBasedCategories()
    return {
      series: new Array(categories.length).fill(0),
      labels: categories.map((cat) => `${cat.rating} (${cat.start}-${cat.end}%)`),
      colors: categories.map((cat) => cat.color)
    }
  }

  const categories = getRangeBasedCategories()

  // Initialize counters for each category
  const categoryCounts = categories.map(() => 0)

  // Count reports in each category
  props.reports.forEach((report: Report) => {
    const score = report.score || 0
    const categoryIndex = categories.findIndex((cat) => score >= cat.start && score <= cat.end)

    if (categoryIndex !== -1) {
      categoryCounts[categoryIndex]++
    } else {
      // If no exact match, find the closest category
      const closestCategory = categorizeScore(score, categories)
      const closestIndex = categories.findIndex((cat) => cat === closestCategory)
      if (closestIndex !== -1) {
        categoryCounts[closestIndex]++
      }
    }
  })

  return {
    series: categoryCounts,
    labels: categories.map((cat) => `${cat.rating} (${cat.start}-${cat.end}%)`),
    colors: categories.map((cat) => cat.color)
  }
})

const chart = ref<any>(null)

const apexOptions = computed(() => {
  const distribution = scoreDistribution.value

  return {
    colors: distribution.colors,
    chart: {
      type: 'donut',
      height: 435,
      toolbar: {
        show: false
      },
      zoom: {
        enabled: false
      }
    },
    labels: distribution.labels,
    dataLabels: {
      enabled: true,
      dropShadow: {
        enabled: true,
        color: '#ffffff',
        top: 0,
        left: 0,
        blur: 5,
        opacity: 2
      },
      style: {
        fontSize: '14px',
        fontWeight: 'bold',
        colors: ['#ffffff'] // ✅ this works for outer data labels
      }
    },
    plotOptions: {
      pie: {
        donut: {
          size: '55%',
          labels: {
            show: false, // ✅ donut center label
            name: {
              show: true,
              color: '#ffffff'
            },
            value: {
              show: true,
              color: '#ffffff'
            },
            total: {
              show: true,
              label: 'Total',
              color: '#ffffff'
            }
          }
        }
      }
    },
    legend: {
      position: 'bottom',
      horizontalAlign: 'center',
      fontFamily: 'Satoshi',
      fontWeight: 500,
      fontSize: '14px',
      markers: {
        radius: 3
      }
    },
    responsive: [
      {
        breakpoint: 768,
        options: {
          legend: {
            position: 'bottom'
          }
        }
      }
    ]
  }
})

// Watch for changes in reports data to refresh chart
watch(
  () => props.reports,
  () => {
    if (chart.value && chart.value.updateOptions) {
      chart.value.updateOptions({
        labels: scoreDistribution.value.labels,
        colors: scoreDistribution.value.colors
      })
    }
  },
  { deep: true }
)

// Watch for changes in ranges data to refresh chart
watch(
  () => Ranges().ranges_data,
  () => {
    if (chart.value && chart.value.updateOptions) {
      const distribution = scoreDistribution.value
      chart.value.updateOptions({
        labels: distribution.labels,
        colors: distribution.colors
      })
    }
  },
  { deep: true }
)
</script>

<template>
  <div>
    <div>
      <div id="scoreDistribution">
        <VueApexCharts
          type="donut"
          height="335"
          :options="apexOptions"
          :series="scoreDistribution.series"
          ref="chart"
        />
      </div>
    </div>
  </div>
</template>
