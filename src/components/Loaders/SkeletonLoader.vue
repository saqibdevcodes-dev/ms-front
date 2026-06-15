<script setup lang="ts">
import { defineProps } from 'vue'

const props = defineProps({
  height: {
    type: String,
    default: '100px'
  },
  width: {
    type: String,
    default: '100%'
  },
  borderRadius: {
    type: String,
    default: '0.5rem'
  }
})
</script>

<template>
  <div
    class="skeleton-loader animate-pulse"
    :style="{
      height: props.height,
      width: props.width,
      borderRadius: props.borderRadius
    }"
  ></div>
</template>

<style scoped>
.skeleton-loader {
  background-color: #e2e8f0;
  position: relative;
  overflow: hidden;
}

.skeleton-loader::after {
  content: '';
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.4), transparent);
  animation: shimmer 1.5s infinite;
}

@keyframes shimmer {
  0% {
    transform: translateX(-100%);
  }
  100% {
    transform: translateX(100%);
  }
}
</style>
