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
      type: 'pie',
      toolbar: {
        show: true
      }
    },
    labels: props.labels,
    colors: props.colors,
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
        type: 'vertical',
        shadeIntensity: 0.5,
        gradientToColors: undefined,
        inverseColors: true,
        opacityFrom: 1,
        opacityTo: 0.8,
        stops: [0, 100]
      }
    },
    dataLabels: {
      enabled: true,
      style: {
        fontSize: '14px',
        fontFamily: 'Helvetica, Arial, sans-serif',
        fontWeight: 'bold'
      },
      dropShadow: {
        enabled: true,
        top: 1,
        left: 1,
        blur: 1,
        color: 'rgba(0,0,0,0.3)',
        opacity: 0.3
      }
    },
    stroke: {
      width: 1,
      colors: ['#fff']
    },
    legend: {
      position: 'bottom',
      fontSize: '14px',
      fontFamily: 'Helvetica, Arial, sans-serif',
      fontWeight: 400
    },
    responsive: [
      {
        breakpoint: 480,
        options: {
          chart: {
            width: 300
          },
          legend: {
            position: 'bottom'
          }
        }
      }
    ]
  }
})
</script>

<template>
  <div class="pie-chart-wrapper">
    <vue-apex-charts
      type="pie"
      :height="height"
      :options="chartOptions"
      :series="series"
    ></vue-apex-charts>
  </div>
</template>

<style scoped>
.pie-chart-wrapper {
  width: 100%;
  background: white;
  border-radius: 8px;
  padding: 15px;
  box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
}
</style> 