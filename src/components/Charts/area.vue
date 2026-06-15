<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import VueApexCharts from 'vue3-apexcharts'

// Define props to receive data from parent component
const props = defineProps({
  reports: {
    type: Array,
    default: () => []
  },
  timeframe: {
    type: String,
    default: 'month'
  }
})

// Computed property to process report data for chart
const chartData = computed(() => {
  if (!props.reports || props.reports.length === 0) {
    return {
      series: [
        {
          name: 'Average Score',
          data: []
        }
      ],
      categories: []
    }
  }

  // Sort reports by date
  const sortedReports = [...props.reports].sort((a, b) => {
    return new Date(a.date || a.created_at).getTime() - new Date(b.date || b.created_at).getTime()
  })

  // Group reports by month or timeframe
  const reportsByPeriod = new Map()

  sortedReports.forEach((report) => {
    const date = new Date(report.date || report.created_at)
    let periodKey

    if (props.timeframe === 'year') {
      periodKey = date.getFullYear().toString()
    } else if (props.timeframe === '90days') {
      // Group by weeks in last 90 days
      const weekNum = Math.floor((Date.now() - date.getTime()) / (7 * 24 * 60 * 60 * 1000))
      periodKey = `Week ${weekNum}`
    } else {
      // Default to monthly
      periodKey = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`
    }

    if (!reportsByPeriod.has(periodKey)) {
      reportsByPeriod.set(periodKey, [])
    }
    reportsByPeriod.get(periodKey).push(report)
  })

  // Calculate average scores for each period
  const categories = []
  const data = []

  // Sort periods chronologically
  const sortedPeriods = Array.from(reportsByPeriod.keys()).sort()

  sortedPeriods.forEach((period) => {
    const reports = reportsByPeriod.get(period)
    const totalScore = reports.reduce((sum, report) => sum + (report.score || 0), 0)
    const avgScore = Math.round((totalScore / reports.length) * 10) / 10

    // Format display label
    let displayLabel
    if (props.timeframe === 'year') {
      displayLabel = period
    } else if (props.timeframe === '90days') {
      displayLabel = period
    } else {
      // Format month as Jan 2023, Feb 2023, etc.
      const [year, month] = period.split('-')
      const date = new Date(parseInt(year), parseInt(month) - 1, 1)
      displayLabel = date.toLocaleString('default', { month: 'short', year: 'numeric' })
    }

    categories.push(displayLabel)
    data.push(avgScore)
  })

  return {
    series: [
      {
        name: 'Average Score',
        data: data
      }
    ],
    categories: categories
  }
})

// Chart options
const options = computed(() => {
  return {
    chart: {
      height: 350,
      type: 'area',
      toolbar: {
        show: false
      },
      zoom: {
        enabled: false
      }
    },
    dataLabels: {
      enabled: false
    },
    stroke: {
      curve: 'smooth',
      width: 3
    },
    colors: ['#3056D3'],
    fill: {
      type: 'gradient',
      gradient: {
        shadeIntensity: 1,
        opacityFrom: 0.7,
        opacityTo: 0.9,
        stops: [0, 90, 100]
      }
    },
    xaxis: {
      categories: chartData.value.categories,
      labels: {
        style: {
          fontSize: '12px',
          fontFamily: 'Satoshi, sans-serif'
        }
      }
    },
    yaxis: {
      min: 0,
      max: 100,
      title: {
        text: 'Score (%)'
      }
    },
    tooltip: {
      y: {
        formatter: function (value) {
          return `${value}%`
        }
      }
    }
  }
})
</script>

<template>
  <div class="w-full">
    <!-- VueApexCharts component for rendering -->
    <VueApexCharts height="350" type="area" :options="options" :series="chartData.series" />
  </div>
</template>
