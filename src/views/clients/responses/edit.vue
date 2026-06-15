<script setup lang="ts">
import InputGroup from '@/components/Forms/InputGroup.vue'
import DefaultLayout from '@/layouts/DefaultLayout.vue'
import Button from '@/components/Buttons/Button.vue'
import { Responses } from '@/stores/responses'
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Dropdown from 'primevue/dropdown'
import { Toast } from '@/utils/toast'

const route = useRoute()
const router = useRouter()

// Define dropdown options for operations
const operationOptions = ref([
  { name: 'Add (+)', value: '+' },
  { name: 'Subtract (-)', value: '-' },
  { name: 'Multiply (*)', value: '*' },
  { name: 'Divide (/)', value: '/' }
])

// Prepare the response to edit
const response = ref({
  uuid: '',
  response: '',
  total_score: 0,
  applicable_score: 0,
  achieved_score: 0,
  operation: '+'
})

const fetchResponse = async () => {
  await Responses().fetch()
  const uuid = route.params.id

  if (!uuid) {
    Toast.error('Response ID not found')
    router.push('/client/responses')
    return
  }

  const foundResponse = Responses().responses_data.find((r) => r.uuid === uuid)

  if (!foundResponse) {
    Toast.error('Response not found')
    router.push('/client/responses')
    return
  }

  // Copy the response data
  response.value = {
    ...foundResponse,
    total_score: foundResponse.total_score || 0,
    applicable_score: foundResponse.applicable_score || 0,
    achieved_score: foundResponse.achieved_score || 0,
    operation: foundResponse.operation || '+'
  }
}

const saveResponse = async () => {
  try {
    await Responses().update_response(response.value)
    Toast.success('Response updated successfully')
    router.push('/client/responses')
  } catch (error) {
    console.error('Error updating response:', error)
    Toast.error('Failed to update response')
  }
}

onMounted(() => {
  fetchResponse()
})
</script>

<template>
  <DefaultLayout>
    <form @submit.prevent="saveResponse">
      <div class="text-black bg-white rounded-lg p-6">
        <h2 class="font-bold text-xl mb-4">Edit Response</h2>

        <div class="grid md:grid-cols-4 gap-6 mb-6">
          <!-- Response Name Input -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Response Name</label>
            <InputGroup
              type="text"
              placeholder="Enter response name"
              required
              v-model="response.response"
              class="w-full"
            />
          </div>

          <!-- Total Score Input -->
          <InputGroup
            label="Total Score"
            type="number"
            placeholder="0"
            required
            v-model="response.total_score"
          />

          <!-- Applicable Score Input -->
          <InputGroup
            label="Applicable Score"
            type="number"
            placeholder="0"
            required
            v-model="response.applicable_score"
          />

          <!-- Arithmetic Operation Dropdown -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Operation</label>
            <Dropdown
              v-model="response.operation"
              :options="operationOptions"
              optionLabel="name"
              optionValue="value"
              placeholder="Select Operation"
              class="w-full"
            />
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="mt-4 flex justify-end gap-3">
          <Button
            @click="router.push('/client/responses')"
            type="button"
            class="bg-gray-500"
            label="Cancel"
          />
          <Button type="submit" label="Update Response" />
        </div>
      </div>
    </form>
  </DefaultLayout>
</template>
