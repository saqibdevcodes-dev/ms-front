<template>
  <DefaultLayout title="Report Video">
    <div class="container mx-auto px-4 py-8">
      <div class="flex justify-between items-center mb-6">
        <h1 class="text-2xl font-bold">
          Video for Report: {{ reportData?.template_name || reportId }}
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

      <!-- Video player -->
      <div v-else class="space-y-6">
        <div class="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg mb-4 shadow-sm">
          <div class="flex flex-wrap items-center gap-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-5 w-5 text-blue-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
              />
            </svg>
            <p class="text-blue-700 font-medium">
              {{ reportData?.template_name || 'Video Recording' }}
            </p>
          </div>
        </div>

        <!-- Video and timestamps layout -->
        <div class="flex flex-col lg:flex-row gap-6">
          <!-- Video container on the left -->
          <div class="w-full lg:w-7/12">
            <div class="bg-white rounded-lg shadow-md overflow-hidden">
              <div class="relative" style="padding-top: 56.25%">
                <!-- 16:9 aspect ratio -->
                <video
                  ref="videoRef"
                  class="absolute inset-0 w-full h-full"
                  controls
                  @error="handleVideoError"
                >
                  <source :src="videoUrl" type="video/mp4" />
                  Your browser does not support the video tag.
                </video>
              </div>

              <div class="p-5 border-t">
                <h3 class="font-medium text-lg mb-3 text-gray-800">
                  {{ reportData?.name || 'Report Video' }}
                </h3>

                <div class="text-sm text-gray-500 mb-4">
                  <p>
                    This video recording captures the mystery shopping evaluation for this branch
                    visit.
                  </p>
                </div>

                <!-- Video Link Display -->
                <div
                  class="mt-3 mb-4 p-3 bg-gray-50 rounded-md border border-gray-200"
                  v-if="!Auth().isClientUser()"
                >
                  <label class="block text-sm font-medium text-gray-700 mb-1">Video URL</label>
                  <div class="flex items-center">
                    <input
                      type="text"
                      readonly
                      :value="videoUrl"
                      :title="videoUrl"
                      class="flex-1 p-2 bg-white border border-gray-300 rounded-md text-sm text-gray-800 font-mono overflow-x-auto"
                      onClick="this.select();"
                    />
                    <button
                      @click="copyVideoUrl"
                      class="ml-2 p-2 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors"
                      title="Copy to clipboard"
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
                    </button>
                  </div>
                </div>

                <div class="flex flex-wrap gap-3 mt-4">
                  <button
                    @click="downloadVideo"
                    :disabled="downloadingVideo"
                    :class="[
                      'flex items-center gap-2 px-4 py-2 rounded-md transition-colors',
                      downloadingVideo
                        ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
                        : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                    ]"
                  >
                    <!-- Loading spinner when downloading -->
                    <svg
                      v-if="downloadingVideo"
                      class="animate-spin h-5 w-5"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        class="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        stroke-width="4"
                      ></circle>
                      <path
                        class="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    <!-- Download icon when not downloading -->
                    <svg
                      v-else
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
                    {{ downloadingVideo ? 'Downloading...' : 'Download Video' }}
                  </button>
                  <progress :value="downloadProgress" max="100" class="w-full"></progress>
                  <button
                    @click="copyVideoUrl"
                    v-if="!Auth().isClientUser()"
                    class="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
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

            <!-- Video not found -->
            <div
              v-if="videoError"
              class="mt-4 text-center py-12 bg-red-50 rounded-lg border border-red-100"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="h-12 w-12 mx-auto text-red-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                />
              </svg>
              <h3 class="mt-4 text-lg font-medium text-gray-900">Video Not Found</h3>
              <p class="mt-2 text-gray-600">The video for this report could not be loaded.</p>
              <p class="text-sm text-gray-500 mt-4">Expected video at: {{ displayVideoUrl }}</p>
            </div>
          </div>

          <!-- Timestamps on the right -->
          <div class="w-full lg:w-5/12">
            <div v-if="hasTimestamps" class="bg-white rounded-lg shadow-md overflow-hidden h-full">
              <div class="p-4 border-b bg-gradient-to-r from-blue-50 to-indigo-50">
                <div class="flex justify-between items-center">
                  <div class="flex items-center gap-2">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      class="h-5 w-5 text-blue-500"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <div>
                      <h3 class="font-medium text-lg text-blue-800">Video Timestamps</h3>
                      <p class="text-xs text-blue-600">
                        {{ timestampEntries.length }} timestamps available
                      </p>
                    </div>
                  </div>
                  <div class="flex gap-2">
                    <button
                      @click="downloadTimestampFile"
                      class="flex items-center gap-1 px-3 py-1.5 bg-blue-100 text-blue-700 rounded-md text-sm hover:bg-blue-200 transition-colors"
                    >
                      <svg
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
                          d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                        />
                      </svg>
                      Download XLSX
                    </button>
                    <button
                      @click="copyTimestampUrl"
                      class="flex items-center gap-1 px-3 py-1.5 bg-gray-100 text-gray-700 rounded-md text-sm hover:bg-gray-200 transition-colors"
                    >
                      <svg
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
                          d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                        />
                      </svg>
                      Copy URL
                    </button>
                  </div>
                </div>

                <!-- Timestamp Link Display -->
                <div class="mt-3 p-2 bg-blue-50 rounded-md border border-blue-200">
                  <label class="block text-xs font-medium text-blue-700 mb-1"
                    >Timestamp File URL</label
                  >
                  <div class="flex items-center">
                    <input
                      type="text"
                      readonly
                      :value="timestampUrl"
                      :title="timestampUrl"
                      class="flex-1 p-1.5 bg-white border border-blue-300 rounded-md text-xs text-gray-800 font-mono overflow-x-auto"
                      onClick="this.select();"
                    />
                    <button
                      @click="copyTimestampUrl"
                      class="ml-2 p-1.5 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors"
                      title="Copy to clipboard"
                    >
                      <svg
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
                          d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                        />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>

              <!-- Timestamp buttons -->
              <div class="p-4 overflow-y-auto max-h-[800px]">
                <!-- Loading state -->
                <div v-if="timestampLoading" class="flex justify-center items-center py-8">
                  <div
                    class="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"
                  ></div>
                  <span class="ml-2 text-sm text-blue-600">Loading timestamps...</span>
                </div>

                <div
                  v-else-if="timestampEntries && timestampEntries.length > 0"
                  class="flex flex-col gap-3"
                >
                  <button
                    v-for="(timestamp, index) in timestampEntries"
                    :key="index"
                    @click="jumpToTime(timestamp.startTime)"
                    class="flex flex-col text-left p-3.5 bg-gray-50 hover:bg-blue-50 rounded-lg border border-gray-200 hover:border-blue-200 transition-all shadow-sm hover:shadow"
                  >
                    <div class="flex items-center justify-between mb-2">
                      <span
                        class="text-blue-600 font-bold text-sm px-2 py-0.5 bg-blue-50 rounded-md"
                      >
                        {{ timestamp.startTime }} - {{ timestamp.endTime }}
                      </span>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        class="h-5 w-5 text-blue-500"
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
                    </div>
                    <p class="text-gray-600 text-sm">{{ timestamp.comments }}</p>
                  </button>
                </div>

                <!-- Empty state should not appear if hasTimestamps is true -->
              </div>
            </div>

            <!-- No timestamps available -->
            <div v-else class="bg-white rounded-lg shadow-md overflow-hidden h-full">
              <div class="p-4 border-b bg-gray-50">
                <div class="flex items-center gap-2">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    class="h-5 w-5 text-gray-500"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <h3 class="font-medium text-lg text-gray-700">Video Timestamps</h3>
                </div>
              </div>

              <div class="flex flex-col items-center justify-center p-8 text-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  class="h-16 w-16 text-gray-300 mb-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <h4 class="text-lg font-medium text-gray-700 mb-2">No Timestamps Available</h4>
                <p class="text-gray-500 mb-6 max-w-xs">
                  No timestamp data is available for this video recording.
                </p>

                <!-- Timestamp URL Display for empty state -->
                <div
                  class="w-full mb-4 p-3 bg-gray-50 rounded-md border border-gray-200"
                  v-if="!Auth().isClientUser()"
                >
                  <label class="block text-sm font-medium text-gray-700 mb-1">Timestamp URL</label>
                  <div class="flex items-center">
                    <input
                      type="text"
                      readonly
                      :value="timestampUrl"
                      :title="timestampUrl"
                      class="flex-1 p-2 bg-white border border-gray-300 rounded-md text-sm text-gray-800 font-mono overflow-x-auto"
                      onClick="this.select();"
                    />
                    <button
                      @click="copyTimestampUrl"
                      class="ml-2 p-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
                      title="Copy to clipboard"
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
                    </button>
                  </div>
                </div>

                <div class="flex gap-3" v-if="!Auth().isClientUser()">
                  <button
                    @click="createTimestampTemplate"
                    class="px-4 py-2 bg-blue-100 text-blue-700 rounded-md text-sm hover:bg-blue-200 transition-colors"
                  >
                    Download Template
                  </button>
                  <button
                    @click="copyTimestampUrl"
                    class="px-4 py-2 bg-gray-100 text-gray-700 rounded-md text-sm hover:bg-gray-200 transition-colors"
                  >
                    Copy URL
                  </button>
                </div>
              </div>
            </div>
          </div>
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
import { generateVideoUrl, generateTimestampUrl } from '@/utils/mediaLinks'
import { Reports } from '@/stores/reports'
import { Toast } from '@/utils/toast'
import * as XLSX from 'xlsx'
import { Auth } from '@/stores/auth'
import { Client } from '@/stores/client'

// Set up route and router
const route = useRoute()
const router = useRouter()

// Get report ID from route
const reportId = route.params.id?.toString().split('/')[0] || ''

// State
const loading = ref(true)
const error = ref('')
const videoError = ref(false)
const timestampError = ref(false)
const timestampLoading = ref(false)
const downloadingVideo = ref(false)
const reportData = ref<any>(null)
const videoRef = ref<HTMLVideoElement | null>(null)

// Timestamps will be loaded dynamically
const timestampEntries = ref<{ startTime: string; endTime: string; comments: string }[]>([])

// Computed properties
const videoUrl = computed(() => {
  if (!reportData.value) return ''
  console.log('Report Data:', reportData.value)
  return reportData.value.media_links?.video_url || ''
  // return generateVideoUrl(reportData.value)
})

const timestampUrl = computed(() => {
  if (!reportData.value) return 'bhosra'
  // First check if it has a timestamp_url property
  console.log('Report Data time stamps:', reportData.value)

  if (reportData.value.media_links?.timestamp_url) {
    return reportData.value.media_links.timestamp_url
  }
  if (reportData.value.timestamp_url) {
    return reportData.value.timestamp_url
  }
  // Fall back to generating it
  return generateTimestampUrl(reportData.value)
})

// Check if timestamps are available
const hasTimestamps = computed(() => {
  // In a real implementation, this would check if the timestamp file exists
  // For now, using the mock data presence to simulate this
  return !timestampError.value && timestampEntries.value && timestampEntries.value.length > 0
})

// Format URL for display (truncate in the middle if too long)
const formatUrlForDisplay = (url, maxLength = 60) => {
  if (!url || url.length <= maxLength) return url

  const start = Math.floor((maxLength - 3) / 2)
  const end = Math.ceil((maxLength - 3) / 2)

  return `${url.substring(0, start)}...${url.substring(url.length - end)}`
}

// Computed properties for display URLs
const displayVideoUrl = computed(() => formatUrlForDisplay(videoUrl.value))
const displayTimestampUrl = computed(() => formatUrlForDisplay(timestampUrl.value))

// Fetch timestamps from Excel file
const fetchTimestamps = async () => {
  if (!timestampUrl.value) {
    timestampError.value = true
    return
  }

  try {
    timestampLoading.value = true
    console.log('Fetching timestamps from:', timestampUrl.value)

    const response = await fetch(timestampUrl.value)
    if (!response.ok) {
      throw new Error(`Failed to fetch timestamp file: ${response.status}`)
    }

    // Get the Excel file as array buffer
    const arrayBuffer = await response.arrayBuffer()

    // Parse the Excel file
    const wb = XLSX.read(arrayBuffer, { type: 'array' })

    // Get the first worksheet
    const firstSheet = wb.SheetNames[0]
    const worksheet = wb.Sheets[firstSheet]

    // Convert to JSON
    const data = XLSX.utils.sheet_to_json(worksheet)

    // Map the data to the expected format
    // Assuming the Excel columns are "Start Time", "End Time", "Comments"
    const formattedData = data
      .map((row: any) => {
        return {
          startTime: row['Start Time'] || '',
          endTime: row['End Time'] || '',
          comments: row['Comments'] || ''
        }
      })
      .filter(
        (entry: { startTime: string; endTime: string; comments: string }) =>
          entry.startTime && entry.endTime
      ) // Filter out invalid entries

    timestampEntries.value = formattedData

    if (formattedData.length === 0) {
      console.warn('No valid timestamp entries found in the Excel file')
    } else {
      console.log(`Loaded ${formattedData.length} timestamp entries from Excel file`)
    }

    timestampError.value = false
  } catch (err) {
    console.error('Error loading timestamp file:', err)
    timestampError.value = true
    // Keep the entries array empty
    timestampEntries.value = []
  } finally {
    timestampLoading.value = false
  }
}

// Create a template Excel file for timestamps
const createTimestampTemplate = () => {
  // Create a new workbook
  const wb = XLSX.utils.book_new()

  // Create data with headers and a sample row
  const data = [
    {
      'Start Time': 'MM:SS',
      'End Time': 'MM:SS',
      Comments: 'Description of what happens in this time range'
    },
    {
      'Start Time': '00:15',
      'End Time': '00:30',
      Comments: 'Sample entry - customer enters branch'
    }
  ]

  // Create worksheet from data
  const ws = XLSX.utils.json_to_sheet(data)

  // Add the worksheet to the workbook
  XLSX.utils.book_append_sheet(wb, ws, 'Timestamps')

  // Generate XLSX file
  const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })

  // Convert to Blob
  const blob = new Blob([excelBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  })

  // Create URL and initiate download
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = 'timestamp_template.xlsx'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)

  Toast.success('Timestamp template downloaded')
}

// Fetch report data
const fetchReportData = async () => {
  if (!reportId) {
    error.value = 'Invalid report ID'
    loading.value = false
    return
  }

  try {
    loading.value = true

    // Get client_id from query parameters if available
    const clientId = route.query.client_id as string

    // If client_id is provided in query, temporarily set it in Client store
    if (clientId) {
      const clientStore = Client()
      // Set the client_id temporarily for this request
      clientStore.selected_client = { uuid: clientId }
    }

    const report = await Reports().getReportById(reportId)
    reportData.value = report

    // After loading report data, try to fetch timestamps
    await fetchTimestamps()
  } catch (err) {
    console.error('Error fetching report:', err)
    error.value = 'Failed to load report data. Please try again.'
  } finally {
    loading.value = false
  }
}

// Handle video loading errors
const handleVideoError = () => {
  videoError.value = true
  console.error('Video failed to load:', videoUrl.value)
}

// Copy video URL to clipboard
const copyVideoUrl = () => {
  navigator.clipboard
    .writeText(videoUrl.value)
    .then(() => {
      Toast.success('Video URL copied to clipboard')
    })
    .catch((err) => {
      console.error('Failed to copy URL:', err)
      Toast.error('Failed to copy URL')
    })
}

// Copy timestamp URL to clipboard
const copyTimestampUrl = () => {
  navigator.clipboard
    .writeText(timestampUrl.value)
    .then(() => {
      Toast.success('Timestamp URL copied to clipboard')
    })
    .catch((err) => {
      console.error('Failed to copy timestamp URL:', err)
      Toast.error('Failed to copy timestamp URL')
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
    Toast.success('Timestamp file download started')
  } catch (err) {
    console.error('Error downloading timestamp file:', err)
    Toast.error('Failed to download timestamp file')
    timestampError.value = true
  }
}

// Download video
// const downloadVideo = async () => {
//   console.log('reportData.value', reportData.value)
//   if (!videoUrl.value) {
//     Toast.error('Video URL not available')
//     return
//   }

//   try {
//     downloadingVideo.value = true
//     Toast.info('Starting video download...')

//     const response = await fetch(videoUrl.value)

//     if (!response.ok) {
//       throw new Error(`Failed to fetch video: ${response.status} ${response.statusText}`)
//     }

//     const blob = await response.blob()
//     const blobUrl = URL.createObjectURL(blob)

//     const link = document.createElement('a')
//     link.href = blobUrl
//     console.log('reportData.value', reportData.value)
//     link.download = `${reportData.value?.primary_field_value || 'report'}_video.mp4` // Assuming mp4, adjust if needed
//     document.body.appendChild(link)
//     link.click()
//     document.body.removeChild(link)

//     URL.revokeObjectURL(blobUrl)
//     Toast.success('Video download completed successfully')
//   } catch (err) {
//     console.error('Error downloading video:', err)
//     Toast.error('Failed to download video. Please try again.')
//   } finally {
//     downloadingVideo.value = false
//   }
// }

const downloadVideo = async () => {
  console.log('reportData.value', reportData.value)
  if (!videoUrl.value) {
    Toast.error('Video URL not available')
    return
  }

  try {
    downloadingVideo.value = true
    Toast.info('Starting video download...')

    const response = await fetch(videoUrl.value)

    if (!response.ok) {
      throw new Error(`Failed to fetch video: ${response.status} ${response.statusText}`)
    }

    // Get total size from headers (if available)
    const contentLength = response.headers.get('Content-Length')
    if (!contentLength) {
      console.warn('Content-Length not available, progress may not be accurate')
    }

    const total = contentLength ? parseInt(contentLength, 10) : 0
    let loaded = 0

    // Read the stream manually
    const reader = response.body.getReader()
    const chunks = []
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      chunks.push(value)
      loaded += value.length

      // Update progress bar here
      const percent = total ? Math.round((loaded / total) * 100) : null
      if (percent !== null) {
        console.log(`Download progress: ${percent}%`)
        // Example: update a reactive variable for your progress bar
        downloadProgress.value = percent
      }
    }

    // Combine chunks into a blob
    const blob = new Blob(chunks)
    const blobUrl = URL.createObjectURL(blob)

    const link = document.createElement('a')
    link.href = blobUrl
    link.download = `${reportData.value?.primary_field_value || 'report'}_video.mp4`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    URL.revokeObjectURL(blobUrl)
    Toast.success('Video download completed successfully')
  } catch (err) {
    console.error('Error downloading video:', err)
    Toast.error('Failed to download video. Please try again.')
  } finally {
    downloadingVideo.value = false
    downloadProgress.value = 0 // reset progress bar
  }
}

// Jump to specific time in video
const jumpToTime = (timeString: string) => {
  if (!videoRef.value) return

  // Convert timestamp format (MM:SS) to seconds
  const parts = timeString.split(':')
  const minutes = parseInt(parts[0], 10)
  const seconds = parseInt(parts[1], 10)
  const totalSeconds = minutes * 60 + seconds

  // Set video time
  videoRef.value.currentTime = totalSeconds

  // Play the video
  videoRef.value.play().catch((err) => console.error('Error playing video:', err))
}

// Navigate back to report page
const goBack = () => {
  if (Auth().isClientUser()) {
    router.push(`/client/user-reports`)
  } else {
    router.push(`/client/reports`)
  }
}

// Lifecycle
onMounted(() => {
  fetchReportData()

  // Check for jump time in localStorage
  const jumpToTime = localStorage.getItem('video_jump_time')
  if (jumpToTime) {
    // Wait for video to be fully loaded
    const checkVideoReady = setInterval(() => {
      if (videoRef.value && videoRef.value.readyState >= 2) {
        // Set video time to jump time
        videoRef.value.currentTime = parseInt(jumpToTime, 10)
        // Clear the stored jump time
        localStorage.removeItem('video_jump_time')
        // Play the video
        videoRef.value.play().catch((err) => console.error('Error playing video:', err))
        // Clear the interval
        clearInterval(checkVideoReady)
      }
    }, 200)

    // Failsafe: Clear interval after 10 seconds if video never loads
    setTimeout(() => {
      clearInterval(checkVideoReady)
      localStorage.removeItem('video_jump_time')
    }, 10000)
  }
})
</script>

<style scoped>
/* Add any custom styling here */
/* REMOVED: video::-webkit-media-controls-panel styling that caused whitish overlay */

/* Completely disable any hover effects on video element */
video {
  transition: none !important;
  filter: none !important;
  opacity: 1 !important;
}

video:hover {
  transition: none !important;
  filter: none !important;
  opacity: 1 !important;
  transform: none !important;
  background: none !important;
  background-color: transparent !important;
}

button {
  transition: all 0.2s ease;
}

button:hover {
  transform: translateY(-1px);
}

button:active {
  transform: translateY(1px);
}
</style>
