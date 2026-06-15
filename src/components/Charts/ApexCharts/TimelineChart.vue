<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import VueApexCharts from 'vue3-apexcharts'

const props = defineProps({
  series: {
    type: Array,
    required: true
  },
  height: {
    type: String,
    default: '350px'
  },
  title: {
    type: String,
    default: ''
  },
  colors: {
    type: Array,
    default: () => ['#008FFB', '#00E396', '#FEB019', '#FF4560', '#775DD0']
  }
})

const chartOptions = computed(() => {
  return {
    chart: {
      type: 'rangeBar',
      height: 350,
      toolbar: {
        show: true
      }
    },
    plotOptions: {
      bar: {
        horizontal: true,
        barHeight: '80%'
      }
    },
    xaxis: {
      type: 'datetime'
    },
    stroke: {
      width: 1
    },
    fill: {
      type: 'solid',
      opacity: 0.6
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
    legend: {
      position: 'top'
    },
    colors: props.colors,
    tooltip: {
      x: {
        format: 'dd MMM yyyy'
      }
    }
  }
})
</script>

<template>
  <div class="timeline-chart-wrapper">
    <vue-apex-charts
      type="rangeBar"
      :height="height"
      :options="chartOptions"
      :series="series"
    ></vue-apex-charts>
  </div>
</template>

<style scoped>
.timeline-chart-wrapper {
  width: 100%;
  background: white;
  border-radius: 8px;
  padding: 15px;
  box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
}
</style>
