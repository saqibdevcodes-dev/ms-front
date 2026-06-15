<script setup lang="ts">
import { defineComponent, reactive, computed } from 'vue'
import VueApexCharts from 'vue3-apexcharts'

// Define props to receive data from parent component
const props = defineProps({
  reports: {
    type: Array,
    default: () => []
  },
  selectedType: {
    type: String,
    default: 'All Reports'
  }
})

// Computed property to process data by report type
const chartData = computed(() => {
  if (!props.reports || props.reports.length === 0) {
    return {
      series: [0, 0, 0, 0],
      labels: ['Overall', 'Mystery Shopping', 'Branch Audit', 'Customer Satisfaction']
    }
  }

  // Filter reports based on selected type
  let filteredReports = props.reports
  if (props.selectedType !== 'All Reports') {
    filteredReports = props.reports.filter(
      (report) => (report.type || report.report_type) === props.selectedType
    )
  }

  if (filteredReports.length === 0) {
    return {
      series: [0, 0, 0, 0],
      labels: ['Overall', 'Mystery Shopping', 'Branch Audit', 'Customer Satisfaction']
    }
  }

  // Calculate average score for all filtered reports
  const overallTotal = filteredReports.reduce((sum, report) => sum + (report.score || 0), 0)
  const overallAvg = Math.round(overallTotal / filteredReports.length)

  // Group by report type and calculate averages
  const reportTypes = {
    'Mystery Shopping': { total: 0, count: 0 },
    'Branch Audit': { total: 0, count: 0 },
    'Customer Satisfaction': { total: 0, count: 0 }
  }

  // Process each report
  props.reports.forEach((report) => {
    const type = report.type || report.report_type
    if (type && reportTypes[type]) {
      reportTypes[type].total += report.score || 0
      reportTypes[type].count++
    }
  })

  // Calculate averages for each type
  const mysteryShoppingAvg = reportTypes['Mystery Shopping'].count
    ? Math.round(reportTypes['Mystery Shopping'].total / reportTypes['Mystery Shopping'].count)
    : 0

  const branchAuditAvg = reportTypes['Branch Audit'].count
    ? Math.round(reportTypes['Branch Audit'].total / reportTypes['Branch Audit'].count)
    : 0

  const custSatisfactionAvg = reportTypes['Customer Satisfaction'].count
    ? Math.round(
        reportTypes['Customer Satisfaction'].total / reportTypes['Customer Satisfaction'].count
      )
    : 0

  return {
    series: [overallAvg, mysteryShoppingAvg, branchAuditAvg, custSatisfactionAvg],
    labels: ['Overall', 'Mystery Shopping', 'Branch Audit', 'Customer Satisfaction']
  }
})

// Chart options
const options = computed(() => {
  return {
    chart: {
      height: 350,
      type: 'radialBar'
    },
    plotOptions: {
      radialBar: {
        dataLabels: {
          name: {
            fontSize: '16px',
            color: undefined,
            offsetY: -10
          },
          value: {
            fontSize: '20px',
            formatter: function (val) {
              return val + '%'
            }
          },
          total: {
            show: true,
            label: 'Average',
            formatter: function () {
              if (chartData.value.series.length === 0 || chartData.value.series[0] === 0) {
                return '0%'
              }
              return chartData.value.series[0] + '%'
            }
          }
        },
        track: {
          background: '#f1f5f9'
        }
      }
    },
    colors: ['#3056D3', '#10B981', '#F59E0B', '#EF4444'],
    labels: chartData.value.labels,
    stroke: {
      lineCap: 'round'
    }
  }
})
</script>

<template>
  <div>
    <VueApexCharts height="350" type="radialBar" :options="options" :series="chartData.series" />
  </div>
</template>

<style scoped>
.apexcharts-text {
  fill: #000000 !important;
}
</style>
