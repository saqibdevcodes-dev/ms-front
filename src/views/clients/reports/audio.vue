<template>
  <DefaultLayout title="Report Audio">
    <div class="container mx-auto px-4 py-8">
      <div class="flex justify-between items-center mb-6">
        <h1 class="text-2xl font-bold">
          Audio for Report: {{ reportData?.template_name || reportId }}
        </h1>
        <div class="flex gap-2">
          <Button
            type="button"
            label="🔄 Refresh"
            @click="refreshData"
            class="bg-green-600 hover:bg-green-700"
            :disabled="loading"
          />
          <Button type="button" label="Back to Report" @click="goBack" class="bg-blue-600" />
        </div>
      </div>

      <!-- Loading state -->
      <div v-if="loading" class="flex justify-center items-center py-12">
        <div
          class="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"
        ></div>
      </div>

      <!-- Error state -->
      <div v-else-if="error" class="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg">
        <p>{{ error }}</p>
      </div>
      <!-- Audio player -->
      <div v-else class="space-y-6">
        <div class="bg-gray-50 p-4 rounded-lg mb-4">
          <p class="text-gray-700">
            <span v-if="!Auth().isClientUser() && !CallUser" class="font-semibold"
              >Audio Source:

              {{ audioUrl }}
            </span>
            <span v-else-if="!Auth().isClientUser()" class="font-semibold"
              >Audio Source:
              {{ audioUrl }}
            </span>
          </p>
        </div>

        <div class="bg-white rounded-lg shadow overflow-hidden">
          <div class="p-6">
            <div class="mb-6 flex items-center justify-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="h-24 w-24 text-blue-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                />
              </svg>
            </div>

            <h3 class="font-medium text-lg text-center mb-6">
              {{ reportData?.name || 'Report Audio' }}
            </h3>

            <audio
              ref="audioRef"
              :key="audioUrl"
              class="w-full mb-4"
              controls
              @error="handleAudioError"
              @loadstart="() => (audioError = false)"
            >
              <source v-if="!CallUser" :src="audioUrl" type="audio/mpeg" />
              <source v-else :src="reportData?.media_links?.audio_url" type="audio/mpeg" />
              Your browser does not support the audio element.
            </audio>

            <div class="flex flex-wrap gap-2 mt-6 justify-center">
              <button
                @click="downloadAudio"
                class="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded hover:bg-blue-100"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  class="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                  />
                </svg>
                Download Audio
              </button>
              <button
                @click="copyAudioUrl"
                class="flex items-center gap-2 px-4 py-2 bg-gray-50 text-gray-700 rounded hover:bg-gray-100"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  class="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                  />
                </svg>
                Copy Link
              </button>
            </div>
          </div>
        </div>

        <!-- Audio not found -->
        <div v-if="audioError" class="text-center py-12 bg-gray-50 rounded-lg">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-12 w-12 mx-auto text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
            />
          </svg>
          <h3 class="mt-4 text-lg font-medium text-gray-900">Audio Not Found</h3>
          <p class="mt-1 text-gray-500">The audio for this report could not be loaded.</p>
          <p class="text-sm text-gray-500 mt-4">Expected audio at: {{ audioUrl }}</p>
        </div>
      </div>
    </div>
  </DefaultLayout>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Button from '@/components/Buttons/Button.vue'
import DefaultLayout from '@/layouts/DefaultLayout.vue'
import { Reports } from '@/stores/reports'
import Toast from 'primevue/toast'
import { Auth } from '@/stores/auth'

const CallUser = computed(() => {
  const authStore = Auth()

  // Ensure user data is loaded before checking
  if (!authStore.user) {
    console.log('🔍 User data not yet loaded in isCallCenterUser')
    return false
  }

  const userEmail = authStore.user?.email || ''
  const isCallUser = userEmail.toLowerCase().includes('call')
  console.log(`🔍 isCallCenterUser check: email="${userEmail}", isCallUser=${isCallUser}`)
  return isCallUser
})

// Set up route and router
const route = useRoute()
const router = useRouter()

// Get report ID from route
const reportId = route.params.id?.toString().split('/')[0] || ''

// State
const loading = ref(true)
const error = ref('')
const audioError = ref(false)
const reportData = ref<any>(null)
const audioRef = ref<HTMLAudioElement | null>(null)

// Computed properties
const audioUrl = computed(() => {
  if (!reportData.value) return ''
  const baseUrl = reportData.value?.audio_url || reportData.value?.media_links?.audio_url
  if (!baseUrl) return ''

  // Add cache-busting parameter to prevent browser caching
  const separator = baseUrl.includes('?') ? '&' : '?'
  return `${baseUrl}${separator}t=${Date.now()}`
})

// Fetch report data
const fetchReportData = async (forceRefresh = true) => {
  if (!reportId) {
    error.value = 'Invalid report ID'
    loading.value = false
    return
  }

  try {
    loading.value = true
    console.log('🔄 Fetching audio report data with forceRefresh:', forceRefresh)
    const report = await Reports().getReportById(reportId, null, { forceRefresh })
    reportData.value = report
    console.log('✅ Audio report data fetched:', report?.audio_url)
  } catch (err) {
    console.error('Error fetching report:', err)
    error.value = 'Failed to load report data. Please try again.'
  } finally {
    loading.value = false
  }
}

// Handle audio loading errors
const handleAudioError = () => {
  audioError.value = true
  console.error('Audio failed to load:', audioUrl.value)
}

// Copy audio URL to clipboard
const copyAudioUrl = () => {
  navigator.clipboard
    .writeText(audioUrl.value)
    .then(() => {
      Toast.add({
        severity: 'success',
        summary: 'Success',
        detail: 'Audio URL copied to clipboard',
        life: 3000
      })
    })
    .catch((err) => {
      console.error('Failed to copy URL:', err)
      Toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to copy URL', life: 3000 })
    })
}

// Download audio
const downloadAudio = async () => {
  try {
    const response = await fetch(audioUrl.value)
    const blob = await response.blob()
    const blobUrl = URL.createObjectURL(blob)

    const link = document.createElement('a')
    link.href = blobUrl
    link.download = `${reportData.value?.name || 'report'}_audio.mp3` // Assuming mp3, adjust if needed
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    URL.revokeObjectURL(blobUrl)
    Toast.add({
      severity: 'success',
      summary: 'Success',
      detail: 'Audio download started',
      life: 3000
    })
  } catch (err) {
    console.error('Error downloading audio:', err)
    Toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Failed to download audio',
      life: 3000
    })
  }
}

// Navigate back to report page
const goBack = () => {
  router.push(`/client/reports`)
}

// Watch for route changes to refresh data when URL changes
watch(
  () => route.params.id,
  (newId, oldId) => {
    if (newId !== oldId && newId) {
      console.log('🔄 Route changed, refreshing audio data...')
      fetchReportData(true)
    }
  },
  { immediate: false }
)

// Manual refresh function
const refreshData = () => {
  console.log('🔄 Manual refresh triggered')
  fetchReportData(true)
}

// Lifecycle
onMounted(() => {
  fetchReportData(true)
})
</script>

<style scoped>
/* Add any custom styling here */
</style>
