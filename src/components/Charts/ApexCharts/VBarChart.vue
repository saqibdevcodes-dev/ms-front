<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import VueApexCharts from 'vue3-apexcharts'

const props = defineProps({
  chartData: {
    type: Array,
    required: true
  },
  categories: {
    type: Array,
    required: true
  },
  colors: {
    type: Array,
    default: () => ['#3B82F6', '#10B981', '#F59E0B', '#EF4444']
  },
  height: {
    type: String,
    default: '350px'
  },
  title: {
    type: String,
    default: ''
  },
  stacked: {
    type: Boolean,
    default: false
  },
  distributed: {
    type: Boolean,
    default: false
  }
})

const series = computed(() => {
  return props.chartData
})

const chartOptions = computed(() => {
  return {
    chart: {
      type: 'bar',
      stacked: props.stacked,
      toolbar: {
        show: true
      },
      zoom: {
        enabled: true
      }
    },
    plotOptions: {
      bar: {
        horizontal: false,
        columnWidth: '55%',
        distributed: props.distributed,
        borderRadius: 4,
        dataLabels: {
          position: 'top'
        }
      }
    },
    dataLabels: {
      enabled: false
    },
    title: {
      text: props.title,
      align: 'left',
      style: {
        fontSize: '16px',
        fontWeight: 'bold',
        color: '#263238'
      }
    },
    stroke: {
      show: true,
      width: 2,
      colors: ['transparent']
    },
    xaxis: {
      categories: props.categories,
      labels: {
        style: {
          colors: [],
          fontSize: '12px',
          fontFamily: 'Helvetica, Arial, sans-serif',
          fontWeight: 400
        },
        rotate: -45,
        rotateAlways: false,
        trim: false
      }
    },
    yaxis: {
      title: {
        text: ''
      },
      labels: {
        style: {
          colors: [],
          fontSize: '12px',
          fontFamily: 'Helvetica, Arial, sans-serif',
          fontWeight: 400
        }
      }
    },
    grid: {
      borderColor: '#e7e7e7',
      row: {
        colors: ['#f3f3f3', 'transparent'],
        opacity: 0.5
      }
    },
    fill: {
      opacity: 1
    },
    legend: {
      position: 'top',
      horizontalAlign: 'left',
      fontFamily: 'Helvetica, Arial',
      fontSize: '13px'
    },
    colors: props.colors,
    tooltip: {
      y: {
        formatter: function (val) {
          return val
        }
      }
    }
  }
})
</script>

<template>
  <div class="vbar-chart-wrapper">
    <vue-apex-charts
      type="bar"
      :height="height"
      :options="chartOptions"
      :series="series"
    ></vue-apex-charts>
  </div>
</template>

<style scoped>
.vbar-chart-wrapper {
  width: 100%;
  background: white;
  border-radius: 8px;
  padding: 15px;
  box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
}
</style>
