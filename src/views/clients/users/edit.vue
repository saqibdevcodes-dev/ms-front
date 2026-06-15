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
const userId = route.params.id as string

// Form fields
const firstName = ref('')
const lastName = ref('')
const email = ref('')
const phone = ref('')
const selectedRole = ref(null)
const loading = ref(false)
const userLoaded = ref(false)

const roles = ref([
  { name: 'Head Office', code: 'Head Office' },
  { name: 'Area Manager', code: 'Area Manager' },
  { name: 'Branch Manager', code: 'Branch Manager' },
  { name: 'Region Manager', code: 'Region Manager' }
])

// Load user data
const loadUser = async () => {
  try {
    loading.value = true
    const userData = await Users().get_user_by_id(userId)

    if (userData) {
      firstName.value = userData.first_name || ''
      lastName.value = userData.last_name || ''
      email.value = userData.email || ''
      phone.value = userData.phone || ''

      // Find the role in the roles array
      const userRole = roles.value.find((r) => r.code === userData.role)
      if (userRole) {
        selectedRole.value = userRole
      }

      userLoaded.value = true
    } else {
      Swal.fire({
        title: 'Error',
        text: 'User not found',
        icon: 'error'
      }).then(() => {
        router.push('/client/users')
      })
    }
  } catch (error) {
    console.error('Error loading user:', error)
    Swal.fire({
      title: 'Error',
      text: 'Failed to load user data',
      icon: 'error'
    }).then(() => {
      router.push('/client/users')
    })
  } finally {
    loading.value = false
  }
}

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
  return true
}

// Update user function
const updateUser = async (e) => {
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
      role: selectedRole.value.code
    }

    // Use the update method
    const response = await Users().update_user(userId, userData)

    // Show success message
    Swal.fire({
      title: 'Success!',
      text: 'User updated successfully',
      icon: 'success',
      confirmButtonText: 'OK'
    }).then(() => {
      // Redirect to users list
      router.push('/client/users')
    })
  } catch (error) {
    console.error('Error updating user:', error)

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
        Swal.fire('Error', errorMessage || 'Failed to update user', 'error')
      }
    } else {
      Swal.fire('Error', 'Failed to update user', 'error')
    }
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  // Initialize
  Users().init()
  loadUser()
})
</script>

<template>
  <DefaultLayout>
    <div class="grid grid-cols-1 gap-4">
      <form @submit="updateUser" class="rounded-lg bg-white shadow p-4">
        <h2 class="font-semibold text-lg text-black mb-4">Edit Client User</h2>

        <div v-if="loading && !userLoaded" class="flex justify-center py-8">
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
            <Button type="submit" label="Update User" :loading="loading" />
          </div>
        </div>
      </form>
    </div>
  </DefaultLayout>
</template>
