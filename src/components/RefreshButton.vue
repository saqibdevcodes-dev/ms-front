<script setup lang="ts">
import { ref } from 'vue'
import Button from '@/components/Buttons/Button.vue'
import { Toast } from '@/utils/toast'

const props = defineProps({
  refreshFunction: {
    type: Function,
    required: true
  },
  buttonText: {
    type: String,
    default: 'Refresh'
  },
  buttonClass: {
    type: String,
    default: 'bg-blue-500 hover:bg-blue-600 text-white'
  },
  successMessage: {
    type: String,
    default: 'Data refreshed successfully'
  },
  errorMessage: {
    type: String,
    default: 'Failed to refresh data'
  },
  showToast: {
    type: Boolean,
    default: true
  },
  showIcon: {
    type: Boolean,
    default: true
  },
  size: {
    type: String,
    default: 'md', // 'sm', 'md', 'lg'
    validator: (value) => ['sm', 'md', 'lg'].includes(value)
  }
})

const isRefreshing = ref(false)

const getButtonClasses = () => {
  const baseClasses = `${props.buttonClass} flex items-center gap-2`
  const sizeClasses =
    props.size === 'sm'
      ? 'text-xs py-1 px-2'
      : props.size === 'lg'
        ? 'text-base py-3 px-5'
        : 'text-sm py-2 px-4'

  return `${baseClasses} ${sizeClasses}`
}

const refresh = async () => {
  if (isRefreshing.value) return

  try {
    isRefreshing.value = true
    await props.refreshFunction()

    if (props.showToast) {
      Toast.success(props.successMessage)
    }
  } catch (error) {
    console.error('Error in RefreshButton:', error)

    if (props.showToast) {
      Toast.error(props.errorMessage)
    }
  } finally {
    isRefreshing.value = false
  }
}
</script>

<template>
  <Button :type="'button'" @click="refresh" :class="getButtonClasses()" :loading="isRefreshing">
    <svg
      v-if="showIcon"
      xmlns="http://www.w3.org/2000/svg"
      class="h-4 w-4"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="2"
        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
      />
    </svg>
    <span>{{ buttonText }}</span>
  </Button>
</template>
