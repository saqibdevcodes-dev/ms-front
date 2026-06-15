<script setup lang="ts">
import { ref, computed } from 'vue'
// @ts-ignore
import VueApexCharts from 'vue3-apexcharts'

// Define props to receive data from parent component
const props = defineProps({
  reports: {
    type: Array,
    default: () => []
  }
})

// Computed property to generate chart data from reports
const chartData = computed(() => {
  if (!props.reports || props.reports.length === 0) {
    return {
      series: [
        {
          name: 'Branch Score',
          data: []
        }
      ],
      categories: []
    }
  }

  // Group reports by branch and calculate average scores
  const branchScores = new Map()

  props.reports.forEach((report) => {
    const branchName = report.branch_name || report.branch || 'Unknown Branch'

    if (!branchScores.has(branchName)) {
      branchScores.set(branchName, {
        total: 0,
        count: 0
      })
    }

    const branchData = branchScores.get(branchName)
    branchData.total += report.score || 0
    branchData.count++
  })

  // Convert Map to array of branch average scores
  const branches = []
  const scores = []

  // Sort branches by average score (highest first)
  const sortedBranches = [...branchScores.entries()]
    .map(([branch, data]) => ({
      branch,
      avgScore: data.count > 0 ? Math.round(data.total / data.count) : 0
    }))
    .sort((a, b) => b.avgScore - a.avgScore)
    .slice(0, 8) // Limit to top 8 branches for readability

  sortedBranches.forEach((item) => {
    branches.push(item.branch)
    scores.push(item.avgScore)
  })

  return {
    series: [
      {
        name: 'Average Score',
        data: scores
      }
    ],
    categories: branches
  }
})

const chart = ref(null)

const apexOptions = computed(() => {
  return {
    colors: ['#3056D3'],
    chart: {
      fontFamily: 'Satoshi, sans-serif',
      type: 'bar',
      height: 350,
      toolbar: {
        show: false
      }
    },
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
      categories: chartData.value.categories,
      axisBorder: {
        show: false
      },
      axisTicks: {
        show: false
      },
      labels: {
        style: {
          fontSize: '12px',
          fontFamily: 'Satoshi, sans-serif'
        },
        rotate: -45,
        rotateAlways: false,
        hideOverlappingLabels: true,
        trim: true,
        maxHeight: 120
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
    },
    responsive: [
      {
        breakpoint: 1024,
        options: {
          chart: {
            height: 300
          }
        }
      }
    ]
  }
})
</script>

<template>
  <div
    class=""
  >
   
    <div>
      <div id="branchComparison">
        <VueApexCharts
          type="bar"
          height="350"
          :options="apexOptions"
          :series="chartData.series"
          ref="chart"
        />
      </div>
    </div>
  </div>
</template>
