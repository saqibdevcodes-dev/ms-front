<script setup lang="ts">
import InputGroup from '@/components/Forms/InputGroup.vue'
import DefaultLayout from '@/layouts/DefaultLayout.vue'
import Button from '@/components/Buttons/Button.vue'
import { onMounted, computed, watch, ref } from 'vue'
import { Ranges } from '@/stores/ranges'
import { Client } from '@/stores/client'
import { useRouter, useRoute } from 'vue-router'
import { Toast } from '@/utils/toast'

const router = useRouter()
const route = useRoute()
const rangeId = route.params.id?.toString()
const selectedClient = computed(() => Client().selected_client)

const currentRange = ref({
  uuid: '',
  rating: '',
  start: 0,
  end: 0,
  color: ''
})
const originalRange = ref({
  uuid: '',
  rating: '',
  start: 0,
  end: 0,
  color: ''
})
const loading = ref(false)

const hasClientSelected = computed(() => !!selectedClient.value?.uuid)

watch(
  () => Client().selected_client,
  async (newClient, oldClient) => {
    if (newClient?.uuid && (!oldClient || newClient.uuid !== oldClient.uuid)) {
      await loadRangeData()
    }
  },
  { deep: true }
)

async function loadRangeData() {
  if (!rangeId) {
    Toast.error('Range ID is missing')
    router.push('/client/percentage-ranges')
    return
  }

  loading.value = true
  try {
    // Initialize ranges store first
    await Ranges().init()
    await Ranges().fetch()
    const range = Ranges().ranges_data.find((r) => r.uuid === rangeId)

    if (!range) {
      Toast.error('Range not found')
      router.push('/client/percentage-ranges')
      return
    }

    currentRange.value = {
      uuid: range.uuid,
      rating: range.rating,
      start: Number(range.start),
      end: Number(range.end),
      color: range.color
    }

    originalRange.value = { ...currentRange.value }
    console.log('Original range loaded:', originalRange.value)
  } catch (error) {
    console.error('Error loading range data:', error)
    Toast.error('Failed to load range data')
  } finally {
    loading.value = false
  }
}

function valuesHaveChanged() {
  return (
    currentRange.value.rating.trim() !== originalRange.value.rating.trim() ||
    Number(currentRange.value.start) !== Number(originalRange.value.start) ||
    Number(currentRange.value.end) !== Number(originalRange.value.end) ||
    currentRange.value.color !== originalRange.value.color
  )
}

async function updateRange() {
  if (!currentRange.value.uuid) {
    Toast.error('Range ID is missing')
    return
  }

  if (!currentRange.value.rating.trim()) {
    Toast.error('Rating is required')
    return
  }

  if (isNaN(Number(currentRange.value.start)) || isNaN(Number(currentRange.value.end))) {
    Toast.error('Start and End values must be numbers')
    return
  }

  if (!currentRange.value.color) {
    Toast.error('Color is required')
    return
  }

  if (!valuesHaveChanged()) {
    Toast.info('No changes detected')
    router.push('/client/percentage-ranges')
    return
  }

  console.log('Current input values:', currentRange.value)
  console.log('Original values:', originalRange.value)

  const formattedRange = {
    uuid: currentRange.value.uuid,
    rating: currentRange.value.rating.trim(),
    start: Number(currentRange.value.start),
    end: Number(currentRange.value.end),
    color: currentRange.value.color
  }

  console.log('Submitting range update with changes:', formattedRange)

  loading.value = true
  try {
    // Ensure ranges store is initialized before updating
    if (!Ranges().xios || !Ranges().xios.put) {
      console.log('Ranges store not initialized, initializing now...')
      await Ranges().init()
    }
    
    const result = await Ranges().update_range(selectedClient.value, formattedRange)
    if (result) {
      Toast.success('Range updated successfully')
      router.push('/client/percentage-ranges')
    } else {
      Toast.error('Failed to update range')
    }
  } catch (error) {
    console.error('Error updating range:', error)
    Toast.error('Failed to update range')
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  if (hasClientSelected.value) {
    loadRangeData()
  }
})
</script>

<template>
  <DefaultLayout>
    <div v-if="loading" class="flex justify-center items-center h-64">
      <div class="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
    </div>

    <div
      v-else-if="!hasClientSelected"
      class="flex flex-col items-center justify-center my-12 text-center"
    >
      <div class="text-gray-500 mb-4">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke-width="1.5"
          stroke="currentColor"
          class="w-16 h-16 mx-auto mb-4"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z"
          />
        </svg>
      </div>
      <h3 class="text-xl font-medium text-gray-700">No Client Selected</h3>
      <p class="text-gray-500 mt-2">Please select a client to edit percentage ranges.</p>
      <Button
        @onClick="router.push('/clients')"
        :type="'button'"
        class="mt-4"
        label="Select a Client"
      ></Button>
    </div>

    <form v-else @submit.prevent="updateRange">
      <div class="text-black bg-white rounded-lg p-6">
        <h2 class="font-bold text-xl mb-4">Edit Range</h2>
        <div class="grid md:grid-cols-4 gap-4 mb-2">
          <InputGroup
            :label="'Enter Rating'"
            :type="'text'"
            :placeholder="'Enter Rating'"
            :required="true"
            :customClasses="''"
            v-model="currentRange.rating"
          />

          <InputGroup
            :label="'Start Range'"
            :type="'number'"
            :placeholder="'0'"
            :required="true"
            :customClasses="''"
            v-model="currentRange.start"
          />

          <InputGroup
            :label="'End Range'"
            :type="'number'"
            :placeholder="'0'"
            :required="true"
            :customClasses="''"
            v-model="currentRange.end"
          />

          <div class="flex items-end">
            <InputGroup
              :label="'Color Score'"
              :type="'color'"
              :placeholder="'#fff'"
              :required="true"
              :customClasses="'w-full'"
              v-model="currentRange.color"
            />
          </div>
        </div>
      </div>
      <div class="mt-4 flex justify-end gap-2">
        <Button
          @onClick="router.push('/client/percentage-ranges')"
          :type="'button'"
          class="bg-gray-500"
          label="Cancel"
        />
        <Button :type="'submit'" label="Update Range" />
      </div>
    </form>
  </DefaultLayout>
</template>
