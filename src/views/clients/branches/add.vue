<script setup lang="ts">
import { onMounted, ref, computed } from 'vue'
import DefaultLayout from '@/layouts/DefaultLayout.vue'
import InputText from 'primevue/inputtext'
import Button from '@/components/Buttons/Button.vue'
import { Branches } from '@/stores/branches'
import { Client } from '@/stores/client'
import { Toast } from '@/utils/toast'
import { useRouter } from 'vue-router'

const router = useRouter()
const loading = ref(false)

// Form fields
const branchName = ref('')
const branchCode = ref('')
const email = ref('')
const phone = ref('')
const region = ref('')
const zone = ref('')
const address = ref('')
const city = ref('')
const country = ref('')

// Validation function
const validateForm = () => {
  if (!branchName.value) {
    Toast.error('Branch name is required')
    return false
  }

  if (!branchCode.value) {
    Toast.error('Branch code is required')
    return false
  }

  if (email.value && !isValidEmail(email.value)) {
    Toast.error('Please enter a valid email address')
    return false
  }

  return true
}

// Email validation helper
const isValidEmail = (email: string) => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return re.test(email)
}

// Save branch function
const saveBranch = async () => {
  if (!validateForm()) {
    return
  }

  loading.value = true

  try {
    const client = Client().selected_client
    if (!client?.uuid) {
      Toast.error('No client selected. Please select a client first.')
      loading.value = false
      return
    }

    const branchData = {
      branch_name: branchName.value,
      branch_code: branchCode.value,
      email: email.value,
      phone: phone.value,
      region: region.value,
      zone: zone.value,
      address: address.value,
      city: city.value,
      country: country.value,
      client_id: client.uuid
    }

    // Call the API to save the branch
    const response = await Branches().addBranch(branchData)

    Toast.success('Branch added successfully')
    router.push('/client/branches')
  } catch (error) {
    console.error('Error adding branch:', error)
    Toast.error('Failed to add branch. Please try again.')
  } finally {
    loading.value = false
  }
}

// Check if we have a client on mount
onMounted(() => {
  const client = Client().selected_client
  if (!client?.uuid) {
    Toast.error('No client selected. Please select a client first.')
    router.push('/clients')
  }
})
</script>

<template>
  <DefaultLayout>
    <div class="bg-white p-6 rounded-lg shadow">
      <h1 class="text-2xl font-semibold mb-4 text-gray-800">Add New Branch</h1>

      <form @submit.prevent="saveBranch" class="space-y-6">
        <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div class="w-full">
            <label class="font-medium block mb-1 text-gray-700">Branch Name *</label>
            <InputText
              v-model="branchName"
              class="w-full"
              required
              type="text"
              placeholder="Enter branch name"
            />
          </div>

          <div class="w-full">
            <label class="font-medium block mb-1 text-gray-700">Branch Code *</label>
            <InputText
              v-model="branchCode"
              class="w-full"
              required
              type="text"
              placeholder="Enter branch code"
            />
          </div>

          <div class="w-full">
            <label class="font-medium block mb-1 text-gray-700">Email</label>
            <InputText v-model="email" class="w-full" type="email" placeholder="Enter email" />
          </div>

          <div class="w-full">
            <label class="font-medium block mb-1 text-gray-700">Phone</label>
            <InputText
              v-model="phone"
              class="w-full"
              type="text"
              placeholder="Enter phone number"
            />
          </div>

          <div class="w-full">
            <label class="font-medium block mb-1 text-gray-700">Region</label>
            <InputText v-model="region" class="w-full" type="text" placeholder="Enter region" />
          </div>

          <div class="w-full">
            <label class="font-medium block mb-1 text-gray-700">Zone</label>
            <InputText v-model="zone" class="w-full" type="text" placeholder="Enter zone" />
          </div>

          <div class="w-full">
            <label class="font-medium block mb-1 text-gray-700">City</label>
            <InputText v-model="city" class="w-full" type="text" placeholder="Enter city" />
          </div>

          <div class="w-full">
            <label class="font-medium block mb-1 text-gray-700">Country</label>
            <InputText v-model="country" class="w-full" type="text" placeholder="Enter country" />
          </div>

          <div class="w-full md:col-span-2 lg:col-span-3">
            <label class="font-medium block mb-1 text-gray-700">Address</label>
            <InputText
              v-model="address"
              class="w-full"
              type="text"
              placeholder="Enter full address"
            />
          </div>
        </div>

        <div class="flex justify-end space-x-4 pt-4 border-t">
          <Button
            type="button"
            label="Cancel"
            :outline="true"
            @click="router.push('/client/branches')"
          />
          <Button type="submit" label="Save Branch" :loading="loading" />
        </div>
      </form>
    </div>
  </DefaultLayout>
</template>
