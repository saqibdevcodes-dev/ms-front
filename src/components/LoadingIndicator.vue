<script setup lang="ts">
defineProps({
  loading: {
    type: Boolean,
    default: false
  },
  text: {
    type: String,
    default: 'Loading data...'
  },
  fullScreen: {
    type: Boolean,
    default: false
  },
  overlay: {
    type: Boolean,
    default: false
  },
  size: {
    type: String,
    default: 'md', // 'sm', 'md', 'lg'
    validator: (value: string) => ['sm', 'md', 'lg'].includes(value)
  }
})

const getSpinnerClasses = (size: string): string => {
  if (size === 'sm') return 'h-6 w-6'
  if (size === 'lg') return 'h-16 w-16'
  return 'h-10 w-10' // Default md
}

const getContainerClasses = (fullScreen: boolean, overlay: boolean): string => {
  let classes = 'flex flex-col items-center justify-center gap-4'

  if (fullScreen) {
    classes += ' fixed inset-0 z-50'
  }

  if (overlay) {
    classes += fullScreen
      ? ' bg-black bg-opacity-40 backdrop-blur-sm'
      : ' bg-white bg-opacity-90 rounded-lg p-6 shadow-lg'
  }

  return classes
}
</script>

<template>
  <div v-if="loading" :class="getContainerClasses(fullScreen, overlay)">
    <div class="relative">
      <svg
        :class="getSpinnerClasses(size)"
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
        class="animate-spin text-blue-600"
        fill="none"
      >
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
        <path
          class="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
    </div>
    <div v-if="text" class="bg-white bg-opacity-80 px-4 py-2 rounded-full shadow-md">
      <span class="text-gray-800 font-medium">{{ text }}</span>
    </div>
  </div>
</template>
