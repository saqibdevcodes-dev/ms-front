<script setup lang="ts">
// Define props with TypeScript
defineProps({
  size: {
    type: String,
    default: 'medium', // small, medium, large
    validator: (value: string) => ['small', 'medium', 'large'].includes(value)
  },
  color: {
    type: String,
    default: 'primary', // primary, white, gray
    validator: (value: string) => ['primary', 'white', 'gray'].includes(value)
  },
  type: {
    type: String,
    default: 'border', // border, dots, pulse
    validator: (value: string) => ['border', 'dots', 'pulse'].includes(value)
  }
})

// Computed properties to determine classes based on props
</script>

<template>
  <div :class="['loading-spinner', `spinner-${size}`, `spinner-${color}`, `spinner-${type}`]">
    <!-- Border spinner (default) -->
    <div v-if="type === 'border'" class="border-spinner"></div>

    <!-- Dots spinner -->
    <div v-else-if="type === 'dots'" class="dots-spinner">
      <div></div>
      <div></div>
      <div></div>
    </div>

    <!-- Pulse spinner -->
    <div v-else-if="type === 'pulse'" class="pulse-spinner"></div>
  </div>
</template>

<style scoped>
/* Base spinner styles */
.loading-spinner {
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

/* Border Spinner (Clean circular loader) */
.border-spinner {
  border-radius: 50%;
  border-style: solid;
  border-top-color: transparent !important;
  animation: spin 0.8s linear infinite;
}

/* Size variations for border spinner */
.spinner-small .border-spinner {
  width: 1rem;
  height: 1rem;
  border-width: 2px;
}

.spinner-medium .border-spinner {
  width: 1.5rem;
  height: 1.5rem;
  border-width: 2px;
}

.spinner-large .border-spinner {
  width: 2.5rem;
  height: 2.5rem;
  border-width: 3px;
}

/* Color variations for border spinner */
.spinner-primary .border-spinner {
  border-color: var(--p-primary-200);
  border-top-color: var(--p-primary-500);
}

.spinner-white .border-spinner {
  border-color: rgba(255, 255, 255, 0.3);
  border-top-color: white;
}

.spinner-gray .border-spinner {
  border-color: #e5e7eb;
  border-top-color: #6b7280;
}

/* Dots Spinner (Three bouncing dots) */
.dots-spinner {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.dots-spinner > div {
  width: 0.5rem;
  height: 0.5rem;
  border-radius: 50%;
  animation: bounce 1.4s infinite ease-in-out both;
}

.dots-spinner > div:nth-child(1) {
  animation-delay: -0.32s;
}

.dots-spinner > div:nth-child(2) {
  animation-delay: -0.16s;
}

/* Size variations for dots spinner */
.spinner-small .dots-spinner > div {
  width: 0.25rem;
  height: 0.25rem;
}

.spinner-medium .dots-spinner > div {
  width: 0.4rem;
  height: 0.4rem;
}

.spinner-large .dots-spinner > div {
  width: 0.6rem;
  height: 0.6rem;
}

/* Color variations for dots spinner */
.spinner-primary .dots-spinner > div {
  background-color: var(--p-primary-500);
}

.spinner-white .dots-spinner > div {
  background-color: white;
}

.spinner-gray .dots-spinner > div {
  background-color: #6b7280;
}

/* Pulse Spinner (Pulsating circle) */
.pulse-spinner {
  width: 1rem;
  height: 1rem;
  border-radius: 50%;
  animation: pulse 1.2s infinite cubic-bezier(0.4, 0, 0.6, 1);
}

/* Size variations for pulse spinner */
.spinner-small .pulse-spinner {
  width: 0.75rem;
  height: 0.75rem;
}

.spinner-medium .pulse-spinner {
  width: 1.25rem;
  height: 1.25rem;
}

.spinner-large .pulse-spinner {
  width: 2rem;
  height: 2rem;
}

/* Color variations for pulse spinner */
.spinner-primary .pulse-spinner {
  background-color: var(--p-primary-500);
}

.spinner-white .pulse-spinner {
  background-color: white;
}

.spinner-gray .pulse-spinner {
  background-color: #6b7280;
}

/* Animations */
@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

@keyframes bounce {
  0%,
  80%,
  100% {
    transform: scale(0);
    opacity: 0.5;
  }
  40% {
    transform: scale(1);
    opacity: 1;
  }
}

@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}
</style>
