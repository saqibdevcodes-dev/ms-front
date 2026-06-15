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
    default: () => ['#FF4560', '#008FFB', '#FEB019', '#00E396']
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
        dataLabels: {
          name: {
            fontSize: '22px'
          },
          value: {
            fontSize: '16px'
          },
          total: {
            show: true,
            label: 'Total',
            formatter: function (w) {
              return props.series.reduce((a, b) => a + b, 0)
            }
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
      position: 'bottom'
    }
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
