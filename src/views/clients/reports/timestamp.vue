<template>
  <DefaultLayout title="Report Timestamps">
    <div class="container mx-auto px-4 py-8">
      <div class="flex justify-between items-center mb-6">
        <h1 class="text-2xl font-bold">
          Timestamps for Report: {{ reportData?.template_name || reportId }}
        </h1>
        <Button type="button" label="Back to Report" @click="goBack" class="bg-blue-600" />
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

      <!-- Timestamp content -->
      <div v-else class="space-y-6">
        <div class="bg-gray-50 p-4 rounded-lg mb-4">
          <p class="text-gray-700">
            <span class="font-semibold">Timestamp Source:</span> {{ timestampUrl }}
          </p>
        </div>

        <!-- Timestamp data display -->
        <div class="bg-white rounded-lg shadow overflow-hidden">
          <!-- Timestamp data table -->
          <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200">
              <thead class="bg-gray-50">
                <tr>
                  <th
                    scope="col"
                    class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Start Time
                  </th>
                  <th
                    scope="col"
                    class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    End Time
                  </th>
                  <th
                    scope="col"
                    class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Comments
                  </th>
                  <th
                    scope="col"
                    class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Jump to Video
                  </th>
                </tr>
              </thead>
              <tbody class="bg-white divide-y divide-gray-200">
                <!-- Example timestamp entries - would be dynamically loaded from the XLSX file -->
                <tr
                  v-for="(timestamp, index) in timestampEntries"
                  :key="index"
                  class="hover:bg-gray-50"
                >
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {{ timestamp.startTime }}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {{ timestamp.endTime }}
                  </td>
                  <td class="px-6 py-4 text-sm text-gray-500">
                    {{ timestamp.comments }}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap">
                    <button
                      @click="jumpToVideo(timestamp.startTime)"
                      class="px-3 py-1 bg-blue-50 text-blue-600 rounded-full hover:bg-blue-100 text-xs"
                      v-if="videoUrl"
                    >
                      Jump to Video
                    </button>
                    <span v-else class="text-xs text-gray-400">Video not available</span>
                  </td>
                </tr>

                <!-- Empty state -->
                <tr v-if="!timestampEntries || timestampEntries.length === 0">
                  <td colspan="4" class="px-6 py-10 text-center text-gray-500">
                    <p>
                      No timestamp data available. Download the template file to add timestamps.
                    </p>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Action buttons -->
          <div class="p-4 border-t">
            <div class="flex flex-wrap gap-2 mt-4">
              <button
                @click="downloadTimestampFile"
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
                Download Timestamp File
              </button>
              <button
                @click="copyTimestampUrl"
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
              <button
                @click="goToVideo"
                class="flex items-center gap-2 px-4 py-2 bg-green-50 text-green-700 rounded hover:bg-green-100"
                v-if="videoUrl"
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
                    d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                  />
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                Go to Video
              </button>
            </div>
          </div>
        </div>

        <!-- Timestamp file not found -->
        <div v-if="timestampError" class="text-center py-12 bg-gray-50 rounded-lg">
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
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <h3 class="mt-4 text-lg font-medium text-gray-900">Timestamps Not Found</h3>
          <p class="mt-1 text-gray-500">The timestamp file for this report could not be loaded.</p>
          <p class="text-sm text-gray-500 mt-4">Expected file at: {{ timestampUrl }}</p>
        </div>
      </div>
    </div>
  </DefaultLayout>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Button from '@/components/Buttons/Button.vue'
import DefaultLayout from '@/layouts/DefaultLayout.vue'
import { generateTimestampUrl, generateVideoUrl } from '@/utils/mediaLinks'
import { Reports } from '@/stores/reports'
import Toast from 'primevue/toast'

// Set up route and router
const route = useRoute()
const router = useRouter()

// Get report ID from route
const reportId = route.params.id?.toString().split('/')[0] || ''

// State
const loading = ref(true)
const error = ref('')
const timestampError = ref(false)
const reportData = ref<any>(null)

// Sample timestamp data - in a real app, this would be loaded from the XLSX file
const timestampEntries = ref([
  {
    startTime: '00:01',
    endTime: '00:05',
    comments: '3149-IBB DHA Phase III, Lahore 25-Apr-25/11:32AM'
  },
  { startTime: '00:22', endTime: '00:27', comments: 'Main door branding was not well maintained' },
  {
    startTime: '00:37',
    endTime: '00:41',
    comments: 'Notice board and deposit slip counter were well organized'
  },
  { startTime: '00:54', endTime: '00:57', comments: 'Customer was not greeted within 30 secs' },
  {
    startTime: '00:58',
    endTime: '01:14',
    comments:
      'Teller did not greet the customer and she redirected the customer to other teller who also did not greet the customer. Stains were observed on the cash counter glass'
  },
  { startTime: '01:36', endTime: '01:41', comments: 'Stains were observed on the vault door' },
  { startTime: '03:09', endTime: '03:11', comments: 'Staff did not greet the customer with smile' },
  {
    startTime: '03:25',
    endTime: '03:30',
    comments: 'RM was inquiring the basic information from the customer'
  }
])

// Computed properties
const timestampUrl = computed(() => {
  if (!reportData.value) return ''
  // First check if it has a timestamp_url property
  if (reportData.value.timestamp_url) {
    return reportData.value.timestamp_url
  }
  // Fall back to generating it
  return generateTimestampUrl(reportData.value)
})

const videoUrl = computed(() => {
  if (!reportData.value) return ''
  // First check if it has video in media_links
  if (reportData.value.media_links?.video_url) {
    return reportData.value.media_links.video_url
  }
  // Fall back to generating it
  return generateVideoUrl(reportData.value)
})

// Fetch report data
const fetchReportData = async () => {
  if (!reportId) {
    error.value = 'Invalid report ID'
    loading.value = false
    return
  }

  try {
    loading.value = true
    const report = await Reports().getReportById(reportId)
    reportData.value = report

    // In a real implementation, we would now try to fetch and parse the XLSX file
    // For now, we're using the sample data initialized above

    // Simulate loading success
    loading.value = false
  } catch (err) {
    console.error('Error fetching report:', err)
    error.value = 'Failed to load report data. Please try again.'
    loading.value = false
  }
}

// Handle timestamp loading errors
const handleTimestampError = () => {
  timestampError.value = true
  console.error('Timestamp file failed to load:', timestampUrl.value)
}

// Copy timestamp URL to clipboard
const copyTimestampUrl = () => {
  navigator.clipboard
    .writeText(timestampUrl.value)
    .then(() => {
      Toast.add({
        severity: 'success',
        summary: 'Success',
        detail: 'Timestamp URL copied to clipboard',
        life: 3000
      })
    })
    .catch((err) => {
      console.error('Failed to copy URL:', err)
      Toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to copy URL', life: 3000 })
    })
}

// Download timestamp file
const downloadTimestampFile = async () => {
  try {
    const response = await fetch(timestampUrl.value)
    if (!response.ok) {
      throw new Error(`Failed to fetch timestamp file: ${response.status}`)
    }

    const blob = await response.blob()
    const blobUrl = URL.createObjectURL(blob)

    const link = document.createElement('a')
    link.href = blobUrl
    link.download = `${reportData.value?.template_name || 'report'}_timestamps.xlsx`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    URL.revokeObjectURL(blobUrl)
    Toast.add({
      severity: 'success',
      summary: 'Success',
      detail: 'Timestamp file download started',
      life: 3000
    })
  } catch (err) {
    console.error('Error downloading timestamp file:', err)
    handleTimestampError()
    Toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Failed to download timestamp file',
      life: 3000
    })
  }
}

// Navigate to video page
const goToVideo = () => {
  router.push(`/client/report/${reportId}/video`)
}

// Jump to specific time in video
const jumpToVideo = (timeString: string) => {
  // Convert timestamp format (MM:SS) to seconds
  const parts = timeString.split(':')
  const minutes = parseInt(parts[0], 10)
  const seconds = parseInt(parts[1], 10)
  const totalSeconds = minutes * 60 + seconds

  // Store the time to jump to in localStorage
  localStorage.setItem('video_jump_time', totalSeconds.toString())

  // Navigate to video page
  goToVideo()
}

// Navigate back to report page
const goBack = () => {
  router.push(`/client/reports`)
}

// Lifecycle
onMounted(() => {
  fetchReportData()
})
</script>

<style scoped>
/* Add any custom styling here */
</style>
