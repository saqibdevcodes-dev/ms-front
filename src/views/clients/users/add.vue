<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Swal from 'sweetalert2'
import DefaultLayout from '@/layouts/DefaultLayout.vue'

import 'ag-grid-community/styles/ag-grid.css'
import 'ag-grid-community/styles/ag-theme-quartz.css'
import { AgGridVue } from 'ag-grid-vue3'
import Button from '@/components/Buttons/Button.vue'

import Modal from '@/components/modal/modal.vue'
import InputGroup from '@/components/Forms/InputGroup.vue'
import Select from 'primevue/select'
import { Users } from '@/stores/users'
import { Client } from '@/stores/client'
import InputText from 'primevue/inputtext'

const route = useRoute()
const router = useRouter()

// Form fields
const firstName = ref('')
const lastName = ref('')
const email = ref('')
const phone = ref('')
const password = ref('')
const confirmPassword = ref('')
const selectedRole = ref(null)
const loading = ref(false)

const roles = ref([
  { name: 'Head Office', code: 'Head Office' },
  { name: 'Area Manager', code: 'Area Manager' },
  { name: 'Branch Manager', code: 'Branch Manager' },
  { name: 'Region Manager', code: 'Region Manager' }
])

// Form validation
const validateForm = () => {
  if (!firstName.value) {
    Swal.fire('Error', 'First name is required', 'error')
    return false
  }
  if (!lastName.value) {
    Swal.fire('Error', 'Last name is required', 'error')
    return false
  }
  if (!email.value) {
    Swal.fire('Error', 'Email is required', 'error')
    return false
  }
  if (!selectedRole.value) {
    Swal.fire('Error', 'Role is required', 'error')
    return false
  }
  if (!password.value) {
    Swal.fire('Error', 'Password is required', 'error')
    return false
  }
  if (password.value !== confirmPassword.value) {
    Swal.fire('Error', 'Passwords do not match', 'error')
    return false
  }
  return true
}

// Create user function
const createUser = async (e) => {
  e.preventDefault()

  if (!validateForm()) {
    return
  }

  loading.value = true

  try {
    const userData = {
      first_name: firstName.value,
      last_name: lastName.value,
      email: email.value,
      phone: phone.value,
      password: password.value,
      client_id: Client().selected_client?.uuid,
      role: selectedRole.value.code,
      system_role: 'client_user' // Fixed system role for client users
    }

    // Use the user creation method
    const response = await Users().create_client_user(userData)

    // Show success message
    Swal.fire({
      title: 'Success!',
      text: 'User created successfully',
      icon: 'success',
      confirmButtonText: 'OK'
    }).then(() => {
      // Redirect to users list
      router.push('/client/users')
    })
  } catch (error) {
    console.error('Error creating user:', error)

    // Check if error contains email already exists message
    if (error.response && error.response.data) {
      const errorMessage = error.response.data.message || error.response.data.error
      if (
        errorMessage &&
        errorMessage.includes('email') &&
        errorMessage.toLowerCase().includes('already')
      ) {
        Swal.fire(
          'Error',
          'Email address is already in use. Please use a different email.',
          'error'
        )
      } else {
        Swal.fire('Error', errorMessage || 'Failed to create user', 'error')
      }
    } else {
      Swal.fire('Error', 'Failed to create user', 'error')
    }
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  // Initialize
  Users().init()

  // Ensure client is selected
  if (!Client().selected_client?.uuid) {
    Swal.fire({
      title: 'Error',
      text: 'No client selected. Please select a client first.',
      icon: 'error'
    }).then(() => {
      router.push('/clients')
    })
  }
})
</script>

<template>
  <DefaultLayout>
    <div class="grid grid-cols-1 gap-4">
      <form @submit="createUser" class="rounded-lg bg-white shadow p-4">
        <h2 class="font-semibold text-lg text-black mb-4">Add Client User</h2>

        <div v-if="loading" class="flex justify-center py-8">
          <div
            class="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"
          ></div>
        </div>

        <div v-else>
          <div class="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">First Name</label>
              <InputText v-model="firstName" type="text" placeholder="First Name" class="w-full" />
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
              <InputText v-model="lastName" type="text" placeholder="Last Name" class="w-full" />
            </div>
          </div>

          <div class="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <InputText v-model="email" type="email" placeholder="Email" class="w-full" />
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <InputText v-model="phone" type="text" placeholder="Phone" class="w-full" />
            </div>
          </div>

          <div class="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <InputText v-model="password" type="password" placeholder="Password" class="w-full" />
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
              <InputText
                v-model="confirmPassword"
                type="password"
                placeholder="Confirm Password"
                class="w-full"
              />
            </div>
          </div>

          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-1">Role</label>
            <Select
              v-model="selectedRole"
              filter
              :options="roles"
              optionLabel="name"
              placeholder="Select role"
              class="w-full"
            />
          </div>

          <div class="flex items-center gap-4 justify-end bg-white pt-4">
            <Button
              type="button"
              label="Cancel"
              class="p-button-outlined"
              @click="router.push('/client/users')"
            />
            <Button type="submit" label="Add User" :loading="loading" />
          </div>
        </div>
      </form>
    </div>
  </DefaultLayout>
</template>
