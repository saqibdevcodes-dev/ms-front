<script setup lang="ts">
import { Toast } from '@/utils/toast'

function testToasts() {
  Toast.success('Success toast message')

  setTimeout(() => {
    Toast.error('Error toast message')
  }, 1500)

  setTimeout(() => {
    Toast.info('Info toast message')
  }, 3000)

  setTimeout(() => {
    Toast.warning('Warning toast message')
  }, 4500)
}
</script>

<template>
  <div class="flex flex-col items-center p-8 bg-white rounded-lg shadow-md">
    <h2 class="text-xl font-semibold mb-4">Toast Testing Component</h2>
    <p class="mb-4 text-gray-600">Click the button below to test various toast notifications</p>

    <button
      @click="testToasts"
      class="bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded-md transition-colors"
    >
      Show All Toasts
    </button>
  </div>
</template>
