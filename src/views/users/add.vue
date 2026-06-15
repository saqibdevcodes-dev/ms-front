<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import DefaultLayout from '@/layouts/DefaultLayout.vue'
import { useRouter } from 'vue-router'
import Swal from 'sweetalert2'

import 'ag-grid-community/styles/ag-grid.css'
import 'ag-grid-community/styles/ag-theme-quartz.css'
import { AgGridVue } from 'ag-grid-vue3'
import Button from '@/components/Buttons/Button.vue'

import Modal from '@/components/modal/modal.vue'
import InputGroup from '@/components/Forms/InputGroup.vue'
import Select from 'primevue/select'
import { Users } from '@/stores/users'
import { Auth } from '@/stores/auth'
import InputText from 'primevue/inputtext'

const router = useRouter()

// Form fields
const firstName = ref('')
const lastName = ref('')
const email = ref('')
const phone = ref('')
const password = ref('')
const confirmPassword = ref('')
const selectedSystemRole = ref(null)
const loading = ref(false)

const systemRoles = ref([
  { name: 'Admin', code: 'admin' },
  { name: 'Reporting User', code: 'reporting_user' }
  // { name: 'Client Reporting User', code: 'client_reporting_user' }
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
  if (!selectedSystemRole.value) {
    Swal.fire('Error', 'System role is required', 'error')
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
      role: 'System User', // Default role for system users
      system_role: selectedSystemRole.value.code
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
      // Refresh user list
      Users().fetch()
      // Redirect to users list
      router.push('/users')
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
})
</script>

<template>
  <DefaultLayout>
    <div class="grid grid-cols-1 gap-4">
      <form @submit="createUser" class="rounded-lg bg-white shadow p-4">
        <h2 class="font-semibold text-lg text-black mb-4">Add New System User</h2>
        <p class="text-gray-600 mb-4">
          System users are assigned specific system roles that determine their access and
          capabilities.
        </p>

        <div class="p-4 mb-4 bg-gray-50 border border-gray-200 rounded-md">
          <label class="block text-sm font-medium text-gray-700 mb-1"
            >System Role <span class="text-red-500">*</span></label
          >
          <p class="text-xs text-gray-500 mb-2">Select the main system role for this user</p>
          <Select
            v-model="selectedSystemRole"
            filter
            :options="systemRoles"
            optionLabel="name"
            placeholder="Select system role"
            class="w-full"
          />
          <p class="text-xs text-gray-500 mt-2">
            <span class="font-medium">Admin:</span> Full access to all system features<br />
            <span class="font-medium">Reporting User:</span> Can view and generate reports<br />
            <!-- <span class="font-medium">Client Reporting User:</span> Can view client-specific reports -->
          </p>
        </div>

        <div class="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1"
              >First Name <span class="text-red-500">*</span></label
            >
            <InputText v-model="firstName" type="text" placeholder="First Name" class="w-full" />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1"
              >Last Name <span class="text-red-500">*</span></label
            >
            <InputText v-model="lastName" type="text" placeholder="Last Name" class="w-full" />
          </div>
        </div>

        <div class="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1"
              >Email <span class="text-red-500">*</span></label
            >
            <InputText v-model="email" type="email" placeholder="Email" class="w-full" />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Phone</label>
            <InputText v-model="phone" type="text" placeholder="Phone" class="w-full" />
          </div>
        </div>

        <div class="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1"
              >Password <span class="text-red-500">*</span></label
            >
            <InputText v-model="password" type="password" placeholder="Password" class="w-full" />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1"
              >Confirm Password <span class="text-red-500">*</span></label
            >
            <InputText
              v-model="confirmPassword"
              type="password"
              placeholder="Confirm Password"
              class="w-full"
            />
          </div>
        </div>

        <div class="flex items-center gap-4 justify-end bg-white pt-4">
          <Button
            type="button"
            label="Cancel"
            class="p-button-outlined"
            @click="router.push('/users')"
          />
          <Button type="submit" label="Add System User" :loading="loading" />
        </div>
      </form>
    </div>
  </DefaultLayout>
</template>
