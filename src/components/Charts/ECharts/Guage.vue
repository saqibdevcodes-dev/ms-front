<script setup lang="ts">
import { ref, onMounted, computed, watch, nextTick } from 'vue'
import * as echarts from 'echarts/core'
import { GaugeChart } from 'echarts/charts'
import {
  GridComponent,
  TooltipComponent,
  TitleComponent,
  LegendComponent
} from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'

echarts.use([
  GaugeChart,
  GridComponent,
  TooltipComponent,
  TitleComponent,
  LegendComponent,
  CanvasRenderer
])

const props = defineProps({
  value: {
    type: Number,
    required: true
  },
  min: {
    type: Number,
    default: 0
  },
  max: {
    type: Number,
    default: 100
  },
  title: {
    type: String,
    default: ''
  },
  height: {
    type: String,
    default: '350px'
  },
  color: {
    type: Array,
    default: () => ['#5470c6', '#91cc75', '#fac858']
  }
})

const chartContainer = ref(null)
const chartInstance = ref(null)

// Initialize chart on mount
onMounted(() => {
  nextTick(() => {
    initChart()
  })
})

// Watch for changes in props to update chart
watch([() => props.value, () => props.title], () => {
  if (chartInstance.value) {
    updateChart()
  }
})

// Clean up chart on unmount
const onUnmounted = () => {
  if (chartInstance.value) {
    chartInstance.value.dispose()
  }
}

// Initialize the chart
const initChart = () => {
  if (chartContainer.value) {
    chartInstance.value = echarts.init(chartContainer.value)
    updateChart()

    // Handle resize
    window.addEventListener('resize', () => {
      if (chartInstance.value) {
        chartInstance.value.resize()
      }
    })
  }
}

// Update chart with current options
const updateChart = () => {
  const option = {
    title: {
      text: props.title,
      left: 'center'
    },
    tooltip: {
      formatter: '{a} <br/>{b} : {c}%'
    },
    series: [
      {
        name: 'Gauge',
        type: 'gauge',
        detail: {
          formatter: '{value}%',
          fontSize: 18
        },
        data: [
          {
            value: props.value,
            name: 'Score'
          }
        ],
        min: props.min,
        max: props.max,
        axisLine: {
          lineStyle: {
            width: 30,
            color: [
              [0.3, props.color[0]],
              [0.7, props.color[1]],
              [1, props.color[2]]
            ]
          }
        }
      }
    ]
  }

  chartInstance.value.setOption(option)
}
</script>

<template>
  <div class="gauge-chart-wrapper">
    <div ref="chartContainer" :style="{ height: height, width: '100%' }"></div>
  </div>
</template>

<style scoped>
.gauge-chart-wrapper {
  width: 100%;
  background: white;
  border-radius: 8px;
  padding: 15px;
  box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
}
</style>
