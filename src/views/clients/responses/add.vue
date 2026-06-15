<script setup lang="ts">
import DefaultLayout from '@/layouts/DefaultLayout.vue'
import Button from '@/components/Buttons/Button.vue'
import { Responses } from '@/stores/responses'
import { ref, onMounted, reactive } from 'vue'
import Dropdown from 'primevue/dropdown'
import { type Response } from '@/interfaces/response'
import { Toast } from '@/utils/toast'
import { Client } from '@/stores/client'

// Define the component name to follow Vue multi-word naming convention
defineOptions({
  name: 'ResponseAddView'
})

// Define dropdown options for operations
const operationOptions = ref([
  { name: 'Add (+)', value: '+' },
  { name: 'Subtract (-)', value: '-' },
  { name: 'Multiply (*)', value: '*' },
  { name: 'Divide (/)', value: '/' }
])

const loading = ref(false)

// Handle response name input change
const handleResponseInput = (response: any, event: Event) => {
  const inputElement = event.target as HTMLInputElement
  if (inputElement && inputElement.value !== undefined) {
    response.response = inputElement.value
    console.log('Response name changed to:', response.response)
  }
}

// Handle form submission with validation
const saveResponses = async () => {
  // Debug log the current state of responses
  console.log('Current responses before save:', JSON.stringify(Responses().responses, null, 2))

  // Validate inputs
  let hasEmptyResponse = false

  for (const response of Responses().responses) {
    // Check explicitly for empty response names
    if (!response.response || response.response.trim() === '') {
      hasEmptyResponse = true
      console.error('Empty response detected:', response)
    }

    // Ensure fields are numbers
    response.total_score = Number(response.total_score) || 0
    response.applicable_score = Number(response.applicable_score) || 0
    response.achieved_score = Number(response.achieved_score) || 0

    // Set default operation if missing
    if (!response.operation) {
      response.operation = '+'
    }
  }

  if (hasEmptyResponse) {
    Toast.error('Response name is required for all responses')
    return
  }

  try {
    loading.value = true
    await Responses().create()
    loading.value = false
  } catch (error) {
    console.error('Error saving responses:', error)
    loading.value = false
  }
}

onMounted(() => {
  // Initialize Responses store
  Responses().init()

  // Reset to a clean state for new responses, without affecting existing ones in the database
  Responses().reset()
})

// Add a new clean response object
const addNewResponse = () => {
  if (!Client().selected_client?.uuid) {
    Toast.warn('Please select a client first')
    return
  }

  // Create a response object that matches the interface
  const newResponse = {
    response: '',
    total_score: 0,
    applicable_score: 0,
    achieved_score: 0,
    operation: '+'
  }

  Responses().responses.push(newResponse)
}
</script>

<template>
  <DefaultLayout>
    <form @submit.prevent="saveResponses">
      <div class="text-black bg-white rounded-lg p-6">
        <h2 class="font-bold text-xl mb-4">Configure Responses</h2>
        <pre v-if="false">{{ JSON.stringify(Responses().responses, null, 2) }}</pre>

        <div
          v-for="(response, index) in Responses().responses"
          class="grid md:grid-cols-3 gap-4 mb-6 pb-4 border-b last:border-0"
          :key="index"
        >
          <!-- Response Name Text Input - Using direct input instead of InputGroup -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Response Name</label>
            <input
              type="text"
              placeholder="Enter response name"
              required
              :value="response.response"
              @input="(e) => handleResponseInput(response, e)"
              class="w-full rounded border text-black border-stroke bg-white p-2 font-normal outline-none transition focus:border-primary active:border-primary"
            />
          </div>

          <!-- Total Score Input -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Total Score</label>
            <input
              type="number"
              placeholder="0"
              required
              v-model="response.total_score"
              step="0.1"
              min="0"
              class="w-full rounded border text-black border-stroke bg-white p-2 font-normal outline-none transition focus:border-primary active:border-primary"
            />
          </div>

          <!-- Arithmetic Operation Dropdown -->
          <div class="flex items-end">
            <div class="w-full mr-2">
              <label class="block text-sm font-medium text-gray-700 mb-1">Operation</label>
              <Dropdown
                :modelValue="response.operation"
                @update:modelValue="
                  (val) => {
                    response.operation = val
                  }
                "
                :options="operationOptions"
                optionLabel="name"
                optionValue="value"
                placeholder="Select Operation"
                class="w-full"
              />
            </div>

            <Button
              v-if="Responses().responses.length > 1"
              @click="() => Responses().responses.splice(index, 1)"
              type="button"
              class="bg-red-500 mb-1"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke-width="1.5"
                stroke="currentColor"
                class="size-5"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"
                />
              </svg>
            </Button>
          </div>
        </div>

        <!-- Add Button -->
        <Button @click="addNewResponse" type="button" class="bg-green-500 hover:bg-green-600">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke-width="1.5"
            stroke="currentColor"
            class="size-5 mr-1"
          >
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Add Response
        </Button>
      </div>

      <div class="mt-4 text-right">
        <Button type="submit" label="Save Responses" :loading="loading" />
      </div>
    </form>
  </DefaultLayout>
</template>
