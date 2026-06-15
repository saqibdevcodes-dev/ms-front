<template>
  <div class="loader-container" :class="{ overlay }" role="status" aria-live="polite">
    <div class="loader-content">
      <div :class="['spinner-wrapper', sizeClass]">
        <svg class="spinner" viewBox="0 0 50 50">
          <circle class="path" cx="25" cy="25" r="20" fill="none" stroke-width="4" />
        </svg>
      </div>
      <div v-if="text" class="loader-text" :class="textSizeClass">
        {{ text }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface LoaderProps {
  size?: 'sm' | 'md' | 'lg'
  text?: string
  overlay?: boolean
}

const props = withDefaults(defineProps<LoaderProps>(), {
  size: 'md',
  text: '',
  overlay: false
})

const sizeClass = computed(() => `spinner-${props.size}`)

const textSizeClass = computed(() => {
  return {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base'
  }[props.size]
})
</script>

<style scoped>
.loader-container {
  position: fixed; /* 👈 fixed position */
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 100vw;
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
}

.overlay {
  background-color: rgba(255, 255, 255, 0.8);
  z-index: 1000;
}

.loader-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.spinner-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
}

.spinner-sm {
  width: 20px;
  height: 20px;
}

.spinner-md {
  width: 40px;
  height: 40px;
}

.spinner-lg {
  width: 60px;
  height: 60px;
}

.spinner {
  animation: rotate 2s linear infinite;
  transform-origin: center center;
  width: 100%;
  height: 100%;
}

.path {
  stroke: var(--loader-stroke-color, #3b82f6); /* Default: Blue-500 */
  stroke-dasharray: 90, 150;
  stroke-dashoffset: 0;
  stroke-linecap: round;
  animation: dash 1.5s ease-in-out infinite;
}

.loader-text {
  margin-top: 0.5rem;
  color: #4b5563; /* Gray-600 */
  font-weight: 500;
  text-align: center;
}

@keyframes rotate {
  100% {
    transform: rotate(360deg);
  }
}

@keyframes dash {
  0% {
    stroke-dasharray: 1, 150;
    stroke-dashoffset: 0;
  }
  50% {
    stroke-dasharray: 90, 150;
    stroke-dashoffset: -35;
  }
  100% {
    stroke-dasharray: 90, 150;
    stroke-dashoffset: -124;
  }
}
</style>
