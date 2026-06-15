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
    default: () => ['#775DD0', '#FF4560', '#00E396', '#FEB019']
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
        track: {
          background: '#f2f2f2',
          strokeWidth: '97%',
          margin: 5,
          shadow: {
            enabled: true,
            top: 2,
            left: 0,
            color: '#999',
            opacity: 1,
            blur: 2
          }
        },
        dataLabels: {
          name: {
            show: true,
            fontSize: '16px',
            fontFamily: undefined,
            fontWeight: 600,
            color: undefined,
            offsetY: -10
          },
          value: {
            show: true,
            fontSize: '14px',
            fontFamily: undefined,
            fontWeight: 400,
            color: undefined,
            offsetY: 16,
            formatter: function (val) {
              return val + '%'
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
    fill: {
      type: 'gradient',
      gradient: {
        shade: 'dark',
        type: 'horizontal',
        shadeIntensity: 0.5,
        gradientToColors: undefined,
        inverseColors: true,
        opacityFrom: 1,
        opacityTo: 1,
        stops: [0, 50, 100],
        colorStops: []
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
