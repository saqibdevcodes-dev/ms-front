<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import VueApexCharts from 'vue3-apexcharts'

const props = defineProps({
  series: {
    type: Array,
    required: true
  },
  labels: {
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
  }
})

const chartOptions = computed(() => {
  return {
    chart: {
      type: 'radialBar',
      toolbar: {
        show: true
      }
    },
    plotOptions: {
      radialBar: {
        offsetY: 0,
        startAngle: 0,
        endAngle: 270,
        hollow: {
          margin: 5,
          size: '30%',
          background: 'transparent',
          image: undefined
        },
        dataLabels: {
          name: {
            show: true
          },
          value: {
            show: true
          }
        }
      }
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
    colors: props.colors,
    labels: props.labels,
    legend: {
      show: true,
      floating: true,
      fontSize: '13px',
      position: 'left',
      offsetX: 140,
      offsetY: 15,
      labels: {
        useSeriesColors: true
      },
      formatter: function (seriesName, opts) {
        return seriesName + ':  ' + opts.w.globals.series[opts.seriesIndex]
      },
      itemMargin: {
        horizontal: 1
      }
    },
    responsive: [
      {
        breakpoint: 480,
        options: {
          legend: {
            show: false
          }
        }
      }
    ]
  }
})
</script>

<template>
  <div class="radial-chart-wrapper">
    <vue-apex-charts
      type="radialBar"
      :height="height"
      :options="chartOptions"
      :series="series"
    ></vue-apex-charts>
  </div>
</template>

<style scoped>
.radial-chart-wrapper {
  width: 100%;
  background: white;
  border-radius: 8px;
  padding: 15px;
  box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
}
</style>
