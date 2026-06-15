<template>
  <DefaultLayout title="Report Pictures">
    <div class="container mx-auto px-4 py-8">
      <div class="flex justify-between items-center mb-6">
        <h1 class="text-2xl font-bold">
          Pictures for Report: {{ reportData?.template_name || reportId }}
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

      <!-- Picture gallery -->
      <div v-else class="space-y-6">
        <!-- Image count and info -->
        <div class="bg-gray-50 p-4 rounded-lg mb-4">
          <p class="text-gray-700">
            <span class="font-semibold">{{ pictureUrls.length }}</span>
            {{ pictureUrls.length === 1 ? 'picture' : 'pictures' }} available for this report.
          </p>
          <p class="text-sm text-gray-500 mt-1">Pictures are stored at: {{ pictureBasePath }}</p>
        </div>

        <!-- Picture grid -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div
            v-for="(url, index) in pictureUrls"
            :key="index"
            class="bg-white rounded-lg overflow-hidden shadow"
          >
            <div class="relative pb-[75%]">
              <img
                :src="url"
                :alt="`Picture ${index + 1}`"
                class="absolute inset-0 w-full h-full object-cover"
                @error="handleImageError($event, index)"
              />
            </div>
            <div class="p-3">
              <h3 class="font-medium">Picture {{ index + 1 }}</h3>
              <div class="flex justify-between items-center mt-2">
                <a
                  :href="url"
                  target="_blank"
                  class="text-blue-600 text-sm hover:underline flex items-center"
                >
                  View Full Size
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    class="h-4 w-4 ml-1"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                    />
                  </svg>
                </a>
                <button
                  @click="downloadImage(url, `picture_${index + 1}`)"
                  class="text-gray-600 hover:text-gray-900"
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
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- No pictures message -->
        <div v-if="pictureUrls.length === 0" class="text-center py-12 bg-gray-50 rounded-lg">
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
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          <h3 class="mt-4 text-lg font-medium text-gray-900">No Pictures Found</h3>
          <p class="mt-1 text-gray-500">There are no pictures associated with this report.</p>
        </div>
      </div>
    </div>
  </DefaultLayout>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, defineComponent } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Button from '@/components/Buttons/Button.vue'
import DefaultLayout from '@/layouts/DefaultLayout.vue'
import { generatePictureUrls, generateBaseMediaUrl } from '@/utils/mediaLinks'
import { Reports } from '@/stores/reports'
import { Toast } from '@/utils/toast'

// Define component name
defineComponent({
  name: 'ReportPictures'
})

// Set up route and router
const route = useRoute()
const router = useRouter()

// Get report ID from route
const reportId = route.params.id?.toString().split('/')[0] || ''

// State
const loading = ref(true)
const error = ref('')
const reportData = ref<any>(null)
const pictureUrls = ref<string[]>([])
const failedImages = ref<Set<number>>(new Set())

// Computed properties
const pictureBasePath = computed(() => {
  if (!reportData.value) return ''
  const baseUrl = generateBaseMediaUrl(reportData.value)
  const primaryValue = getPrimaryValue(reportData.value)
  return `${baseUrl}/img/${primaryValue}`
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

    // Generate picture URLs dynamically based on report structure
    pictureUrls.value = generatePictureUrls(report)

    if (pictureUrls.value.length === 0) {
      error.value = 'No images found for this report'
    }
  } catch (err) {
    console.error('Error fetching report:', err)
    error.value = 'Failed to load report data. Please try again.'
  } finally {
    loading.value = false
  }
}

// Handle image loading errors
const handleImageError = (event: Event, index: number) => {
  if (event.target) {
    // Add to failed images set
    failedImages.value.add(index)

    // Replace with placeholder
    const imgElement = event.target as HTMLImageElement
    imgElement.src = '/placeholder-image.jpg'
    imgElement.alt = 'Image not found'

    // Filter out failed images from picture URLs if needed
    // pictureUrls.value = pictureUrls.value.filter((_, i) => !failedImages.value.has(i))
  }
}

// Download image function
const downloadImage = async (url: string, filename: string) => {
  try {
    const response = await fetch(url)
    const blob = await response.blob()
    const blobUrl = URL.createObjectURL(blob)

    const link = document.createElement('a')
    link.href = blobUrl
    link.download = `${filename}.jpg` // Assuming jpg, adjust if needed
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    URL.revokeObjectURL(blobUrl)
  } catch (err) {
    console.error('Error downloading image:', err)
    Toast.error('Failed to download image')
  }
}

// Navigate back to report page
const goBack = () => {
  router.push(`/client/reports`)
}

const getPrimaryValue = (report: any) => {
  if (report.content.primaryField?.value) {
    return report.content.primaryField?.value
  }
  return report.id
}

// Lifecycle
onMounted(() => {
  fetchReportData()
})
</script>

<style scoped>
/* Add any custom styling here */
</style>
 